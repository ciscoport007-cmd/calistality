import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// SWOT öğesi ekle
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
      type, title, description, impact, priority,
      responsibleId, processName, subProcessName, startDate, endDate, actionNote 
    } = body;

    if (!type || !title) {
      return NextResponse.json({ error: 'Gerekli alanlar eksik' }, { status: 400 });
    }

    // Validasyon
    const validTypes = ['STRENGTH', 'WEAKNESS', 'OPPORTUNITY', 'THREAT'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Geçersiz öğe tipi' }, { status: 400 });
    }

    const item = await prisma.sWOTItem.create({
      data: {
        studyId,
        type,
        title,
        description,
        impact: impact || 3,
        priority: priority || 0,
        responsibleId: responsibleId || null,
        processName: processName || null,
        subProcessName: subProcessName || null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        actionNote: actionNote || null,
      },
      include: {
        responsible: { select: { id: true, name: true, surname: true } },
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error('SWOT item create error:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// SWOT öğesi güncelle
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
      itemId, title, description, impact, priority,
      responsibleId, processName, subProcessName, startDate, endDate, actionNote 
    } = body;

    if (!itemId) {
      return NextResponse.json({ error: 'Öğe ID gerekli' }, { status: 400 });
    }

    const item = await prisma.sWOTItem.update({
      where: { id: itemId },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(impact !== undefined && { impact }),
        ...(priority !== undefined && { priority }),
        ...(responsibleId !== undefined && { responsibleId: responsibleId || null }),
        ...(processName !== undefined && { processName: processName || null }),
        ...(subProcessName !== undefined && { subProcessName: subProcessName || null }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(actionNote !== undefined && { actionNote: actionNote || null }),
      },
      include: {
        responsible: { select: { id: true, name: true, surname: true } },
      },
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error('SWOT item update error:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// SWOT öğesi sil
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
    const itemId = searchParams.get('itemId');

    if (!itemId) {
      return NextResponse.json({ error: 'Öğe ID gerekli' }, { status: 400 });
    }

    await prisma.sWOTItem.delete({ where: { id: itemId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('SWOT item delete error:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
