import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// PESTEL çalışması detayı
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

    const study = await prisma.pESTELStudy.findUnique({
      where: { id },
      include: {
        period: { select: { id: true, code: true, name: true } },
        department: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
        factors: {
          orderBy: [{ category: 'asc' }, { priority: 'asc' }],
          include: {
            responsible: { select: { id: true, name: true, surname: true } },
            linkedGoals: {
              include: {
                goal: { select: { id: true, code: true, name: true } },
              },
            },
            linkedRisks: {
              include: {
                risk: { select: { id: true, code: true, title: true } },
              },
            },
          },
        },
      },
    });

    if (!study) {
      return NextResponse.json({ error: 'Çalışma bulunamadı' }, { status: 404 });
    }

    // Faktörleri kategorize et
    const categorizedFactors = {
      POLITICAL: study.factors.filter(f => f.category === 'POLITICAL'),
      ECONOMIC: study.factors.filter(f => f.category === 'ECONOMIC'),
      SOCIAL: study.factors.filter(f => f.category === 'SOCIAL'),
      TECHNOLOGICAL: study.factors.filter(f => f.category === 'TECHNOLOGICAL'),
      ENVIRONMENTAL: study.factors.filter(f => f.category === 'ENVIRONMENTAL'),
      LEGAL: study.factors.filter(f => f.category === 'LEGAL'),
    };

    // İstatistikler
    const factorStats = {
      total: study.factors.length,
      opportunities: study.factors.filter(f => f.impactType === 'FIRSAT').length,
      threats: study.factors.filter(f => f.impactType === 'TEHDIT').length,
      neutral: study.factors.filter(f => f.impactType === 'NOTR').length,
      actionRequired: study.factors.filter(f => f.actionRequired).length,
    };

    return NextResponse.json({
      ...study,
      categorizedFactors,
      factorStats,
    });
  } catch (error) {
    console.error('PESTEL study fetch error:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// PESTEL çalışması güncelle
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

    const study = await prisma.pESTELStudy.update({
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
    console.error('PESTEL study update error:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// PESTEL çalışması sil
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

    await prisma.pESTELStudy.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PESTEL study delete error:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
