import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const year = searchParams.get('year');

  const targets = await prisma.lQATarget.findMany({
    where: year ? { year: parseInt(year) } : undefined,
    include: { category: true },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(targets);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const data = await req.json();
  const target = await prisma.lQATarget.create({
    data: { ...data, createdById: session.user.id },
    include: { category: true },
  });

  return NextResponse.json(target, { status: 201 });
}
