import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const isResolved = searchParams.get('isResolved');
    const skip = (page - 1) * limit;

    const where = {
      ...(isResolved !== null && isResolved !== undefined && { isResolved: isResolved === 'true' }),
    };

    const [alerts, total] = await Promise.all([
      prisma.sustainabilityAlert.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.sustainabilityAlert.count({ where }),
    ]);

    return NextResponse.json({
      alerts,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Alerts GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, action } = body;

    if (action === 'resolve') {
      const alert = await prisma.sustainabilityAlert.update({
        where: { id },
        data: {
          isResolved: true,
          resolvedById: session.user.id,
          resolvedAt: new Date(),
        },
      });
      return NextResponse.json(alert);
    }

    if (action === 'read') {
      const alert = await prisma.sustainabilityAlert.update({
        where: { id },
        data: { isRead: true },
      });
      return NextResponse.json(alert);
    }

    return NextResponse.json({ error: 'Geçersiz aksiyon' }, { status: 400 });
  } catch (error) {
    console.error('Alert PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
