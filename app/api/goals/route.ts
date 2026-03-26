import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth-options';
import { isAdmin, getDepartmentFilterWithNull } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// GET - Hedefleri listele
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const objectiveId = searchParams.get('objectiveId');
    const departmentIdParam = searchParams.get('departmentId');
    const status = searchParams.get('status');

    // Departman bazlı yetkilendirme
    const userRole = session.user.role;
    const userDepartmentId = session.user.departmentId;
    const departmentFilter = getDepartmentFilterWithNull(userDepartmentId, userRole);

    const where: any = { 
      isActive: true,
      ...departmentFilter,
    };

    if (objectiveId) where.objectiveId = objectiveId;
    // Departman filtresi: sadece admin için manuel filtrelemeye izin ver
    if (departmentIdParam && isAdmin(userRole)) {
      where.departmentId = departmentIdParam;
    }
    if (status) where.status = status;

    const goals = await prisma.strategicGoal.findMany({
      where,
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
          orderBy: { sortOrder: 'asc' },
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
        createdBy: {
          select: { id: true, name: true, email: true },
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
