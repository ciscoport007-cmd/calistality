import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const actions = await prisma.sustainabilityAction.findMany({
      where: { targetId: params.id },
      include: {
        assignedTo: { select: { id: true, name: true, surname: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ actions });
  } catch (error) {
    console.error('Actions GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { title, description, assignedToId, dueDate, priority, notes } = body;

    if (!title) {
      return NextResponse.json({ error: 'Başlık zorunludur' }, { status: 400 });
    }

    const action = await prisma.sustainabilityAction.create({
      data: {
        targetId: params.id,
        title,
        description,
        assignedToId: assignedToId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority: priority || 'ORTA',
        notes,
        createdById: session.user.id,
      },
      include: {
        assignedTo: { select: { id: true, name: true, surname: true } },
      },
    });

    return NextResponse.json(action, { status: 201 });
  } catch (error) {
    console.error('Action POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
