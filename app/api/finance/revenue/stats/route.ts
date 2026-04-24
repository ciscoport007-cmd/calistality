import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from 'date-fns';

export const dynamic = 'force-dynamic';

const TOTAL_CATS = [
  'TOTAL ROOM REVENUES',
  'TOTAL EXTRA FOOD REVENUES',
  'TOTAL EXTRA BEVERAGE REVENUES',
  'TOTAL SPA REVENUE',
  'TOTAL OTHER REVENUES',
  'TOTAL FOOTBALL REVENUE',
  'TOTAL A LA CARTE REVENUE',
  'TOTAL TRANSPORTATIONS REVENUE',
  'TOTAL SPORT ACADEMY REVENUE',
];

function isTotalCat(cat: string) {
  return TOTAL_CATS.some((t) => cat.toUpperCase().startsWith(t));
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const refDate = searchParams.get('date') ? new Date(searchParams.get('date')!) : new Date();

    const monthStart = startOfMonth(refDate);
    const monthEnd = endOfMonth(refDate);
    const yearStart = startOfYear(refDate);
    const yearEnd = endOfYear(refDate);
    const prevMonthStart = startOfMonth(subMonths(refDate, 1));
    const prevMonthEnd = endOfMonth(subMonths(refDate, 1));

    const [latestReport, monthEntries, prevMonthEntries, yearEntries, totalReports, missingDays30] =
      await Promise.all([
        prisma.financeReport.findFirst({
          orderBy: { reportDate: 'desc' },
          include: { uploadedBy: { select: { name: true, surname: true } } },
        }),
        prisma.revenueEntry.findMany({
          where: { reportDate: { gte: monthStart, lte: monthEnd }, isTotal: true },
        }),
        prisma.revenueEntry.findMany({
          where: { reportDate: { gte: prevMonthStart, lte: prevMonthEnd }, isTotal: true },
        }),
        prisma.revenueEntry.findMany({
          where: { reportDate: { gte: yearStart, lte: yearEnd }, isTotal: true },
        }),
        prisma.financeReport.count(),
        prisma.financeReport.findMany({
          where: {
            reportDate: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              lte: new Date(),
            },
          },
          select: { reportDate: true },
          orderBy: { reportDate: 'asc' },
        }),
      ]);

    const sumEntries = (entries: typeof monthEntries) => {
      const result: Record<string, { tl: number; eur: number; budgetTL: number; budgetEUR: number }> = {};
      for (const e of entries) {
        const key = TOTAL_CATS.find((t) => e.category.toUpperCase().startsWith(t)) ?? 'OTHER';
        if (!result[key]) result[key] = { tl: 0, eur: 0, budgetTL: 0, budgetEUR: 0 };
        result[key].tl += e.monthlyActualTL;
        result[key].eur += e.monthlyActualEUR;
        result[key].budgetTL += e.monthlyBudgetTL;
        result[key].budgetEUR += e.monthlyBudgetEUR;
      }
      return result;
    };

    const monthByCategory = sumEntries(monthEntries);
    const prevMonthByCategory = sumEntries(prevMonthEntries);

    const totalMonthlyTL = Object.values(monthByCategory).reduce((s, v) => s + v.tl, 0);
    const totalMonthlyEUR = Object.values(monthByCategory).reduce((s, v) => s + v.eur, 0);
    const totalMonthlyBudgetTL = Object.values(monthByCategory).reduce((s, v) => s + v.budgetTL, 0);
    const totalMonthlyBudgetEUR = Object.values(monthByCategory).reduce((s, v) => s + v.budgetEUR, 0);

    const totalPrevMonthlyTL = Object.values(prevMonthByCategory).reduce((s, v) => s + v.tl, 0);
    const totalPrevMonthlyEUR = Object.values(prevMonthByCategory).reduce((s, v) => s + v.eur, 0);

    // YTD: use the latest report day's entries (each carries cumulative YTD value)
    const latestYearDate = yearEntries.reduce<Date | null>((max, e) => {
      const d = new Date(e.reportDate);
      return !max || d > max ? d : max;
    }, null);
    const latestYearKey = latestYearDate?.toISOString().split('T')[0] ?? '';
    const latestYearEntries = yearEntries.filter(
      (e) => new Date(e.reportDate).toISOString().split('T')[0] === latestYearKey
    );
    const totalYearlyEUR = latestYearEntries.reduce((s, e) => s + e.yearlyActualEUR, 0);
    const totalYearlyBudgetEUR = latestYearEntries.reduce((s, e) => s + e.yearlyBudgetEUR, 0);

    const existingDates = new Set(missingDays30.map((r) => r.reportDate.toISOString().split('T')[0]));
    const missingDaysList: string[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split('T')[0];
      if (!existingDates.has(key)) missingDaysList.push(key);
    }

    const trendData = await prisma.revenueEntry.groupBy({
      by: ['reportDate'],
      where: {
        isTotal: true,
        reportDate: { gte: monthStart, lte: monthEnd },
      },
      _sum: { dailyActualEUR: true, dailyActualTL: true },
      orderBy: { reportDate: 'asc' },
    });

    const budgetVariancePct =
      totalMonthlyBudgetEUR > 0
        ? ((totalMonthlyEUR - totalMonthlyBudgetEUR) / totalMonthlyBudgetEUR) * 100
        : 0;

    const monthOverMonthPct =
      totalPrevMonthlyEUR > 0
        ? ((totalMonthlyEUR - totalPrevMonthlyEUR) / totalPrevMonthlyEUR) * 100
        : 0;

    return NextResponse.json({
      success: true,
      data: {
        latestReport: latestReport
          ? {
              date: latestReport.reportDate,
              fileName: latestReport.fileName,
              uploadedBy: latestReport.uploadedBy
                ? `${latestReport.uploadedBy.name} ${latestReport.uploadedBy.surname ?? ''}`
                : 'Bilinmiyor',
            }
          : null,
        totalReports,
        monthly: {
          totalTL: totalMonthlyTL,
          totalEUR: totalMonthlyEUR,
          budgetTL: totalMonthlyBudgetTL,
          budgetEUR: totalMonthlyBudgetEUR,
          budgetVariancePct,
          byCategory: monthByCategory,
        },
        prevMonthly: {
          totalTL: totalPrevMonthlyTL,
          totalEUR: totalPrevMonthlyEUR,
          monthOverMonthPct,
        },
        yearly: {
          totalEUR: totalYearlyEUR,
          budgetEUR: totalYearlyBudgetEUR,
          variancePct:
            totalYearlyBudgetEUR > 0
              ? ((totalYearlyEUR - totalYearlyBudgetEUR) / totalYearlyBudgetEUR) * 100
              : 0,
        },
        trendData: trendData.map((t) => ({
          date: t.reportDate,
          dailyEUR: t._sum.dailyActualEUR ?? 0,
          dailyTL: t._sum.dailyActualTL ?? 0,
        })),
        missingDays: missingDaysList,
        alerts: [
          ...(budgetVariancePct < -15
            ? [
                {
                  type: 'warning',
                  message: `Aylık gelir bütçenin ${Math.abs(budgetVariancePct).toFixed(1)}% altında`,
                },
              ]
            : []),
          ...(missingDaysList.length > 3
            ? [{ type: 'info', message: `Son 30 günde ${missingDaysList.length} gün veri eksik` }]
            : []),
          ...(monthOverMonthPct < -10
            ? [
                {
                  type: 'warning',
                  message: `Geçen aya göre gelir ${Math.abs(monthOverMonthPct).toFixed(1)}% düştü`,
                },
              ]
            : []),
          ...(monthOverMonthPct > 10
            ? [
                {
                  type: 'success',
                  message: `Geçen aya göre gelir ${monthOverMonthPct.toFixed(1)}% arttı`,
                },
              ]
            : []),
        ],
      },
    });
  } catch (error) {
    console.error('Finance stats error:', error);
    return NextResponse.json({ error: 'İstatistikler alınırken hata oluştu' }, { status: 500 });
  }
}
