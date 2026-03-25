import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth-options';

// GET - Amaç altındaki hedefleri listele
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

    const goals = await prisma.strategicGoal.findMany({
      where: { objectiveId: id, isActive: true },
      include: {
        department: true,
        owner: {
          select: { id: true, name: true, email: true },
        },
        subGoals: {
          include: {
            actions: true,
          },
          orderBy: { sortOrder: 'asc' },
        },
        actions: true,
        kpis: {
          include: { kpi: true },
        },
        risks: {
          include: { risk: true },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json(goals);
  } catch (error) {
    console.error('Error fetching goals:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Amaç altına yeni hedef ekle
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: objectiveId } = await params;
    const body = await request.json();
    const { name, description, departmentId, departmentIds, ownerId, targetValue, unit, weight, startDate, endDate } = body;

    // Amaç ve dönem bilgisini al
    const objective = await prisma.strategicObjective.findUnique({
      where: { id: objectiveId },
      include: { period: true },
    });

    if (!objective) {
      return NextResponse.json({ error: 'Objective not found' }, { status: 404 });
    }

    const year = new Date(objective.period.startDate).getFullYear();
    const objNumber = objective.code.split('-')[2];
    const count = await prisma.strategicGoal.count({
      where: { objectiveId },
    });

    const code = `H-${year}-${objNumber}-${(count + 1).toString().padStart(2, '0')}`;

    const goal = await prisma.strategicGoal.create({
      data: {
        code,
        name,
        description,
        objectiveId,
        departmentId: departmentId || (departmentIds && departmentIds.length > 0 ? departmentIds[0] : null),
        departmentIds: departmentIds ? JSON.stringify(departmentIds) : null,
        ownerId,
        targetValue: targetValue ? parseFloat(targetValue) : null,
        unit,
        weight: weight ? parseFloat(weight) : 1.0,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        sortOrder: count + 1,
        createdById: session.user.id,
      },
      include: {
        department: true,
        owner: {
          select: { id: true, name: true, email: true },
        },
        objective: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(goal, { status: 201 });
  } catch (error) {
    console.error('Error creating goal:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
