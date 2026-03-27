import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      totalMeters,
      thisMonthReadings,
      lastMonthReadings,
      wasteThisMonth,
      activeTargets,
      openActions,
      unresolvedAlerts,
      emissionFactors,
    ] = await Promise.all([
      prisma.sustainabilityMeter.count({ where: { isActive: true } }),
      prisma.sustainabilityReading.findMany({
        where: { readingDate: { gte: startOfMonth } },
        include: { meter: true },
      }),
      prisma.sustainabilityReading.findMany({
        where: { readingDate: { gte: startOfLastMonth, lte: endOfLastMonth } },
        include: { meter: true },
      }),
      prisma.sustainabilityWasteRecord.findMany({
        where: { recordDate: { gte: startOfMonth } },
      }),
      prisma.sustainabilityTarget.count({ where: { status: 'AKTIF' } }),
      prisma.sustainabilityAction.count({ where: { status: { in: ['ACIK', 'DEVAM_EDIYOR'] } } }),
      prisma.sustainabilityAlert.count({ where: { isResolved: false } }),
      prisma.sustainabilityEmissionFactor.findMany({ where: { isActive: true } }),
    ]);

    // Energy KPIs
    const energyReadings = thisMonthReadings.filter(r => r.meter.category === 'ENERJI');
    const lastEnergyReadings = lastMonthReadings.filter(r => r.meter.category === 'ENERJI');
    const totalEnergyKwh = energyReadings.reduce((sum, r) => sum + r.value, 0);
    const lastEnergyKwh = lastEnergyReadings.reduce((sum, r) => sum + r.value, 0);
    const energyChange = lastEnergyKwh > 0 ? ((totalEnergyKwh - lastEnergyKwh) / lastEnergyKwh) * 100 : 0;

    // Water KPIs
    const waterReadings = thisMonthReadings.filter(r => r.meter.category === 'SU');
    const lastWaterReadings = lastMonthReadings.filter(r => r.meter.category === 'SU');
    const totalWaterM3 = waterReadings.reduce((sum, r) => sum + r.value, 0);
    const lastWaterM3 = lastWaterReadings.reduce((sum, r) => sum + r.value, 0);
    const waterChange = lastWaterM3 > 0 ? ((totalWaterM3 - lastWaterM3) / lastWaterM3) * 100 : 0;

    // Waste KPIs
    const totalWasteKg = wasteThisMonth.reduce((sum, r) => sum + r.quantity, 0);
    const recycledWasteKg = wasteThisMonth.filter(r => r.isRecycled).reduce((sum, r) => sum + r.quantity, 0);
    const recyclingRate = totalWasteKg > 0 ? (recycledWasteKg / totalWasteKg) * 100 : 0;

    // Carbon KPIs
    let totalCarbonKg = 0;
    for (const reading of thisMonthReadings) {
      const factor = emissionFactors.find(f => f.sourceType === reading.meter.type);
      if (factor) {
        totalCarbonKg += reading.value * factor.factor;
      }
    }

    // Anomaly count
    const anomalyCount = thisMonthReadings.filter(r => r.isAnomalous).length;

    return NextResponse.json({
      stats: {
        totalMeters,
        activeTargets,
        openActions,
        unresolvedAlerts,
        anomalyCount,
      },
      energy: {
        totalKwh: totalEnergyKwh,
        changePercent: energyChange,
        readingCount: energyReadings.length,
      },
      water: {
        totalM3: totalWaterM3,
        changePercent: waterChange,
        readingCount: waterReadings.length,
      },
      waste: {
        totalKg: totalWasteKg,
        recycledKg: recycledWasteKg,
        recyclingRate,
        recordCount: wasteThisMonth.length,
      },
      carbon: {
        totalKg: totalCarbonKg,
        totalTon: totalCarbonKg / 1000,
      },
    });
  } catch (error) {
    console.error('Sustainability stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
