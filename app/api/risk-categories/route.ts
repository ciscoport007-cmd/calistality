import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export const dynamic = 'force-dynamic';

// Risk kategorileri listesi
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const categories = await prisma.riskCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: { risks: true },
        },
      },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error('Risk kategorileri hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// Yeni kategori oluştur
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const body = await request.json();
    const { name, code, description, color, sortOrder } = body;

    if (!name || !code) {
      return NextResponse.json(
        { error: 'Ad ve kod zorunludur' },
        { status: 400 }
      );
    }

    const category = await prisma.riskCategory.create({
      data: {
        name,
        code,
        description,
        color,
        sortOrder: sortOrder || 0,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Bu ad veya kod zaten kullanılıyor' },
        { status: 400 }
      );
    }
    console.error('Kategori oluşturma hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
