import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isAdmin } from '@/lib/audit';

export const dynamic = 'force-dynamic';

async function recalculateKPIPerformance(kpiId: string, unit: string, targetValue: number) {
  const allMeasurements = await prisma.kPIMeasurement.findMany({
    where: { kpiId },
    select: { value: true, measurementDate: true },
    orderBy: { measurementDate: 'desc' },
  });

  if (allMeasurements.length === 0) return null;

  let currentPerformance: number;
  if (unit === '%') {
    const sum = allMeasurements.reduce((acc, m) => acc + m.value, 0);
    currentPerformance = sum / allMeasurements.length;
  } else {
    const total = allMeasurements.reduce((acc, m) => acc + m.value, 0);
    currentPerformance = targetValue > 0 ? (total / targetValue) * 100 : 0;
  }

  return {
    currentPerformance: Math.round(currentPerformance * 100) / 100,
    lastMeasurementValue: allMeasurements[0].value,
    lastMeasurementDate: allMeasurements[0].measurementDate,
  };
}

// GET - Tek bir ölçümü getir
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; measurementId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { measurementId } = await params;

    const measurement = await prisma.kPIMeasurement.findUnique({
      where: { id: measurementId },
      include: {
        kpi: { select: { id: true, code: true, name: true, targetValue: true, trendDirection: true, warningThreshold: true, criticalThreshold: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
      },
    });

    if (!measurement) {
      return NextResponse.json({ error: 'Ölçüm bulunamadı' }, { status: 404 });
    }

    return NextResponse.json(measurement);
  } catch (error) {
    console.error('Ölçüm getirme hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// PUT - Ölçümü güncelle
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; measurementId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id: kpiId, measurementId } = await params;
    const body = await request.json();

    // Mevcut ölçümü kontrol et
    const existingMeasurement = await prisma.kPIMeasurement.findUnique({
      where: { id: measurementId },
    });

    if (!existingMeasurement) {
      return NextResponse.json({ error: 'Ölçüm bulunamadı' }, { status: 404 });
    }

    // Yetki kontrolü - sadece admin veya oluşturan düzenleyebilir
    if (!isAdmin(session.user.role) && existingMeasurement.createdById !== session.user.id) {
      return NextResponse.json(
        { error: 'Bu ölçümü düzenleme yetkiniz yok' },
        { status: 403 }
      );
    }

    // KPI bilgilerini al
    const kpi = await prisma.kPI.findUnique({ where: { id: kpiId } });
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

    const numericValue = value !== undefined ? parseFloat(value) : existingMeasurement.value;
    const targetValue = kpi.targetValue;

    // Performans hesapla
    let performance = 0;
    let variance = numericValue - targetValue;

    if (kpi.trendDirection === 'YUKARI_IYI') {
      performance = (numericValue / targetValue) * 100;
    } else if (kpi.trendDirection === 'ASAGI_IYI') {
      performance = targetValue > 0 ? (targetValue / numericValue) * 100 : 100;
    } else {
      const deviation = Math.abs(variance);
      const maxDeviation = Math.max(targetValue * 0.5, 1);
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

    const measurement = await prisma.kPIMeasurement.update({
      where: { id: measurementId },
      data: {
        measurementDate: measurementDate ? new Date(measurementDate) : undefined,
        periodStart: periodStart !== undefined ? (periodStart ? new Date(periodStart) : null) : undefined,
        periodEnd: periodEnd !== undefined ? (periodEnd ? new Date(periodEnd) : null) : undefined,
        value: numericValue,
        targetValue,
        performance: Math.round(performance * 100) / 100,
        variance: Math.round(variance * 100) / 100,
        status,
        notes: notes !== undefined ? notes : undefined,
        dataSource: dataSource !== undefined ? dataSource : undefined,
      },
      include: {
        createdBy: { select: { id: true, name: true, surname: true } },
      },
    });

    // KPI performansını tüm ölçümler üzerinden yeniden hesapla
    const kpiStats = await recalculateKPIPerformance(kpiId, kpi.unit, kpi.targetValue);
    if (kpiStats) {
      await prisma.kPI.update({
        where: { id: kpiId },
        data: {
          lastMeasurementValue: kpiStats.lastMeasurementValue,
          lastMeasurementDate: kpiStats.lastMeasurementDate,
          currentPerformance: kpiStats.currentPerformance,
        },
      });
    }

    return NextResponse.json(measurement);
  } catch (error) {
    console.error('Ölçüm güncelleme hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// DELETE - Ölçümü sil
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; measurementId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id: kpiId, measurementId } = await params;

    // Mevcut ölçümü kontrol et
    const existingMeasurement = await prisma.kPIMeasurement.findUnique({
      where: { id: measurementId },
    });

    if (!existingMeasurement) {
      return NextResponse.json({ error: 'Ölçüm bulunamadı' }, { status: 404 });
    }

    // Yetki kontrolü - sadece admin veya oluşturan silebilir
    if (!isAdmin(session.user.role) && existingMeasurement.createdById !== session.user.id) {
      return NextResponse.json(
        { error: 'Bu ölçümü silme yetkiniz yok' },
        { status: 403 }
      );
    }

    await prisma.kPIMeasurement.delete({
      where: { id: measurementId },
    });

    // KPI performansını tüm kalan ölçümler üzerinden yeniden hesapla
    const kpi = await prisma.kPI.findUnique({ where: { id: kpiId }, select: { unit: true, targetValue: true } });
    if (kpi) {
      const kpiStats = await recalculateKPIPerformance(kpiId, kpi.unit, kpi.targetValue);
      await prisma.kPI.update({
        where: { id: kpiId },
        data: kpiStats
          ? { lastMeasurementValue: kpiStats.lastMeasurementValue, lastMeasurementDate: kpiStats.lastMeasurementDate, currentPerformance: kpiStats.currentPerformance }
          : { lastMeasurementValue: null, lastMeasurementDate: null, currentPerformance: null },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ölçüm silme hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
