import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export const dynamic = 'force-dynamic';

// GET - Tek pozisyon getir
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const position = await prisma.position.findUnique({
      where: { id: params.id },
      include: {
        department: true,
        _count: {
          select: { users: true },
        },
      },
    });

    if (!position) {
      return NextResponse.json({ error: 'Pozisyon bulunamadı' }, { status: 404 });
    }

    return NextResponse.json(position);
  } catch (error) {
    console.error('Pozisyon getirme hatası:', error);
    return NextResponse.json({ error: 'Pozisyon getirilemedi' }, { status: 500 });
  }
}

// PUT - Pozisyon güncelle
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const body = await request.json();
    const { name, code, description, level, isActive, departmentId } = body;

    const existing = await prisma.position.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Pozisyon bulunamadı' }, { status: 404 });
    }

    const position = await prisma.position.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(code && { code }),
        ...(description !== undefined && { description: description || null }),
        ...(level !== undefined && { level }),
        ...(isActive !== undefined && { isActive }),
        ...(departmentId !== undefined && { departmentId: departmentId || null }),
      },
      include: {
        department: true,
        _count: {
          select: { users: true },
        },
      },
    });

    return NextResponse.json(position);
  } catch (error: any) {
    console.error('Pozisyon güncelleme hatası:', error);
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Bu kod bu departmanda zaten kullanılıyor' },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: 'Pozisyon güncellenemedi' }, { status: 500 });
  }
}

// DELETE - Pozisyon sil
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const existing = await prisma.position.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Pozisyon bulunamadı' }, { status: 404 });
    }

    if (existing._count.users > 0) {
      return NextResponse.json(
        { error: `Bu pozisyonda ${existing._count.users} kullanıcı bulunmaktadır. Önce kullanıcıları başka pozisyona taşıyın.` },
        { status: 400 }
      );
    }

    await prisma.position.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Pozisyon başarıyla silindi' });
  } catch (error) {
    console.error('Pozisyon silme hatası:', error);
    return NextResponse.json({ error: 'Pozisyon silinemedi' }, { status: 500 });
  }
}
