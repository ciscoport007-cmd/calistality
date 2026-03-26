import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth-options';

export const dynamic = 'force-dynamic';

// GET - Alt hedefe bağlı riskleri listele
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

    const subGoalRisks = await prisma.subGoalRisk.findMany({
      where: { subGoalId: id },
      include: {
        risk: {
          include: {
            category: true,
            department: true,
          },
        },
      },
    });

    return NextResponse.json(subGoalRisks);
  } catch (error) {
    console.error('Error fetching sub-goal risks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Alt hedefe risk bağla
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: subGoalId } = await params;
    const body = await request.json();
    const { riskId } = body;

    // Kontrol et - aynı ilişki var mı?
    const existing = await prisma.subGoalRisk.findUnique({
      where: { subGoalId_riskId: { subGoalId, riskId } },
    });

    if (existing) {
      return NextResponse.json({ error: 'Bu risk zaten alt hedefe bağlı' }, { status: 400 });
    }

    const subGoalRisk = await prisma.subGoalRisk.create({
      data: {
        subGoalId,
        riskId,
      },
      include: {
        risk: true,
      },
    });

    return NextResponse.json(subGoalRisk, { status: 201 });
  } catch (error) {
    console.error('Error linking risk to sub-goal:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Alt hedeften risk bağlantısını kaldır
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: subGoalId } = await params;
    const { searchParams } = new URL(request.url);
    const riskId = searchParams.get('riskId');

    if (!riskId) {
      return NextResponse.json({ error: 'Risk ID gerekli' }, { status: 400 });
    }

    await prisma.subGoalRisk.delete({
      where: { subGoalId_riskId: { subGoalId, riskId } },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error unlinking risk from sub-goal:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
