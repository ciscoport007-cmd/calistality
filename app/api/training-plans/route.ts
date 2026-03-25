import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth-options';

// GET: Eğitim planlarını listele
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const trainingId = searchParams.get('trainingId');
    const departmentId = searchParams.get('departmentId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (trainingId) {
      where.trainingId = trainingId;
    }

    if (departmentId) {
      where.departmentId = departmentId;
    }

    if (startDate || endDate) {
      where.plannedDate = {};
      if (startDate) {
        where.plannedDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.plannedDate.lte = new Date(endDate);
      }
    }

    const plans = await prisma.trainingPlan.findMany({
      where,
      include: {
        training: { select: { id: true, code: true, name: true, type: true, method: true } },
        instructor: { select: { id: true, name: true, surname: true } },
        department: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
        _count: { select: { records: true } },
      },
      orderBy: { plannedDate: 'desc' },
    });

    return NextResponse.json(plans);
  } catch (error) {
    console.error('Error fetching training plans:', error);
    return NextResponse.json(
      { error: 'Eğitim planları alınırken hata oluştu' },
      { status: 500 }
    );
  }
}

// POST: Yeni eğitim planı oluştur
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const body = await request.json();
    const {
      trainingId,
      title,
      description,
      plannedDate,
      startTime,
      endTime,
      location,
      isOnline,
      onlineLink,
      instructorId,
      externalInstructor,
      departmentId,
      maxParticipants,
      minParticipants,
      cost,
      currency,
      notes,
    } = body;

    if (!trainingId || !title || !plannedDate) {
      return NextResponse.json(
        { error: 'Eğitim, başlık ve tarih zorunludur' },
        { status: 400 }
      );
    }

    // Otomatik kod oluştur (EP-YYYY-NNN)
    const year = new Date().getFullYear();
    const lastPlan = await prisma.trainingPlan.findFirst({
      where: {
        code: {
          startsWith: `EP-${year}-`,
        },
      },
      orderBy: { code: 'desc' },
    });

    let sequence = 1;
    if (lastPlan) {
      const lastSequence = parseInt(lastPlan.code.split('-')[2]);
      sequence = lastSequence + 1;
    }
    const code = `EP-${year}-${String(sequence).padStart(3, '0')}`;

    const plan = await prisma.trainingPlan.create({
      data: {
        code,
        trainingId,
        title,
        description,
        plannedDate: new Date(plannedDate),
        startTime,
        endTime,
        location,
        isOnline: isOnline || false,
        onlineLink,
        instructorId,
        externalInstructor,
        departmentId,
        maxParticipants,
        minParticipants,
        cost: cost ? parseFloat(cost) : null,
        currency: currency || 'TRY',
        notes,
        createdById: session.user.id,
      },
      include: {
        training: { select: { id: true, code: true, name: true, type: true } },
        instructor: { select: { id: true, name: true, surname: true } },
        department: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
      },
    });

    return NextResponse.json(plan, { status: 201 });
  } catch (error) {
    console.error('Error creating training plan:', error);
    return NextResponse.json(
      { error: 'Eğitim planı oluşturulurken hata oluştu' },
      { status: 500 }
    );
  }
}
