import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { canCreate } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// GET - Tüm pozisyonları listele
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') !== 'false';
    const departmentId = searchParams.get('departmentId');

    const whereClause: any = {};
    
    if (activeOnly) {
      whereClause.isActive = true;
    }
    
    if (departmentId) {
      whereClause.departmentId = departmentId;
    }

    const positions = await prisma.position.findMany({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
      include: {
        department: true,
        _count: {
          select: { users: true },
        },
      },
    });

    return NextResponse.json(positions);
  } catch (error) {
    console.error('Pozisyon listesi hatası:', error);
    return NextResponse.json(
      { error: 'Pozisyonlar getirilemedi' },
      { status: 500 }
    );
  }
}

// POST - Yeni pozisyon oluştur
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    // Yalnızca Admin ve Yönetici rolleri yeni içerik oluşturabilir
    if (!canCreate(session.user?.role)) {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz bulunmamaktadır' }, { status: 403 });
    }

    const body = await request.json();
    const { name, code, description, level, departmentId } = body;

    if (!name || !code) {
      return NextResponse.json(
        { error: 'İsim ve kod zorunludur' },
        { status: 400 }
      );
    }

    const position = await prisma.position.create({
      data: {
        name,
        code,
        description,
        level: level || 0,
        departmentId: departmentId || null,
      },
      include: {
        department: true,
        _count: {
          select: { users: true },
        },
      },
    });

    return NextResponse.json(position, { status: 201 });
  } catch (error: any) {
    console.error('Pozisyon oluşturma hatası:', error);
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Bu kod bu departmanda zaten kullanılıyor' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Pozisyon oluşturulamadı' },
      { status: 500 }
    );
  }
}
