import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth-options';
import { isAdmin, getDepartmentFilterWithNull } from '@/lib/audit';

// GET - Stratejik amaçları listele
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const periodId = searchParams.get('periodId');
    const perspectiveId = searchParams.get('perspectiveId');
    const status = searchParams.get('status');
    const departmentIdParam = searchParams.get('departmentId');

    // Departman bazlı yetkilendirme
    const userRole = session.user.role;
    const userDepartmentId = session.user.departmentId;
    const departmentFilter = getDepartmentFilterWithNull(userDepartmentId, userRole);

    const where: any = { 
      isActive: true,
      ...departmentFilter,
    };

    if (periodId) where.periodId = periodId;
    if (perspectiveId) where.perspectiveId = perspectiveId;
    if (status) where.status = status;
    // Departman filtresi: sadece admin için manuel filtrelemeye izin ver
    if (departmentIdParam && isAdmin(userRole)) {
      where.departmentId = departmentIdParam;
    }

    const objectives = await prisma.strategicObjective.findMany({
      where,
      include: {
        period: true,
        perspective: true,
        department: true,
        owner: {
          select: { id: true, name: true, email: true },
        },
        goals: {
          include: {
            subGoals: true,
            actions: true,
          },
          orderBy: { sortOrder: 'asc' },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json(objectives);
  } catch (error) {
    console.error('Error fetching objectives:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Yeni stratejik amaç oluştur
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { periodId, perspectiveId, name, description, departmentId, departmentIds, ownerId, targetValue, weight } = body;

    // Kod oluştur
    const period = await prisma.strategyPeriod.findUnique({
      where: { id: periodId },
    });

    if (!period) {
      return NextResponse.json({ error: 'Period not found' }, { status: 404 });
    }

    const year = new Date(period.startDate).getFullYear();
    const count = await prisma.strategicObjective.count({
      where: { periodId },
    });

    const code = `SA-${year}-${(count + 1).toString().padStart(2, '0')}`;

    const objective = await prisma.strategicObjective.create({
      data: {
        code,
        name,
        description,
        periodId,
        perspectiveId,
        departmentId: departmentId || (departmentIds && departmentIds.length > 0 ? departmentIds[0] : null),
        departmentIds: departmentIds ? JSON.stringify(departmentIds) : null,
        ownerId,
        targetValue: targetValue ? parseFloat(targetValue) : null,
        weight: weight ? parseFloat(weight) : 1.0,
        sortOrder: count + 1,
        createdById: session.user.id,
      },
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

    return NextResponse.json(objective, { status: 201 });
  } catch (error) {
    console.error('Error creating objective:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
