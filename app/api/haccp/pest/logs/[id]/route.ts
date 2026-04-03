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
    const { actionStatus, actionTaken } = body;

    const log = await prisma.hACCPPestLog.update({
      where: { id: params.id },
      data: {
        ...(actionStatus !== undefined && { actionStatus }),
        ...(actionTaken !== undefined && { actionTaken: actionTaken || null }),
      },
      include: {
        station: { select: { id: true, code: true, name: true, areaType: true, location: true } },
        inspectedBy: { select: { id: true, name: true, surname: true } },
      },
    });

    return NextResponse.json(log);
  } catch (error) {
    console.error('HACCP pest log update error:', error);
    return NextResponse.json({ error: 'Güncelleme başarısız' }, { status: 500 });
  }
}
