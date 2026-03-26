import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth-options';

export const dynamic = 'force-dynamic';

// GET: Eğitimleri listele
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const isActive = searchParams.get('isActive');
    const search = searchParams.get('search');

    const where: any = {};

    if (type) {
      where.type = type;
    }

    if (isActive !== null && isActive !== '') {
      where.isActive = isActive === 'true';
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    const trainings = await prisma.training.findMany({
      where,
      include: {
        createdBy: { select: { id: true, name: true, surname: true } },
        _count: {
          select: {
            plans: true,
            requirements: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(trainings);
  } catch (error) {
    console.error('Error fetching trainings:', error);
    return NextResponse.json(
      { error: 'Eğitimler alınırken hata oluştu' },
      { status: 500 }
    );
  }
}

// POST: Yeni eğitim oluştur
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      type,
      method,
      durationMinutes,
      objectives,
      content,
      materials,
      prerequisites,
      targetAudience,
      hasCertificate,
      certificateValidityMonths,
      hasExam,
      passingScore,
      isRecurring,
      recurringMonths,
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Eğitim adı zorunludur' },
        { status: 400 }
      );
    }

    // Otomatik kod oluştur (EGT-YYYY-NNN)
    const year = new Date().getFullYear();
    const lastTraining = await prisma.training.findFirst({
      where: {
        code: {
          startsWith: `EGT-${year}-`,
        },
      },
      orderBy: { code: 'desc' },
    });

    let sequence = 1;
    if (lastTraining) {
      const lastSequence = parseInt(lastTraining.code.split('-')[2]);
      sequence = lastSequence + 1;
    }
    const code = `EGT-${year}-${String(sequence).padStart(3, '0')}`;

    const training = await prisma.training.create({
      data: {
        code,
        name,
        description,
        type: type || 'TEKNIK',
        method: method || 'SINIF_ICI',
        durationMinutes: durationMinutes || 60,
        objectives,
        content,
        materials,
        prerequisites,
        targetAudience,
        hasCertificate: hasCertificate || false,
        certificateValidityMonths,
        hasExam: hasExam || false,
        passingScore,
        isRecurring: isRecurring || false,
        recurringMonths,
        createdById: session.user.id,
      },
      include: {
        createdBy: { select: { id: true, name: true, surname: true } },
      },
    });

    return NextResponse.json(training, { status: 201 });
  } catch (error) {
    console.error('Error creating training:', error);
    return NextResponse.json(
      { error: 'Eğitim oluşturulurken hata oluştu' },
      { status: 500 }
    );
  }
}
