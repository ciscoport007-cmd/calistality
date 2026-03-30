import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { isAdmin } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }
    if (!isAdmin(session.user?.role)) {
      return NextResponse.json({ error: 'Bu işlem için yönetici yetkisi gereklidir' }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      where: { registrationStatus: 'pending' },
      select: {
        id: true,
        email: true,
        name: true,
        surname: true,
        phone: true,
        createdAt: true,
        department: { select: { id: true, name: true } },
        position: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Pending users error:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
