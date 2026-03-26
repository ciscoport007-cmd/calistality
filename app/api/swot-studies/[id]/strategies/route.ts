import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// TOWS strateji ekle
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id: studyId } = await params;
    const body = await request.json();
    const { type, title, description, strengthId, weaknessId, opportunityId, threatId, goalId } = body;

    if (!type || !title) {
      return NextResponse.json({ error: 'Gerekli alanlar eksik' }, { status: 400 });
    }

    // Validasyon
    const validTypes = ['SO', 'WO', 'ST', 'WT'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Geçersiz strateji tipi' }, { status: 400 });
    }

    const strategy = await prisma.sWOTStrategy.create({
      data: {
        studyId,
        type,
        title,
        description,
        strengthId: strengthId || null,
        weaknessId: weaknessId || null,
        opportunityId: opportunityId || null,
        threatId: threatId || null,
        goalId: goalId || null,
      },
      include: {
        strength: true,
        weakness: true,
        opportunity: true,
        threat: true,
        goal: { select: { id: true, code: true, name: true } },
      },
    });

    return NextResponse.json(strategy, { status: 201 });
  } catch (error) {
    console.error('SWOT strategy create error:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// TOWS strateji güncelle
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const body = await request.json();
    const { strategyId, title, description, strengthId, weaknessId, opportunityId, threatId, goalId } = body;

    if (!strategyId) {
      return NextResponse.json({ error: 'Strateji ID gerekli' }, { status: 400 });
    }

    const strategy = await prisma.sWOTStrategy.update({
      where: { id: strategyId },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(strengthId !== undefined && { strengthId: strengthId || null }),
        ...(weaknessId !== undefined && { weaknessId: weaknessId || null }),
        ...(opportunityId !== undefined && { opportunityId: opportunityId || null }),
        ...(threatId !== undefined && { threatId: threatId || null }),
        ...(goalId !== undefined && { goalId: goalId || null }),
      },
      include: {
        strength: true,
        weakness: true,
        opportunity: true,
        threat: true,
        goal: { select: { id: true, code: true, name: true } },
      },
    });

    return NextResponse.json(strategy);
  } catch (error) {
    console.error('SWOT strategy update error:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// TOWS strateji sil
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const strategyId = searchParams.get('strategyId');

    if (!strategyId) {
      return NextResponse.json({ error: 'Strateji ID gerekli' }, { status: 400 });
    }

    await prisma.sWOTStrategy.delete({ where: { id: strategyId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('SWOT strategy delete error:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
