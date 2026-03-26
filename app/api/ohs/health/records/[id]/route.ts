import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

// Kayıt detayı
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await params;

    const record = await prisma.oHSHealthRecord.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, surname: true, email: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
      },
    });

    if (!record) {
      return NextResponse.json({ error: 'Kayıt bulunamadı' }, { status: 404 });
    }

    return NextResponse.json(record);
  } catch (error) {
    console.error('Health record fetch error:', error);
    return NextResponse.json(
      { error: 'Kayıt alınamadı' },
      { status: 500 }
    );
  }
}

// Kayıt güncelle
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Yetki kontrolü: admin veya kaydı oluşturan kişi
    const existing = await prisma.oHSHealthRecord.findUnique({ where: { id }, select: { createdById: true } });
    if (!existing) {
      return NextResponse.json({ error: 'Kayıt bulunamadı' }, { status: 404 });
    }
    const adminRoles = ['admin', 'yönetici', 'strateji ofisi'];
    const userRole = (session.user as any).role || '';
    const isAdmin = adminRoles.some(r => userRole.toLowerCase() === r.toLowerCase());
    if (!isAdmin && existing.createdById !== session.user.id) {
      return NextResponse.json({ error: 'Bu kaydı düzenleme yetkiniz yok' }, { status: 403 });
    }

    const record = await prisma.oHSHealthRecord.update({
      where: { id },
      data: body,
      include: {
        user: { select: { id: true, name: true, surname: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
      },
    });

    return NextResponse.json(record);
  } catch (error) {
    console.error('Health record update error:', error);
    return NextResponse.json(
      { error: 'Kayıt güncellenemedi' },
      { status: 500 }
    );
  }
}

// Kayıt sil
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await params;

    await prisma.oHSHealthRecord.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Health record delete error:', error);
    return NextResponse.json(
      { error: 'Kayıt silinemedi' },
      { status: 500 }
    );
  }
}
