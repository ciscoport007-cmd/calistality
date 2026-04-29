import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

interface RevenueRow {
  label: string;
  isTotal: boolean;
  todayTL: number;
  todayEUR: number;
  mtdActualTL: number;
  mtdActualEUR: number;
  mtdBudgetTL: number;
  mtdBudgetEUR: number;
  ytdActualEUR: number;
  ytdBudgetEUR: number;
  lyTodayEUR: number;
  lyMonthEUR: number;
}

function parseRevenue(json: Prisma.JsonValue): RevenueRow[] {
  if (!Array.isArray(json)) return [];
  return json as unknown as RevenueRow[];
}

const LABEL_TOTAL = ['TOTAL SALES REVENUE', 'TOTAL SALES', 'TOTALS', 'TOPLAM'];
const LABEL_ROOMS = ['ALL.INC', 'HB ROOM'];
const LABEL_FB    = ['F&B FOOD', 'F&B BEV'];
const LABEL_SPA   = ['SPA'];
const LABEL_OTHER = ['MISC'];

function matchLabel(label: string, patterns: string[]) {
  const up = label.toUpperCase();
  return patterns.some((p) => up.includes(p));
}

function sumRows(rows: RevenueRow[], patterns: string[], field: keyof RevenueRow) {
  return rows
    .filter((r) => matchLabel(r.label, patterns))
    .reduce((acc, r) => acc + ((r[field] as number) ?? 0), 0);
}

function findTotal(rows: RevenueRow[]): RevenueRow | undefined {
  return rows.find((r) => r.isTotal && matchLabel(r.label, LABEL_TOTAL));
}

// GET /api/finance/kapak/trend?days=30
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });

    const days = parseInt(request.nextUrl.searchParams.get('days') ?? '30', 10);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const reports = await prisma.financeReport.findMany({
      where: { reportDate: { gte: cutoff } },
      include: { kapakReport: true, statistic: true },
      orderBy: { reportDate: 'asc' },
    });

    const trend = reports
      .filter((r) => r.kapakReport)
      .map((r) => {
        const rows = parseRevenue(r.kapakReport!.revenueData);
        const totalRow = findTotal(rows);

        const totalEUR = totalRow?.mtdActualEUR ?? sumRows(rows, LABEL_ROOMS, 'mtdActualEUR') + sumRows(rows, LABEL_FB, 'mtdActualEUR') + sumRows(rows, LABEL_SPA, 'mtdActualEUR');
        const totalTL = totalRow?.mtdActualTL ?? 0;
        const totalBudgetEUR = totalRow?.mtdBudgetEUR ?? 0;
        const lyMonthEUR = totalRow?.lyMonthEUR ?? 0;

        const todayTL = totalRow?.todayTL ?? 0;
        const todayEUR = totalRow?.todayEUR ?? 0;

        const roomsEUR = sumRows(rows, LABEL_ROOMS, 'mtdActualEUR');
        const fbEUR = sumRows(rows, LABEL_FB, 'mtdActualEUR');
        const spaEUR = sumRows(rows, LABEL_SPA, 'mtdActualEUR');
        const otherEUR = sumRows(rows, LABEL_OTHER, 'mtdActualEUR');

        const stat = r.statistic;

        return {
          date: r.reportDate.toISOString().split('T')[0],
          todayTL,
          todayEUR,
          totalEUR,
          totalTL,
          totalBudgetEUR,
          lyMonthEUR,
          roomsEUR,
          fbEUR,
          spaEUR,
          otherEUR,
          occupancyToday: stat ? +(stat.occupancyToday * 100).toFixed(2) : 0,
          occupancyMTD: stat ? +(stat.occupancyMTD * 100).toFixed(2) : 0,
          occupancyBudget: stat ? +(stat.occupancyBudget * 100).toFixed(2) : 0,
          lyOccupancyToday: stat ? +(stat.lyOccupancyToday * 100).toFixed(2) : 0,
          adrToday: stat?.adrToday ?? 0,
          adrMTD: stat?.adrMTD ?? 0,
          soldRoomToday: stat?.soldRoomToday ?? 0,
          soldRoomMTD: stat?.soldRoomMTD ?? 0,
          paxToday: stat?.paxToday ?? 0,
        };
      });

    return NextResponse.json({ success: true, data: trend });
  } catch (error) {
    console.error('Kapak trend error:', error);
    return NextResponse.json({ error: 'Trend verisi alınamadı' }, { status: 500 });
  }
}
