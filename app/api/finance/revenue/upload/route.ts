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
    // Available PAX (bed-nights capacity)
    availPaxToday: number;
    availPaxMTD: number;
    availPaxBudget: number;
    availPaxForecast: number;
    availPaxYTD: number;
    lyAvailPaxToday: number;
    lyAvailPaxMTD: number;
    lyAvailPaxYTD: number;
    // Comp rooms — PAX and Last Year
    compPaxToday: number;
    compPaxMTD: number;
    lyCompRoomToday: number;
    lyCompRoomMTD: number;
    lyCompRoomYTD: number;
    lyCompPaxToday: number;
    lyCompPaxMTD: number;
    lyCompPaxYTD: number;
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
  lyRevenue: {
    roomLyDailyEUR: number; roomLyMonthlyEUR: number; roomLyYearlyEUR: number;
    foodLyDailyEUR: number; foodLyMonthlyEUR: number; foodLyYearlyEUR: number;
    bevLyDailyEUR: number; bevLyMonthlyEUR: number; bevLyYearlyEUR: number;
    spaLyDailyEUR: number; spaLyMonthlyEUR: number; spaLyYearlyEUR: number;
    otherLyDailyEUR: number; otherLyMonthlyEUR: number; otherLyYearlyEUR: number;
    totalLyDailyEUR: number; totalLyMonthlyEUR: number; totalLyYearlyEUR: number;
  };
  // Section 1: Full revenue data for KapakReport display
  revenueData: Array<{
    label: string; isTotal: boolean;
    todayTL: number; todayEUR: number;
    mtdActualTL: number; mtdActualEUR: number;
    mtdBudgetTL: number; mtdBudgetEUR: number;
    mtdForecastTL: number; mtdForecastEUR: number;
    ytdActualEUR: number; ytdBudgetEUR: number;
    lyTodayEUR: number; lyMonthEUR: number; lyYearEUR: number;
  }>;
  // Section 2 supplement: fields not in DailyStatistic
  statsExtra: {
    avgSalesRateBudget: number; avgSalesRateForecast: number; avgSalesRateYTD: number;
    compRoomBudget: number; compRoomForecast: number; compRoomYTD: number;
    soldRoomYTDBudget: number; availRoomYTDBudget: number; paxYTDBudget: number;
    availPaxYTDBudget: number;
    compPaxBudget: number; compPaxForecast: number; compPaxYTD: number;
    compRoomYTDBudget: number; compPaxYTDBudget: number;
  };
  // Section 3: Occupancy breakdown by guest type
  occupancyBreakdown: Array<{
    label: string;
    todayRoom: number; todayPax: number;
    mtdRoom: number; mtdPax: number;
    budgetRoom: number; budgetPax: number;
    forecastRoom: number; forecastPax: number;
    ytdRoom: number; ytdPax: number;
    ytdBudgetRoom: number; ytdBudgetPax: number;
    lyTodayRoom: number; lyTodayPax: number;
    lyMonthRoom: number; lyMonthPax: number;
    lyYearRoom: number; lyYearPax: number;
  }>;
  // Section 4: Forecast occupancy arrivals / departures
  forecastOccupancy: {
    todayArrivalsRoom: number; todayArrivalsPax: number;
    todayArrivalsRoomPct: number; todayArrivalsPaxPct: number;
    todayDepartRoom: number; todayDepartPax: number;
    todayDepartRoomPct: number; todayDepartPaxPct: number;
    tmrwArrivalsRoom: number; tmrwArrivalsPax: number;
    tmrwArrivalsRoomPct: number; tmrwArrivalsPaxPct: number;
    tmrwDepartRoom: number; tmrwDepartPax: number;
    tmrwDepartRoomPct: number; tmrwDepartPaxPct: number;
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

function scanRowNums(rows: unknown[][], rowIdx: number, count: number): number[] {
  if (rowIdx < 0 || rowIdx >= rows.length) return Array(count).fill(0);
  const row = (rows[rowIdx] as unknown[]) || [];
  const nums: number[] = [];
  for (let c = 2; c < Math.min(row.length, 50); c++) {
    const val = row[c];
    if (val === null || val === undefined) continue;
    const n = Number(val);
    if (!isNaN(n)) {
      nums.push(n);
      if (nums.length >= count) break;
    }
  }
  while (nums.length < count) nums.push(0);
  return nums;
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

// Column positions within a KAPAK statistics/rate row. All indices 0-based.
interface KapakColMap {
  today: number;
  mtd: number;
  budget: number;
  forecast: number;
  ytd: number;
  lyToday: number;
  lyMtd: number;
  lyYtd: number;
}

// Column layout (0-based): label at col 2; ROOM/PAX pairs follow:
// TODAY=3/4, MTD_ACTUAL=5/6, MTD_BUDGET=7/8, MTD_FORECAST=9/10,
// YTD_ACTUAL=11/12, YTD_BUDGET=13/14, LY_TODAY=15/16, LY_MTD=17/18, LY_YTD=19/20
const STATS_DEFAULTS: KapakColMap = { today: 3, mtd: 5, budget: 7, forecast: 9, ytd: 11, lyToday: 15, lyMtd: 17, lyYtd: 19 };

// Scans rows[searchFrom..searchTo] for a KAPAK header row and returns column positions.
// Excel uses "ACTUAL / GERÇEKLEŞEN" for both MTD and YTD; we detect them by position
// (first ACTUAL = MTD, second ACTUAL = YTD). "TODAY / BUGÜN" appears once; LY columns
// are detected from "LAST YEAR" prefix. Falls back to `defaults` for undetected labels.
function findKapakColMap(
  rows: unknown[][],
  searchFrom: number,
  searchTo: number,
  defaults: KapakColMap,
): KapakColMap {
  for (let r = Math.max(0, searchFrom); r < Math.min(searchTo, rows.length); r++) {
    const row = rows[r] as unknown[];
    let todayIdx = -1;
    let mtdIdx = -1;
    let ytdIdx = -1;
    let budgetIdx = -1;
    let forecastIdx = -1;
    let lyTodayIdx = -1;
    let lyMtdIdx = -1;
    let lyYtdIdx = -1;
    let actualCount = 0;
    let hits = 0;

    for (let c = 0; c < Math.min(30, row.length); c++) {
      const cell = row[c];
      if (typeof cell !== 'string') continue;
      const u = cell.trim().toUpperCase().replace(/\s+/g, ' ');

      if (todayIdx < 0 && (u === 'TODAY' || u.startsWith('TODAY ') || u === 'BUGÜN' || u === 'GÜNLÜK' || u === 'DAILY')) {
        todayIdx = c; hits++;
      } else if (u === 'ACTUAL' || u.startsWith('ACTUAL ') || u === 'GERÇEKLEŞEN' || u === 'GERCEKLESEN') {
        actualCount++;
        if (actualCount === 1 && mtdIdx < 0) { mtdIdx = c; hits++; }
        else if (actualCount === 2 && ytdIdx < 0) { ytdIdx = c; hits++; }
      } else if (budgetIdx < 0 && (u === 'BUDGET' || u.startsWith('BUDGET ') || u === 'BÜTÇE' || u === 'BUTCE')) {
        budgetIdx = c; hits++;
      } else if (forecastIdx < 0 && (u === 'FORECAST' || u.startsWith('FORECAST ') || u === 'FCST' || u === 'TAHMİNİ' || u === 'TAHMINI')) {
        forecastIdx = c; hits++;
      } else if (u === 'MTD' || u === 'M.T.D.' || u.startsWith('MTD ') || u === 'MONTH TO DATE') {
        if (mtdIdx < 0) { mtdIdx = c; hits++; }
      } else if (u === 'YTD' || u === 'Y.T.D.' || u.startsWith('YTD ') || u === 'YEAR TO DATE') {
        if (ytdIdx < 0) { ytdIdx = c; hits++; }
      } else if (lyTodayIdx < 0 && u.startsWith('LAST YEAR') && (u.includes('TODAY') || u.includes('BUGÜN') || u.includes('GÜNLÜK'))) {
        lyTodayIdx = c; hits++;
      } else if (lyMtdIdx < 0 && u.startsWith('LAST YEAR') && (u.includes('MONT') || u.includes('MONTH') || u.includes('AYLIK'))) {
        lyMtdIdx = c; hits++;
      } else if (lyYtdIdx < 0 && u.startsWith('LAST YEAR') && (u.includes('YEAR') || u.includes('YIL') || u.includes('YEARLY'))) {
        lyYtdIdx = c; hits++;
      }
    }

    if (hits >= 3) {
      return {
        today:    todayIdx    >= 0 ? todayIdx    : defaults.today,
        mtd:      mtdIdx      >= 0 ? mtdIdx      : defaults.mtd,
        budget:   budgetIdx   >= 0 ? budgetIdx   : defaults.budget,
        forecast: forecastIdx >= 0 ? forecastIdx : defaults.forecast,
        ytd:      ytdIdx      >= 0 ? ytdIdx      : defaults.ytd,
        lyToday:  lyTodayIdx  >= 0 ? lyTodayIdx  : defaults.lyToday,
        lyMtd:    lyMtdIdx    >= 0 ? lyMtdIdx    : defaults.lyMtd,
        lyYtd:    lyYtdIdx    >= 0 ? lyYtdIdx    : defaults.lyYtd,
      };
    }
  }
  return { ...defaults };
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

// Both row AND column positions are resolved from text labels in the Excel.
// findKapakRow   → finds which ROW contains a given statistic (by cell text).
// findKapakColMap → finds which COLUMNS contain Today/MTD/Budget/Forecast/YTD/LY*
//                   by scanning for a header row ("TODAY", "MTD", "BUDGET"…).
// Only falls back to hardcoded positions when no matching label is found.
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

  // ── Row detection (by cell text) ───────────────────────────────────────────
  const availF  = found('availRoom',    ['AVAILABLE ROOM', 'AVAIL ROOM', 'AVAIL. ROOM'],            22, 60, 34);
  const soldF   = found('soldRoom',     ['SOLD ROOM', 'OCCUPIED ROOM'],                               22, 60, 35);
  const compF   = found('compRoom',
    ['COMP ROOM', 'COMPS ROOM', 'COMP. ROOM', 'COMPLIMENTARY ROOM', 'COMPLIMENTARY',
     'HOUSE USE', 'ÜCRETSİZ ODA', 'UCRETSIZ ODA', 'KOMPLİMAN', 'KOMPLIMAN'],
    22, 60, 36);
  const occupF  = found('occupancy',    ['OCCUPIED', 'OCCUPANCY RATE', 'OCC %', 'OCC.', 'OCCUPANCY %'], 24, 58, 37);
  const adrF    = found('adr',          ['AVR.ROOM RATE', 'AVR. ROOM RATE', 'AVR. ROOM', 'ADR',
                                          'AVERAGE ROOM RATE', 'AVERAGE DAILY RATE',
                                          'AVG.ROOM RATE', 'AVG. ROOM RATE',
                                          'ORT.ODA', 'ORT. ODA', 'ORTALAMA ODA'],    22, 60, 38);
  const avgSF   = found('avgSales',     ['AVR.SALES RATE', 'AVR. SALES RATE', 'AVR. SALES',
                                          'AVERAGE SALES', 'AVG.SALES RATE', 'AVG. SALES RATE',
                                          'ORT.SATIS', 'ORT. SATIŞ'],                24, 60, 39);
  const paxF    = found('pax',          ['PAYING GUEST'],                              38, 65, 48);
  const oooF    = found('outOfOrder',   ['OUT OF ORDER', 'OUT-OF-ORDER'],              38, 72, 53);
  const exRF    = found('exchangeRate', ['EUR KURU', 'EUR/TRY', 'EURO KURU',
                                          'EXCHANGE RATE', 'KUR', 'EUR'],             52, 92, 65);

  const roomRF  = found('roomRev',  ['ALL.INC', 'ALL INC', 'ALLINC'],                 14, 32, 20);
  const foodRF  = found('foodRev',  ['F&B FOOD', 'FOOD REVENUE', 'YİYECEK', 'YIYECEK'], 14, 32, 21);
  const bevRF   = found('bevRev',   ['F&B BEV', 'BEVERAGE', 'İÇECEK', 'ICECEK'],     14, 32, 22);
  const spaRF   = found('spaRev',   ['SPA'],                                           14, 32, 23);
  const otherRF = found('otherRev', ['MISC', 'MISCELLANEOUS', 'DİĞER', 'DIGER', 'OTHER REVENUE'], 14, 32, 24);
  const totRF   = found('totalRev', ['TOTALS'],                                        22, 32, 25);

  const availR = availF.idx; const soldR = soldF.idx; const compR = compF.idx;
  const occupR = occupF.idx; const adrR  = adrF.idx;  const avgSR = avgSF.idx;
  const paxR   = paxF.idx;   const oooR  = oooF.idx;  const exRR  = exRF.idx;
  const roomRR = roomRF.idx; const foodRR = foodRF.idx; const bevRR = bevRF.idx;
  const spaRR  = spaRF.idx;  const othrRR = otherRF.idx; const totRR = totRF.idx;

  // ── Column detection (by header row text) ──────────────────────────────────
  // Search for the stats section header above the first stat row.
  const statsHeaderEnd = Math.min(availR, soldR, occupR, adrR);
  const sc = findKapakColMap(rows, Math.max(0, statsHeaderEnd - 18), statsHeaderEnd + 2, STATS_DEFAULTS);

  // PAX sometimes lives in a slightly different sub-block — search near paxR.
  const paxColMap = findKapakColMap(rows, Math.max(0, paxR - 15), paxR + 2, sc);

  // Revenue LY block header (top section of KAPAK).
  const rc = findKapakColMap(rows, 5, Math.min(roomRR + 2, 25), STATS_DEFAULTS);

  // ── Diagnostic (raw label cells rows 20-90) ────────────────────────────────
  const rawRows = Array.from({ length: Math.min(90, rows.length) - 20 }, (_, i) => {
    const ri = i + 20;
    const row = rows[ri] as unknown[];
    return {
      rowIdx: ri,
      cells: [0, 1, 2, 3, 4].map(c => ({
        col: String.fromCharCode(65 + c),
        val: row?.[c] != null ? (row[c] as string | number) : null,
      })),
    };
  });

  const _kapakDiag: KapakDiagnostic = {
    sheetName,
    rowMap: Object.fromEntries(
      [availF, soldF, compF, occupF, adrF, avgSF, paxF, oooF, exRF,
       roomRF, foodRF, bevRF, spaRF, otherRF, totRF]
        .map(f => [f.label, { idx: f.idx, byLabel: f.byLabel }])
    ),
    sampleValues: {
      soldRoomToday:  g(soldR, sc.today),
      occupancyToday: g(occupR, sc.today),
      adrToday:       g(adrR, sc.today),
      dailyRate:      g(exRR + 1, sc.today + 1),
    },
    rawRows,
  };

  // ── Section 3: Occupancy breakdown rows ───────────────────────────────────
  // Total occupancy summary row sits just above PAYING GUEST
  const occTotalF = found('occTotal', ['OCCUPANCY', 'DOLULUK', 'DOLULIK'], Math.max(0, paxR - 8), paxR, paxR - 1);
  const occTotalR = occTotalF.idx;

  const compGuestF  = found('compGuest',     ['COMP GUEST', 'COMPLIMENTARY GUEST'],             paxR, paxR + 20, paxR + 1);
  const payChildF   = found('payingChildren', ['PAYING CHILDREN', 'ÜCRETLİ ÇOCUK', 'UCRETLI COCUK'], paxR, paxR + 20, paxR + 2);
  const compChildF  = found('compChildren',   ['COMP CHILDREN', 'COMP CHILD'],                  paxR, paxR + 20, paxR + 3);
  const freeChildF  = found('freeChild',      ['FREE CHILD', 'ÜCRETSİZ ÇOCUK', 'UCRETSIZ COCUK'], paxR, paxR + 25, paxR + 4);

  const compGuestR  = compGuestF.idx;
  const payChildR   = payChildF.idx;
  const compChildR  = compChildF.idx;
  const freeChildR  = freeChildF.idx;

  const occ = (r: number) => ({
    todayRoom:    g(r, sc.today),     todayPax:      g(r, sc.today + 1),
    mtdRoom:      g(r, sc.mtd),       mtdPax:        g(r, sc.mtd + 1),
    budgetRoom:   g(r, sc.budget),    budgetPax:     g(r, sc.budget + 1),
    forecastRoom: g(r, sc.forecast),  forecastPax:   g(r, sc.forecast + 1),
    ytdRoom:      g(r, sc.ytd),       ytdPax:        g(r, sc.ytd + 1),
    ytdBudgetRoom: g(r, sc.ytd + 2), ytdBudgetPax:  g(r, sc.ytd + 3),
    lyTodayRoom:  g(r, sc.lyToday),   lyTodayPax:    g(r, sc.lyToday + 1),
    lyMonthRoom:  g(r, sc.lyMtd),     lyMonthPax:    g(r, sc.lyMtd + 1),
    lyYearRoom:   g(r, sc.lyYtd),     lyYearPax:     g(r, sc.lyYtd + 1),
  });

  const occupancyBreakdown = [
    { label: 'OCCUPANCY / DOLULUK', isTotal: true,  ...occ(occTotalR) },
    { label: 'PAYING GUEST / Ücretli Misafir',       ...occ(paxR) },
    { label: 'COMP GUEST / Ücretsiz Misafir',        ...occ(compGuestR) },
    { label: 'PAYING CHILDREN / Ücretli Çocuk',     ...occ(payChildR) },
    { label: 'COMP CHILDREN / Ücretsiz Çocuk',      ...occ(compChildR) },
    { label: 'FREE CHILD / Ücretsiz Çocuk',          ...occ(freeChildR) },
    { label: 'OUT OF ORDER / Arızalı Oda',           ...occ(oooR) },
  ];

  // ── Section 4: Forecast occupancy arrivals / departures ───────────────────
  const fcStartRaw = findKapakRow(rows, ['FORECAST OCCUPANCY', 'TAHMİNİ DOLULUK', 'TAHMINI DOLULUK'], 55, 110);
  const fcStart    = fcStartRaw >= 0 ? fcStartRaw : 80;
  const fcArrRaw   = findKapakRow(rows, ['ARRIVALS', 'GELİŞ', 'GELIS'], fcStart, fcStart + 12);
  const fcArrRow   = fcArrRaw >= 0 ? fcArrRaw : fcStart + 2;
  const fcDepRaw   = findKapakRow(rows, ['DEPARTURES', 'GİDİŞ', 'GIDIS'], fcStart, fcStart + 12);
  const fcDepRow   = fcDepRaw >= 0 ? fcDepRaw : fcStart + 3;

  const arrNums = scanRowNums(rows, fcArrRow, 8);
  const depNums = scanRowNums(rows, fcDepRow, 8);

  const forecastOccupancy = {
    todayArrivalsRoom: arrNums[0], todayArrivalsPax:     arrNums[1],
    todayArrivalsRoomPct: arrNums[2], todayArrivalsPaxPct: arrNums[3],
    tmrwArrivalsRoom: arrNums[4], tmrwArrivalsPax:     arrNums[5],
    tmrwArrivalsRoomPct: arrNums[6], tmrwArrivalsPaxPct: arrNums[7],
    todayDepartRoom: depNums[0], todayDepartPax:       depNums[1],
    todayDepartRoomPct: depNums[2], todayDepartPaxPct:  depNums[3],
    tmrwDepartRoom: depNums[4], tmrwDepartPax:        depNums[5],
    tmrwDepartRoomPct: depNums[6], tmrwDepartPaxPct:   depNums[7],
  };

  // ── Section 1: Full revenue data ──────────────────────────────────────────
  const totalSalesF = found('totalSales', ['TOTAL SALES REVENUE', 'TOPLAM SATIŞ', 'TOPLAM SATIS'], 10, 28, totRR - 8);
  const hbRoomF     = found('hbRoom',     ['HB ROOM', 'HB ODA', 'YARI PANSIYON', 'YARI PANSİYON', 'HALF BOARD'], 10, 28, roomRR - 1);

  const rv = (r: number) => ({
    todayTL: g(r, rc.today),      todayEUR: g(r, rc.today + 1),
    mtdActualTL: g(r, rc.mtd),    mtdActualEUR: g(r, rc.mtd + 1),
    mtdBudgetTL: g(r, rc.budget), mtdBudgetEUR: g(r, rc.budget + 1),
    mtdForecastTL: g(r, rc.forecast), mtdForecastEUR: g(r, rc.forecast + 1),
    // Revenue uses ROOM columns only (no PAX), so each group is 2 cols apart.
    // ytd=ROOM col, ytd+1=PAX col (empty), ytd+2=ROOM col (YTD Budget), etc.
    ytdActualEUR: g(r, rc.ytd),       ytdBudgetEUR: g(r, rc.ytd + 2),
    lyTodayEUR:   g(r, rc.ytd + 4),   lyMonthEUR:   g(r, rc.ytd + 6),
    lyYearEUR:    g(r, rc.ytd + 8),
  });

  const revenueData = [
    { label: 'TOTAL SALES REVENUE / TOPLAM SATIŞ GELİRİ', isTotal: true,  ...rv(totalSalesF.idx) },
    { label: 'HB Rooms Revenues / Yarım Pansiyon Oda Geliri', isTotal: false, ...rv(hbRoomF.idx) },
    { label: 'All.Inc.Rooms Revenues / Herşey Dahil Oda Geliri', isTotal: false, ...rv(roomRR) },
    { label: 'F&B FOOD EXT.REV. / Ekstra Yiyecek Geliri', isTotal: false, ...rv(foodRR) },
    { label: 'F&B BEVERAGE EXT.REV. / Ekstra İçecek Geliri', isTotal: false, ...rv(bevRR) },
    { label: 'SPA REVENUES / SPA Gelirleri', isTotal: false, ...rv(spaRR) },
    { label: 'MISCELLANEOUS / Diğer Gelirler', isTotal: false, ...rv(othrRR) },
    { label: 'TOTALS / TOPLAMLAR', isTotal: true, ...rv(totRR) },
  ];

  return {
    _kapakDiag,
    date,
    statistic: {
      availRoomToday:    g(availR, sc.today),
      availRoomMTD:      g(availR, sc.mtd),
      availRoomBudget:   g(availR, sc.budget),
      availRoomForecast: g(availR, sc.forecast),
      availRoomYTD:      g(availR, sc.ytd),
      soldRoomToday:     g(soldR, sc.today),
      soldRoomMTD:       g(soldR, sc.mtd),
      soldRoomBudget:    g(soldR, sc.budget),
      soldRoomForecast:  g(soldR, sc.forecast),
      soldRoomYTD:       g(soldR, sc.ytd),
      compRoomToday:     g(compR, sc.today),
      compRoomMTD:       g(compR, sc.mtd),
      occupancyToday:    g(occupR, sc.today),
      occupancyMTD:      g(occupR, sc.mtd),
      occupancyBudget:   g(occupR, sc.budget),
      occupancyForecast: g(occupR, sc.forecast),
      occupancyYTD:      g(occupR, sc.ytd),
      adrToday:          g(adrR, sc.today),
      adrMTD:            g(adrR, sc.mtd),
      adrBudget:         g(adrR, sc.budget),
      adrForecast:       g(adrR, sc.forecast),
      adrYTD:            g(adrR, sc.ytd),
      avgSalesRateToday: g(avgSR, sc.today),
      avgSalesRateMTD:   g(avgSR, sc.mtd),
      paxToday:          g(paxR, paxColMap.today),
      paxMTD:            g(paxR, paxColMap.mtd),
      paxBudget:         g(paxR, paxColMap.budget),
      paxForecast:       g(paxR, paxColMap.forecast),
      paxYTD:            g(paxR, paxColMap.ytd),
      outOfOrderToday:   g(oooR, sc.today),
      outOfOrderMTD:     g(oooR, sc.mtd),
      outOfOrderYTD:     g(oooR, sc.ytd),
      lyAvailRoomToday:  g(availR, sc.lyToday),
      lyAvailRoomMTD:    g(availR, sc.lyMtd),
      lyAvailRoomYTD:    g(availR, sc.lyYtd),
      lySoldRoomToday:   g(soldR, sc.lyToday),
      lySoldRoomMTD:     g(soldR, sc.lyMtd),
      lySoldRoomYTD:     g(soldR, sc.lyYtd),
      lyOccupancyToday:  g(occupR, sc.lyToday),
      lyOccupancyMTD:    g(occupR, sc.lyMtd),
      lyOccupancyYTD:    g(occupR, sc.lyYtd),
      lyAdrToday:        g(adrR, sc.lyToday),
      lyAdrMTD:          g(adrR, sc.lyMtd),
      lyAdrYTD:          g(adrR, sc.lyYtd),
      lyPaxToday:        g(paxR, paxColMap.lyToday),
      lyPaxMTD:          g(paxR, paxColMap.lyMtd),
      lyPaxYTD:          g(paxR, paxColMap.lyYtd),
      lyOutOfOrderToday: g(oooR, sc.lyToday),
      lyOutOfOrderMTD:   g(oooR, sc.lyMtd),
      // Available PAX (bed-nights capacity)
      availPaxToday:    g(availR, sc.today + 1),
      availPaxMTD:      g(availR, sc.mtd + 1),
      availPaxBudget:   g(availR, sc.budget + 1),
      availPaxForecast: g(availR, sc.forecast + 1),
      availPaxYTD:      g(availR, sc.ytd + 1),
      lyAvailPaxToday:  g(availR, sc.lyToday + 1),
      lyAvailPaxMTD:    g(availR, sc.lyMtd + 1),
      lyAvailPaxYTD:    g(availR, sc.lyYtd + 1),
      // Comp rooms — PAX and Last Year
      compPaxToday:    g(compR, sc.today + 1),
      compPaxMTD:      g(compR, sc.mtd + 1),
      lyCompRoomToday: g(compR, sc.lyToday),
      lyCompRoomMTD:   g(compR, sc.lyMtd),
      lyCompRoomYTD:   g(compR, sc.lyYtd),
      lyCompPaxToday:  g(compR, sc.lyToday + 1),
      lyCompPaxMTD:    g(compR, sc.lyMtd + 1),
      lyCompPaxYTD:    g(compR, sc.lyYtd + 1),
    },
    // Exchange rate row: exRR = sub-label row (even cols), exRR+1 = value row (odd/PAX cols)
    exchangeRate: {
      dailyRate:        g(exRR + 1, sc.today + 1),
      monthlyAvgRate:   g(exRR + 1, sc.mtd + 1),
      budgetRate:       g(exRR + 1, sc.budget + 1),
      forecastRate:     g(exRR + 1, sc.forecast + 1),
      yearlyAvgRate:    g(exRR + 1, sc.ytd + 1),
      yearlyBudgetRate: g(exRR + 1, sc.ytd + 3),
      lyDailyRate:      g(exRR + 1, sc.lyToday + 1),
      lyMonthlyRate:    g(exRR + 1, sc.lyMtd + 1),
      lyYearlyRate:     g(exRR + 1, sc.lyYtd + 1),
    },
    lyRevenue: {
      roomLyDailyEUR:    g(roomRR, rc.ytd + 4), roomLyMonthlyEUR:  g(roomRR, rc.ytd + 6), roomLyYearlyEUR:   g(roomRR, rc.ytd + 8),
      foodLyDailyEUR:    g(foodRR, rc.ytd + 4), foodLyMonthlyEUR:  g(foodRR, rc.ytd + 6), foodLyYearlyEUR:   g(foodRR, rc.ytd + 8),
      bevLyDailyEUR:     g(bevRR,  rc.ytd + 4), bevLyMonthlyEUR:   g(bevRR,  rc.ytd + 6), bevLyYearlyEUR:    g(bevRR,  rc.ytd + 8),
      spaLyDailyEUR:     g(spaRR,  rc.ytd + 4), spaLyMonthlyEUR:   g(spaRR,  rc.ytd + 6), spaLyYearlyEUR:    g(spaRR,  rc.ytd + 8),
      otherLyDailyEUR:   g(othrRR, rc.ytd + 4), otherLyMonthlyEUR: g(othrRR, rc.ytd + 6), otherLyYearlyEUR:  g(othrRR, rc.ytd + 8),
      totalLyDailyEUR:   g(totRR,  rc.ytd + 4), totalLyMonthlyEUR: g(totRR,  rc.ytd + 6), totalLyYearlyEUR:  g(totRR,  rc.ytd + 8),
    },
    revenueData,
    statsExtra: {
      avgSalesRateBudget:   g(avgSR, sc.budget),
      avgSalesRateForecast: g(avgSR, sc.forecast),
      avgSalesRateYTD:      g(avgSR, sc.ytd),
      compRoomBudget:       g(compR, sc.budget),
      compRoomForecast:     g(compR, sc.forecast),
      compRoomYTD:          g(compR, sc.ytd),
      soldRoomYTDBudget:    g(soldR, sc.ytd + 2),
      availRoomYTDBudget:   g(availR, sc.ytd + 2),
      paxYTDBudget:         g(paxR,  paxColMap.ytd + 2),
      availPaxYTDBudget:    g(availR, sc.ytd + 3),
      compPaxBudget:        g(compR, sc.budget + 1),
      compPaxForecast:      g(compR, sc.forecast + 1),
      compPaxYTD:           g(compR, sc.ytd + 1),
      compRoomYTDBudget:    g(compR, sc.ytd + 2),
      compPaxYTDBudget:     g(compR, sc.ytd + 3),
    },
    occupancyBreakdown,
    forecastOccupancy,
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
            kapakReport: {
              create: {
                reportDate: day.date,
                revenueData: kapak.revenueData,
                occupancyBreakdown: kapak.occupancyBreakdown,
                ...kapak.statsExtra,
                ...kapak.forecastOccupancy,
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
