import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const evaluations = await prisma.supplierEvaluation.findMany({
      where: { supplierId: params.id },
      include: {
        evaluatedBy: { select: { id: true, name: true, surname: true } }
      },
      orderBy: { evaluationDate: 'desc' }
    });

    return NextResponse.json(evaluations);
  } catch (error) {
    console.error('Supplier evaluations fetch error:', error);
    return NextResponse.json(
      { error: 'Değerlendirmeler alınamadı' },
      { status: 500 }
    );
  }
}

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
      periodStart,
      periodEnd,
      qualityScore,
      deliveryScore,
      priceScore,
      serviceScore,
      communicationScore,
      qualityWeight = 30,
      deliveryWeight = 25,
      priceWeight = 20,
      serviceWeight = 15,
      communicationWeight = 10,
      totalOrders,
      onTimeDeliveries,
      qualityIssues,
      returns,
      strengths,
      weaknesses,
      improvements,
      comments,
      recommendation,
      actionRequired,
      actionDescription
    } = body;

    // Validate scores
    const scores = [qualityScore, deliveryScore, priceScore, serviceScore, communicationScore];
    if (scores.some(s => s < 0 || s > 100)) {
      return NextResponse.json(
        { error: 'Puanlar 0-100 arasında olmalıdır' },
        { status: 400 }
      );
    }

    // Calculate total score
    const totalScore = (
      (qualityScore * qualityWeight) +
      (deliveryScore * deliveryWeight) +
      (priceScore * priceWeight) +
      (serviceScore * serviceWeight) +
      (communicationScore * communicationWeight)
    ) / 100;

    // Determine rating
    let rating = 'D';
    if (totalScore >= 85) rating = 'A';
    else if (totalScore >= 70) rating = 'B';
    else if (totalScore >= 50) rating = 'C';

    // Generate code
    const lastEvaluation = await prisma.supplierEvaluation.findFirst({
      where: { code: { startsWith: 'TDK-DGR' } },
      orderBy: { code: 'desc' }
    });

    let nextNumber = 1;
    if (lastEvaluation) {
      const lastNumber = parseInt(lastEvaluation.code.split('-')[2]);
      nextNumber = lastNumber + 1;
    }
    const code = `TDK-DGR-${nextNumber.toString().padStart(4, '0')}`;

    const evaluation = await prisma.supplierEvaluation.create({
      data: {
        supplierId: params.id,
        code,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        qualityScore,
        deliveryScore,
        priceScore,
        serviceScore,
        communicationScore,
        qualityWeight,
        deliveryWeight,
        priceWeight,
        serviceWeight,
        communicationWeight,
        totalScore,
        rating,
        totalOrders,
        onTimeDeliveries,
        qualityIssues,
        returns,
        strengths,
        weaknesses,
        improvements,
        comments,
        recommendation,
        actionRequired: actionRequired || false,
        actionDescription,
        evaluatedById: session.user.id
      },
      include: {
        evaluatedBy: { select: { id: true, name: true, surname: true } }
      }
    });

    // Update supplier with latest evaluation data
    const evaluationMonths: Record<string, number> = {
      'AYLIK': 1,
      'UCAYLIK': 3,
      'ALTIAYLIK': 6,
      'YILLIK': 12
    };

    const supplier = await prisma.supplier.findUnique({
      where: { id: params.id }
    });

    const nextEvaluationDate = new Date();
    nextEvaluationDate.setMonth(nextEvaluationDate.getMonth() + (evaluationMonths[supplier?.evaluationPeriod || 'YILLIK'] || 12));

    await prisma.supplier.update({
      where: { id: params.id },
      data: {
        lastEvaluationDate: new Date(),
        nextEvaluationDate,
        averageScore: totalScore,
        currentRating: rating
      }
    });

    // Create history entry
    await prisma.supplierHistory.create({
      data: {
        supplierId: params.id,
        userId: session.user.id,
        action: 'DEGERLENDIRME_YAPILDI',
        newValue: JSON.stringify({ code, totalScore, rating }),
        comments: `Değerlendirme yapıldı: ${rating} (${totalScore.toFixed(1)} puan)`
      }
    });

    return NextResponse.json(evaluation, { status: 201 });
  } catch (error) {
    console.error('Supplier evaluation create error:', error);
    return NextResponse.json(
      { error: 'Değerlendirme oluşturulamadı' },
      { status: 500 }
    );
  }
}
