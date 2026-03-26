import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export const dynamic = 'force-dynamic';

// Denetim Değerlendirmesi API'si
// 20 soru, her soru 5 puan, toplam max 100 puan

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
    const { auditScore } = body;

    // Puan validasyonu (0-100 arası)
    if (auditScore < 0 || auditScore > 100) {
      return NextResponse.json(
        { error: 'Denetim puanı 0-100 arasında olmalıdır' },
        { status: 400 }
      );
    }

    // Mevcut tedarikçiyi al
    const supplier = await prisma.supplier.findUnique({
      where: { id: params.id },
      select: { purchasingTotalScore: true }
    });

    if (!supplier) {
      return NextResponse.json({ error: 'Tedarikçi bulunamadı' }, { status: 404 });
    }

    // Genel puan hesapla
    let overallScore: number | null = null;
    if (supplier.purchasingTotalScore !== null) {
      overallScore = (supplier.purchasingTotalScore + auditScore) / 2;
    } else {
      // Sadece denetim skoru varsa, onu kullan
      overallScore = auditScore;
    }

    const supplierGrade = calculateGrade(overallScore);

    // Tedarikçiyi güncelle
    const updatedSupplier = await prisma.supplier.update({
      where: { id: params.id },
      data: {
        auditScore,
        auditEvaluationDate: new Date(),
        overallScore,
        supplierGrade,
        currentRating: supplierGrade
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
        action: 'DENETIM_DEGERLENDIRMESI',
        newValue: JSON.stringify({
          auditScore,
          overallScore,
          supplierGrade
        }),
        comments: `Denetim değerlendirmesi yapıldı. Puan: ${auditScore}, Genel Puan: ${overallScore?.toFixed(1)}, Sınıf: ${supplierGrade}`
      }
    });

    return NextResponse.json({
      success: true,
      auditScore,
      overallScore,
      supplierGrade,
      supplier: updatedSupplier
    });
  } catch (error) {
    console.error('Audit evaluation error:', error);
    return NextResponse.json(
      { error: 'Değerlendirme kaydedilemedi' },
      { status: 500 }
    );
  }
}
