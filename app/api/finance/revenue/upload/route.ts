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
    lyDailyEUR: number;
    lyMonthlyEUR: number;
    lyYearlyEUR: number;
  }[];
  rawFirstTotalRow?: unknown[];
}

interface ParsedKapakData {
  date: Date;
  statistic: {
    availRoomToday: number;
    availRoomMTD: number;
    availRoomBudget: number;
    availRoomForecast: number;
    availRoomYTD: number;
    soldRoomToday: number;
    soldRoomMTD: number;
    soldRoomBudget: number;
    soldRoomForecast: number;
    soldRoomYTD: number;
    compRoomToday: number;
    compRoomMTD: number;
    occupancyToday: number;
    occupancyMTD: number;
    occupancyBudget: number;
    occupancyForecast: number;
    occupancyYTD: number;
    adrToday: number;
    adrMTD: number;
    adrBudget: number;
    adrForecast: number;
    adrYTD: number;
    avgSalesRateToday: number;
    avgSalesRateMTD: number;
    paxToday: number;
    paxMTD: number;
    paxBudget: number;
    paxForecast: number;
    paxYTD: number;
    outOfOrderToday: number;
    outOfOrderMTD: number;
    outOfOrderYTD: number;
    lyAvailRoomToday: number;
    lyAvailRoomMTD: number;
    lyAvailRoomYTD: number;
    lySoldRoomToday: number;
    lySoldRoomMTD: number;
    lySoldRoomYTD: number;
    lyOccupancyToday: number;
    lyOccupancyMTD: number;
    lyOccupancyYTD: number;
    lyAdrToday: number;
    lyAdrMTD: number;
    lyAdrYTD: number;
    lyPaxToday: number;
    lyPaxMTD: number;
    lyPaxYTD: number;
    lyOutOfOrderToday: number;
    lyOutOfOrderMTD: number;
  };
  exchangeRate: {
    dailyRate: number;
    monthlyAvgRate: number;
    budgetRate: number;
    forecastRate: number;
    yearlyAvgRate: number;
    yearlyBudgetRate: number;
    lyDailyRate: number;
    lyMonthlyRate: number;
    lyYearlyRate: number;
  };
  // LY revenue values from KAPAK revenue block (cols P/R/T = LY Today/Monthly/Yearly EUR)
  // Used to populate lyDailyEUR / lyMonthlyEUR / lyYearlyEUR on total RevenueEntry rows
  lyRevenue: {
    roomLyDailyEUR: number;
    roomLyMonthlyEUR: number;
    roomLyYearlyEUR: number;
    foodLyDailyEUR: number;
    foodLyMonthlyEUR: number;
    foodLyYearlyEUR: number;
    bevLyDailyEUR: number;
    bevLyMonthlyEUR: number;
    bevLyYearlyEUR: number;
    spaLyDailyEUR: number;
    spaLyMonthlyEUR: number;
    spaLyYearlyEUR: number;
    otherLyDailyEUR: number;
    otherLyMonthlyEUR: number;
    otherLyYearlyEUR: number;
    totalLyDailyEUR: number;
    totalLyMonthlyEUR: number;
    totalLyYearlyEUR: number;
  };
}

export interface SheetWarning {
  sheetName: string;
  warnings: string[];
}

const TOTAL_CATEGORIES = [
  'TOTAL ROOM REVENUES',
  'TOTAL EXTRA FOOD REVENUES',
  'TOTAL EXTRA BEVERAGE REVENUES',
  'TOTAL SPA REVENUE',
  'TOTAL OTHER REVENUES',
  'TOTAL FOOTBALL REVENUE',
  'TOTAL A LA CARTE REVENUE',
  'TOTAL TRANSPORTATIONS REVENUE',
  'TOTAL SPORT ACADEMY REVENUE',
];

// Detay sheet'te bu kategori geldiğinde gelir bloğu biter — ödeme/bakiye bölümü başlar
const REVENUE_STOP_MARKER = 'TOTAL PAYMENTS';

