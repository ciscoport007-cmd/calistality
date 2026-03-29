import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth-options';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

// GET - Görev listesi
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await context.params;

    const tasks = await prisma.innovationTask.findMany({
      where: { projectId: id },
      include: {
        assignee: { select: { id: true, name: true, surname: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
      },
      orderBy: [{ status: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Görev listesi hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// POST - Yeni görev oluştur
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await context.params;
    const { title, description, priority, assigneeId, startDate, dueDate } = await request.json();

    if (!title) {
      return NextResponse.json({ error: 'Görev başlığı zorunludur' }, { status: 400 });
    }

    // En yüksek sortOrder'ı bul
    const lastTask = await prisma.innovationTask.findFirst({
      where: { projectId: id },
      orderBy: { sortOrder: 'desc' },
    });
    const sortOrder = (lastTask?.sortOrder ?? -1) + 1;

    const task = await prisma.innovationTask.create({
      data: {
        title,
        description: description || null,
        priority: priority ?? 'ORTA',
        assigneeId: assigneeId || null,
        startDate: startDate ? new Date(startDate) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        projectId: id,
        createdById: session.user.id,
        sortOrder,
      },
      include: {
        assignee: { select: { id: true, name: true, surname: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('Görev oluşturma hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
