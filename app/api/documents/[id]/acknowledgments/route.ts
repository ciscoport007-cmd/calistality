import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { PrismaClient } from '@prisma/client';
import { createAuditLog } from '@/lib/audit';
import { createNotifications, createNotification } from '@/lib/notifications';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

// Okundu onaylarını listele
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

    // Dokümanı ve onayları al
    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        acknowledgments: {
          include: {
            user: { select: { id: true, name: true, surname: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        department: true,
      },
    });

    if (!document) {
      return NextResponse.json({ error: 'Doküman bulunamadı' }, { status: 404 });
    }

    // Bekleyen onayları olan kullanıcıları bul (acknowledgment tablosunda BEKLIYOR durumunda olanlar)
    let pendingUsers: any[] = [];
    if (document.requiresAcknowledgment) {
      // Mevcut versiyonda "BEKLIYOR" durumundaki acknowledgment kayıtlarından kullanıcıları al
      const pendingAcknowledgments = await prisma.documentAcknowledgment.findMany({
        where: {
          documentId: id,
          versionNumber: document.currentVersion,
          status: 'BEKLIYOR',
        },
        include: {
          user: { select: { id: true, name: true, surname: true, email: true } },
        },
      });
      
      pendingUsers = pendingAcknowledgments.map(a => a.user);
    }

    // İstatistikler
    const currentVersionAcks = document.acknowledgments.filter(
      a => a.versionNumber === document.currentVersion
    );
    const stats = {
      total: currentVersionAcks.length,
      approved: currentVersionAcks.filter(a => a.status === 'ONAYLANDI').length,
      pending: currentVersionAcks.filter(a => a.status === 'BEKLIYOR').length,
      rejected: currentVersionAcks.filter(a => a.status === 'REDDEDILDI').length,
    };

    return NextResponse.json({
      acknowledgments: document.acknowledgments,
      pendingUsers,
      stats,
      requiresAcknowledgment: document.requiresAcknowledgment,
      acknowledgmentDeadline: document.acknowledgmentDeadline,
      currentVersion: document.currentVersion,
    });
  } catch (error) {
    console.error('Acknowledgments GET error:', error);
    return NextResponse.json(
      { error: 'Okundu onayları getirilirken hata oluştu' },
      { status: 500 }
    );
  }
}

// Okundu onayı gerekliliğini ayarla ve kullanıcılara ata
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
    const { 
      requiresAcknowledgment, 
      acknowledgmentDeadline, 
      userIds // Belirli kullanıcılara ata (opsiyonel)
    } = body;

    // Dokümanı kontrol et
    const document = await prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      return NextResponse.json({ error: 'Doküman bulunamadı' }, { status: 404 });
    }

    // Dokümanı güncelle
    await prisma.document.update({
      where: { id },
      data: {
        requiresAcknowledgment: requiresAcknowledgment ?? true,
        acknowledgmentDeadline: acknowledgmentDeadline ? new Date(acknowledgmentDeadline) : null,
      },
    });

    // Kullanıcılara okundu onayı ata
    let targetUserIds = userIds;
    if (!targetUserIds && document.departmentId) {
      // Departmandaki tüm kullanıcılara ata (onay isteyen hariç)
      const departmentUsers = await prisma.user.findMany({
        where: { 
          departmentId: document.departmentId, 
          isActive: true,
          id: { not: session.user.id }, // Onay isteyen kişiyi hariç tut
        },
        select: { id: true },
      });
      targetUserIds = departmentUsers.map(u => u.id);
    } else if (targetUserIds) {
      // Belirli kullanıcılar seçilmişse de onay isteyeni hariç tut
      targetUserIds = targetUserIds.filter((uid: string) => uid !== session.user.id);
    }

    // Yeni atanan kullanıcıları takip et
    const newlyAssignedUserIds: string[] = [];

    if (targetUserIds && targetUserIds.length > 0) {
      // Mevcut olanları kontrol et
      const existingAcks = await prisma.documentAcknowledgment.findMany({
        where: {
          documentId: id,
          versionNumber: document.currentVersion,
          userId: { in: targetUserIds },
        },
        select: { userId: true },
      });
      const existingUserIds = existingAcks.map(a => a.userId);

      // Mevcut olanları atla, yenileri ekle
      for (const userId of targetUserIds) {
        const isNew = !existingUserIds.includes(userId);
        
        await prisma.documentAcknowledgment.upsert({
          where: {
            documentId_userId_versionNumber: {
              documentId: id,
              userId,
              versionNumber: document.currentVersion,
            },
          },
          update: {}, // Zaten varsa dokunma
          create: {
            documentId: id,
            userId,
            versionNumber: document.currentVersion,
            status: 'BEKLIYOR',
          },
        });

        if (isNew) {
          newlyAssignedUserIds.push(userId);
        }
      }
    }

    // Doküman bilgilerini al (bildirim için)
    const docInfo = await prisma.document.findUnique({
      where: { id },
      select: { title: true, code: true },
    });

    // Yeni atanan kullanıcılara bildirim gönder
    if (newlyAssignedUserIds.length > 0 && docInfo) {
      const deadlineText = acknowledgmentDeadline 
        ? ` Son tarih: ${new Date(acknowledgmentDeadline).toLocaleDateString('tr-TR')}`
        : '';

      await createNotifications(newlyAssignedUserIds, {
        title: 'Doküman Okundu Onayı Talebi',
        message: `"${docInfo.title}" (${docInfo.code}) dokümanını okumanız ve onaylamanız beklenmektedir.${deadlineText}`,
        type: 'BILGI',
        link: `/dashboard/documents/${id}`,
      });
    }

    // Audit log
    await createAuditLog({
      userId: session.user.id,
      action: 'ACKNOWLEDGMENT_REQUIRED',
      module: 'DOKUMAN',
      entityType: 'Document',
      entityId: id,
      newValues: { 
        requiresAcknowledgment, 
        acknowledgmentDeadline,
        targetUserCount: targetUserIds?.length || 0,
      },
    });

    return NextResponse.json({
      message: 'Okundu onayı gerekliliği ayarlandı',
      targetUserCount: targetUserIds?.length || 0,
    });
  } catch (error) {
    console.error('Acknowledgment setup error:', error);
    return NextResponse.json(
      { error: 'Okundu onayı ayarlanırken hata oluştu' },
      { status: 500 }
    );
  }
}

