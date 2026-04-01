import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const category = await prisma.lQACategory.findUnique({
    where: { id: params.id },
    include: {
      criteria: { orderBy: { order: 'asc' } },
      _count: { select: { criteria: true } },
    },
  });

  if (!category) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(category);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const data = await req.json();

  if (data.weight !== undefined) {
    const newWeight = parseFloat(data.weight) || 0;
    if (newWeight <= 0) {
      return NextResponse.json({ error: 'Ağırlık 0\'dan büyük olmalıdır' }, { status: 400 });
    }

    const current = await prisma.lQACategory.findUnique({ where: { id: params.id } });
    const oldWeight = current?.weight ?? 0;

    const agg = await prisma.lQACategory.aggregate({ _sum: { weight: true } });
    const totalExcludingSelf = (agg._sum.weight ?? 0) - oldWeight;

    if (totalExcludingSelf + newWeight > 100) {
      const remaining = parseFloat((100 - totalExcludingSelf).toFixed(2));
      return NextResponse.json(
        { error: `Toplam ağırlık 100'ü aşamaz. Bu kategori için kullanılabilir maksimum: ${remaining}` },
        { status: 400 }
      );
    }
  }

  const category = await prisma.lQACategory.update({ where: { id: params.id }, data });
  return NextResponse.json(category);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await prisma.lQACategory.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
