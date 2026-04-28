import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/finance/kapak?date=YYYY-MM-DD  → full kapak data for one day
// GET /api/finance/kapak                  → list of available kapak dates
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');

    // ── List mode ─────────────────────────────────────────────────────────────
    if (!dateParam) {
      const reports = await prisma.kapakReport.findMany({
        select: { reportDate: true },
        orderBy: { reportDate: 'desc' },
      });
      return NextResponse.json({
        success: true,
        data: reports.map((r) => r.reportDate.toISOString().split('T')[0]),
      });
    }

    // ── Detail mode ───────────────────────────────────────────────────────────
    const date = new Date(dateParam);
    // Match the day regardless of stored time component
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
    const dayEnd   = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);

    const [kapak, statistic, exchangeRate] = await Promise.all([
      prisma.kapakReport.findFirst({
        where: { reportDate: { gte: dayStart, lte: dayEnd } },
      }),
      prisma.dailyStatistic.findFirst({
        where: { reportDate: { gte: dayStart, lte: dayEnd } },
      }),
      prisma.exchangeRate.findFirst({
        where: { reportDate: { gte: dayStart, lte: dayEnd } },
      }),
    ]);

    if (!kapak) {
      return NextResponse.json({ success: true, data: null });
    }

    return NextResponse.json({
      success: true,
      data: {
        reportDate: kapak.reportDate,
        // Section 1: Revenues (full data from KAPAK sheet)
        revenueData: kapak.revenueData,
        // Section 2: Statistics (combined from DailyStatistic + KapakReport extras)
        statistics: statistic
          ? {
              // Available rooms
              availRoomToday: statistic.availRoomToday, availRoomMTD: statistic.availRoomMTD,
              availRoomBudget: statistic.availRoomBudget, availRoomForecast: statistic.availRoomForecast,
              availRoomYTD: statistic.availRoomYTD,
              // Sold rooms
              soldRoomToday: statistic.soldRoomToday, soldRoomMTD: statistic.soldRoomMTD,
              soldRoomBudget: statistic.soldRoomBudget, soldRoomForecast: statistic.soldRoomForecast,
              soldRoomYTD: statistic.soldRoomYTD,
              // Comp rooms
              compRoomToday: statistic.compRoomToday, compRoomMTD: statistic.compRoomMTD,
              compRoomBudget: kapak.compRoomBudget, compRoomForecast: kapak.compRoomForecast,
              compRoomYTD: kapak.compRoomYTD,
              // Occupancy (%)
              occupancyToday: +(statistic.occupancyToday * 100).toFixed(2),
              occupancyMTD:   +(statistic.occupancyMTD * 100).toFixed(2),
              occupancyBudget: +(statistic.occupancyBudget * 100).toFixed(2),
              occupancyForecast: +(statistic.occupancyForecast * 100).toFixed(2),
              occupancyYTD: +(statistic.occupancyYTD * 100).toFixed(2),
              lyOccupancyToday: +(statistic.lyOccupancyToday * 100).toFixed(2),
              lyOccupancyMTD:   +(statistic.lyOccupancyMTD * 100).toFixed(2),
              lyOccupancyYTD:   +(statistic.lyOccupancyYTD * 100).toFixed(2),
              // PAX occupancy (bed occupancy from pax/avail)
              paxOccupancyToday: statistic.availRoomToday > 0
                ? +((statistic.paxToday / statistic.availRoomToday) * 100).toFixed(2) : 0,
              paxOccupancyMTD: statistic.availRoomMTD > 0
                ? +((statistic.paxMTD / statistic.availRoomMTD) * 100).toFixed(2) : 0,
              // ADR
              adrToday: statistic.adrToday, adrMTD: statistic.adrMTD,
              adrBudget: statistic.adrBudget, adrForecast: statistic.adrForecast,
              adrYTD: statistic.adrYTD,
              lyAdrToday: statistic.lyAdrToday, lyAdrMTD: statistic.lyAdrMTD, lyAdrYTD: statistic.lyAdrYTD,
              // Avg Sales Rate
              avgSalesRateToday: statistic.avgSalesRateToday, avgSalesRateMTD: statistic.avgSalesRateMTD,
              avgSalesRateBudget: kapak.avgSalesRateBudget,
              avgSalesRateForecast: kapak.avgSalesRateForecast,
              avgSalesRateYTD: kapak.avgSalesRateYTD,
              // Available room LY
              lyAvailRoomToday: statistic.lyAvailRoomToday,
              lyAvailRoomMTD:   statistic.lyAvailRoomMTD,
              lyAvailRoomYTD:   statistic.lyAvailRoomYTD,
              // Sold room LY
              lySoldRoomToday: statistic.lySoldRoomToday,
              lySoldRoomMTD:   statistic.lySoldRoomMTD,
              lySoldRoomYTD:   statistic.lySoldRoomYTD,
              // PAX
              paxToday: statistic.paxToday, paxMTD: statistic.paxMTD,
              paxBudget: statistic.paxBudget, paxForecast: statistic.paxForecast,
              paxYTD: statistic.paxYTD,
              lyPaxToday: statistic.lyPaxToday, lyPaxMTD: statistic.lyPaxMTD, lyPaxYTD: statistic.lyPaxYTD,
              // Out of order
              outOfOrderToday: statistic.outOfOrderToday, outOfOrderMTD: statistic.outOfOrderMTD,
              outOfOrderYTD: statistic.outOfOrderYTD,
              lyOutOfOrderToday: statistic.lyOutOfOrderToday,
              lyOutOfOrderMTD:   statistic.lyOutOfOrderMTD,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              soldRoomYTDBudget:  (kapak as any).soldRoomYTDBudget ?? 0,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              availRoomYTDBudget: (kapak as any).availRoomYTDBudget ?? 0,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              paxYTDBudget:       (kapak as any).paxYTDBudget ?? 0,
              // Available PAX (bed-nights capacity) — migration: add_avail_comp_pax_ly_fields
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              availPaxToday:    (statistic as any).availPaxToday ?? 0,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              availPaxMTD:      (statistic as any).availPaxMTD ?? 0,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              availPaxBudget:   (statistic as any).availPaxBudget ?? 0,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              availPaxForecast: (statistic as any).availPaxForecast ?? 0,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              availPaxYTD:      (statistic as any).availPaxYTD ?? 0,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              lyAvailPaxToday:  (statistic as any).lyAvailPaxToday ?? 0,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              lyAvailPaxMTD:    (statistic as any).lyAvailPaxMTD ?? 0,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              lyAvailPaxYTD:    (statistic as any).lyAvailPaxYTD ?? 0,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              availPaxYTDBudget: (kapak as any).availPaxYTDBudget ?? 0,
              // Comp rooms — PAX and Last Year
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              compPaxToday:    (statistic as any).compPaxToday ?? 0,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              compPaxMTD:      (statistic as any).compPaxMTD ?? 0,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              compPaxBudget:   (kapak as any).compPaxBudget ?? 0,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              compPaxForecast: (kapak as any).compPaxForecast ?? 0,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              compPaxYTD:      (kapak as any).compPaxYTD ?? 0,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              compRoomYTDBudget: (kapak as any).compRoomYTDBudget ?? 0,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              compPaxYTDBudget:  (kapak as any).compPaxYTDBudget ?? 0,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              lyCompRoomToday: (statistic as any).lyCompRoomToday ?? 0,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              lyCompRoomMTD:   (statistic as any).lyCompRoomMTD ?? 0,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              lyCompRoomYTD:   (statistic as any).lyCompRoomYTD ?? 0,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              lyCompPaxToday:  (statistic as any).lyCompPaxToday ?? 0,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              lyCompPaxMTD:    (statistic as any).lyCompPaxMTD ?? 0,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              lyCompPaxYTD:    (statistic as any).lyCompPaxYTD ?? 0,
            }
          : null,
        // Section 3: Occupancy breakdown
        occupancyBreakdown: kapak.occupancyBreakdown,
        // Section 4: Forecast occupancy
        forecastOccupancy: {
          todayArrivalsRoom: kapak.todayArrivalsRoom, todayArrivalsPax: kapak.todayArrivalsPax,
          todayArrivalsRoomPct: kapak.todayArrivalsRoomPct, todayArrivalsPaxPct: kapak.todayArrivalsPaxPct,
          todayDepartRoom: kapak.todayDepartRoom, todayDepartPax: kapak.todayDepartPax,
          todayDepartRoomPct: kapak.todayDepartRoomPct, todayDepartPaxPct: kapak.todayDepartPaxPct,
          tmrwArrivalsRoom: kapak.tmrwArrivalsRoom, tmrwArrivalsPax: kapak.tmrwArrivalsPax,
          tmrwArrivalsRoomPct: kapak.tmrwArrivalsRoomPct, tmrwArrivalsPaxPct: kapak.tmrwArrivalsPaxPct,
          tmrwDepartRoom: kapak.tmrwDepartRoom, tmrwDepartPax: kapak.tmrwDepartPax,
          tmrwDepartRoomPct: kapak.tmrwDepartRoomPct, tmrwDepartPaxPct: kapak.tmrwDepartPaxPct,
        },
        // Exchange rates
        exchangeRate: exchangeRate
          ? {
              dailyRate: +exchangeRate.dailyRate.toFixed(4),
              monthlyAvgRate: +exchangeRate.monthlyAvgRate.toFixed(4),
              budgetRate: +exchangeRate.budgetRate.toFixed(4),
              forecastRate: +exchangeRate.forecastRate.toFixed(4),
              yearlyAvgRate: +exchangeRate.yearlyAvgRate.toFixed(4),
              yearlyBudgetRate: +exchangeRate.yearlyBudgetRate.toFixed(4),
              lyDailyRate: +exchangeRate.lyDailyRate.toFixed(4),
              lyMonthlyRate: +exchangeRate.lyMonthlyRate.toFixed(4),
              lyYearlyRate: +exchangeRate.lyYearlyRate.toFixed(4),
            }
          : null,
      },
    });
  } catch (error) {
    console.error('Kapak GET error:', error);
    return NextResponse.json({ error: 'Kapak verisi alınırken hata oluştu' }, { status: 500 });
  }
}
