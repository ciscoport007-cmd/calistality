import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Kayıt formu için auth gerektirmeyen pozisyon listesi
export async function GET() {
  try {
    const positions = await prisma.position.findMany({
      where: { isActive: true },
      select: { id: true, name: true, code: true, departmentId: true },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json({ positions });
  } catch {
    return NextResponse.json({ error: 'Pozisyonlar yüklenemedi' }, { status: 500 });
  }
}
