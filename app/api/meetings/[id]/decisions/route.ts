import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 });
    }

    const decisions = await prisma.meetingDecision.findMany({
      where: { meetingId: params.id },
      include: {
        assignee: { select: { id: true, name: true, surname: true, email: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(decisions);
  } catch (error) {
    console.error('Decisions fetch error:', error);
    return NextResponse.json({ error: 'Kararlar getirilemedi' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 });
    }

    const body = await request.json();
    const { decision, assigneeId, dueDate } = body;

    if (!decision) {
      return NextResponse.json({ error: 'Karar metni zorunludur' }, { status: 400 });
    }

    const newDecision = await prisma.meetingDecision.create({
      data: {
        meetingId: params.id,
        decision,
        assigneeId: assigneeId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        createdById: session.user.id,
      },
      include: {
        assignee: { select: { id: true, name: true, surname: true, email: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
      },
    });

    return NextResponse.json(newDecision, { status: 201 });
  } catch (error) {
    console.error('Decision create error:', error);
    return NextResponse.json({ error: 'Karar oluşturulamadı' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 });
    }

    const body = await request.json();
    const { decisionId, status } = body;

    if (!decisionId || !status) {
      return NextResponse.json({ error: 'Karar ID ve durum zorunludur' }, { status: 400 });
    }

    const updated = await prisma.meetingDecision.update({
      where: { id: decisionId },
      data: { status },
      include: {
        assignee: { select: { id: true, name: true, surname: true, email: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Decision update error:', error);
    return NextResponse.json({ error: 'Karar güncellenemedi' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const decisionId = searchParams.get('decisionId');

    if (!decisionId) {
      return NextResponse.json({ error: 'Karar ID zorunludur' }, { status: 400 });
    }

    await prisma.meetingDecision.delete({ where: { id: decisionId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Decision delete error:', error);
    return NextResponse.json({ error: 'Karar silinemedi' }, { status: 500 });
  }
}
