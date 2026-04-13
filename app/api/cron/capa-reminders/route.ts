import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createNotification } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

// Kaç gün kaldığında bildirim gönderilsin
const REMINDER_DAYS = [7, 3, 1];

export async function GET(request: NextRequest) {
  // Cron secret kontrolü (Vercel Cron veya manuel tetikleme)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let totalSent = 0;
    const results: { days: number; count: number }[] = [];

    for (const days of REMINDER_DAYS) {
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + days);

      const dayStart = new Date(targetDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(targetDate);
      dayEnd.setHours(23, 59, 59, 999);

      const capas = await prisma.cAPA.findMany({
        where: {
          isActive: true,
          dueDate: { gte: dayStart, lte: dayEnd },
          status: { notIn: ['KAPATILDI', 'IPTAL_EDILDI'] },
        },
        select: {
          id: true,
          code: true,
          title: true,
          createdById: true,
          responsibleUserId: true,
          responsibleUserId2: true,
          responsibleUserId3: true,
        },
      });

      let sent = 0;

      for (const capa of capas) {
        // Bildirim alacak benzersiz kullanıcı listesi
        const recipientIds = new Set<string>(
          [
            capa.createdById,
            capa.responsibleUserId,
            capa.responsibleUserId2,
            capa.responsibleUserId3,
          ].filter((id): id is string => !!id)
        );

        const message =
          days === 1
            ? `${capa.code} kodlu "${capa.title}" CAPA'nın terminine yarın son gün!`
            : `${capa.code} kodlu "${capa.title}" CAPA'nın terminine ${days} gün kaldı.`;

        for (const userId of recipientIds) {
          await createNotification({
            userId,
            title: 'CAPA Termin Yaklaşıyor',
            message,
            type: days === 1 ? 'HATA' : 'UYARI',
            link: `/dashboard/capas/${capa.id}`,
          });
          sent++;
        }
      }

      results.push({ days, count: capas.length });
      totalSent += sent;
    }

    return NextResponse.json({
      success: true,
      message: `Toplam ${totalSent} bildirim gönderildi.`,
      details: results,
    });
  } catch (error) {
    console.error('CAPA termin hatırlatma hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
