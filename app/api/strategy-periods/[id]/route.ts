import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth-options';

export const dynamic = 'force-dynamic';

// GET - Dönem detayı
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

    const period = await prisma.strategyPeriod.findUnique({
      where: { id },
      include: {
        mission: true,
        vision: true,
        perspectives: {
          orderBy: { sortOrder: 'asc' },
        },
        objectives: {
          include: {
            perspective: true,
            department: true,
            owner: {
              select: { id: true, name: true, email: true },
            },
            goals: {
              include: {
                department: true,
                owner: {
                  select: { id: true, name: true, email: true },
                },
                subGoals: {
                  include: {
                    department: true,
                    owner: {
                      select: { id: true, name: true, email: true },
                    },
                    actions: {
                      include: {
                        responsible: {
                          select: { id: true, name: true, email: true },
                        },
                        risks: {
                          include: {
                            risk: true,
                          },
                        },
                      },
                    },
                    risks: {
                      include: {
                        risk: true,
                      },
                    },
                    kpis: {
                      include: {
                        kpi: true,
                      },
                    },
                  },
                  orderBy: { sortOrder: 'asc' },
                },
                actions: {
                  include: {
                    responsible: {
                      select: { id: true, name: true, email: true },
                    },
                    risks: {
                      include: {
                        risk: true,
                      },
                    },
                  },
                },
                kpis: {
                  include: {
                    kpi: true,
                  },
                },
                risks: {
                  include: {
                    risk: true,
                  },
                },
              },
              orderBy: { sortOrder: 'asc' },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!period) {
      return NextResponse.json({ error: 'Period not found' }, { status: 404 });
    }

    return NextResponse.json(period);
  } catch (error) {
    console.error('Error fetching strategy period:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Dönem güncelle
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

    const period = await prisma.strategyPeriod.findUnique({
      where: { id },
      include: { mission: true, vision: true },
    });

    if (!period) {
      return NextResponse.json({ error: 'Period not found' }, { status: 404 });
    }

    // Misyon güncelle
    if (body.missionContent !== undefined) {
      if (period.missionId) {
        await prisma.mission.update({
          where: { id: period.missionId },
          data: { content: body.missionContent },
        });
      } else {
        const mission = await prisma.mission.create({
          data: {
            content: body.missionContent,
            createdById: session.user.id,
          },
        });
        body.missionId = mission.id;
      }
    }

    // Vizyon güncelle
    if (body.visionContent !== undefined) {
      if (period.visionId) {
        await prisma.vision.update({
          where: { id: period.visionId },
          data: {
            content: body.visionContent,
            targetYear: body.visionTargetYear ? parseInt(body.visionTargetYear) : null,
          },
        });
      } else {
        const vision = await prisma.vision.create({
          data: {
            content: body.visionContent,
            targetYear: body.visionTargetYear ? parseInt(body.visionTargetYear) : null,
            createdById: session.user.id,
          },
        });
        body.visionId = vision.id;
      }
    }

    const updateData: any = {};
    if (body.name) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.status) updateData.status = body.status;
    if (body.startDate) updateData.startDate = new Date(body.startDate);
    if (body.endDate) updateData.endDate = new Date(body.endDate);
    if (body.missionId) updateData.missionId = body.missionId;
    if (body.visionId) updateData.visionId = body.visionId;

    const updatedPeriod = await prisma.strategyPeriod.update({
      where: { id },
      data: updateData,
      include: {
        mission: true,
        vision: true,
        perspectives: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(updatedPeriod);
  } catch (error) {
    console.error('Error updating strategy period:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Dönem sil
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

    await prisma.strategyPeriod.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting strategy period:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
