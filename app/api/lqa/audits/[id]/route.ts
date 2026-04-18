import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { isAdmin } from '@/lib/audit';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const audit = await prisma.lQAAudit.findUnique({
    where: { id: params.id },
    include: {
      auditor: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      items: {
        include: {
          criteria: {
            include: { category: { select: { id: true, name: true, code: true } } },
          },
          category: true,
        },
        orderBy: [{ categoryId: 'asc' }, { criteriaId: 'asc' }],
      },
      scores: {
        include: { category: true },
      },
    },
  });

  if (!audit) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Fetch categories referenced in this audit
  const categories = audit.selectedCategories.length > 0
    ? await prisma.lQACategory.findMany({
        where: { id: { in: audit.selectedCategories } },
        orderBy: { order: 'asc' },
      })
    : [];

  // Normalize to match frontend interface
  const normalized = {
    id: audit.id,
    code: audit.code,
    title: audit.title,
    type: audit.auditType,
    auditDate: audit.auditDate,
    status: audit.status,
    notes: audit.notes,
    areaInfo: audit.areaName,
    totalScore: audit.overallScore ?? null,
    auditor: audit.auditor
      ? { id: audit.auditor.id, name: audit.auditor.name, surname: '' }
      : audit.auditorName
        ? { id: '', name: audit.auditorName, surname: '' }
        : null,
    categories: categories.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      iconName: c.icon ?? null,
    })),
    items: audit.items.map((item) => ({
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
    })),
  };

  return NextResponse.json(normalized);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const data = await req.json();
  const audit = await prisma.lQAAudit.update({ where: { id: params.id }, data });
  return NextResponse.json(audit);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!isAdmin(session.user.role)) {
    return NextResponse.json({ error: 'Bu işlem için Admin yetkisi gereklidir' }, { status: 403 });
  }

  const audit = await prisma.lQAAudit.findUnique({
    where: { id: params.id },
    select: { status: true },
  });

  if (!audit) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (audit.status !== 'TAMAMLANDI') {
    return NextResponse.json(
      { error: 'Yalnızca tamamlanmış denetimler silinebilir' },
      { status: 400 }
    );
  }

  await prisma.lQAAudit.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
