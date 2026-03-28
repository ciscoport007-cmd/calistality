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
  const type = searchParams.get('type');
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (status && status !== 'ALL') where.status = status;
  if (type && type !== 'ALL') where.auditType = type;

  const [auditsRaw, total] = await Promise.all([
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

  // Normalize to match frontend interface
  const data = auditsRaw.map((a) => ({
    id: a.id,
    code: a.code,
    title: a.title,
    type: a.auditType,
    auditDate: a.auditDate,
    auditor: a.auditor ? { id: a.auditor.id, name: a.auditor.name, surname: '' } : null,
    totalScore: a.overallScore,
    status: a.status,
    createdAt: a.createdAt,
    _count: a._count,
  }));

  return NextResponse.json({
    data,
    meta: { total, page, limit },
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { categoryIds, auditorId, auditorName, type, areaInfo, ...rest } = body;

  const count = await prisma.lQAAudit.count();
  const code = `LQA.${new Date().getFullYear()}.${String(count + 1).padStart(4, '0')}`;

  const audit = await prisma.lQAAudit.create({
    data: {
      ...rest,
      code,
      auditType: type ?? 'IC',
      selectedCategories: Array.isArray(categoryIds) ? categoryIds : [],
      areaName: areaInfo ?? null,
      auditorId: auditorId ?? null,
      auditorName: auditorName ?? null,
      createdById: session.user.id,
    },
    include: {
      auditor: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(audit, { status: 201 });
}
