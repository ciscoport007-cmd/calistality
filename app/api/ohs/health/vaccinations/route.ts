import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

// Aşı kayıtları listesi
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const vaccineType = searchParams.get('vaccineType');
    const expiringSoon = searchParams.get('expiringSoon');

    const where: any = { isActive: true };

    if (userId) {
      where.userId = userId;
    }

    if (vaccineType) {
      where.vaccineType = vaccineType;
    }

    // Sonraki doz tarihi yakın olanlar
    if (expiringSoon === 'true') {
      const thirtyDaysLater = new Date();
      thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
      where.nextDoseDate = {
        lte: thirtyDaysLater,
        gte: new Date(),
      };
    }

    const vaccinations = await prisma.oHSVaccination.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, surname: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
      },
      orderBy: { vaccineDate: 'desc' },
    });

    return NextResponse.json(vaccinations);
  } catch (error) {
    console.error('Vaccinations fetch error:', error);
    return NextResponse.json(
      { error: 'Aşı kayıtları alınamadı' },
      { status: 500 }
    );
  }
}

// Yeni aşı kaydı oluştur
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const body = await request.json();
    const {
      userId,
      vaccineType,
      vaccineName,
      vaccineDate,
      nextDoseDate,
      doseNumber,
      administeredBy,
      batchNumber,
      notes,
    } = body;

    if (!userId || !vaccineType || !vaccineDate) {
      return NextResponse.json(
        { error: 'Zorunlu alanlar eksik' },
        { status: 400 }
      );
    }

    const vaccination = await prisma.oHSVaccination.create({
      data: {
        userId,
        vaccineType,
        vaccineName,
        vaccineDate: new Date(vaccineDate),
        nextDoseDate: nextDoseDate ? new Date(nextDoseDate) : null,
        doseNumber: doseNumber || 1,
        administeredBy,
        batchNumber,
        notes,
        createdById: session.user.id,
      },
      include: {
        user: { select: { id: true, name: true, surname: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
      },
    });

    return NextResponse.json(vaccination, { status: 201 });
  } catch (error) {
    console.error('Vaccination create error:', error);
    return NextResponse.json(
      { error: 'Aşı kaydı oluşturulamadı' },
      { status: 500 }
    );
  }
}