const EXPECTED_CATEGORIES: [string, string][] = [
  ['TOTAL ROOM REVENUES', 'Oda Geliri'],
  ['TOTAL EXTRA FOOD REVENUES', 'Yiyecek Geliri'],
  ['TOTAL EXTRA BEVERAGE REVENUES', 'İçecek Geliri'],
  ['TOTAL SPA REVENUE', 'Spa Geliri'],
  ['TOTAL OTHER REVENUES', 'Diğer Gelirler'],
  ['TOTAL FOOTBALL REVENUE', 'Futbol Geliri'],
  ['TOTAL A LA CARTE REVENUE', 'Alakart Geliri'],
  ['TOTAL TRANSPORTATIONS REVENUE', 'Transfer Geliri'],
  ['TOTAL SPORT ACADEMY REVENUE', 'Spor Akademi Geliri'],
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

  if (
    upper.includes('FUTBOL') ||
    upper.includes('FOOTBALL')
  )
    return 'TOTAL FOOTBALL REVENUE / Toplam Futbol Geliri';

  if (
    upper.includes('A LA CARTE') ||
    upper.includes('ALAKART') ||
    upper.includes('REZERVASYON GELİRİ') ||
    upper.includes('REZERVASYON GELIRI')
  )
    return 'TOTAL A LA CARTE REVENUE / Toplam Alakart Geliri';

  if (
    upper.includes('TRANSFER') ||
    upper.includes('TRANSPORTATION') ||
    upper.includes('CIP SERVIS') ||
    upper.includes('CIP SERVİS')
  )
    return 'TOTAL TRANSPORTATIONS REVENUE / Toplam Transfer Geliri';

  if (
    upper.includes('TENIS') ||
    upper.includes('TENİS') ||
    upper.includes('AKADEMI') ||
    upper.includes('AKADEMİ') ||
    upper.includes('FITNESS') ||
    upper.includes('YÜZME') ||
    upper.includes('YUZME') ||
    upper.includes('SPOR EKİPMAN') ||
    upper.includes('SPOR EKIPMAN') ||
    upper.includes('VOLLEYBALL') ||
    upper.includes('BASKETBALL')
  )
    return 'TOTAL SPORT ACADEMY REVENUE / Toplam Spor Akademi Geliri';

  return 'TOTAL OTHER REVENUES / Toplam Diğer Gelirler';
}

// Suppress unused warning — getParent is available for future sub-category use
void getParent;

// Returns KAPAK-sourced LY values for a given total revenue category.
// Falls back to the Detay-parsed value (usually 0) when no KAPAK match.
function resolveKapakLY(
  category: string,
  detayLyDaily: number,
  detayLyMonthly: number,
  detayLyYearly: number,
  kapak: ParsedKapakData | undefined
): { lyDailyEUR: number; lyMonthlyEUR: number; lyYearlyEUR: number } {
  if (!kapak) return { lyDailyEUR: detayLyDaily, lyMonthlyEUR: detayLyMonthly, lyYearlyEUR: detayLyYearly };
  const up = category.toUpperCase();
  const ly = kapak.lyRevenue;
  if (up.startsWith('TOTAL ROOM REVENUES'))
    return { lyDailyEUR: ly.roomLyDailyEUR, lyMonthlyEUR: ly.roomLyMonthlyEUR, lyYearlyEUR: ly.roomLyYearlyEUR };
  if (up.startsWith('TOTAL EXTRA FOOD REVENUES'))
    return { lyDailyEUR: ly.foodLyDailyEUR, lyMonthlyEUR: ly.foodLyMonthlyEUR, lyYearlyEUR: ly.foodLyYearlyEUR };
  if (up.startsWith('TOTAL EXTRA BEVERAGE REVENUES'))
    return { lyDailyEUR: ly.bevLyDailyEUR, lyMonthlyEUR: ly.bevLyMonthlyEUR, lyYearlyEUR: ly.bevLyYearlyEUR };
  if (up.startsWith('TOTAL SPA REVENUE'))
    return { lyDailyEUR: ly.spaLyDailyEUR, lyMonthlyEUR: ly.spaLyMonthlyEUR, lyYearlyEUR: ly.spaLyYearlyEUR };
  if (up.startsWith('TOTAL OTHER REVENUES'))
    return { lyDailyEUR: ly.otherLyDailyEUR, lyMonthlyEUR: ly.otherLyMonthlyEUR, lyYearlyEUR: ly.otherLyYearlyEUR };
  // Football, A La Carte, Transportation, Sport Academy are consolidated under Misc in KAPAK
  // — no separate LY breakdown available, return 0
  return { lyDailyEUR: 0, lyMonthlyEUR: 0, lyYearlyEUR: 0 };
}

