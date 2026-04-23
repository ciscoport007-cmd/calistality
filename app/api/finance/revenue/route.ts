import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get('date');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const category = searchParams.get('category');
    const onlyTotals = searchParams.get('onlyTotals') === 'true';

    const where: Record<string, unknown> = {};

    if (dateStr) {
      const d = new Date(dateStr);
      const start = new Date(d);
      start.setHours(0, 0, 0, 0);
      const end = new Date(d);
      end.setHours(23, 59, 59, 999);
      where.reportDate = { gte: start, lte: end };
    } else if (from || to) {
      where.reportDate = {};
      if (from) (where.reportDate as Record<string, Date>).gte = new Date(from);
      if (to) (where.reportDate as Record<string, Date>).lte = new Date(to);
    }

    if (category) where.category = { contains: category, mode: 'insensitive' };
    if (onlyTotals) where.isTotal = true;

    const entries = await prisma.revenueEntry.findMany({
      where,
      orderBy: [{ reportDate: 'asc' }, { isTotal: 'desc' }],
    });

    return NextResponse.json({ success: true, data: entries });
  } catch (error) {
    console.error('Finance revenue GET error:', error);
    return NextResponse.json({ error: 'Veri alınırken hata oluştu' }, { status: 500 });
  }
}
