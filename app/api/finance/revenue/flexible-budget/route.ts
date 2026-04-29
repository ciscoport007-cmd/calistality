import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

type RevenueRow = {
  label: string;
  isTotal: boolean;
  mtdActualEUR: number;
  mtdBudgetEUR: number;
};

const DEPT_DEFS = [
  { key: 'rooms',  label: 'Oda Gelirleri',  patterns: ['ALL.INC', 'HB ROOM'], defaultRoomPct: 1.00 },
  { key: 'fbFood', label: 'F&B Yiyecek',    patterns: ['F&B FOOD'],            defaultRoomPct: 0.30 },
  { key: 'fbBev',  label: 'F&B İçecek',     patterns: ['F&B BEV'],             defaultRoomPct: 0.50 },
  { key: 'spa',    label: 'Spa',             patterns: ['SPA'],                 defaultRoomPct: 0.70 },
  { key: 'misc',   label: 'Diğer (Misc)',    patterns: ['MISC'],                defaultRoomPct: 0.60 },
] as const;

function matchLabel(label: string, patterns: readonly string[]) {
  const up = label.toUpperCase();
  return patterns.some((p) => up.includes(p.toUpperCase()));
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });

    const latest = await prisma.kapakReport.findFirst({
      orderBy: { reportDate: 'desc' },
      select: { reportDate: true },
    });
    if (!latest) return NextResponse.json({ success: true, data: null });

    const d = latest.reportDate;
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
    const dayEnd   = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);

    const [kapak, stat] = await Promise.all([
      prisma.kapakReport.findFirst({ where: { reportDate: { gte: dayStart, lte: dayEnd } } }),
      prisma.dailyStatistic.findFirst({ where: { reportDate: { gte: dayStart, lte: dayEnd } } }),
    ]);

    if (!kapak || !stat) return NextResponse.json({ success: true, data: null });

    const rows = (kapak.revenueData as RevenueRow[]).filter((r) => !r.isTotal);

    const actualRooms = stat.soldRoomMTD;
    const budgetRooms = stat.soldRoomBudget;
    const actualPax   = stat.paxMTD;
    const budgetPax   = stat.paxBudget;

    const roomRatio = budgetRooms > 0 ? actualRooms / budgetRooms : 1;
    const paxRatio  = budgetPax   > 0 ? actualPax   / budgetPax   : roomRatio;

    const departments = DEPT_DEFS.map((dept) => {
      const deptRows     = rows.filter((r) => matchLabel(r.label, dept.patterns));
      const staticBudget = deptRows.reduce((s, r) => s + r.mtdBudgetEUR, 0);
      const actual       = deptRows.reduce((s, r) => s + r.mtdActualEUR, 0);
      return {
        key:            dept.key,
        label:          dept.label,
        defaultRoomPct: dept.defaultRoomPct,
        staticBudget,
        actual,
        roomRatio,
        paxRatio,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        reportDate: d.toISOString().split('T')[0],
        occupancy: {
          actualRooms,
          budgetRooms,
          actualPax,
          budgetPax,
          occupancyMTD:    +(stat.occupancyMTD    * 100).toFixed(2),
          occupancyBudget: +(stat.occupancyBudget * 100).toFixed(2),
          availRoomMTD:    stat.availRoomMTD,
        },
        departments,
      },
    });
  } catch (error) {
    console.error('Flexible budget API error:', error);
    return NextResponse.json({ error: 'Veri alınamadı' }, { status: 500 });
  }
}
