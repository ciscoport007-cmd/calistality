import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

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
          criteria: true,
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
  return NextResponse.json(audit);
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

  await prisma.lQAAudit.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
