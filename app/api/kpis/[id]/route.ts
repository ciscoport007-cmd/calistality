import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await params;

    const kpi = await prisma.kPI.findUnique({
      where: { id },
      include: {
        category: true,
        department: true,
        owner: { select: { id: true, name: true, surname: true, email: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
        measurements: {
          orderBy: { measurementDate: 'desc' },
          take: 50,
          include: {
            createdBy: { select: { id: true, name: true, surname: true } },
          },
        },
        targets: {
          orderBy: [{ year: 'desc' }, { periodNumber: 'asc' }],
        },
        // Stratejik hedef bağlantıları
        goalKPIs: {
          include: {
            goal: {
              include: {
                objective: {
                  include: {
                    period: true,
                  },
                },
              },
            },
          },
        },
        subGoalKPIs: {
          include: {
            subGoal: {
              include: {
                goal: {
                  include: {
                    objective: {
                      include: {
                        period: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!kpi) {
      return NextResponse.json({ error: 'KPI bulunamadı' }, { status: 404 });
    }

    return NextResponse.json(kpi);
  } catch (error) {
    console.error('KPI detay hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const existingKPI = await prisma.kPI.findUnique({ where: { id } });
    if (!existingKPI) {
      return NextResponse.json({ error: 'KPI bulunamadı' }, { status: 404 });
    }

    const {
      name,
      description,
      type,
      categoryId,
      departmentId,
      unit,
      formula,
      dataSource,
      period,
      targetValue,
      minValue,
      maxValue,
      warningThreshold,
      criticalThreshold,
      trendDirection,
      weight,
      baselineValue,
      baselineDate,
      ownerId,
      status,
    } = body;

    const kpi = await prisma.kPI.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existingKPI.name,
        description: description !== undefined ? description : existingKPI.description,
        type: type !== undefined ? type : existingKPI.type,
        categoryId: categoryId !== undefined ? categoryId : existingKPI.categoryId,
        departmentId: departmentId !== undefined ? departmentId : existingKPI.departmentId,
        unit: unit !== undefined ? unit : existingKPI.unit,
        formula: formula !== undefined ? formula : existingKPI.formula,
        dataSource: dataSource !== undefined ? dataSource : existingKPI.dataSource,
        period: period !== undefined ? period : existingKPI.period,
        targetValue: targetValue !== undefined ? parseFloat(targetValue) : existingKPI.targetValue,
        minValue: minValue !== undefined ? (minValue ? parseFloat(minValue) : null) : existingKPI.minValue,
        maxValue: maxValue !== undefined ? (maxValue ? parseFloat(maxValue) : null) : existingKPI.maxValue,
        warningThreshold: warningThreshold !== undefined ? (warningThreshold ? parseFloat(warningThreshold) : null) : existingKPI.warningThreshold,
        criticalThreshold: criticalThreshold !== undefined ? (criticalThreshold ? parseFloat(criticalThreshold) : null) : existingKPI.criticalThreshold,
        trendDirection: trendDirection !== undefined ? trendDirection : existingKPI.trendDirection,
        weight: weight !== undefined ? parseFloat(weight) : existingKPI.weight,
        baselineValue: baselineValue !== undefined ? (baselineValue ? parseFloat(baselineValue) : null) : existingKPI.baselineValue,
        baselineDate: baselineDate !== undefined ? (baselineDate ? new Date(baselineDate) : null) : existingKPI.baselineDate,
        ownerId: ownerId !== undefined ? ownerId : existingKPI.ownerId,
        status: status !== undefined ? status : existingKPI.status,
      },
      include: {
        category: true,
        department: true,
        owner: { select: { id: true, name: true, surname: true } },
      },
    });

    return NextResponse.json(kpi);
  } catch (error) {
    console.error('KPI güncelleme hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await params;

    const existingKPI = await prisma.kPI.findUnique({ where: { id } });
    if (!existingKPI) {
      return NextResponse.json({ error: 'KPI bulunamadı' }, { status: 404 });
    }

    await prisma.kPI.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ message: 'KPI silindi' });
  } catch (error) {
    console.error('KPI silme hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
