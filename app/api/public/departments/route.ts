import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Kayıt formu için auth gerektirmeyen departman listesi
export async function GET() {
  try {
    const departments = await prisma.department.findMany({
      where: { isActive: true },
      select: { id: true, name: true, code: true },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json({ departments });
  } catch {
    return NextResponse.json({ error: 'Departmanlar yüklenemedi' }, { status: 500 });
  }
}
