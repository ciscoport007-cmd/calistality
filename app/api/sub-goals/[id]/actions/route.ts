import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth-options';
import { createNotification, NotificationTemplates } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

// GET - Alt hedefe bağlı aksiyonları listele
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

    const actions = await prisma.strategicAction.findMany({
      where: { subGoalId: id, isActive: true },
      include: {
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
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(actions);
  } catch (error) {
    console.error('Error fetching sub-goal actions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Alt hedefe yeni aksiyon ekle
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: subGoalId } = await params;
    const body = await request.json();
    const {
      name,
      description,
      priority,
      departmentId,
      departmentIds,
      responsibleId,
      accountableId,
      startDate,
      endDate,
      dueDate,
      budgetPlanned,
      currency,
      budgetType,
      expectedGain,
    } = body;

    // Alt hedef ve üst bilgilerini al
    const subGoal = await prisma.strategicSubGoal.findUnique({
      where: { id: subGoalId },
      include: {
        goal: {
          include: {
            objective: {
              include: { period: true },
            },
          },
        },
      },
    });

    if (!subGoal) {
      return NextResponse.json({ error: 'Sub-goal not found' }, { status: 404 });
    }

    const year = new Date(subGoal.goal.objective.period.startDate).getFullYear();
    const count = await prisma.strategicAction.count({
      where: { createdAt: { gte: new Date(`${year}-01-01`) } },
    });

    const code = `AKS-${year}-${(count + 1).toString().padStart(4, '0')}`;

    const action = await prisma.strategicAction.create({
      data: {
        code,
        name,
        description,
        priority: priority || 'ORTA',
        subGoalId,
        departmentId: departmentId || (departmentIds && departmentIds.length > 0 ? departmentIds[0] : null),
        departmentIds: departmentIds ? JSON.stringify(departmentIds) : null,
        responsibleId,
        accountableId,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        budgetPlanned: budgetPlanned ? parseFloat(budgetPlanned) : null,
        currency: currency || 'TRY',
        budgetType,
        expectedGain: expectedGain ? parseFloat(expectedGain) : null,
        createdById: session.user.id,
      },
      include: {
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

    // Tarihçe ekle
    await prisma.strategicActionHistory.create({
      data: {
        actionId: action.id,
        userId: session.user.id,
        actionType: 'OLUSTURULDU',
        newValue: action.status,
      },
    });

    // Sorumluya bildirim gönder
    if (responsibleId && responsibleId !== session.user.id) {
      const template = NotificationTemplates.actionAssigned(action.code, action.name);
      await createNotification({
        userId: responsibleId,
        ...template,
        link: `/dashboard/strategy/actions/${action.id}`,
      });
    }

    // Onaylayıcıya bildirim gönder
    if (accountableId && accountableId !== session.user.id && accountableId !== responsibleId) {
      const template = NotificationTemplates.actionAccountableAssigned(action.code, action.name);
      await createNotification({
        userId: accountableId,
        ...template,
        link: `/dashboard/strategy/actions/${action.id}`,
      });
    }

    return NextResponse.json(action, { status: 201 });
  } catch (error) {
    console.error('Error creating action:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
