import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { canCreate } from '@/lib/audit';
import { createNotification, NotificationTemplates } from '@/lib/notifications';

// CAPA Listesi
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const source = searchParams.get('source');
    const priority = searchParams.get('priority');
    const search = searchParams.get('search');
    const departmentId = searchParams.get('departmentId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: any = { isActive: true };

    if (status) where.status = status;
    if (type) where.type = type;
    if (source) where.source = source;
    if (priority) where.priority = priority;
    if (departmentId) where.departmentId = departmentId;

    // Tarih filtresi
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        // End date'e günün sonunu ekle
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [capas, total] = await Promise.all([
      prisma.cAPA.findMany({
        where,
        include: {
          createdBy: { select: { id: true, name: true, surname: true } },
          responsibleUser: { select: { id: true, name: true, surname: true } },
          department: { select: { id: true, name: true } },
          team: { select: { id: true, name: true } },
          complaint: { select: { id: true, code: true, subject: true } },
          _count: { select: { actions: true, attachments: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.cAPA.count({ where }),
    ]);

    return NextResponse.json({
      capas,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('CAPA listesi hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// CAPA Oluştur
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
      source,
      priority,
      complaintId,
      sourceReference,
      sourceDetails,
      responsibleUserId,
      teamId,
      departmentId,
      dueDate,
    } = body;

    // Kod oluştur: DOF-YYYY-NNNN
    const year = new Date().getFullYear();
    const lastCapa = await prisma.cAPA.findFirst({
      where: { code: { startsWith: `DOF-${year}` } },
      orderBy: { code: 'desc' },
    });

    let nextNumber = 1;
    if (lastCapa) {
      const lastNumber = parseInt(lastCapa.code.split('-')[2]);
      nextNumber = lastNumber + 1;
    }
    const code = `DOF-${year}-${String(nextNumber).padStart(4, '0')}`;

    const capa = await prisma.cAPA.create({
      data: {
        code,
        title,
        description,
        type,
        source,
        priority: priority || 'ORTA',
        complaintId: complaintId || undefined,
        sourceReference,
        sourceDetails,
        responsibleUserId: responsibleUserId || undefined,
        teamId: teamId || undefined,
        departmentId: departmentId || undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        createdById: session.user.id,
        status: 'TASLAK',
      },
      include: {
        createdBy: { select: { id: true, name: true, surname: true } },
        responsibleUser: { select: { id: true, name: true, surname: true } },
        department: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
        complaint: { select: { id: true, code: true, subject: true } },
      },
    });

    // Tarihçe kaydı
    await prisma.cAPAHistory.create({
      data: {
        capaId: capa.id,
        userId: session.user.id,
        action: 'OLUSTURULDU',
        newValue: code,
        comments: `${type} türünde CAPA oluşturuldu`,
      },
    });

    // Sorumlu kişiye bildirim gönder
    if (responsibleUserId && responsibleUserId !== session.user.id) {
      const template = NotificationTemplates.capaAssigned(code);
      await createNotification({
        userId: responsibleUserId,
        title: template.title,
        message: `${code} kodlu "${title}" başlıklı ${type === 'DUZELTICI' ? 'Düzeltici' : 'Önleyici'} Faaliyet size atandı.`,
        type: template.type,
        link: `/dashboard/capas/${capa.id}`,
      });
    }

    return NextResponse.json(capa, { status: 201 });
  } catch (error) {
    console.error('CAPA oluşturma hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
