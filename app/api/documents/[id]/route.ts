import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

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

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        folder: true,
        documentType: true,
        department: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            surname: true,
            email: true,
          },
        },
        preparedBy: {
          select: {
            id: true,
            name: true,
            surname: true,
            email: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            name: true,
            surname: true,
            email: true,
          },
        },
        lockedBy: {
          select: {
            id: true,
            name: true,
            surname: true,
            email: true,
          },
        },
        versions: {
          orderBy: { versionNumber: 'desc' },
        },
        approvals: {
          include: {
            approver: {
              select: {
                id: true,
                name: true,
                surname: true,
                email: true,
              },
            },
          },
          orderBy: { order: 'asc' },
        },
        readLogs: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                surname: true,
                email: true,
              },
            },
          },
          orderBy: { readAt: 'desc' },
        },
        acknowledgments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                surname: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        tags: {
          include: {
            tag: true,
          },
        },
        workflowInstances: {
          include: {
            workflow: {
              select: { id: true, name: true, code: true },
            },
            startedBy: {
              select: { id: true, name: true, surname: true },
            },
            steps: {
              include: {
                step: {
                  include: {
                    position: { select: { id: true, name: true } },
                    role: { select: { id: true, name: true } },
                  },
                },
                assignedUser: {
                  select: { id: true, name: true, surname: true, email: true },
                },
                actionBy: {
                  select: { id: true, name: true, surname: true },
                },
              },
              orderBy: { step: { stepOrder: 'asc' } },
            },
          },
          orderBy: { startedAt: 'desc' },
        },
        signatures: {
          include: {
            signedBy: { select: { id: true, name: true, email: true } },
          },
          orderBy: { signedAt: 'desc' },
        },
      },
    });

    if (!document) {
      return NextResponse.json({ error: 'Doküman bulunamadı' }, { status: 404 });
    }

    return NextResponse.json({ document });
  } catch (error) {
    console.error('Document GET error:', error);
    return NextResponse.json(
      { error: 'Doküman getirilirken hata oluştu' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await params;

    // Önce dokümanı kontrol et - kilit durumu
    const existingDoc = await prisma.document.findUnique({
      where: { id },
      select: { isLockedForEdit: true, lockedById: true, lockedBy: { select: { name: true } } },
    });

    if (!existingDoc) {
      return NextResponse.json({ error: 'Doküman bulunamadı' }, { status: 404 });
    }

    // Kilit kontrolü - başka kullanıcı tarafından kilitliyse düzenleme yapılamaz
    if (existingDoc.isLockedForEdit && existingDoc.lockedById !== session.user.id) {
      return NextResponse.json(
        { error: `Bu doküman ${existingDoc.lockedBy?.name || 'başka bir kullanıcı'} tarafından kilitlenmiş. Düzenleme yapılamaz.` },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, description, status, folderId, departmentId, documentTypeId } = body ?? {};

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (folderId !== undefined) updateData.folderId = folderId;
    if (departmentId !== undefined) updateData.departmentId = departmentId;
    if (documentTypeId !== undefined) updateData.documentTypeId = documentTypeId;

    const document = await prisma.document.update({
      where: { id },
      data: updateData,
      include: {
        folder: true,
        documentType: true,
        department: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            surname: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      document,
      message: 'Doküman başarıyla güncellendi',
    });
  } catch (error) {
    console.error('Document PATCH error:', error);
    return NextResponse.json(
      { error: 'Doküman güncellenirken hata oluştu' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await params;

    // Önce dokümanı kontrol et - kilit durumu
    const existingDoc = await prisma.document.findUnique({
      where: { id },
      select: { isLockedForEdit: true, lockedById: true, lockedBy: { select: { name: true } } },
    });

    if (!existingDoc) {
      return NextResponse.json({ error: 'Doküman bulunamadı' }, { status: 404 });
    }

    // Kilit kontrolü - başka kullanıcı tarafından kilitliyse silme yapılamaz
    if (existingDoc.isLockedForEdit && existingDoc.lockedById !== session.user.id) {
      return NextResponse.json(
        { error: `Bu doküman ${existingDoc.lockedBy?.name || 'başka bir kullanıcı'} tarafından kilitlenmiş. Silme işlemi yapılamaz.` },
        { status: 403 }
      );
    }

    await prisma.document.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Doküman başarıyla silindi' });
  } catch (error) {
    console.error('Document DELETE error:', error);
    return NextResponse.json(
      { error: 'Doküman silinirken hata oluştu' },
      { status: 500 }
    );
  }
}
