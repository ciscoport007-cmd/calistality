import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const equipment = await prisma.hACCPEquipment.findUnique({
      where: { id: params.id },
      include: {
        createdBy: { select: { id: true, name: true, surname: true } },
        temperatureLogs: {
          include: {
            measuredBy: { select: { id: true, name: true, surname: true } },
            correctiveActionBy: { select: { id: true, name: true, surname: true } },
          },
          orderBy: { measuredAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!equipment) {
      return NextResponse.json({ error: 'Ekipman bulunamadı' }, { status: 404 });
    }

    return NextResponse.json(equipment);
  } catch (error) {
    console.error('HACCP equipment detail error:', error);
    return NextResponse.json({ error: 'Ekipman alınamadı' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const body = await request.json();
    const { name, type, location, brand, model, serialNumber, minTemp, maxTemp, targetTemp, measurementFrequency, status, notes } = body;

    const equipment = await prisma.hACCPEquipment.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(type !== undefined && { type }),
        ...(location !== undefined && { location }),
        ...(brand !== undefined && { brand: brand || null }),
        ...(model !== undefined && { model: model || null }),
        ...(serialNumber !== undefined && { serialNumber: serialNumber || null }),
        ...(minTemp !== undefined && { minTemp: minTemp !== '' ? parseFloat(minTemp) : null }),
        ...(maxTemp !== undefined && { maxTemp: maxTemp !== '' ? parseFloat(maxTemp) : null }),
        ...(targetTemp !== undefined && { targetTemp: targetTemp !== '' ? parseFloat(targetTemp) : null }),
        ...(measurementFrequency !== undefined && { measurementFrequency: measurementFrequency || null }),
        ...(status !== undefined && { status }),
        ...(notes !== undefined && { notes: notes || null }),
      },
    });

    return NextResponse.json(equipment);
  } catch (error) {
    console.error('HACCP equipment update error:', error);
    return NextResponse.json({ error: 'Ekipman güncellenemedi' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    await prisma.hACCPEquipment.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('HACCP equipment delete error:', error);
    return NextResponse.json({ error: 'Ekipman silinemedi' }, { status: 500 });
  }
}
