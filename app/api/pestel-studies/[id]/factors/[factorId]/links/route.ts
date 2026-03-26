import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth-options';

export const dynamic = 'force-dynamic';

// GET - PESTEL Factor'ın tüm bağlantılarını getir
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; factorId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { factorId } = await params;

    // Hedef bağlantıları
    const goalLinks = await prisma.pESTELGoalLink.findMany({
      where: { factorId },
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

    // Risk bağlantıları
    const riskLinks = await prisma.pESTELRiskLink.findMany({
      where: { factorId },
      include: {
        risk: {
          include: {
            category: true,
            department: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Aksiyon bağlantıları
    const actionLinks = await prisma.pESTELActionLink.findMany({
      where: { factorId },
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

    return NextResponse.json({ goalLinks, riskLinks, actionLinks });
  } catch (error) {
    console.error('Error fetching PESTEL links:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Yeni bağlantı ekle
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; factorId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { factorId } = await params;
    const body = await request.json();
    const { type, targetId, linkType, notes } = body;

    // Factor var mı kontrol et
    const factor = await prisma.pESTELFactor.findUnique({ where: { id: factorId } });
    if (!factor) {
      return NextResponse.json({ error: 'PESTEL factor not found' }, { status: 404 });
    }

    if (type === 'goal') {
      // Hedef bağlantısı
      const existing = await prisma.pESTELGoalLink.findUnique({
        where: { factorId_goalId: { factorId, goalId: targetId } }
      });
      if (existing) {
        return NextResponse.json({ error: 'Bu hedef zaten bağlı' }, { status: 400 });
      }

      const link = await prisma.pESTELGoalLink.create({
        data: {
          factorId,
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

    } else if (type === 'risk') {
      // Risk bağlantısı
      const existing = await prisma.pESTELRiskLink.findUnique({
        where: { factorId_riskId: { factorId, riskId: targetId } }
      });
      if (existing) {
        return NextResponse.json({ error: 'Bu risk zaten bağlı' }, { status: 400 });
      }

      const link = await prisma.pESTELRiskLink.create({
        data: {
          factorId,
          riskId: targetId,
          notes
        },
        include: {
          risk: {
            include: {
              category: true,
              department: true
            }
          }
        }
      });
      return NextResponse.json({ type: 'risk', link });

    } else if (type === 'action') {
      // Aksiyon bağlantısı
      const existing = await prisma.pESTELActionLink.findUnique({
        where: { factorId_actionId: { factorId, actionId: targetId } }
      });
      if (existing) {
        return NextResponse.json({ error: 'Bu aksiyon zaten bağlı' }, { status: 400 });
      }

      const link = await prisma.pESTELActionLink.create({
        data: {
          factorId,
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
    console.error('Error creating PESTEL link:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Bağlantı sil
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; factorId: string }> }
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
      await prisma.pESTELGoalLink.delete({ where: { id: linkId } });
    } else if (type === 'risk') {
      await prisma.pESTELRiskLink.delete({ where: { id: linkId } });
    } else if (type === 'action') {
      await prisma.pESTELActionLink.delete({ where: { id: linkId } });
    } else {
      return NextResponse.json({ error: 'Invalid link type' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting PESTEL link:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
