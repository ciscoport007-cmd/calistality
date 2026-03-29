import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth-options';
import { createNotification } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

// GET - Yorumları listele
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await context.params;

    const comments = await prisma.innovationIdeaComment.findMany({
      where: { ideaId: id },
      include: { author: { select: { id: true, name: true, surname: true } } },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(comments);
  } catch (error) {
    console.error('Yorum listesi hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// POST - Yorum ekle
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await context.params;
    const { content } = await request.json();

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Yorum içeriği boş olamaz' }, { status: 400 });
    }

    const idea = await prisma.innovationIdea.findUnique({
      where: { id },
      select: { id: true, createdById: true, code: true, title: true, isActive: true },
    });

    if (!idea || !idea.isActive) {
      return NextResponse.json({ error: 'Fikir bulunamadı' }, { status: 404 });
    }

    const comment = await prisma.innovationIdeaComment.create({
      data: { content, ideaId: id, authorId: session.user.id },
      include: { author: { select: { id: true, name: true, surname: true } } },
    });

    // Fikir sahibine bildir (kendisi değilse)
    if (idea.createdById !== session.user.id) {
      await createNotification({
        userId: idea.createdById,
        title: 'Fikrinize Yorum Yapıldı',
        message: `${idea.code} kodlu "${idea.title}" fikrinize yeni bir yorum eklendi.`,
        type: 'BILGI',
        link: `/dashboard/innovation/${id}`,
      });
    }

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error('Yorum ekleme hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
