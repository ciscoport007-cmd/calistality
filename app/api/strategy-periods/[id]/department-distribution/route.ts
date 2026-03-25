import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const periodId = params.id;

    // Tüm departmanları al
    const departments = await prisma.department.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    // Stratejik Amaçları departmana göre grupla
    const objectives = await prisma.strategicObjective.findMany({
      where: { periodId, isActive: true },
      include: {
        department: true,
        goals: {
          where: { isActive: true },
          include: {
            department: true,
            subGoals: {
              where: { isActive: true },
              include: { department: true },
            },
            actions: {
              where: { isActive: true },
              include: { department: true },
            },
          },
        },
      },
    });

    // Departman bazlı istatistikleri hesapla
    const departmentStats: Record<string, {
      id: string;
      name: string;
      code: string;
      objectives: number;
      goals: number;
      subGoals: number;
      actions: number;
      total: number;
      objectiveProgress: number;
      goalProgress: number;
      actionProgress: number;
    }> = {};

    // "Atanmamış" için özel kategori
    departmentStats['unassigned'] = {
      id: 'unassigned',
      name: 'Atanmamış',
      code: '-',
      objectives: 0,
      goals: 0,
      subGoals: 0,
      actions: 0,
      total: 0,
      objectiveProgress: 0,
      goalProgress: 0,
      actionProgress: 0,
    };

    // Departmanları başlat
    departments.forEach((dept: any) => {
      departmentStats[dept.id] = {
        id: dept.id,
        name: dept.name,
        code: dept.code,
        objectives: 0,
        goals: 0,
        subGoals: 0,
        actions: 0,
        total: 0,
        objectiveProgress: 0,
        goalProgress: 0,
        actionProgress: 0,
      };
    });

    // İstatistikleri hesapla
    let totalObjectiveProgress = 0;
    let totalGoalProgress = 0;
    let totalActionProgress = 0;
    let objectiveCount = 0;
    let goalCount = 0;
    let actionCount = 0;

    objectives.forEach((obj: any) => {
      const deptId = obj.departmentId || 'unassigned';
      if (departmentStats[deptId]) {
        departmentStats[deptId].objectives++;
        departmentStats[deptId].objectiveProgress += obj.progress || 0;
        totalObjectiveProgress += obj.progress || 0;
        objectiveCount++;
      }

      obj.goals.forEach((goal: any) => {
        const goalDeptId = goal.departmentId || 'unassigned';
        if (departmentStats[goalDeptId]) {
          departmentStats[goalDeptId].goals++;
          departmentStats[goalDeptId].goalProgress += goal.progress || 0;
          totalGoalProgress += goal.progress || 0;
          goalCount++;
        }

        goal.subGoals.forEach((subGoal: any) => {
          const subGoalDeptId = subGoal.departmentId || 'unassigned';
          if (departmentStats[subGoalDeptId]) {
            departmentStats[subGoalDeptId].subGoals++;
          }
        });

        goal.actions.forEach((action: any) => {
          const actionDeptId = action.departmentId || 'unassigned';
          if (departmentStats[actionDeptId]) {
            departmentStats[actionDeptId].actions++;
            departmentStats[actionDeptId].actionProgress += action.progress || 0;
            totalActionProgress += action.progress || 0;
            actionCount++;
          }
        });
      });
    });

    // Toplamları ve ortalamaları hesapla
    Object.keys(departmentStats).forEach((key) => {
      const stat = departmentStats[key];
      stat.total = stat.objectives + stat.goals + stat.subGoals + stat.actions;
      
      // Ortalama ilerleme hesapla
      if (stat.objectives > 0) {
        stat.objectiveProgress = Math.round(stat.objectiveProgress / stat.objectives);
      }
      if (stat.goals > 0) {
        stat.goalProgress = Math.round(stat.goalProgress / stat.goals);
      }
      if (stat.actions > 0) {
        stat.actionProgress = Math.round(stat.actionProgress / stat.actions);
      }
    });

    // Sonuçları diziye çevir ve sırala (toplama göre azalan)
    const distribution = Object.values(departmentStats)
      .filter((stat) => stat.total > 0 || stat.id === 'unassigned')
      .sort((a, b) => b.total - a.total);

    // Genel istatistikler
    const summary = {
      totalObjectives: objectiveCount,
      totalGoals: goalCount,
      totalSubGoals: objectives.reduce(
        (sum: number, obj: any) => sum + obj.goals.reduce((gSum: number, g: any) => gSum + g.subGoals.length, 0),
        0
      ),
      totalActions: actionCount,
      avgObjectiveProgress: objectiveCount > 0 ? Math.round(totalObjectiveProgress / objectiveCount) : 0,
      avgGoalProgress: goalCount > 0 ? Math.round(totalGoalProgress / goalCount) : 0,
      avgActionProgress: actionCount > 0 ? Math.round(totalActionProgress / actionCount) : 0,
      departmentCount: distribution.filter((d) => d.id !== 'unassigned' && d.total > 0).length,
    };

    return NextResponse.json({
      distribution,
      summary,
    });
  } catch (error) {
    console.error('Error fetching department distribution:', error);
    return NextResponse.json(
      { error: 'Departman dağılımı alınamadı' },
      { status: 500 }
    );
  }
}
