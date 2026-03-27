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

    const { searchParams } = new URL(req.url);
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
    const month = searchParams.get('month');

    const startDate = month
      ? new Date(year, parseInt(month) - 1, 1)
      : new Date(year, 0, 1);
    const endDate = month
      ? new Date(year, parseInt(month), 0)
      : new Date(year, 11, 31);

    const [readings, emissionFactors] = await Promise.all([
      prisma.sustainabilityReading.findMany({
        where: { readingDate: { gte: startDate, lte: endDate } },
        include: { meter: true },
      }),
      prisma.sustainabilityEmissionFactor.findMany({ where: { isActive: true } }),
    ]);

    // Group by month
    const monthlyData: Record<string, { month: string; elektrik: number; dogalgaz: number; lpg: number; jenerator: number; su: number; total: number }> = {};

    for (const reading of readings) {
      const monthKey = `${reading.readingDate.getFullYear()}-${String(reading.readingDate.getMonth() + 1).padStart(2, '0')}`;
      const factor = emissionFactors.find(f => f.sourceType === reading.meter.type);
      const co2 = factor ? reading.value * factor.factor : 0;

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { month: monthKey, elektrik: 0, dogalgaz: 0, lpg: 0, jenerator: 0, su: 0, total: 0 };
      }

      const type = reading.meter.type.toLowerCase() as keyof typeof monthlyData[string];
      if (type in monthlyData[monthKey]) {
        (monthlyData[monthKey][type] as number) += co2;
      }
      monthlyData[monthKey].total += co2;
    }

    const bySource: Record<string, number> = {};
    for (const reading of readings) {
      const factor = emissionFactors.find(f => f.sourceType === reading.meter.type);
      const co2 = factor ? reading.value * factor.factor : 0;
      bySource[reading.meter.type] = (bySource[reading.meter.type] || 0) + co2;
    }

    const totalCarbonKg = Object.values(bySource).reduce((s, v) => s + v, 0);

    // Get guest count for CO2/guest KPI
    const guestReadings = readings.filter(r => r.guestCount && r.guestCount > 0);
    const avgGuests = guestReadings.length > 0
      ? guestReadings.reduce((s, r) => s + (r.guestCount || 0), 0) / guestReadings.length
      : 0;

    return NextResponse.json({
      totalCarbonKg,
      totalCarbonTon: totalCarbonKg / 1000,
      bySource,
      byMonth: Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month)),
      kpis: {
        co2PerGuest: avgGuests > 0 ? totalCarbonKg / avgGuests : 0,
        emissionFactors,
      },
    });
  } catch (error) {
    console.error('Carbon GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
