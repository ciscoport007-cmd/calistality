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
    const staffId = searchParams.get('staffId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: Record<string, unknown> = { isActive: true };
    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { productName: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (staffId) where.staffId = staffId;
    if (startDate || endDate) {
      where.productionDate = {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate) }),
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const records = await (prisma as any).foodProductionRecord.findMany({
      where,
      include: {
        staff: { select: { id: true, name: true, surname: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
        ingredients: {
          include: {
            warehouse: { select: { id: true, code: true, name: true, type: true } },
          },
        },
      },
      orderBy: { productionDate: 'desc' },
      take: 100,
    });

    return NextResponse.json(records);
  } catch (error) {
    console.error('Food production fetch error:', error);
    return NextResponse.json({ error: 'Üretim kayıtları alınamadı' }, { status: 500 });
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
      productionDate,
      productName,
      quantity,
      quantityUnit,
      staffId,
      cookingTemp,
      cookingDuration,
      finalInternalTemp,
      notes,
      ingredients,
    } = body;

    if (!productionDate || !productName || !staffId) {
      return NextResponse.json({ error: 'Tarih, ürün adı ve personel zorunludur' }, { status: 400 });
    }

    const year = new Date().getFullYear();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const last = await (prisma as any).foodProductionRecord.findFirst({
      where: { code: { startsWith: `URK-${year}-` } },
      orderBy: { code: 'desc' },
    });
    const nextNum = last ? parseInt(last.code.split('-')[2]) + 1 : 1;
    const code = `URK-${year}-${String(nextNum).padStart(4, '0')}`;

    const parsedCookingTemp = cookingTemp !== '' && cookingTemp !== undefined ? parseFloat(cookingTemp) : null;
    const hasTempWarning = parsedCookingTemp !== null && parsedCookingTemp < 75;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const record = await (prisma as any).foodProductionRecord.create({
      data: {
        code,
        productionDate: new Date(productionDate),
        productName,
        quantity: parseFloat(quantity) || 0,
        quantityUnit: quantityUnit || 'kg',
        staffId,
        cookingTemp: parsedCookingTemp,
        cookingDuration: cookingDuration !== '' && cookingDuration !== undefined ? parseInt(cookingDuration) : null,
        finalInternalTemp: finalInternalTemp !== '' && finalInternalTemp !== undefined ? parseFloat(finalInternalTemp) : null,
        hasTempWarning,
        notes: notes || null,
        createdById: session.user.id,
        ingredients: {
          create: (ingredients || []).map((ing: { name: string; quantity: number; unit: string; warehouseId?: string; lotNumber?: string }) => ({
            name: ing.name,
            quantity: parseFloat(String(ing.quantity)) || 0,
            unit: ing.unit || 'kg',
            warehouseId: ing.warehouseId || null,
            lotNumber: ing.lotNumber || null,
          })),
        },
      },
      include: {
        staff: { select: { id: true, name: true, surname: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
        ingredients: {
          include: {
            warehouse: { select: { id: true, code: true, name: true, type: true } },
          },
        },
      },
    });

    // Ham madde için depo varsa → otomatik Depo Hareketi oluştur
    const ingredientsWithWarehouse = record.ingredients.filter(
      (ing: { warehouseId: string | null; id: string }) => ing.warehouseId
    );

    if (ingredientsWithWarehouse.length > 0) {
      // Mutfak deposunu bul ya da yoksa geçici bir hedef belirle
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let mutfakWarehouse = await (prisma as any).foodWarehouse.findFirst({
        where: { type: 'MUTFAK', isActive: true },
      });

      if (!mutfakWarehouse) {
        const movYear = new Date().getFullYear();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const lastW = await (prisma as any).foodWarehouse.findFirst({
          where: { code: { startsWith: `DPO-${movYear}-` } },
          orderBy: { code: 'desc' },
        });
        const nextW = lastW ? parseInt(lastW.code.split('-')[2]) + 1 : 1;
        const wCode = `DPO-${movYear}-${String(nextW).padStart(4, '0')}`;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mutfakWarehouse = await (prisma as any).foodWarehouse.create({
          data: { code: wCode, name: 'Mutfak (Otomatik)', type: 'MUTFAK', createdById: session.user.id },
        });
      }

      const movYear = new Date().getFullYear();
      for (const ing of ingredientsWithWarehouse) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const lastMov = await (prisma as any).foodWarehouseMovement.findFirst({
          where: { code: { startsWith: `DHR-${movYear}-` } },
          orderBy: { code: 'desc' },
        });
        const nextMov = lastMov ? parseInt(lastMov.code.split('-')[2]) + 1 : 1;
        const movCode = `DHR-${movYear}-${String(nextMov).padStart(4, '0')}`;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const movement = await (prisma as any).foodWarehouseMovement.create({
          data: {
            code: movCode,
            movementDate: new Date(productionDate),
            productName: ing.name,
            quantity: ing.quantity,
            unit: ing.unit,
            lotNumber: ing.lotNumber || null,
            staffId,
            sourceWarehouseId: ing.warehouseId,
            targetWarehouseId: mutfakWarehouse.id,
            ingredientId: ing.id,
            isAutoCreated: true,
            createdById: session.user.id,
          },
        });

        // ingredient'a movement bağla
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (prisma as any).foodProductionIngredient.update({
          where: { id: ing.id },
          data: { movement: { connect: { id: movement.id } } },
        });
      }
    }

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error('Food production create error:', error);
    return NextResponse.json({ error: 'Üretim kaydı oluşturulamadı' }, { status: 500 });
  }
}
