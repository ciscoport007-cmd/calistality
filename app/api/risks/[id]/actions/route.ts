import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

// Aksiyon listesi
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await params;

    const actions = await prisma.riskAction.findMany({
      where: { riskId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        assignee: { select: { id: true, name: true, surname: true, email: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
      },
    });

    return NextResponse.json(actions);
  } catch (error) {
    console.error('Aksiyon listesi hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// Yeni aksiyon oluştur
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const risk = await prisma.risk.findUnique({ where: { id } });
    if (!risk) {
      return NextResponse.json({ error: 'Risk bulunamadı' }, { status: 404 });
    }

    const {
      title,
      description,
      actionType,
      priority,
      plannedStartDate,
      plannedEndDate,
      assigneeId,
      budgetPlanned,
      budgetType,
      currency,
      expectedGain,
      resources,
      expectedProbabilityReduction,
      expectedImpactReduction,
      // Eski alanlar uyumluluk için
      estimatedCost,
    } = body;

    if (!title || !actionType) {
      return NextResponse.json(
        { error: 'Başlık ve aksiyon tipi zorunludur' },
        { status: 400 }
      );
    }

    // Otomatik kod oluştur
    const lastAction = await prisma.riskAction.findFirst({
      orderBy: { code: 'desc' },
    });

    let nextNumber = 1;
    if (lastAction) {
      const lastNumber = parseInt(lastAction.code.split('-')[2]);
      nextNumber = lastNumber + 1;
    }
    const code = `RSK-AKS-${String(nextNumber).padStart(4, '0')}`;

    const action = await prisma.riskAction.create({
      data: {
        riskId: id,
        code,
        title,
        description,
        actionType,
        priority: priority || 'ORTA',
        plannedStartDate: plannedStartDate ? new Date(plannedStartDate) : null,
        plannedEndDate: plannedEndDate ? new Date(plannedEndDate) : null,
        assigneeId: assigneeId || null,
        budgetPlanned: budgetPlanned ? parseFloat(budgetPlanned) : null,
        budgetType: budgetType || null,
        currency: currency || 'TRY',
        expectedGain: expectedGain ? parseFloat(expectedGain) : null,
        resources,
        expectedProbabilityReduction: expectedProbabilityReduction ? parseInt(expectedProbabilityReduction) : null,
        expectedImpactReduction: expectedImpactReduction ? parseInt(expectedImpactReduction) : null,
        createdById: session.user.id,
        // Eski alanlar uyumluluk için
        estimatedCost: budgetPlanned ? parseFloat(budgetPlanned) : (estimatedCost ? parseFloat(estimatedCost) : null),
      },
      include: {
        assignee: { select: { id: true, name: true, surname: true, email: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
      },
    });

    // Risk durumunu güncelle
    if (risk.status === 'TANIMLANDI' || risk.status === 'ANALIZ_EDILIYOR' || risk.status === 'DEGERLENDIRME_BEKLENIYOR') {
      await prisma.risk.update({
        where: { id },
        data: { status: 'AKSIYONDA' },
      });
    }

    // Geçmiş kaydı
    await prisma.riskHistory.create({
      data: {
        riskId: id,
        userId: session.user.id,
        action: 'AKSIYON_EKLENDI',
        newValue: JSON.stringify({ code: action.code, title: action.title }),
        comments: `Yeni aksiyon eklendi: ${action.title}`,
      },
    });

    return NextResponse.json(action, { status: 201 });
  } catch (error) {
    console.error('Aksiyon oluşturma hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// Aksiyon güncelleme
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const actionId = searchParams.get('actionId');

    if (!actionId) {
      return NextResponse.json({ error: 'Aksiyon ID gerekli' }, { status: 400 });
    }

    const body = await request.json();
    const {
      title,
      description,
      actionType,
      status,
      priority,
      plannedStartDate,
      plannedEndDate,
      actualStartDate,
      actualEndDate,
      assigneeId,
      progress,
      estimatedCost,
      actualCost,
      resources,
      completionNotes,
      effectiveness,
      actualProbabilityReduction,
      actualImpactReduction,
    } = body;

    const existingAction = await prisma.riskAction.findUnique({ where: { id: actionId } });
    if (!existingAction) {
      return NextResponse.json({ error: 'Aksiyon bulunamadı' }, { status: 404 });
    }

    const action = await prisma.riskAction.update({
      where: { id: actionId },
      data: {
        title,
        description,
        actionType,
        status,
        priority,
        plannedStartDate: plannedStartDate ? new Date(plannedStartDate) : existingAction.plannedStartDate,
        plannedEndDate: plannedEndDate ? new Date(plannedEndDate) : existingAction.plannedEndDate,
        actualStartDate: actualStartDate ? new Date(actualStartDate) : existingAction.actualStartDate,
        actualEndDate: actualEndDate ? new Date(actualEndDate) : existingAction.actualEndDate,
        assigneeId: assigneeId || existingAction.assigneeId,
        progress: progress !== undefined ? parseInt(progress) : existingAction.progress,
        estimatedCost: estimatedCost ? parseFloat(estimatedCost) : existingAction.estimatedCost,
        actualCost: actualCost ? parseFloat(actualCost) : existingAction.actualCost,
        resources,
        completionNotes,
        effectiveness,
        actualProbabilityReduction: actualProbabilityReduction ? parseInt(actualProbabilityReduction) : existingAction.actualProbabilityReduction,
        actualImpactReduction: actualImpactReduction ? parseInt(actualImpactReduction) : existingAction.actualImpactReduction,
        closedAt: status === 'TAMAMLANDI' ? new Date() : (status && status !== 'TAMAMLANDI' ? null : existingAction.closedAt),
      },
      include: {
        assignee: { select: { id: true, name: true, surname: true, email: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
      },
    });

    // Aksiyon tamamlandıysa geçmiş kaydı oluştur
    if (existingAction.status !== 'TAMAMLANDI' && status === 'TAMAMLANDI') {
      await prisma.riskHistory.create({
        data: {
          riskId: params.id,
          userId: session.user.id,
          action: 'AKSIYON_TAMAMLANDI',
          newValue: JSON.stringify({ code: action.code, effectiveness }),
          comments: `Aksiyon tamamlandı: ${action.title}`,
        },
      });
    }

    return NextResponse.json(action);
  } catch (error) {
    console.error('Aksiyon güncelleme hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
