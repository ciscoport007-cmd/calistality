import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth-options';
import { notifyActionStakeholders, NotificationTemplates } from '@/lib/notifications';

// PATCH - Kilometre taşını güncelle
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; milestoneId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id, milestoneId } = await params;
    const body = await request.json();
    const { name, description, status, plannedDate, actualDate, weight, deliverables, evidence, targetValue, unit } = body;

    const milestone = await prisma.actionMilestone.findUnique({
      where: { id: milestoneId },
    });

    if (!milestone || milestone.actionId !== id) {
      return NextResponse.json({ error: 'Kilometre taşı bulunamadı' }, { status: 404 });
    }

    const oldStatus = milestone.status;

    const updatedMilestone = await prisma.actionMilestone.update({
      where: { id: milestoneId },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
        ...(plannedDate !== undefined && { plannedDate: new Date(plannedDate) }),
        ...(actualDate !== undefined && { actualDate: actualDate ? new Date(actualDate) : null }),
        ...(weight !== undefined && { weight }),
        ...(deliverables !== undefined && { deliverables }),
        ...(evidence !== undefined && { evidence }),
        ...(targetValue !== undefined && { targetValue: targetValue !== '' ? parseFloat(targetValue) : null }),
        ...(unit !== undefined && { unit: unit || null }),
        ...(status === 'TAMAMLANDI' && !milestone.completedById && {
          completedById: session.user.id,
          actualDate: actualDate ? new Date(actualDate) : new Date(),
        }),
      },
      include: {
        completedBy: {
          select: { id: true, name: true, surname: true, email: true },
        },
      },
    });

    // Eğer durum değiştiyse tarihçeye ekle
    if (status && status !== oldStatus) {
      await prisma.strategicActionHistory.create({
        data: {
          actionId: id,
          userId: session.user.id,
          actionType: 'KILOMETRE_TASI_DURUMU',
          oldValue: oldStatus,
          newValue: status,
          comments: `"${milestone.name}" kilometre taşı durumu: ${oldStatus} -> ${status}`,
        },
      });

      // Aksiyon ilerlemesini güncelle
      await updateActionProgress(id);

      // Kilometre taşı bildirimleri
      const action = await prisma.strategicAction.findUnique({
        where: { id },
        select: { code: true },
      });

      if (action) {
        if (status === 'TAMAMLANDI') {
          // Kilometre taşı tamamlandı bildirimi
          const template = NotificationTemplates.milestoneCompleted(action.code, milestone.name);
          await notifyActionStakeholders(id, session.user.id, template);
        } else if (status === 'GECIKTI') {
          // Kilometre taşı gecikti bildirimi
          const template = NotificationTemplates.milestoneDelayed(action.code, milestone.name);
          await notifyActionStakeholders(id, session.user.id, template, { includeDepartmentManager: true });
        }
      }
    }

    return NextResponse.json(updatedMilestone);
  } catch (error) {
    console.error('Milestone update error:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// DELETE - Kilometre taşını sil
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; milestoneId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id, milestoneId } = await params;

    const milestone = await prisma.actionMilestone.findUnique({
      where: { id: milestoneId },
    });

    if (!milestone || milestone.actionId !== id) {
      return NextResponse.json({ error: 'Kilometre taşı bulunamadı' }, { status: 404 });
    }

    await prisma.actionMilestone.delete({
      where: { id: milestoneId },
    });

    // Tarihçeye ekle
    await prisma.strategicActionHistory.create({
      data: {
        actionId: id,
        userId: session.user.id,
        actionType: 'KILOMETRE_TASI_SILINDI',
        oldValue: milestone.name,
        comments: `"${milestone.name}" kilometre taşı silindi`,
      },
    });

    // Aksiyon ilerlemesini güncelle
    await updateActionProgress(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Milestone delete error:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// Aksiyon ilerlemesini kilometre taşlarına göre güncelle
async function updateActionProgress(actionId: string) {
  const milestones = await prisma.actionMilestone.findMany({
    where: { actionId },
  });

  if (milestones.length === 0) return;

  const totalWeight = milestones.reduce((sum, m) => sum + m.weight, 0);
  const completedWeight = milestones
    .filter(m => m.status === 'TAMAMLANDI')
    .reduce((sum, m) => sum + m.weight, 0);

  const progress = totalWeight > 0 ? (completedWeight / totalWeight) * 100 : 0;

  await prisma.strategicAction.update({
    where: { id: actionId },
    data: { progress },
  });
}
