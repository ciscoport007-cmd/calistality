import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const areaType = searchParams.get('areaType');

    const where: Record<string, unknown> = { isActive: true };
    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (areaType) where.areaType = areaType;

    const stations = await prisma.hACCPPestStation.findMany({
      where,
      include: {
        createdBy: { select: { id: true, name: true, surname: true } },
        _count: { select: { pestLogs: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(stations);
  } catch (error) {
    console.error('HACCP pest stations fetch error:', error);
    return NextResponse.json({ error: 'İstasyonlar alınamadı' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const body = await request.json();
    const { name, areaType, location, stationType, controlFrequency } = body;

    if (!name || !areaType || !location) {
      return NextResponse.json({ error: 'Ad, alan tipi ve konum zorunludur' }, { status: 400 });
    }

    const year = new Date().getFullYear();
    const lastStation = await prisma.hACCPPestStation.findFirst({
      where: { code: { startsWith: `PST-${year}-` } },
      orderBy: { code: 'desc' },
    });
    const nextNumber = lastStation ? parseInt(lastStation.code.split('-')[2]) + 1 : 1;
    const code = `PST-${year}-${String(nextNumber).padStart(4, '0')}`;

    const station = await prisma.hACCPPestStation.create({
      data: {
        code,
        name,
        areaType,
        location,
        stationType: stationType || null,
        controlFrequency: controlFrequency || 'HAFTALIK',
        createdById: session.user.id,
      },
    });

    return NextResponse.json(station, { status: 201 });
  } catch (error) {
    console.error('HACCP pest station create error:', error);
    return NextResponse.json({ error: 'İstasyon oluşturulamadı' }, { status: 500 });
  }
}
