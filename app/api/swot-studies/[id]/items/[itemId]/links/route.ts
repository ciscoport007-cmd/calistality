import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth-options';

// GET - SWOT Item'ın tüm bağlantılarını getir
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { itemId } = await params;

    // Hedef bağlantıları
    const goalLinks = await prisma.sWOTGoalLink.findMany({
      where: { itemId },
      include: {
        goal: {
          include: {
            objective: {
              include: { perspective: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Aksiyon bağlantıları
    const actionLinks = await prisma.sWOTActionLink.findMany({
      where: { itemId },
      include: {
        action: {
          include: {
            goal: true,
            department: true,
            responsible: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ goalLinks, actionLinks });
  } catch (error) {
    console.error('Error fetching SWOT links:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Yeni bağlantı ekle
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { itemId } = await params;
    const body = await request.json();
    const { type, targetId, linkType, notes } = body;

    // Item var mı kontrol et
    const item = await prisma.sWOTItem.findUnique({ where: { id: itemId } });
    if (!item) {
      return NextResponse.json({ error: 'SWOT item not found' }, { status: 404 });
    }

    if (type === 'goal') {
      // Hedef bağlantısı
      const existing = await prisma.sWOTGoalLink.findUnique({
        where: { itemId_goalId: { itemId, goalId: targetId } }
      });
      if (existing) {
        return NextResponse.json({ error: 'Bu hedef zaten bağlı' }, { status: 400 });
      }

      const link = await prisma.sWOTGoalLink.create({
        data: {
          itemId,
          goalId: targetId,
          linkType: linkType || 'ILGILI',
          notes
        },
        include: {
          goal: {
            include: {
              objective: {
                include: { perspective: true }
              }
            }
          }
        }
      });
      return NextResponse.json({ type: 'goal', link });

    } else if (type === 'action') {
      // Aksiyon bağlantısı
      const existing = await prisma.sWOTActionLink.findUnique({
        where: { itemId_actionId: { itemId, actionId: targetId } }
      });
      if (existing) {
        return NextResponse.json({ error: 'Bu aksiyon zaten bağlı' }, { status: 400 });
      }

      const link = await prisma.sWOTActionLink.create({
        data: {
          itemId,
          actionId: targetId,
          linkType: linkType || 'ILGILI',
          notes
        },
        include: {
          action: {
            include: {
              goal: true,
              department: true,
              responsible: { select: { id: true, name: true } }
            }
          }
        }
      });
      return NextResponse.json({ type: 'action', link });

    } else {
      return NextResponse.json({ error: 'Invalid link type' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error creating SWOT link:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Bağlantı sil
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const linkId = searchParams.get('linkId');

    if (!type || !linkId) {
      return NextResponse.json({ error: 'type and linkId required' }, { status: 400 });
    }

    if (type === 'goal') {
      await prisma.sWOTGoalLink.delete({ where: { id: linkId } });
    } else if (type === 'action') {
      await prisma.sWOTActionLink.delete({ where: { id: linkId } });
    } else {
      return NextResponse.json({ error: 'Invalid link type' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting SWOT link:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
