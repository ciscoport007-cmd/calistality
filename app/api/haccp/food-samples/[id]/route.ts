import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const body = await request.json();
    const { dispose, notes } = body;

    const sample = await prisma.hACCPFoodSample.update({
      where: { id: params.id },
      data: {
        ...(dispose && {
          isDisposed: true,
          disposedAt: new Date(),
          disposedById: session.user.id,
        }),
        ...(notes !== undefined && { notes: notes || null }),
      },
    });

    return NextResponse.json(sample);
  } catch (error) {
    console.error('HACCP food sample update error:', error);
    return NextResponse.json({ error: 'Numune güncellenemedi' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    await prisma.hACCPFoodSample.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('HACCP food sample delete error:', error);
    return NextResponse.json({ error: 'Numune silinemedi' }, { status: 500 });
  }
}
