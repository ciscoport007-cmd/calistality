import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { isAdmin } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// Admin veya Müdür pozisyonundaki kullanıcı mı kontrol et
async function canManageWorkflows(session: any): Promise<boolean> {
  // Admin kontrolü
  if (isAdmin(session?.user?.role)) {
    return true;
  }

  // Müdür pozisyonu kontrolü
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { position: true },
    });

    if (user?.position?.name?.toLowerCase().includes('müdür')) {
      return true;
    }
  }

  return false;
}

// GET - Tekil iş akışı detayı
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await params;

    const workflow = await prisma.documentWorkflow.findUnique({
      where: { id },
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
        instances: {
          include: {
            document: { select: { id: true, code: true, title: true } },
            startedBy: { select: { id: true, name: true, surname: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!workflow) {
      return NextResponse.json({ error: 'İş akışı bulunamadı' }, { status: 404 });
    }

    return NextResponse.json(workflow);
  } catch (error) {
    console.error('Error fetching workflow:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// PUT - İş akışını güncelle
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    // Yetki kontrolü - sadece admin veya müdür
    const hasPermission = await canManageWorkflows(session);
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'İş akışı düzenleme yetkisi sadece yöneticiler ve müdürlere aittir' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const {
      name,
      description,
      documentTypeId,
      folderId,
      departmentId,
      isActive,
      isDefault,
      steps,
    } = body;

    // Mevcut iş akışını kontrol et
    const existing = await prisma.documentWorkflow.findUnique({
      where: { id },
      include: { instances: { where: { status: 'AKTIF' } } },
    });

    if (!existing) {
      return NextResponse.json({ error: 'İş akışı bulunamadı' }, { status: 404 });
    }

    // Aktif instance varsa adımları değiştirme
    if (existing.instances.length > 0 && steps) {
      return NextResponse.json(
        { error: 'Aktif süreçler varken adımlar değiştirilemez' },
        { status: 400 }
      );
    }

    // Varsayılan iş akışı işaretleniyorsa, diğerlerini kaldır
    if (isDefault) {
      const whereCondition: any = {
        id: { not: id },
      };
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

    // Adımları güncelleme (tümünü sil ve yeniden oluştur)
    if (steps && steps.length > 0) {
      await prisma.workflowStep.deleteMany({
        where: { workflowId: id },
      });

      await prisma.workflowStep.createMany({
        data: steps.map((step: any, index: number) => ({
          workflowId: id,
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
      });
    }

    const workflow = await prisma.documentWorkflow.update({
      where: { id },
      data: {
        name: name || undefined,
        description: description !== undefined ? description : undefined,
        documentTypeId: documentTypeId !== undefined ? (documentTypeId || null) : undefined,
        folderId: folderId !== undefined ? (folderId || null) : undefined,
        departmentId: departmentId !== undefined ? (departmentId || null) : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
        isDefault: isDefault !== undefined ? isDefault : undefined,
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

    return NextResponse.json(workflow);
  } catch (error) {
    console.error('Error updating workflow:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// DELETE - İş akışını sil
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    // Yetki kontrolü - sadece admin veya müdür
    const hasPermission = await canManageWorkflows(session);
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'İş akışı silme yetkisi sadece yöneticiler ve müdürlere aittir' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Aktif instance kontrolü
    const workflow = await prisma.documentWorkflow.findUnique({
      where: { id },
      include: { 
        instances: true,
        steps: true,
      },
    });

    if (!workflow) {
      return NextResponse.json({ error: 'İş akışı bulunamadı' }, { status: 404 });
    }

    // Aktif süreç varsa silmeye izin verme
    const activeInstances = workflow.instances.filter(i => i.status === 'AKTIF');
    if (activeInstances.length > 0) {
      return NextResponse.json(
        { error: 'Aktif süreçler varken iş akışı silinemez' },
        { status: 400 }
      );
    }

    // Transaction ile ilişkili kayıtları sil
    await prisma.$transaction(async (tx) => {
      // Önce instance step'leri sil
      for (const instance of workflow.instances) {
        await tx.workflowInstanceStep.deleteMany({
          where: { instanceId: instance.id },
        });
      }

      // Sonra instance'ları sil
      await tx.workflowInstance.deleteMany({
        where: { workflowId: id },
      });

      // Sonra adımları sil
      await tx.workflowStep.deleteMany({
        where: { workflowId: id },
      });

      // En son iş akışını sil
      await tx.documentWorkflow.delete({
        where: { id },
      });
    });

    return NextResponse.json({ message: 'İş akışı silindi' });
  } catch (error) {
    console.error('Error deleting workflow:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
