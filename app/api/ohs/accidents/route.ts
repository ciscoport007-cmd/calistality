import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { createNotification } from '@/lib/notifications';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status');
    const departmentId = searchParams.get('departmentId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = { isActive: true };

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status) where.status = status;
    if (departmentId) where.departmentId = departmentId;
    if (startDate) where.accidentDate = { ...where.accidentDate, gte: new Date(startDate) };
    if (endDate) where.accidentDate = { ...where.accidentDate, lte: new Date(endDate) };

    const accidents = await prisma.oHSAccident.findMany({
      where,
      include: {
        department: { select: { id: true, name: true, code: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
        involvedPersons: {
          include: {
            user: { select: { id: true, name: true, surname: true } },
            personDepartment: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { accidentDate: 'desc' },
    });

    return NextResponse.json(accidents);
  } catch (error) {
    console.error('OHS accidents fetch error:', error);
    return NextResponse.json({ error: 'Kazalar alınamadı' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { role: true },
    });

    const allowedRoles = ['Admin', 'Yönetici', 'İSG Uzmanı', 'İş Güvenliği Uzmanı', 'Kalite Müdürü'];
    if (!user?.role || !allowedRoles.some(r => user.role?.name.includes(r))) {
      return NextResponse.json({ error: 'Sadece İSG Uzmanları kaza kaydı oluşturabilir' }, { status: 403 });
    }

    const body = await request.json();
    const {
      title, accidentDate, location, departmentId, description,
      rootCauseAnalysis, actionsTaken, preventiveMeasures,
      evidenceFileName, evidenceFileSize, evidenceFileType,
      evidenceCloudPath, evidenceIsPublic, involvedPersons,
    } = body;

    if (!title || !accidentDate || !location || !departmentId || !description) {
      return NextResponse.json({ error: 'Zorunlu alanlar eksik' }, { status: 400 });
    }

    if (!evidenceCloudPath) {
      return NextResponse.json({ error: 'Kanıt dokümanı zorunludur' }, { status: 400 });
    }

    const year = new Date().getFullYear();
    const lastAccident = await prisma.oHSAccident.findFirst({
      where: { code: { startsWith: `KAZ-${year}` } },
      orderBy: { code: 'desc' },
    });

    let nextNumber = 1;
    if (lastAccident) {
      const lastNumber = parseInt(lastAccident.code.split('-')[2]);
      nextNumber = lastNumber + 1;
    }
    const code = `KAZ-${year}-${nextNumber.toString().padStart(4, '0')}`;

    const accident = await prisma.oHSAccident.create({
      data: {
        code,
        title,
        accidentDate: new Date(accidentDate),
        location,
        departmentId,
        description,
        rootCauseAnalysis,
        actionsTaken,
        preventiveMeasures,
        evidenceFileName,
        evidenceFileSize,
        evidenceFileType,
        evidenceCloudPath,
        evidenceIsPublic: evidenceIsPublic || false,
        createdById: session.user.id,
        involvedPersons: {
          create: involvedPersons?.map((p: any) => ({
            externalName: p.externalName || null,
            duty: p.duty || null,
            position: p.position || null,
            personDepartmentId: p.personDepartmentId || null,
            tcKimlikNo: p.tcKimlikNo || null,
            birthDate: p.birthDate ? new Date(p.birthDate) : null,
            shift: p.shift || null,
            retrainingReceived: p.retrainingReceived || false,
            retrainingDate: p.retrainingDate ? new Date(p.retrainingDate) : null,
            retrainingNotes: p.retrainingNotes || null,
            sickLeaveDays: p.sickLeaveDays ? parseInt(p.sickLeaveDays) : null,
            disabilityStatus: p.disabilityStatus || null,
            disabilityRate: p.disabilityRate ? parseInt(p.disabilityRate) : null,
            disabilityNotes: p.disabilityNotes || null,
            notes: p.notes || null,
          })) || [],
        },
      },
      include: {
        department: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
        involvedPersons: {
          include: {
            personDepartment: { select: { id: true, name: true } },
          },
        },
      },
    });

    // Yöneticilere bildirim
    const managers = await prisma.user.findMany({
      where: {
        isActive: true,
        role: { name: { in: ['Genel Müdür', 'Kalite Müdürü', 'İnsan Kaynakları Müdürü', 'İSG Uzmanı'] } },
      },
    });

    for (const manager of managers) {
      if (manager.id !== session.user.id) {
        await createNotification({
          userId: manager.id,
          type: 'HATA',
          title: 'Yeni İş Kazası Bildirimi',
          message: `${title} - ${location} - ${new Date(accidentDate).toLocaleDateString('tr-TR')}`,
          link: `/dashboard/ohs/accidents/${accident.id}`,
        });
      }
    }

    return NextResponse.json(accident, { status: 201 });
  } catch (error) {
    console.error('OHS accident create error:', error);
    return NextResponse.json({ error: 'Kaza kaydı oluşturulamadı' }, { status: 500 });
  }
}
