import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { createNotification } from '@/lib/notifications';

// Aksiyonları listele
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const actions = await prisma.oHSRiskAction.findMany({
      where: { riskId: params.id },
      include: {
        assignee: { select: { id: true, name: true, surname: true } },
        completedBy: { select: { id: true, name: true, surname: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(actions);
  } catch (error) {
    console.error('OHS actions fetch error:', error);
    return NextResponse.json(
      { error: 'Aksiyonlar alınamadı' },
      { status: 500 }
    );
  }
}

// Yeni aksiyon oluştur
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      description,
      actionType,
      priority,
      startDate,
      dueDate,
      assigneeId,
      plannedBudget,
    } = body;

    if (!title || !actionType || !assigneeId) {
      return NextResponse.json(
        { error: 'Zorunlu alanlar eksik' },
        { status: 400 }
      );
    }

    // Risk kontrolü
    const risk = await prisma.oHSRisk.findUnique({
      where: { id: params.id },
    });

    if (!risk) {
      return NextResponse.json(
        { error: 'Risk bulunamadı' },
        { status: 404 }
      );
    }

    const action = await prisma.oHSRiskAction.create({
      data: {
        riskId: params.id,
        title,
        description,
        actionType,
        priority: priority || 'ORTA',
        startDate: startDate ? new Date(startDate) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        assigneeId,
        plannedBudget: plannedBudget ? parseFloat(plannedBudget) : 0,
        createdById: session.user.id,
      },
      include: {
        assignee: { select: { id: true, name: true, surname: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
      },
    });

    // Risk durumunu güncelle
    await prisma.oHSRisk.update({
      where: { id: params.id },
      data: { status: 'AKSIYON_BEKLIYOR' },
    });

    // Sorumluya bildirim gönder
    if (assigneeId !== session.user.id) {
      await createNotification({
        userId: assigneeId,
        type: 'BILGI',
        title: 'İSG Risk Aksiyonu Atandı',
        message: `"${risk.name}" riski için size "${title}" aksiyonu atandı.`,
        link: `/dashboard/ohs/risks/${params.id}`,
      });
    }

    return NextResponse.json(action, { status: 201 });
  } catch (error) {
    console.error('OHS action create error:', error);
    return NextResponse.json(
      { error: 'Aksiyon oluşturulamadı' },
      { status: 500 }
    );
  }
}