function safeNum(val: unknown): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'string' && val.trim() === '-') return 0;
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

function validateParsedDay(day: ParsedDayData): string[] {
  const warnings: string[] = [];
  const totalEntries = day.entries.filter((e) => e.isTotal);

  if (totalEntries.length === 0) {
    warnings.push('Hiçbir TOTAL kategorisi bulunamadı — sütun/satır yapısı beklenenle uyuşmuyor olabilir');
    return warnings;
  }

  const totalDailyEUR = totalEntries.reduce((sum, e) => sum + e.dailyActualEUR, 0);
  if (totalDailyEUR === 0) {
    warnings.push('Günlük EUR toplamı 0 — değerler eksik veya yanlış sütundan okunuyor olabilir');
  } else if (totalDailyEUR < 0) {
    warnings.push(`Günlük EUR toplamı negatif (${totalDailyEUR.toFixed(2)} €)`);
  }

  const foundCats = totalEntries.map((e) => e.category.toUpperCase());
  const missing = EXPECTED_CATEGORIES.filter(
    ([prefix]) => !foundCats.some((fc) => fc.startsWith(prefix))
  );
  if (missing.length > 0) {
    warnings.push(`Eksik kategori: ${missing.map(([, label]) => label).join(', ')}`);
  }

  return warnings;
}

function parseSheet(ws: XLSX.WorkSheet, sheetName: string): ParsedDayData | null {
  const date = parseSheetDate(sheetName);
  if (!date) return null;

  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null });

  const entries: ParsedDayData['entries'] = [];
  let currentTotal: string | null = null;
  let rawFirstTotalRow: unknown[] | undefined;

  for (let i = 6; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    const category = row[1];
    if (!category || typeof category !== 'string') continue;

    const cat = category.trim();
    if (!cat) continue;

    // Ödeme/kapanış bakiyesi bloğu başlıyor — gelir ayrıştırması burada biter
    if (cat.toUpperCase().startsWith(REVENUE_STOP_MARKER)) break;

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
      lyDailyEUR: safeNum(row[10]),
      lyMonthlyEUR: safeNum(row[11]),
      lyYearlyEUR: safeNum(row[12]),
    };

    if (entry.isTotal) {
      if (!rawFirstTotalRow) rawFirstTotalRow = Array.from(row);
      currentTotal = cat;
      entry.parentCategory = null;
    } else {
      entry.parentCategory = currentTotal;
    }

    entries.push(entry);
  }

  return { date, sheetName, entries, rawFirstTotalRow };
}

