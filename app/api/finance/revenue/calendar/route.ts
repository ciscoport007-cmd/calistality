import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { startOfMonth, endOfMonth, eachDayOfInterval, format } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()));
    const month = parseInt(searchParams.get('month') ?? String(new Date().getMonth() + 1));

    const refDate = new Date(year, month - 1, 1);
    const start = startOfMonth(refDate);
    const end = endOfMonth(refDate);

    const reports = await prisma.financeReport.findMany({
      where: { reportDate: { gte: start, lte: end } },
      select: {
        reportDate: true,
        fileName: true,
        uploadedBy: { select: { name: true, surname: true } },
        _count: { select: { entries: true } },
      },
      orderBy: { reportDate: 'asc' },
    });

    const reportMap = new Map(
      reports.map((r) => [
        format(r.reportDate, 'yyyy-MM-dd'),
        {
          uploaded: true,
          fileName: r.fileName,
          uploadedBy: r.uploadedBy
            ? `${r.uploadedBy.name} ${r.uploadedBy.surname ?? ''}`
            : 'Bilinmiyor',
          entryCount: r._count.entries,
        },
      ])
    );

    const today = new Date();
    const allDays = eachDayOfInterval({ start, end });

    const calendar = allDays.map((day) => {
      const key = format(day, 'yyyy-MM-dd');
      const isFuture = day > today;
      return {
        date: key,
        isFuture,
        ...(reportMap.get(key) ?? { uploaded: false }),
      };
    });

    const uploadedCount = reports.length;
    const totalDays = allDays.filter((d) => d <= today).length;
    const missingCount = totalDays - uploadedCount;

    return NextResponse.json({
      success: true,
      data: { calendar, uploadedCount, missingCount, totalDays, year, month },
    });
  } catch (error) {
    console.error('Finance calendar error:', error);
    return NextResponse.json({ error: 'Takvim verisi alınırken hata oluştu' }, { status: 500 });
  }
}
