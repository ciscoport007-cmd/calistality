import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const competency = await prisma.competency.findUnique({
      where: { id: params.id },
      include: {
        category: true,
        positionRequirements: { include: { position: true } },
        evaluations: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            evaluator: { select: { id: true, name: true, email: true } },
          },
          orderBy: { evaluationDate: 'desc' },
        },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!competency) {
      return NextResponse.json({ error: 'Yetkinlik bulunamadı' }, { status: 404 });
    }

    return NextResponse.json(competency);
  } catch (error) {
    console.error('Error fetching competency:', error);
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
    const { name, description, categoryId, levelDefinitions, maxLevel, sortOrder, isActive, positionRequirements } = body;

    // Pozisyon gereksinimlerini güncelle
    if (positionRequirements) {
      await prisma.competencyPositionRequirement.deleteMany({ where: { competencyId: params.id } });
    }

    const competency = await prisma.competency.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(categoryId && { categoryId }),
        ...(levelDefinitions && { levelDefinitions }),
        ...(maxLevel && { maxLevel }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(isActive !== undefined && { isActive }),
        ...(positionRequirements && {
          positionRequirements: {
            create: positionRequirements.map((req: any) => ({
              positionId: req.positionId,
              requiredLevel: req.requiredLevel,
              weight: req.weight || 1.0,
              isMandatory: req.isMandatory !== false,
              notes: req.notes,
            })),
          },
        }),
      },
      include: {
        category: true,
        positionRequirements: { include: { position: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(competency);
  } catch (error) {
    console.error('Error updating competency:', error);
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

    await prisma.competency.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return NextResponse.json({ message: 'Yetkinlik deaktif edildi' });
  } catch (error) {
    console.error('Error deleting competency:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
