import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { startOfMonth, endOfMonth, startOfYear, endOfYear, format } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') ?? 'monthly'; // monthly | yearly | category
    const year1 = parseInt(searchParams.get('year1') ?? String(new Date().getFullYear()));
    const year2 = parseInt(searchParams.get('year2') ?? String(new Date().getFullYear() - 1));
    const month1 = parseInt(searchParams.get('month1') ?? String(new Date().getMonth() + 1));
    const month2 = parseInt(searchParams.get('month2') ?? String(new Date().getMonth()));
    const category = searchParams.get('category') ?? null;
    const currency = searchParams.get('currency') ?? 'EUR';

    if (mode === 'yearly') {
      const start1 = startOfYear(new Date(year1, 0, 1));
      const end1 = endOfYear(new Date(year1, 0, 1));
      const start2 = startOfYear(new Date(year2, 0, 1));
      const end2 = endOfYear(new Date(year2, 0, 1));

      const [entries1, entries2] = await Promise.all([
        prisma.revenueEntry.groupBy({
          by: ['category', 'parentCategory', 'isTotal'],
          where: { reportDate: { gte: start1, lte: end1 }, isTotal: true },
          _sum: {
            monthlyActualTL: true,
            monthlyActualEUR: true,
            monthlyBudgetTL: true,
            monthlyBudgetEUR: true,
          },
        }),
        prisma.revenueEntry.groupBy({
          by: ['category', 'parentCategory', 'isTotal'],
          where: { reportDate: { gte: start2, lte: end2 }, isTotal: true },
          _sum: {
            monthlyActualTL: true,
            monthlyActualEUR: true,
            monthlyBudgetTL: true,
            monthlyBudgetEUR: true,
          },
        }),
      ]);

      const map1 = Object.fromEntries(entries1.map((e) => [e.category, e._sum]));
      const map2 = Object.fromEntries(entries2.map((e) => [e.category, e._sum]));
      const allCats = [...new Set([...Object.keys(map1), ...Object.keys(map2)])];

      const comparison = allCats.map((cat) => {
        const v1 = currency === 'TL' ? (map1[cat]?.monthlyActualTL ?? 0) : (map1[cat]?.monthlyActualEUR ?? 0);
        const v2 = currency === 'TL' ? (map2[cat]?.monthlyActualTL ?? 0) : (map2[cat]?.monthlyActualEUR ?? 0);
        const change = v2 > 0 ? ((v1 - v2) / v2) * 100 : 0;
        return { category: cat, [`year_${year1}`]: v1, [`year_${year2}`]: v2, changePct: change };
      });

      return NextResponse.json({ success: true, data: { mode, year1, year2, comparison, currency } });
    }

    if (mode === 'monthly') {
      const d1 = new Date(year1, month1 - 1, 1);
      const d2 = new Date(year2, month2 - 1, 1);

      const [daily1, daily2] = await Promise.all([
        prisma.revenueEntry.groupBy({
          by: ['reportDate'],
          where: {
            reportDate: { gte: startOfMonth(d1), lte: endOfMonth(d1) },
            isTotal: true,
          },
          _sum: { dailyActualTL: true, dailyActualEUR: true },
          orderBy: { reportDate: 'asc' },
        }),
        prisma.revenueEntry.groupBy({
          by: ['reportDate'],
          where: {
            reportDate: { gte: startOfMonth(d2), lte: endOfMonth(d2) },
            isTotal: true,
          },
          _sum: { dailyActualTL: true, dailyActualEUR: true },
          orderBy: { reportDate: 'asc' },
        }),
      ]);

      const normalize = (entries: typeof daily1) =>
        entries.map((e, idx) => ({
          day: idx + 1,
          date: format(e.reportDate, 'dd.MM.yyyy'),
          value: currency === 'TL' ? (e._sum.dailyActualTL ?? 0) : (e._sum.dailyActualEUR ?? 0),
        }));

      return NextResponse.json({
        success: true,
        data: {
          mode,
          period1: { month: month1, year: year1, data: normalize(daily1) },
          period2: { month: month2, year: year2, data: normalize(daily2) },
          currency,
        },
      });
    }

    if (mode === 'category' && category) {
      const start1 = startOfYear(new Date(year1, 0, 1));
      const end1 = endOfYear(new Date(year1, 0, 1));
      const start2 = startOfYear(new Date(year2, 0, 1));
      const end2 = endOfYear(new Date(year2, 0, 1));

      const [monthly1, monthly2] = await Promise.all([
        prisma.revenueEntry.groupBy({
          by: ['reportDate'],
          where: {
            reportDate: { gte: start1, lte: end1 },
            category: { contains: category, mode: 'insensitive' },
          },
          _sum: { monthlyActualTL: true, monthlyActualEUR: true },
          orderBy: { reportDate: 'asc' },
        }),
        prisma.revenueEntry.groupBy({
          by: ['reportDate'],
          where: {
            reportDate: { gte: start2, lte: end2 },
            category: { contains: category, mode: 'insensitive' },
          },
          _sum: { monthlyActualTL: true, monthlyActualEUR: true },
          orderBy: { reportDate: 'asc' },
        }),
      ]);

      const groupByMonth = (entries: typeof monthly1) => {
        const map: Record<string, number> = {};
        for (const e of entries) {
          const key = format(e.reportDate, 'yyyy-MM');
          map[key] = currency === 'TL' ? (e._sum.monthlyActualTL ?? 0) : (e._sum.monthlyActualEUR ?? 0);
        }
        return map;
      };

      const map1 = groupByMonth(monthly1);
      const map2 = groupByMonth(monthly2);
      const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));

      const comparison = months.map((m) => ({
        month: m,
        [`${year1}`]: map1[`${year1}-${m}`] ?? 0,
        [`${year2}`]: map2[`${year2}-${m}`] ?? 0,
      }));

      return NextResponse.json({
        success: true,
        data: { mode, category, year1, year2, comparison, currency },
      });
    }

    return NextResponse.json({ error: 'Geçersiz mod' }, { status: 400 });
  } catch (error) {
    console.error('Finance compare error:', error);
    return NextResponse.json({ error: 'Karşılaştırma verisi alınırken hata oluştu' }, { status: 500 });
  }
}
