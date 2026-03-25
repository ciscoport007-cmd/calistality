import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth-options';

// GET - Hedefe bağlı riskleri listele
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

    const goalRisks = await prisma.goalRisk.findMany({
      where: { goalId: id },
      include: {
        risk: {
          include: {
            category: true,
            department: true,
          },
        },
      },
    });

    return NextResponse.json(goalRisks);
  } catch (error) {
    console.error('Error fetching goal risks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Hedefe risk bağla
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
    const { riskId } = body;

    // Kontrol et - aynı ilişki var mı?
    const existing = await prisma.goalRisk.findUnique({
      where: { goalId_riskId: { goalId, riskId } },
    });

    if (existing) {
      return NextResponse.json({ error: 'Risk already linked to this goal' }, { status: 400 });
    }

    const goalRisk = await prisma.goalRisk.create({
      data: {
        goalId,
        riskId,
      },
      include: {
        risk: true,
      },
    });

    return NextResponse.json(goalRisk, { status: 201 });
  } catch (error) {
    console.error('Error linking risk to goal:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Hedeften risk bağlantısını kaldır
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
    const riskId = searchParams.get('riskId');

    if (!riskId) {
      return NextResponse.json({ error: 'Risk ID is required' }, { status: 400 });
    }

    await prisma.goalRisk.delete({
      where: { goalId_riskId: { goalId, riskId } },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error unlinking risk from goal:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
