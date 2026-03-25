import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

export async function POST(
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
    const { name, startDate, endDate, copyActions = true, copyKPILinks = false, copyRiskLinks = false } = body;

    if (!name || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Ad, başlangıç tarihi ve bitiş tarihi zorunludur' },
        { status: 400 }
      );
    }

    // Get source period with all related data
    const sourcePeriod = await prisma.strategyPeriod.findUnique({
      where: { id },
      include: {
        mission: true,
        vision: true,
        perspectives: true,
        objectives: {
          include: {
            goals: {
              include: {
                kpis: copyKPILinks ? { include: { kpi: true } } : false,
                risks: copyRiskLinks ? { include: { risk: true } } : false,
                subGoals: {
                  include: {
                    kpis: copyKPILinks ? { include: { kpi: true } } : false,
                    risks: copyRiskLinks ? { include: { risk: true } } : false,
                    actions: copyActions ? {
                      include: {
                        milestones: true,
                        kpis: copyKPILinks ? { include: { kpi: true } } : false,
                        risks: copyRiskLinks ? { include: { risk: true } } : false
                      }
                    } : false
                  }
                },
                actions: copyActions ? {
                  include: {
                    milestones: true,
                    kpis: copyKPILinks ? { include: { kpi: true } } : false,
                    risks: copyRiskLinks ? { include: { risk: true } } : false
                  }
                } : false
              }
            }
          }
        }
      }
    });

    if (!sourcePeriod) {
      return NextResponse.json({ error: 'Kaynak dönem bulunamadı' }, { status: 404 });
    }

    // Generate new period code
    const currentYear = new Date().getFullYear();
    const count = await prisma.strategyPeriod.count({
      where: {
        code: {
          startsWith: `SP-${currentYear}`
        }
      }
    });
    const newCode = `SP-${currentYear}-${String(count + 1).padStart(3, '0')}`;

    // Create new period with copied data using transaction
    const newPeriod = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Create the new period
      const period = await tx.strategyPeriod.create({
        data: {
          code: newCode,
          name,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          status: 'TASLAK',
          description: sourcePeriod.description 
            ? `${sourcePeriod.description} (${sourcePeriod.name} döneminden kopyalandı)`
            : `${sourcePeriod.name} döneminden kopyalandı`,
          createdById: session.user.id
        }
      });

      // 2. Copy Mission
      if (sourcePeriod.mission) {
        const newMission = await tx.mission.create({
          data: {
            content: sourcePeriod.mission.content,
            version: 1,
            effectiveDate: new Date(),
            createdById: session.user.id
          }
        });
        await tx.strategyPeriod.update({
          where: { id: period.id },
          data: { missionId: newMission.id }
        });
      }

      // 3. Copy Vision
      if (sourcePeriod.vision) {
        const newVision = await tx.vision.create({
          data: {
            content: sourcePeriod.vision.content,
            version: 1,
            effectiveDate: new Date(),
            targetYear: sourcePeriod.vision.targetYear,
            createdById: session.user.id
          }
        });
        await tx.strategyPeriod.update({
          where: { id: period.id },
          data: { visionId: newVision.id }
        });
      }

      // 4. Copy BSC Perspectives and create mapping
      const perspectiveMap: Record<string, string> = {};
      for (const perspective of sourcePeriod.perspectives) {
        const newPerspective = await tx.bSCPerspective.create({
          data: {
            name: perspective.name,
            code: perspective.code,
            description: perspective.description,
            color: perspective.color,
            icon: perspective.icon,
            sortOrder: perspective.sortOrder,
            periodId: period.id
          }
        });
        perspectiveMap[perspective.id] = newPerspective.id;
      }

      // 5. Copy Objectives with Goals and Sub-Goals
      for (const objective of sourcePeriod.objectives) {
        const newPerspectiveId = objective.perspectiveId ? perspectiveMap[objective.perspectiveId] : null;
        const newObjective = await tx.strategicObjective.create({
          data: {
            code: objective.code,
            name: objective.name,
            description: objective.description,
            status: 'TASLAK',
            progress: 0,
            perspectiveId: newPerspectiveId,
            periodId: period.id,
            ownerId: objective.ownerId,
            departmentId: objective.departmentId,
            createdById: session.user.id
          }
        });

        // Copy Goals
        for (const goal of objective.goals) {
          const newGoal = await tx.strategicGoal.create({
            data: {
              code: goal.code,
              name: goal.name,
              description: goal.description,
              targetValue: goal.targetValue,
              currentValue: null,
              unit: goal.unit,
              status: 'TASLAK',
              progress: 0,
              weight: goal.weight,
              objectiveId: newObjective.id,
              ownerId: goal.ownerId,
              departmentId: goal.departmentId,
              createdById: session.user.id
            }
          });

          // Copy Goal KPI Links
          if (copyKPILinks && 'kpis' in goal && Array.isArray(goal.kpis)) {
            for (const kpiLink of goal.kpis as any[]) {
              await tx.goalKPI.create({
                data: {
                  goalId: newGoal.id,
                  kpiId: kpiLink.kpiId,
                  weight: kpiLink.weight || 1.0
                }
              });
            }
          }

          // Copy Goal Risk Links
          if (copyRiskLinks && 'risks' in goal && Array.isArray(goal.risks)) {
            for (const riskLink of goal.risks as any[]) {
              await tx.goalRisk.create({
                data: {
                  goalId: newGoal.id,
                  riskId: riskLink.riskId
                }
              });
            }
          }

          // Copy Sub-Goals
          const subGoals = 'subGoals' in goal && Array.isArray(goal.subGoals) ? goal.subGoals : [];
          for (const subGoal of subGoals as any[]) {
            const newSubGoal = await tx.strategicSubGoal.create({
              data: {
                code: subGoal.code,
                name: subGoal.name,
                description: subGoal.description,
                targetValue: subGoal.targetValue,
                currentValue: null,
                unit: subGoal.unit,
                status: 'TASLAK',
                progress: 0,
                weight: subGoal.weight,
                startDate: subGoal.startDate,
                endDate: subGoal.endDate,
                goalId: newGoal.id,
                ownerId: subGoal.ownerId,
                departmentId: subGoal.departmentId,
                createdById: session.user.id
              }
            });

            // Copy SubGoal KPI Links
            if (copyKPILinks && 'kpis' in subGoal && Array.isArray(subGoal.kpis)) {
              for (const kpiLink of subGoal.kpis as any[]) {
                await tx.subGoalKPI.create({
                  data: {
                    subGoalId: newSubGoal.id,
                    kpiId: kpiLink.kpiId,
                    weight: kpiLink.weight || 1.0
                  }
                });
              }
            }

            // Copy SubGoal Risk Links
            if (copyRiskLinks && 'risks' in subGoal && Array.isArray(subGoal.risks)) {
              for (const riskLink of subGoal.risks as any[]) {
                await tx.subGoalRisk.create({
                  data: {
                    subGoalId: newSubGoal.id,
                    riskId: riskLink.riskId
                  }
                });
              }
            }

            // Copy Actions if requested
            if (copyActions && 'actions' in subGoal && Array.isArray(subGoal.actions)) {
              for (const action of subGoal.actions as any[]) {
                const newAction = await tx.strategicAction.create({
                  data: {
                    code: action.code,
                    name: action.name,
                    description: action.description,
                    status: 'PLANLANDI',
                    workflowStatus: 'TASLAK',
                    priority: action.priority,
                    progress: 0,
                    startDate: action.startDate,
                    endDate: action.endDate,
                    budgetPlanned: action.budgetPlanned,
                    currency: action.currency,
                    budgetType: action.budgetType,
                    subGoalId: newSubGoal.id,
                    responsibleId: action.responsibleId,
                    accountableId: action.accountableId,
                    departmentId: action.departmentId,
                    createdById: session.user.id
                  }
                });

                // Copy Milestones
                if (action.milestones && Array.isArray(action.milestones)) {
                  for (const milestone of action.milestones as any[]) {
                    await tx.actionMilestone.create({
                      data: {
                        name: milestone.name,
                        description: milestone.description,
                        status: 'BEKLIYOR',
                        plannedDate: milestone.plannedDate,
                        weight: milestone.weight,
                        deliverables: milestone.deliverables,
                        actionId: newAction.id
                      }
                    });
                  }
                }

                // Copy Action KPI Links
                if (copyKPILinks && 'kpis' in action && Array.isArray(action.kpis)) {
                  for (const kpiLink of action.kpis as any[]) {
                    await tx.actionKPI.create({
                      data: {
                        actionId: newAction.id,
                        kpiId: kpiLink.kpiId
                      }
                    });
                  }
                }

                // Copy Action Risk Links
                if (copyRiskLinks && 'risks' in action && Array.isArray(action.risks)) {
                  for (const riskLink of action.risks as any[]) {
                    await tx.actionRisk.create({
                      data: {
                        actionId: newAction.id,
                        riskId: riskLink.riskId
                      }
                    });
                  }
                }
              }
            }

            // Copy direct goal actions (not under subGoals)
            if (copyActions && 'actions' in goal && Array.isArray(goal.actions)) {
              for (const action of goal.actions as any[]) {
                const newAction = await tx.strategicAction.create({
                  data: {
                    code: action.code,
                    name: action.name,
                    description: action.description,
                    status: 'PLANLANDI',
                    workflowStatus: 'TASLAK',
                    priority: action.priority,
                    progress: 0,
                    startDate: action.startDate,
                    endDate: action.endDate,
                    budgetPlanned: action.budgetPlanned,
                    currency: action.currency,
                    budgetType: action.budgetType,
                    goalId: newGoal.id,
                    responsibleId: action.responsibleId,
                    accountableId: action.accountableId,
                    departmentId: action.departmentId,
                    createdById: session.user.id
                  }
                });

                // Copy Milestones for direct goal actions
                if (action.milestones && Array.isArray(action.milestones)) {
                  for (const milestone of action.milestones as any[]) {
                    await tx.actionMilestone.create({
                      data: {
                        name: milestone.name,
                        description: milestone.description,
                        status: 'BEKLIYOR',
                        plannedDate: milestone.plannedDate,
                        weight: milestone.weight,
                        deliverables: milestone.deliverables,
                        actionId: newAction.id
                      }
                    });
                  }
                }

                // Copy Action KPI Links
                if (copyKPILinks && 'kpis' in action && Array.isArray(action.kpis)) {
                  for (const kpiLink of action.kpis as any[]) {
                    await tx.actionKPI.create({
                      data: {
                        actionId: newAction.id,
                        kpiId: kpiLink.kpiId
                      }
                    });
                  }
                }

                // Copy Action Risk Links
                if (copyRiskLinks && 'risks' in action && Array.isArray(action.risks)) {
                  for (const riskLink of action.risks as any[]) {
                    await tx.actionRisk.create({
                      data: {
                        actionId: newAction.id,
                        riskId: riskLink.riskId
                      }
                    });
                  }
                }
              }
            }
          }
        }
      }

      return period;
    });

    // Fetch the complete new period
    const completePeriod = await prisma.strategyPeriod.findUnique({
      where: { id: newPeriod.id },
      include: {
        mission: true,
        vision: true,
        perspectives: true,
        objectives: {
          include: {
            goals: {
              include: {
                subGoals: true
              }
            }
          }
        },
        createdBy: {
          select: { id: true, name: true }
        }
      }
    });

    return NextResponse.json({
      ...completePeriod,
      message: `"${sourcePeriod.name}" döneminden başarıyla kopyalandı`
    });
  } catch (error) {
    console.error('Period copy error:', error);
    return NextResponse.json(
      { error: 'Dönem kopyalanırken hata oluştu' },
      { status: 500 }
    );
  }
}
