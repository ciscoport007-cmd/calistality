import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/finance/revenue/detail             → list of available dates
// GET /api/finance/revenue/detail?date=YYYY-MM-DD → all entries for that day
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');

    if (!dateParam) {
      const reports = await prisma.financeReport.findMany({
        select: { reportDate: true },
        orderBy: { reportDate: 'desc' },
      });
      return NextResponse.json({
        success: true,
        data: reports.map((r) => r.reportDate.toISOString().split('T')[0]),
      });
    }

    const d = new Date(dateParam);
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
    const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);

    const entries = await prisma.revenueEntry.findMany({
      where: { reportDate: { gte: start, lte: end } },
      orderBy: [{ isTotal: 'desc' }, { id: 'asc' }],
    });

    if (entries.length === 0) {
      return NextResponse.json({ success: true, data: null });
    }

    // Group: totals first, then sub-items under their parent
    const totals = entries.filter((e) => e.isTotal);
    const subs = entries.filter((e) => !e.isTotal);

    const grouped: { total: typeof totals[0]; items: typeof subs }[] = totals.map((t) => ({
      total: t,
      items: subs.filter((s) => s.parentCategory === t.category),
    }));

    // Orphan sub-items (no parent match)
    const parentCats = new Set(totals.map((t) => t.category));
    const orphans = subs.filter((s) => !s.parentCategory || !parentCats.has(s.parentCategory));

    return NextResponse.json({ success: true, data: { grouped, orphans } });
  } catch (error) {
    console.error('Revenue detail GET error:', error);
    return NextResponse.json({ error: 'Veri alınırken hata oluştu' }, { status: 500 });
  }
}
