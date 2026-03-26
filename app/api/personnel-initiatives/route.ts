import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  const items = await prisma.personnelInitiative.findMany({
    where: userId ? { userId } : {},
    include: { initiative: true, user: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(items);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { initiativeId, userId, role, weight } = body;

  if (!initiativeId || !userId) {
    return NextResponse.json({ error: 'Eksik alan' }, { status: 400 });
  }

  const result = await (prisma.personnelInitiative.create as any)({
    data: {
      initiativeId,
      userId,
      role: role || 'UYE',
      weight: weight || 1.0,
    },
  });
  return NextResponse.json(result, { status: 201 });
}
