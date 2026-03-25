import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { PrismaClient } from '@prisma/client';
import { createAuditLog, isAdmin } from '@/lib/audit';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

// GET - Doküman izinlerini getir
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const permissions = await prisma.documentPermission.findMany({
      where: { documentId: params.id },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        group: {
          select: { id: true, name: true },
        },
        department: {
          select: { id: true, name: true, code: true },
        },
        createdBy: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(permissions);
  } catch (error) {
    console.error('Permissions fetch error:', error);
    return NextResponse.json(
      { error: 'İzinler alınamadı' },
      { status: 500 }
    );
  }
}

// POST - Yeni izin ekle
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    // Sadece admin veya doküman sahibi izin ekleyebilir
    const document = await prisma.document.findUnique({
      where: { id: params.id },
      select: { id: true, createdById: true, code: true },
    });

    if (!document) {
      return NextResponse.json({ error: 'Doküman bulunamadı' }, { status: 404 });
    }

    const userIsAdmin = await isAdmin(session.user.id);
    if (!userIsAdmin && document.createdById !== session.user.id) {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 });
    }

    const body = await request.json();
    const {
      userId,
      groupId,
      departmentId,
      canView = true,
      canDownload = false,
      canEdit = false,
      canDelete = false,
      canApprove = false,
      canShare = false,
      expiresAt,
    } = body;

    // En az bir hedef belirtilmeli
    if (!userId && !groupId && !departmentId) {
      return NextResponse.json(
        { error: 'Kullanıcı, grup veya departman seçilmeli' },
        { status: 400 }
      );
    }

    // Mevcut izin kontrolü
    const existingPermission = await prisma.documentPermission.findFirst({
      where: {
        documentId: params.id,
        OR: [
          userId ? { userId } : {},
          groupId ? { groupId } : {},
          departmentId ? { departmentId } : {},
        ].filter(obj => Object.keys(obj).length > 0),
      },
    });

    if (existingPermission) {
      return NextResponse.json(
        { error: 'Bu hedef için zaten izin tanımlı' },
        { status: 400 }
      );
    }

    const permission = await prisma.documentPermission.create({
      data: {
        documentId: params.id,
        userId: userId || null,
        groupId: groupId || null,
        departmentId: departmentId || null,
        canView,
        canDownload,
        canEdit,
        canDelete,
        canApprove,
        canShare,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdById: session.user.id,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        group: { select: { id: true, name: true } },
        department: { select: { id: true, name: true, code: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    // Audit log
    await createAuditLog({
      userId: session.user.id,
      action: 'CREATE',
      module: 'DOCUMENTS',
      entityType: 'DocumentPermission',
      entityId: permission.id,
      newValues: {
        documentCode: document.code,
        targetUser: permission.user?.name,
        targetGroup: permission.group?.name,
        targetDepartment: permission.department?.name,
        permissions: { canView, canDownload, canEdit, canDelete, canApprove, canShare },
      },
    });

    return NextResponse.json(permission, { status: 201 });
  } catch (error) {
    console.error('Permission create error:', error);
    return NextResponse.json(
      { error: 'İzin oluşturulamadı' },
      { status: 500 }
    );
  }
}

// DELETE - İzin sil
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const permissionId = searchParams.get('permissionId');

    if (!permissionId) {
      return NextResponse.json({ error: 'İzin ID gerekli' }, { status: 400 });
    }

    // Doküman ve izin kontrolü
    const document = await prisma.document.findUnique({
      where: { id: params.id },
      select: { id: true, createdById: true },
    });

    if (!document) {
      return NextResponse.json({ error: 'Doküman bulunamadı' }, { status: 404 });
    }

    const userIsAdmin = await isAdmin(session.user.id);
    if (!userIsAdmin && document.createdById !== session.user.id) {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 });
    }

    const permission = await prisma.documentPermission.findUnique({
      where: { id: permissionId },
      include: {
        user: { select: { name: true } },
        group: { select: { name: true } },
        department: { select: { name: true } },
      },
    });

    if (!permission || permission.documentId !== params.id) {
      return NextResponse.json({ error: 'İzin bulunamadı' }, { status: 404 });
    }

    await prisma.documentPermission.delete({
      where: { id: permissionId },
    });

    // Audit log
    await createAuditLog({
      userId: session.user.id,
      action: 'DELETE',
      module: 'DOCUMENTS',
      entityType: 'DocumentPermission',
      entityId: permissionId,
      oldValues: {
        targetUser: permission.user?.name,
        targetGroup: permission.group?.name,
        targetDepartment: permission.department?.name,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Permission delete error:', error);
    return NextResponse.json(
      { error: 'İzin silinemedi' },
      { status: 500 }
    );
  }
}

// PUT - İzin güncelle
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const body = await request.json();
    const { permissionId, canView, canDownload, canEdit, canDelete, canApprove, canShare, expiresAt } = body;

    if (!permissionId) {
      return NextResponse.json({ error: 'İzin ID gerekli' }, { status: 400 });
    }

    // Doküman kontrolü
    const document = await prisma.document.findUnique({
      where: { id: params.id },
      select: { id: true, createdById: true },
    });

    if (!document) {
      return NextResponse.json({ error: 'Doküman bulunamadı' }, { status: 404 });
    }

    const userIsAdmin = await isAdmin(session.user.id);
    if (!userIsAdmin && document.createdById !== session.user.id) {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 });
    }

    const existingPermission = await prisma.documentPermission.findUnique({
      where: { id: permissionId },
    });

    if (!existingPermission || existingPermission.documentId !== params.id) {
      return NextResponse.json({ error: 'İzin bulunamadı' }, { status: 404 });
    }

    const updatedPermission = await prisma.documentPermission.update({
      where: { id: permissionId },
      data: {
        canView: canView ?? existingPermission.canView,
        canDownload: canDownload ?? existingPermission.canDownload,
        canEdit: canEdit ?? existingPermission.canEdit,
        canDelete: canDelete ?? existingPermission.canDelete,
        canApprove: canApprove ?? existingPermission.canApprove,
        canShare: canShare ?? existingPermission.canShare,
        expiresAt: expiresAt !== undefined ? (expiresAt ? new Date(expiresAt) : null) : existingPermission.expiresAt,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        group: { select: { id: true, name: true } },
        department: { select: { id: true, name: true, code: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    // Audit log
    await createAuditLog({
      userId: session.user.id,
      action: 'UPDATE',
      module: 'DOCUMENTS',
      entityType: 'DocumentPermission',
      entityId: permissionId,
      oldValues: {
        canView: existingPermission.canView,
        canDownload: existingPermission.canDownload,
        canEdit: existingPermission.canEdit,
        canDelete: existingPermission.canDelete,
        canApprove: existingPermission.canApprove,
        canShare: existingPermission.canShare,
      },
      newValues: {
        canView: updatedPermission.canView,
        canDownload: updatedPermission.canDownload,
        canEdit: updatedPermission.canEdit,
        canDelete: updatedPermission.canDelete,
        canApprove: updatedPermission.canApprove,
        canShare: updatedPermission.canShare,
      },
    });

    return NextResponse.json(updatedPermission);
  } catch (error) {
    console.error('Permission update error:', error);
    return NextResponse.json(
      { error: 'İzin güncellenemedi' },
      { status: 500 }
    );
  }
}
