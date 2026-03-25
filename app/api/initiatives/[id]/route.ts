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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const initiative = await prisma.initiative.findUnique({
      where: { id: params.id },
      include: {
        category: true,
        department: true,
        assignments: {
          include: {
            user: { select: { id: true, name: true, email: true, department: true, position: true } },
            evaluator: { select: { id: true, name: true, email: true } },
          },
        },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!initiative) {
      return NextResponse.json({ error: 'İnisiyatif bulunamadı' }, { status: 404 });
    }

    return NextResponse.json(initiative);
  } catch (error) {
    console.error('Error fetching initiative:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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
    const { name, description, categoryId, departmentId, startDate, endDate, scoringCriteria, maxScore, status, assignments } = body;

    // Atamaları güncelle
    if (assignments) {
      await prisma.personnelInitiative.deleteMany({ where: { initiativeId: params.id } });
    }

    const initiative = await prisma.initiative.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(categoryId && { categoryId }),
        ...(departmentId !== undefined && { departmentId: departmentId || null }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
        ...(scoringCriteria && { scoringCriteria }),
        ...(maxScore !== undefined && { maxScore }),
        ...(status && { status }),
        ...(assignments && {
          assignments: {
            create: assignments.map((a: any) => ({
              userId: a.userId,
              role: a.role || 'UYE',
              weight: a.weight || 1.0,
            })),
          },
        }),
      },
      include: {
        category: true,
        department: true,
        assignments: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(initiative);
  } catch (error) {
    console.error('Error updating initiative:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Personel inisiyatif değerlendirmesi
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, score, criteriaScores, evaluationNotes, status } = body;

    if (!userId) {
      return NextResponse.json({ error: 'Kullanıcı ID gereklidir' }, { status: 400 });
    }

    // İnisiyatifin maxScore'unu al
    const initiative = await prisma.initiative.findUnique({
      where: { id: params.id },
      select: { maxScore: true },
    });

    const performance = initiative?.maxScore ? (score / initiative.maxScore) * 100 : null;

    const assignment = await prisma.personnelInitiative.update({
      where: {
        initiativeId_userId: {
          initiativeId: params.id,
          userId,
        },
      },
      data: {
        ...(score !== undefined && { score }),
        ...(performance !== null && { performance }),
        ...(criteriaScores && { criteriaScores }),
        ...(evaluationNotes !== undefined && { evaluationNotes }),
        ...(status && { status }),
        evaluatorId: session.user.id,
        evaluationDate: new Date(),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        evaluator: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(assignment);
  } catch (error) {
    console.error('Error evaluating initiative assignment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.initiative.update({
      where: { id: params.id },
      data: { status: 'IPTAL' },
    });

    return NextResponse.json({ message: 'İnisiyatif iptal edildi' });
  } catch (error) {
    console.error('Error deleting initiative:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
