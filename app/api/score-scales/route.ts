import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

// Puan Skalası listesi
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('isActive');

    const scales = await prisma.scoreScale.findMany({
      where: {
        ...(isActive !== null && { isActive: isActive === 'true' }),
      },
      include: {
        levels: {
          orderBy: { sortOrder: 'asc' },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(scales);
  } catch (error) {
    console.error('Error fetching score scales:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Yeni puan skalası oluştur
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, minScore, maxScore, isDefault, levels } = body;

    if (!name) {
      return NextResponse.json({ error: 'Skala adı gereklidir' }, { status: 400 });
    }

    // Kod oluştur
    const count = await prisma.scoreScale.count();
    const code = `SKL-${String(count + 1).padStart(4, '0')}`;

    // Eğer varsayılan olarak işaretlendiyse, diğerlerini kaldır
    if (isDefault) {
      await prisma.scoreScale.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const scale = await prisma.scoreScale.create({
      data: {
        code,
        name,
        description,
        minScore: minScore || 0,
        maxScore: maxScore || 100,
        isDefault: isDefault || false,
        createdById: session.user.id,
        levels: levels?.length > 0 ? {
          create: levels.map((level: any, index: number) => ({
            name: level.name,
            score: level.score,
            minPerformance: level.minPerformance,
            maxPerformance: level.maxPerformance,
            color: level.color || '#3B82F6',
            description: level.description,
            sortOrder: index,
          })),
        } : undefined,
      },
      include: {
        levels: { orderBy: { sortOrder: 'asc' } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(scale, { status: 201 });
  } catch (error) {
    console.error('Error creating score scale:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
