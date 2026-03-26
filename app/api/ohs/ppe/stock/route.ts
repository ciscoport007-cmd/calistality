import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { OHSPPEStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

// KKD stok listesi
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz eri\u015fim' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const lowStock = searchParams.get('lowStock');

    const where: any = { isActive: true };

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (type) {
      where.type = type;
    }

    if (status) {
      where.status = status;
    }

    const ppeItems = await prisma.oHSPPE.findMany({
      where,
      include: {
        department: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
        _count: { select: { distributions: true } },
      },
      orderBy: { name: 'asc' },
    });

    // D\u00fc\u015f\u00fck stok filtreleme
    let result = ppeItems;
    if (lowStock === 'true') {
      result = ppeItems.filter(item => item.stockQuantity <= item.minStockLevel);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('PPE stock fetch error:', error);
    return NextResponse.json(
      { error: 'KKD stok listesi al\u0131namad\u0131' },
      { status: 500 }
    );
  }
}

// Yeni KKD ekle
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz eri\u015fim' }, { status: 401 });
    }

    const body = await request.json();
    const {
      type,
      name,
      brand,
      model,
      stockQuantity,
      minStockLevel,
      unit,
      location,
      departmentId,
    } = body;

    if (!type || !name) {
      return NextResponse.json(
        { error: 'Zorunlu alanlar eksik' },
        { status: 400 }
      );
    }

    // Kod olu\u015ftur
    const year = new Date().getFullYear();
    const lastPPE = await prisma.oHSPPE.findFirst({
      where: { code: { startsWith: `KKD-${year}` } },
      orderBy: { code: 'desc' },
    });

    let nextNumber = 1;
    if (lastPPE) {
      const lastNumber = parseInt(lastPPE.code.split('-')[2]);
      nextNumber = lastNumber + 1;
    }
    const code = `KKD-${year}-${nextNumber.toString().padStart(4, '0')}`;

    // Stok durumunu hesapla
    const qty = stockQuantity || 0;
    const minLevel = minStockLevel || 10;
    let status: OHSPPEStatus = OHSPPEStatus.STOKTA;
    if (qty === 0) status = OHSPPEStatus.TUKENDI;
    else if (qty <= minLevel) status = OHSPPEStatus.AZALIYOR;

    const ppe = await prisma.oHSPPE.create({
      data: {
        code,
        type,
        name,
        brand,
        model,
        stockQuantity: qty,
        minStockLevel: minLevel,
        unit: unit || 'Adet',
        location,
        departmentId: departmentId || null,
        status,
        createdById: session.user.id,
      },
      include: {
        department: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
      },
    });

    return NextResponse.json(ppe, { status: 201 });
  } catch (error) {
    console.error('PPE create error:', error);
    return NextResponse.json(
      { error: 'KKD eklenemedi' },
      { status: 500 }
    );
  }
}
