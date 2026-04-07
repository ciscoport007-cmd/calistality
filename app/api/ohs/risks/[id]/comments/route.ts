import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { createNotification } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

// Yorumları listele
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const comments = await prisma.oHSRiskComment.findMany({
      where: { riskId: params.id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            surname: true,
            role: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(comments);
  } catch (error) {
    console.error('OHS comments fetch error:', error);
    return NextResponse.json(
      { error: 'Yorumlar alınamadı' },
      { status: 500 }
    );
  }
}

// Yeni yorum ekle
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    // Yetki kontrolü - sadece belirli roller yorum yapabilir
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { role: true },
    });

    const allowedRoles = ['Admin', 'Yönetici', 'Genel Müdür', 'Kalite Müdürü', 'İK Müdürü', 'İnsan Kaynakları Müdürü', 'Finans Müdürü', 'İSG Uzmanı', 'İş Güvenliği Uzmanı'];
    const hasPermission = allowedRoles.some(role => user?.role?.name?.includes(role));

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Yorum yapma yetkiniz yok' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { content } = body;

    if (!content || content.trim() === '') {
      return NextResponse.json(
        { error: 'Yorum içeriği boş olamaz' },
        { status: 400 }
      );
    }

    // Risk bilgisini al
    const risk = await prisma.oHSRisk.findUnique({
      where: { id: params.id },
      include: {
        owner: true,
        createdBy: true,
      },
    });

    if (!risk) {
      return NextResponse.json(
        { error: 'Risk bulunamadı' },
        { status: 404 }
      );
    }

    const comment = await prisma.oHSRiskComment.create({
      data: {
        riskId: params.id,
        content: content.trim(),
        authorId: session.user.id,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            surname: true,
            role: { select: { name: true } },
          },
        },
      },
    });

    // İlgili kişilere bildirim gönder
    const notifyUserIds = new Set<string>();
    
    // Risk sahibi
    if (risk.ownerId && risk.ownerId !== session.user.id) {
      notifyUserIds.add(risk.ownerId);
    }

    // Risk oluşturan
    if (risk.createdById && risk.createdById !== session.user.id) {
      notifyUserIds.add(risk.createdById);
    }

    // Yöneticiler (yorum yapan değilse)
    const managers = await prisma.user.findMany({
      where: {
        isActive: true,
        id: { not: session.user.id },
        role: {
          name: {
            in: ['Genel Müdür', 'Kalite Müdürü', 'İK Müdürü', 'İnsan Kaynakları Müdürü', 'Finans Müdürü', 'İSG Uzmanı'],
          },
        },
      },
    });

    managers.forEach(m => notifyUserIds.add(m.id));

    // Bildirimleri gönder
    for (const userId of notifyUserIds) {
      await createNotification({
        userId,
        type: 'BILGI',
        title: 'İSG Riskine Yeni Yorum',
        message: `"${risk.name}" riskine ${user?.name} ${user?.surname || ''} yorum ekledi.`,
        link: `/dashboard/ohs/risks/${params.id}`,
      });
    }

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error('OHS comment create error:', error);
    return NextResponse.json(
      { error: 'Yorum oluşturulamadı' },
      { status: 500 }
    );
  }
}
