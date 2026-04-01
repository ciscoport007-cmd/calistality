import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const categories = await prisma.lQACategory.findMany({
    include: {
      _count: { select: { criteria: true } },
    },
    orderBy: { order: 'asc' },
  });

  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const data = await req.json();
  const newWeight = parseFloat(data.weight) || 0;

  if (newWeight <= 0) {
    return NextResponse.json({ error: 'Ağırlık 0\'dan büyük olmalıdır' }, { status: 400 });
  }

  const existing = await prisma.lQACategory.aggregate({ _sum: { weight: true } });
  const currentTotal = existing._sum.weight ?? 0;

  if (currentTotal + newWeight > 100) {
    const remaining = parseFloat((100 - currentTotal).toFixed(2));
    return NextResponse.json(
      { error: `Toplam ağırlık 100'ü aşamaz. Kullanılabilir kalan: ${remaining}` },
      { status: 400 }
    );
  }

  const category = await prisma.lQACategory.create({ data });
  return NextResponse.json(category, { status: 201 });
}
