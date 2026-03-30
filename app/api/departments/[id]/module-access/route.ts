import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { PrismaClient } from '@prisma/client';
import { isAdmin } from '@/lib/audit';
import { ALL_MODULE_KEYS } from '@/lib/modules';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

/** GET /api/departments/[id]/module-access — departmanın modül erişim listesi */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
  }
  if (!isAdmin(session.user.role)) {
    return NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 });
  }

  const records = await prisma.moduleAccess.findMany({
    where: { departmentId: params.id },
    select: { moduleKey: true },
  });

  return NextResponse.json({ modules: records.map((r) => r.moduleKey) });
}

/**
 * PUT /api/departments/[id]/module-access
 * Body: { modules: string[] }  — boş dizi = tüm kısıtlamalar kaldırılır
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
  }
  if (!isAdmin(session.user.role)) {
    return NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.modules)) {
    return NextResponse.json({ error: 'Geçersiz istek gövdesi' }, { status: 400 });
  }

  const validKeys = (body.modules as unknown[]).filter(
    (k): k is string => typeof k === 'string' && ALL_MODULE_KEYS.includes(k)
  );

  await prisma.$transaction([
    prisma.moduleAccess.deleteMany({ where: { departmentId: params.id } }),
    ...(validKeys.length > 0
      ? [
          prisma.moduleAccess.createMany({
            data: validKeys.map((moduleKey) => ({ moduleKey, departmentId: params.id })),
          }),
        ]
      : []),
  ]);

  return NextResponse.json({ modules: validKeys });
}
