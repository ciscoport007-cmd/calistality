import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

interface ParsedDayData {
  date: Date;
  sheetName: string;
  entries: {
    category: string;
    parentCategory: string | null;
    isTotal: boolean;
    dailyActualTL: number;
    dailyActualEUR: number;
    monthlyActualTL: number;
    monthlyActualEUR: number;
    monthlyBudgetTL: number;
    monthlyBudgetEUR: number;
    yearlyActualEUR: number;
    yearlyBudgetEUR: number;
  }[];
}

const TOTAL_CATEGORIES = [
  'TOTAL ROOM REVENUES',
  'TOTAL EXTRA FOOD REVENUES',
  'TOTAL EXTRA BEVERAGE REVENUES',
  'TOTAL SPA REVENUE',
  'TOTAL OTHER REVENUES',
];

function isTotal(category: string): boolean {
  return TOTAL_CATEGORIES.some((t) => category.toUpperCase().startsWith(t));
}

function getParent(category: string): string | null {
  const upper = category.toUpperCase();
  if (upper.startsWith('TOTAL')) return null;
  if (
    upper.includes('ODA GELİRİ') ||
    upper.includes('ODA GELIRI') ||
    upper.includes('ISKONTO') ||
    upper.includes('İSKONTO') ||
    upper.includes('NO-SHOW') ||
    upper.includes('GEÇ ÇIKIŞ') ||
    upper.includes('GEC CIKIS') ||
    upper.includes("KDV'SIZ") ||
    upper.includes('ALL.INC') ||
    upper.includes('HB ODA') ||
    upper.includes('EXTRA ODA') ||
    upper.includes('ODA DEĞİŞİKLİĞİ') ||
    upper.includes('ODA DEGISIKLIGI') ||
    upper.includes('GÜNÜBIRLIK') ||
    upper.includes('GUNUBIRLIK')
  )
    return 'TOTAL ROOM REVENUES / Toplam Oda Geliri';

  if (
    upper.includes('YİYECEK GELİRİ') ||
    upper.includes('YIYECEK GELIRI') ||
    upper.includes('FOOD REVENUE') ||
    upper.includes('MEMBER DISCOUNT FOOD') ||
    upper.includes('OTHER EXTRA FOOD')
  )
    return 'TOTAL EXTRA FOOD REVENUES / Toplam Ekstra Yiyecek Geliri';

  if (
    upper.includes('İÇECEK GELİRİ') ||
    upper.includes('ICECEK GELIRI') ||
    upper.includes('BEVERAGE REVENUE') ||
    upper.includes('MEMBER DISCOUNT BEVERAGE')
  )
    return 'TOTAL EXTRA BEVERAGE REVENUES / Toplam Ekstra İçecek Geliri';

  if (
    upper.includes('SPA') ||
    upper.includes('MASAJ') ||
    upper.includes('CİLT BAKIM') ||
    upper.includes('CILT BAKIM') ||
    upper.includes('VÜCUT BAKIM') ||
    upper.includes('VUCUT BAKIM') ||
    upper.includes('PAKET SATIŞ') ||
    upper.includes('PAKET SATIS') ||
    upper.includes('KOZMETİK') ||
    upper.includes('KOZMETIK') ||
    upper.includes('KUAFÖR') ||
    upper.includes('KUAFOR') ||
    upper.includes('TATTO') ||
    upper.includes('CREATIF')
  )
    return 'TOTAL SPA REVENUE / Toplam  Spa Geliri ';

  return 'TOTAL OTHER REVENUES / Toplam Diğer Gelirler';
}

function safeNum(val: unknown): number {
  if (val === null || val === undefined) return 0;
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}

function parseSheetDate(sheetName: string): Date | null {
  const trimmed = sheetName.trim();
  const match = trimmed.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
  if (!match) return null;
  const [, day, month, year] = match;
  return new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0);
}

