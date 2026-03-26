import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { createNotification } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

// Aksiyon Listesi
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await context.params;

    const actions = await prisma.cAPAAction.findMany({
      where: { capaId: id },
      include: {
        assignee: { select: { id: true, name: true, surname: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(actions);
  } catch (error) {
    console.error('Aksiyon listesi hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// Aksiyon Oluştur
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const { title, description, assigneeId, priority, dueDate } = body;

    const action = await prisma.cAPAAction.create({
      data: {
        capaId: id,
        title,
        description,
        assigneeId,
        priority: priority || 'ORTA',
        dueDate: dueDate ? new Date(dueDate) : undefined,
        createdById: session.user.id,
      },
      include: {
        assignee: { select: { id: true, name: true, surname: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
      },
    });

    await prisma.cAPAHistory.create({
      data: {
        capaId: id,
        userId: session.user.id,
        action: 'AKSIYON_EKLENDI',
        newValue: title,
      },
    });

    // Atanan kişiye bildirim gönder
    if (assigneeId && assigneeId !== session.user.id) {
      const capa = await prisma.cAPA.findUnique({ where: { id }, select: { code: true, title: true } });
      await createNotification({
        userId: assigneeId,
        title: 'Yeni CAPA Aksiyonu Atandı',
        message: `${capa?.code || ''} kodlu CAPA için "${title}" başlıklı aksiyon size atandı.`,
        type: 'BILGI',
        link: `/dashboard/capas/${id}`,
      });
    }

    return NextResponse.json(action, { status: 201 });
  } catch (error) {
    console.error('Aksiyon oluşturma hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// Aksiyon Güncelle
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id: capaId } = await context.params;
    const body = await request.json();
    const { actionId, title, description, status, assigneeId, priority, dueDate, completionNotes } = body;

    // Mevcut aksiyonu al
    const existingAction = await prisma.cAPAAction.findUnique({ 
      where: { id: actionId },
      select: { assigneeId: true, title: true, createdById: true }
    });

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) {
      updateData.status = status;
      if (status === 'TAMAMLANDI') {
        updateData.completedAt = new Date();
      }
    }
    if (assigneeId !== undefined) updateData.assigneeId = assigneeId;
    if (priority !== undefined) updateData.priority = priority;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (completionNotes !== undefined) updateData.completionNotes = completionNotes;

    const action = await prisma.cAPAAction.update({
      where: { id: actionId },
      data: updateData,
      include: {
        assignee: { select: { id: true, name: true, surname: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
      },
    });

    // Atanan kişi değişti ise bildirim gönder
    if (assigneeId && assigneeId !== existingAction?.assigneeId && assigneeId !== session.user.id) {
      const capa = await prisma.cAPA.findUnique({ where: { id: capaId }, select: { code: true } });
      await createNotification({
        userId: assigneeId,
        title: 'CAPA Aksiyonu Size Atandı',
        message: `${capa?.code || ''} kodlu CAPA için "${action.title}" başlıklı aksiyon size atandı.`,
        type: 'BILGI',
        link: `/dashboard/capas/${capaId}`,
      });
    }

    // Aksiyon tamamlandığında oluşturan kişiye bildirim
    if (status === 'TAMAMLANDI' && existingAction?.createdById && existingAction.createdById !== session.user.id) {
      const capa = await prisma.cAPA.findUnique({ where: { id: capaId }, select: { code: true } });
      await createNotification({
        userId: existingAction.createdById,
        title: 'CAPA Aksiyonu Tamamlandı',
        message: `${capa?.code || ''} kodlu CAPA için "${action.title}" başlıklı aksiyon tamamlandı.`,
        type: 'BASARI',
        link: `/dashboard/capas/${capaId}`,
      });
    }

    return NextResponse.json(action);
  } catch (error) {
    console.error('Aksiyon güncelleme hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
