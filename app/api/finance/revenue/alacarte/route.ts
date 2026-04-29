import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Restoranlar ve eşleşme desenleri
const RESTAURANTS = [
  { label: 'Türk Restaurant (Turca)', patterns: ['TURCA', 'TÜRK RESTORAN', 'TURK RESTORAN'] },
  { label: 'The Garden',              patterns: ['THE GARDEN', 'GARDEN'] },
  { label: 'Sakura Restaurant',       patterns: ['SAKURA'] },
  { label: 'İtalyan Restaurant',      patterns: ['İTALYAN', 'ITALYAN', 'ITALIAN'] },
  { label: 'Balık Restaurant',        patterns: ['BALIK', 'BALIK', 'FISH RESTAURANT'] },
  { label: 'Savor Restaurant',        patterns: ['SAVOR'] },
  { label: 'The Grill Restaurant',    patterns: ['THE GRILL', 'GRILL'] },
];

function matchesRestaurant(category: string, patterns: string[]) {
  const up = category.toUpperCase();
  return patterns.some((p) => up.includes(p.toUpperCase()));
}

// GET /api/finance/revenue/alacarte
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });

    // En son raporu bul
    const latest = await prisma.financeReport.findFirst({
      orderBy: { reportDate: 'desc' },
      select: { reportDate: true },
    });

    if (!latest) return NextResponse.json({ success: true, data: [] });

    const d = latest.reportDate;
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
    const end   = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);

    const entries = await prisma.revenueEntry.findMany({
      where: { reportDate: { gte: start, lte: end }, isTotal: false },
    });

    const result = RESTAURANTS.map((rest) => {
      const matched = entries.filter((e) => matchesRestaurant(e.category, rest.patterns));
      return {
        label:        rest.label,
        todayEUR:     matched.reduce((s, e) => s + e.dailyActualEUR, 0),
        todayTL:      matched.reduce((s, e) => s + e.dailyActualTL, 0),
        mtdEUR:       matched.reduce((s, e) => s + e.monthlyActualEUR, 0),
        mtdTL:        matched.reduce((s, e) => s + e.monthlyActualTL, 0),
        mtdBudgetEUR: matched.reduce((s, e) => s + e.monthlyBudgetEUR, 0),
        lyMtdEUR:     matched.reduce((s, e) => s + e.lyMonthlyEUR, 0),
        ytdEUR:       matched.reduce((s, e) => s + e.yearlyActualEUR, 0),
        rowCount:     matched.length,
        categories:   matched.map((e) => e.category),
      };
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Alacarte API error:', error);
    return NextResponse.json({ error: 'Veri alınamadı' }, { status: 500 });
  }
}
