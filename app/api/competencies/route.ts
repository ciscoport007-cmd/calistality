import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    const isActive = searchParams.get('isActive');

    const competencies = await prisma.competency.findMany({
      where: {
        ...(categoryId && { categoryId }),
        ...(isActive !== null && { isActive: isActive === 'true' }),
      },
      include: {
        category: true,
        positionRequirements: {
          include: { position: true },
        },
        createdBy: { select: { id: true, name: true, email: true } },
        _count: { select: { evaluations: true } },
      },
      orderBy: [{ category: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
    });

    return NextResponse.json(competencies);
  } catch (error) {
    console.error('Error fetching competencies:', error);
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
    const { name, description, categoryId, levelDefinitions, maxLevel, sortOrder, positionRequirements } = body;

    if (!name || !categoryId) {
      return NextResponse.json({ error: 'Yetkinlik adı ve kategori gereklidir' }, { status: 400 });
    }

    const count = await prisma.competency.count();
    const code = `YET-${String(count + 1).padStart(4, '0')}`;

    const competency = await prisma.competency.create({
      data: {
        code,
        name,
        description,
        categoryId,
        levelDefinitions: levelDefinitions || [
          { level: 1, name: 'Başlangıç', description: 'Temel düzeyde bilgi ve uygulama' },
          { level: 2, name: 'Gelişmekte', description: 'Rehberlik altında uygulama yapabilir' },
          { level: 3, name: 'Yetkin', description: 'Bağımsız olarak uygulama yapabilir' },
          { level: 4, name: 'İleri', description: 'Başkalarına rehberlik edebilir' },
          { level: 5, name: 'Uzman', description: 'Stratejik düzeyde liderlik yapabilir' },
        ],
        maxLevel: maxLevel || 5,
        sortOrder: sortOrder || 0,
        createdById: session.user.id,
        positionRequirements: positionRequirements?.length > 0 ? {
          create: positionRequirements.map((req: any) => ({
            positionId: req.positionId,
            requiredLevel: req.requiredLevel,
            weight: req.weight || 1.0,
            isMandatory: req.isMandatory !== false,
            notes: req.notes,
          })),
        } : undefined,
      },
      include: {
        category: true,
        positionRequirements: { include: { position: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(competency, { status: 201 });
  } catch (error) {
    console.error('Error creating competency:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
