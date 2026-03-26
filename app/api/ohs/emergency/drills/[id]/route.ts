import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export const dynamic = 'force-dynamic';

// Tatbikat detayı
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await params;

    const drill = await prisma.oHSEmergencyDrill.findUnique({
      where: { id },
      include: {
        plan: { select: { id: true, code: true, title: true, type: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
      },
    });

    if (!drill) {
      return NextResponse.json({ error: 'Tatbikat bulunamadı' }, { status: 404 });
    }

    return NextResponse.json(drill);
  } catch (error) {
    console.error('Drill fetch error:', error);
    return NextResponse.json(
      { error: 'Tatbikat alınamadı' },
      { status: 500 }
    );
  }
}

// Tatbikat güncelle
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    if (body.drillDate) body.drillDate = new Date(body.drillDate);

    const drill = await prisma.oHSEmergencyDrill.update({
      where: { id },
      data: body,
      include: {
        plan: { select: { id: true, code: true, title: true, type: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
      },
    });

    return NextResponse.json(drill);
  } catch (error) {
    console.error('Drill update error:', error);
    return NextResponse.json(
      { error: 'Tatbikat güncellenemedi' },
      { status: 500 }
    );
  }
}

// Tatbikat sil
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await params;

    await prisma.oHSEmergencyDrill.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Drill delete error:', error);
    return NextResponse.json(
      { error: 'Tatbikat silinemedi' },
      { status: 500 }
    );
  }
}
