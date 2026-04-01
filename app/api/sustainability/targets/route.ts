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

    if (!title || !category) {
      return NextResponse.json({ error: 'Başlık ve kategori zorunludur' }, { status: 400 });
    }

    const parsedBaseline = baselineValue !== '' && baselineValue != null ? parseFloat(baselineValue) : 0;
    const parsedTarget = targetValue !== '' && targetValue != null ? parseFloat(targetValue) : 0;
    const parsedReduction = reductionPct !== '' && reductionPct != null ? parseFloat(reductionPct) : 0;

    if (isNaN(parsedBaseline) || isNaN(parsedTarget) || isNaN(parsedReduction)) {
      return NextResponse.json({ error: 'Sayısal alanlara geçerli değer girin' }, { status: 400 });
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
        metricType: metricType || '',
        baselineValue: parsedBaseline,
        targetValue: parsedTarget,
        targetUnit: targetUnit || '%',
        reductionPct: parsedReduction,
        period: period || 'YILLIK',
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : new Date(new Date().getFullYear(), 11, 31),
        createdById: session.user.id,
      },
    });

    return NextResponse.json(target, { status: 201 });
  } catch (error) {
    console.error('Target POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
