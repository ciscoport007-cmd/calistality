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
    const status = searchParams.get('status');
    const departmentId = searchParams.get('departmentId');

    const scorecards = await prisma.individualScorecard.findMany({
      where: {
        ...(userId && { userId }),
        ...(year && { year: parseInt(year) }),
        ...(status && { status: status as any }),
        ...(departmentId && {
          user: { departmentId },
        }),
      },
      include: {
        user: {
          select: {
            id: true, name: true, email: true,
            department: true, position: true,
          },
        },
        formula: {
          include: { scale: { include: { levels: true } } },
        },
        createdBy: { select: { id: true, name: true, email: true } },
        approvedBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ year: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json(scorecards);
  } catch (error) {
    console.error('Error fetching individual scorecards:', error);
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
    const { userId, year, period, periodType, formulaId, notes } = body;

    if (!userId || !year) {
      return NextResponse.json({ error: 'Kullanıcı ve yıl bilgisi gereklidir' }, { status: 400 });
    }

    // Mevcut karneyi kontrol et
    const existing = await prisma.individualScorecard.findFirst({
      where: { userId, year, period: period || null, periodType: periodType || 'YILLIK' },
    });

    if (existing) {
      return NextResponse.json({ error: 'Bu dönem için zaten bir karne mevcut' }, { status: 400 });
    }

    // Kod oluştur
    const count = await prisma.individualScorecard.count();
    const code = `BK-${year}-${String(count + 1).padStart(5, '0')}`;

    // Varsayılan formülü al
    let formula = null;
    if (formulaId) {
      formula = await prisma.scorecardFormula.findUnique({ where: { id: formulaId } });
    } else {
      formula = await prisma.scorecardFormula.findFirst({
        where: { isDefault: true, isActive: true },
      });
    }

    const scorecard = await prisma.individualScorecard.create({
      data: {
        code,
        userId,
        year,
        period: period || null,
        periodType: periodType || 'YILLIK',
        formulaId: formula?.id || null,
        notes,
        createdById: session.user.id,
      },
      include: {
        user: {
          select: {
            id: true, name: true, email: true,
            department: true, position: true,
          },
        },
        formula: { include: { scale: { include: { levels: true } } } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(scorecard, { status: 201 });
  } catch (error) {
    console.error('Error creating individual scorecard:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
