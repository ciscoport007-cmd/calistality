import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const categories = await prisma.equipmentCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { equipment: true } },
      },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching equipment categories:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, code, description, color } = body;

    if (!name || !code) {
      return NextResponse.json({ error: 'Name and code are required' }, { status: 400 });
    }

    const existingCategory = await prisma.equipmentCategory.findUnique({
      where: { code },
    });

    if (existingCategory) {
      return NextResponse.json({ error: 'Category with this code already exists' }, { status: 400 });
    }

    const maxSortOrder = await prisma.equipmentCategory.aggregate({
      _max: { sortOrder: true },
    });

    const category = await prisma.equipmentCategory.create({
      data: {
        name,
        code: code.toUpperCase(),
        description,
        color: color || '#6B7280',
        sortOrder: (maxSortOrder._max.sortOrder || 0) + 1,
      },
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error('Error creating equipment category:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
