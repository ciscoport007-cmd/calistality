import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isAdmin } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await params;
    const form = await prisma.zimmetForm.findFirst({
      where: { id, isActive: true },
      include: {
        issuedBy: { select: { id: true, name: true, email: true } },
        receivedBy: { select: { id: true, name: true, email: true } },
        items: true,
      },
    });

    if (!form) {
      return NextResponse.json({ error: 'Zimmet formu bulunamadı' }, { status: 404 });
    }

    return NextResponse.json({ form });
  } catch (error) {
    console.error('Zimmet GET [id] error:', error);
    return NextResponse.json({ error: 'Zimmet formu getirilemedi' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await params;
    const form = await prisma.zimmetForm.findFirst({ where: { id, isActive: true } });

    if (!form) {
      return NextResponse.json({ error: 'Zimmet formu bulunamadı' }, { status: 404 });
    }
    if (form.status === 'SIGNED') {
      return NextResponse.json({ error: 'İmzalanmış form düzenlenemez' }, { status: 403 });
    }
    if (form.issuedById !== session.user.id && !isAdmin(session.user.role)) {
      return NextResponse.json({ error: 'Bu formu düzenleme yetkiniz yok' }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, status } = body;

    const updated = await prisma.zimmetForm.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(status === 'CANCELLED' && { status: 'CANCELLED' }),
      },
    });

    return NextResponse.json({ form: updated });
  } catch (error) {
    console.error('Zimmet PATCH error:', error);
    return NextResponse.json({ error: 'Zimmet formu güncellenemedi' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await params;
    const form = await prisma.zimmetForm.findFirst({ where: { id, isActive: true } });

    if (!form) {
      return NextResponse.json({ error: 'Zimmet formu bulunamadı' }, { status: 404 });
    }
    if (form.status === 'SIGNED') {
      return NextResponse.json({ error: 'İmzalanmış form silinemez' }, { status: 403 });
    }
    if (form.issuedById !== session.user.id && !isAdmin(session.user.role)) {
      return NextResponse.json({ error: 'Bu formu silme yetkiniz yok' }, { status: 403 });
    }

    await prisma.zimmetForm.update({ where: { id }, data: { isActive: false } });

    return NextResponse.json({ message: 'Zimmet formu silindi' });
  } catch (error) {
    console.error('Zimmet DELETE error:', error);
    return NextResponse.json({ error: 'Zimmet formu silinemedi' }, { status: 500 });
  }
}
