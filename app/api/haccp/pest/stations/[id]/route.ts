import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const body = await request.json();

    const station = await prisma.hACCPPestStation.update({
      where: { id: params.id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.areaType !== undefined && { areaType: body.areaType }),
        ...(body.location !== undefined && { location: body.location }),
        ...(body.stationType !== undefined && { stationType: body.stationType || null }),
        ...(body.controlFrequency !== undefined && { controlFrequency: body.controlFrequency }),
        ...(body.lastControlDate !== undefined && { lastControlDate: body.lastControlDate ? new Date(body.lastControlDate) : null }),
        ...(body.nextControlDate !== undefined && { nextControlDate: body.nextControlDate ? new Date(body.nextControlDate) : null }),
      },
    });

    return NextResponse.json(station);
  } catch (error) {
    console.error('HACCP pest station update error:', error);
    return NextResponse.json({ error: 'İstasyon güncellenemedi' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    await prisma.hACCPPestStation.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('HACCP pest station delete error:', error);
    return NextResponse.json({ error: 'İstasyon silinemedi' }, { status: 500 });
  }
}
