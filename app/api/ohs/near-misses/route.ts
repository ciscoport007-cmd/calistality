import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { createNotification } from '@/lib/notifications';
import { getDepartmentFilterWithNull, isAdmin } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// Ramak Kala listesi
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz eri\u015fim' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status');
    const departmentId = searchParams.get('departmentId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const userRole = session.user.role;
    const departmentFilter = getDepartmentFilterWithNull(session.user.departmentId, userRole);
    const where: any = { isActive: true, ...departmentFilter };

    // Admin ise URL param'dan departman filtresi uygulanabilir
    if (isAdmin(userRole) && departmentId) where.departmentId = departmentId;

    if (status) where.status = status;

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { reporterName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (startDate) {
      where.eventDate = {
        ...where.eventDate,
        gte: new Date(startDate),
      };
    }

    if (endDate) {
      where.eventDate = {
        ...where.eventDate,
        lte: new Date(endDate),
      };
    }

    const nearMisses = await prisma.oHSNearMiss.findMany({
      where,
      include: {
        department: { select: { id: true, name: true, code: true } },
        reporter: { select: { id: true, name: true, surname: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
      },
      orderBy: { eventDate: 'desc' },
    });

    return NextResponse.json(nearMisses);
  } catch (error) {
    console.error('OHS near misses fetch error:', error);
    return NextResponse.json(
      { error: 'Ramak kala kay\u0131tlar\u0131 al\u0131namad\u0131' },
      { status: 500 }
    );
  }
}

// Yeni ramak kala kayd\u0131 olu\u015ftur
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz eri\u015fim' }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      eventDate,
      departmentId,
      description,
      reporterName,
      potentialConsequence,
      suggestedMeasure,
      responsibleName,
      responsibleNote,
      evidenceFileName,
      evidenceFileSize,
      evidenceFileType,
      evidenceCloudPath,
      evidenceIsPublic,
    } = body;

    // Validasyon
    if (!title || !eventDate || !departmentId || !description) {
      return NextResponse.json(
        { error: 'Zorunlu alanlar eksik' },
        { status: 400 }
      );
    }

    // Kod olu\u015ftur
    const year = new Date().getFullYear();
    const lastNearMiss = await prisma.oHSNearMiss.findFirst({
      where: { code: { startsWith: `RMK-${year}` } },
      orderBy: { code: 'desc' },
    });

    let nextNumber = 1;
    if (lastNearMiss) {
      const lastNumber = parseInt(lastNearMiss.code.split('-')[2]);
      nextNumber = lastNumber + 1;
    }
    const code = `RMK-${year}-${nextNumber.toString().padStart(4, '0')}`;

    const nearMiss = await prisma.oHSNearMiss.create({
      data: {
        code,
        title,
        eventDate: new Date(eventDate),
        departmentId,
        description,
        reporterName: reporterName || null,
        potentialConsequence: potentialConsequence || null,
        suggestedMeasure: suggestedMeasure || null,
        responsibleName: responsibleName || null,
        responsibleNote: responsibleNote || null,
        evidenceFileName,
        evidenceFileSize,
        evidenceFileType,
        evidenceCloudPath,
        evidenceIsPublic: evidenceIsPublic || false,
        createdById: session.user.id,
      },
      include: {
        department: { select: { id: true, name: true } },
        reporter: { select: { id: true, name: true, surname: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
      },
    });

    // \u0130SG uzmanlar\u0131na bildirim g\u00f6nder
    const ohsExperts = await prisma.user.findMany({
      where: {
        isActive: true,
        role: {
          name: {
            in: ['\u0130SG Uzman\u0131', '\u0130\u015f G\u00fcvenli\u011fi Uzman\u0131', 'Kalite M\u00fcd\u00fcr\u00fc'],
          },
        },
      },
    });

    for (const expert of ohsExperts) {
      if (expert.id !== session.user.id) {
        await createNotification({
          userId: expert.id,
          type: 'UYARI',
          title: 'Yeni Ramak Kala Bildirimi',
          message: `${title} - ${nearMiss.department?.name || ''} - ${new Date(eventDate).toLocaleDateString('tr-TR')}`,
          link: `/dashboard/ohs/near-misses/${nearMiss.id}`,
        });
      }
    }

    return NextResponse.json(nearMiss, { status: 201 });
  } catch (error) {
    console.error('OHS near miss create error:', error);
    return NextResponse.json(
      { error: 'Ramak kala kayd\u0131 olu\u015fturulamad\u0131' },
      { status: 500 }
    );
  }
}
