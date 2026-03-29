import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth-options';
import { createNotification } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

async function generateProjectCode(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PRJ-${year}-`;
  const last = await prisma.innovationProject.findFirst({
    where: { code: { startsWith: prefix } },
    orderBy: { code: 'desc' },
  });
  const next = last ? parseInt(last.code.replace(prefix, '')) + 1 : 1;
  return `${prefix}${String(next).padStart(4, '0')}`;
}

// POST - Fikri projeye dönüştür
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const isAdmin = ['Admin', 'Yönetici'].includes(session.user.role ?? '');
    if (!isAdmin) {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const { managerId } = body;

    const idea = await prisma.innovationIdea.findUnique({ where: { id } });
    if (!idea || !idea.isActive) {
      return NextResponse.json({ error: 'Fikir bulunamadı' }, { status: 404 });
    }

    if (idea.status !== 'ONAYLANDI') {
      return NextResponse.json(
        { error: 'Sadece onaylanmış fikirler projeye dönüştürülebilir' },
        { status: 400 }
      );
    }

    if (idea.status === 'PROJELESTI') {
      return NextResponse.json({ error: 'Bu fikir zaten bir projeye dönüştürülmüş' }, { status: 400 });
    }

    const projectCode = await generateProjectCode();

    const project = await prisma.$transaction(async (tx) => {
      const newProject = await tx.innovationProject.create({
        data: {
          code: projectCode,
          name: idea.title,
          description: idea.description,
          ideaId: idea.id,
          departmentId: idea.departmentId,
          strategicGoalId: idea.strategicGoalId,
          managerId: managerId || null,
          createdById: session.user.id,
        },
      });

      await tx.innovationIdea.update({
        where: { id: idea.id },
        data: {
          status: 'PROJELESTI',
          maturity: 'PROJE',
          reviewedById: session.user.id,
          reviewedAt: new Date(),
        },
      });

      return newProject;
    });

    // Fikir sahibine bildir
    if (idea.createdById !== session.user.id) {
      await createNotification({
        userId: idea.createdById,
        title: 'Fikriniz Projeye Dönüştürüldü',
        message: `${idea.code} kodlu "${idea.title}" fikriniz ${projectCode} kodlu projeye dönüştürüldü.`,
        type: 'BASARI',
        link: `/dashboard/innovation/projects/${project.id}`,
      });
    }

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('Proje dönüştürme hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
