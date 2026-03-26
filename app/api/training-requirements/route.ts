import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth-options';

export const dynamic = 'force-dynamic';

// GET: Eğitim gereksinimlerini listele
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const positionId = searchParams.get('positionId');
    const trainingId = searchParams.get('trainingId');

    const where: any = {};

    if (positionId) {
      where.positionId = positionId;
    }

    if (trainingId) {
      where.trainingId = trainingId;
    }

    const requirements = await prisma.trainingRequirement.findMany({
      where,
      include: {
        training: { select: { id: true, code: true, name: true, type: true, isRecurring: true, recurringMonths: true } },
        position: { select: { id: true, code: true, name: true } },
      },
      orderBy: [{ priority: 'asc' }, { training: { name: 'asc' } }],
    });

    return NextResponse.json(requirements);
  } catch (error) {
    console.error('Error fetching training requirements:', error);
    return NextResponse.json(
      { error: 'Eğitim gereksinimleri alınırken hata oluştu' },
      { status: 500 }
    );
  }
}

// POST: Yeni eğitim gereksinimi oluştur
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const body = await request.json();
    const { trainingId, positionId, isMandatory, priority, dueWithinDays, notes } = body;

    if (!trainingId || !positionId) {
      return NextResponse.json(
        { error: 'Eğitim ve pozisyon zorunludur' },
        { status: 400 }
      );
    }

    // Mevcut gereksinim var mı kontrol et
    const existing = await prisma.trainingRequirement.findUnique({
      where: {
        trainingId_positionId: {
          trainingId,
          positionId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Bu pozisyon için bu eğitim gereksinimi zaten tanımlı' },
        { status: 400 }
      );
    }

    const requirement = await prisma.trainingRequirement.create({
      data: {
        trainingId,
        positionId,
        isMandatory: isMandatory ?? true,
        priority: priority ?? 1,
        dueWithinDays,
        notes,
      },
      include: {
        training: { select: { id: true, code: true, name: true, type: true } },
        position: { select: { id: true, code: true, name: true } },
      },
    });

    return NextResponse.json(requirement, { status: 201 });
  } catch (error) {
    console.error('Error creating training requirement:', error);
    return NextResponse.json(
      { error: 'Eğitim gereksinimi oluşturulurken hata oluştu' },
      { status: 500 }
    );
  }
}

// DELETE: Eğitim gereksinimi sil
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Gereksinim ID zorunludur' }, { status: 400 });
    }

    await prisma.trainingRequirement.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Eğitim gereksinimi silindi' });
  } catch (error) {
    console.error('Error deleting training requirement:', error);
    return NextResponse.json(
      { error: 'Eğitim gereksinimi silinirken hata oluştu' },
      { status: 500 }
    );
  }
}
