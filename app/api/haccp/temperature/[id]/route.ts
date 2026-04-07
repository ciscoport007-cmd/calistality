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
      include: {
        equipment: { select: { name: true, location: true, createdById: true } },
      },
    });

    // DF girilince ilgili kişilere bildirim gönder
    if (correctiveAction) {
      const notifyUsers = await prisma.user.findMany({
        where: {
          isActive: true,
          OR: [
            ...((log as any).equipment.createdById ? [{ id: (log as any).equipment.createdById }] : []),
            { role: { name: { contains: 'Admin', mode: 'insensitive' } } },
            { role: { name: { contains: 'Kalite', mode: 'insensitive' } } },
            { role: { name: { contains: 'HACCP', mode: 'insensitive' } } },
            { role: { name: { contains: 'Yönetici', mode: 'insensitive' } } },
            { role: { name: { contains: 'Müdür', mode: 'insensitive' } } },
          ],
        },
        select: { id: true },
      });

      const uniqueIds = [...new Set(notifyUsers.map((u) => u.id))];
      if (uniqueIds.length > 0) {
        await prisma.notification.createMany({
          data: uniqueIds.map((userId) => ({
            userId,
            title: '✅ Düzeltici Faaliyet Tamamlandı',
            message: `${(log as any).equipment.name} ekipmanı için limit dışı sıcaklık kaydına düzeltici faaliyet girildi: "${correctiveAction}"`,
            type: 'BILGI',
            link: '/dashboard/haccp/temperature',
          })),
          skipDuplicates: true,
        });
      }
    }

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
