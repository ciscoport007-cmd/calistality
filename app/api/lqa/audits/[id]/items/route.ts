import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const items = await prisma.lQAAuditItem.findMany({
    where: { auditId: params.id },
    include: { criteria: true, category: true },
    orderBy: [{ categoryId: 'asc' }],
  });

  return NextResponse.json(items);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const data = await req.json();

  // Upsert item (create or update)
  const item = await prisma.lQAAuditItem.upsert({
    where: {
      auditId_criteriaId: {
        auditId: params.id,
        criteriaId: data.criteriaId,
      },
    },
    create: {
      auditId: params.id,
      criteriaId: data.criteriaId,
      categoryId: data.categoryId,
      result: data.result,
      notes: data.notes,
      photoUrl: data.photoUrl,
      score: data.score,
    },
    update: {
      result: data.result,
      notes: data.notes,
      photoUrl: data.photoUrl,
      score: data.score,
    },
    include: { criteria: true, category: true },
  });

  return NextResponse.json(item);
}
