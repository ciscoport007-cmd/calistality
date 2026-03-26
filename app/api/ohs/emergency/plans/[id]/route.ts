import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export const dynamic = 'force-dynamic';

// Plan detayı
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

    const plan = await prisma.oHSEmergencyPlan.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true, surname: true } },
        drills: {
          where: { isActive: true },
          include: {
            createdBy: { select: { id: true, name: true, surname: true } },
          },
          orderBy: { drillDate: 'desc' },
        },
      },
    });

    if (!plan) {
      return NextResponse.json({ error: 'Plan bulunamadı' }, { status: 404 });
    }

    return NextResponse.json(plan);
  } catch (error) {
    console.error('Emergency plan fetch error:', error);
    return NextResponse.json(
      { error: 'Plan alınamadı' },
      { status: 500 }
    );
  }
}

// Plan güncelle
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

    // Tarih alanlarını dönüştür
    if (body.validFrom) body.validFrom = new Date(body.validFrom);
    if (body.validUntil) body.validUntil = new Date(body.validUntil);

    const plan = await prisma.oHSEmergencyPlan.update({
      where: { id },
      data: body,
      include: {
        createdBy: { select: { id: true, name: true, surname: true } },
      },
    });

    return NextResponse.json(plan);
  } catch (error) {
    console.error('Emergency plan update error:', error);
    return NextResponse.json(
      { error: 'Plan güncellenemedi' },
      { status: 500 }
    );
  }
}

// Plan sil
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

    await prisma.oHSEmergencyPlan.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Emergency plan delete error:', error);
    return NextResponse.json(
      { error: 'Plan silinemedi' },
      { status: 500 }
    );
  }
}
