import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { PrismaClient } from '@prisma/client';
import { hasFullAccess, ALL_MODULE_KEYS } from '@/lib/modules';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

/**
 * GET /api/module-access
 *
 * Mevcut kullanıcının erişebileceği modül anahtarlarını döndürür.
 * - Admin / yönetici rolleri → null (tüm modüller, filtreleme yok)
 * - Kullanıcı bazlı kayıt varsa → kullanıcı kaydındaki modüller
 * - Yoksa departman bazlı kayıt varsa → departman modülleri
 * - Hiç kayıt yoksa → null (tüm modüller, geriye dönük uyumluluk)
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
  }

  const { id: userId, role, departmentId } = session.user as {
    id: string;
    role?: string;
    departmentId?: string;
  };

  // Yönetici rolleri → tam erişim
  if (hasFullAccess(role)) {
    return NextResponse.json({ modules: null });
  }

  // Kullanıcı bazlı modül erişimi
  const userModules = await prisma.moduleAccess.findMany({
    where: { userId },
    select: { moduleKey: true },
  });

  if (userModules.length > 0) {
    return NextResponse.json({ modules: userModules.map((m) => m.moduleKey) });
  }

  // Departman bazlı modül erişimi
  if (departmentId) {
    const deptModules = await prisma.moduleAccess.findMany({
      where: { departmentId },
      select: { moduleKey: true },
    });

    if (deptModules.length > 0) {
      return NextResponse.json({ modules: deptModules.map((m) => m.moduleKey) });
    }
  }

  // Hiç kayıt yok → tam erişim (geriye dönük uyumluluk)
  return NextResponse.json({ modules: null });
}
