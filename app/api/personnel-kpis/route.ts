import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const kpiId = searchParams.get('kpiId');
    const year = searchParams.get('year');
    const status = searchParams.get('status');

    const personnelKPIs = await prisma.personnelKPI.findMany({
      where: {
        ...(userId && { userId }),
        ...(kpiId && { kpiId }),
        ...(year && { year: parseInt(year) }),
        ...(status && { status: status as any }),
      },
      include: {
        kpi: {
          include: {
            category: true,
            department: true,
          },
        },
        user: {
          select: { id: true, name: true, email: true, department: true, position: true },
        },
        measurements: {
          orderBy: { measurementDate: 'desc' },
          take: 5,
        },
        createdBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ year: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json(personnelKPIs);
  } catch (error) {
    console.error('Error fetching personnel KPIs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { kpiId, userId, year, periodType, weight, targetValue, notes } = body;

    if (!kpiId || !userId || !year) {
      return NextResponse.json({ error: 'KPI, kullanıcı ve yıl bilgisi gereklidir' }, { status: 400 });
    }

    // Mevcut atamayı kontrol et
    const existing = await prisma.personnelKPI.findFirst({
      where: { kpiId, userId, year, periodType: periodType || 'YILLIK' },
    });

    if (existing) {
      return NextResponse.json({ error: 'Bu KPI bu kullanıcıya zaten atanmış' }, { status: 400 });
    }

    const personnelKPI = await prisma.personnelKPI.create({
      data: {
        kpiId,
        userId,
        year,
        periodType: periodType || 'YILLIK',
        weight: weight || 1.0,
        targetValue,
        notes,
        createdById: session.user.id,
      },
      include: {
        kpi: { include: { category: true } },
        user: { select: { id: true, name: true, email: true, department: true, position: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(personnelKPI, { status: 201 });
  } catch (error) {
    console.error('Error creating personnel KPI:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
