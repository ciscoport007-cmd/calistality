import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Departman Karnesi - Department Scorecard
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const departmentId = params.id;
    const { searchParams } = new URL(request.url);
    const periodId = searchParams.get('periodId');

    // Get department
    const department = await prisma.department.findUnique({
      where: { id: departmentId },
    });

    if (!department) {
      return NextResponse.json(
        { error: 'Departman bulunamadı' },
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

    // Get objectives for this department
    const objectives = await prisma.strategicObjective.findMany({
      where: {
        periodId: activePeriod.id,
        departmentId: departmentId,
        isActive: true,
      },
      include: {
        perspective: true,
        owner: { select: { id: true, name: true, surname: true } },
        goals: {
          where: { isActive: true },
          include: {
            subGoals: {
              where: { isActive: true },
              include: {
                actions: { where: { isActive: true } },
              },
            },
            actions: { where: { isActive: true } },
            kpis: {
              include: {
                kpi: {
                  include: {
                    measurements: {
                      orderBy: { measurementDate: 'desc' },
                      take: 1,
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    // Get goals assigned to this department (even if objective is elsewhere)
    const departmentGoals = await prisma.strategicGoal.findMany({
      where: {
        departmentId: departmentId,
        objective: { periodId: activePeriod.id },
        isActive: true,
      },
      include: {
        objective: {
          include: { perspective: true },
        },
        subGoals: {
          where: { isActive: true },
          include: {
            actions: { where: { isActive: true } },
          },
        },
        actions: { where: { isActive: true } },
        kpis: {
          include: {
            kpi: {
              include: {
                measurements: {
                  orderBy: { measurementDate: 'desc' },
                  take: 1,
                },
              },
            },
          },
        },
        owner: { select: { id: true, name: true, surname: true } },
      },
    });

    // Get actions assigned to this department
    const departmentActions = await prisma.strategicAction.findMany({
      where: {
        departmentId: departmentId,
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
        responsible: { select: { id: true, name: true, surname: true } },
      },
    });

    // Calculate metrics
    let totalObjectives = objectives.length;
    let completedObjectives = objectives.filter(
      (o: any) => o.status === 'TAMAMLANDI'
    ).length;
    let avgObjectiveProgress =
      totalObjectives > 0
        ? Math.round(
            objectives.reduce((sum: number, o: any) => sum + (o.progress || 0), 0) /
              totalObjectives
          )
        : 0;

    // Unique goals (from objectives + directly assigned)
    const uniqueGoalIds = new Set<string>();
    objectives.forEach((obj: any) => obj.goals.forEach((g: any) => uniqueGoalIds.add(g.id)));
    departmentGoals.forEach((g: any) => uniqueGoalIds.add(g.id));

    let totalGoals = uniqueGoalIds.size;
    let completedGoals = 0;
    let goalProgressSum = 0;

    // Process goals from objectives
    objectives.forEach((obj: any) => {
      obj.goals.forEach((goal: any) => {
        if (goal.status === 'TAMAMLANDI') completedGoals++;
        goalProgressSum += goal.progress || 0;
      });
    });

    // Process department goals not already counted
    departmentGoals.forEach((goal: any) => {
      if (!objectives.some((obj: any) => obj.goals.some((g: any) => g.id === goal.id))) {
        if (goal.status === 'TAMAMLANDI') completedGoals++;
        goalProgressSum += goal.progress || 0;
      }
    });

    // Actions metrics
    let totalActions = departmentActions.length;
    let completedActions = departmentActions.filter(
      (a: any) => a.status === 'KAPANDI' || a.completionRate === 100
    ).length;
    let inProgressActions = departmentActions.filter(
      (a: any) => a.status === 'DEVAM_EDIYOR'
    ).length;
    let delayedActions = departmentActions.filter(
      (a: any) =>
        a.status !== 'KAPANDI' &&
        a.plannedEndDate &&
        new Date(a.plannedEndDate) < new Date()
    ).length;

    // KPIs
    const allKpis: any[] = [];
    objectives.forEach((obj: any) => {
      obj.goals.forEach((goal: any) => {
        goal.kpis.forEach((gk: any) => allKpis.push(gk));
      });
    });
    departmentGoals.forEach((goal: any) => {
      goal.kpis.forEach((gk: any) => {
        if (!allKpis.some((k: any) => k.kpiId === gk.kpiId)) {
          allKpis.push(gk);
        }
      });
    });

    let totalKPIs = allKpis.length;
    let kpisOnTarget = 0;
    let kpisWarning = 0;
    let kpisCritical = 0;

    allKpis.forEach((gk: any) => {
      if (gk.kpi.measurements.length > 0) {
        const lastMeasurement = gk.kpi.measurements[0];
        const targetValue = gk.kpi.targetValue || 0;
        const ratio = targetValue > 0 ? lastMeasurement.value / targetValue : 0;
        if (ratio >= 0.9) kpisOnTarget++;
        else if (ratio >= 0.7) kpisWarning++;
        else kpisCritical++;
      }
    });

    // Calculate overall department score
    const objectiveScore = avgObjectiveProgress;
    const goalCompletionRate =
      totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;
    const actionCompletionRate =
      totalActions > 0 ? (completedActions / totalActions) * 100 : 0;
    const kpiAchievementRate =
      totalKPIs > 0 ? (kpisOnTarget / totalKPIs) * 100 : 0;

    const overallScore = Math.round(
      objectiveScore * 0.3 +
        goalCompletionRate * 0.3 +
        actionCompletionRate * 0.25 +
        kpiAchievementRate * 0.15
    );

    // Group by perspective
    const byPerspective: Record<
      string,
      { objectives: number; goals: number; actions: number }
    > = {};

    objectives.forEach((obj: any) => {
      const pCode = obj.perspective?.code || 'DIGER';
      if (!byPerspective[pCode]) {
        byPerspective[pCode] = { objectives: 0, goals: 0, actions: 0 };
      }
      byPerspective[pCode].objectives++;
      byPerspective[pCode].goals += obj.goals.length;
    });

    departmentActions.forEach((action: any) => {
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
        department: {
          id: department.id,
          name: department.name,
          code: department.code,
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
            total: totalObjectives,
            completed: completedObjectives,
            avgProgress: avgObjectiveProgress,
          },
          goals: {
            total: totalGoals,
            completed: completedGoals,
            completionRate: Math.round(goalCompletionRate),
          },
          actions: {
            total: totalActions,
            completed: completedActions,
            inProgress: inProgressActions,
            delayed: delayedActions,
            completionRate: Math.round(actionCompletionRate),
          },
          kpis: {
            total: totalKPIs,
            onTarget: kpisOnTarget,
            warning: kpisWarning,
            critical: kpisCritical,
            achievementRate: Math.round(kpiAchievementRate),
          },
        },
        byPerspective,
        objectives: objectives.map((obj: any) => ({
          id: obj.id,
          code: obj.code,
          name: obj.name,
          status: obj.status,
          progress: obj.progress,
          perspective: obj.perspective?.name,
          owner: obj.owner
            ? `${obj.owner.name} ${obj.owner.surname || ''}`
            : null,
          goalsCount: obj.goals.length,
        })),
        actions: departmentActions.slice(0, 10).map((action: any) => ({
          id: action.id,
          code: action.code,
          name: action.name,
          status: action.status,
          completionRate: action.completionRate,
          plannedEndDate: action.plannedEndDate,
          responsible: action.responsible
            ? `${action.responsible.name} ${action.responsible.surname || ''}`
            : null,
        })),
      },
    });
  } catch (error) {
    console.error('Department scorecard error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
