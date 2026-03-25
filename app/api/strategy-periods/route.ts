import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth-options';

// GET - Tüm strateji dönemlerini listele
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    const periods = await prisma.strategyPeriod.findMany({
      where,
      include: {
        mission: true,
        vision: true,
        perspectives: {
          orderBy: { sortOrder: 'asc' },
        },
        objectives: {
          include: {
            perspective: true,
            goals: {
              include: {
                subGoals: true,
                actions: true,
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(periods);
  } catch (error) {
    console.error('Error fetching strategy periods:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Yeni strateji dönemi oluştur
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, startDate, endDate, missionContent, visionContent, visionTargetYear } = body;

    // Kod oluştur (SP-YYYY)
    const year = new Date(startDate).getFullYear();
    const existingPeriod = await prisma.strategyPeriod.findFirst({
      where: { code: { startsWith: `SP-${year}` } },
      orderBy: { code: 'desc' },
    });

    let code = `SP-${year}`;
    if (existingPeriod) {
      const suffix = existingPeriod.code.split('-')[2];
      if (suffix) {
        code = `SP-${year}-${(parseInt(suffix) + 1).toString().padStart(2, '0')}`;
      } else {
        code = `SP-${year}-02`;
      }
    }

    // Misyon oluştur
    let mission = null;
    if (missionContent) {
      mission = await prisma.mission.create({
        data: {
          content: missionContent,
          createdById: session.user.id,
        },
      });
    }

    // Vizyon oluştur
    let vision = null;
    if (visionContent) {
      vision = await prisma.vision.create({
        data: {
          content: visionContent,
          targetYear: visionTargetYear ? parseInt(visionTargetYear) : null,
          createdById: session.user.id,
        },
      });
    }

    // Dönem oluştur
    const period = await prisma.strategyPeriod.create({
      data: {
        code,
        name,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        missionId: mission?.id,
        visionId: vision?.id,
        createdById: session.user.id,
      },
      include: {
        mission: true,
        vision: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Varsayılan BSC perspektiflerini oluştur
    const defaultPerspectives = [
      { code: 'FIN', name: 'Finans', color: '#10B981', sortOrder: 1 },
      { code: 'MUS', name: 'Müşteri', color: '#3B82F6', sortOrder: 2 },
      { code: 'SUR', name: 'İç Süreç', color: '#F59E0B', sortOrder: 3 },
      { code: 'OGR', name: 'Öğrenme & Gelişim', color: '#8B5CF6', sortOrder: 4 },
    ];

    await prisma.bSCPerspective.createMany({
      data: defaultPerspectives.map((p) => ({
        ...p,
        periodId: period.id,
      })),
    });

    return NextResponse.json(period, { status: 201 });
  } catch (error) {
    console.error('Error creating strategy period:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
