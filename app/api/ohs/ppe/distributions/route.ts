import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { createNotification } from '@/lib/notifications';
import { OHSPPEStatus } from '@prisma/client';

// Da\u011f\u0131t\u0131m kay\u0131tlar\u0131
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz eri\u015fim' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const ppeId = searchParams.get('ppeId');
    const userId = searchParams.get('userId');

    const where: any = {};

    if (ppeId) {
      where.ppeId = ppeId;
    }

    if (userId) {
      where.userId = userId;
    }

    const distributions = await prisma.oHSPPEDistribution.findMany({
      where,
      include: {
        ppe: { select: { id: true, code: true, name: true, type: true, unit: true } },
        user: { select: { id: true, name: true, surname: true } },
        distributedBy: { select: { id: true, name: true, surname: true } },
      },
      orderBy: { distributionDate: 'desc' },
    });

    return NextResponse.json(distributions);
  } catch (error) {
    console.error('Distributions fetch error:', error);
    return NextResponse.json(
      { error: 'Da\u011f\u0131t\u0131m kay\u0131tlar\u0131 al\u0131namad\u0131' },
      { status: 500 }
    );
  }
}

// Yeni da\u011f\u0131t\u0131m
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz eri\u015fim' }, { status: 401 });
    }

    const body = await request.json();
    const {
      ppeId,
      recipientName,
      departmentManagerName,
      quantity,
      description,
      notes,
    } = body;

    if (!ppeId || !recipientName || !quantity) {
      return NextResponse.json(
        { error: 'Zorunlu alanlar eksik (KKD, Teslim Alan, Miktar)' },
        { status: 400 }
      );
    }

    // Stok kontrol\u00fc
    const ppe = await prisma.oHSPPE.findUnique({ where: { id: ppeId } });
    if (!ppe) {
      return NextResponse.json({ error: 'KKD bulunamad\u0131' }, { status: 404 });
    }

    if (ppe.stockQuantity < quantity) {
      return NextResponse.json(
        { error: `Yetersiz stok. Mevcut: ${ppe.stockQuantity} ${ppe.unit}` },
        { status: 400 }
      );
    }

    // Transaction ile da\u011f\u0131t\u0131m ve stok g\u00fcncelleme
    const result = await prisma.$transaction(async (tx) => {
      // Da\u011f\u0131t\u0131m kayd\u0131
      const distribution = await tx.oHSPPEDistribution.create({
        data: {
          ppeId,
          recipientName,
          departmentManagerName: departmentManagerName || null,
          quantity,
          description: description || null,
          notes: notes || null,
          distributedById: session.user.id,
        },
        include: {
          ppe: { select: { id: true, code: true, name: true, type: true, unit: true } },
          user: { select: { id: true, name: true, surname: true } },
          distributedBy: { select: { id: true, name: true, surname: true } },
        },
      });

      // Stok g\u00fcncelle
      const newQuantity = ppe.stockQuantity - quantity;
      let newStatus: OHSPPEStatus = OHSPPEStatus.STOKTA;
      if (newQuantity === 0) newStatus = OHSPPEStatus.TUKENDI;
      else if (newQuantity <= ppe.minStockLevel) newStatus = OHSPPEStatus.AZALIYOR;

      await tx.oHSPPE.update({
        where: { id: ppeId },
        data: {
          stockQuantity: newQuantity,
          status: newStatus,
        },
      });

      return distribution;
    });

    // Generate custody PDF in background (non-blocking)
    try {
      const baseUrl = process.env.NEXTAUTH_URL || '';
      fetch(`${baseUrl}/api/ohs/ppe/custody-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ distributionId: result.id }),
      }).catch(err => console.error('Custody PDF generation trigger error:', err));
    } catch (err) {
      console.error('Custody PDF trigger error:', err);
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Distribution create error:', error);
    return NextResponse.json(
      { error: 'Da\u011f\u0131t\u0131m kayd\u0131 olu\u015fturulamad\u0131' },
      { status: 500 }
    );
  }
}
