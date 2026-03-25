import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { PrismaClient } from '@prisma/client';
import { createAuditLog, isAdmin } from '@/lib/audit';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const documentType = await prisma.documentType.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            documents: true,
            folders: true,
          },
        },
      },
    });

    if (!documentType) {
      return NextResponse.json({ error: 'Doküman türü bulunamadı' }, { status: 404 });
    }

    return NextResponse.json(documentType);
  } catch (error) {
    console.error('DocumentType GET error:', error);
    return NextResponse.json(
      { error: 'Doküman türü getirilirken hata oluştu' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !isAdmin(session.user.role)) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const body = await request.json();
    const { name, code, description, isActive, metadataSchema } = body;

    const existingType = await prisma.documentType.findUnique({
      where: { id: params.id },
    });

    if (!existingType) {
      return NextResponse.json({ error: 'Doküman türü bulunamadı' }, { status: 404 });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (code !== undefined) updateData.code = code;
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (metadataSchema !== undefined) updateData.metadataSchema = metadataSchema;

    const documentType = await prisma.documentType.update({
      where: { id: params.id },
      data: updateData,
    });

    await createAuditLog({
      userId: session.user.id,
      action: 'UPDATE',
      module: 'DOCUMENTS',
      entityType: 'DocumentType',
      entityId: documentType.id,
      oldValues: {
        name: existingType.name,
        code: existingType.code,
        description: existingType.description,
        metadataSchema: existingType.metadataSchema,
      },
      newValues: updateData,
    });

    return NextResponse.json({
      documentType,
      message: 'Doküman türü başarıyla güncellendi',
    });
  } catch (error) {
    console.error('DocumentType PUT error:', error);
    return NextResponse.json(
      { error: 'Doküman türü güncellenirken hata oluştu' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !isAdmin(session.user.role)) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    // İlgili dokümanlar var mı kontrol et
    const documentsCount = await prisma.document.count({
      where: { documentTypeId: params.id },
    });

    if (documentsCount > 0) {
      return NextResponse.json(
        { error: 'Bu türe ait dokümanlar var, silinemez' },
        { status: 400 }
      );
    }

    await prisma.documentType.delete({
      where: { id: params.id },
    });

    await createAuditLog({
      userId: session.user.id,
      action: 'DELETE',
      module: 'DOCUMENTS',
      entityType: 'DocumentType',
      entityId: params.id,
    });

    return NextResponse.json({ message: 'Doküman türü başarıyla silindi' });
  } catch (error) {
    console.error('DocumentType DELETE error:', error);
    return NextResponse.json(
      { error: 'Doküman türü silinirken hata oluştu' },
      { status: 500 }
    );
  }
}
