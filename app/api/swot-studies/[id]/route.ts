import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

// SWOT çalışması detayı
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await params;

    const study = await prisma.sWOTStudy.findUnique({
      where: { id },
      include: {
        period: { select: { id: true, code: true, name: true } },
        department: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
        items: {
          orderBy: [{ type: 'asc' }, { priority: 'asc' }],
          include: {
            responsible: { select: { id: true, name: true, surname: true } },
          },
        },
        strategies: {
          include: {
            strength: true,
            weakness: true,
            opportunity: true,
            threat: true,
            goal: { select: { id: true, code: true, name: true } },
          },
          orderBy: { type: 'asc' },
        },
      },
    });

    if (!study) {
      return NextResponse.json({ error: 'Çalışma bulunamadı' }, { status: 404 });
    }

    // SWOT öğelerini kategorize et
    const categorizedItems = {
      strengths: study.items.filter(i => i.type === 'STRENGTH'),
      weaknesses: study.items.filter(i => i.type === 'WEAKNESS'),
      opportunities: study.items.filter(i => i.type === 'OPPORTUNITY'),
      threats: study.items.filter(i => i.type === 'THREAT'),
    };

    // Stratejileri kategorize et
    const categorizedStrategies = {
      SO: study.strategies.filter(s => s.type === 'SO'),
      WO: study.strategies.filter(s => s.type === 'WO'),
      ST: study.strategies.filter(s => s.type === 'ST'),
      WT: study.strategies.filter(s => s.type === 'WT'),
    };

    return NextResponse.json({
      ...study,
      categorizedItems,
      categorizedStrategies,
    });
  } catch (error) {
    console.error('SWOT study fetch error:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// SWOT çalışması güncelle
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description, status, departmentId, analysisDate } = body;

    const study = await prisma.sWOTStudy.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(status && { status }),
        ...(departmentId !== undefined && { departmentId: departmentId || null }),
        ...(analysisDate && { analysisDate: new Date(analysisDate) }),
      },
      include: {
        period: { select: { id: true, code: true, name: true } },
        department: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
      },
    });

    return NextResponse.json(study);
  } catch (error) {
    console.error('SWOT study update error:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// SWOT çalışması sil
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await params;

    await prisma.sWOTStudy.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('SWOT study delete error:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
