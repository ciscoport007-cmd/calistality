import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

// Şikayet kategorilerini listele
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const categories = await prisma.complaintCategory.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error('Kategori listesi hatası:', error);
    return NextResponse.json({ error: 'Kategoriler alınamadı' }, { status: 500 });
  }
}

// Yeni kategori oluştur
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const body = await request.json();
    const { name, code, description } = body;

    if (!name || !code) {
      return NextResponse.json({ error: 'Ad ve kod zorunludur' }, { status: 400 });
    }

    const category = await prisma.complaintCategory.create({
      data: {
        name,
        code: code.toUpperCase(),
        description,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error: unknown) {
    console.error('Kategori oluşturma hatası:', error);
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'Bu ad veya kod zaten kullanılıyor' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Kategori oluşturulamadı' }, { status: 500 });
  }
}
