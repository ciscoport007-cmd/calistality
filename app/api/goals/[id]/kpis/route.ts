import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth-options';

export const dynamic = 'force-dynamic';

// GET - Hedefe bağlı KPI'ları listele
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const goalKPIs = await prisma.goalKPI.findMany({
      where: { goalId: id },
      include: {
        kpi: {
          include: {
            category: true,
            department: true,
          },
        },
      },
    });

    return NextResponse.json(goalKPIs);
  } catch (error) {
    console.error('Error fetching goal KPIs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Hedefe KPI bağla
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: goalId } = await params;
    const body = await request.json();
    const { kpiId, weight } = body;

    // Kontrol et - aynı ilişki var mı?
    const existing = await prisma.goalKPI.findUnique({
      where: { goalId_kpiId: { goalId, kpiId } },
    });

    if (existing) {
      return NextResponse.json({ error: 'KPI already linked to this goal' }, { status: 400 });
    }

    const goalKPI = await prisma.goalKPI.create({
      data: {
        goalId,
        kpiId,
        weight: weight ? parseFloat(weight) : 1.0,
      },
      include: {
        kpi: true,
      },
    });

    return NextResponse.json(goalKPI, { status: 201 });
  } catch (error) {
    console.error('Error linking KPI to goal:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Hedeften KPI bağlantısını kaldır
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: goalId } = await params;
    const { searchParams } = new URL(request.url);
    const kpiId = searchParams.get('kpiId');

    if (!kpiId) {
      return NextResponse.json({ error: 'KPI ID is required' }, { status: 400 });
    }

    await prisma.goalKPI.delete({
      where: { goalId_kpiId: { goalId, kpiId } },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error unlinking KPI from goal:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
