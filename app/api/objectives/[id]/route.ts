import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth-options';

// GET - Amaç detayı
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

    const objective = await prisma.strategicObjective.findUnique({
      where: { id },
      include: {
        period: true,
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
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!objective) {
      return NextResponse.json({ error: 'Objective not found' }, { status: 404 });
    }

    return NextResponse.json(objective);
  } catch (error) {
    console.error('Error fetching objective:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Amaç güncelle
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
    if (body.perspectiveId) updateData.perspectiveId = body.perspectiveId;
    if (body.departmentId !== undefined) updateData.departmentId = body.departmentId;
    if (body.ownerId !== undefined) updateData.ownerId = body.ownerId;
    if (body.targetValue !== undefined) updateData.targetValue = body.targetValue ? parseFloat(body.targetValue) : null;
    if (body.currentValue !== undefined) updateData.currentValue = body.currentValue ? parseFloat(body.currentValue) : null;
    if (body.weight !== undefined) updateData.weight = parseFloat(body.weight);
    if (body.progress !== undefined) updateData.progress = parseFloat(body.progress);
    if (body.riskLevel !== undefined) updateData.riskLevel = body.riskLevel;
    if (body.sortOrder !== undefined) updateData.sortOrder = body.sortOrder;

    const objective = await prisma.strategicObjective.update({
      where: { id },
      data: updateData,
      include: {
        period: true,
        perspective: true,
        department: true,
        owner: {
          select: { id: true, name: true, email: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(objective);
  } catch (error) {
    console.error('Error updating objective:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Amaç sil (soft delete)
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

    await prisma.strategicObjective.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting objective:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
