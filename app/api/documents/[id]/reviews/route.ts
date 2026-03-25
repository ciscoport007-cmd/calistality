import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { PrismaClient } from '@prisma/client';
import { createAuditLog, isAdmin } from '@/lib/audit';
import { createNotification } from '@/lib/notifications';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

// İnceleme listesini getir
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const document = await prisma.document.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        code: true,
        title: true,
        currentVersion: true,
        status: true,
        reviewStatus: true,
        reviewNote: true,
        reviewedById: true,
        reviewedAt: true,
        reviewedBy: {
          select: {
            id: true,
            name: true,
            surname: true,
            email: true,
          },
        },
      },
    });

    if (!document) {
      return NextResponse.json({ error: 'Doküman bulunamadı' }, { status: 404 });
    }

    const reviews = await prisma.documentReview.findMany({
      where: { documentId: params.id },
      include: {
        reviewer: {
          select: {
            id: true,
            name: true,
            surname: true,
            email: true,
          },
        },
      },
      orderBy: { order: 'asc' },
    });

    // İstatistikler
    const stats = {
      total: reviews.length,
      approved: reviews.filter((r) => r.status === 'ONAYLANDI').length,
      rejected: reviews.filter((r) => r.status === 'REDDEDILDI').length,
      pending: reviews.filter((r) => r.status === 'BEKLIYOR').length,
    };

    return NextResponse.json({
      document,
      reviews,
      stats,
    });
  } catch (error) {
    console.error('Document reviews GET error:', error);
    return NextResponse.json(
      { error: 'İncelemeler getirilirken hata oluştu' },
      { status: 500 }
    );
  }
}

// Yeni inceleyiciler ekle (dokümanı incelemeye gönder)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { reviewerIds } = await request.json();

    if (!reviewerIds || !Array.isArray(reviewerIds) || reviewerIds.length === 0) {
      return NextResponse.json(
        { error: 'En az bir inceleyici seçmelisiniz' },
        { status: 400 }
      );
    }

    // Kullanıcının kendisini inceleyici olarak eklemesini engelle
    if (reviewerIds.includes(session.user.id)) {
      return NextResponse.json(
        { error: 'Kendinizi inceleyici olarak ekleyemezsiniz' },
        { status: 400 }
      );
    }

    const document = await prisma.document.findUnique({
      where: { id: params.id },
    });

    if (!document) {
      return NextResponse.json({ error: 'Doküman bulunamadı' }, { status: 404 });
    }

    // Sadece admin veya doküman sahibi incelemeye gönderebilir
    const canSendForReview = isAdmin(session.user.role) || document.createdById === session.user.id;
    if (!canSendForReview) {
      return NextResponse.json(
        { error: 'Bu dokümanı incelemeye gönderme yetkiniz yok' },
        { status: 403 }
      );
    }

    // Mevcut inceleyicileri sil ve yenilerini ekle
    await prisma.documentReview.deleteMany({
      where: {
        documentId: params.id,
        versionNumber: document.currentVersion,
      },
    });

    // Yeni inceleyicileri ekle
    const reviews = await Promise.all(
      reviewerIds.map((reviewerId: string, index: number) =>
        prisma.documentReview.create({
          data: {
            documentId: params.id,
            reviewerId,
            versionNumber: document.currentVersion,
            status: 'BEKLIYOR',
            order: index + 1,
          },
          include: {
            reviewer: {
              select: {
                id: true,
                name: true,
                surname: true,
                email: true,
              },
            },
          },
        })
      )
    );

    // Doküman durumunu güncelle
    await prisma.document.update({
      where: { id: params.id },
      data: {
        status: 'INCELEME_BEKLIYOR',
        reviewStatus: 'BEKLIYOR',
      },
    });

    // İnceleyicilere bildirim gönder
    for (const review of reviews) {
      if (review.reviewerId && review.reviewerId !== session.user.id) {
        await createNotification({
          userId: review.reviewerId,
          title: 'Doküman İnceleme Talebi',
          message: `"${document.title}" (${document.code}) dokümanı görüşünüzü bekliyor.`,
          type: 'BILGI',
          link: `/dashboard/documents/${document.id}`,
        });
      }
    }

    await createAuditLog({
      userId: session.user.id,
      action: 'DOCUMENT_SENT_FOR_REVIEW',
      module: 'DOKUMAN',
      entityType: 'Document',
      entityId: document.id,
      newValues: { reviewerIds, status: 'INCELEME_BEKLIYOR' },
    });

    return NextResponse.json({
      reviews,
      message: 'Doküman incelemeye gönderildi',
    });
  } catch (error) {
    console.error('Document reviews POST error:', error);
    return NextResponse.json(
      { error: 'İnceleyiciler eklenirken hata oluştu' },
      { status: 500 }
    );
  }
}

