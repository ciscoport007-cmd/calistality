import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { createAuditLog, isAdmin, canCreate } from '@/lib/audit';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const forReviewers = searchParams.get('forReviewers') === 'true';

    // forReviewers parametresi varsa, tüm aktif kullanıcıları döndür (inceleyici seçimi için)
    // Aksi halde sadece admin tüm kullanıcıları görebilir, diğerleri sadece kendi departmanını
    const where: any = {};
    if (forReviewers) {
      // İnceleyici seçimi için tüm aktif kullanıcılar (mevcut kullanıcı hariç)
      where.isActive = true;
      where.id = { not: session.user.id };
    } else if (!isAdmin(session.user.role) && session.user.departmentId) {
      where.departmentId = session.user.departmentId;
    }

    const users = await prisma.user.findMany({
      where,
      include: {
        role: true,
        department: true,
        position: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const usersWithoutPasswords = users?.map?.(({ password, ...user }) => user) ?? [];

    return NextResponse.json({ users: usersWithoutPasswords });
  } catch (error) {
    console.error('Users GET error:', error);
    return NextResponse.json(
      { error: 'Kullanıcılar getirilirken hata oluştu' },
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
    const { email, password, name, surname, phone, roleId, departmentId, positionId } = body ?? {};

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, şifre ve ad zorunludur' },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: 'Bu email adresi zaten kullanılıyor' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        surname: surname || null,
        phone: phone || null,
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

    const { password: _, ...userWithoutPassword } = user ?? {};

    // Audit log
    await createAuditLog({
      userId: session.user.id,
      action: 'CREATE',
      module: 'USERS',
      entityType: 'User',
      entityId: user.id,
      newValues: { email, name, surname, roleId, departmentId },
    });

    return NextResponse.json(
      { user: userWithoutPassword, message: 'Kullanıcı başarıyla oluşturuldu' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Users POST error:', error);
    return NextResponse.json(
      { error: 'Kullanıcı oluşturulurken hata oluştu' },
      { status: 500 }
    );
  }
}
