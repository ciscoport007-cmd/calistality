import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export const dynamic = 'force-dynamic';

// Aşı kaydını sil (soft delete)
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

    const existing = await prisma.oHSVaccination.findUnique({
      where: { id },
      select: { createdById: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Kayıt bulunamadı' }, { status: 404 });
    }

    const adminRoles = ['admin', 'yönetici', 'strateji ofisi'];
    const userRole = (session.user as any).role || '';
    const isAdmin = adminRoles.some(r => userRole.toLowerCase() === r.toLowerCase());

    if (!isAdmin && existing.createdById !== session.user.id) {
      return NextResponse.json({ error: 'Bu kaydı silme yetkiniz yok' }, { status: 403 });
    }

    await prisma.oHSVaccination.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Vaccination delete error:', error);
    return NextResponse.json({ error: 'Kayıt silinemedi' }, { status: 500 });
  }
}
