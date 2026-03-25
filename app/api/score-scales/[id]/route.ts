import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const scale = await prisma.scoreScale.findUnique({
      where: { id: params.id },
      include: {
        levels: { orderBy: { sortOrder: 'asc' } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!scale) {
      return NextResponse.json({ error: 'Skala bulunamadı' }, { status: 404 });
    }

    return NextResponse.json(scale);
  } catch (error) {
    console.error('Error fetching score scale:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, minScore, maxScore, isDefault, isActive, levels } = body;

    // Eğer varsayılan olarak işaretlendiyse, diğerlerini kaldır
    if (isDefault) {
      await prisma.scoreScale.updateMany({
        where: { isDefault: true, NOT: { id: params.id } },
        data: { isDefault: false },
      });
    }

    // Mevcut seviyeleri sil ve yenilerini ekle
    if (levels) {
      await prisma.scoreScaleLevel.deleteMany({ where: { scaleId: params.id } });
    }

    const scale = await prisma.scoreScale.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(minScore !== undefined && { minScore }),
        ...(maxScore !== undefined && { maxScore }),
        ...(isDefault !== undefined && { isDefault }),
        ...(isActive !== undefined && { isActive }),
        ...(levels && {
          levels: {
            create: levels.map((level: any, index: number) => ({
              name: level.name,
              score: level.score,
              minPerformance: level.minPerformance,
              maxPerformance: level.maxPerformance,
              color: level.color || '#3B82F6',
              description: level.description,
              sortOrder: index,
            })),
          },
        }),
      },
      include: {
        levels: { orderBy: { sortOrder: 'asc' } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(scale);
  } catch (error) {
    console.error('Error updating score scale:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.scoreScale.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return NextResponse.json({ message: 'Skala deaktif edildi' });
  } catch (error) {
    console.error('Error deleting score scale:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
