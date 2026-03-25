import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth-options';
import { createNotification, notifyActionStakeholders, NotificationTemplates } from '@/lib/notifications';
import { updateProgressAfterActionChange } from '@/lib/progress-calculator';

// GET - Aksiyon detayı
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const action = await prisma.strategicAction.findUnique({
      where: { id },
      include: {
        goal: {
          include: {
            objective: {
              include: { period: true, perspective: true },
            },
          },
        },
        subGoal: {
          include: { goal: true },
        },
        department: true,
        responsible: {
          select: { id: true, name: true, email: true },
        },
        accountable: {
          select: { id: true, name: true, email: true },
        },
        kpis: {
          include: { kpi: true },
        },
        risks: {
          include: { risk: true },
        },
        milestones: {
          include: {
            completedBy: {
              select: { id: true, name: true, surname: true },
            },
          },
          orderBy: { plannedDate: 'asc' },
        },
        histories: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        closedBy: {
          select: { id: true, name: true, email: true },
        },
        attachments: {
          where: { isClosingEvidence: true },
          include: {
            uploadedBy: {
              select: { id: true, name: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!action) {
      return NextResponse.json({ error: 'Action not found' }, { status: 404 });
    }

    // Kapanış kanıtı istatistikleri
    const closingEvidenceCount = action.attachments.length;

    // Kilometre taşı istatistikleri
    const milestoneStats = {
      total: action.milestones.length,
      completed: action.milestones.filter((m: any) => m.status === 'TAMAMLANDI').length,
      inProgress: action.milestones.filter((m: any) => m.status === 'DEVAM_EDIYOR').length,
      pending: action.milestones.filter((m: any) => m.status === 'BEKLIYOR').length,
      delayed: action.milestones.filter((m: any) => m.status === 'GECIKTI').length,
    };

    return NextResponse.json({ ...action, milestoneStats, closingEvidenceCount });
  } catch (error) {
    console.error('Error fetching action:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Aksiyon güncelle
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const currentAction = await prisma.strategicAction.findUnique({
      where: { id },
    });

    if (!currentAction) {
      return NextResponse.json({ error: 'Action not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (body.name) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.status) updateData.status = body.status;
    if (body.priority) updateData.priority = body.priority;
    if (body.departmentId !== undefined) updateData.departmentId = body.departmentId;
    if (body.responsibleId !== undefined) updateData.responsibleId = body.responsibleId;
    if (body.accountableId !== undefined) updateData.accountableId = body.accountableId;
    if (body.startDate !== undefined) updateData.startDate = body.startDate ? new Date(body.startDate) : null;
    if (body.endDate !== undefined) updateData.endDate = body.endDate ? new Date(body.endDate) : null;
    if (body.dueDate !== undefined) updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (body.completedDate !== undefined) updateData.completedDate = body.completedDate ? new Date(body.completedDate) : null;
    if (body.progress !== undefined) updateData.progress = parseFloat(body.progress);
    if (body.budgetPlanned !== undefined) updateData.budgetPlanned = body.budgetPlanned ? parseFloat(body.budgetPlanned) : null;
    if (body.budgetActual !== undefined) updateData.budgetActual = body.budgetActual ? parseFloat(body.budgetActual) : null;
    if (body.currency !== undefined) updateData.currency = body.currency;
    if (body.budgetType !== undefined) updateData.budgetType = body.budgetType;
    if (body.expectedGain !== undefined) updateData.expectedGain = body.expectedGain ? parseFloat(body.expectedGain) : null;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.evidence !== undefined) updateData.evidence = body.evidence;
    if (body.blockReason !== undefined) updateData.blockReason = body.blockReason;

    const action = await prisma.strategicAction.update({
      where: { id },
      data: updateData,
      include: {
        goal: true,
        subGoal: true,
        department: true,
        responsible: {
          select: { id: true, name: true, email: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Durum değişikliği tarihçesi ve bildirimi
    const statusLabels: Record<string, string> = {
      PLANLANDI: 'Planlandı',
      DEVAM_EDIYOR: 'Devam Ediyor',
      BEKLEMEDE: 'Beklemede',
      BLOKAJ: 'Blokajda',
      TAMAMLANDI: 'Tamamlandı',
      IPTAL: 'İptal Edildi',
    };

    if (body.status && body.status !== currentAction.status) {
      await prisma.strategicActionHistory.create({
        data: {
          actionId: id,
          userId: session.user.id,
          actionType: 'DURUM_DEGISTI',
          oldValue: currentAction.status,
          newValue: body.status,
          comments: body.statusComment,
        },
      });

      const oldStatusLabel = statusLabels[currentAction.status] || currentAction.status;
      const newStatusLabel = statusLabels[body.status] || body.status;
      const changerName = session.user.name || 'Bir kullanıcı';

      // Duruma göre farklı bildirimler gönder
      if (body.status === 'TAMAMLANDI') {
        // Tamamlandı bildirimi - herkese gönder + departman yöneticileri
        const template = NotificationTemplates.actionCompleted(action.code, action.name);
        await notifyActionStakeholders(id, session.user.id, template, { includeDepartmentManager: true });
      } else if (body.status === 'BLOKAJ') {
        // Blokaj bildirimi - acil, herkese + departman yöneticileri
        const template = NotificationTemplates.actionBlocked(action.code, body.blockReason || '');
        await notifyActionStakeholders(id, session.user.id, template, { includeDepartmentManager: true });
      } else if (currentAction.status === 'BLOKAJ' && body.status !== 'BLOKAJ') {
        // Blokaj kaldırıldı bildirimi
        const template = NotificationTemplates.actionUnblocked(action.code);
        await notifyActionStakeholders(id, session.user.id, template);
      } else if (body.status === 'IPTAL') {
        // İptal bildirimi - herkese + departman yöneticileri
        const template = NotificationTemplates.actionCancelled(action.code, action.name);
        await notifyActionStakeholders(id, session.user.id, template, { includeDepartmentManager: true });
      } else {
        // Genel durum değişikliği bildirimi
        const template = NotificationTemplates.actionStatusChanged(action.code, oldStatusLabel, newStatusLabel, changerName);
        await notifyActionStakeholders(id, session.user.id, template);
      }
    }

    // Sorumlu değişikliği tarihçesi ve bildirimi
    if (body.responsibleId && body.responsibleId !== currentAction.responsibleId) {
      await prisma.strategicActionHistory.create({
        data: {
          actionId: id,
          userId: session.user.id,
          actionType: 'SORUMLU_DEGISTI',
          oldValue: currentAction.responsibleId,
          newValue: body.responsibleId,
        },
      });

      // Yeni sorumluya bildirim gönder
      if (body.responsibleId !== session.user.id) {
        const template = NotificationTemplates.actionAssigned(action.code, action.name);
        await createNotification({
          userId: body.responsibleId,
          ...template,
          link: `/dashboard/strategy/actions/${id}`,
        });
      }

      // Eski sorumluya bildirim gönder
      if (currentAction.responsibleId && currentAction.responsibleId !== session.user.id) {
        const template = NotificationTemplates.actionResponsibleRemoved(action.code);
        await createNotification({
          userId: currentAction.responsibleId,
          ...template,
          link: `/dashboard/strategy/actions/${id}`,
        });
      }
    }

    // Onaylayan değişikliği bildirimi
    if (body.accountableId && body.accountableId !== currentAction.accountableId) {
      await prisma.strategicActionHistory.create({
        data: {
          actionId: id,
          userId: session.user.id,
          actionType: 'ONAYLAYAN_DEGISTI',
          oldValue: currentAction.accountableId,
          newValue: body.accountableId,
        },
      });

      // Yeni onaylayan kişiye bildirim gönder
      if (body.accountableId !== session.user.id) {
        const template = NotificationTemplates.actionAccountableAssigned(action.code, action.name);
        await createNotification({
          userId: body.accountableId,
          ...template,
          link: `/dashboard/strategy/actions/${id}`,
        });
      }
    }

    // İlerleme tarihçesi ve bildirimi
    if (body.progress !== undefined && body.progress !== currentAction.progress) {
      await prisma.strategicActionHistory.create({
        data: {
          actionId: id,
          userId: session.user.id,
          actionType: 'ILERLEME_GUNCELLENDI',
          oldValue: currentAction.progress?.toString(),
          newValue: body.progress.toString(),
        },
      });

      // İlerleme %100 olduğunda veya önemli değişikliklerde bildir
      const progressDiff = Math.abs(body.progress - (currentAction.progress || 0));
      if (body.progress === 100 || progressDiff >= 25) {
        const template = NotificationTemplates.actionProgressUpdated(action.code, body.progress);
        await notifyActionStakeholders(id, session.user.id, template, { 
          includeResponsible: false, // Sorumlu zaten güncelliyordur
        });
      }

      // Üst hedefin ilerlemesini otomatik güncelle
      await updateProgressAfterActionChange(id);
    }

    return NextResponse.json(action);
  } catch (error) {
    console.error('Error updating action:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Aksiyon sil (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    await prisma.strategicAction.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting action:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
