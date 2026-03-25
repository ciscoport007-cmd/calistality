import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth-options';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const periodId = searchParams.get('periodId');

    // Aktif strateji dönemini al
    let period;
    if (periodId) {
      period = await prisma.strategyPeriod.findUnique({
        where: { id: periodId },
        include: { perspectives: true },
      });
    } else {
      period = await prisma.strategyPeriod.findFirst({
        where: { status: 'AKTIF' },
        include: { perspectives: true },
      });
    }

    if (!period) {
      return NextResponse.json({ error: 'Aktif strateji dönemi bulunamadı' }, { status: 404 });
    }

    // BSC Perspektiflerine göre hedefleri al
    const objectives = await prisma.strategicObjective.findMany({
      where: { periodId: period.id, isActive: true },
      include: {
        perspective: true,
        department: true,
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
              include: { kpi: true },
            },
          },
        },
      },
      orderBy: [{ perspectiveId: 'asc' }, { sortOrder: 'asc' }],
    });

    // Perspektiflere göre grupla
    const perspectiveMap: Record<string, any> = {};
    
    for (const perspective of period.perspectives) {
      const perspectiveObjectives = objectives.filter((o: any) => o.perspectiveId === perspective.id);
      
      let totalGoals = 0;
      let completedGoals = 0;
      let totalActions = 0;
      let completedActions = 0;
      let totalProgress = 0;
      let goalCount = 0;

      for (const obj of perspectiveObjectives as any[]) {
        for (const goal of obj.goals || []) {
          totalGoals++;
          if (goal.status === 'TAMAMLANDI') completedGoals++;
          totalProgress += goal.progress || 0;
          goalCount++;

          for (const action of goal.actions || []) {
            totalActions++;
            if (action.status === 'TAMAMLANDI') completedActions++;
          }

          for (const subGoal of goal.subGoals || []) {
            for (const action of subGoal.actions || []) {
              totalActions++;
              if (action.status === 'TAMAMLANDI') completedActions++;
            }
          }
        }
      }

      perspectiveMap[perspective.id] = {
        id: perspective.id,
        name: perspective.name,
        code: perspective.code,
        color: perspective.color,
        objectives: perspectiveObjectives.map((o: any) => ({
          id: o.id,
          code: o.code,
          name: o.name,
          status: o.status,
          progress: o.progress,
          goals: (o.goals || []).map((g: any) => ({
            id: g.id,
            code: g.code,
            name: g.name,
            status: g.status,
            progress: g.progress,
            targetValue: g.targetValue,
            currentValue: g.currentValue,
            kpis: (g.kpis || []).map((k: any) => ({
              id: k.kpi.id,
              code: k.kpi.code,
              name: k.kpi.name,
              targetValue: k.kpi.targetValue,
              currentValue: k.kpi.lastMeasurementValue,
              performance: k.kpi.lastMeasurementPerformance,
              status: k.kpi.lastMeasurementStatus,
            })),
            actionCount: (g.actions?.length || 0) + (g.subGoals || []).reduce((sum: number, sg: any) => sum + (sg.actions?.length || 0), 0),
            completedActionCount: (g.actions || []).filter((a: any) => a.status === 'TAMAMLANDI').length +
              (g.subGoals || []).reduce((sum: number, sg: any) => sum + (sg.actions || []).filter((a: any) => a.status === 'TAMAMLANDI').length, 0),
          })),
        })),
        stats: {
          objectiveCount: perspectiveObjectives.length,
          goalCount: totalGoals,
          completedGoals,
          actionCount: totalActions,
          completedActions,
          avgProgress: goalCount > 0 ? Math.round(totalProgress / goalCount) : 0,
        },
      };
    }

    // Genel istatistikler
    const allActions = await prisma.strategicAction.findMany({
      where: {
        isActive: true,
        OR: [
          { goal: { objective: { periodId: period.id } } },
          { subGoal: { goal: { objective: { periodId: period.id } } } },
        ],
      },
    });

    const overallStats = {
      totalObjectives: objectives.length,
      totalGoals: objectives.reduce((sum: number, o: any) => sum + (o.goals?.length || 0), 0),
      totalActions: allActions.length,
      completedActions: allActions.filter(a => a.status === 'TAMAMLANDI').length,
      inProgressActions: allActions.filter(a => a.status === 'DEVAM_EDIYOR').length,
      delayedActions: allActions.filter(a => {
        if (!a.dueDate) return false;
        return new Date(a.dueDate) < new Date() && a.status !== 'TAMAMLANDI';
      }).length,
      avgProgress: allActions.length > 0
        ? Math.round(allActions.reduce((sum, a) => sum + a.progress, 0) / allActions.length)
        : 0,
      totalBudgetPlanned: allActions.reduce((sum, a) => sum + (a.budgetPlanned || 0), 0),
      totalBudgetActual: allActions.reduce((sum, a) => sum + (a.budgetActual || 0), 0),
    };

    return NextResponse.json({
      period: {
        id: period.id,
        code: period.code,
        name: period.name,
        startDate: period.startDate,
        endDate: period.endDate,
        status: period.status,
      },
      perspectives: Object.values(perspectiveMap),
      overallStats,
    });
  } catch (error) {
    console.error('Scorecard fetch error:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
