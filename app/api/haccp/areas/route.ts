import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isAdmin } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const areas = await (prisma as any).hACCPMeasurementArea.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json(areas);
  } catch (error) {
    console.error('HACCP areas fetch error:', error);
    return NextResponse.json({ error: 'Alanlar alınamadı' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }
    if (!isAdmin(session.user.role)) {
      return NextResponse.json({ error: 'Bu işlem için admin yetkisi gereklidir' }, { status: 403 });
    }

    const { name, sortOrder } = await request.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Alan adı zorunludur' }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const area = await (prisma as any).hACCPMeasurementArea.create({
      data: { name: name.trim(), sortOrder: sortOrder ?? 0 },
    });

    return NextResponse.json(area, { status: 201 });
  } catch (error: unknown) {
    if ((error as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Bu alan adı zaten mevcut' }, { status: 409 });
    }
    console.error('HACCP area create error:', error);
    return NextResponse.json({ error: 'Alan oluşturulamadı' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }
    if (!isAdmin(session.user.role)) {
      return NextResponse.json({ error: 'Bu işlem için admin yetkisi gereklidir' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID zorunludur' }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).hACCPMeasurementArea.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('HACCP area delete error:', error);
    return NextResponse.json({ error: 'Alan silinemedi' }, { status: 500 });
  }
}