function parseSheet(ws: XLSX.WorkSheet, sheetName: string): ParsedDayData | null {
  const date = parseSheetDate(sheetName);
  if (!date) return null;

  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null });

  const entries: ParsedDayData['entries'] = [];
  let currentTotal: string | null = null;

  for (let i = 6; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    const category = row[1];
    if (!category || typeof category !== 'string') continue;

    const cat = category.trim();
    if (!cat) continue;

    const entry = {
      category: cat,
      parentCategory: null as string | null,
      isTotal: isTotal(cat),
      dailyActualTL: safeNum(row[2]),
      dailyActualEUR: safeNum(row[3]),
      monthlyActualTL: safeNum(row[4]),
      monthlyActualEUR: safeNum(row[5]),
      monthlyBudgetTL: safeNum(row[6]),
      monthlyBudgetEUR: safeNum(row[7]),
      yearlyActualEUR: safeNum(row[8]),
      yearlyBudgetEUR: safeNum(row[9]),
    };

    if (entry.isTotal) {
      currentTotal = cat;
      entry.parentCategory = null;
    } else {
      entry.parentCategory = currentTotal;
    }

    entries.push(entry);
  }

  return { date, sheetName, entries };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const forceOverwrite = formData.get('forceOverwrite') === 'true';

    if (!file) {
      return NextResponse.json({ error: 'Dosya bulunamadı' }, { status: 400 });
    }

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return NextResponse.json({ error: 'Sadece .xlsx veya .xls dosyası kabul edilir' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array', cellDates: true });

    const parsedDays: ParsedDayData[] = [];
    for (const sheetName of wb.SheetNames) {
      if (sheetName.toUpperCase().startsWith('KAPAK')) continue;
      const ws = wb.Sheets[sheetName];
      const parsed = parseSheet(ws, sheetName);
      if (parsed) parsedDays.push(parsed);
    }

    if (parsedDays.length === 0) {
      return NextResponse.json({ error: 'Geçerli günlük veri bulunamadı' }, { status: 400 });
    }

    const existingDates = await prisma.financeReport.findMany({
      where: {
        reportDate: { in: parsedDays.map((d) => d.date) },
      },
      select: { reportDate: true },
    });

    const existingSet = new Set(existingDates.map((r) => r.reportDate.toISOString().split('T')[0]));
    const newDays = parsedDays.filter((d) => !existingSet.has(d.date.toISOString().split('T')[0]));
    const duplicateDays = parsedDays.filter((d) => existingSet.has(d.date.toISOString().split('T')[0]));

    if (!forceOverwrite && duplicateDays.length > 0 && newDays.length === 0) {
      return NextResponse.json(
        {
          preview: true,
          message: 'Tüm günler zaten kayıtlı',
          newDays: [],
          duplicateDays: duplicateDays.map((d) => d.date.toISOString().split('T')[0]),
          totalParsed: parsedDays.length,
        },
        { status: 200 }
      );
    }

    if (!forceOverwrite && duplicateDays.length > 0) {
      return NextResponse.json(
        {
          preview: true,
          message: 'Bazı günler zaten kayıtlı. Devam etmek istiyor musunuz?',
          newDays: newDays.map((d) => d.date.toISOString().split('T')[0]),
          duplicateDays: duplicateDays.map((d) => d.date.toISOString().split('T')[0]),
          totalParsed: parsedDays.length,
        },
        { status: 200 }
      );
    }

    const daysToSave = forceOverwrite ? parsedDays : newDays;

    if (forceOverwrite) {
      await prisma.financeReport.deleteMany({
        where: { reportDate: { in: daysToSave.map((d) => d.date) } },
      });
    }

    let savedCount = 0;
    for (const day of daysToSave) {
      await prisma.financeReport.create({
        data: {
          reportDate: day.date,
          fileName: file.name,
          sheetName: day.sheetName,
          uploadedById: session.user.id,
          entries: {
            create: day.entries.map((e) => ({
              reportDate: day.date,
              category: e.category,
              parentCategory: e.parentCategory,
              isTotal: e.isTotal,
              dailyActualTL: e.dailyActualTL,
              dailyActualEUR: e.dailyActualEUR,
              monthlyActualTL: e.monthlyActualTL,
              monthlyActualEUR: e.monthlyActualEUR,
              monthlyBudgetTL: e.monthlyBudgetTL,
              monthlyBudgetEUR: e.monthlyBudgetEUR,
              yearlyActualEUR: e.yearlyActualEUR,
              yearlyBudgetEUR: e.yearlyBudgetEUR,
            })),
          },
        },
      });
      savedCount++;
    }

    return NextResponse.json({
      success: true,
      savedCount,
      skippedCount: forceOverwrite ? 0 : duplicateDays.length,
      message: `${savedCount} gün başarıyla kaydedildi${duplicateDays.length > 0 && !forceOverwrite ? `, ${duplicateDays.length} gün atlandı (zaten mevcut)` : ''}`,
    });
  } catch (error) {
    console.error('Finance upload error:', error);
    return NextResponse.json({ error: 'Dosya işlenirken hata oluştu' }, { status: 500 });
  }
}
