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
    const year = searchParams.get('year');

    const personnelCompetencies = await prisma.personnelCompetencyEvaluation.findMany({
      where: {
        ...(userId && { userId }),
        ...(year && { year: parseInt(year) }),
      },
      include: {
        competency: true,
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(personnelCompetencies);
  } catch (error) {
    console.error('Error:', error);
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
    const { competencyId, userId, year, weight, currentLevel, targetLevel } = body;

    if (!competencyId || !userId || !year) {
      return NextResponse.json({ error: 'Eksik alan' }, { status: 400 });
    }

    const score = currentLevel && targetLevel ? (currentLevel / targetLevel) * 100 : null;

    const result = await (prisma.personnelCompetencyEvaluation.create as any)({
      data: {
        competencyId,
        userId,
        year,
        weight: weight || 1.0,
        currentLevel: currentLevel || 3,
        targetLevel: targetLevel || 4,
        score,
        evaluationDate: new Date(),
        evaluatorId: session.user.id,
        status: 'TASLAK',
      },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
