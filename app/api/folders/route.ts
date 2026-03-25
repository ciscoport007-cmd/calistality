import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { PrismaClient } from '@prisma/client';
import { canCreate } from '@/lib/audit';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const folders = await prisma.folder.findMany({
      include: {
        department: true,
        documentType: true,
        parent: true,
        _count: {
          select: { documents: true, children: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ folders: folders ?? [] });
  } catch (error) {
    console.error('Folders GET error:', error);
    return NextResponse.json(
      { error: 'Klasörler getirilirken hata oluştu' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    // Yalnızca Admin ve Yönetici rolleri yeni içerik oluşturabilir
    if (!canCreate(session.user?.role)) {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz bulunmamaktadır' }, { status: 403 });
    }

    const body = await request.json();
    const { name, code, description, parentId, departmentId, documentTypeId, codeTemplate } = body ?? {};

    if (!name || !code) {
      return NextResponse.json(
        { error: 'Klasör adı ve kodu zorunludur' },
        { status: 400 }
      );
    }

    const folder = await prisma.folder.create({
      data: {
        name,
        code,
        description: description || null,
        parentId: parentId || null,
        departmentId: departmentId || null,
        documentTypeId: documentTypeId || null,
        codeTemplate: codeTemplate || null,
      },
      include: {
        department: true,
        documentType: true,
      },
    });

    return NextResponse.json(
      { folder, message: 'Klasör başarıyla oluşturuldu' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Folders POST error:', error);
    return NextResponse.json(
      { error: 'Klasör oluşturulurken hata oluştu' },
      { status: 500 }
    );
  }
}
