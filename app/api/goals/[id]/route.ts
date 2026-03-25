import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth-options';

// GET - Hedef detayı
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

    const goal = await prisma.strategicGoal.findUnique({
      where: { id },
      include: {
        objective: {
          include: { period: true, perspective: true },
        },
        department: true,
        owner: {
          select: { id: true, name: true, email: true },
        },
        subGoals: {
          where: { isActive: true },
          include: {
            department: true,
            owner: {
              select: { id: true, name: true, email: true },
            },
            actions: {
              where: { isActive: true },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
        actions: {
          where: { isActive: true },
          include: {
            responsible: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        kpis: {
          include: { kpi: true },
        },
        risks: {
          include: { risk: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    return NextResponse.json(goal);
  } catch (error) {
    console.error('Error fetching goal:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Hedef güncelle
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

    const updateData: any = {};
    if (body.name) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.status) updateData.status = body.status;
    if (body.departmentId !== undefined) updateData.departmentId = body.departmentId;
    if (body.ownerId !== undefined) updateData.ownerId = body.ownerId;
    if (body.targetValue !== undefined) updateData.targetValue = body.targetValue ? parseFloat(body.targetValue) : null;
    if (body.currentValue !== undefined) updateData.currentValue = body.currentValue ? parseFloat(body.currentValue) : null;
    if (body.unit !== undefined) updateData.unit = body.unit;
    if (body.weight !== undefined) updateData.weight = parseFloat(body.weight);
    if (body.startDate !== undefined) updateData.startDate = body.startDate ? new Date(body.startDate) : null;
    if (body.endDate !== undefined) updateData.endDate = body.endDate ? new Date(body.endDate) : null;
    if (body.progress !== undefined) updateData.progress = parseFloat(body.progress);
    if (body.riskLevel !== undefined) updateData.riskLevel = body.riskLevel;
    if (body.sortOrder !== undefined) updateData.sortOrder = body.sortOrder;

    const goal = await prisma.strategicGoal.update({
      where: { id },
      data: updateData,
      include: {
        objective: true,
        department: true,
        owner: {
          select: { id: true, name: true, email: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(goal);
  } catch (error) {
    console.error('Error updating goal:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Hedef sil (soft delete)
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

    await prisma.strategicGoal.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting goal:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
