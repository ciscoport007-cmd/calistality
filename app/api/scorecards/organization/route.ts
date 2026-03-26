import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Kurum Karnesi - Organization Scorecard
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const periodId = searchParams.get('periodId');

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

    // Get BSC Perspectives with aggregated data
    const perspectives = await prisma.bSCPerspective.findMany({
      where: { periodId: activePeriod.id, isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        objectives: {
          where: { isActive: true },
          include: {
            goals: {
              where: { isActive: true },
              include: {
                subGoals: {
                  where: { isActive: true },
                  include: {
                    actions: {
                      where: { isActive: true },
                    },
                  },
                },
                actions: {
                  where: { isActive: true },
                },
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
        },
      },
    });

    // Calculate metrics per perspective
    const perspectiveScores = perspectives.map((perspective: any) => {
      let totalObjectives = perspective.objectives.length;
      let completedObjectives = 0;
      let objectiveProgress = 0;
      let totalGoals = 0;
      let completedGoals = 0;
      let totalActions = 0;
      let completedActions = 0;
      let totalKPIs = 0;
      let kpisOnTarget = 0;

      perspective.objectives.forEach((obj: any) => {
        if (obj.status === 'TAMAMLANDI') completedObjectives++;
        objectiveProgress += obj.progress || 0;

        obj.goals.forEach((goal: any) => {
          totalGoals++;
          if (goal.status === 'TAMAMLANDI') completedGoals++;

          // Actions directly under goal
          goal.actions.forEach((action: any) => {
            totalActions++;
            if (action.status === 'KAPANDI' || action.completionRate === 100) {
              completedActions++;
            }
          });

          // Actions under subgoals
          goal.subGoals.forEach((subGoal: any) => {
            subGoal.actions.forEach((action: any) => {
              totalActions++;
              if (action.status === 'KAPANDI' || action.completionRate === 100) {
                completedActions++;
              }
            });
          });

          // KPIs
          goal.kpis.forEach((goalKpi: any) => {
            totalKPIs++;
            if (goalKpi.kpi.measurements.length > 0) {
              const lastMeasurement = goalKpi.kpi.measurements[0];
              const targetValue = goalKpi.kpi.targetValue || 0;
              if (lastMeasurement.value >= targetValue * 0.9) {
                kpisOnTarget++;
              }
            }
          });
        });
      });

      const avgObjectiveProgress =
        totalObjectives > 0 ? objectiveProgress / totalObjectives : 0;
      const goalCompletionRate =
        totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;
      const actionCompletionRate =
        totalActions > 0 ? (completedActions / totalActions) * 100 : 0;
      const kpiAchievementRate =
        totalKPIs > 0 ? (kpisOnTarget / totalKPIs) * 100 : 0;

      // Overall perspective score (weighted average)
      const perspectiveScore =
        avgObjectiveProgress * 0.3 +
        goalCompletionRate * 0.3 +
        actionCompletionRate * 0.25 +
        kpiAchievementRate * 0.15;

      return {
        id: perspective.id,
        code: perspective.code,
        name: perspective.name,
        color: perspective.color,
        sortOrder: perspective.sortOrder,
        metrics: {
          totalObjectives,
          completedObjectives,
          avgObjectiveProgress: Math.round(avgObjectiveProgress),
          totalGoals,
          completedGoals,
          goalCompletionRate: Math.round(goalCompletionRate),
          totalActions,
          completedActions,
          actionCompletionRate: Math.round(actionCompletionRate),
          totalKPIs,
          kpisOnTarget,
          kpiAchievementRate: Math.round(kpiAchievementRate),
        },
        score: Math.round(perspectiveScore),
      };
    });

    // Calculate overall organization score
    const overallScore =
      perspectiveScores.length > 0
        ? Math.round(
            perspectiveScores.reduce((sum: number, p: any) => sum + p.score, 0) /
              perspectiveScores.length
          )
        : 0;

    // Aggregate totals
    const totals = perspectiveScores.reduce(
      (acc: any, p: any) => ({
        totalObjectives: acc.totalObjectives + p.metrics.totalObjectives,
        completedObjectives:
          acc.completedObjectives + p.metrics.completedObjectives,
        totalGoals: acc.totalGoals + p.metrics.totalGoals,
        completedGoals: acc.completedGoals + p.metrics.completedGoals,
        totalActions: acc.totalActions + p.metrics.totalActions,
        completedActions: acc.completedActions + p.metrics.completedActions,
        totalKPIs: acc.totalKPIs + p.metrics.totalKPIs,
        kpisOnTarget: acc.kpisOnTarget + p.metrics.kpisOnTarget,
      }),
      {
        totalObjectives: 0,
        completedObjectives: 0,
        totalGoals: 0,
        completedGoals: 0,
        totalActions: 0,
        completedActions: 0,
        totalKPIs: 0,
        kpisOnTarget: 0,
      }
    );

    return NextResponse.json({
      success: true,
      data: {
        period: {
          id: activePeriod.id,
          name: activePeriod.name,
          startDate: activePeriod.startDate,
          endDate: activePeriod.endDate,
          status: activePeriod.status,
        },
        overallScore,
        perspectives: perspectiveScores,
        totals: {
          ...totals,
          objectiveCompletionRate:
            totals.totalObjectives > 0
              ? Math.round(
                  (totals.completedObjectives / totals.totalObjectives) * 100
                )
              : 0,
          goalCompletionRate:
            totals.totalGoals > 0
              ? Math.round(
                  (totals.completedGoals / totals.totalGoals) * 100
                )
              : 0,
          actionCompletionRate:
            totals.totalActions > 0
              ? Math.round(
                  (totals.completedActions / totals.totalActions) * 100
                )
              : 0,
          kpiAchievementRate:
            totals.totalKPIs > 0
              ? Math.round((totals.kpisOnTarget / totals.totalKPIs) * 100)
              : 0,
        },
      },
    });
  } catch (error) {
    console.error('Organization scorecard error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
