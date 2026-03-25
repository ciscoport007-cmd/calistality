import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { PrismaClient } from '@prisma/client';
import { createAuditLog } from '@/lib/audit';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

// Planlı revizyon ayarla/güncelle
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
    const { reviewFrequencyMonths, nextReviewDate, reviewReminder } = body;

    // Dokümanı kontrol et
    const document = await prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      return NextResponse.json({ error: 'Doküman bulunamadı' }, { status: 404 });
    }

    // Güncelle
    const updatedDoc = await prisma.document.update({
      where: { id },
      data: {
        reviewFrequencyMonths: reviewFrequencyMonths ? parseInt(reviewFrequencyMonths) : null,
        nextReviewDate: nextReviewDate ? new Date(nextReviewDate) : null,
        reviewReminder: reviewReminder !== undefined ? reviewReminder : true,
      },
    });

    // Audit log
    await createAuditLog({
      userId: session.user.id,
      action: 'REVIEW_SCHEDULE_UPDATE',
      module: 'DOKUMAN',
      entityType: 'Document',
      entityId: id,
      newValues: { reviewFrequencyMonths, nextReviewDate, reviewReminder },
    });

    return NextResponse.json({
      message: 'Revizyon planı güncellendi',
      document: updatedDoc,
    });
  } catch (error) {
    console.error('Review schedule error:', error);
    return NextResponse.json(
      { error: 'Revizyon planı güncellenirken hata oluştu' },
      { status: 500 }
    );
  }
}

// Revizyon tamamlandı işaretle
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
    const body = await request.json().catch(() => ({}));
    const { notes } = body;

    // Dokümanı al
    const document = await prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      return NextResponse.json({ error: 'Doküman bulunamadı' }, { status: 404 });
    }

    // Sonraki revizyon tarihini hesapla
    let newNextReviewDate = null;
    if (document.reviewFrequencyMonths) {
      newNextReviewDate = new Date();
      newNextReviewDate.setMonth(newNextReviewDate.getMonth() + document.reviewFrequencyMonths);
    }

    // Güncelle
    const updatedDoc = await prisma.document.update({
      where: { id },
      data: {
        lastReviewDate: new Date(),
        nextReviewDate: newNextReviewDate,
      },
    });

    // Audit log
    await createAuditLog({
      userId: session.user.id,
      action: 'REVIEW_COMPLETED',
      module: 'DOKUMAN',
      entityType: 'Document',
      entityId: id,
      newValues: { 
        lastReviewDate: new Date().toISOString(), 
        nextReviewDate: newNextReviewDate?.toISOString(),
        notes 
      },
    });

    return NextResponse.json({
      message: 'Revizyon tamamlandı olarak işaretlendi',
      document: updatedDoc,
    });
  } catch (error) {
    console.error('Review complete error:', error);
    return NextResponse.json(
      { error: 'Revizyon tamamlanırken hata oluştu' },
      { status: 500 }
    );
  }
}
