import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const currency = searchParams.get('currency') ?? 'EUR';

    const where: Record<string, unknown> = {};
    if (from || to) {
      where.reportDate = {};
      if (from) (where.reportDate as Record<string, Date>).gte = new Date(from);
      if (to) (where.reportDate as Record<string, Date>).lte = new Date(to);
    }

    const entries = await prisma.revenueEntry.findMany({
      where: { ...where, isTotal: true },
      orderBy: [{ reportDate: 'asc' }, { category: 'asc' }],
    });

    const rows = entries.map((e) => ({
      Tarih: format(e.reportDate, 'dd.MM.yyyy', { locale: tr }),
      Kategori: e.category,
      'Günlük Gerçekleşen (TL)': e.dailyActualTL.toFixed(2),
      'Günlük Gerçekleşen (EUR)': e.dailyActualEUR.toFixed(2),
      'Aylık Gerçekleşen (TL)': e.monthlyActualTL.toFixed(2),
      'Aylık Gerçekleşen (EUR)': e.monthlyActualEUR.toFixed(2),
      'Aylık Bütçe (TL)': e.monthlyBudgetTL.toFixed(2),
      'Aylık Bütçe (EUR)': e.monthlyBudgetEUR.toFixed(2),
      'Yıllık Gerçekleşen (EUR)': e.yearlyActualEUR.toFixed(2),
      'Yıllık Bütçe (EUR)': e.yearlyBudgetEUR.toFixed(2),
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 12 },
      { wch: 50 },
      { wch: 25 },
      { wch: 25 },
      { wch: 25 },
      { wch: 25 },
      { wch: 20 },
      { wch: 20 },
      { wch: 25 },
      { wch: 20 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Gelir Raporu');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const fileName = `gelir_raporu_${from ?? 'baslangic'}_${to ?? 'bitis'}_${currency}.xlsx`;

    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error('Finance export error:', error);
    return NextResponse.json({ error: 'Dışa aktarma sırasında hata oluştu' }, { status: 500 });
  }
}
