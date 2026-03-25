import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth-options';

// GET - Hedef altındaki alt hedefleri listele
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

    const subGoals = await prisma.strategicSubGoal.findMany({
      where: { goalId: id, isActive: true },
      include: {
        department: true,
        owner: {
          select: { id: true, name: true, email: true },
        },
        actions: {
          where: { isActive: true },
        },
        kpis: {
          include: { kpi: true },
        },
        risks: {
          include: { risk: true },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json(subGoals);
  } catch (error) {
    console.error('Error fetching sub-goals:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Hedef altına yeni alt hedef ekle
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: goalId } = await params;
    const body = await request.json();
    const { name, description, departmentId, departmentIds, ownerId, targetValue, unit, weight, startDate, endDate } = body;

    // Hedef bilgisini al
    const goal = await prisma.strategicGoal.findUnique({
      where: { id: goalId },
    });

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    const count = await prisma.strategicSubGoal.count({
      where: { goalId },
    });

    // AH-2026-01-01-01 formatı
    const code = `${goal.code.replace('H-', 'AH-')}-${(count + 1).toString().padStart(2, '0')}`;

    const subGoal = await prisma.strategicSubGoal.create({
      data: {
        code,
        name,
        description,
        goalId,
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
        goal: true,
        department: true,
        owner: {
          select: { id: true, name: true, email: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(subGoal, { status: 201 });
  } catch (error) {
    console.error('Error creating sub-goal:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
