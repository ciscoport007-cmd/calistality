import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const status = searchParams.get('status');
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;

  const [audits, total] = await Promise.all([
    prisma.lQAAudit.findMany({
      where,
      include: {
        auditor: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.lQAAudit.count({ where }),
  ]);

  return NextResponse.json({ audits, total, page, limit });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const data = await req.json();

  // Generate unique code
  const count = await prisma.lQAAudit.count();
  const code = `LQA.${new Date().getFullYear()}.${String(count + 1).padStart(4, '0')}`;

  const audit = await prisma.lQAAudit.create({
    data: {
      ...data,
      code,
      createdById: session.user.id,
    },
    include: {
      auditor: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(audit, { status: 201 });
}
