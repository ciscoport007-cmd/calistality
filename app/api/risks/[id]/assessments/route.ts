import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

// Değerlendirme listesi
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

    const assessments = await prisma.riskAssessment.findMany({
      where: { riskId: id },
      orderBy: { assessmentDate: 'desc' },
      include: {
        assessedBy: { select: { id: true, name: true, surname: true } },
      },
    });

    return NextResponse.json(assessments);
  } catch (error) {
    console.error('Değerlendirme listesi hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// Yeni değerlendirme oluştur
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
      assessmentType,
      probability,
      probabilityJustification,
      impact,
      impactJustification,
      financialImpact,
      operationalImpact,
      reputationalImpact,
      legalImpact,
      safetyImpact,
      controlsAssessment,
      controlsEffectiveness,
      findings,
      recommendations,
    } = body;

    if (!probability || !impact) {
      return NextResponse.json(
        { error: 'Olasılık ve etki değerleri zorunludur' },
        { status: 400 }
      );
    }

    const riskScore = probability * impact;
    const riskLevel = calculateRiskLevel(riskScore);

    const assessment = await prisma.riskAssessment.create({
      data: {
        riskId: id,
        assessmentType: assessmentType || 'PERIYODIK',
        probability: parseInt(probability),
        probabilityJustification,
        impact: parseInt(impact),
        impactJustification,
        riskScore,
        riskLevel,
        financialImpact: financialImpact ? parseInt(financialImpact) : null,
        operationalImpact: operationalImpact ? parseInt(operationalImpact) : null,
        reputationalImpact: reputationalImpact ? parseInt(reputationalImpact) : null,
        legalImpact: legalImpact ? parseInt(legalImpact) : null,
        safetyImpact: safetyImpact ? parseInt(safetyImpact) : null,
        controlsAssessment,
        controlsEffectiveness,
        findings,
        recommendations,
        assessedById: session.user.id,
      },
      include: {
        assessedBy: { select: { id: true, name: true, surname: true } },
      },
    });

    // Risk'in güncel değerlerini güncelle
    await prisma.risk.update({
      where: { id },
      data: {
        residualProbability: parseInt(probability),
        residualImpact: parseInt(impact),
        residualRiskScore: riskScore,
        currentLevel: riskLevel,
        status: risk.status === 'TANIMLANDI' ? 'ANALIZ_EDILIYOR' : risk.status,
      },
    });

    // Geçmiş kaydı
    await prisma.riskHistory.create({
      data: {
        riskId: id,
        userId: session.user.id,
        action: 'DEGERLENDIRME_YAPILDI',
        newValue: JSON.stringify({ score: riskScore, level: riskLevel }),
        comments: `Risk değerlendirmesi yapıldı. Skor: ${riskScore}, Seviye: ${riskLevel}`,
      },
    });

    return NextResponse.json(assessment, { status: 201 });
  } catch (error) {
    console.error('Değerlendirme oluşturma hatası:', error);
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