// KAPAK sheet column mapping (0-indexed), confirmed from EXCEL_YAPISAL_HARITA:
// Statistics block (rows 34-40, PDF 1-indexed 35-40):
//   col 3  (D) = Today ROOM count
//   col 4  (E) = Today PAX count
//   col 5  (F) = MTD Actual ROOM
//   col 6  (G) = MTD Actual PAX
//   col 7  (H) = Budget ROOM
//   col 8  (I) = Budget PAX
//   col 9  (J) = Forecast ROOM
//   col 10 (K) = Forecast PAX
//   col 11 (L) = YTD ROOM
//   col 12 (M) = YTD PAX
//   col 13 (N) = YTD Budget ROOM
//   col 14 (O) = YTD Budget PAX
//   col 15 (P) = LY Today ROOM
//   col 16 (Q) = LY Today PAX
//   col 17 (R) = LY MTD ROOM
//   col 18 (S) = LY MTD PAX
//   col 19 (T) = LY Yearly ROOM
//   col 20 (U) = LY Yearly PAX
// ADR/Rate rows: only ROOM column has a value (no PAX equivalent)
// Occupancy detail block (rows 47-53, PDF 1-indexed 48-54): same D/E column pattern
// Exchange rate row (0-idx 65 = PDF row 66): values in E, G, I, K, M, O, Q, S, U
function parseKapakSheet(ws: XLSX.WorkSheet, sheetName: string): ParsedKapakData | null {
  const dateStr = sheetName.replace(/^KAPAK/i, '').trim();
  const match = dateStr.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
  if (!match) return null;
  const [, day, month, year] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0);

  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null });
  const g = (rowIdx: number, col: number) => safeNum((rows[rowIdx] as unknown[])?.[col]);

  // Row references (0-indexed = PDF 1-indexed - 1):
  // 33 = PDF 34 = "TOTAL ROOM & BEDS" (total capacity)
  // 34 = PDF 35 = "AVAILABLE ROOM"
  // 35 = PDF 36 = "SOLD ROOMS"
  // 36 = PDF 37 = "COMPS ROOMS"
  // 37 = PDF 38 = "OCCUPIED" (occupancy rate as decimal, e.g. 0.93)
  // 38 = PDF 39 = "AVR.ROOM RATE" = ADR (EUR)
  // 39 = PDF 40 = "AVR.SALES RATE" (EUR)
  // 47 = PDF 48 = OCCUPANCY section header (total capacity repeat)
  // 48 = PDF 49 = "PAYING GUEST" (PAX source for today/MTD/etc.)
  // 53 = PDF 54 = "OUT OF ORDER"
  // 65 = PDF 66 = exchange rate values row (E=daily, G=monthly avg, I=budget, K=forecast, M=ytd, O=ytd budget, Q=LY daily, S=LY monthly, U=LY yearly)

  return {
    date,
    statistic: {
      // Available rooms (PDF row 35, 0-idx 34)
      availRoomToday:    g(34, 3),   // D35 = 39
      availRoomMTD:      g(34, 5),   // F35 = 2206
      availRoomBudget:   g(34, 7),   // H35 = 2118
      availRoomForecast: g(34, 9),   // J35 = 2758.59
      availRoomYTD:      g(34, 11),  // L35 = 36537
      // Sold rooms (PDF row 36, 0-idx 35)
      soldRoomToday:     g(35, 3),   // D36 = 518
      soldRoomMTD:       g(35, 5),   // F36 = 3347
      soldRoomBudget:    g(35, 7),   // H36 = 3508.67
      soldRoomForecast:  g(35, 9),   // J36 = 2841.41
      soldRoomYTD:       g(35, 11),  // L36 = 21511
      // Comp rooms (PDF row 37, 0-idx 36)
      compRoomToday:     g(36, 3),   // D37 = 3
      compRoomMTD:       g(36, 5),   // F37 = 47
      // Occupancy rate (decimal, PDF row 38, 0-idx 37)
      occupancyToday:    g(37, 3),   // D38 = 0.930357
      occupancyMTD:      g(37, 5),   // F38 = 0.606071
      occupancyBudget:   g(37, 7),   // H38 = 0.647
      occupancyForecast: g(37, 9),   // J38 = 0.507394
      occupancyYTD:      g(37, 11),  // L38 = 0.373938
      // ADR (PDF row 39, 0-idx 38) — ROOM col only, EUR
      adrToday:          g(38, 3),   // D39 = 260.036270
      adrMTD:            g(38, 5),   // F39 = 261.922729
      adrBudget:         g(38, 7),   // H39 = 252.772528
      adrForecast:       g(38, 9),   // J39 = 231.544004
      adrYTD:            g(38, 11),  // L39 = 222.694823
      // Avg Sales Rate (PDF row 40, 0-idx 39) — ROOM col only, EUR
      avgSalesRateToday: g(39, 3),   // D40 = 225.235073
      avgSalesRateMTD:   g(39, 5),   // F40 = 194.820457
      // PAX — from PAYING GUEST row, PAX column E (PDF row 49, 0-idx 48)
      paxToday:          g(48, 4),   // E49 = 597
      paxMTD:            g(48, 6),   // G49 = 4467
      paxBudget:         g(48, 8),   // I49 = 5906.12
      paxForecast:       g(48, 10),  // K49 = 3881.71
      paxYTD:            g(48, 12),  // M49 = 33707
      // Out of order (PDF row 54, 0-idx 53)
      outOfOrderToday:   g(53, 3),   // D54 = 10
      outOfOrderMTD:     g(53, 5),   // F54 = 135
      outOfOrderYTD:     g(53, 11),  // L54 = 13478
      // LY — Available rooms (col P=15, R=17, T=19)
      lyAvailRoomToday:  g(34, 15),  // P35 = 20
      lyAvailRoomMTD:    g(34, 17),  // R35 = 3287
      lyAvailRoomYTD:    g(34, 19),  // T35 = 37276
      // LY — Sold rooms
      lySoldRoomToday:   g(35, 15),  // P36
      lySoldRoomMTD:     g(35, 17),  // R36
      lySoldRoomYTD:     g(35, 19),  // T36
      // LY — Occupancy
      lyOccupancyToday:  g(37, 15),  // P38 = 0.938333
      lyOccupancyMTD:    g(37, 17),  // R38 = 0.430167
      lyOccupancyYTD:    g(37, 19),  // T38 = 0.371033
      // LY — ADR
      lyAdrToday:        g(38, 15),  // P39 = 267.665821
      lyAdrMTD:          g(38, 17),  // R39 = 258.680765
      lyAdrYTD:          g(38, 19),  // T39 = 218.327219
      // LY — PAX (col Q=16, S=18, U=20 in paying guest row)
      lyPaxToday:        g(48, 16),  // Q49 = 804
      lyPaxMTD:          g(48, 18),  // S49 = 4059
      lyPaxYTD:          g(48, 20),  // U49 = 34840
      // LY — Out of order
      lyOutOfOrderToday: g(53, 15),  // P54 = 8
      lyOutOfOrderMTD:   g(53, 17),  // R54 = 24
    },
    exchangeRate: {
      // PDF row 66 (0-idx 65): E=daily, G=monthly, I=budget, K=forecast, M=ytd, O=ytd budget, Q=LY daily, S=LY monthly, U=LY yearly
      dailyRate:        g(65, 4),   // E66 = 51.9538
      monthlyAvgRate:   g(65, 6),   // G66 = 51.4239
      budgetRate:       g(65, 8),   // I66 = 54
      forecastRate:     g(65, 10),  // K66 = 51.5
      yearlyAvgRate:    g(65, 12),  // M66 = 51.0448
      yearlyBudgetRate: g(65, 14),  // O66 = 53
      lyDailyRate:      g(65, 16),  // Q66 = 41.871
      lyMonthlyRate:    g(65, 18),  // S66 = 41.4161
      lyYearlyRate:     g(65, 20),  // U66 = 38.3905
    },
    // KAPAK revenue block LY columns: P(15)=LY Today EUR, R(17)=LY Monthly EUR, T(19)=LY Yearly EUR
    // Revenue rows (0-indexed): 19=TOTAL SALES, 20=HB, 21=All.Inc, 22=F&B Food, 23=F&B Bev, 24=SPA, 25=Misc, 26=TOTALS
    lyRevenue: {
      // All.Inc Rooms (PDF row 21, 0-idx 20) → maps to TOTAL ROOM REVENUES
      roomLyDailyEUR:    g(20, 15),  // P21 = 150,695.857071
      roomLyMonthlyEUR:  g(20, 17),  // R21 = 667,655.054373
      roomLyYearlyEUR:   g(20, 19),  // T21 = 4,860,400.542576
      // F&B Food (PDF row 22, 0-idx 21) → TOTAL EXTRA FOOD REVENUES
      foodLyDailyEUR:    g(21, 15),  // P22 = 73.636364
      foodLyMonthlyEUR:  g(21, 17),  // R22 = 3,303.746795
      foodLyYearlyEUR:   g(21, 19),  // T22 = 65,735.494195
      // F&B Beverage (PDF row 23, 0-idx 22) → TOTAL EXTRA BEVERAGE REVENUES
      bevLyDailyEUR:     g(22, 15),  // P23 = 12.500000
      bevLyMonthlyEUR:   g(22, 17),  // R23 = 2,840.200862
      bevLyYearlyEUR:    g(22, 19),  // T23 = 76,961.158066
      // SPA (PDF row 24, 0-idx 23) → TOTAL SPA REVENUE
      spaLyDailyEUR:     g(23, 15),  // P24 = 2,337.500000
      spaLyMonthlyEUR:   g(23, 17),  // R24 = 21,959.118551
      spaLyYearlyEUR:    g(23, 19),  // T24 = 116,615.432401
      // Miscellaneous (PDF row 25, 0-idx 24) → TOTAL OTHER REVENUES (approximate)
      otherLyDailyEUR:   g(24, 15),  // P25 = 1,159.910503
      otherLyMonthlyEUR: g(24, 17),  // R25 = 8,053.638489
      otherLyYearlyEUR:  g(24, 19),  // T25 = 128,654.008261
      // TOTALS (PDF row 26, 0-idx 25) — overall total
      totalLyDailyEUR:   g(25, 15),  // P26 = 154,279.403937
      totalLyMonthlyEUR: g(25, 17),  // R26 = 703,811.759070
      totalLyYearlyEUR:  g(25, 19),  // T26 = 5,248,366.635500
    },
  };
}

