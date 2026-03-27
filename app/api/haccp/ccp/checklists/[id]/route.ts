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
    const { approve, nonConformity, capaId, notes } = body;

    const checklist = await prisma.hACCPCCPChecklist.update({
      where: { id: params.id },
      data: {
        ...(approve && {
          isApproved: true,
          approvedById: session.user.id,
          approvedAt: new Date(),
        }),
        ...(nonConformity !== undefined && { nonConformity: nonConformity || null }),
        ...(capaId !== undefined && { capaId: capaId || null, capaCreated: !!capaId }),
        ...(notes !== undefined && { notes: notes || null }),
      },
    });

    return NextResponse.json(checklist);
  } catch (error) {
    console.error('HACCP CCP checklist update error:', error);
    return NextResponse.json({ error: 'Kontrol kaydı güncellenemedi' }, { status: 500 });
  }
}
