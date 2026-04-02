import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export const dynamic = 'force-dynamic';

// Portör geçerliliği: en güncel OHSHealthRecord'un nextExamDate kontrolü
export async function GET(_request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const users = await prisma.user.findMany({
      where: { isActive: true, registrationStatus: 'approved' },
      select: {
        id: true,
        name: true,
        surname: true,
        healthRecords: {
          where: { isActive: true },
          orderBy: { examDate: 'desc' },
          take: 1,
          select: { nextExamDate: true, result: true },
        },
      },
      orderBy: [{ name: 'asc' }, { surname: 'asc' }],
    });

    const now = new Date();
    const result = users.map((u) => {
      const latestRecord = u.healthRecords[0];
      let portorStatus: 'gecerli' | 'suresi_dolmus' | 'kayit_yok' = 'kayit_yok';
      if (latestRecord) {
        portorStatus =
          latestRecord.nextExamDate && latestRecord.nextExamDate > now
            ? 'gecerli'
            : 'suresi_dolmus';
      }
      return {
        id: u.id,
        name: u.name,
        surname: u.surname,
        portorStatus,
        portorNextExamDate: latestRecord?.nextExamDate ?? null,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('HACCP personnel fetch error:', error);
    return NextResponse.json({ error: 'Personel listesi alınamadı' }, { status: 500 });
  }
}
