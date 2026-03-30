import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

async function getAllowedDomain(): Promise<string> {
  try {
    const setting = await prisma.appSettings.findUnique({
      where: { key: 'signup_domain' },
    });
    return setting?.value ?? 'calista.com.tr';
  } catch {
    return 'calista.com.tr';
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { emailPrefix, password, name, surname, phone, departmentId, positionId } = body;

    // Zorunlu alan kontrolü
    if (!emailPrefix || !password || !name || !surname) {
      return NextResponse.json(
        { error: 'Ad, soyad, e-posta kullanıcı adı ve şifre zorunludur' },
        { status: 400 }
      );
    }

    // @ veya domain içeriyorsa reddet
    if (emailPrefix.includes('@') || emailPrefix.includes(' ')) {
      return NextResponse.json(
        { error: 'Geçersiz e-posta kullanıcı adı' },
        { status: 400 }
      );
    }

    const allowedDomain = await getAllowedDomain();
    const email = `${emailPrefix.toLowerCase().trim()}@${allowedDomain}`;

    // Şifre uzunluk kontrolü
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Şifre en az 6 karakter olmalıdır' },
        { status: 400 }
      );
    }

    // Email çakışma kontrolü
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: 'Bu e-posta adresi zaten kullanılıyor' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name.trim(),
        surname: surname.trim(),
        phone: phone?.trim() || null,
        departmentId: departmentId || null,
        positionId: positionId || null,
        isActive: false,
        registrationStatus: 'pending',
      },
    });

    return NextResponse.json(
      { success: true, message: 'Kaydınız başarıyla alındı. Yönetim incelemesinden sonra onaylandığında giriş yapabileceksiniz.' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Kayıt işlemi sırasında bir hata oluştu' },
      { status: 500 }
    );
  }
}
