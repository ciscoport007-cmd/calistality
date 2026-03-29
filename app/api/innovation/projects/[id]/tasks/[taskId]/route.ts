import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth-options';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string; taskId: string }> };

// PATCH - Görev güncelle (durum, öncelik, sıralama, atanan)
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { taskId } = await context.params;
    const body = await request.json();
    const { title, description, status, priority, assigneeId, startDate, dueDate, sortOrder } = body;

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) {
      updateData.status = status;
      if (status === 'TAMAMLANDI') updateData.completedAt = new Date();
      else updateData.completedAt = null;
    }
    if (priority !== undefined) updateData.priority = priority;
    if (assigneeId !== undefined) updateData.assigneeId = assigneeId || null;
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

    const task = await prisma.innovationTask.update({
      where: { id: taskId },
      data: updateData,
      include: {
        assignee: { select: { id: true, name: true, surname: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
      },
    });

    return NextResponse.json(task);
  } catch (error) {
    console.error('Görev güncelleme hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// DELETE - Görev sil
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { taskId } = await context.params;

    await prisma.innovationTask.delete({ where: { id: taskId } });

    return NextResponse.json({ message: 'Görev silindi' });
  } catch (error) {
    console.error('Görev silme hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
