import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth-options';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

// POST - Oy ver/kaldır (toggle)
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await context.params;
    const { isUpVote } = await request.json();

    const idea = await prisma.innovationIdea.findUnique({ where: { id } });
    if (!idea || !idea.isActive) {
      return NextResponse.json({ error: 'Fikir bulunamadı' }, { status: 404 });
    }

    const existingVote = await prisma.innovationIdeaVote.findUnique({
      where: { ideaId_userId: { ideaId: id, userId: session.user.id } },
    });

    await prisma.$transaction(async (tx) => {
      if (!existingVote) {
        // Yeni oy
        await tx.innovationIdeaVote.create({
          data: { ideaId: id, userId: session.user.id, isUpVote },
        });
        await tx.innovationIdea.update({
          where: { id },
          data: {
            upVotes: isUpVote ? { increment: 1 } : undefined,
            downVotes: !isUpVote ? { increment: 1 } : undefined,
            score: isUpVote ? { increment: 1 } : { decrement: 1 },
          },
        });
      } else if (existingVote.isUpVote === isUpVote) {
        // Aynı yönde oy → kaldır
        await tx.innovationIdeaVote.delete({
          where: { ideaId_userId: { ideaId: id, userId: session.user.id } },
        });
        await tx.innovationIdea.update({
          where: { id },
          data: {
            upVotes: isUpVote ? { decrement: 1 } : undefined,
            downVotes: !isUpVote ? { decrement: 1 } : undefined,
            score: isUpVote ? { decrement: 1 } : { increment: 1 },
          },
        });
      } else {
        // Farklı yön → değiştir
        await tx.innovationIdeaVote.update({
          where: { ideaId_userId: { ideaId: id, userId: session.user.id } },
          data: { isUpVote },
        });
        if (isUpVote) {
          // down → up
          await tx.innovationIdea.update({
            where: { id },
            data: { upVotes: { increment: 1 }, downVotes: { decrement: 1 }, score: { increment: 2 } },
          });
        } else {
          // up → down
          await tx.innovationIdea.update({
            where: { id },
            data: { upVotes: { decrement: 1 }, downVotes: { increment: 1 }, score: { decrement: 2 } },
          });
        }
      }
    });

    const updated = await prisma.innovationIdea.findUnique({
      where: { id },
      select: { upVotes: true, downVotes: true, score: true },
    });

    const userVote = await prisma.innovationIdeaVote.findUnique({
      where: { ideaId_userId: { ideaId: id, userId: session.user.id } },
    });

    return NextResponse.json({
      ...updated,
      userVote: userVote ? (userVote.isUpVote ? 'up' : 'down') : null,
    });
  } catch (error) {
    console.error('Oy hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
