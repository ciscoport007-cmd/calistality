import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth-options';

// GET - Alt hedefe bağlı KPI'ları listele
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

    const subGoalKpis = await prisma.subGoalKPI.findMany({
      where: { subGoalId: id },
      include: {
        kpi: {
          include: {
            measurements: {
              orderBy: { measurementDate: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    return NextResponse.json(subGoalKpis);
  } catch (error) {
    console.error('SubGoal KPIs fetch error:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// POST - Alt hedefe KPI bağla
export async function POST(
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
    const { kpiId, weight } = body;

    if (!kpiId) {
      return NextResponse.json({ error: 'KPI ID gerekli' }, { status: 400 });
    }

    // Alt hedefin var olduğunu kontrol et
    const subGoal = await prisma.strategicSubGoal.findUnique({
      where: { id },
    });

    if (!subGoal) {
      return NextResponse.json({ error: 'Alt hedef bulunamadı' }, { status: 404 });
    }

    // Aynı KPI zaten bağlı mı kontrol et
    const existingLink = await prisma.subGoalKPI.findFirst({
      where: { subGoalId: id, kpiId },
    });

    if (existingLink) {
      return NextResponse.json({ error: 'Bu KPI zaten alt hedefe bağlı' }, { status: 400 });
    }

    const subGoalKpi = await prisma.subGoalKPI.create({
      data: {
        subGoalId: id,
        kpiId,
        weight: weight || 1.0,
      },
      include: {
        kpi: true,
      },
    });

    return NextResponse.json(subGoalKpi, { status: 201 });
  } catch (error) {
    console.error('SubGoal KPI link error:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// DELETE - Alt hedeften KPI bağlantısını kaldır
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
    const { searchParams } = new URL(request.url);
    const kpiId = searchParams.get('kpiId');

    if (!kpiId) {
      return NextResponse.json({ error: 'KPI ID gerekli' }, { status: 400 });
    }

    await prisma.subGoalKPI.deleteMany({
      where: {
        subGoalId: id,
        kpiId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('SubGoal KPI unlink error:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