// İnceleme yap (onayla/reddet)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { status, comments } = await request.json();

    if (!status || !['ONAYLANDI', 'REDDEDILDI'].includes(status)) {
      return NextResponse.json(
        { error: 'Geçersiz inceleme durumu' },
        { status: 400 }
      );
    }

    const document = await prisma.document.findUnique({
      where: { id: params.id },
    });

    if (!document) {
      return NextResponse.json({ error: 'Doküman bulunamadı' }, { status: 404 });
    }

    // Kullanıcının bu doküman için inceleme kaydı var mı?
    const myReview = await prisma.documentReview.findFirst({
      where: {
        documentId: params.id,
        reviewerId: session.user.id,
        versionNumber: document.currentVersion,
        status: 'BEKLIYOR',
      },
    });

    if (!myReview) {
      return NextResponse.json(
        { error: 'Bu doküman için bekleyen incelemeniz yok' },
        { status: 403 }
      );
    }

    // İncelemeyi güncelle
    await prisma.documentReview.update({
      where: { id: myReview.id },
      data: {
        status,
        comments: comments || null,
        reviewedAt: new Date(),
      },
    });

    // Tüm incelemeleri kontrol et
    const allReviews = await prisma.documentReview.findMany({
      where: {
        documentId: params.id,
        versionNumber: document.currentVersion,
      },
    });

    const allApproved = allReviews.every((r) => r.status === 'ONAYLANDI');
    const anyRejected = allReviews.some((r) => r.status === 'REDDEDILDI');
    const allCompleted = allReviews.every((r) => r.status !== 'BEKLIYOR');

    // Doküman durumunu güncelle
    let newDocStatus = document.status;
    let newReviewStatus = 'BEKLIYOR';

    if (anyRejected) {
      newDocStatus = 'TASLAK';
      newReviewStatus = 'REDDEDILDI';
    } else if (allApproved) {
      newDocStatus = 'ONAY_BEKLIYOR'; // İnceleme tamamlandı, onaya gönder
      newReviewStatus = 'ONAYLANDI';
    } else if (allCompleted) {
      newReviewStatus = 'ONAYLANDI';
    }

    await prisma.document.update({
      where: { id: params.id },
      data: {
        status: newDocStatus,
        reviewStatus: newReviewStatus,
        reviewNote: anyRejected ? 'Bir veya daha fazla inceleyici tarafından reddedildi' : null,
        reviewedById: session.user.id,
        reviewedAt: new Date(),
      },
    });

    // Doküman sahibine bildirim gönder (inceleme sonucu)
    if (document.createdById && document.createdById !== session.user.id) {
      const reviewer = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true, surname: true },
      });
      const reviewerName = reviewer ? `${reviewer.name} ${reviewer.surname}` : 'Bir kullanıcı';

      await createNotification({
        userId: document.createdById,
        title: status === 'ONAYLANDI' ? 'Doküman İncelemesi Onaylandı' : 'Doküman İncelemesi Reddedildi',
        message: `"${document.title}" (${document.code}) dokümanı ${reviewerName} tarafından ${status === 'ONAYLANDI' ? 'onaylandı' : 'reddedildi'}.${comments ? ` Not: ${comments}` : ''}`,
        type: 'BILGI',
        link: `/dashboard/documents/${document.id}`,
      });
    }

    // Tüm incelemeler tamamlandı ve onay aşamasına geçtiyse, departman müdürüne bildirim gönder
    if (allApproved && newDocStatus === 'ONAY_BEKLIYOR' && document.departmentId) {
      // Departman müdürünü bul
      const departmentHead = await prisma.user.findFirst({
        where: {
          departmentId: document.departmentId,
          isActive: true,
          position: {
            name: { contains: 'Müdür', mode: 'insensitive' },
          },
        },
      });

      if (departmentHead && departmentHead.id !== session.user.id) {
        await createNotification({
          userId: departmentHead.id,
          title: 'Doküman Onayınızı Bekliyor',
          message: `"${document.title}" (${document.code}) dokümanı inceleme sürecini tamamladı ve onayınızı bekliyor.`,
          type: 'BILGI',
          link: `/dashboard/documents/${document.id}`,
        });
      }

      // Ayrıca doküman sahibine de bildir
      if (document.createdById && document.createdById !== session.user.id) {
        await createNotification({
          userId: document.createdById,
          title: 'Doküman Onay Aşamasına Geçti',
          message: `"${document.title}" (${document.code}) dokümanı tüm incelemeleri tamamladı ve onay aşamasına geçti.`,
          type: 'BILGI',
          link: `/dashboard/documents/${document.id}`,
        });
      }
    }

    // Reddedilirse doküman sahibine özel bildirim
    if (anyRejected && document.createdById && document.createdById !== session.user.id) {
      await createNotification({
        userId: document.createdById,
        title: 'Doküman İncelemesi Reddedildi',
        message: `"${document.title}" (${document.code}) dokümanı inceleme sürecinde reddedildi. Doküman taslak durumuna alındı.`,
        type: 'UYARI',
        link: `/dashboard/documents/${document.id}`,
      });
    }

    await createAuditLog({
      userId: session.user.id,
      action: status === 'ONAYLANDI' ? 'DOCUMENT_REVIEW_APPROVED' : 'DOCUMENT_REVIEW_REJECTED',
      module: 'DOKUMAN',
      entityType: 'Document',
      entityId: document.id,
      newValues: { reviewStatus: status, comments },
    });

    return NextResponse.json({
      message: status === 'ONAYLANDI' ? 'İnceleme onaylandı' : 'İnceleme reddedildi',
      documentStatus: newDocStatus,
      reviewStatus: newReviewStatus,
    });
  } catch (error) {
    console.error('Document review PUT error:', error);
    return NextResponse.json(
      { error: 'İnceleme yapılırken hata oluştu' },
      { status: 500 }
    );
  }
}
