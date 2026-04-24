import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { startOfMonth, endOfMonth } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const refDate = dateParam ? new Date(dateParam) : new Date();

    const monthStart = startOfMonth(refDate);
    const monthEnd = endOfMonth(refDate);

    const [statistics, exchangeRates] = await Promise.all([
      prisma.dailyStatistic.findMany({
        where: { reportDate: { gte: monthStart, lte: monthEnd } },
        orderBy: { reportDate: 'asc' },
      }),
      prisma.exchangeRate.findMany({
        where: { reportDate: { gte: monthStart, lte: monthEnd } },
        orderBy: { reportDate: 'asc' },
      }),
    ]);

    if (statistics.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          latest: null,
          trendData: [],
          exchangeRates: [],
        },
      });
    }

    // En son günün verisi
    const latest = statistics[statistics.length - 1];
    const latestRate = exchangeRates[exchangeRates.length - 1] ?? null;

    // RevPAR = ADR × Occupancy (otel standardı)
    const revPARToday = latest.adrToday * latest.occupancyToday;
    const revPARMTD = latest.adrMTD * latest.occupancyMTD;
    const revPARBudget = latest.adrBudget * latest.occupancyBudget;
    const revPARYTD = latest.adrYTD * latest.occupancyYTD;
    const lyRevPARToday = latest.lyAdrToday * latest.lyOccupancyToday;
    const lyRevPARMTD = latest.lyAdrMTD * latest.lyOccupancyMTD;

    // Trend verisi — her gün için
    const trendData = statistics.map((s) => ({
      date: s.reportDate,
      // Doluluk (%)
      occupancyToday: +(s.occupancyToday * 100).toFixed(2),
      occupancyMTD: +(s.occupancyMTD * 100).toFixed(2),
      // ADR
      adrToday: +s.adrToday.toFixed(2),
      adrMTD: +s.adrMTD.toFixed(2),
      // RevPAR
      revPARToday: +(s.adrToday * s.occupancyToday).toFixed(2),
      revPARMTD: +(s.adrMTD * s.occupancyMTD).toFixed(2),
      // PAX
      paxToday: s.paxToday,
      paxMTD: s.paxMTD,
      // Sold & Avail
      soldRoomToday: s.soldRoomToday,
      availRoomToday: s.availRoomToday,
    }));

    return NextResponse.json({
      success: true,
      data: {
        latest: {
          reportDate: latest.reportDate,
          // Doluluk
          occupancyToday: +(latest.occupancyToday * 100).toFixed(2),
          occupancyMTD: +(latest.occupancyMTD * 100).toFixed(2),
          occupancyBudget: +(latest.occupancyBudget * 100).toFixed(2),
          occupancyForecast: +(latest.occupancyForecast * 100).toFixed(2),
          occupancyYTD: +(latest.occupancyYTD * 100).toFixed(2),
          lyOccupancyToday: +(latest.lyOccupancyToday * 100).toFixed(2),
          lyOccupancyMTD: +(latest.lyOccupancyMTD * 100).toFixed(2),
          // ADR
          adrToday: +latest.adrToday.toFixed(2),
          adrMTD: +latest.adrMTD.toFixed(2),
          adrBudget: +latest.adrBudget.toFixed(2),
          adrForecast: +latest.adrForecast.toFixed(2),
          adrYTD: +latest.adrYTD.toFixed(2),
          lyAdrToday: +latest.lyAdrToday.toFixed(2),
          lyAdrMTD: +latest.lyAdrMTD.toFixed(2),
          // RevPAR
          revPARToday: +revPARToday.toFixed(2),
          revPARMTD: +revPARMTD.toFixed(2),
          revPARBudget: +revPARBudget.toFixed(2),
          revPARYTD: +revPARYTD.toFixed(2),
          lyRevPARToday: +lyRevPARToday.toFixed(2),
          lyRevPARMTD: +lyRevPARMTD.toFixed(2),
          // PAX
          paxToday: latest.paxToday,
          paxMTD: latest.paxMTD,
          paxBudget: latest.paxBudget,
          paxForecast: latest.paxForecast,
          paxYTD: latest.paxYTD,
          lyPaxToday: latest.lyPaxToday,
          lyPaxMTD: latest.lyPaxMTD,
          // Oda
          soldRoomToday: latest.soldRoomToday,
          soldRoomMTD: latest.soldRoomMTD,
          soldRoomBudget: latest.soldRoomBudget,
          availRoomToday: latest.availRoomToday,
          availRoomMTD: latest.availRoomMTD,
          compRoomToday: latest.compRoomToday,
          compRoomMTD: latest.compRoomMTD,
          outOfOrderToday: latest.outOfOrderToday,
          outOfOrderMTD: latest.outOfOrderMTD,
          // Avg Sales Rate
          avgSalesRateToday: +latest.avgSalesRateToday.toFixed(2),
          avgSalesRateMTD: +latest.avgSalesRateMTD.toFixed(2),
        },
        exchangeRate: latestRate
          ? {
              reportDate: latestRate.reportDate,
              dailyRate: +latestRate.dailyRate.toFixed(4),
              monthlyAvgRate: +latestRate.monthlyAvgRate.toFixed(4),
              budgetRate: +latestRate.budgetRate.toFixed(4),
              forecastRate: +latestRate.forecastRate.toFixed(4),
              yearlyAvgRate: +latestRate.yearlyAvgRate.toFixed(4),
              yearlyBudgetRate: +latestRate.yearlyBudgetRate.toFixed(4),
              lyDailyRate: +latestRate.lyDailyRate.toFixed(4),
              lyMonthlyRate: +latestRate.lyMonthlyRate.toFixed(4),
              lyYearlyRate: +latestRate.lyYearlyRate.toFixed(4),
            }
          : null,
        trendData,
        exchangeRateTrend: exchangeRates.map((r) => ({
          date: r.reportDate,
          dailyRate: +r.dailyRate.toFixed(4),
          monthlyAvgRate: +r.monthlyAvgRate.toFixed(4),
        })),
      },
    });
  } catch (error) {
    console.error('Statistics error:', error);
    return NextResponse.json({ error: 'İstatistikler alınırken hata oluştu' }, { status: 500 });
  }
}
