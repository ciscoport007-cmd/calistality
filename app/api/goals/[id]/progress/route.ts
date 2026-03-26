import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET - Hedef ilerleme geçmişi
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const goal = await prisma.strategicGoal.findUnique({
      where: { id },
      include: {
        progressEntries: {
          include: {
            createdBy: {
              select: { id: true, name: true, surname: true, email: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!goal) {
      return NextResponse.json({ error: 'Hedef bulunamadı' }, { status: 404 });
    }

    return NextResponse.json({
      goal: {
        id: goal.id,
        name: goal.name,
        code: goal.code,
        targetValue: goal.targetValue,
        currentValue: goal.currentValue,
        unit: goal.unit,
        progress: goal.progress,
      },
      entries: goal.progressEntries,
    });
  } catch (error) {
    console.error('Goal progress fetch error:', error);
    return NextResponse.json(
      { error: 'İlerleme bilgileri getirilirken hata oluştu' },
      { status: 500 }
    );
  }
}

// POST - Yeni ilerleme girişi ekle
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { value, note } = body;

    if (value === undefined || value === null) {
      return NextResponse.json(
        { error: 'Değer zorunludur' },
        { status: 400 }
      );
    }

    // Mevcut hedefi al
    const goal = await prisma.strategicGoal.findUnique({
      where: { id },
    });

    if (!goal) {
      return NextResponse.json({ error: 'Hedef bulunamadı' }, { status: 404 });
    }

    const previousValue = goal.currentValue || 0;
    const isPercentageUnit = goal.unit === '%' || goal.unit === 'yüzde' || goal.unit === 'Yüzde' || goal.unit === 'oran';
    
    let newCurrentValue: number;
    if (isPercentageUnit) {
      // Yüzde birimi için: tüm girişlerin ortalamasını al
      const existingEntries = await prisma.goalProgressEntry.findMany({
        where: { goalId: id },
        select: { value: true },
      });
      const allValues = [...existingEntries.map(e => e.value), parseFloat(value)];
      newCurrentValue = allValues.reduce((sum, v) => sum + v, 0) / allValues.length;
    } else {
      // Diğer birimler için: toplayarak ilerle
      newCurrentValue = previousValue + parseFloat(value);
    }
    
    // İlerleme yüzdesini hesapla
    let newProgress = 0;
    if (goal.targetValue && goal.targetValue > 0) {
      newProgress = Math.min(100, Math.round((newCurrentValue / goal.targetValue) * 100));
    }

    // Transaction ile güncelle
    const result = await prisma.$transaction(async (tx) => {
      // İlerleme kaydı oluştur
      const entry = await tx.goalProgressEntry.create({
        data: {
          goalId: id,
          value: parseFloat(value),
          previousValue,
          note,
          createdById: session.user.id,
        },
        include: {
          createdBy: {
            select: { id: true, name: true, surname: true, email: true },
          },
        },
      });

      // Hedefi güncelle
      const updatedGoal = await tx.strategicGoal.update({
        where: { id },
        data: {
          currentValue: newCurrentValue,
          progress: newProgress,
        },
      });

      return { entry, goal: updatedGoal };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Goal progress create error:', error);
    return NextResponse.json(
      { error: 'İlerleme kaydedilirken hata oluştu' },
      { status: 500 }
    );
  }
}

// PATCH - Hedef değerini güncelle
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { targetValue, currentValue, unit } = body;

    const updateData: any = {};
    if (targetValue !== undefined) updateData.targetValue = parseFloat(targetValue);
    if (currentValue !== undefined) updateData.currentValue = parseFloat(currentValue);
    if (unit !== undefined) updateData.unit = unit;

    // İlerleme yüzdesini hesapla
    const goal = await prisma.strategicGoal.findUnique({ where: { id } });
    if (!goal) {
      return NextResponse.json({ error: 'Hedef bulunamadı' }, { status: 404 });
    }

    const finalTargetValue = updateData.targetValue ?? goal.targetValue;
    const finalCurrentValue = updateData.currentValue ?? goal.currentValue ?? 0;
    
    if (finalTargetValue && finalTargetValue > 0) {
      updateData.progress = Math.min(100, Math.round((finalCurrentValue / finalTargetValue) * 100));
    }

    const updatedGoal = await prisma.strategicGoal.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updatedGoal);
  } catch (error) {
    console.error('Goal update error:', error);
    return NextResponse.json(
      { error: 'Hedef güncellenirken hata oluştu' },
      { status: 500 }
    );
  }
}
