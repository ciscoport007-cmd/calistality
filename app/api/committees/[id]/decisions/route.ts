import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

// GET - Komiteye ait kararları getir
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decisions = await prisma.committeeDecision.findMany({
      where: { committeeId: params.id },
      include: {
        meeting: { select: { id: true, title: true, date: true, code: true } },
        responsibleDepartment: { select: { id: true, name: true } },
        responsibleUser: { select: { id: true, name: true, surname: true, email: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(decisions);
  } catch (error) {
    console.error('Committee decisions fetch error:', error);
    return NextResponse.json({ error: 'Kararlar getirilirken hata oluştu' }, { status: 500 });
  }
}

// POST - Yeni karar ekle
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      title, description, meetingId, meetingDate, dueDate,
      responsibleDepartmentId, responsibleUserId, status
    } = body;

    if (!title) {
      return NextResponse.json({ error: 'Karar başlığı zorunludur' }, { status: 400 });
    }

    // Karar numarası üret
    const year = new Date().getFullYear();
    const lastDecision = await prisma.committeeDecision.findFirst({
      where: { decisionNumber: { startsWith: `KRR-${year}` } },
      orderBy: { decisionNumber: 'desc' },
      select: { decisionNumber: true },
    });
    let nextNum = 1;
    if (lastDecision) {
      const num = parseInt(lastDecision.decisionNumber.split('-')[2]);
      if (!isNaN(num)) nextNum = num + 1;
    }
    const decisionNumber = `KRR-${year}-${String(nextNum).padStart(4, '0')}`;

    const decision = await prisma.committeeDecision.create({
      data: {
        decisionNumber,
        committeeId: params.id,
        title,
        description: description || null,
        meetingId: meetingId || null,
        meetingDate: meetingDate ? new Date(meetingDate) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        responsibleDepartmentId: responsibleDepartmentId || null,
        responsibleUserId: responsibleUserId || null,
        status: status || 'BEKLEMEDE',
        createdById: session.user.id,
      },
      include: {
        meeting: { select: { id: true, title: true, date: true, code: true } },
        responsibleDepartment: { select: { id: true, name: true } },
        responsibleUser: { select: { id: true, name: true, surname: true, email: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
      },
    });

    return NextResponse.json(decision, { status: 201 });
  } catch (error) {
    console.error('Committee decision create error:', error);
    return NextResponse.json({ error: 'Karar oluşturulurken hata oluştu' }, { status: 500 });
  }
}

// PUT - Karar güncelle
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { decisionId, status, completionNotes, dueDate, responsibleDepartmentId, responsibleUserId } = body;

    if (!decisionId) {
      return NextResponse.json({ error: 'decisionId zorunludur' }, { status: 400 });
    }

    const updateData: any = {};
    if (status !== undefined) {
      updateData.status = status;
      if (status === 'TAMAMLANDI') updateData.completedAt = new Date();
    }
    if (completionNotes !== undefined) updateData.completionNotes = completionNotes;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (responsibleDepartmentId !== undefined) updateData.responsibleDepartmentId = responsibleDepartmentId || null;
    if (responsibleUserId !== undefined) updateData.responsibleUserId = responsibleUserId || null;

    const decision = await prisma.committeeDecision.update({
      where: { id: decisionId },
      data: updateData,
      include: {
        meeting: { select: { id: true, title: true, date: true, code: true } },
        responsibleDepartment: { select: { id: true, name: true } },
        responsibleUser: { select: { id: true, name: true, surname: true, email: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
      },
    });

    return NextResponse.json(decision);
  } catch (error) {
    console.error('Committee decision update error:', error);
    return NextResponse.json({ error: 'Karar güncellenirken hata oluştu' }, { status: 500 });
  }
}
