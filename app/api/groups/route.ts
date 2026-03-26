import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export const dynamic = 'force-dynamic';

// Grupları listele
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const groups = await prisma.group.findMany({
      where: { isActive: true },
      include: {
        users: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                surname: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: { users: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(groups);
  } catch (error) {
    console.error('Grup listesi hatası:', error);
    return NextResponse.json({ error: 'Gruplar alınamadı' }, { status: 500 });
  }
}

// Yeni grup oluştur
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json({ error: 'Grup adı zorunludur' }, { status: 400 });
    }

    const group = await prisma.group.create({
      data: {
        name,
        description,
      },
    });

    return NextResponse.json(group, { status: 201 });
  } catch (error: unknown) {
    console.error('Grup oluşturma hatası:', error);
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'Bu grup adı zaten kullanılıyor' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Grup oluşturulamadı' }, { status: 500 });
  }
}
