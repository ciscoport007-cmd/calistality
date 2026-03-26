import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { AuditStatus } from '@prisma/client';
import { getFileUrl } from '@/lib/storage';

export const dynamic = 'force-dynamic';

// Denetim detayı
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

    const audit = await prisma.audit.findUnique({
      where: { id },
      include: {
        leadAuditor: {
          select: { id: true, name: true, surname: true, email: true }
        },
        department: {
          select: { id: true, name: true }
        },
        auditedDepartment: {
          select: { id: true, name: true }
        },
        createdBy: {
          select: { id: true, name: true, surname: true }
        },
        teamMembers: {
          include: {
            user: {
              select: { id: true, name: true, surname: true, email: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        },
        checklists: {
          orderBy: { sortOrder: 'asc' }
        },
        findings: {
          include: {
            assignee: {
              select: { id: true, name: true, surname: true }
            },
            createdBy: {
              select: { id: true, name: true, surname: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        histories: {
          include: {
            user: {
              select: { id: true, name: true, surname: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        attachments: {
          include: {
            uploadedBy: {
              select: { id: true, name: true, surname: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
      },
    });

    if (!audit) {
      return NextResponse.json({ error: 'Denetim bulunamadı' }, { status: 404 });
    }

    // Ek dosyalar için URL oluştur
    const attachmentsWithUrls = await Promise.all(
      (audit.attachments || []).map(async (att: any) => {
        if (att.cloudStoragePath) {
          const url = await getFileUrl(att.cloudStoragePath, att.isPublic ?? false);
          return { ...att, url };
        }
        return att;
      })
    );

    return NextResponse.json({ ...audit, attachments: attachmentsWithUrls });
  } catch (error) {
    console.error('Denetim detay hatası:', error);
    return NextResponse.json({ error: 'Denetim yüklenirken hata oluştu' }, { status: 500 });
  }
}

// Denetim güncelle
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

    const existingAudit = await prisma.audit.findUnique({
      where: { id },
    });

    if (!existingAudit) {
      return NextResponse.json({ error: 'Denetim bulunamadı' }, { status: 404 });
    }

    const {
      title,
      description,
      status,
      scope,
      objectives,
      criteria,
      auditedDepartmentId,
      auditedArea,
      leadAuditorId,
      departmentId,
      plannedStartDate,
      plannedEndDate,
      actualStartDate,
      actualEndDate,
      openingMeetingDate,
      openingMeetingNotes,
      closingMeetingDate,
      closingMeetingNotes,
      auditReport,
      reportDate,
      conclusions,
      recommendations,
    } = body;

    // Tarih dönüşümleri
    const dateFields: Record<string, Date | null> = {};
    if (plannedStartDate !== undefined) dateFields.plannedStartDate = plannedStartDate ? new Date(plannedStartDate) : null;
    if (plannedEndDate !== undefined) dateFields.plannedEndDate = plannedEndDate ? new Date(plannedEndDate) : null;
    if (actualStartDate !== undefined) dateFields.actualStartDate = actualStartDate ? new Date(actualStartDate) : null;
    if (actualEndDate !== undefined) dateFields.actualEndDate = actualEndDate ? new Date(actualEndDate) : null;
    if (openingMeetingDate !== undefined) dateFields.openingMeetingDate = openingMeetingDate ? new Date(openingMeetingDate) : null;
    if (closingMeetingDate !== undefined) dateFields.closingMeetingDate = closingMeetingDate ? new Date(closingMeetingDate) : null;
    if (reportDate !== undefined) dateFields.reportDate = reportDate ? new Date(reportDate) : null;

    // History kaydı
    const historyEntries = [];
    if (status && status !== existingAudit.status) {
      historyEntries.push({
        userId: session.user.id as string,
        action: 'DURUM_DEGISTI',
        oldValue: existingAudit.status,
        newValue: status,
      });
    }

    const audit = await prisma.audit.update({
      where: { id },
      data: {
        title: title ?? existingAudit.title,
        description: description !== undefined ? description : existingAudit.description,
        status: status ? (status as AuditStatus) : existingAudit.status,
        scope: scope !== undefined ? scope : existingAudit.scope,
        objectives: objectives !== undefined ? objectives : existingAudit.objectives,
        criteria: criteria !== undefined ? criteria : existingAudit.criteria,
        auditedDepartmentId: auditedDepartmentId !== undefined ? (auditedDepartmentId || null) : existingAudit.auditedDepartmentId,
        auditedArea: auditedArea !== undefined ? auditedArea : existingAudit.auditedArea,
        leadAuditorId: leadAuditorId !== undefined ? (leadAuditorId || null) : existingAudit.leadAuditorId,
        departmentId: departmentId !== undefined ? (departmentId || null) : existingAudit.departmentId,
        openingMeetingNotes: openingMeetingNotes !== undefined ? openingMeetingNotes : existingAudit.openingMeetingNotes,
        closingMeetingNotes: closingMeetingNotes !== undefined ? closingMeetingNotes : existingAudit.closingMeetingNotes,
        auditReport: auditReport !== undefined ? auditReport : existingAudit.auditReport,
        conclusions: conclusions !== undefined ? conclusions : existingAudit.conclusions,
        recommendations: recommendations !== undefined ? recommendations : existingAudit.recommendations,
        ...dateFields,
        histories: historyEntries.length > 0 ? {
          create: historyEntries,
        } : undefined,
      },
      include: {
        leadAuditor: {
          select: { id: true, name: true, surname: true, email: true }
        },
        department: {
          select: { id: true, name: true }
        },
        auditedDepartment: {
          select: { id: true, name: true }
        },
        createdBy: {
          select: { id: true, name: true, surname: true }
        },
      },
    });

    return NextResponse.json(audit);
  } catch (error) {
    console.error('Denetim güncelleme hatası:', error);
    return NextResponse.json({ error: 'Denetim güncellenirken hata oluştu' }, { status: 500 });
  }
}

// Denetim sil (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await params;

    const audit = await prisma.audit.findUnique({
      where: { id },
    });

    if (!audit) {
      return NextResponse.json({ error: 'Denetim bulunamadı' }, { status: 404 });
    }

    await prisma.audit.update({
      where: { id },
      data: {
        isActive: false,
        histories: {
          create: {
            userId: session.user.id as string,
            action: 'SILINDI',
            comments: 'Denetim silindi',
          },
        },
      },
    });

    return NextResponse.json({ message: 'Denetim silindi' });
  } catch (error) {
    console.error('Denetim silme hatası:', error);
    return NextResponse.json({ error: 'Denetim silinirken hata oluştu' }, { status: 500 });
  }
}
