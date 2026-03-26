import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('isActive');
    const departmentId = searchParams.get('departmentId');
    const positionId = searchParams.get('positionId');
    const year = searchParams.get('year');

    const formulas = await prisma.scorecardFormula.findMany({
      where: {
        ...(isActive !== null && { isActive: isActive === 'true' }),
        ...(departmentId && { departmentId }),
        ...(positionId && { positionId }),
        ...(year && { year: parseInt(year) }),
      },
      include: {
        scale: { include: { levels: { orderBy: { sortOrder: 'asc' } } } },
        department: true,
        position: true,
        createdBy: { select: { id: true, name: true, email: true } },
        _count: { select: { scorecards: true } },
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json(formulas);
  } catch (error) {
    console.error('Error fetching scorecard formulas:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name, description, kpiWeight, competencyWeight, initiativeWeight,
      corporateWeight, departmentWeight, scaleId, year, departmentId, positionId, isDefault
    } = body;

    if (!name) {
      return NextResponse.json({ error: 'Formül adı gereklidir' }, { status: 400 });
    }

    // Ağırlıkların toplamı 100 olmalı
    const dimensionTotal = (kpiWeight || 50) + (competencyWeight || 30) + (initiativeWeight || 20);
    if (dimensionTotal !== 100) {
      return NextResponse.json({ error: 'KPI + Yetkinlik + İnisiyatif ağırlıkları toplamı 100 olmalıdır' }, { status: 400 });
    }

    const karneTotal = (corporateWeight || 20) + (departmentWeight || 80);
    if (karneTotal !== 100) {
      return NextResponse.json({ error: 'Kurum + Departman karne ağırlıkları toplamı 100 olmalıdır' }, { status: 400 });
    }

    const count = await prisma.scorecardFormula.count();
    const code = `FRM-${String(count + 1).padStart(4, '0')}`;

    // Varsayılan olarak işaretlendiyse diğerlerini kaldır
    if (isDefault) {
      await prisma.scorecardFormula.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const formula = await prisma.scorecardFormula.create({
      data: {
        code,
        name,
        description,
        kpiWeight: kpiWeight || 50,
        competencyWeight: competencyWeight || 30,
        initiativeWeight: initiativeWeight || 20,
        corporateWeight: corporateWeight || 20,
        departmentWeight: departmentWeight || 80,
        scaleId,
        year,
        departmentId: departmentId || null,
        positionId: positionId || null,
        isDefault: isDefault || false,
        createdById: session.user.id,
      },
      include: {
        scale: { include: { levels: { orderBy: { sortOrder: 'asc' } } } },
        department: true,
        position: true,
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(formula, { status: 201 });
  } catch (error) {
    console.error('Error creating scorecard formula:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
