import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export const dynamic = 'force-dynamic';

const COLD_CHAIN_TEMP_THRESHOLD = 8; // °C üstü soğuk zincir uyarısı

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sourceWarehouseId = searchParams.get('sourceWarehouseId');
    const targetWarehouseId = searchParams.get('targetWarehouseId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const productName = searchParams.get('productName') || '';

    const where: Record<string, unknown> = { isActive: true };
    if (sourceWarehouseId) where.sourceWarehouseId = sourceWarehouseId;
    if (targetWarehouseId) where.targetWarehouseId = targetWarehouseId;
    if (productName) where.productName = { contains: productName, mode: 'insensitive' };
    if (startDate || endDate) {
      where.movementDate = {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate) }),
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const movements = await (prisma as any).foodWarehouseMovement.findMany({
      where,
      include: {
        staff: { select: { id: true, name: true, surname: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
        sourceWarehouse: { select: { id: true, code: true, name: true, type: true } },
        targetWarehouse: { select: { id: true, code: true, name: true, type: true } },
        ingredient: {
          select: {
            id: true,
            production: { select: { id: true, code: true, productName: true } },
          },
        },
      },
      orderBy: { movementDate: 'desc' },
      take: 200,
    });

    return NextResponse.json(movements);
  } catch (error) {
    console.error('Food warehouse movement fetch error:', error);
    return NextResponse.json({ error: 'Hareket listesi alınamadı' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const body = await request.json();
    const {
      movementDate,
      productName,
      quantity,
      unit,
      staffId,
      sourceWarehouseId,
      targetWarehouseId,
      lotNumber,
      transportTemp,
      notes,
    } = body;

    if (!movementDate || !productName || !staffId || !sourceWarehouseId || !targetWarehouseId) {
      return NextResponse.json(
        { error: 'Tarih, ürün, personel, kaynak ve hedef depo zorunludur' },
        { status: 400 }
      );
    }

    const year = new Date().getFullYear();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const last = await (prisma as any).foodWarehouseMovement.findFirst({
      where: { code: { startsWith: `DHR-${year}-` } },
      orderBy: { code: 'desc' },
    });
    const nextNum = last ? parseInt(last.code.split('-')[2]) + 1 : 1;
    const code = `DHR-${year}-${String(nextNum).padStart(4, '0')}`;

    const parsedTemp = transportTemp !== '' && transportTemp !== undefined ? parseFloat(transportTemp) : null;
    const hasTempWarning = parsedTemp !== null && parsedTemp > COLD_CHAIN_TEMP_THRESHOLD;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const movement = await (prisma as any).foodWarehouseMovement.create({
      data: {
        code,
        movementDate: new Date(movementDate),
        productName,
        quantity: parseFloat(quantity) || 0,
        unit: unit || 'kg',
        staffId,
        sourceWarehouseId,
        targetWarehouseId,
        lotNumber: lotNumber || null,
        transportTemp: parsedTemp,
        hasTempWarning,
        notes: notes || null,
        isAutoCreated: false,
        createdById: session.user.id,
      },
      include: {
        staff: { select: { id: true, name: true, surname: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
        sourceWarehouse: { select: { id: true, code: true, name: true, type: true } },
        targetWarehouse: { select: { id: true, code: true, name: true, type: true } },
      },
    });

    return NextResponse.json(movement, { status: 201 });
  } catch (error) {
    console.error('Food warehouse movement create error:', error);
    return NextResponse.json({ error: 'Hareket kaydı oluşturulamadı' }, { status: 500 });
  }
}
