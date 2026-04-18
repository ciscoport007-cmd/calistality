import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { isAdmin } from '@/lib/audit';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    if (!isAdmin(session.user.role)) {
      return NextResponse.json(
        { error: 'Rol silme işlemi yalnızca Admin yetkisiyle yapılabilir.' },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    const role = await prisma.role.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });

    if (!role) {
      return NextResponse.json({ error: 'Rol bulunamadı.' }, { status: 404 });
    }

    if (role._count.users > 0) {
      return NextResponse.json(
        { error: `Bu role atanmış ${role._count.users} kullanıcı bulunmaktadır. Önce kullanıcıları başka bir role atayın.` },
        { status: 400 }
      );
    }

    await prisma.role.delete({ where: { id } });

    return NextResponse.json({ message: 'Rol silindi.' });
  } catch (error) {
    console.error('Role DELETE error:', error);
    return NextResponse.json({ error: 'Rol silinirken hata oluştu.' }, { status: 500 });
  }
}
