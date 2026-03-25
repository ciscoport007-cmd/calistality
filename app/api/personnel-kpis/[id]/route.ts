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

    const personnelKPI = await prisma.personnelKPI.findUnique({
      where: { id: params.id },
      include: {
        kpi: { include: { category: true, department: true } },
        user: { select: { id: true, name: true, email: true, department: true, position: true } },
        measurements: {
          include: {
            createdBy: { select: { id: true, name: true } },
            verifiedBy: { select: { id: true, name: true } },
          },
          orderBy: { measurementDate: 'desc' },
        },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!personnelKPI) {
      return NextResponse.json({ error: 'Kayıt bulunamadı' }, { status: 404 });
    }

    return NextResponse.json(personnelKPI);
  } catch (error) {
    console.error('Error fetching personnel KPI:', error);
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
    const { weight, targetValue, actualValue, status, notes } = body;

    // Gerçekleşen değer girilmişse performans hesapla
    let performance: number | null = null;
    let score = null;

    if (actualValue !== undefined) {
      const personnelKPI = await prisma.personnelKPI.findUnique({
        where: { id: params.id },
        include: { kpi: true },
      });

      if (personnelKPI) {
        const target = targetValue || personnelKPI.targetValue || personnelKPI.kpi.targetValue;
        if (target && target !== 0) {
          // KPI'nın trend yönüne göre performans hesapla
          if (personnelKPI.kpi.trendDirection === 'YUKARI_IYI') {
            performance = (actualValue / target) * 100;
          } else if (personnelKPI.kpi.trendDirection === 'ASAGI_IYI') {
            performance = (target / actualValue) * 100;
          } else {
            // Hedefte olma - sapma oranına göre
            const variance = Math.abs(actualValue - target) / target;
            performance = Math.max(0, (1 - variance) * 100);
          }

          // Puan skalasından puan al
          const defaultScale = await prisma.scoreScale.findFirst({
            where: { isDefault: true, isActive: true },
            include: { levels: { orderBy: { minPerformance: 'desc' } } },
          });

          if (defaultScale) {
            const matchingLevel = defaultScale.levels.find(
              (l: any) => performance !== null && performance >= l.minPerformance && performance <= l.maxPerformance
            );
            score = matchingLevel?.score || 0;
          }
        }
      }
    }

    const updated = await prisma.personnelKPI.update({
      where: { id: params.id },
      data: {
        ...(weight !== undefined && { weight }),
        ...(targetValue !== undefined && { targetValue }),
        ...(actualValue !== undefined && { actualValue }),
        ...(performance !== null && { performance }),
        ...(score !== null && { score }),
        ...(status && { status }),
        ...(notes !== undefined && { notes }),
      },
      include: {
        kpi: { include: { category: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating personnel KPI:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Ölçüm ekle
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { measurementDate, periodNumber, value, targetValue, notes, dataSource } = body;

    if (!measurementDate || value === undefined) {
      return NextResponse.json({ error: 'Ölçüm tarihi ve değeri gereklidir' }, { status: 400 });
    }

    // Personel KPI'yı al
    const personnelKPI = await prisma.personnelKPI.findUnique({
      where: { id: params.id },
      include: { kpi: true },
    });

    if (!personnelKPI) {
      return NextResponse.json({ error: 'Kayıt bulunamadı' }, { status: 404 });
    }

    // Performans hesapla
    const target = targetValue || personnelKPI.targetValue || personnelKPI.kpi.targetValue;
    let performance: number | null = null;
    let score = null;

    if (target && target !== 0) {
      if (personnelKPI.kpi.trendDirection === 'YUKARI_IYI') {
        performance = (value / target) * 100;
      } else if (personnelKPI.kpi.trendDirection === 'ASAGI_IYI') {
        performance = (target / value) * 100;
      } else {
        const variance = Math.abs(value - target) / target;
        performance = Math.max(0, (1 - variance) * 100);
      }

      // Puan skalasından puan al
      const defaultScale = await prisma.scoreScale.findFirst({
        where: { isDefault: true, isActive: true },
        include: { levels: { orderBy: { minPerformance: 'desc' } } },
      });

      if (defaultScale) {
        const matchingLevel = defaultScale.levels.find(
          (l) => performance! >= l.minPerformance && performance! <= l.maxPerformance
        );
        score = matchingLevel?.score || 0;
      }
    }

    const measurement = await prisma.personnelKPIMeasurement.create({
      data: {
        personnelKpiId: params.id,
        measurementDate: new Date(measurementDate),
        periodNumber,
        value,
        targetValue: target,
        performance,
        score,
        notes,
        dataSource: dataSource || 'MANUEL',
        createdById: session.user.id,
      },
      include: {
        createdBy: { select: { id: true, name: true } },
      },
    });

    // PersonnelKPI'daki son değerleri güncelle
    await prisma.personnelKPI.update({
      where: { id: params.id },
      data: {
        actualValue: value,
        performance,
        score,
      },
    });

    return NextResponse.json(measurement, { status: 201 });
  } catch (error) {
    console.error('Error adding measurement:', error);
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

    await prisma.personnelKPI.update({
      where: { id: params.id },
      data: { status: 'IPTAL' },
    });

    return NextResponse.json({ message: 'KPI ataması iptal edildi' });
  } catch (error) {
    console.error('Error deleting personnel KPI:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
