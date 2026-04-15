import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { canCreate } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const forms = await prisma.zimmetForm.findMany({
      where: { isActive: true },
      include: {
        issuedBy: { select: { id: true, name: true, email: true } },
        receivedBy: { select: { id: true, name: true, email: true } },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ forms });
  } catch (error) {
    console.error('Zimmet GET error:', error);
    return NextResponse.json({ error: 'Zimmet formları getirilemedi' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }
    if (!canCreate(session.user.role)) {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, receivedById, receiverName, items } = body ?? {};

    if (!title) {
      return NextResponse.json({ error: 'Başlık zorunludur' }, { status: 400 });
    }
    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'En az bir kalem eklenmelidir' }, { status: 400 });
    }

    const year = new Date().getFullYear();
    const count = await prisma.zimmetForm.count();
    const formNo = `ZF-${year}-${String(count + 1).padStart(4, '0')}`;

    const form = await prisma.zimmetForm.create({
      data: {
        formNo,
        title,
        description: description || null,
        issuedById: session.user.id,
        receivedById: receivedById || null,
        receiverName: receiverName || null,
        items: {
          create: items.map((item: any) => ({
            category: item.category,
            name: item.name,
            quantity: item.quantity || 1,
            condition: item.condition || 'IYI',
            note: item.note || null,
          })),
        },
      },
      include: {
        issuedBy: { select: { id: true, name: true } },
        receivedBy: { select: { id: true, name: true } },
        items: true,
      },
    });

    return NextResponse.json({ form }, { status: 201 });
  } catch (error) {
    console.error('Zimmet POST error:', error);
    return NextResponse.json({ error: 'Zimmet formu oluşturulamadı' }, { status: 500 });
  }
}
