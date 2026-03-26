import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { createNotification, NotificationTemplates } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

// Risk detayı
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

    const risk = await prisma.risk.findUnique({
      where: { id },
      include: {
        category: true,
        department: true,
        owner: { select: { id: true, name: true, surname: true, email: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
        assessments: {
          orderBy: { assessmentDate: 'desc' },
          include: {
            assessedBy: { select: { id: true, name: true, surname: true } },
          },
        },
        actions: {
          orderBy: { createdAt: 'desc' },
          include: {
            assignee: { select: { id: true, name: true, surname: true } },
            createdBy: { select: { id: true, name: true, surname: true } },
          },
        },
        history: {
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, name: true, surname: true } },
          },
        },
      },
    });

    if (!risk) {
      return NextResponse.json({ error: 'Risk bulunamadı' }, { status: 404 });
    }

    return NextResponse.json(risk);
  } catch (error) {
    console.error('Risk detay hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// Risk güncelleme
export async function PUT(
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

    const existingRisk = await prisma.risk.findUnique({ where: { id } });
    if (!existingRisk) {
      return NextResponse.json({ error: 'Risk bulunamadı' }, { status: 404 });
    }

    const {
      title,
      description,
      type,
      source,
      status,
      categoryId,
      departmentId,
      ownerId,
      existingControls,
      controlEffectiveness,
      responseStrategy,
      inherentProbability,
      inherentImpact,
      residualProbability,
      residualImpact,
      reviewDate,
      tags,
      notes,
    } = body;

    // Risk skorlarını hesapla
    let inherentRiskScore = existingRisk.inherentRiskScore;
    let residualRiskScore = existingRisk.residualRiskScore;
    let currentLevel = existingRisk.currentLevel;

    if (inherentProbability && inherentImpact) {
      inherentRiskScore = inherentProbability * inherentImpact;
    }

    if (residualProbability && residualImpact) {
      residualRiskScore = residualProbability * residualImpact;
      currentLevel = calculateRiskLevel(residualRiskScore);
    } else if (inherentRiskScore) {
      currentLevel = calculateRiskLevel(inherentRiskScore);
    }

    const risk = await prisma.risk.update({
      where: { id },
      data: {
        title,
        description,
        type,
        source,
        status,
        categoryId: categoryId || null,
        departmentId: departmentId || null,
        ownerId: ownerId || null,
        existingControls,
        controlEffectiveness,
        responseStrategy,
        inherentProbability: inherentProbability ? parseInt(inherentProbability) : existingRisk.inherentProbability,
        inherentImpact: inherentImpact ? parseInt(inherentImpact) : existingRisk.inherentImpact,
        inherentRiskScore,
        residualProbability: residualProbability ? parseInt(residualProbability) : existingRisk.residualProbability,
        residualImpact: residualImpact ? parseInt(residualImpact) : existingRisk.residualImpact,
        residualRiskScore,
        currentLevel,
        reviewDate: reviewDate ? new Date(reviewDate) : existingRisk.reviewDate,
        tags,
        notes,
        closedAt: status === 'KAPATILDI' ? new Date() : existingRisk.closedAt,
      },
      include: {
        category: true,
        department: true,
        owner: { select: { id: true, name: true, surname: true, email: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
      },
    });

    // Değişiklikleri kaydet
    const changes: string[] = [];
    if (existingRisk.status !== status) changes.push(`Durum: ${existingRisk.status} -> ${status}`);
    if (existingRisk.currentLevel !== currentLevel) changes.push(`Seviye: ${existingRisk.currentLevel} -> ${currentLevel}`);

    if (changes.length > 0) {
      await prisma.riskHistory.create({
        data: {
          riskId: risk.id,
          userId: session.user.id,
          action: existingRisk.status !== status ? 'DURUM_DEGISTI' : 'GUNCELLENDI',
          oldValue: JSON.stringify({ status: existingRisk.status, level: existingRisk.currentLevel }),
          newValue: JSON.stringify({ status: risk.status, level: risk.currentLevel }),
          comments: changes.join(', '),
        },
      });
    }

    // Sahip değişti ise bildirim gönder
    if (ownerId && ownerId !== existingRisk.ownerId && ownerId !== session.user.id) {
      await createNotification({
        userId: ownerId,
        title: 'Risk Sorumluluğu Atandı',
        message: `${existingRisk.code} kodlu "${existingRisk.title}" riski için sorumluluk size atandı.`,
        type: 'BILGI',
        link: `/dashboard/risks/${id}`,
      });
    }

    // Risk seviyesi değişti ise oluşturan kişiye bildirim
    if (existingRisk.currentLevel !== currentLevel && existingRisk.createdById !== session.user.id) {
      const template = NotificationTemplates.riskLevelChanged(existingRisk.code, currentLevel || '');
      await createNotification({
        userId: existingRisk.createdById,
        title: template.title,
        message: `${existingRisk.code} kodlu riskin seviyesi "${existingRisk.currentLevel}" → "${currentLevel}" olarak değişti.`,
        type: template.type,
        link: `/dashboard/risks/${id}`,
      });
    }

    return NextResponse.json(risk);
  } catch (error) {
    console.error('Risk güncelleme hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// Risk silme (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await params;

    const existingRisk = await prisma.risk.findUnique({ where: { id } });
    if (!existingRisk) {
      return NextResponse.json({ error: 'Risk bulunamadı' }, { status: 404 });
    }

    await prisma.risk.update({
      where: { id },
      data: { isDeleted: true },
    });

    await prisma.riskHistory.create({
      data: {
        riskId: id,
        userId: session.user.id,
        action: 'SILINDI',
        comments: 'Risk kaydı silindi',
      },
    });

    return NextResponse.json({ message: 'Risk silindi' });
  } catch (error) {
    console.error('Risk silme hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

function calculateRiskLevel(score: number): string {
  if (score <= 4) return 'DUSUK';
  if (score <= 9) return 'ORTA';
  if (score <= 14) return 'YUKSEK';
  if (score <= 19) return 'COK_YUKSEK';
  return 'KRITIK';
}
