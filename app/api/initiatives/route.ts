import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    const departmentId = searchParams.get('departmentId');
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');

    const initiatives = await prisma.initiative.findMany({
      where: {
        ...(categoryId && { categoryId }),
        ...(departmentId && { departmentId }),
        ...(status && { status: status as any }),
        ...(userId && {
          assignments: { some: { userId } },
        }),
      },
      include: {
        category: true,
        department: true,
        assignments: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            evaluator: { select: { id: true, name: true, email: true } },
          },
        },
        createdBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(initiatives);
  } catch (error) {
    console.error('Error fetching initiatives:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, categoryId, departmentId, startDate, endDate, scoringCriteria, maxScore, assignments, status } = body;

    if (!name || !categoryId || !startDate || !endDate) {
      return NextResponse.json({ error: 'İnisiyatif adı, kategori, başlangıç ve bitiş tarihi gereklidir' }, { status: 400 });
    }

    const count = await prisma.initiative.count();
    const year = new Date().getFullYear();
    const code = `INS-${year}-${String(count + 1).padStart(4, '0')}`;

    const initiative = await prisma.initiative.create({
      data: {
        code,
        name,
        description,
        categoryId,
        departmentId: departmentId || null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        scoringCriteria: scoringCriteria || [
          { criteria: 'Zamanında Tamamlama', weight: 30 },
          { criteria: 'Kalite', weight: 40 },
          { criteria: 'İşbirliği', weight: 30 },
        ],
        maxScore: maxScore || 100,
        status: status || 'TASLAK',
        createdById: session.user.id,
        assignments: assignments?.length > 0 ? {
          create: assignments.map((a: any) => ({
            userId: a.userId,
            role: a.role || 'UYE',
            weight: a.weight || 1.0,
          })),
        } : undefined,
      },
      include: {
        category: true,
        department: true,
        assignments: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(initiative, { status: 201 });
  } catch (error) {
    console.error('Error creating initiative:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