// Kullanıcı okundu onayı ver
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
    const body = await request.json();
    const { status, comments } = body; // status: 'ONAYLANDI' veya 'REDDEDILDI'

    if (!['ONAYLANDI', 'REDDEDILDI'].includes(status)) {
      return NextResponse.json({ error: 'Geçersiz durum' }, { status: 400 });
    }

    // Dokümanı al
    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true } },
      },
    });

    if (!document) {
      return NextResponse.json({ error: 'Doküman bulunamadı' }, { status: 404 });
    }

    // Okundu onayını güncelle veya oluştur
    const acknowledgment = await prisma.documentAcknowledgment.upsert({
      where: {
        documentId_userId_versionNumber: {
          documentId: id,
          userId: session.user.id,
          versionNumber: document.currentVersion,
        },
      },
      update: {
        status,
        acknowledgedAt: new Date(),
        comments,
      },
      create: {
        documentId: id,
        userId: session.user.id,
        versionNumber: document.currentVersion,
        status,
        acknowledgedAt: new Date(),
        comments,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    // Audit log
    await createAuditLog({
      userId: session.user.id,
      action: status === 'ONAYLANDI' ? 'DOCUMENT_ACKNOWLEDGED' : 'DOCUMENT_ACKNOWLEDGMENT_REJECTED',
      module: 'DOKUMAN',
      entityType: 'DocumentAcknowledgment',
      entityId: acknowledgment.id,
      newValues: { status, comments, documentId: id },
    });

    // Doküman sahibine bildirim gönder (kendi onayı değilse)
    if (document.createdById && document.createdById !== session.user.id) {
      const userName = session.user.name || 'Bir kullanıcı';
      if (status === 'ONAYLANDI') {
        await createNotification({
          userId: document.createdById,
          title: 'Doküman Okundu Onayı Alındı',
          message: `${userName}, "${document.title}" (${document.code}) dokümanını okudu ve onayladı.`,
          type: 'BASARI',
          link: `/dashboard/documents/${id}`,
        });
      } else {
        await createNotification({
          userId: document.createdById,
          title: 'Doküman Okundu Onayı Reddedildi',
          message: `${userName}, "${document.title}" (${document.code}) dokümanını okumayı reddetti.${comments ? ` Sebep: ${comments}` : ''}`,
          type: 'UYARI',
          link: `/dashboard/documents/${id}`,
        });
      }
    }

    return NextResponse.json({
      message: status === 'ONAYLANDI' ? 'Okundu onayı verildi' : 'Okundu onayı reddedildi',
      acknowledgment,
    });
  } catch (error) {
    console.error('Acknowledgment update error:', error);
    return NextResponse.json(
      { error: 'Okundu onayı güncellenirken hata oluştu' },
      { status: 500 }
    );
  }
}
