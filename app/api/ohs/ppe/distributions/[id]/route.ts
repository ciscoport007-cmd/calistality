import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { OHSPPEStatus } from '@prisma/client';

// İade işlemi
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
    const { returnQuantity, returnReason } = body;

    if (!returnQuantity) {
      return NextResponse.json(
        { error: 'İade miktarı gerekli' },
        { status: 400 }
      );
    }

    const distribution = await prisma.oHSPPEDistribution.findUnique({
      where: { id },
      include: { ppe: true },
    });

    if (!distribution) {
      return NextResponse.json({ error: 'Kayıt bulunamadı' }, { status: 404 });
    }

    if (returnQuantity > distribution.quantity) {
      return NextResponse.json(
        { error: 'İade miktarı dağıtılan miktardan fazla olamaz' },
        { status: 400 }
      );
    }

    // Transaction ile iade ve stok güncelleme
    const result = await prisma.$transaction(async (tx) => {
      // Dağıtım kaydını güncelle
      const updated = await tx.oHSPPEDistribution.update({
        where: { id },
        data: {
          returnDate: new Date(),
          returnQuantity,
          returnReason,
        },
        include: {
          ppe: { select: { id: true, code: true, name: true } },
          user: { select: { id: true, name: true, surname: true } },
        },
      });

      // Stok güncelle
      const ppe = distribution.ppe;
      const newQuantity = ppe.stockQuantity + returnQuantity;
      let newStatus: OHSPPEStatus = OHSPPEStatus.STOKTA;
      if (newQuantity === 0) newStatus = OHSPPEStatus.TUKENDI;
      else if (newQuantity <= ppe.minStockLevel) newStatus = OHSPPEStatus.AZALIYOR;

      await tx.oHSPPE.update({
        where: { id: ppe.id },
        data: {
          stockQuantity: newQuantity,
          status: newStatus,
        },
      });

      return updated;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Return error:', error);
    return NextResponse.json(
      { error: 'İade işlemi başarısız' },
      { status: 500 }
    );
  }
}
