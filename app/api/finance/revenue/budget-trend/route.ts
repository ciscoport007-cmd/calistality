import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { startOfYear, endOfYear } from 'date-fns';

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

const MONTH_NAMES = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()));

    const yearStart = startOfYear(new Date(year, 0, 1));
    const yearEnd = endOfYear(new Date(year, 0, 1));

    const entries = await prisma.revenueEntry.findMany({
      where: {
        reportDate: { gte: yearStart, lte: yearEnd },
        isTotal: true,
      },
      select: {
        reportDate: true,
        monthlyActualEUR: true,
        monthlyBudgetEUR: true,
        category: true,
      },
      orderBy: { reportDate: 'asc' },
    });

    // Group by month → by date → sum totals for matching categories
    const byMonth: Record<number, Record<string, { actualEUR: number; budgetEUR: number }>> = {};

    for (const e of entries) {
      if (!TOTAL_CATS.some((t) => e.category.toUpperCase().startsWith(t))) continue;
      const d = new Date(e.reportDate);
      const m = d.getMonth();
      const dateKey = d.toISOString().split('T')[0];
      if (!byMonth[m]) byMonth[m] = {};
      if (!byMonth[m][dateKey]) byMonth[m][dateKey] = { actualEUR: 0, budgetEUR: 0 };
      byMonth[m][dateKey].actualEUR += e.monthlyActualEUR;
      byMonth[m][dateKey].budgetEUR += e.monthlyBudgetEUR;
    }

    const months = Array.from({ length: 12 }, (_, i) => {
      const monthData = byMonth[i];
      if (!monthData) {
        return {
          month: i + 1,
          monthName: MONTH_NAMES[i],
          actualEUR: 0,
          budgetEUR: 0,
          variancePct: null,
          hasData: false,
        };
      }
      const latestDate = Object.keys(monthData).sort().at(-1)!;
      const d = monthData[latestDate];
      const variancePct = d.budgetEUR > 0 ? ((d.actualEUR - d.budgetEUR) / d.budgetEUR) * 100 : null;
      return {
        month: i + 1,
        monthName: MONTH_NAMES[i],
        actualEUR: Math.round(d.actualEUR),
        budgetEUR: Math.round(d.budgetEUR),
        variancePct: variancePct !== null ? +variancePct.toFixed(1) : null,
        hasData: true,
      };
    });

    return NextResponse.json({ success: true, data: { year, months } });
  } catch (error) {
    console.error('Budget trend error:', error);
    return NextResponse.json({ error: 'Bütçe trendi alınırken hata oluştu' }, { status: 500 });
  }
}
