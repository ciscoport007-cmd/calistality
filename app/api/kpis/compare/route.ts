import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const body = await request.json();
    const { kpiIds }: { kpiIds: string[] } = body;

    if (!kpiIds || kpiIds.length < 2) {
      return NextResponse.json({ error: 'En az 2 KPI seçmelisiniz' }, { status: 400 });
    }

    if (kpiIds.length > 5) {
      return NextResponse.json({ error: 'En fazla 5 KPI seçebilirsiniz' }, { status: 400 });
    }

    const kpis = await prisma.kPI.findMany({
      where: { id: { in: kpiIds }, isActive: true },
      include: {
        category: true,
        department: true,
        measurements: { orderBy: { measurementDate: 'asc' } },
        targets: { orderBy: [{ year: 'asc' }, { periodNumber: 'asc' }] },
      },
    });

    if (kpis.length === 0) {
      return NextResponse.json({ error: 'KPI bulunamadı' }, { status: 404 });
    }

    const result = kpis.map((kpi) => {
      const measurements = kpi.measurements;
      const perfValues = measurements
        .map((m) => m.performance)
        .filter((p): p is number => p !== null && p !== undefined);
      const avgPerformance =
        perfValues.length > 0
          ? perfValues.reduce((sum, p) => sum + p, 0) / perfValues.length
          : 0;

      return {
        id: kpi.id,
        code: kpi.code,
        name: kpi.name,
        unit: kpi.unit,
        period: kpi.period,
        targetValue: kpi.targetValue,
        trendDirection: kpi.trendDirection,
        measurements: measurements.map((m) => ({
          id: m.id,
          measurementDate: m.measurementDate,
          value: m.value,
          targetValue: m.targetValue ?? null,
          performance: m.performance ?? null,
          status: m.status ?? null,
        })),
        targets: kpi.targets.map((t) => ({
          id: t.id,
          year: t.year,
          period: t.period,
          periodNumber: t.periodNumber ?? null,
          targetValue: t.targetValue,
          actualValue: t.actualValue ?? null,
          performance: t.performance ?? null,
        })),
        avgPerformance: Math.round(avgPerformance * 10) / 10,
      };
    });

    // Seçim sırasını koru
    const ordered = kpiIds
      .map((id) => result.find((r) => r.id === id))
      .filter((r): r is NonNullable<typeof r> => r !== undefined);

    return NextResponse.json(ordered);
  } catch (error) {
    console.error('KPI karşılaştırma hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
