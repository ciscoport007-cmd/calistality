import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Bireysel Karne - Individual Scorecard
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = params.id;
    const { searchParams } = new URL(request.url);
    const periodId = searchParams.get('periodId');

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        department: { select: { id: true, name: true, code: true } },
        position: { select: { id: true, name: true } },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Kullanıcı bulunamadı' },
        { status: 404 }
      );
    }

    // Get active period if not specified
    let activePeriod;
    if (periodId) {
      activePeriod = await prisma.strategyPeriod.findUnique({
        where: { id: periodId },
      });
    } else {
      activePeriod = await prisma.strategyPeriod.findFirst({
        where: { status: 'AKTIF' },
        orderBy: { startDate: 'desc' },
      });
    }

    if (!activePeriod) {
      return NextResponse.json({
        success: true,
        data: null,
        message: 'Aktif strateji dönemi bulunamadı',
      });
    }

    // Get owned objectives
    const ownedObjectives = await prisma.strategicObjective.findMany({
      where: {
        ownerId: userId,
        periodId: activePeriod.id,
        isActive: true,
      },
      include: {
        perspective: true,
        goals: {
          where: { isActive: true },
        },
      },
    });

    // Get owned goals
    const ownedGoals = await prisma.strategicGoal.findMany({
      where: {
        ownerId: userId,
        objective: { periodId: activePeriod.id },
        isActive: true,
      },
      include: {
        objective: { include: { perspective: true } },
        subGoals: { where: { isActive: true } },
        actions: { where: { isActive: true } },
      },
    });

    // Get owned sub-goals
    const ownedSubGoals = await prisma.strategicSubGoal.findMany({
      where: {
        ownerId: userId,
        goal: { objective: { periodId: activePeriod.id } },
        isActive: true,
      },
      include: {
        goal: {
          include: {
            objective: { include: { perspective: true } },
          },
        },
        actions: { where: { isActive: true } },
      },
    });

    // Get responsible actions
    const responsibleActions = await prisma.strategicAction.findMany({
      where: {
        responsibleId: userId,
        isActive: true,
        OR: [
          { goal: { objective: { periodId: activePeriod.id } } },
          { subGoal: { goal: { objective: { periodId: activePeriod.id } } } },
        ],
      },
      include: {
        goal: {
          include: {
            objective: { include: { perspective: true } },
          },
        },
        subGoal: {
          include: {
            goal: {
              include: {
                objective: { include: { perspective: true } },
              },
            },
          },
        },
      },
    });

    // Get accountable actions
    const accountableActions = await prisma.strategicAction.findMany({
      where: {
        accountableId: userId,
        isActive: true,
        OR: [
          { goal: { objective: { periodId: activePeriod.id } } },
          { subGoal: { goal: { objective: { periodId: activePeriod.id } } } },
        ],
      },
    });

    // Get owned KPIs
    const ownedKPIs = await prisma.kPI.findMany({
      where: {
        ownerId: userId,
        isActive: true,
      },
      include: {
        measurements: {
          orderBy: { measurementDate: 'desc' },
          take: 1,
        },
      },
    });

    // Calculate metrics
    const objectivesCompleted = ownedObjectives.filter(
      (o: any) => o.status === 'TAMAMLANDI'
    ).length;
    const objectivesAvgProgress =
      ownedObjectives.length > 0
        ? Math.round(
            ownedObjectives.reduce((sum: number, o: any) => sum + (o.progress || 0), 0) /
              ownedObjectives.length
          )
        : 0;

    const goalsCompleted = ownedGoals.filter(
      (g: any) => g.status === 'TAMAMLANDI'
    ).length;
    const goalsAvgProgress =
      ownedGoals.length > 0
        ? Math.round(
            ownedGoals.reduce((sum: number, g: any) => sum + (g.progress || 0), 0) /
              ownedGoals.length
          )
        : 0;

    const subGoalsCompleted = ownedSubGoals.filter(
      (sg: any) => sg.status === 'TAMAMLANDI'
    ).length;

    const actionsCompleted = responsibleActions.filter(
      (a: any) => a.status === 'KAPANDI' || a.completionRate === 100
    ).length;
    const actionsInProgress = responsibleActions.filter(
      (a: any) => a.status === 'DEVAM_EDIYOR'
    ).length;
    const actionsDelayed = responsibleActions.filter(
      (a: any) =>
        a.status !== 'KAPANDI' &&
        a.plannedEndDate &&
        new Date(a.plannedEndDate) < new Date()
    ).length;
    const actionsAvgCompletion =
      responsibleActions.length > 0
        ? Math.round(
            responsibleActions.reduce(
              (sum: number, a: any) => sum + (a.completionRate || 0),
              0
            ) / responsibleActions.length
          )
        : 0;

    // KPI metrics
    let kpisOnTarget = 0;
    let kpisWarning = 0;
    let kpisCritical = 0;

    ownedKPIs.forEach((kpi: any) => {
      if (kpi.measurements.length > 0) {
        const lastMeasurement = kpi.measurements[0];
        const targetValue = kpi.targetValue || 0;
        const ratio = targetValue > 0 ? lastMeasurement.value / targetValue : 0;
        if (ratio >= 0.9) kpisOnTarget++;
        else if (ratio >= 0.7) kpisWarning++;
        else kpisCritical++;
      }
    });

    // Calculate overall score
    const weights = {
      objectives: 0.2,
      goals: 0.25,
      subGoals: 0.1,
      actions: 0.3,
      kpis: 0.15,
    };

    const objectiveScore =
      ownedObjectives.length > 0 ? objectivesAvgProgress : null;
    const goalScore = ownedGoals.length > 0 ? goalsAvgProgress : null;
    const subGoalScore =
      ownedSubGoals.length > 0
        ? (subGoalsCompleted / ownedSubGoals.length) * 100
        : null;
    const actionScore =
      responsibleActions.length > 0 ? actionsAvgCompletion : null;
    const kpiScore =
      ownedKPIs.length > 0 ? (kpisOnTarget / ownedKPIs.length) * 100 : null;

    // Calculate weighted score (only for items user has)
    let weightSum = 0;
    let scoreSum = 0;

    if (objectiveScore !== null) {
      scoreSum += objectiveScore * weights.objectives;
      weightSum += weights.objectives;
    }
    if (goalScore !== null) {
      scoreSum += goalScore * weights.goals;
      weightSum += weights.goals;
    }
    if (subGoalScore !== null) {
      scoreSum += subGoalScore * weights.subGoals;
      weightSum += weights.subGoals;
    }
    if (actionScore !== null) {
      scoreSum += actionScore * weights.actions;
      weightSum += weights.actions;
    }
    if (kpiScore !== null) {
      scoreSum += kpiScore * weights.kpis;
      weightSum += weights.kpis;
    }

    const overallScore = weightSum > 0 ? Math.round(scoreSum / weightSum) : 0;

    // Group by perspective
    const byPerspective: Record<
      string,
      { objectives: number; goals: number; actions: number }
    > = {};

    ownedObjectives.forEach((obj: any) => {
      const pCode = obj.perspective?.code || 'DIGER';
      if (!byPerspective[pCode]) {
        byPerspective[pCode] = { objectives: 0, goals: 0, actions: 0 };
      }
      byPerspective[pCode].objectives++;
    });

    ownedGoals.forEach((goal: any) => {
      const pCode = goal.objective?.perspective?.code || 'DIGER';
      if (!byPerspective[pCode]) {
        byPerspective[pCode] = { objectives: 0, goals: 0, actions: 0 };
      }
      byPerspective[pCode].goals++;
    });

    responsibleActions.forEach((action: any) => {
      const perspective =
        action.goal?.objective?.perspective ||
        action.subGoal?.goal?.objective?.perspective;
      const pCode = perspective?.code || 'DIGER';
      if (!byPerspective[pCode]) {
        byPerspective[pCode] = { objectives: 0, goals: 0, actions: 0 };
      }
      byPerspective[pCode].actions++;
    });

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: `${user.name} ${user.surname || ''}`.trim(),
          email: user.email,
          department: user.department,
          position: user.position?.name,
        },
        period: {
          id: activePeriod.id,
          name: activePeriod.name,
          startDate: activePeriod.startDate,
          endDate: activePeriod.endDate,
        },
        overallScore,
        metrics: {
          objectives: {
            total: ownedObjectives.length,
            completed: objectivesCompleted,
            avgProgress: objectivesAvgProgress,
          },
          goals: {
            total: ownedGoals.length,
            completed: goalsCompleted,
            avgProgress: goalsAvgProgress,
          },
          subGoals: {
            total: ownedSubGoals.length,
            completed: subGoalsCompleted,
          },
          actions: {
            responsible: responsibleActions.length,
            accountable: accountableActions.length,
            completed: actionsCompleted,
            inProgress: actionsInProgress,
            delayed: actionsDelayed,
            avgCompletion: actionsAvgCompletion,
          },
          kpis: {
            total: ownedKPIs.length,
            onTarget: kpisOnTarget,
            warning: kpisWarning,
            critical: kpisCritical,
          },
        },
        byPerspective,
        objectives: ownedObjectives.map((obj: any) => ({
          id: obj.id,
          code: obj.code,
          name: obj.name,
          status: obj.status,
          progress: obj.progress,
          perspective: obj.perspective?.name,
          goalsCount: obj.goals.length,
        })),
        goals: ownedGoals.map((goal: any) => ({
          id: goal.id,
          code: goal.code,
          name: goal.name,
          status: goal.status,
          progress: goal.progress,
          perspective: goal.objective?.perspective?.name,
          actionsCount: goal.actions.length + goal.subGoals.reduce((s: number, sg: any) => s + sg.actions.length, 0),
        })),
        actions: responsibleActions.slice(0, 10).map((action: any) => ({
          id: action.id,
          code: action.code,
          name: action.name,
          status: action.status,
          completionRate: action.completionRate,
          plannedEndDate: action.plannedEndDate,
          isDelayed:
            action.status !== 'KAPANDI' &&
            action.plannedEndDate &&
            new Date(action.plannedEndDate) < new Date(),
        })),
        kpis: ownedKPIs.map((kpi: any) => ({
          id: kpi.id,
          code: kpi.code,
          name: kpi.name,
          targetValue: kpi.targetValue,
          currentValue: kpi.measurements[0]?.value || null,
          unit: kpi.unit,
        })),
      },
    });
  } catch (error) {
    console.error('Individual scorecard error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
