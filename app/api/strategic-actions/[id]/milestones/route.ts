import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth-options';

// GET - Aksiyon kilometre taşlarını listele
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

    const milestones = await prisma.actionMilestone.findMany({
      where: { actionId: id },
      include: {
        completedBy: {
          select: { id: true, name: true, surname: true, email: true },
        },
        progressEntries: {
          include: {
            createdBy: { select: { id: true, name: true, surname: true } },
          },
          orderBy: { measurementDate: 'desc' },
        },
      },
      orderBy: { plannedDate: 'asc' },
    });

    // İstatistikler
    const stats = {
      total: milestones.length,
      completed: milestones.filter(m => m.status === 'TAMAMLANDI').length,
      inProgress: milestones.filter(m => m.status === 'DEVAM_EDIYOR').length,
      pending: milestones.filter(m => m.status === 'BEKLIYOR').length,
      delayed: milestones.filter(m => m.status === 'GECIKTI').length,
    };

    // Toplam ilerleme hesapla
    const totalWeight = milestones.reduce((sum, m) => sum + m.weight, 0);
    const completedWeight = milestones
      .filter(m => m.status === 'TAMAMLANDI')
      .reduce((sum, m) => sum + m.weight, 0);
    const progress = totalWeight > 0 ? (completedWeight / totalWeight) * 100 : 0;

    return NextResponse.json({ milestones, stats, progress });
  } catch (error) {
    console.error('Milestones fetch error:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// POST - Yeni kilometre taşı oluştur
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
    const { name, description, plannedDate, weight, deliverables, targetValue, unit } = body;

    if (!name || !plannedDate) {
      return NextResponse.json({ error: 'Gerekli alanlar eksik' }, { status: 400 });
    }

    // Aksiyonun var olduğunu kontrol et
    const action = await prisma.strategicAction.findUnique({
      where: { id },
    });

    if (!action) {
      return NextResponse.json({ error: 'Aksiyon bulunamadı' }, { status: 404 });
    }

    const milestone = await prisma.actionMilestone.create({
      data: {
        actionId: id,
        name,
        description,
        plannedDate: new Date(plannedDate),
        weight: weight || 1.0,
        deliverables,
        targetValue: targetValue !== undefined && targetValue !== '' ? parseFloat(targetValue) : null,
        unit: unit || null,
      },
      include: {
        completedBy: {
          select: { id: true, name: true, surname: true, email: true },
        },
      },
    });

    // Aksiyon tarihçesine ekle
    await prisma.strategicActionHistory.create({
      data: {
        actionId: id,
        userId: session.user.id,
        actionType: 'KILOMETRE_TASI_EKLENDI',
        newValue: name,
        comments: `"${name}" kilometre taşı eklendi`,
      },
    });

    return NextResponse.json(milestone, { status: 201 });
  } catch (error) {
    console.error('Milestone create error:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
