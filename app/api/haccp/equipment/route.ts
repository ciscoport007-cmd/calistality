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
    const type = searchParams.get('type');
    const status = searchParams.get('status');

    const where: Record<string, unknown> = { isActive: true };
    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (type) where.type = type;
    if (status) where.status = status;

    const equipment = await prisma.hACCPEquipment.findMany({
      where,
      include: {
        createdBy: { select: { id: true, name: true, surname: true } },
        _count: { select: { temperatureLogs: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(equipment);
  } catch (error) {
    console.error('HACCP equipment fetch error:', error);
    return NextResponse.json({ error: 'Ekipmanlar alınamadı' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const body = await request.json();
    const { name, type, location, brand, model, serialNumber, minTemp, maxTemp, targetTemp, measurementFrequency, notes } = body;

    if (!name || !type || !location) {
      return NextResponse.json({ error: 'Ad, tip ve konum zorunludur' }, { status: 400 });
    }

    const year = new Date().getFullYear();
    const lastEquipment = await prisma.hACCPEquipment.findFirst({
      where: { code: { startsWith: `EKP-${year}-` } },
      orderBy: { code: 'desc' },
    });
    const nextNumber = lastEquipment
      ? parseInt(lastEquipment.code.split('-')[2]) + 1
      : 1;
    const code = `EKP-${year}-${String(nextNumber).padStart(4, '0')}`;

    const equipment = await prisma.hACCPEquipment.create({
      data: {
        code,
        name,
        type,
        location,
        brand: brand || null,
        model: model || null,
        serialNumber: serialNumber || null,
        minTemp: minTemp !== '' && minTemp !== undefined ? parseFloat(minTemp) : null,
        maxTemp: maxTemp !== '' && maxTemp !== undefined ? parseFloat(maxTemp) : null,
        targetTemp: targetTemp !== '' && targetTemp !== undefined ? parseFloat(targetTemp) : null,
        measurementFrequency: measurementFrequency || null,
        notes: notes || null,
        createdById: session.user.id,
      },
    });

    return NextResponse.json(equipment, { status: 201 });
  } catch (error) {
    console.error('HACCP equipment create error:', error);
    return NextResponse.json({ error: 'Ekipman oluşturulamadı' }, { status: 500 });
  }
}
