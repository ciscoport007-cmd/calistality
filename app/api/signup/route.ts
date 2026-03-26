import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, surname, roleId, departmentId, positionId } = body;

    // Validasyon
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, şifre ve ad zorunludur' },
        { status: 400 }
      );
    }

    // Email kontrolü
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Bu email adresi zaten kullanılıyor' },
        { status: 400 }
      );
    }

    // Şifre hash
    const hashedPassword = await bcrypt.hash(password, 10);

    // Kullanıcı oluştur
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        surname: surname || null,
        roleId: roleId || null,
        departmentId: departmentId || null,
        positionId: positionId || null,
      },
      include: {
        role: true,
        department: true,
        position: true,
      },
    });

    // Şifreyi response'dan kaldır
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json(
      { user: userWithoutPassword, message: 'Kullanıcı başarıyla oluşturuldu' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Kullanıcı oluşturulurken bir hata oluştu' },
      { status: 500 }
    );
  }
}
