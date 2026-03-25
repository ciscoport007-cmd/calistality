import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth-options';

// GET: Eğitim kayıtlarını listele
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await params;

    const records = await prisma.trainingRecord.findMany({
      where: { planId: id },
      include: {
        participant: {
          select: {
            id: true,
            name: true,
            surname: true,
            email: true,
            department: { select: { name: true } },
            position: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(records);
  } catch (error) {
    console.error('Error fetching training records:', error);
    return NextResponse.json(
      { error: 'Eğitim kayıtları alınırken hata oluştu' },
      { status: 500 }
    );
  }
}

// POST: Katılımcı ekle
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { participantIds } = body;

    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      return NextResponse.json(
        { error: 'En az bir katılımcı seçilmelidir' },
        { status: 400 }
      );
    }

    // Plan var mı kontrol et
    const plan = await prisma.trainingPlan.findUnique({
      where: { id },
    });

    if (!plan) {
      return NextResponse.json({ error: 'Eğitim planı bulunamadı' }, { status: 404 });
    }

    // Mevcut kayıtları al
    const existingRecords = await prisma.trainingRecord.findMany({
      where: {
        planId: id,
        participantId: { in: participantIds },
      },
      select: { participantId: true },
    });

    const existingIds = new Set(existingRecords.map(r => r.participantId));
    const newParticipantIds = participantIds.filter((pid: string) => !existingIds.has(pid));

    if (newParticipantIds.length === 0) {
      return NextResponse.json(
        { error: 'Seçili katılımcılar zaten kayıtlı' },
        { status: 400 }
      );
    }

    // Yeni kayıtları oluştur
    await prisma.trainingRecord.createMany({
      data: newParticipantIds.map((participantId: string) => ({
        planId: id,
        participantId,
        status: 'KAYITLI',
      })),
    });

    const records = await prisma.trainingRecord.findMany({
      where: { planId: id },
      include: {
        participant: {
          select: {
            id: true,
            name: true,
            surname: true,
            email: true,
            department: { select: { name: true } },
            position: { select: { name: true } },
          },
        },
      },
    });

    return NextResponse.json(records, { status: 201 });
  } catch (error) {
    console.error('Error adding participants:', error);
    return NextResponse.json(
      { error: 'Katılımcılar eklenirken hata oluştu' },
      { status: 500 }
    );
  }
}
