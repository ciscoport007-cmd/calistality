import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const categories = await prisma.supplierCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: { suppliers: true }
        }
      }
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error('Supplier categories fetch error:', error);
    return NextResponse.json(
      { error: 'Kategoriler alınamadı' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const body = await request.json();
    const { name, code, description, color } = body;

    if (!name || !code) {
      return NextResponse.json(
        { error: 'Kategori adı ve kodu zorunludur' },
        { status: 400 }
      );
    }

    const existingCategory = await prisma.supplierCategory.findUnique({
      where: { code }
    });

    if (existingCategory) {
      return NextResponse.json(
        { error: 'Bu kod ile bir kategori zaten mevcut' },
        { status: 400 }
      );
    }

    const maxOrder = await prisma.supplierCategory.aggregate({
      _max: { sortOrder: true }
    });

    const category = await prisma.supplierCategory.create({
      data: {
        name,
        code: code.toUpperCase(),
        description,
        color: color || '#6B7280',
        sortOrder: (maxOrder._max.sortOrder || 0) + 1
      }
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('Supplier category create error:', error);
    return NextResponse.json(
      { error: 'Kategori oluşturulamadı' },
      { status: 500 }
    );
  }
}
