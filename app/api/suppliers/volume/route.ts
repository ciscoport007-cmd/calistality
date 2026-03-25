import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

// Tüm tedarikçilerin işlem hacmi yüzdeliklerini getir
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    // Tüm tedarikçileri ve harcamalarını al
    const suppliers = await prisma.supplier.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        code: true,
        totalOrderAmount: true,
      },
      orderBy: { totalOrderAmount: 'desc' },
    });

    // Toplam harcamayı hesapla
    const totalExpense = suppliers.reduce((sum, s) => sum + (s.totalOrderAmount || 0), 0);

    // Yüzdelikleri hesapla
    const volumeData = suppliers
      .filter(s => (s.totalOrderAmount || 0) > 0)
      .map(s => ({
        id: s.id,
        name: s.name,
        code: s.code,
        amount: s.totalOrderAmount || 0,
        percentage: totalExpense > 0 ? ((s.totalOrderAmount || 0) / totalExpense) * 100 : 0,
      }))
      .sort((a, b) => b.percentage - a.percentage);

    return NextResponse.json({
      totalExpense,
      suppliers: volumeData,
    });
  } catch (error) {
    console.error('Volume fetch error:', error);
    return NextResponse.json(
      { error: 'İşlem hacmi alınamadı' },
      { status: 500 }
    );
  }
}
