import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { createNotification, NotificationTemplates } from '@/lib/notifications';
import { isAdmin } from '@/lib/audit';
import { getFileUrl } from '@/lib/storage';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

// CAPA Detayı
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await context.params;

    const capa = await prisma.cAPA.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true, surname: true, email: true } },
        responsibleUser: { select: { id: true, name: true, surname: true, email: true } },
        reviewedBy: { select: { id: true, name: true, surname: true } },
        closedBy: { select: { id: true, name: true, surname: true } },
        department: { select: { id: true, name: true, code: true } },
        team: { select: { id: true, name: true } },
        complaint: { select: { id: true, code: true, subject: true, customerName: true } },
        actions: {
          include: {
            assignee: { select: { id: true, name: true, surname: true } },
            createdBy: { select: { id: true, name: true, surname: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        histories: {
          include: {
            user: { select: { id: true, name: true, surname: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        attachments: {
          include: {
            uploadedBy: { select: { id: true, name: true, surname: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!capa) {
      return NextResponse.json({ error: 'CAPA bulunamadı' }, { status: 404 });
    }

    // Attachment'lara URL ekle
    const attachmentsWithUrls = await Promise.all(
      (capa.attachments || []).map(async (att: any) => {
        try {
          const url = await getFileUrl(att.cloudStoragePath, att.isPublic);
          return { ...att, url };
        } catch {
          return { ...att, url: '' };
        }
      })
    );

    return NextResponse.json({ ...capa, attachments: attachmentsWithUrls });
  } catch (error) {
    console.error('CAPA detay hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// CAPA Güncelle
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();

    const existingCapa = await prisma.cAPA.findUnique({ where: { id } });
    if (!existingCapa) {
      return NextResponse.json({ error: 'CAPA bulunamadı' }, { status: 404 });
    }

    const {
      title,
      description,
      type,
      source,
      priority,
      status,
      responsibleUserId,
      teamId,
      departmentId,
      rootCauseAnalysis,
      rootCauseMethod,
      rootCauseDate,
      actionPlan,
      expectedCompletion,
      implementationNotes,
      implementedAt,
      effectivenessReview,
      isEffective,
      reviewDate,
      dueDate,
    } = body;

    const updateData: any = {};

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (type !== undefined) updateData.type = type;
    if (source !== undefined) updateData.source = source;
    if (priority !== undefined) updateData.priority = priority;
    if (responsibleUserId !== undefined) updateData.responsibleUserId = responsibleUserId || null;
    if (teamId !== undefined) updateData.teamId = teamId || null;
    if (departmentId !== undefined) updateData.departmentId = departmentId || null;
    if (rootCauseAnalysis !== undefined) updateData.rootCauseAnalysis = rootCauseAnalysis;
    if (rootCauseMethod !== undefined) updateData.rootCauseMethod = rootCauseMethod;
    if (rootCauseDate !== undefined) updateData.rootCauseDate = rootCauseDate ? new Date(rootCauseDate) : null;
    if (actionPlan !== undefined) updateData.actionPlan = actionPlan;
    if (expectedCompletion !== undefined) updateData.expectedCompletion = expectedCompletion ? new Date(expectedCompletion) : null;
    if (implementationNotes !== undefined) updateData.implementationNotes = implementationNotes;
    if (implementedAt !== undefined) updateData.implementedAt = implementedAt ? new Date(implementedAt) : null;
    if (effectivenessReview !== undefined) updateData.effectivenessReview = effectivenessReview;
    if (isEffective !== undefined) {
      updateData.isEffective = isEffective;
      updateData.reviewedById = session.user.id;
    }
    if (reviewDate !== undefined) updateData.reviewDate = reviewDate ? new Date(reviewDate) : null;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;

    // Durum değişikliği - Sadece Admin veya Yönetici yapabilir
    if (status !== undefined && status !== existingCapa.status) {
      // Yetki kontrolü
      if (!isAdmin(session.user.role)) {
        return NextResponse.json(
          { error: 'Durum değişikliği yapma yetkiniz bulunmamaktadır. Sadece Admin veya Yönetici bu işlemi yapabilir.' },
          { status: 403 }
        );
      }

      updateData.status = status;

      if (status === 'KAPATILDI') {
        updateData.closedAt = new Date();
        updateData.closedById = session.user.id;
      }

      await prisma.cAPAHistory.create({
        data: {
          capaId: id,
          userId: session.user.id,
          action: 'DURUM_DEGISTI',
          oldValue: existingCapa.status,
          newValue: status,
        },
      });
    }

    // Kök neden analizi eklendi
    if (rootCauseAnalysis && !existingCapa.rootCauseAnalysis) {
      await prisma.cAPAHistory.create({
        data: {
          capaId: id,
          userId: session.user.id,
          action: 'KOK_NEDEN_EKLENDI',
          newValue: rootCauseMethod || 'Analiz yapıldı',
        },
      });
    }

    // Etkinlik değerlendirmesi
    if (isEffective !== undefined && existingCapa.isEffective === null) {
      await prisma.cAPAHistory.create({
        data: {
          capaId: id,
          userId: session.user.id,
          action: 'ETKINLIK_DEGERLENDI',
          newValue: isEffective ? 'Etkili' : 'Etkili Değil',
        },
      });
    }

    const capa = await prisma.cAPA.update({
      where: { id },
      data: updateData,
      include: {
        createdBy: { select: { id: true, name: true, surname: true } },
        responsibleUser: { select: { id: true, name: true, surname: true } },
        department: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
        complaint: { select: { id: true, code: true, subject: true } },
      },
    });

    // Sorumlu kişi değişti ise bildirim gönder
    if (responsibleUserId && responsibleUserId !== existingCapa.responsibleUserId && responsibleUserId !== session.user.id) {
      const template = NotificationTemplates.capaAssigned(existingCapa.code);
      await createNotification({
        userId: responsibleUserId,
        title: template.title,
        message: `${existingCapa.code} kodlu "${capa.title}" başlıklı ${capa.type === 'DUZELTICI' ? 'Düzeltici' : 'Önleyici'} Faaliyet size atandı.`,
        type: template.type,
        link: `/dashboard/capas/${id}`,
      });
    }

    // Durum değişikliğinde oluşturan kişiye bildirim gönder
    if (status !== undefined && status !== existingCapa.status && existingCapa.createdById !== session.user.id) {
      const statusLabels: Record<string, string> = {
        'TASLAK': 'Taslak',
        'ACIK': 'Açık',
        'ANALIZ': 'Analiz Aşamasında',
        'UYGULAMA': 'Uygulama Aşamasında',
        'DOGRULAMA': 'Doğrulama Aşamasında',
        'KAPATILDI': 'Kapatıldı',
      };
      await createNotification({
        userId: existingCapa.createdById,
        title: 'CAPA Durumu Değişti',
        message: `${existingCapa.code} kodlu CAPA'nın durumu "${statusLabels[status] || status}" olarak güncellendi.`,
        type: 'BILGI',
        link: `/dashboard/capas/${id}`,
      });
    }

    return NextResponse.json(capa);
  } catch (error) {
    console.error('CAPA güncelleme hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// CAPA Sil (soft delete)
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await context.params;

    await prisma.cAPA.update({
      where: { id },
      data: { isActive: false },
    });

    await prisma.cAPAHistory.create({
      data: {
        capaId: id,
        userId: session.user.id,
        action: 'SILINDI',
        comments: 'CAPA silindi',
      },
    });

    return NextResponse.json({ message: 'CAPA silindi' });
  } catch (error) {
    console.error('CAPA silme hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
