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

    // Ürün izlenebilirlik zinciri: aynı productName + lotNumber üzerinden tüm hareketler
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const movement = await (prisma as any).foodWarehouseMovement.findUnique({
      where: { id: params.id },
      include: {
        staff: { select: { id: true, name: true, surname: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
        sourceWarehouse: true,
        targetWarehouse: true,
        ingredient: {
          include: {
            production: {
              include: {
                staff: { select: { id: true, name: true, surname: true } },
              },
            },
          },
        },
      },
    });

    if (!movement) {
      return NextResponse.json({ error: 'Hareket bulunamadı' }, { status: 404 });
    }

    // Aynı ürün (productName) ile ilgili tüm hareketler — izlenebilirlik zinciri
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain = await (prisma as any).foodWarehouseMovement.findMany({
      where: {
        productName: movement.productName,
        isActive: true,
        ...(movement.lotNumber ? { lotNumber: movement.lotNumber } : {}),
      },
      include: {
        sourceWarehouse: { select: { id: true, name: true, type: true } },
        targetWarehouse: { select: { id: true, name: true, type: true } },
        staff: { select: { id: true, name: true, surname: true } },
      },
      orderBy: { movementDate: 'asc' },
    });

    return NextResponse.json({ movement, chain });
  } catch (error) {
    console.error('Food warehouse movement detail error:', error);
    return NextResponse.json({ error: 'Hareket alınamadı' }, { status: 500 });
  }
}
