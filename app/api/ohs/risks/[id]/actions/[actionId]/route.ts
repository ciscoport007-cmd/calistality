import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { createNotification } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

// Aksiyon güncelle
export async function PATCH(
  request: Request,
  { params }: { params: { id: string; actionId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const body = await request.json();
    const currentAction = await prisma.oHSRiskAction.findUnique({
      where: { id: params.actionId },
      include: { risk: true },
    });

    if (!currentAction) {
      return NextResponse.json(
        { error: 'Aksiyon bulunamadı' },
        { status: 404 }
      );
    }

    // Durum değişiklikleri
    const updateData: any = { ...body };

    // "Başlat" butonuna basıldığında
    if (body.status === 'DEVAM_EDIYOR' && currentAction.status === 'OLUSTURULDU') {
      updateData.startDate = updateData.startDate || new Date();
    }

    // "Tamamla" butonuna basıldığında (kanıt yükleme ile)
    if (body.status === 'TAMAMLANDI') {
      if (!body.completionEvidenceCloudPath && !currentAction.completionEvidenceCloudPath) {
        return NextResponse.json(
          { error: 'Tamamlama için kanıt dokümanı zorunludur' },
          { status: 400 }
        );
      }
      updateData.completedAt = new Date();
      updateData.completedById = session.user.id;
    }

    const action = await prisma.oHSRiskAction.update({
      where: { id: params.actionId },
      data: updateData,
      include: {
        assignee: { select: { id: true, name: true, surname: true } },
        completedBy: { select: { id: true, name: true, surname: true } },
        risk: {
          include: {
            owner: { select: { id: true, name: true, surname: true } },
          },
        },
      },
    });

    // Tamamlandığında bildirim gönder
    if (body.status === 'TAMAMLANDI') {
      // Aksiyon sorumlusuna
      if (action.assigneeId !== session.user.id) {
        await createNotification({
          userId: action.assigneeId,
          type: 'BASARI',
          title: 'İSG Risk Aksiyonu Tamamlandı',
          message: `"${action.title}" aksiyonu tamamlandı.`,
          link: `/dashboard/ohs/risks/${params.id}`,
        });
      }

      // Risk sahibine
      if (action.risk.ownerId !== session.user.id) {
        await createNotification({
          userId: action.risk.ownerId,
          type: 'BASARI',
          title: 'İSG Risk Aksiyonu Tamamlandı',
          message: `"${action.risk.name}" riski için "${action.title}" aksiyonu tamamlandı.`,
          link: `/dashboard/ohs/risks/${params.id}`,
        });
      }
    }

    return NextResponse.json(action);
  } catch (error) {
    console.error('OHS action update error:', error);
    return NextResponse.json(
      { error: 'Aksiyon güncellenemedi' },
      { status: 500 }
    );
  }
}

// Aksiyon sil
export async function DELETE(
  request: Request,
  { params }: { params: { id: string; actionId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    await prisma.oHSRiskAction.delete({
      where: { id: params.actionId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('OHS action delete error:', error);
    return NextResponse.json(
      { error: 'Aksiyon silinemedi' },
      { status: 500 }
    );
  }
}
