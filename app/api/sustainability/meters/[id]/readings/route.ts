import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '30');
    const skip = (page - 1) * limit;

    const [readings, total] = await Promise.all([
      prisma.sustainabilityReading.findMany({
        where: { meterId: params.id },
        include: { createdBy: { select: { id: true, name: true, surname: true } } },
        orderBy: { readingDate: 'desc' },
        skip,
        take: limit,
      }),
      prisma.sustainabilityReading.count({ where: { meterId: params.id } }),
    ]);

    return NextResponse.json({
      readings,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Readings GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { readingDate, period, value, cost, occupancyRate, guestCount, notes } = body;

    if (!readingDate || !period || value === undefined) {
      return NextResponse.json({ error: 'Zorunlu alanlar eksik' }, { status: 400 });
    }

    const meter = await prisma.sustainabilityMeter.findUnique({ where: { id: params.id } });
    if (!meter) return NextResponse.json({ error: 'Sayaç bulunamadı' }, { status: 404 });

    // Anomaly detection: compare with average of last 3 readings
    const recent = await prisma.sustainabilityReading.findMany({
      where: { meterId: params.id },
      orderBy: { readingDate: 'desc' },
      take: 3,
    });

    let isAnomalous = false;
    if (recent.length >= 2) {
      const avg = recent.reduce((s, r) => s + r.value, 0) / recent.length;
      if (avg > 0 && Math.abs(value - avg) / avg > 0.3) {
        isAnomalous = true;
      }
    }

    const reading = await prisma.sustainabilityReading.create({
      data: {
        meterId: params.id,
        readingDate: new Date(readingDate),
        period,
        value: parseFloat(value),
        cost: cost ? parseFloat(cost) : null,
        occupancyRate: occupancyRate ? parseFloat(occupancyRate) : null,
        guestCount: guestCount ? parseInt(guestCount) : null,
        notes,
        isAnomalous,
        createdById: session.user.id,
      },
    });

    // Create alert if anomalous
    if (isAnomalous) {
      await prisma.sustainabilityAlert.create({
        data: {
          category: meter.category,
          alertType: 'ANOMALI',
          severity: 'UYARI',
          title: `${meter.name} - Anormal Tüketim Tespit Edildi`,
          message: `${meter.name} sayacında ${value} ${meter.unit} tüketim kaydedildi. Bu değer son 3 okuma ortalamasının %30 üzerinde veya altındadır.`,
          meterId: params.id,
          readingId: reading.id,
        },
      });
    }

    return NextResponse.json(reading, { status: 201 });
  } catch (error) {
    console.error('Reading POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
