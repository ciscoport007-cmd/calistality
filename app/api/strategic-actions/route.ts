import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth-options';
import { isAdmin, getDepartmentFilterWithNull } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// GET - Tüm aksiyonları listele
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const departmentIdParam = searchParams.get('departmentId');
    const responsibleId = searchParams.get('responsibleId');
    const search = searchParams.get('search');

    // Departman bazlı yetkilendirme
    const userRole = session.user.role;
    const userDepartmentId = session.user.departmentId;
    const departmentFilter = getDepartmentFilterWithNull(userDepartmentId, userRole);

    const where: any = { 
      isActive: true,
      ...departmentFilter,
    };

    if (status) where.status = status;
    if (priority) where.priority = priority;
    // Departman filtresi: sadece admin için manuel filtrelemeye izin ver
    if (departmentIdParam && isAdmin(userRole)) {
      where.departmentId = departmentIdParam;
    }
    if (responsibleId) where.responsibleId = responsibleId;
    if (search) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { code: { contains: search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const actions = await prisma.strategicAction.findMany({
      where,
      include: {
        goal: {
          include: {
            objective: {
              include: { period: true, perspective: true },
            },
          },
        },
        subGoal: {
          include: { goal: true },
        },
        department: true,
        responsible: {
          select: { id: true, name: true, email: true },
        },
        accountable: {
          select: { id: true, name: true, email: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(actions);
  } catch (error) {
    console.error('Error fetching actions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
