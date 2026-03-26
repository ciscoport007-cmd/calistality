import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export const dynamic = 'force-dynamic';

// Değerlendirmeleri listele
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const assessments = await prisma.oHSRiskAssessment.findMany({
      where: { riskId: params.id },
      include: {
        createdBy: { select: { id: true, name: true, surname: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(assessments);
  } catch (error) {
    console.error('OHS assessments fetch error:', error);
    return NextResponse.json(
      { error: 'Değerlendirmeler alınamadı' },
      { status: 500 }
    );
  }
}

// Yeni değerlendirme ekle
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const body = await request.json();
    const {
      assessmentType,
      likelihood,
      impact,
      controlEffectiveness,
      findings,
      recommendations,
    } = body;

    if (!assessmentType || !likelihood || !impact) {
      return NextResponse.json(
        { error: 'Zorunlu alanlar eksik' },
        { status: 400 }
      );
    }

    // Önceki değerlendirmeyi al
    const previousAssessment = await prisma.oHSRiskAssessment.findFirst({
      where: { riskId: params.id },
      orderBy: { createdAt: 'desc' },
    });

    // Risk'i al
    const risk = await prisma.oHSRisk.findUnique({
      where: { id: params.id },
    });

    if (!risk) {
      return NextResponse.json(
        { error: 'Risk bulunamadı' },
        { status: 404 }
      );
    }

    const riskScore = likelihood * impact;
    const previousScore = previousAssessment?.riskScore ?? risk.riskScore;

    // Trend hesapla
    let trend = 'AYNI_KALDI';
    if (riskScore < previousScore) trend = 'AZALDI';
    else if (riskScore > previousScore) trend = 'ARTTI';

    const assessment = await prisma.oHSRiskAssessment.create({
      data: {
        riskId: params.id,
        assessmentType,
        likelihood,
        impact,
        riskScore,
        controlEffectiveness,
        findings,
        recommendations,
        trend,
        previousScore,
        createdById: session.user.id,
      },
      include: {
        createdBy: { select: { id: true, name: true, surname: true } },
      },
    });

    // Risk'i güncelle
    let riskLevel = 'DUSUK';
    if (riskScore >= 20) riskLevel = 'KRITIK';
    else if (riskScore >= 15) riskLevel = 'COK_YUKSEK';
    else if (riskScore >= 10) riskLevel = 'YUKSEK';
    else if (riskScore >= 5) riskLevel = 'ORTA';

    await prisma.oHSRisk.update({
      where: { id: params.id },
      data: {
        likelihood,
        impact,
        riskScore,
        riskLevel,
        status: 'DEGERLENDIRMEDE',
      },
    });

    return NextResponse.json(assessment, { status: 201 });
  } catch (error) {
    console.error('OHS assessment create error:', error);
    return NextResponse.json(
      { error: 'Değerlendirme oluşturulamadı' },
      { status: 500 }
    );
  }
}
