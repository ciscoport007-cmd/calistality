import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { createNotification, NotificationTemplates } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

// Şikayet detayı
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await params;

    const complaint = await prisma.complaint.findUnique({
      where: { id },
      include: {
        category: true,
        relatedDepartment: true,
        createdBy: {
          select: { id: true, name: true, surname: true, email: true },
        },
        assignedUser: {
          select: { id: true, name: true, surname: true, email: true },
        },
        teamLeader: {
          select: { id: true, name: true, surname: true, email: true },
        },
        assignedTeam: {
          select: { id: true, name: true },
        },
        tasks: {
          include: {
            assignee: {
              select: { id: true, name: true, surname: true },
            },
            createdBy: {
              select: { id: true, name: true, surname: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        histories: {
          include: {
            user: {
              select: { id: true, name: true, surname: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        attachments: {
          include: {
            uploadedBy: {
              select: { id: true, name: true, surname: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!complaint) {
      return NextResponse.json({ error: 'Şikayet bulunamadı' }, { status: 404 });
    }

    return NextResponse.json(complaint);
  } catch (error) {
    console.error('Şikayet detay hatası:', error);
    return NextResponse.json({ error: 'Şikayet alınamadı' }, { status: 500 });
  }
}

// Şikayet güncelle
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const existingComplaint = await prisma.complaint.findUnique({
      where: { id },
    });

    if (!existingComplaint) {
      return NextResponse.json({ error: 'Şikayet bulunamadı' }, { status: 404 });
    }

    const {
      customerName,
      customerEmail,
      customerPhone,
      customerCompany,
      // Otel spesifik alanlar
      guestName,
      roomNumber,
      agency,
      voucherNumber,
      relatedDepartmentId,
      // Diğer alanlar
      subject,
      description,
      details,
      categoryId,
      priority,
      productName,
      orderNumber,
      incidentDate,
      dueDate,
      status,
      assignedUserId,
      teamLeaderId,
      assignedTeamId,
      initialReport,
      finalReport,
      resolution,
    } = body;

    const updateData: Record<string, unknown> = {};

    if (customerName !== undefined) updateData.customerName = customerName;
    if (customerEmail !== undefined) updateData.customerEmail = customerEmail;
    if (customerPhone !== undefined) updateData.customerPhone = customerPhone;
    if (customerCompany !== undefined) updateData.customerCompany = customerCompany;
    // Otel spesifik alanlar
    if (guestName !== undefined) updateData.guestName = guestName;
    if (roomNumber !== undefined) updateData.roomNumber = roomNumber;
    if (agency !== undefined) updateData.agency = agency;
    if (voucherNumber !== undefined) updateData.voucherNumber = voucherNumber;
    if (relatedDepartmentId !== undefined) updateData.relatedDepartmentId = relatedDepartmentId || null;
    // Diğer alanlar
    if (subject !== undefined) updateData.subject = subject;
    if (description !== undefined) updateData.description = description;
    if (details !== undefined) updateData.details = details;
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (priority !== undefined) updateData.priority = priority;
    if (productName !== undefined) updateData.productName = productName;
    if (orderNumber !== undefined) updateData.orderNumber = orderNumber;
    if (incidentDate !== undefined) updateData.incidentDate = incidentDate ? new Date(incidentDate) : null;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;

    // Atama işlemleri
    if (assignedUserId !== undefined) {
      updateData.assignedUserId = assignedUserId;
    }
    if (teamLeaderId !== undefined) {
      updateData.teamLeaderId = teamLeaderId;
    }
    if (assignedTeamId !== undefined) {
      updateData.assignedTeamId = assignedTeamId;
    }

    // Rapor işlemleri
    if (initialReport !== undefined) {
      updateData.initialReport = initialReport;
      updateData.initialReportDate = new Date();
    }
    if (finalReport !== undefined) {
      updateData.finalReport = finalReport;
      updateData.finalReportDate = new Date();
    }

    // Çözüm işlemleri
    if (resolution !== undefined) {
      updateData.resolution = resolution;
      updateData.resolvedAt = new Date();
    }

    // Durum değişikliği
    if (status !== undefined && status !== existingComplaint.status) {
      updateData.status = status;
      if (status === 'KAPATILDI') {
        updateData.closedAt = new Date();
      }

      // Geçmiş kaydı oluştur
      await prisma.complaintHistory.create({
        data: {
          complaintId: id,
          userId: session.user.id,
          action: 'DURUM_DEGISTI',
          oldValue: existingComplaint.status,
          newValue: status,
        },
      });
    }

    const complaint = await prisma.complaint.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        relatedDepartment: true,
        createdBy: {
          select: { id: true, name: true, surname: true },
        },
        assignedUser: {
          select: { id: true, name: true, surname: true },
        },
        teamLeader: {
          select: { id: true, name: true, surname: true },
        },
      },
    });

    // Atanan kişi değişti ise bildirim gönder
    if (assignedUserId && assignedUserId !== existingComplaint.assignedUserId && assignedUserId !== session.user.id) {
      const template = NotificationTemplates.complaintAssigned(existingComplaint.code, existingComplaint.customerName || '');
      await createNotification({
        userId: assignedUserId,
        title: template.title,
        message: `${existingComplaint.code} kodlu "${existingComplaint.subject}" konulu şikayet size atandı.`,
        type: template.type,
        link: `/dashboard/complaints/${id}`,
      });
    }

    // Takım lideri değişti ise bildirim gönder
    if (teamLeaderId && teamLeaderId !== existingComplaint.teamLeaderId && teamLeaderId !== session.user.id) {
      await createNotification({
        userId: teamLeaderId,
        title: 'Şikayet Takım Liderliği Atandı',
        message: `${existingComplaint.code} kodlu "${existingComplaint.subject}" konulu şikayet için takım liderliği size atandı.`,
        type: 'BILGI',
        link: `/dashboard/complaints/${id}`,
      });
    }

    // Durum değişikliğinde oluşturan kişiye bildirim gönder
    if (status !== undefined && status !== existingComplaint.status && existingComplaint.createdById !== session.user.id) {
      const statusLabels: Record<string, string> = {
        'YENI': 'Yeni',
        'INCELENIYOR': 'İnceleniyor',
        'COZUM_BEKLIYOR': 'Çözüm Bekliyor',
        'COZULDU': 'Çözüldü',
        'KAPATILDI': 'Kapatıldı',
      };
      const template = NotificationTemplates.complaintStatusChanged(existingComplaint.code, statusLabels[status] || status);
      await createNotification({
        userId: existingComplaint.createdById,
        title: template.title,
        message: template.message,
        type: template.type,
        link: `/dashboard/complaints/${id}`,
      });
    }

    return NextResponse.json(complaint);
  } catch (error) {
    console.error('Şikayet güncelleme hatası:', error);
    return NextResponse.json({ error: 'Şikayet güncellenemedi' }, { status: 500 });
  }
}

// Şikayet sil (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await params;

    await prisma.complaint.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ message: 'Şikayet silindi' });
  } catch (error) {
    console.error('Şikayet silme hatası:', error);
    return NextResponse.json({ error: 'Şikayet silinemedi' }, { status: 500 });
  }
}