function parseCSVDay(content: string, fileName: string): ParsedDayData | null {
  const dateMatch = fileName.match(/(\d{2})[.\-_](\d{2})[.\-_](\d{4})/);
  if (!dateMatch) return null;
  const date = new Date(
    Number(dateMatch[3]),
    Number(dateMatch[2]) - 1,
    Number(dateMatch[1]),
    12,
    0,
    0
  );

  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l);
  if (lines.length < 2) return null;

  const sep = lines[0].includes(';') ? ';' : ',';
  const entries: ParsedDayData['entries'] = [];
  let currentTotal: string | null = null;

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(sep).map((c) => c.trim().replace(/^["']|["']$/g, ''));
    const cat = cols[0];
    if (!cat) continue;
    const upper = cat.toUpperCase();
    if (upper.startsWith('KATEGORİ') || upper.startsWith('KATEGORI') || upper.startsWith('CATEGORY'))
      continue;

    const entry = {
      category: cat,
      parentCategory: null as string | null,
      isTotal: isTotal(cat),
      dailyActualTL: safeNum(cols[1]),
      dailyActualEUR: safeNum(cols[2]),
      monthlyActualTL: safeNum(cols[3]),
      monthlyActualEUR: safeNum(cols[4]),
      monthlyBudgetTL: safeNum(cols[5]),
      monthlyBudgetEUR: safeNum(cols[6]),
      yearlyActualEUR: safeNum(cols[7]),
      yearlyBudgetEUR: safeNum(cols[8]),
      lyDailyEUR: safeNum(cols[9]),
      lyMonthlyEUR: safeNum(cols[10]),
      lyYearlyEUR: safeNum(cols[11]),
    };

    if (entry.isTotal) {
      currentTotal = cat;
      entry.parentCategory = null;
    } else {
      entry.parentCategory = currentTotal;
    }

    entries.push(entry);
  }

  return entries.length > 0 ? { date, sheetName: fileName.replace(/\.csv$/i, ''), entries } : null;
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
    const saveNewOnly = formData.get('saveNewOnly') === 'true';

    if (!file) {
      return NextResponse.json({ error: 'Dosya bulunamadı' }, { status: 400 });
    }

    const isCSV = file.name.toLowerCase().endsWith('.csv');
    const isExcel =
      file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls');

    if (!isCSV && !isExcel) {
      return NextResponse.json(
        { error: 'Sadece .xlsx, .xls veya .csv dosyası kabul edilir' },
        { status: 400 }
      );
    }

    const parsedDays: ParsedDayData[] = [];
    const kapakMap = new Map<string, ParsedKapakData>(); // dateISO -> kapak data

    if (isCSV) {
      const text = await file.text();
      const parsed = parseCSVDay(text, file.name);
      if (!parsed) {
        return NextResponse.json(
          {
            error:
              'CSV dosyasından tarih okunamadı. Dosya adı DD.MM.YYYY formatında tarih içermelidir (örn. 23.04.2026.csv)',
          },
          { status: 400 }
        );
      }
      parsedDays.push(parsed);
    } else {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array', cellDates: true });

      for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName];

        if (sheetName.toUpperCase().startsWith('KAPAK')) {
          const kapak = parseKapakSheet(ws, sheetName);
          if (kapak) {
            kapakMap.set(kapak.date.toISOString().split('T')[0], kapak);
          }
          continue;
        }

        const parsed = parseSheet(ws, sheetName);
        if (parsed) parsedDays.push(parsed);
      }
    }

    if (parsedDays.length === 0) {
      return NextResponse.json({ error: 'Geçerli günlük veri bulunamadı' }, { status: 400 });
    }

    // Validasyon uyarıları
    const sheetWarnings: SheetWarning[] = parsedDays
      .map((day) => ({ sheetName: day.sheetName, warnings: validateParsedDay(day) }))
      .filter((w) => w.warnings.length > 0);

    // Sütun tanısı — ilk sheet'in ilk TOTAL satırının ham sütun değerleri
    const rawRow = parsedDays[0]?.rawFirstTotalRow;
    const columnDiagnostic = rawRow
      ? Array.from({ length: Math.min(rawRow.length, 20) }, (_, i) => ({
          index: i,
          letter: i < 26 ? String.fromCharCode(65 + i) : `A${String.fromCharCode(65 + i - 26)}`,
          raw: String(rawRow[i] ?? ''),
          num: safeNum(rawRow[i]),
        }))
      : undefined;

    const existingDates = await prisma.financeReport.findMany({
      where: { reportDate: { in: parsedDays.map((d) => d.date) } },
      select: { reportDate: true },
    });

    const existingSet = new Set(existingDates.map((r) => r.reportDate.toISOString().split('T')[0]));
    const newDays = parsedDays.filter((d) => !existingSet.has(d.date.toISOString().split('T')[0]));
    const duplicateDays = parsedDays.filter((d) =>
      existingSet.has(d.date.toISOString().split('T')[0])
    );

    if (!forceOverwrite && !saveNewOnly && duplicateDays.length > 0 && newDays.length === 0) {
      return NextResponse.json({
        preview: true,
        message: 'Tüm günler zaten kayıtlı',
        newDays: [],
        duplicateDays: duplicateDays.map((d) => d.date.toISOString().split('T')[0]),
        totalParsed: parsedDays.length,
        sheetWarnings,
        columnDiagnostic,
      });
    }

    if (!forceOverwrite && !saveNewOnly && duplicateDays.length > 0) {
      return NextResponse.json({
        preview: true,
        message: 'Bazı günler zaten kayıtlı. Devam etmek istiyor musunuz?',
        newDays: newDays.map((d) => d.date.toISOString().split('T')[0]),
        duplicateDays: duplicateDays.map((d) => d.date.toISOString().split('T')[0]),
        totalParsed: parsedDays.length,
        sheetWarnings,
        columnDiagnostic,
      });
    }

    const daysToSave = forceOverwrite ? parsedDays : newDays;

    if (forceOverwrite) {
      await prisma.financeReport.deleteMany({
        where: { reportDate: { in: daysToSave.map((d) => d.date) } },
      });
    }

    let savedCount = 0;
    for (const day of daysToSave) {
      const dateKey = day.date.toISOString().split('T')[0];
      const kapak = kapakMap.get(dateKey);

      await prisma.financeReport.create({
        data: {
          reportDate: day.date,
          fileName: file.name,
          sheetName: day.sheetName,
          uploadedById: session.user.id,
          entries: {
            create: day.entries.map((e) => {
              const ly = e.isTotal
                ? resolveKapakLY(e.category, e.lyDailyEUR, e.lyMonthlyEUR, e.lyYearlyEUR, kapak)
                : { lyDailyEUR: e.lyDailyEUR, lyMonthlyEUR: e.lyMonthlyEUR, lyYearlyEUR: e.lyYearlyEUR };
              return {
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
                lyDailyEUR: ly.lyDailyEUR,
                lyMonthlyEUR: ly.lyMonthlyEUR,
                lyYearlyEUR: ly.lyYearlyEUR,
              };
            }),
          },
          ...(kapak && {
            statistic: {
              create: {
                reportDate: day.date,
                ...kapak.statistic,
              },
            },
            exchangeRate: {
              create: {
                reportDate: day.date,
                ...kapak.exchangeRate,
              },
            },
          }),
        },
      });
      savedCount++;
    }

    return NextResponse.json({
      success: true,
      savedCount,
      skippedCount: forceOverwrite ? 0 : duplicateDays.length,
      kapakParsed: kapakMap.size,
      message: `${savedCount} gün başarıyla kaydedildi${
        duplicateDays.length > 0 && !forceOverwrite
          ? `, ${duplicateDays.length} gün atlandı (zaten mevcut)`
          : ''
      }${kapakMap.size > 0 ? `, ${kapakMap.size} KAPAK (istatistik + kur) kaydedildi` : ''}`,
      sheetWarnings,
      columnDiagnostic,
    });
  } catch (error) {
    console.error('Finance upload error:', error);
    return NextResponse.json({ error: 'Dosya işlenirken hata oluştu' }, { status: 500 });
  }
}
