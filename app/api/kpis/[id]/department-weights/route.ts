import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

// GET - KPI'nın departman ağırlıklarını getir
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const kpiId = params.id;

    const weights = await prisma.kPIDepartmentWeight.findMany({
      where: { kpiId, isActive: true },
      include: {
        department: {
          select: { id: true, name: true, code: true }
        }
      },
      orderBy: { weight: 'desc' }
    });

    // Toplam ağırlık hesapla
    const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);

    return NextResponse.json({
      weights,
      totalWeight,
      remainingWeight: 100 - totalWeight
    });
  } catch (error) {
    console.error('KPI departman ağırlıkları getirme hatası:', error);
    return NextResponse.json(
      { error: 'Ağırlıklar getirilemedi' },
      { status: 500 }
    );
  }
}

// POST - Yeni departman ağırlığı ekle
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const kpiId = params.id;
    const body = await request.json();
    const { departmentId, weight, targetValue, minValue, maxValue, scoreFactor, notes } = body;

    if (!departmentId || weight === undefined) {
      return NextResponse.json(
        { error: 'Departman ve ağırlık zorunludur' },
        { status: 400 }
      );
    }

    if (weight < 0 || weight > 100) {
      return NextResponse.json(
        { error: 'Ağırlık 0-100 arasında olmalıdır' },
        { status: 400 }
      );
    }

    // Mevcut toplam ağırlığı kontrol et
    const existingWeights = await prisma.kPIDepartmentWeight.findMany({
      where: { kpiId, isActive: true }
    });
    const currentTotal = existingWeights.reduce((sum, w) => sum + w.weight, 0);

    if (currentTotal + weight > 100) {
      return NextResponse.json(
        { error: `Toplam ağırlık 100'ü geçemez. Mevcut: ${currentTotal}%, Kalan: ${100 - currentTotal}%` },
        { status: 400 }
      );
    }

    const departmentWeight = await prisma.kPIDepartmentWeight.create({
      data: {
        kpiId,
        departmentId,
        weight,
        targetValue: targetValue || null,
        minValue: minValue || null,
        maxValue: maxValue || null,
        scoreFactor: scoreFactor || 1.0,
        notes: notes || null
      },
      include: {
        department: {
          select: { id: true, name: true, code: true }
        }
      }
    });

    return NextResponse.json(departmentWeight, { status: 201 });
  } catch (error: any) {
    console.error('KPI departman ağırlığı ekleme hatası:', error);
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Bu departman için zaten ağırlık tanımlı' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Ağırlık eklenemedi' },
      { status: 500 }
    );
  }
}

// PUT - Ağırlık güncelle
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const kpiId = params.id;
    const body = await request.json();
    const { weightId, weight, targetValue, minValue, maxValue, scoreFactor, notes } = body;

    if (!weightId) {
      return NextResponse.json(
        { error: 'Ağırlık ID zorunludur' },
        { status: 400 }
      );
    }

    // Eğer weight değiştiyse, toplamı kontrol et
    if (weight !== undefined) {
      const existingWeight = await prisma.kPIDepartmentWeight.findUnique({
        where: { id: weightId }
      });

      if (!existingWeight) {
        return NextResponse.json(
          { error: 'Ağırlık kaydı bulunamadı' },
          { status: 404 }
        );
      }

      const otherWeights = await prisma.kPIDepartmentWeight.findMany({
        where: { kpiId, isActive: true, id: { not: weightId } }
      });
      const otherTotal = otherWeights.reduce((sum, w) => sum + w.weight, 0);

      if (otherTotal + weight > 100) {
        return NextResponse.json(
          { error: `Toplam ağırlık 100'ü geçemez. Diğer departmanlar: ${otherTotal}%` },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.kPIDepartmentWeight.update({
      where: { id: weightId },
      data: {
        weight: weight !== undefined ? weight : undefined,
        targetValue: targetValue !== undefined ? targetValue : undefined,
        minValue: minValue !== undefined ? minValue : undefined,
        maxValue: maxValue !== undefined ? maxValue : undefined,
        scoreFactor: scoreFactor !== undefined ? scoreFactor : undefined,
        notes: notes !== undefined ? notes : undefined
      },
      include: {
        department: {
          select: { id: true, name: true, code: true }
        }
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('KPI departman ağırlığı güncelleme hatası:', error);
    return NextResponse.json(
      { error: 'Ağırlık güncellenemedi' },
      { status: 500 }
    );
  }
}

// DELETE - Ağırlık sil
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const weightId = searchParams.get('weightId');

    if (!weightId) {
      return NextResponse.json(
        { error: 'Silinecek ağırlık ID\'si zorunludur' },
        { status: 400 }
      );
    }

    await prisma.kPIDepartmentWeight.delete({
      where: { id: weightId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('KPI departman ağırlığı silme hatası:', error);
    return NextResponse.json(
      { error: 'Ağırlık silinemedi' },
      { status: 500 }
    );
  }
}
