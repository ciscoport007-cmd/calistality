import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { PrismaClient } from '@prisma/client';

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

    const folder = await prisma.folder.findUnique({
      where: { id: params.id },
      include: {
        department: true,
        documentType: true,
        parent: true,
        children: {
          include: {
            _count: { select: { documents: true, children: true } },
          },
        },
        _count: { select: { documents: true, children: true } },
      },
    });

    if (!folder) {
      return NextResponse.json({ error: 'Klasör bulunamadı' }, { status: 404 });
    }

    return NextResponse.json({ folder });
  } catch (error) {
    console.error('Folder GET error:', error);
    return NextResponse.json(
      { error: 'Klasör getirilirken hata oluştu' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const body = await request.json();
    const { name, code, description, parentId, departmentId, documentTypeId, codeTemplate } = body ?? {};

    // parentId kendisi olamaz (döngüsel referans)
    if (parentId === params.id) {
      return NextResponse.json(
        { error: 'Klasör kendisinin üst klasörü olamaz' },
        { status: 400 }
      );
    }

    // Kod benzersiz mi kontrol et (kendi kodu hariç)
    if (code) {
      const existing = await prisma.folder.findFirst({
        where: {
          code,
          NOT: { id: params.id },
        },
      });
      if (existing) {
        return NextResponse.json(
          { error: 'Bu kod başka bir klasör tarafından kullanılıyor' },
          { status: 400 }
        );
      }
    }

    const folder = await prisma.folder.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(code && { code }),
        description: description ?? null,
        parentId: parentId || null,
        departmentId: departmentId || null,
        documentTypeId: documentTypeId || null,
        codeTemplate: codeTemplate || null,
      },
      include: {
        department: true,
        documentType: true,
        parent: true,
      },
    });

    return NextResponse.json({ folder, message: 'Klasör güncellendi' });
  } catch (error) {
    console.error('Folder PATCH error:', error);
    return NextResponse.json(
      { error: 'Klasör güncellenirken hata oluştu' },
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
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    // Klasörde doküman var mı kontrol et
    const folder = await prisma.folder.findUnique({
      where: { id: params.id },
      include: {
        _count: { select: { documents: true, children: true } },
      },
    });

    if (!folder) {
      return NextResponse.json({ error: 'Klasör bulunamadı' }, { status: 404 });
    }

    // Eğer alt klasör varsa, onların parent'ini null yap
    if (folder._count.children > 0) {
      await prisma.folder.updateMany({
        where: { parentId: params.id },
        data: { parentId: null },
      });
    }

    // Eğer doküman varsa, onların folderId'sini null yap
    if (folder._count.documents > 0) {
      await prisma.document.updateMany({
        where: { folderId: params.id },
        data: { folderId: null },
      });
    }

    // Klasörü sil
    await prisma.folder.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Klasör silindi' });
  } catch (error) {
    console.error('Folder DELETE error:', error);
    return NextResponse.json(
      { error: 'Klasör silinirken hata oluştu' },
      { status: 500 }
    );
  }
}
