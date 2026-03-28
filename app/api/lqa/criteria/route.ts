import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get('categoryId');

  const criteria = await prisma.lQACriteria.findMany({
    where: categoryId ? { categoryId } : undefined,
    include: { category: true },
    orderBy: { order: 'asc' },
  });

  return NextResponse.json(criteria);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const data = await req.json();
  const criteria = await prisma.lQACriteria.create({ data });
  return NextResponse.json(criteria, { status: 201 });
}
