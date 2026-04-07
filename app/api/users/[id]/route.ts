import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { isAdmin } from '@/lib/audit';

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

    const user = await prisma.user.findUnique({
      where: { id: params?.id },
      include: {
        role: true,
        department: true,
        position: true,
        groups: {
          include: {
            group: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
    }

    const { password, ...userWithoutPassword } = user ?? {};

    return NextResponse.json({ user: userWithoutPassword });
  } catch (error) {
    console.error('User GET error:', error);
    return NextResponse.json(
      { error: 'Kullanıcı getirilirken hata oluştu' },
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
    const { email, password, name, surname, phone, roleId, departmentId, positionId, isActive } = body ?? {};

    // Admin yetkisi kontrolü - pozisyon, rol, departman ve aktiflik değişiklikleri için
    const adminOnlyFields = roleId !== undefined || departmentId !== undefined || positionId !== undefined || isActive !== undefined;
    if (adminOnlyFields && !isAdmin(session.user?.role)) {
      return NextResponse.json(
        { error: 'Bu işlem için yönetici yetkisi gereklidir' },
        { status: 403 }
      );
    }

    const updateData: any = {};
    if (email !== undefined) updateData.email = email;
    if (name !== undefined) updateData.name = name;
    if (surname !== undefined) updateData.surname = surname;
    if (phone !== undefined) updateData.phone = phone;
    if (roleId !== undefined) updateData.roleId = roleId;
    if (departmentId !== undefined) updateData.departmentId = departmentId;
    if (positionId !== undefined) updateData.positionId = positionId;
    if (isActive !== undefined) updateData.isActive = isActive;

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id: params?.id },
      data: updateData,
      include: {
        role: true,
        department: true,
        position: true,
      },
    });

    const { password: _, ...userWithoutPassword } = user ?? {};

    return NextResponse.json({
      user: userWithoutPassword,
      message: 'Kullanıcı başarıyla güncellendi',
    });
  } catch (error) {
    console.error('User PATCH error:', error);
    return NextResponse.json(
      { error: 'Kullanıcı güncellenirken hata oluştu' },
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

    // Sadece admin kullanıcı silebilir
    if (!isAdmin(session.user?.role)) {
      return NextResponse.json(
        { error: 'Bu işlem için yönetici yetkisi gereklidir' },
        { status: 403 }
      );
    }

    await prisma.user.delete({
      where: { id: params?.id },
    });

    return NextResponse.json({ message: 'Kullanıcı başarıyla silindi' });
  } catch (error) {
    console.error('User DELETE error:', error);
    return NextResponse.json(
      { error: 'Kullanıcı silinirken hata oluştu' },
      { status: 500 }
    );
  }
}
