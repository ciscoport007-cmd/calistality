import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET - İş akışı şablonlarını listele
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const documentTypeId = searchParams.get('documentTypeId');
    const folderId = searchParams.get('folderId');
    const departmentId = searchParams.get('departmentId');
    const isActive = searchParams.get('isActive');

    const where: any = {};
    if (documentTypeId) where.documentTypeId = documentTypeId;
    if (folderId) where.folderId = folderId;
    if (departmentId) where.departmentId = departmentId;
    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const workflows = await prisma.documentWorkflow.findMany({
      where,
      include: {
        documentType: { select: { id: true, name: true, code: true } },
        folder: { select: { id: true, name: true, code: true } },
        department: { select: { id: true, name: true, code: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
        steps: {
          include: {
            position: { select: { id: true, name: true } },
            role: { select: { id: true, name: true } },
            specificUser: { select: { id: true, name: true, surname: true } },
          },
          orderBy: { stepOrder: 'asc' },
        },
        _count: {
          select: { instances: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(workflows);
  } catch (error) {
    console.error('Error fetching workflows:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// POST - Yeni iş akışı oluştur
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      code,
      description,
      documentTypeId,
      folderId,
      departmentId,
      isDefault,
      steps,
    } = body;

    if (!name || !code) {
      return NextResponse.json(
        { error: 'İsim ve kod zorunludur' },
        { status: 400 }
      );
    }

    if (!steps || steps.length === 0) {
      return NextResponse.json(
        { error: 'En az bir adım tanımlanmalıdır' },
        { status: 400 }
      );
    }

    // Kod benzersizliği kontrolü
    const existing = await prisma.documentWorkflow.findUnique({
      where: { code },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Bu kod zaten kullanılıyor' },
        { status: 400 }
      );
    }

    // Varsayılan iş akışı işaretleniyorsa, diğerlerini kaldır
    if (isDefault) {
      const whereCondition: any = {};
      if (documentTypeId) whereCondition.documentTypeId = documentTypeId;
      if (folderId) whereCondition.folderId = folderId;
      if (departmentId) whereCondition.departmentId = departmentId;

      await prisma.documentWorkflow.updateMany({
        where: {
          ...whereCondition,
          isDefault: true,
        },
        data: { isDefault: false },
      });
    }

    const workflow = await prisma.documentWorkflow.create({
      data: {
        name,
        code,
        description: description || null,
        documentTypeId: documentTypeId || null,
        folderId: folderId || null,
        departmentId: departmentId || null,
        isDefault: isDefault || false,
        createdById: session.user.id,
        steps: {
          create: steps.map((step: any, index: number) => ({
            name: step.name,
            description: step.description || null,
            stepOrder: index + 1,
            approverType: step.approverType || 'POSITION',
            positionId: step.positionId || null,
            roleId: step.roleId || null,
            specificUserId: step.specificUserId || null,
            isDepartmentHead: step.isDepartmentHead || false,
            canPublish: step.canPublish || false,
            isRequired: step.isRequired !== false,
            deadlineDays: step.deadlineDays || null,
            isParallel: step.isParallel || false,
            minApprovals: step.minApprovals || 1,
          })),
        },
      },
      include: {
        documentType: { select: { id: true, name: true, code: true } },
        folder: { select: { id: true, name: true, code: true } },
        department: { select: { id: true, name: true, code: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
        steps: {
          include: {
            position: { select: { id: true, name: true } },
            role: { select: { id: true, name: true } },
            specificUser: { select: { id: true, name: true, surname: true } },
          },
          orderBy: { stepOrder: 'asc' },
        },
      },
    });

    return NextResponse.json(workflow, { status: 201 });
  } catch (error) {
    console.error('Error creating workflow:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
