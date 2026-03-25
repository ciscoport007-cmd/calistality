import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

// Tek departman getir
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const department = await prisma.department.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { users: true, documents: true },
        },
      },
    });

    if (!department) {
      return NextResponse.json({ error: 'Departman bulunamadı' }, { status: 404 });
    }

    return NextResponse.json({ department });
  } catch (error) {
    console.error('Department GET error:', error);
    return NextResponse.json(
      { error: 'Departman getirilirken hata oluştu' },
      { status: 500 }
    );
  }
}

// Departman güncelle
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
    const { name, code, description, isActive } = body ?? {};

    // Departman var mı kontrol et
    const existing = await prisma.department.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Departman bulunamadı' }, { status: 404 });
    }

    // Aynı kod başka departmanda kullanılıyor mu kontrol et
    if (code && code !== existing.code) {
      const codeExists = await prisma.department.findFirst({
        where: {
          code,
          id: { not: params.id },
        },
      });
      if (codeExists) {
        return NextResponse.json(
          { error: 'Bu departman kodu zaten kullanılıyor' },
          { status: 400 }
        );
      }
    }

    const department = await prisma.department.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(code && { code }),
        ...(description !== undefined && { description: description || null }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        _count: {
          select: { users: true, documents: true },
        },
      },
    });

    return NextResponse.json({
      department,
      message: 'Departman başarıyla güncellendi',
    });
  } catch (error) {
    console.error('Department PUT error:', error);
    return NextResponse.json(
      { error: 'Departman güncellenirken hata oluştu' },
      { status: 500 }
    );
  }
}

// Departman sil
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    // Departman var mı kontrol et
    const existing = await prisma.department.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { users: true, documents: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Departman bulunamadı' }, { status: 404 });
    }

    // Bağlı kullanıcı veya doküman var mı kontrol et
    if (existing._count.users > 0) {
      return NextResponse.json(
        { error: `Bu departmanda ${existing._count.users} kullanıcı bulunmaktadır. Önce kullanıcıları başka departmana taşıyın.` },
        { status: 400 }
      );
    }

    if (existing._count.documents > 0) {
      return NextResponse.json(
        { error: `Bu departmanda ${existing._count.documents} doküman bulunmaktadır. Önce dokümanları başka departmana taşıyın.` },
        { status: 400 }
      );
    }

    await prisma.department.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      message: 'Departman başarıyla silindi',
    });
  } catch (error) {
    console.error('Department DELETE error:', error);
    return NextResponse.json(
      { error: 'Departman silinirken hata oluştu' },
      { status: 500 }
    );
  }
}
