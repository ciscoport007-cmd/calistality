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

  try {
    const data = await req.json() as {
      itemId: string;
      answer: string | null;
      notes?: string | null;
    };

    if (!data.itemId) {
      return NextResponse.json({ error: 'itemId zorunludur' }, { status: 400 });
    }

    const item = await prisma.lQAAuditItem.update({
      where: { id: data.itemId, auditId: params.id },
      data: {
        result: (data.answer ?? null) as 'EVET' | 'HAYIR' | 'NA' | null,
        notes: data.notes ?? null,
      },
      include: {
        criteria: {
          include: { category: { select: { id: true, name: true, code: true } } },
        },
        category: true,
      },
    });

    // Normalize to match frontend AuditItem interface
    return NextResponse.json({
      id: item.id,
      criterionId: item.criteriaId,
      criterion: {
        id: item.criteria.id,
        code: item.criteria.code,
        description: item.criteria.description,
        weight: item.criteria.weight,
        isCritical: item.criteria.isCritical,
        category: item.criteria.category,
      },
      answer: item.result ?? null,
      notes: item.notes ?? null,
      score: item.score ?? null,
    });
  } catch (error) {
    console.error('LQA audit item POST error:', error);
    const message = error instanceof Error ? error.message : 'Kaydedilemedi';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
