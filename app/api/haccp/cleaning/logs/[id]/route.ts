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
    const { signOff, actionTaken, notes } = body;

    const log = await prisma.hACCPCleaningLog.update({
      where: { id: params.id },
      data: {
        ...(signOff && {
          isSignedOff: true,
          signedOffById: session.user.id,
          signedOffAt: new Date(),
        }),
        ...(actionTaken !== undefined && { actionTaken: actionTaken || null }),
        ...(notes !== undefined && { notes: notes || null }),
      },
    });

    return NextResponse.json(log);
  } catch (error) {
    console.error('HACCP cleaning log update error:', error);
    return NextResponse.json({ error: 'Temizlik kaydı güncellenemedi' }, { status: 500 });
  }
}
