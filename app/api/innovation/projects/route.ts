import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth-options';
import { getDepartmentFilterWithNull, isAdmin } from '@/lib/audit';

export const dynamic = 'force-dynamic';

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

// GET - Proje listesi
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const departmentId = searchParams.get('departmentId');
    const managerId = searchParams.get('managerId');
    const search = searchParams.get('search');

    const userRole = session.user.role;
    const departmentFilter = getDepartmentFilterWithNull(session.user.departmentId, userRole);
    const where: any = { isActive: true, ...departmentFilter };

    // Admin ise URL param'dan departman filtresi uygulanabilir
    if (isAdmin(userRole) && departmentId) where.departmentId = departmentId;

    if (status) where.status = status;
    if (managerId) where.managerId = managerId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    const projects = await prisma.innovationProject.findMany({
      where,
      include: {
        manager: { select: { id: true, name: true, surname: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
        department: { select: { id: true, name: true } },
        idea: { select: { id: true, code: true, title: true } },
        _count: { select: { tasks: true, milestones: true, stakeholders: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error('Proje listesi hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// POST - Yeni proje oluştur
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const isAdmin = ['Admin', 'Yönetici'].includes(session.user.role ?? '');
    if (!isAdmin) {
      return NextResponse.json({ error: 'Proje oluşturmak için yetkiniz yok' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name, description, managerId, departmentId, strategicGoalId,
      startDate, endDate, estimatedBudget, estimatedROI, roiNote,
    } = body;

    if (!name) {
      return NextResponse.json({ error: 'Proje adı zorunludur' }, { status: 400 });
    }

    const code = await generateProjectCode();

    const project = await prisma.innovationProject.create({
      data: {
        code,
        name,
        description: description || null,
        managerId: managerId || null,
        departmentId: departmentId || null,
        strategicGoalId: strategicGoalId || null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        estimatedBudget: estimatedBudget ? parseFloat(estimatedBudget) : null,
        estimatedROI: estimatedROI ? parseFloat(estimatedROI) : null,
        roiNote: roiNote || null,
        createdById: session.user.id,
      },
      include: {
        manager: { select: { id: true, name: true, surname: true } },
        department: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('Proje oluşturma hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
