import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export const dynamic = 'force-dynamic';

// KKD detayı
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

    const ppe = await prisma.oHSPPE.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true, surname: true } },
        distributions: {
          include: {
            user: { select: { id: true, name: true, surname: true } },
            distributedBy: { select: { id: true, name: true, surname: true } },
          },
          orderBy: { distributionDate: 'desc' },
        },
      },
    });

    if (!ppe) {
      return NextResponse.json({ error: 'KKD bulunamadı' }, { status: 404 });
    }

    return NextResponse.json(ppe);
  } catch (error) {
    console.error('PPE fetch error:', error);
    return NextResponse.json(
      { error: 'KKD alınamadı' },
      { status: 500 }
    );
  }
}

// KKD güncelle
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

    // Stok güncelleme işlemi
    if (body.stockQuantity !== undefined || body.minStockLevel !== undefined) {
      const current = await prisma.oHSPPE.findUnique({ where: { id } });
      if (current) {
        const qty = body.stockQuantity ?? current.stockQuantity;
        const minLevel = body.minStockLevel ?? current.minStockLevel;
        
        if (qty === 0) body.status = 'TUKENDI';
        else if (qty <= minLevel) body.status = 'AZALIYOR';
        else body.status = 'STOKTA';
      }
    }

    const ppe = await prisma.oHSPPE.update({
      where: { id },
      data: body,
      include: {
        createdBy: { select: { id: true, name: true, surname: true } },
      },
    });

    return NextResponse.json(ppe);
  } catch (error) {
    console.error('PPE update error:', error);
    return NextResponse.json(
      { error: 'KKD güncellenemedi' },
      { status: 500 }
    );
  }
}

// KKD sil
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    if (session.user.role !== 'Admin') {
      return NextResponse.json(
        { error: 'KKD silme işlemi yalnızca Admin yetkisiyle yapılabilir.' },
        { status: 403 }
      );
    }

    const { id } = await params;

    await prisma.oHSPPE.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PPE delete error:', error);
    return NextResponse.json(
      { error: 'KKD silinemedi' },
      { status: 500 }
    );
  }
}
