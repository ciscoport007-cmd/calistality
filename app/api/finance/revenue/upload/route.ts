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

export interface KapakDiagnostic {
  sheetName: string;
  rowMap: Record<string, { idx: number; byLabel: boolean }>;
  sampleValues: { soldRoomToday: number; occupancyToday: number; adrToday: number; dailyRate: number };
  rawRows: Array<{ rowIdx: number; cells: Array<{ col: string; val: string | number | null }> }>;
}

interface ParsedKapakData {
  _kapakDiag?: KapakDiagnostic;
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

function findKapakRow(rows: unknown[][], keywords: string[], startFrom: number, endAt: number): number {
  for (let i = startFrom; i < Math.min(endAt, rows.length); i++) {
    const row = rows[i] as unknown[];
    for (let c = 0; c < Math.min(5, row.length); c++) {
      const cell = row[c];
      if (typeof cell === 'string') {
        const upper = cell.trim().toUpperCase();
        if (keywords.some(kw => upper.includes(kw.toUpperCase()))) {
          return i;
        }
      }
    }
  }
  return -1;
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

// Column mapping (0-indexed) — consistent across KAPAK sheets:
//   Statistics cols: D(3)=Today, F(5)=MTD, H(7)=Budget, J(9)=Forecast, L(11)=YTD, P(15)=LY Today, R(17)=LY MTD, T(19)=LY YTD
//   PAX cols (offset by +1): E(4)=Today, G(6)=MTD, I(8)=Budget, K(10)=Forecast, M(12)=YTD, Q(16)=LY Today, S(18)=LY MTD, U(20)=LY YTD
//   Exchange rate cols: E(4)=daily, G(6)=monthly, I(8)=budget, K(10)=forecast, M(12)=ytd, O(14)=ytdBudget, Q(16)=LY daily, S(18)=LY monthly, U(20)=LY yearly
//   Revenue LY cols: P(15)=LY Today EUR, R(17)=LY Monthly EUR, T(19)=LY Yearly EUR
//
// Row positions vary by Excel version — found via label search with hardcoded fallback.
function parseKapakSheet(ws: XLSX.WorkSheet, sheetName: string): ParsedKapakData | null {
  const dateStr = sheetName.replace(/^KAPAK/i, '').trim();
  const match = dateStr.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
  if (!match) return null;
  const [, day, month, year] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0);

  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null });
  const g = (rowIdx: number, col: number) => safeNum((rows[rowIdx] as unknown[])?.[col]);

  const found = (label: string, kws: string[], from: number, to: number, fallback: number) => {
    const idx = findKapakRow(rows, kws, from, to);
    return { label, idx: idx >= 0 ? idx : fallback, byLabel: idx >= 0 };
  };

  // Statistics block — rows vary; searched by label first
  const availF  = found('availRoom',  ['AVAILABLE ROOM', 'AVAIL ROOM'],            22, 55, 34);
  const soldF   = found('soldRoom',   ['SOLD ROOM'],                                22, 55, 35);
  const compF   = found('compRoom',   ['COMP ROOM', 'COMPS ROOM', 'COMPLIMENTARY'], 24, 48, 36);
  const occupF  = found('occupancy',  ['OCCUPIED', 'OCCUPANCY RATE', 'OCC %', 'OCC.'], 24, 55, 37);
  const adrF    = found('adr',        ['AVR.ROOM RATE', 'AVR. ROOM RATE', 'AVR. ROOM', 'ADR', 'AVERAGE ROOM RATE', 'AVERAGE DAILY RATE', 'AVG.ROOM RATE', 'AVG. ROOM RATE', 'ORT.ODA', 'ORT. ODA', 'ORTALAMA ODA'], 22, 58, 38);
  const avgSF   = found('avgSales',   ['AVR.SALES RATE', 'AVR. SALES RATE', 'AVR. SALES', 'AVERAGE SALES', 'AVG.SALES RATE', 'AVG. SALES RATE', 'ORT.SATIS', 'ORT. SATIŞ'], 24, 58, 39);
  const paxF    = found('pax',        ['PAYING GUEST'],                              38, 65, 48);
  const oooF    = found('outOfOrder', ['OUT OF ORDER', 'OUT-OF-ORDER'],              38, 72, 53);
  const exRF    = found('exchangeRate', ['EUR KURU', 'EUR/TRY', 'EURO KURU', 'EXCHANGE RATE', 'KUR', 'EUR'], 52, 88, 65);

  // Revenue LY block — rows 14-32 typically
  const roomRF  = found('roomRev',  ['ALL.INC', 'ALL INC', 'ALLINC'],                14, 32, 20);
  const foodRF  = found('foodRev',  ['F&B FOOD', 'FOOD REVENUE', 'YİYECEK', 'YIYECEK'], 14, 32, 21);
  const bevRF   = found('bevRev',   ['F&B BEV', 'BEVERAGE', 'İÇECEK', 'ICECEK'],    14, 32, 22);
  const spaRF   = found('spaRev',   ['SPA'],                                          14, 32, 23);
  const otherRF = found('otherRev', ['MISC', 'MISCELLANEOUS', 'DİĞER', 'DIGER', 'OTHER REVENUE'], 14, 32, 24);
  const totRF   = found('totalRev', ['TOTALS'],                                       22, 32, 25);

  const availR = availF.idx; const soldR = soldF.idx; const compR = compF.idx;
  const occupR = occupF.idx; const adrR  = adrF.idx;  const avgSR = avgSF.idx;
  const paxR   = paxF.idx;   const oooR  = oooF.idx;  const exRR  = exRF.idx;
  const roomRR = roomRF.idx; const foodRR = foodRF.idx; const bevRR = bevRF.idx;
  const spaRR  = spaRF.idx;  const othrRR = otherRF.idx; const totRR = totRF.idx;

  // Build diagnostic: raw label cells for rows 20-90 (cols 0-4) so the user can
  // verify which row holds which value in their specific Excel version.
  const rawRows = Array.from({ length: Math.min(90, rows.length) - 20 }, (_, i) => {
    const ri = i + 20;
    const row = rows[ri] as unknown[];
    return {
      rowIdx: ri,
      cells: [0, 1, 2, 3, 4].map(c => ({
        col: c < 26 ? String.fromCharCode(65 + c) : `A${String.fromCharCode(65 + c - 26)}`,
        val: row?.[c] !== null && row?.[c] !== undefined ? (row[c] as string | number) : null,
      })),
    };
  });

  const _kapakDiag: KapakDiagnostic = {
    sheetName,
    rowMap: Object.fromEntries(
      [availF, soldF, compF, occupF, adrF, avgSF, paxF, oooF, exRF,
       roomRF, foodRF, bevRF, spaRF, otherRF, totRF].map(f => [f.label, { idx: f.idx, byLabel: f.byLabel }])
    ),
    sampleValues: {
      soldRoomToday:  g(soldR, 3),
      occupancyToday: g(occupR, 3),
      adrToday:       g(adrR, 3),
      dailyRate:      g(exRR, 4),
    },
    rawRows,
  };

  return {
    _kapakDiag,
    date,
    statistic: {
      availRoomToday:    g(availR, 3),
      availRoomMTD:      g(availR, 5),
      availRoomBudget:   g(availR, 7),
      availRoomForecast: g(availR, 9),
      availRoomYTD:      g(availR, 11),
      soldRoomToday:     g(soldR, 3),
      soldRoomMTD:       g(soldR, 5),
      soldRoomBudget:    g(soldR, 7),
      soldRoomForecast:  g(soldR, 9),
      soldRoomYTD:       g(soldR, 11),
      compRoomToday:     g(compR, 3),
      compRoomMTD:       g(compR, 5),
      occupancyToday:    g(occupR, 3),
      occupancyMTD:      g(occupR, 5),
      occupancyBudget:   g(occupR, 7),
      occupancyForecast: g(occupR, 9),
      occupancyYTD:      g(occupR, 11),
      adrToday:          g(adrR, 3),
      adrMTD:            g(adrR, 5),
      adrBudget:         g(adrR, 7),
      adrForecast:       g(adrR, 9),
      adrYTD:            g(adrR, 11),
      avgSalesRateToday: g(avgSR, 3),
      avgSalesRateMTD:   g(avgSR, 5),
      paxToday:          g(paxR, 4),
      paxMTD:            g(paxR, 6),
      paxBudget:         g(paxR, 8),
      paxForecast:       g(paxR, 10),
      paxYTD:            g(paxR, 12),
      outOfOrderToday:   g(oooR, 3),
      outOfOrderMTD:     g(oooR, 5),
      outOfOrderYTD:     g(oooR, 11),
      lyAvailRoomToday:  g(availR, 15),
      lyAvailRoomMTD:    g(availR, 17),
      lyAvailRoomYTD:    g(availR, 19),
      lySoldRoomToday:   g(soldR, 15),
      lySoldRoomMTD:     g(soldR, 17),
      lySoldRoomYTD:     g(soldR, 19),
      lyOccupancyToday:  g(occupR, 15),
      lyOccupancyMTD:    g(occupR, 17),
      lyOccupancyYTD:    g(occupR, 19),
      lyAdrToday:        g(adrR, 15),
      lyAdrMTD:          g(adrR, 17),
      lyAdrYTD:          g(adrR, 19),
      lyPaxToday:        g(paxR, 16),
      lyPaxMTD:          g(paxR, 18),
      lyPaxYTD:          g(paxR, 20),
      lyOutOfOrderToday: g(oooR, 15),
      lyOutOfOrderMTD:   g(oooR, 17),
    },
    exchangeRate: {
      dailyRate:        g(exRR, 4),
      monthlyAvgRate:   g(exRR, 6),
      budgetRate:       g(exRR, 8),
      forecastRate:     g(exRR, 10),
      yearlyAvgRate:    g(exRR, 12),
      yearlyBudgetRate: g(exRR, 14),
      lyDailyRate:      g(exRR, 16),
      lyMonthlyRate:    g(exRR, 18),
      lyYearlyRate:     g(exRR, 20),
    },
    lyRevenue: {
      roomLyDailyEUR:    g(roomRR, 15),
      roomLyMonthlyEUR:  g(roomRR, 17),
      roomLyYearlyEUR:   g(roomRR, 19),
      foodLyDailyEUR:    g(foodRR, 15),
      foodLyMonthlyEUR:  g(foodRR, 17),
      foodLyYearlyEUR:   g(foodRR, 19),
      bevLyDailyEUR:     g(bevRR, 15),
      bevLyMonthlyEUR:   g(bevRR, 17),
      bevLyYearlyEUR:    g(bevRR, 19),
      spaLyDailyEUR:     g(spaRR, 15),
      spaLyMonthlyEUR:   g(spaRR, 17),
      spaLyYearlyEUR:    g(spaRR, 19),
      otherLyDailyEUR:   g(othrRR, 15),
      otherLyMonthlyEUR: g(othrRR, 17),
      otherLyYearlyEUR:  g(othrRR, 19),
      totalLyDailyEUR:   g(totRR, 15),
      totalLyMonthlyEUR: g(totRR, 17),
      totalLyYearlyEUR:  g(totRR, 19),
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

    const kapakDiagnostics = [...kapakMap.values()]
      .map(k => k._kapakDiag)
      .filter(Boolean) as KapakDiagnostic[];

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
      kapakDiagnostics,
    });
  } catch (error) {
    console.error('Finance upload error:', error);
    return NextResponse.json({ error: 'Dosya işlenirken hata oluştu' }, { status: 500 });
  }
}
