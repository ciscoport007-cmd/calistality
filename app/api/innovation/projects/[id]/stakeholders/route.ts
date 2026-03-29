import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth-options';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

// GET - Paydaş listesi
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await context.params;

    const stakeholders = await prisma.innovationProjectStakeholder.findMany({
      where: { projectId: id },
      include: { user: { select: { id: true, name: true, surname: true, email: true } } },
    });

    return NextResponse.json(stakeholders);
  } catch (error) {
    console.error('Paydaş listesi hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// POST - Paydaş ekle
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await context.params;
    const { userId, role } = await request.json();

    if (!userId || !role) {
      return NextResponse.json({ error: 'Kullanıcı ve rol zorunludur' }, { status: 400 });
    }

    const stakeholder = await prisma.innovationProjectStakeholder.create({
      data: { projectId: id, userId, role },
      include: { user: { select: { id: true, name: true, surname: true, email: true } } },
    });

    return NextResponse.json(stakeholder, { status: 201 });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Bu kullanıcı zaten paydaş olarak eklenmiş' }, { status: 409 });
    }
    console.error('Paydaş ekleme hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// DELETE - Paydaş çıkar
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const stakeholderId = searchParams.get('stakeholderId');
    if (!stakeholderId) {
      return NextResponse.json({ error: 'Paydaş ID gerekli' }, { status: 400 });
    }

    await prisma.innovationProjectStakeholder.delete({ where: { id: stakeholderId } });

    return NextResponse.json({ message: 'Paydaş çıkarıldı' });
  } catch (error) {
    console.error('Paydaş silme hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
