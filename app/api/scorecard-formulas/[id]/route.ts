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
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formula = await prisma.scorecardFormula.findUnique({
      where: { id: params.id },
      include: {
        scale: { include: { levels: { orderBy: { sortOrder: 'asc' } } } },
        department: true,
        position: true,
        scorecards: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
          take: 10,
        },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!formula) {
      return NextResponse.json({ error: 'Formül bulunamadı' }, { status: 404 });
    }

    return NextResponse.json(formula);
  } catch (error) {
    console.error('Error fetching scorecard formula:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name, description, kpiWeight, competencyWeight, initiativeWeight,
      corporateWeight, departmentWeight, scaleId, year, departmentId, positionId, isDefault, isActive
    } = body;

    // Ağırlık kontrolü
    if (kpiWeight !== undefined || competencyWeight !== undefined || initiativeWeight !== undefined) {
      const formula = await prisma.scorecardFormula.findUnique({ where: { id: params.id } });
      const newKpi = kpiWeight ?? formula?.kpiWeight ?? 50;
      const newComp = competencyWeight ?? formula?.competencyWeight ?? 30;
      const newInit = initiativeWeight ?? formula?.initiativeWeight ?? 20;
      if (newKpi + newComp + newInit !== 100) {
        return NextResponse.json({ error: 'Boyut ağırlıkları toplamı 100 olmalıdır' }, { status: 400 });
      }
    }

    if (corporateWeight !== undefined || departmentWeight !== undefined) {
      const formula = await prisma.scorecardFormula.findUnique({ where: { id: params.id } });
      const newCorp = corporateWeight ?? formula?.corporateWeight ?? 20;
      const newDept = departmentWeight ?? formula?.departmentWeight ?? 80;
      if (newCorp + newDept !== 100) {
        return NextResponse.json({ error: 'Karne ağırlıkları toplamı 100 olmalıdır' }, { status: 400 });
      }
    }

    if (isDefault) {
      await prisma.scorecardFormula.updateMany({
        where: { isDefault: true, NOT: { id: params.id } },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.scorecardFormula.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(kpiWeight !== undefined && { kpiWeight }),
        ...(competencyWeight !== undefined && { competencyWeight }),
        ...(initiativeWeight !== undefined && { initiativeWeight }),
        ...(corporateWeight !== undefined && { corporateWeight }),
        ...(departmentWeight !== undefined && { departmentWeight }),
        ...(scaleId !== undefined && { scaleId: scaleId || null }),
        ...(year !== undefined && { year: year || null }),
        ...(departmentId !== undefined && { departmentId: departmentId || null }),
        ...(positionId !== undefined && { positionId: positionId || null }),
        ...(isDefault !== undefined && { isDefault }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        scale: { include: { levels: { orderBy: { sortOrder: 'asc' } } } },
        department: true,
        position: true,
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating scorecard formula:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.scorecardFormula.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return NextResponse.json({ message: 'Formül deaktif edildi' });
  } catch (error) {
    console.error('Error deleting scorecard formula:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
