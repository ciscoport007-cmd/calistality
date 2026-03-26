import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { createAuditLog, canCreate } from '@/lib/audit';
import { notifyByDepartment } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

// Şikayet kodu oluştur
async function generateComplaintCode(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.complaint.count({
    where: {
      code: {
        startsWith: `SK-${year}`,
      },
    },
  });
  const nextNum = (count + 1).toString().padStart(4, '0');
  return `SK-${year}-${nextNum}`;
}

// Şikayetleri listele
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const categoryId = searchParams.get('categoryId');
    const priority = searchParams.get('priority');
    const search = searchParams.get('search');

    const where: Record<string, unknown> = { isActive: true };

    if (status) {
      where.status = status;
    }
    if (categoryId) {
      where.categoryId = categoryId;
    }
    if (priority) {
      where.priority = priority;
    }
    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } },
      ];
    }

    const complaints = await prisma.complaint.findMany({
      where,
      include: {
        category: true,
        relatedDepartment: true,
        complaintDepartments: {
          include: {
            department: { select: { id: true, name: true } },
          },
        },
        createdBy: {
          select: { id: true, name: true, surname: true },
        },
        assignedUser: {
          select: { id: true, name: true, surname: true },
        },
        teamLeader: {
          select: { id: true, name: true, surname: true },
        },
        assignedTeam: {
          select: { id: true, name: true },
        },
        _count: {
          select: { tasks: true, attachments: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(complaints);
  } catch (error) {
    console.error('Şikayet listesi hatası:', error);
    return NextResponse.json({ error: 'Şikayetler alınamadı' }, { status: 500 });
  }
}

// Yeni şikayet oluştur
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    // Yalnızca Admin ve Yönetici rolleri yeni içerik oluşturabilir
    if (!canCreate(session.user?.role)) {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz bulunmamaktadır' }, { status: 403 });
    }

    const body = await request.json();
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
      relatedDepartmentIds,
      // Diğer alanlar
      subject,
      description,
      details,
      categoryId,
      priority,
      productName,
      incidentDate,
      incidentTime,
      incidentLocation,
      dueDate,
    } = body;

    if (!customerName || !subject || !description) {
      return NextResponse.json(
        { error: 'Misafir adı, konu ve açıklama zorunludur' },
        { status: 400 }
      );
    }

    const code = await generateComplaintCode();

    const complaint = await prisma.complaint.create({
      data: {
        code,
        customerName,
        customerEmail,
        customerPhone,
        customerCompany,
        // Otel spesifik alanlar
        guestName,
        roomNumber,
        agency,
        voucherNumber,
        relatedDepartmentId: relatedDepartmentId || null,
        // Olay bilgileri
        incidentLocation: incidentLocation || null,
        incidentTime: incidentTime || null,
        // Diğer alanlar
        subject,
        description,
        details,
        categoryId: categoryId || null,
        priority: priority || 'ORTA',
        productName,
        incidentDate: incidentDate ? new Date(incidentDate) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        createdById: session.user.id,
      },
      include: {
        category: true,
        relatedDepartment: true,
        createdBy: {
          select: { id: true, name: true, surname: true },
        },
      },
    });

    // Çoklu departman ilişkisi oluştur
    const deptIds: string[] = Array.isArray(relatedDepartmentIds) ? relatedDepartmentIds : [];
    if (deptIds.length > 0) {
      await prisma.complaintDepartment.createMany({
        data: deptIds.map((departmentId: string) => ({
          complaintId: complaint.id,
          departmentId,
        })),
        skipDuplicates: true,
      });
    }

    // Yüksek/Acil öncelik bildirimi
    if (priority === 'YUKSEK' || priority === 'ACIL') {
      const notifyDeptIds = deptIds.length > 0 ? deptIds : (relatedDepartmentId ? [relatedDepartmentId] : []);
      for (const deptId of notifyDeptIds) {
        await notifyByDepartment(deptId, {
          title: `⚠️ ${priority === 'ACIL' ? 'ACİL' : 'Yüksek Öncelikli'} Misafir Şikayeti`,
          message: `${code} kodlu ${priority === 'ACIL' ? 'ACİL' : 'yüksek öncelikli'} misafir şikayeti oluşturuldu. Konu: ${subject}`,
          type: 'UYARI',
          link: `/dashboard/complaints/${complaint.id}`,
        });
      }
    }

    // Geçmiş kaydı oluştur
    await prisma.complaintHistory.create({
      data: {
        complaintId: complaint.id,
        userId: session.user.id,
        action: 'OLUSTURULDU',
        newValue: 'YENI',
        comments: 'Şikayet kaydı oluşturuldu',
      },
    });

    // Audit log
    await createAuditLog({
      userId: session.user.id,
      action: 'CREATE',
      module: 'COMPLAINTS',
      entityType: 'Complaint',
      entityId: complaint.id,
      newValues: { code, customerName, subject, status: 'YENI', priority: priority || 'ORTA' },
    });

    return NextResponse.json(complaint, { status: 201 });
  } catch (error) {
    console.error('Şikayet oluşturma hatası:', error);
    return NextResponse.json({ error: 'Şikayet oluşturulamadı' }, { status: 500 });
  }
}
