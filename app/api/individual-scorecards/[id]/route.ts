import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const scorecard = await prisma.individualScorecard.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            id: true, name: true, email: true, surname: true,
            department: true, position: true,
          },
        },
        formula: {
          include: {
            scale: { include: { levels: { orderBy: { sortOrder: 'asc' } } } },
          },
        },
        createdBy: { select: { id: true, name: true, email: true } },
        submittedBy: { select: { id: true, name: true, email: true } },
        approvedBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!scorecard) {
      return NextResponse.json({ error: 'Karne bulunamadı' }, { status: 404 });
    }

    return NextResponse.json(scorecard);
  } catch (error) {
    console.error('Error fetching individual scorecard:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { formulaId, notes, status } = body;

    const updated = await prisma.individualScorecard.update({
      where: { id: params.id },
      data: {
        ...(formulaId !== undefined && { formulaId: formulaId || null }),
        ...(notes !== undefined && { notes }),
        ...(status && { status }),
      },
      include: {
        user: { select: { id: true, name: true, email: true, department: true, position: true } },
        formula: { include: { scale: { include: { levels: true } } } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating individual scorecard:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// 3 Boyutlu Performans Hesaplama
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action } = await request.json();

    if (action === 'calculate') {
      return await calculateScorecard(params.id, session.user.id);
    } else if (action === 'submit') {
      return await submitScorecard(params.id, session.user.id);
    } else if (action === 'approve') {
      return await approveScorecard(params.id, session.user.id);
    } else if (action === 'reject') {
      const { reason } = await request.json();
      return await rejectScorecard(params.id, session.user.id, reason);
    }

    return NextResponse.json({ error: 'Geçersiz işlem' }, { status: 400 });
  } catch (error) {
    console.error('Error processing scorecard action:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Karne Hesaplama
async function calculateScorecard(scorecardId: string, userId: string) {
  const scorecard = await prisma.individualScorecard.findUnique({
    where: { id: scorecardId },
    include: {
      user: { select: { id: true, departmentId: true } },
      formula: {
        include: {
          scale: { include: { levels: { orderBy: { minPerformance: 'desc' } } } },
        },
      },
    },
  });

  if (!scorecard) {
    return NextResponse.json({ error: 'Karne bulunamadı' }, { status: 404 });
  }

  // Onaylanmış karneler hesaplanamaz
  if (scorecard.status === 'ONAYLANDI') {
    return NextResponse.json({ error: 'Onaylanmış karne tekrar hesaplanamaz' }, { status: 400 });
  }

  // BEKLEMEDE durumundaki karneler hesaplanamaz
  if (scorecard.status === 'BEKLEMEDE') {
    return NextResponse.json({ error: 'Onay bekleyen karne hesaplanamaz' }, { status: 400 });
  }

  const formula = scorecard.formula || await prisma.scorecardFormula.findFirst({
    where: { isDefault: true, isActive: true },
    include: { scale: { include: { levels: { orderBy: { minPerformance: 'desc' } } } } },
  });

  if (!formula) {
    return NextResponse.json({ error: 'Formül bulunamadı' }, { status: 400 });
  }

  // 1. KPI Puanı Hesapla
  const personnelKPIs = await prisma.personnelKPI.findMany({
    where: {
      userId: scorecard.userId,
      year: scorecard.year,
      status: 'AKTIF',
    },
    include: { kpi: true },
  });

  let kpiScore = 0;
  let totalKpiWeight = 0;
  const kpiDetails: any[] = [];

  for (const pk of personnelKPIs) {
    if (pk.score !== null && pk.weight) {
      kpiScore += pk.score * pk.weight;
      totalKpiWeight += pk.weight;
      kpiDetails.push({
        kpiId: pk.kpiId,
        kpiName: pk.kpi.name,
        weight: pk.weight,
        performance: pk.performance,
        score: pk.score,
      });
    }
  }
  kpiScore = totalKpiWeight > 0 ? kpiScore / totalKpiWeight : 0;

  // 2. Yetkinlik Puanı Hesapla
  const competencyEvals = await prisma.personnelCompetencyEvaluation.findMany({
    where: {
      userId: scorecard.userId,
      year: scorecard.year,
      status: 'ONAYLANDI',
    },
    include: { competency: true },
  });

  let competencyScore = 0;
  let totalCompWeight = 0;
  const competencyDetails: any[] = [];

  for (const ce of competencyEvals) {
    if (ce.score !== null && ce.weight) {
      competencyScore += ce.score * ce.weight;
      totalCompWeight += ce.weight;
      competencyDetails.push({
        competencyId: ce.competencyId,
        competencyName: ce.competency.name,
        weight: ce.weight,
        currentLevel: ce.currentLevel,
        targetLevel: ce.targetLevel,
        performance: ce.performance,
        score: ce.score,
      });
    }
  }
  competencyScore = totalCompWeight > 0 ? competencyScore / totalCompWeight : 0;

  // 3. İnisiyatif Puanı Hesapla
  const initiatives = await prisma.personnelInitiative.findMany({
    where: {
      userId: scorecard.userId,
      status: 'TAMAMLANDI',
      initiative: {
        startDate: { gte: new Date(scorecard.year, 0, 1) },
        endDate: { lte: new Date(scorecard.year, 11, 31) },
      },
    },
    include: { initiative: true },
  });

  let initiativeScore = 0;
  let totalInitWeight = 0;
  const initiativeDetails: any[] = [];

  for (const pi of initiatives) {
    if (pi.score !== null && pi.weight) {
      initiativeScore += pi.score * pi.weight;
      totalInitWeight += pi.weight;
      initiativeDetails.push({
        initiativeId: pi.initiativeId,
        initiativeName: pi.initiative.name,
        weight: pi.weight,
        score: pi.score,
        performance: pi.performance,
      });
    }
  }
  initiativeScore = totalInitWeight > 0 ? initiativeScore / totalInitWeight : 0;

  // 4. 3 Boyutlu Birleşik Puan
  const dimensionScore = (
    (kpiScore * formula.kpiWeight) +
    (competencyScore * formula.competencyWeight) +
    (initiativeScore * formula.initiativeWeight)
  ) / 100;

  // 5. Kurum Karne Puanı (Organizasyonun genel performansı)
  // Bu değer dışarıdan alınmalı veya hesaplanmalı
  // Şimdilik sabit bir değer kullanacağız
  const corporateScore = 75; // Placeholder

  // 6. Departman Karne Puanı
  let departmentScore = 70; // Placeholder
  if (scorecard.user?.departmentId) {
    // Departmanın ortalama performansını hesapla
    const deptScorecards = await prisma.individualScorecard.findMany({
      where: {
        year: scorecard.year,
        user: { departmentId: scorecard.user.departmentId },
        status: 'ONAYLANDI',
      },
      select: { totalScore: true },
    });

    if (deptScorecards.length > 0) {
      const avgScore = deptScorecards.reduce((sum: number, s: any) => sum + (s.totalScore || 0), 0) / deptScorecards.length;
      departmentScore = avgScore || 70;
    }
  }

  // 7. Nihai Toplam Puan
  // Formül: (Kurum * corporateWeight + Departman * departmentWeight) / 100 ile dimensionScore'un birleşimi
  // Butterfly mantığı: dimensionScore zaten hesaplanmış. Şimdi kurum/departman ağırlığı uygula
  const organizationalScore = (
    (corporateScore * formula.corporateWeight) +
    (departmentScore * formula.departmentWeight)
  ) / 100;

  // Nihai puan: organizasyonel etki + bireysel boyutlar
  // Butterfly'da genellikle: Bireysel Puan * (1 + Org Etki Faktörü)
  // Basitleştirilmiş: (dimensionScore + organizationalScore) / 2 veya ağırlıklı
  const totalScore = (dimensionScore * 0.7) + (organizationalScore * 0.3);

  // 8. Puan Skalasından Seviye Belirle
  let scoreLevel = 'Belirsiz';
  if (formula.scale?.levels) {
    for (const level of formula.scale.levels) {
      if (totalScore >= level.minPerformance && totalScore <= level.maxPerformance) {
        scoreLevel = level.name;
        break;
      }
    }
  }

  // Güncelle
  const updated = await prisma.individualScorecard.update({
    where: { id: scorecardId },
    data: {
      kpiScore,
      kpiDetails,
      competencyScore,
      competencyDetails,
      initiativeScore,
      initiativeDetails,
      corporateScore,
      departmentScore,
      dimensionScore,
      totalScore,
      scoreLevel,
      status: 'HESAPLANDI',
    },
    include: {
      user: { select: { id: true, name: true, email: true, department: true, position: true } },
      formula: { include: { scale: { include: { levels: true } } } },
    },
  });

  return NextResponse.json(updated);
}

// Onaya Gönder
async function submitScorecard(scorecardId: string, userId: string) {
  const updated = await prisma.individualScorecard.update({
    where: { id: scorecardId },
    data: {
      status: 'BEKLEMEDE',
      submittedAt: new Date(),
      submittedById: userId,
    },
  });
  return NextResponse.json(updated);
}

// Onayla
async function approveScorecard(scorecardId: string, userId: string) {
  const updated = await prisma.individualScorecard.update({
    where: { id: scorecardId },
    data: {
      status: 'ONAYLANDI',
      approvedAt: new Date(),
      approvedById: userId,
    },
  });
  return NextResponse.json(updated);
}

// Reddet
async function rejectScorecard(scorecardId: string, userId: string, reason?: string) {
  const updated = await prisma.individualScorecard.update({
    where: { id: scorecardId },
    data: {
      status: 'REDDEDILDI',
      rejectionReason: reason,
      approvedById: userId,
      approvedAt: new Date(),
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const scorecard = await prisma.individualScorecard.findUnique({
      where: { id: params.id },
      select: { status: true },
    });

    if (scorecard?.status === 'ONAYLANDI') {
      return NextResponse.json({ error: 'Onaylı karne silinemez' }, { status: 400 });
    }

    await prisma.individualScorecard.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Karne silindi' });
  } catch (error) {
    console.error('Error deleting individual scorecard:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
