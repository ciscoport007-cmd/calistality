import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isAdmin } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const record = await (prisma as any).foodProductionRecord.findUnique({
      where: { id: params.id },
      include: {
        staff: { select: { id: true, name: true, surname: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
        ingredients: {
          include: {
            warehouse: { select: { id: true, code: true, name: true, type: true } },
            movement: { select: { id: true, code: true } },
          },
        },
      },
    });

    if (!record) {
      return NextResponse.json({ error: 'Kayıt bulunamadı' }, { status: 404 });
    }

    return NextResponse.json(record);
  } catch (error) {
    console.error('Food production get error:', error);
    return NextResponse.json({ error: 'Kayıt alınamadı' }, { status: 500 });
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
    await (prisma as any).foodProductionRecord.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Food production delete error:', error);
    return NextResponse.json({ error: 'Kayıt silinemedi' }, { status: 500 });
  }
}
