import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// PESTEL faktörü ekle
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
    const {
      category,
      title,
      description,
      impactType,
      impactLevel,
      probability,
      timeframe,
      actionRequired,
      actionNotes,
      priority,
      responsibleId,
    } = body;

    if (!category || !title) {
      return NextResponse.json({ error: 'Gerekli alanlar eksik' }, { status: 400 });
    }

    // Validasyon
    const validCategories = ['POLITICAL', 'ECONOMIC', 'SOCIAL', 'TECHNOLOGICAL', 'ENVIRONMENTAL', 'LEGAL'];
    if (!validCategories.includes(category)) {
      return NextResponse.json({ error: 'Geçersiz kategori' }, { status: 400 });
    }

    const factor = await prisma.pESTELFactor.create({
      data: {
        studyId,
        category,
        title,
        description,
        impactType: impactType || 'NOTR',
        impactLevel: impactLevel || 3,
        probability: probability || 3,
        timeframe: timeframe || null,
        actionRequired: actionRequired || false,
        actionNotes: actionNotes || null,
        priority: priority || 0,
        responsibleId: responsibleId || null,
      },
      include: {
        responsible: { select: { id: true, name: true, surname: true } },
      },
    });

    return NextResponse.json(factor, { status: 201 });
  } catch (error) {
    console.error('PESTEL factor create error:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// PESTEL faktörü güncelle
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
    const {
      factorId,
      title,
      description,
      impactType,
      impactLevel,
      probability,
      timeframe,
      actionRequired,
      actionNotes,
      priority,
      responsibleId,
    } = body;

    if (!factorId) {
      return NextResponse.json({ error: 'Faktör ID gerekli' }, { status: 400 });
    }

    const factor = await prisma.pESTELFactor.update({
      where: { id: factorId },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(impactType && { impactType }),
        ...(impactLevel !== undefined && { impactLevel }),
        ...(probability !== undefined && { probability }),
        ...(timeframe !== undefined && { timeframe }),
        ...(actionRequired !== undefined && { actionRequired }),
        ...(actionNotes !== undefined && { actionNotes }),
        ...(priority !== undefined && { priority }),
        ...(responsibleId !== undefined && { responsibleId: responsibleId || null }),
      },
      include: {
        responsible: { select: { id: true, name: true, surname: true } },
      },
    });

    return NextResponse.json(factor);
  } catch (error) {
    console.error('PESTEL factor update error:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// PESTEL faktörü sil
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
    const factorId = searchParams.get('factorId');

    if (!factorId) {
      return NextResponse.json({ error: 'Faktör ID gerekli' }, { status: 400 });
    }

    await prisma.pESTELFactor.delete({ where: { id: factorId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PESTEL factor delete error:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
