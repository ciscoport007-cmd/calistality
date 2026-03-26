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
    const isActive = searchParams.get('isActive');

    const categories = await prisma.initiativeCategory.findMany({
      where: {
        ...(isActive !== null && { isActive: isActive === 'true' }),
      },
      include: {
        initiatives: { where: { status: { not: 'IPTAL' } } },
        _count: { select: { initiatives: true } },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching initiative categories:', error);
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
    const { name, description, color, defaultWeight, maxScore, sortOrder } = body;

    if (!name) {
      return NextResponse.json({ error: 'Kategori adı gereklidir' }, { status: 400 });
    }

    const count = await prisma.initiativeCategory.count();
    const code = `INK-${String(count + 1).padStart(3, '0')}`;

    const category = await prisma.initiativeCategory.create({
      data: {
        code,
        name,
        description,
        color: color || '#3B82F6',
        defaultWeight: defaultWeight || 1.0,
        maxScore: maxScore || 100,
        sortOrder: sortOrder || 0,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('Error creating initiative category:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
