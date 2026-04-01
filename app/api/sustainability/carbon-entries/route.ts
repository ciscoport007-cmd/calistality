import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
    const scope = searchParams.get('scope') ? parseInt(searchParams.get('scope')!) : undefined;

    const where: Record<string, unknown> = { year };
    if (scope) where.scope = scope;

    const entries = await prisma.sustainabilityCarbonEntry.findMany({
      where,
      include: { createdBy: { select: { name: true } } },
      orderBy: [{ scope: 'asc' }, { entryDate: 'desc' }],
    });

    // Scope bazlı toplamlar
    const scopeTotals: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    for (const e of entries) {
      scopeTotals[e.scope] = (scopeTotals[e.scope] || 0) + e.amountKg;
    }

    // Aylık toplamlar
    type MonthRow = { month: string; s1: number; s2: number; s3: number; s4: number; s5: number; s6: number; total: number };
    const monthlyTotals: Record<string, MonthRow> = {};
    for (const e of entries) {
      const key = `${e.year}-${String(e.month).padStart(2, '0')}`;
      if (!monthlyTotals[key]) {
        monthlyTotals[key] = { month: key, s1: 0, s2: 0, s3: 0, s4: 0, s5: 0, s6: 0, total: 0 };
      }
      const sKey = `s${e.scope}` as 's1' | 's2' | 's3' | 's4' | 's5' | 's6';
      monthlyTotals[key][sKey] += e.amountKg;
      monthlyTotals[key].total += e.amountKg;
    }

    const totalKg = Object.values(scopeTotals).reduce((s, v) => s + v, 0);

    return NextResponse.json({
      entries,
      scopeTotals,
      monthlyTotals: Object.values(monthlyTotals).sort((a, b) => a.month.localeCompare(b.month)),
      totalKg,
      totalTon: totalKg / 1000,
    });
  } catch (error) {
    console.error('Carbon entries GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { scope, category, description, amountKg, entryDate } = body;

    if (!scope || !category || amountKg === undefined || !entryDate) {
      return NextResponse.json({ error: 'Zorunlu alanlar eksik' }, { status: 400 });
    }
    if (scope < 1 || scope > 6) {
      return NextResponse.json({ error: 'Kapsam 1-6 arasında olmalıdır' }, { status: 400 });
    }

    const date = new Date(entryDate);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    // Benzersiz kod oluştur: KRB-YYYY-NNNN
    const count = await prisma.sustainabilityCarbonEntry.count({ where: { year } });
    const code = `KRB-${year}-${String(count + 1).padStart(4, '0')}`;

    const entry = await prisma.sustainabilityCarbonEntry.create({
      data: {
        code,
        scope: parseInt(String(scope)),
        category,
        description: description || null,
        amountKg: parseFloat(String(amountKg)),
        entryDate: date,
        year,
        month,
        createdById: session.user.id,
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error('Carbon entries POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
