import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isAdmin } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const body = await request.json();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const warehouse = await (prisma as any).foodWarehouse.update({
      where: { id: params.id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.type !== undefined && { type: body.type }),
        ...(body.location !== undefined && { location: body.location || null }),
        ...(body.description !== undefined && { description: body.description || null }),
      },
    });

    return NextResponse.json(warehouse);
  } catch (error) {
    console.error('Food warehouse update error:', error);
    return NextResponse.json({ error: 'Depo güncellenemedi' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }
    if (!isAdmin(session.user.role)) {
      return NextResponse.json({ error: 'Bu işlem için admin yetkisi gereklidir' }, { status: 403 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).foodWarehouse.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Food warehouse delete error:', error);
    return NextResponse.json({ error: 'Depo silinemedi' }, { status: 500 });
  }
}
