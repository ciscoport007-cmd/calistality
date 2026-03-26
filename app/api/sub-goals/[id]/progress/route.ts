import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET - Alt hedef ilerleme geçmişi
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

    const subGoal = await prisma.strategicSubGoal.findUnique({
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

    if (!subGoal) {
      return NextResponse.json({ error: 'Alt hedef bulunamadı' }, { status: 404 });
    }

    return NextResponse.json({
      subGoal: {
        id: subGoal.id,
        name: subGoal.name,
        code: subGoal.code,
        targetValue: subGoal.targetValue,
        currentValue: subGoal.currentValue,
        unit: subGoal.unit,
        progress: subGoal.progress,
      },
      entries: subGoal.progressEntries,
    });
  } catch (error) {
    console.error('SubGoal progress fetch error:', error);
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

    // Mevcut alt hedefi al
    const subGoal = await prisma.strategicSubGoal.findUnique({
      where: { id },
    });

    if (!subGoal) {
      return NextResponse.json({ error: 'Alt hedef bulunamadı' }, { status: 404 });
    }

    const previousValue = subGoal.currentValue || 0;
    const isPercentageUnit = subGoal.unit === '%' || subGoal.unit === 'yüzde' || subGoal.unit === 'Yüzde' || subGoal.unit === 'oran';
    
    let newCurrentValue: number;
    if (isPercentageUnit) {
      // Yüzde birimi için: tüm girişlerin ortalamasını al
      const existingEntries = await prisma.goalProgressEntry.findMany({
        where: { subGoalId: id },
        select: { value: true },
      });
      const allValues = [...existingEntries.map((e: any) => e.value), parseFloat(value)];
      newCurrentValue = allValues.reduce((sum, v) => sum + v, 0) / allValues.length;
    } else {
      // Diğer birimler için: toplayarak ilerle
      newCurrentValue = previousValue + parseFloat(value);
    }
    
    // İlerleme yüzdesini hesapla
    let newProgress = 0;
    if (subGoal.targetValue && subGoal.targetValue > 0) {
      newProgress = Math.min(100, Math.round((newCurrentValue / subGoal.targetValue) * 100));
    }

    // Transaction ile güncelle
    const result = await prisma.$transaction(async (tx) => {
      // İlerleme kaydı oluştur
      const entry = await tx.goalProgressEntry.create({
        data: {
          subGoalId: id,
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

      // Alt hedefi güncelle
      const updatedSubGoal = await tx.strategicSubGoal.update({
        where: { id },
        data: {
          currentValue: newCurrentValue,
          progress: newProgress,
        },
      });

      return { entry, subGoal: updatedSubGoal };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('SubGoal progress create error:', error);
    return NextResponse.json(
      { error: 'İlerleme kaydedilirken hata oluştu' },
      { status: 500 }
    );
  }
}

// PATCH - Alt hedef değerini güncelle
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
    const subGoal = await prisma.strategicSubGoal.findUnique({ where: { id } });
    if (!subGoal) {
      return NextResponse.json({ error: 'Alt hedef bulunamadı' }, { status: 404 });
    }

    const finalTargetValue = updateData.targetValue ?? subGoal.targetValue;
    const finalCurrentValue = updateData.currentValue ?? subGoal.currentValue ?? 0;
    
    if (finalTargetValue && finalTargetValue > 0) {
      updateData.progress = Math.min(100, Math.round((finalCurrentValue / finalTargetValue) * 100));
    }

    const updatedSubGoal = await prisma.strategicSubGoal.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updatedSubGoal);
  } catch (error) {
    console.error('SubGoal update error:', error);
    return NextResponse.json(
      { error: 'Alt hedef güncellenirken hata oluştu' },
      { status: 500 }
    );
  }
}
