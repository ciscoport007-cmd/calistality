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
    const category = searchParams.get('category');
    const status = searchParams.get('status');

    const targets = await prisma.sustainabilityTarget.findMany({
      where: {
        ...(category && { category }),
        ...(status && { status }),
      },
      include: {
        actions: {
          include: {
            assignedTo: { select: { id: true, name: true, surname: true } },
          },
        },
        createdBy: { select: { id: true, name: true, surname: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ targets });
  } catch (error) {
    console.error('Targets GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { title, category, metricType, baselineValue, targetValue, targetUnit, reductionPct, period, startDate, endDate } = body;

    if (!title || !category || !metricType || baselineValue === undefined || targetValue === undefined) {
      return NextResponse.json({ error: 'Zorunlu alanlar eksik' }, { status: 400 });
    }

    const year = new Date().getFullYear();
    const last = await prisma.sustainabilityTarget.findFirst({
      where: { code: { startsWith: `HDF-${year}-` } },
      orderBy: { code: 'desc' },
    });
    const nextNum = last ? parseInt(last.code.split('-')[2]) + 1 : 1;
    const code = `HDF-${year}-${nextNum.toString().padStart(4, '0')}`;

    const target = await prisma.sustainabilityTarget.create({
      data: {
        code,
        title,
        category,
        metricType,
        baselineValue: parseFloat(baselineValue),
        targetValue: parseFloat(targetValue),
        targetUnit: targetUnit || '%',
        reductionPct: parseFloat(reductionPct || 0),
        period: period || 'YILLIK',
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        createdById: session.user.id,
      },
    });

    return NextResponse.json(target, { status: 201 });
  } catch (error) {
    console.error('Target POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
