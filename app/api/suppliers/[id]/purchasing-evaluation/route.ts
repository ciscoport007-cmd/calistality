import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

// Satın Alma Değerlendirmesi API'si
// Her kriter 1-5 puan, toplam max 20 puan
// Satın Alma Skoru = (Toplam / 20) × 100

function calculateGrade(overallScore: number | null): string | null {
  if (overallScore === null) return null;
  if (overallScore >= 80) return 'A';
  if (overallScore >= 60) return 'B';
  return 'C';
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
    const { priceScore, serviceScore, deliveryScore, competencyScore } = body;

    // Puan validasyonu (1-5 arası)
    const scores = [priceScore, serviceScore, deliveryScore, competencyScore];
    for (const score of scores) {
      if (score < 1 || score > 5) {
        return NextResponse.json(
          { error: 'Puanlar 1-5 arasında olmalıdır' },
          { status: 400 }
        );
      }
    }

    // Toplam puan hesapla (max 20)
    const totalScore = priceScore + serviceScore + deliveryScore + competencyScore;
    // 100'lük sisteme normalize et
    const purchasingTotalScore = (totalScore / 20) * 100;

    // Mevcut tedarikçiyi al
    const supplier = await prisma.supplier.findUnique({
      where: { id: params.id },
      select: { auditScore: true }
    });

    if (!supplier) {
      return NextResponse.json({ error: 'Tedarikçi bulunamadı' }, { status: 404 });
    }

    // Genel puan hesapla
    let overallScore: number | null = null;
    if (supplier.auditScore !== null) {
      overallScore = (purchasingTotalScore + supplier.auditScore) / 2;
    } else {
      // Sadece satın alma skoru varsa, onu kullan
      overallScore = purchasingTotalScore;
    }

    const supplierGrade = calculateGrade(overallScore);

    // Tedarikçiyi güncelle
    const updatedSupplier = await prisma.supplier.update({
      where: { id: params.id },
      data: {
        purchasingPriceScore: priceScore,
        purchasingServiceScore: serviceScore,
        purchasingDeliveryScore: deliveryScore,
        purchasingCompetencyScore: competencyScore,
        purchasingTotalScore,
        purchasingEvaluationDate: new Date(),
        purchasingEvaluatedById: session.user.id,
        overallScore,
        supplierGrade,
        currentRating: supplierGrade // Eski rating alanını da güncelle
      },
      include: {
        category: true
      }
    });

    // History kaydı
    await prisma.supplierHistory.create({
      data: {
        supplierId: params.id,
        userId: session.user.id,
        action: 'SATIN_ALMA_DEGERLENDIRMESI',
        newValue: JSON.stringify({
          priceScore,
          serviceScore,
          deliveryScore,
          competencyScore,
          purchasingTotalScore,
          overallScore,
          supplierGrade
        }),
        comments: `Satın alma değerlendirmesi yapıldı. Puan: ${purchasingTotalScore.toFixed(1)}, Sınıf: ${supplierGrade}`
      }
    });

    return NextResponse.json({
      success: true,
      purchasingTotalScore,
      overallScore,
      supplierGrade,
      supplier: updatedSupplier
    });
  } catch (error) {
    console.error('Purchasing evaluation error:', error);
    return NextResponse.json(
      { error: 'Değerlendirme kaydedilemedi' },
      { status: 500 }
    );
  }
}
