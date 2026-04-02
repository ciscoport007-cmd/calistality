import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const warehouses = await (prisma as any).foodWarehouse.findMany({
      where: { isActive: true },
      include: {
        createdBy: { select: { id: true, name: true, surname: true } },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(warehouses);
  } catch (error) {
    console.error('Food warehouse fetch error:', error);
    return NextResponse.json({ error: 'Depo listesi alınamadı' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const body = await request.json();
    const { name, type, location, description } = body;

    if (!name || !type) {
      return NextResponse.json({ error: 'Ad ve tür zorunludur' }, { status: 400 });
    }

    const year = new Date().getFullYear();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const last = await (prisma as any).foodWarehouse.findFirst({
      where: { code: { startsWith: `DPO-${year}-` } },
      orderBy: { code: 'desc' },
    });
    const nextNum = last ? parseInt(last.code.split('-')[2]) + 1 : 1;
    const code = `DPO-${year}-${String(nextNum).padStart(4, '0')}`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const warehouse = await (prisma as any).foodWarehouse.create({
      data: {
        code,
        name,
        type,
        location: location || null,
        description: description || null,
        createdById: session.user.id,
      },
      include: {
        createdBy: { select: { id: true, name: true, surname: true } },
      },
    });

    return NextResponse.json(warehouse, { status: 201 });
  } catch (error) {
    console.error('Food warehouse create error:', error);
    return NextResponse.json({ error: 'Depo oluşturulamadı' }, { status: 500 });
  }
}
