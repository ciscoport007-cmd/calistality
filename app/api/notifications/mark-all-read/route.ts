import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export const dynamic = 'force-dynamic';

// Tüm bildirimleri okundu olarak işaretle
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    await prisma.notification.updateMany({
      where: {
        userId: session.user.id,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    return NextResponse.json({ message: 'Tüm bildirimler okundu olarak işaretlendi' });
  } catch (error) {
    console.error('Bildirim güncelleme hatası:', error);
    return NextResponse.json({ error: 'Bildirimler güncellenemedi' }, { status: 500 });
  }
}
