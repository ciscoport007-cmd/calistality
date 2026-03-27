import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const areas = await prisma.hACCPCleaningArea.findMany({
      where: { isActive: true },
      include: {
        createdBy: { select: { id: true, name: true, surname: true } },
        _count: { select: { cleaningLogs: true } },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(areas);
  } catch (error) {
    console.error('HACCP cleaning areas fetch error:', error);
    return NextResponse.json({ error: 'Temizlik alanları alınamadı' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const body = await request.json();
    const { name, areaType, description, checklistItems, frequency } = body;

    if (!name || !areaType || !checklistItems || !Array.isArray(checklistItems)) {
      return NextResponse.json({ error: 'Ad, alan tipi ve kontrol listesi zorunludur' }, { status: 400 });
    }

    const area = await prisma.hACCPCleaningArea.create({
      data: {
        name,
        areaType,
        description: description || null,
        checklistItems: JSON.stringify(checklistItems),
        frequency: frequency || 'GUNLUK',
        createdById: session.user.id,
      },
    });

    return NextResponse.json(area, { status: 201 });
  } catch (error) {
    console.error('HACCP cleaning area create error:', error);
    return NextResponse.json({ error: 'Temizlik alanı oluşturulamadı' }, { status: 500 });
  }
}
