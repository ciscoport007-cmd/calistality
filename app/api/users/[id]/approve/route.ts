import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { isAdmin } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }
    if (!isAdmin(session.user?.role)) {
      return NextResponse.json({ error: 'Bu işlem için yönetici yetkisi gereklidir' }, { status: 403 });
    }

    const { id } = params;
    const body = await request.json().catch(() => ({}));
    const action = body.action ?? 'approve'; // "approve" | "reject"

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, registrationStatus: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
    }

    if (user.registrationStatus !== 'pending') {
      return NextResponse.json({ error: 'Bu kullanıcı onay beklemiyordur' }, { status: 400 });
    }

    if (action === 'approve') {
      await prisma.user.update({
        where: { id },
        data: { isActive: true, registrationStatus: 'approved' },
      });
      return NextResponse.json({ success: true, message: 'Kullanıcı onaylandı' });
    } else {
      // Reddet: kaydı sil
      await prisma.user.delete({ where: { id } });
      return NextResponse.json({ success: true, message: 'Kayıt talebi reddedildi ve silindi' });
    }
  } catch (error) {
    console.error('Approve user error:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
