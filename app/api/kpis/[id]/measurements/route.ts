import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

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

    const measurements = await prisma.kPIMeasurement.findMany({
      where: { kpiId: id },
      orderBy: { measurementDate: 'desc' },
      include: {
        createdBy: { select: { id: true, name: true, surname: true } },
      },
    });

    return NextResponse.json(measurements);
  } catch (error) {
    console.error('Ölçüm listesi hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

export async function POST(
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

    const kpi = await prisma.kPI.findUnique({ where: { id } });
    if (!kpi) {
      return NextResponse.json({ error: 'KPI bulunamadı' }, { status: 404 });
    }

    const {
      measurementDate,
      periodStart,
      periodEnd,
      value,
      notes,
      dataSource,
    } = body;

    if (value === undefined || !measurementDate) {
      return NextResponse.json(
        { error: 'Değer ve ölçüm tarihi zorunludur' },
        { status: 400 }
      );
    }

    const numericValue = parseFloat(value);
    const targetValue = kpi.targetValue;

    // Performans hesapla
    let performance = 0;
    let variance = numericValue - targetValue;

    if (kpi.trendDirection === 'YUKARI_IYI') {
      // Yüksek değer iyi: (gerçekleşen / hedef) * 100
      performance = (numericValue / targetValue) * 100;
    } else if (kpi.trendDirection === 'ASAGI_IYI') {
      // Düşük değer iyi: (hedef / gerçekleşen) * 100 veya (2 - gerçekleşen/hedef) * 100
      performance = targetValue > 0 ? (targetValue / numericValue) * 100 : 100;
    } else {
      // Hedefe yakınlık
      const deviation = Math.abs(variance);
      const maxDeviation = Math.max(targetValue * 0.5, 1); // %50 sapma maksimum
      performance = Math.max(0, (1 - deviation / maxDeviation) * 100);
    }

    // Durum belirle
    let status = 'BASARILI';
    if (kpi.criticalThreshold !== null) {
      if (kpi.trendDirection === 'YUKARI_IYI' && numericValue < kpi.criticalThreshold) {
        status = 'KRITIK';
      } else if (kpi.trendDirection === 'ASAGI_IYI' && numericValue > kpi.criticalThreshold) {
        status = 'KRITIK';
      }
    }
    if (status !== 'KRITIK' && kpi.warningThreshold !== null) {
      if (kpi.trendDirection === 'YUKARI_IYI' && numericValue < kpi.warningThreshold) {
        status = 'UYARI';
      } else if (kpi.trendDirection === 'ASAGI_IYI' && numericValue > kpi.warningThreshold) {
        status = 'UYARI';
      }
    }

    const measurement = await prisma.kPIMeasurement.create({
      data: {
        kpiId: id,
        measurementDate: new Date(measurementDate),
        periodStart: periodStart ? new Date(periodStart) : null,
        periodEnd: periodEnd ? new Date(periodEnd) : null,
        value: numericValue,
        targetValue,
        performance: Math.round(performance * 100) / 100,
        variance: Math.round(variance * 100) / 100,
        status,
        notes,
        dataSource,
        createdById: session.user.id,
      },
      include: {
        createdBy: { select: { id: true, name: true, surname: true } },
      },
    });

    // KPI'ın son ölçüm bilgilerini güncelle
    await prisma.kPI.update({
      where: { id },
      data: {
        lastMeasurementValue: numericValue,
        lastMeasurementDate: new Date(measurementDate),
        currentPerformance: Math.round(performance * 100) / 100,
      },
    });

    return NextResponse.json(measurement, { status: 201 });
  } catch (error) {
    console.error('Ölçüm oluşturma hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
