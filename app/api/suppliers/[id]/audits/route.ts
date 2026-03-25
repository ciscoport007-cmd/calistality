import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { SupplierAuditAnswerValue } from '@prisma/client';

// Tedarikçiye ait denetimleri listele
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const audits = await prisma.supplierAudit.findMany({
      where: { supplierId: params.id },
      include: {
        auditor: { select: { id: true, name: true, surname: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
        answers: {
          include: {
            question: true,
          },
        },
      },
      orderBy: { auditDate: 'desc' },
    });

    return NextResponse.json(audits);
  } catch (error) {
    console.error('Supplier audits fetch error:', error);
    return NextResponse.json(
      { error: 'Denetimler alınamadı' },
      { status: 500 }
    );
  }
}

// Yeni denetim oluştur
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
      auditDate,
      auditType,
      auditorId,
      notes,
      findings,
      recommendations,
      answers,
      evidenceFileName,
      evidenceFileSize,
      evidenceCloudPath,
      evidenceIsPublic,
    } = body;

    // Validasyon
    if (!auditDate || !auditType || !auditorId) {
      return NextResponse.json(
        { error: 'Zorunlu alanlar eksik' },
        { status: 400 }
      );
    }

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return NextResponse.json(
        { error: 'En az bir soru cevaplanmalıdır' },
        { status: 400 }
      );
    }

    // Puanlama hesapla
    let totalScore = 0;
    let maxScore = 0;
    
    for (const ans of answers) {
      if (ans.answer === 'EVET') {
        totalScore += 5;
        maxScore += 5;
      } else if (ans.answer === 'HAYIR') {
        maxScore += 5;
      }
      // UYGULANAMAZ ise hesaba katılmaz
    }

    const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

    // Kod oluştur
    const year = new Date().getFullYear();
    const lastAudit = await prisma.supplierAudit.findFirst({
      where: { code: { startsWith: `TED-DEN-${year}` } },
      orderBy: { code: 'desc' },
    });

    let nextNumber = 1;
    if (lastAudit) {
      const lastNumber = parseInt(lastAudit.code.split('-')[3]);
      nextNumber = lastNumber + 1;
    }
    const code = `TED-DEN-${year}-${nextNumber.toString().padStart(4, '0')}`;

    // Denetim oluştur
    const audit = await prisma.supplierAudit.create({
      data: {
        code,
        supplierId: params.id,
        auditDate: new Date(auditDate),
        auditType,
        auditorId,
        notes,
        findings,
        recommendations,
        totalScore,
        maxScore,
        percentage,
        evidenceFileName,
        evidenceFileSize,
        evidenceCloudPath,
        evidenceIsPublic: evidenceIsPublic || false,
        createdById: session.user.id,
        answers: {
          create: answers.map((ans: any) => ({
            questionId: ans.questionId,
            answer: ans.answer as SupplierAuditAnswerValue,
            notes: ans.notes || null,
          })),
        },
      },
      include: {
        auditor: { select: { id: true, name: true, surname: true } },
        answers: {
          include: {
            question: true,
          },
        },
      },
    });

    // Tedarikçinin denetim puanını güncelle
    await prisma.supplier.update({
      where: { id: params.id },
      data: { auditScore: percentage },
    });

    // Tedarikçi geçmişine ekle
    await prisma.supplierHistory.create({
      data: {
        supplierId: params.id,
        userId: session.user.id,
        action: 'DEGERLENDIRME_YAPILDI',
        comments: `Denetim yapıldı: ${code} - Puan: ${percentage.toFixed(1)}%`,
      },
    });

    return NextResponse.json(audit, { status: 201 });
  } catch (error) {
    console.error('Supplier audit create error:', error);
    return NextResponse.json(
      { error: 'Denetim oluşturulamadı' },
      { status: 500 }
    );
  }
}
