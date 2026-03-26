import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { AuditType, AuditStatus } from '@prisma/client';
import { canCreate } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// Denetim listesi
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || '';
    const status = searchParams.get('status') || '';
    const departmentId = searchParams.get('departmentId') || '';
    const supplierId = searchParams.get('supplierId') || '';

    const skip = (page - 1) * limit;

    const where: any = {
      isActive: true,
    };

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (type && type !== 'all') {
      where.type = type as AuditType;
    }

    if (status && status !== 'all') {
      where.status = status as AuditStatus;
    }

    if (departmentId && departmentId !== 'all') {
      where.OR = [
        { departmentId },
        { auditedDepartmentId: departmentId },
      ];
    }

    if (supplierId && supplierId !== 'all') {
      where.supplierId = supplierId;
    }

    const [audits, total] = await Promise.all([
      prisma.audit.findMany({
        where,
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
          supplier: {
            select: { id: true, code: true, name: true }
          },
          createdBy: {
            select: { id: true, name: true, surname: true }
          },
          _count: {
            select: {
              findings: true,
              checklists: true,
              teamMembers: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.audit.count({ where }),
    ]);

    return NextResponse.json({
      audits,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Denetim listesi hatası:', error);
    return NextResponse.json({ error: 'Denetimler yüklenirken hata oluştu' }, { status: 500 });
  }
}

// Yeni denetim oluştur
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    // Yalnızca Admin ve Yönetici rolleri yeni içerik oluşturabilir
    if (!canCreate(session.user?.role)) {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz bulunmamaktadır' }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      description,
      type,
      scope,
      objectives,
      criteria,
      auditedDepartmentId,
      auditedArea,
      leadAuditorId,
      departmentId,
      plannedStartDate,
      plannedEndDate,
      supplierId,
      auditScore,
    } = body;

    if (!title || !type) {
      return NextResponse.json(
        { error: 'Denetim başlığı ve türü zorunludur' },
        { status: 400 }
      );
    }

    // Denetim kodu oluştur: DEN-YYYY-NNNN
    const year = new Date().getFullYear();
    const lastAudit = await prisma.audit.findFirst({
      where: {
        code: {
          startsWith: `DEN-${year}-`,
        },
      },
      orderBy: { code: 'desc' },
    });

    let nextNumber = 1;
    if (lastAudit) {
      const lastNumber = parseInt(lastAudit.code.split('-')[2]);
      nextNumber = lastNumber + 1;
    }
    const code = `DEN-${year}-${nextNumber.toString().padStart(4, '0')}`;

    const audit = await prisma.audit.create({
      data: {
        code,
        title,
        description,
        type: type as AuditType,
        scope,
        objectives,
        criteria,
        auditedDepartmentId: auditedDepartmentId || null,
        auditedArea,
        leadAuditorId: leadAuditorId || null,
        departmentId: departmentId || null,
        plannedStartDate: plannedStartDate ? new Date(plannedStartDate) : null,
        plannedEndDate: plannedEndDate ? new Date(plannedEndDate) : null,
        supplierId: supplierId || null,
        auditScore: auditScore ? parseFloat(auditScore) : null,
        createdById: session.user.id as string,
        histories: {
          create: {
            userId: session.user.id as string,
            action: 'OLUSTURULDU',
            newValue: `Denetim oluşturuldu: ${code}${supplierId ? ' (Tedarikçi Denetimi)' : ''}`,
          },
        },
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
        supplier: {
          select: { id: true, code: true, name: true }
        },
        createdBy: {
          select: { id: true, name: true, surname: true }
        },
      },
    });

    return NextResponse.json(audit, { status: 201 });
  } catch (error) {
    console.error('Denetim oluşturma hatası:', error);
    return NextResponse.json({ error: 'Denetim oluşturulurken hata oluştu' }, { status: 500 });
  }
}
