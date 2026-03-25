import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { PrismaClient } from '@prisma/client';
import { createAuditLog, isAdmin } from '@/lib/audit';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

// Dokümanı iptal et
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { reason } = await request.json();

    if (!reason || reason.trim().length === 0) {
      return NextResponse.json(
        { error: 'İptal nedeni zorunludur' },
        { status: 400 }
      );
    }

    const document = await prisma.document.findUnique({
      where: { id: params.id },
      include: {
        createdBy: true,
        department: true,
      },
    });

    if (!document) {
      return NextResponse.json({ error: 'Doküman bulunamadı' }, { status: 404 });
    }

    // Sadece admin veya doküman sahibi iptal edebilir
    const canCancel = isAdmin(session.user.role) || document.createdById === session.user.id;
    if (!canCancel) {
      return NextResponse.json(
        { error: 'Bu dokümanı iptal etme yetkiniz yok' },
        { status: 403 }
      );
    }

    // Zaten iptal edilmiş mi kontrol et
    if (document.status === 'IPTAL_EDILDI') {
      return NextResponse.json(
        { error: 'Bu doküman zaten iptal edilmiş' },
        { status: 400 }
      );
    }

    const oldStatus = document.status;

    const updatedDocument = await prisma.document.update({
      where: { id: params.id },
      data: {
        status: 'IPTAL_EDILDI',
        cancelledById: session.user.id,
        cancelledAt: new Date(),
        cancellationReason: reason,
      },
      include: {
        cancelledBy: {
          select: {
            id: true,
            name: true,
            surname: true,
            email: true,
          },
        },
      },
    });

    await createAuditLog({
      userId: session.user.id,
      action: 'DOCUMENT_CANCELLED',
      module: 'DOKUMAN',
      entityType: 'Document',
      entityId: document.id,
      oldValues: { status: oldStatus },
      newValues: { status: 'IPTAL_EDILDI', cancellationReason: reason },
    });

    return NextResponse.json({
      document: updatedDocument,
      message: 'Doküman başarıyla iptal edildi',
    });
  } catch (error) {
    console.error('Document cancel error:', error);
    return NextResponse.json(
      { error: 'Doküman iptal edilirken hata oluştu' },
      { status: 500 }
    );
  }
}

// İptal durumunu geri al (önceki duruma döndür)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !isAdmin(session.user.role)) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const document = await prisma.document.findUnique({
      where: { id: params.id },
    });

    if (!document) {
      return NextResponse.json({ error: 'Doküman bulunamadı' }, { status: 404 });
    }

    if (document.status !== 'IPTAL_EDILDI') {
      return NextResponse.json(
        { error: 'Bu doküman iptal durumunda değil' },
        { status: 400 }
      );
    }

    const updatedDocument = await prisma.document.update({
      where: { id: params.id },
      data: {
        status: 'TASLAK',
        cancelledById: null,
        cancelledAt: null,
        cancellationReason: null,
      },
    });

    await createAuditLog({
      userId: session.user.id,
      action: 'DOCUMENT_CANCEL_REVERTED',
      module: 'DOKUMAN',
      entityType: 'Document',
      entityId: document.id,
      oldValues: { status: 'IPTAL_EDILDI' },
      newValues: { status: 'TASLAK' },
    });

    return NextResponse.json({
      document: updatedDocument,
      message: 'Doküman iptali geri alındı',
    });
  } catch (error) {
    console.error('Document cancel revert error:', error);
    return NextResponse.json(
      { error: 'İptal geri alınırken hata oluştu' },
      { status: 500 }
    );
  }
}
