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
    const mode = searchParams.get('mode') ?? 'ytd';
    const year1 = parseInt(searchParams.get('year1') ?? String(new Date().getFullYear()));
    const year2 = parseInt(searchParams.get('year2') ?? String(new Date().getFullYear() - 1));
    const month1 = parseInt(searchParams.get('month1') ?? String(new Date().getMonth() + 1));
    const month2 = parseInt(searchParams.get('month2') ?? String(new Date().getMonth()));
    const currency = searchParams.get('currency') ?? 'EUR';

    // Yıllık: dailyActualEUR toplamı — doğru yıllık gelir hesabı
    if (mode === 'yearly') {
      const start1 = startOfYear(new Date(year1, 0, 1));
      const end1 = endOfYear(new Date(year1, 0, 1));
      const start2 = startOfYear(new Date(year2, 0, 1));
      const end2 = endOfYear(new Date(year2, 0, 1));

      const [entries1, entries2] = await Promise.all([
        prisma.revenueEntry.groupBy({
          by: ['category'],
          where: { reportDate: { gte: start1, lte: end1 }, isTotal: true },
          _sum: { dailyActualTL: true, dailyActualEUR: true },
        }),
        prisma.revenueEntry.groupBy({
          by: ['category'],
          where: { reportDate: { gte: start2, lte: end2 }, isTotal: true },
          _sum: { dailyActualTL: true, dailyActualEUR: true },
        }),
      ]);

      const map1 = Object.fromEntries(entries1.map((e) => [e.category, e._sum]));
      const map2 = Object.fromEntries(entries2.map((e) => [e.category, e._sum]));
      const allCats = [...new Set([...Object.keys(map1), ...Object.keys(map2)])];

      const comparison = allCats.map((cat) => {
        const v1 = currency === 'TL' ? (map1[cat]?.dailyActualTL ?? 0) : (map1[cat]?.dailyActualEUR ?? 0);
        const v2 = currency === 'TL' ? (map2[cat]?.dailyActualTL ?? 0) : (map2[cat]?.dailyActualEUR ?? 0);
        const changePct = v2 > 0 ? ((v1 - v2) / v2) * 100 : 0;
        return { category: cat, [`year_${year1}`]: v1, [`year_${year2}`]: v2, changePct };
      });

      return NextResponse.json({ success: true, data: { mode, year1, year2, comparison, currency } });
    }

    // Aylık: gün-bazlı iki ay karşılaştırması
    if (mode === 'monthly') {
      const d1 = new Date(year1, month1 - 1, 1);
      const d2 = new Date(year2, month2 - 1, 1);

      const [daily1, daily2] = await Promise.all([
        prisma.revenueEntry.groupBy({
          by: ['reportDate'],
          where: { reportDate: { gte: startOfMonth(d1), lte: endOfMonth(d1) }, isTotal: true },
          _sum: { dailyActualTL: true, dailyActualEUR: true },
          orderBy: { reportDate: 'asc' },
        }),
        prisma.revenueEntry.groupBy({
          by: ['reportDate'],
          where: { reportDate: { gte: startOfMonth(d2), lte: endOfMonth(d2) }, isTotal: true },
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

    // YTD: yılbaşından bugünün tarihine kadar aylık karşılaştırma
    if (mode === 'ytd') {
      const today = new Date();
      const todayMonth = today.getMonth();
      const todayDay = today.getDate();

      const ytdStart1 = new Date(year1, 0, 1);
      const ytdEnd1 = new Date(year1, todayMonth, todayDay, 23, 59, 59);
      const ytdStart2 = new Date(year2, 0, 1);
      const ytdEnd2 = new Date(year2, todayMonth, todayDay, 23, 59, 59);

      const [daily1, daily2] = await Promise.all([
        prisma.revenueEntry.groupBy({
          by: ['reportDate'],
          where: { reportDate: { gte: ytdStart1, lte: ytdEnd1 }, isTotal: true },
          _sum: { dailyActualTL: true, dailyActualEUR: true },
          orderBy: { reportDate: 'asc' },
        }),
        prisma.revenueEntry.groupBy({
          by: ['reportDate'],
          where: { reportDate: { gte: ytdStart2, lte: ytdEnd2 }, isTotal: true },
          _sum: { dailyActualTL: true, dailyActualEUR: true },
          orderBy: { reportDate: 'asc' },
        }),
      ]);

      const groupByMonth = (entries: typeof daily1) => {
        const map: Record<string, number> = {};
        for (const e of entries) {
          const key = format(e.reportDate, 'MM');
          map[key] = (map[key] ?? 0) +
            (currency === 'TL' ? (e._sum.dailyActualTL ?? 0) : (e._sum.dailyActualEUR ?? 0));
        }
        return map;
      };

      const map1 = groupByMonth(daily1);
      const map2 = groupByMonth(daily2);

      const months = Array.from({ length: todayMonth + 1 }, (_, i) =>
        String(i + 1).padStart(2, '0')
      );

      const comparison = months.map((m) => ({
        month: m,
        [`${year1}`]: map1[m] ?? 0,
        [`${year2}`]: map2[m] ?? 0,
      }));

      const total1 = Object.values(map1).reduce((s, v) => s + v, 0);
      const total2 = Object.values(map2).reduce((s, v) => s + v, 0);
      const changePct = total2 > 0 ? ((total1 - total2) / total2) * 100 : 0;

      return NextResponse.json({
        success: true,
        data: { mode, year1, year2, comparison, total1, total2, changePct, currency },
      });
    }

    return NextResponse.json({ error: 'Geçersiz mod' }, { status: 400 });
  } catch (error) {
    console.error('Finance compare error:', error);
    return NextResponse.json({ error: 'Karşılaştırma verisi alınırken hata oluştu' }, { status: 500 });
  }
}
