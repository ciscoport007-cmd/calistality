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

    const roles = await prisma.role.findMany({
      include: {
        _count: {
          select: { users: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ roles: roles ?? [] });
  } catch (error) {
    console.error('Roles GET error:', error);
    return NextResponse.json(
      { error: 'Roller getirilirken hata oluştu' },
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
    const { name, description } = body ?? {};

    if (!name) {
      return NextResponse.json({ error: 'Rol adı zorunludur' }, { status: 400 });
    }

    const role = await prisma.role.create({
      data: {
        name,
        description: description || null,
      },
    });

    return NextResponse.json(
      { role, message: 'Rol başarıyla oluşturuldu' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Roles POST error:', error);
    return NextResponse.json(
      { error: 'Rol oluşturulurken hata oluştu' },
      { status: 500 }
    );
  }
}
