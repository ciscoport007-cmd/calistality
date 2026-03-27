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
    const { correctiveAction, notes } = body;

    const log = await prisma.hACCPTemperatureLog.update({
      where: { id: params.id },
      data: {
        ...(correctiveAction !== undefined && {
          correctiveAction: correctiveAction || null,
          correctiveActionAt: correctiveAction ? new Date() : null,
          correctiveActionById: correctiveAction ? session.user.id : null,
        }),
        ...(notes !== undefined && { notes: notes || null }),
      },
    });

    return NextResponse.json(log);
  } catch (error) {
    console.error('HACCP temperature log update error:', error);
    return NextResponse.json({ error: 'Kayıt güncellenemedi' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    await prisma.hACCPTemperatureLog.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('HACCP temperature log delete error:', error);
    return NextResponse.json({ error: 'Kayıt silinemedi' }, { status: 500 });
  }
}
