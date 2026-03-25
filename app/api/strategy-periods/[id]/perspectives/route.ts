import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth-options';

// GET - Perspektifleri listele
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const perspectives = await prisma.bSCPerspective.findMany({
      where: { periodId: id },
      include: {
        objectives: {
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json(perspectives);
  } catch (error) {
    console.error('Error fetching perspectives:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Yeni perspektif ekle
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { code, name, description, color, icon } = body;

    // Mevcut perspektif sayısını al
    const count = await prisma.bSCPerspective.count({
      where: { periodId: id },
    });

    const perspective = await prisma.bSCPerspective.create({
      data: {
        periodId: id,
        code,
        name,
        description,
        color: color || '#6B7280',
        icon,
        sortOrder: count + 1,
      },
    });

    return NextResponse.json(perspective, { status: 201 });
  } catch (error) {
    console.error('Error creating perspective:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
