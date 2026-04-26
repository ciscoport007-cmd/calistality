'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface RevenueRow {
  label: string; isTotal: boolean;
  todayTL: number; todayEUR: number;
  mtdActualTL: number; mtdActualEUR: number;
  mtdBudgetTL: number; mtdBudgetEUR: number;
  mtdForecastTL: number; mtdForecastEUR: number;
  ytdActualEUR: number; ytdBudgetEUR: number;
  lyTodayEUR: number; lyMonthEUR: number; lyYearEUR: number;
}

interface Statistics {
  availRoomToday: number; availRoomMTD: number; availRoomBudget: number;
  availRoomForecast: number; availRoomYTD: number;
  soldRoomToday: number; soldRoomMTD: number; soldRoomBudget: number;
  soldRoomForecast: number; soldRoomYTD: number;
  compRoomToday: number; compRoomMTD: number; compRoomBudget: number;
  compRoomForecast: number; compRoomYTD: number;
  occupancyToday: number; occupancyMTD: number; occupancyBudget: number;
  occupancyForecast: number; occupancyYTD: number;
  paxOccupancyToday: number; paxOccupancyMTD: number;
  lyOccupancyToday: number; lyOccupancyMTD: number; lyOccupancyYTD: number;
  adrToday: number; adrMTD: number; adrBudget: number;
  adrForecast: number; adrYTD: number;
  lyAdrToday: number; lyAdrMTD: number; lyAdrYTD: number;
  avgSalesRateToday: number; avgSalesRateMTD: number;
  avgSalesRateBudget: number; avgSalesRateForecast: number; avgSalesRateYTD: number;
  paxToday: number; paxMTD: number; paxBudget: number;
  paxForecast: number; paxYTD: number;
  lyPaxToday: number; lyPaxMTD: number; lyPaxYTD: number;
  outOfOrderToday: number; outOfOrderMTD: number; outOfOrderYTD: number;
}

interface OccupancyRow {
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
}

interface ForecastOccupancy {
  todayArrivalsRoom: number; todayArrivalsPax: number;
  todayArrivalsRoomPct: number; todayArrivalsPaxPct: number;
  todayDepartRoom: number; todayDepartPax: number;
  todayDepartRoomPct: number; todayDepartPaxPct: number;
  tmrwArrivalsRoom: number; tmrwArrivalsPax: number;
  tmrwArrivalsRoomPct: number; tmrwArrivalsPaxPct: number;
  tmrwDepartRoom: number; tmrwDepartPax: number;
  tmrwDepartRoomPct: number; tmrwDepartPaxPct: number;
}

interface ExchangeRate {
  dailyRate: number; monthlyAvgRate: number;
  budgetRate: number; forecastRate: number;
  yearlyAvgRate: number; yearlyBudgetRate: number;
  lyDailyRate: number; lyMonthlyRate: number; lyYearlyRate: number;
}

interface KapakData {
  reportDate: string;
  revenueData: RevenueRow[];
  statistics: Statistics | null;
  occupancyBreakdown: OccupancyRow[];
  forecastOccupancy: ForecastOccupancy;
  exchangeRate: ExchangeRate | null;
}

// ─── Formatters ───────────────────────────────────────────────────────────────
const fmt = (n: number, decimals = 0) =>
  n === 0 ? '-' : n.toLocaleString('tr-TR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
const fmtTL = (n: number) => n === 0 ? '-' : `${n.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL`;
const fmtEUR = (n: number) => n === 0 ? '-' : `${n.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} €`;
const fmtPct = (n: number) => n === 0 ? '-' : `${n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
const fmtRate = (n: number) => n === 0 ? '-' : n.toLocaleString('tr-TR', { minimumFractionDigits: 4, maximumFractionDigits: 4 });

// ─── Table primitives ─────────────────────────────────────────────────────────
const TH = ({ children, colSpan, className = '' }: { children?: React.ReactNode; colSpan?: number; className?: string }) => (
  <th colSpan={colSpan} className={`px-2 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wide border border-gray-300 bg-gray-100 whitespace-nowrap ${className}`}>
    {children}
  </th>
);

const TD = ({ children, className = '', isTotal = false, colSpan }: { children?: React.ReactNode; className?: string; isTotal?: boolean; colSpan?: number }) => (
  <td colSpan={colSpan} className={`px-2 py-1 text-right text-xs border border-gray-200 whitespace-nowrap ${isTotal ? 'font-bold bg-blue-50' : ''} ${className}`}>
    {children}
  </td>
);

const TDLabel = ({ children, indent = false, isTotal = false }: { children: React.ReactNode; indent?: boolean; isTotal?: boolean }) => (
  <td className={`px-2 py-1 text-left text-xs border border-gray-200 whitespace-nowrap ${indent ? 'pl-6' : ''} ${isTotal ? 'font-bold bg-blue-50' : ''}`}>
    {children}
  </td>
);

// ─── Section 1: Revenues ──────────────────────────────────────────────────────
function RevenueSection({ rows }: { rows: RevenueRow[] }) {
  return (
    <div className="overflow-x-auto">
      <div className="text-xs font-bold text-red-600 mb-1">REVENUES / GELİRLER</div>
      <table className="w-full border-collapse text-xs min-w-[1400px]">
        <thead>
          <tr>
            <TH className="w-56 text-left">Kategori</TH>
            <TH colSpan={2}>TODAY / BUGÜN</TH>
            <TH colSpan={6}>CUMULATIVE MONTH TO DATE / AYLIK TOPLAM</TH>
            <TH colSpan={2}>YEARLY / YILLIK</TH>
            <TH colSpan={3}>LAST YEAR / GEÇEN YIL</TH>
          </tr>
          <tr>
            <TH className="text-left"></TH>
            <TH>TL</TH><TH>EURO</TH>
            <TH colSpan={2}>ACTUAL / GERÇEKLEŞEN</TH>
            <TH colSpan={2}>BUDGET / BÜTÇE</TH>
            <TH colSpan={2}>FORECAST / TAHMİNİ</TH>
            <TH>ACTUAL</TH><TH>BUDGET</TH>
            <TH>TODAY</TH><TH>MONTHLY</TH><TH>YEARLY</TH>
          </tr>
          <tr>
            <TH className="text-left"></TH>
            <TH></TH><TH></TH>
            <TH>TL</TH><TH>EURO</TH>
            <TH>TL</TH><TH>EURO</TH>
            <TH>TL</TH><TH>EURO</TH>
            <TH>EURO</TH><TH>EURO</TH>
            <TH>EURO</TH><TH>EURO</TH><TH>EURO</TH>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const indent = !row.isTotal && (row.label.includes('HB Rooms') || row.label.includes('All.Inc'));
            return (
              <tr key={i} className={row.isTotal ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                <TDLabel indent={indent} isTotal={row.isTotal}>{row.label}</TDLabel>
                <TD isTotal={row.isTotal}>{fmtTL(row.todayTL)}</TD>
                <TD isTotal={row.isTotal}>{fmtEUR(row.todayEUR)}</TD>
                <TD isTotal={row.isTotal}>{fmtTL(row.mtdActualTL)}</TD>
                <TD isTotal={row.isTotal}>{fmtEUR(row.mtdActualEUR)}</TD>
                <TD isTotal={row.isTotal}>{fmtTL(row.mtdBudgetTL)}</TD>
                <TD isTotal={row.isTotal}>{fmtEUR(row.mtdBudgetEUR)}</TD>
                <TD isTotal={row.isTotal}>{fmtTL(row.mtdForecastTL)}</TD>
                <TD isTotal={row.isTotal}>{fmtEUR(row.mtdForecastEUR)}</TD>
                <TD isTotal={row.isTotal}>{fmtEUR(row.ytdActualEUR)}</TD>
                <TD isTotal={row.isTotal}>{fmtEUR(row.ytdBudgetEUR)}</TD>
                <TD isTotal={row.isTotal}>{fmtEUR(row.lyTodayEUR)}</TD>
                <TD isTotal={row.isTotal}>{fmtEUR(row.lyMonthEUR)}</TD>
                <TD isTotal={row.isTotal}>{fmtEUR(row.lyYearEUR)}</TD>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Section 2: Statistics ────────────────────────────────────────────────────
function StatisticsSection({ s }: { s: Statistics }) {
  const rows = [
    {
      label: 'TOTAL ROOM & BEDS / Toplam Oda & Geceleme', isHeader: true,
      todayR: s.availRoomToday + s.soldRoomToday, todayP: s.paxToday,
      mtdR: s.availRoomMTD + s.soldRoomMTD, mtdP: s.paxMTD,
      budR: s.availRoomBudget, budP: s.paxBudget,
      fcrR: s.availRoomForecast, fcrP: s.paxForecast,
      ytdR: s.availRoomYTD, ytdP: s.paxYTD,
      lyTR: '', lyTP: '', lyMR: '', lyMP: '', lyYR: '', lyYP: '',
    },
  ];

  return (
    <div className="overflow-x-auto">
      <div className="text-xs font-bold mb-1">STATISTIC / İSTATİSTİK — ROOMS & BEDNIGHTS / Oda & Geceleme</div>
      <table className="w-full border-collapse text-xs min-w-[1400px]">
        <thead>
          <tr>
            <TH className="w-56 text-left"></TH>
            <TH colSpan={2}>TODAY / BUGÜN</TH>
            <TH colSpan={6}>CUMULATIVE MONTH TO DATE / AYLIK TOPLAM</TH>
            <TH colSpan={4}>YEARLY / YILLIK</TH>
            <TH colSpan={6}>LAST YEAR / GEÇEN YIL</TH>
          </tr>
          <tr>
            <TH className="text-left"></TH>
            <TH colSpan={2}>ACTUAL</TH>
            <TH colSpan={2}>ACTUAL / GERÇEKLEŞEN</TH>
            <TH colSpan={2}>BUDGET / BÜTÇE</TH>
            <TH colSpan={2}>FORECAST / TAHMİNİ</TH>
            <TH colSpan={2}>ACTUAL</TH>
            <TH colSpan={2}>BUDGET</TH>
            <TH colSpan={2}>TODAY</TH>
            <TH colSpan={2}>MONTHLY</TH>
            <TH colSpan={2}>YEARLY</TH>
          </tr>
          <tr>
            <TH className="text-left"></TH>
            <TH>ODA</TH><TH>KİŞİ</TH>
            <TH>ODA</TH><TH>KİŞİ</TH>
            <TH>ODA</TH><TH>KİŞİ</TH>
            <TH>ODA</TH><TH>KİŞİ</TH>
            <TH>ODA</TH><TH>KİŞİ</TH>
            <TH>ODA</TH><TH>KİŞİ</TH>
            <TH>ODA</TH><TH>KİŞİ</TH>
            <TH>ODA</TH><TH>KİŞİ</TH>
            <TH>ODA</TH><TH>KİŞİ</TH>
          </tr>
        </thead>
        <tbody>
          {/* Total row */}
          <StatRow label="TOTAL ROOM & BEDS / Toplam Oda & Geceleme" isTotal
            t1={s.soldRoomToday} t2={s.paxToday}
            m1={s.soldRoomMTD} m2={s.paxMTD}
            b1={s.soldRoomBudget} b2={s.paxBudget}
            f1={s.soldRoomForecast} f2={s.paxForecast}
            y1={s.soldRoomYTD} y2={s.paxYTD}
            yb1={0} yb2={0}
            lt1={0} lt2={0} lm1={0} lm2={0} ly1={0} ly2={0}
          />
          <StatRow label="  AVAILABLE ROOM / Satılabilir Oda"
            t1={s.availRoomToday} t2={0}
            m1={s.availRoomMTD} m2={0}
            b1={s.availRoomBudget} b2={0}
            f1={s.availRoomForecast} f2={0}
            y1={s.availRoomYTD} y2={0}
            yb1={0} yb2={0} lt1={0} lt2={0} lm1={0} lm2={0} ly1={0} ly2={0}
          />
          <StatRow label="  SOLD ROOMS / Dolu Oda"
            t1={s.soldRoomToday} t2={s.paxToday}
            m1={s.soldRoomMTD} m2={s.paxMTD}
            b1={s.soldRoomBudget} b2={s.paxBudget}
            f1={s.soldRoomForecast} f2={s.paxForecast}
            y1={s.soldRoomYTD} y2={s.paxYTD}
            yb1={0} yb2={0} lt1={0} lt2={0} lm1={0} lm2={0} ly1={0} ly2={0}
          />
          <StatRow label="  COMPS ROOMS / Dolu Oda"
            t1={s.compRoomToday} t2={0}
            m1={s.compRoomMTD} m2={0}
            b1={s.compRoomBudget} b2={0}
            f1={s.compRoomForecast} f2={0}
            y1={s.compRoomYTD} y2={0}
            yb1={0} yb2={0} lt1={0} lt2={0} lm1={0} lm2={0} ly1={0} ly2={0}
          />
          {/* Occupancy row (percentages) */}
          <tr className="hover:bg-gray-50">
            <TDLabel>  OCCUPIED / Doluluk</TDLabel>
            <TD>{fmtPct(s.occupancyToday)}</TD><TD>{fmtPct(s.paxOccupancyToday)}</TD>
            <TD>{fmtPct(s.occupancyMTD)}</TD><TD>{fmtPct(s.paxOccupancyMTD)}</TD>
            <TD>{fmtPct(s.occupancyBudget)}</TD><TD>-</TD>
            <TD>{fmtPct(s.occupancyForecast)}</TD><TD>-</TD>
            <TD>{fmtPct(s.occupancyYTD)}</TD><TD>-</TD>
            <TD>-</TD><TD>-</TD>
            <TD>{fmtPct(s.lyOccupancyToday)}</TD><TD>-</TD>
            <TD>{fmtPct(s.lyOccupancyMTD)}</TD><TD>-</TD>
            <TD>{fmtPct(s.lyOccupancyYTD)}</TD><TD>-</TD>
          </tr>
          {/* Out of order */}
          <StatRow label="  OUT OF ORDER / Arızalı Oda"
            t1={s.outOfOrderToday} t2={0}
            m1={s.outOfOrderMTD} m2={0}
            b1={0} b2={0} f1={0} f2={0}
            y1={s.outOfOrderYTD} y2={0}
            yb1={0} yb2={0} lt1={0} lt2={0} lm1={0} lm2={0} ly1={0} ly2={0}
          />
        </tbody>
      </table>

      {/* ADR / Avg Sales Rate table */}
      <table className="w-full border-collapse text-xs min-w-[1400px] mt-1">
        <tbody>
          <RateRow label="AVR.ROOM RATE (EXC.VAT) / Ortalama Oda Fiyatı (KDV Hariç)"
            t={s.adrToday} m={s.adrMTD} b={s.adrBudget} f={s.adrForecast} y={s.adrYTD}
            yb={0} lt={s.lyAdrToday} lm={s.lyAdrMTD} ly={s.lyAdrYTD}
          />
          <RateRow label="AVR.SALES RATE (EXC.VAT) / Ortalama Satış Fiyatı (KDV Hariç)"
            t={s.avgSalesRateToday} m={s.avgSalesRateMTD} b={s.avgSalesRateBudget}
            f={s.avgSalesRateForecast} y={s.avgSalesRateYTD}
            yb={0} lt={0} lm={0} ly={0}
          />
        </tbody>
      </table>
    </div>
  );
}

function StatRow({ label, isTotal = false, t1, t2, m1, m2, b1, b2, f1, f2, y1, y2, yb1, yb2, lt1, lt2, lm1, lm2, ly1, ly2 }: {
  label: string; isTotal?: boolean;
  t1: number; t2: number; m1: number; m2: number;
  b1: number; b2: number; f1: number; f2: number;
  y1: number; y2: number; yb1: number; yb2: number;
  lt1: number; lt2: number; lm1: number; lm2: number; ly1: number; ly2: number;
}) {
  return (
    <tr className={isTotal ? 'bg-blue-50' : 'hover:bg-gray-50'}>
      <TDLabel isTotal={isTotal}>{label}</TDLabel>
      <TD isTotal={isTotal}>{fmt(t1)}</TD><TD isTotal={isTotal}>{fmt(t2)}</TD>
      <TD isTotal={isTotal}>{fmt(m1)}</TD><TD isTotal={isTotal}>{fmt(m2)}</TD>
      <TD isTotal={isTotal}>{fmt(b1)}</TD><TD isTotal={isTotal}>{fmt(b2)}</TD>
      <TD isTotal={isTotal}>{fmt(f1)}</TD><TD isTotal={isTotal}>{fmt(f2)}</TD>
      <TD isTotal={isTotal}>{fmt(y1)}</TD><TD isTotal={isTotal}>{fmt(y2)}</TD>
      <TD isTotal={isTotal}>{fmt(yb1)}</TD><TD isTotal={isTotal}>{fmt(yb2)}</TD>
      <TD isTotal={isTotal}>{fmt(lt1)}</TD><TD isTotal={isTotal}>{fmt(lt2)}</TD>
      <TD isTotal={isTotal}>{fmt(lm1)}</TD><TD isTotal={isTotal}>{fmt(lm2)}</TD>
      <TD isTotal={isTotal}>{fmt(ly1)}</TD><TD isTotal={isTotal}>{fmt(ly2)}</TD>
    </tr>
  );
}

function RateRow({ label, t, m, b, f, y, yb, lt, lm, ly }: {
  label: string; t: number; m: number; b: number; f: number; y: number;
  yb: number; lt: number; lm: number; ly: number;
}) {
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-2 py-1 text-left text-xs border border-gray-200 text-red-600 font-medium w-56 whitespace-nowrap">{label}</td>
      <TD colSpan={2}>{fmtEUR(t)}</TD>
      <TD colSpan={2}>{fmtEUR(m)}</TD>
      <TD colSpan={2}>{fmtEUR(b)}</TD>
      <TD colSpan={2}>{fmtEUR(f)}</TD>
      <TD colSpan={2}>{fmtEUR(y)}</TD>
      <TD colSpan={2}>{fmtEUR(yb)}</TD>
      <TD colSpan={2}>{fmtEUR(lt)}</TD>
      <TD colSpan={2}>{fmtEUR(lm)}</TD>
      <TD colSpan={2}>{fmtEUR(ly)}</TD>
    </tr>
  );
}

// ─── Section 3: Occupancy Breakdown ──────────────────────────────────────────
function OccupancySection({ rows }: { rows: OccupancyRow[] }) {
  return (
    <div className="overflow-x-auto">
      <div className="text-xs font-bold mb-1">OCCUPANCY / DOLULUK</div>
      <table className="w-full border-collapse text-xs min-w-[1400px]">
        <thead>
          <tr>
            <TH className="w-56 text-left">Misafir Tipi</TH>
            <TH colSpan={2}>TODAY / BUGÜN</TH>
            <TH colSpan={6}>CUMULATIVE MONTH TO DATE / AYLIK TOPLAM</TH>
            <TH colSpan={4}>YEARLY / YILLIK</TH>
            <TH colSpan={6}>LAST YEAR / GEÇEN YIL</TH>
          </tr>
          <tr>
            <TH className="text-left"></TH>
            <TH colSpan={2}>ACTUAL</TH>
            <TH colSpan={2}>ACTUAL</TH>
            <TH colSpan={2}>BUDGET</TH>
            <TH colSpan={2}>FORECAST</TH>
            <TH colSpan={2}>ACTUAL</TH>
            <TH colSpan={2}>BUDGET</TH>
            <TH colSpan={2}>TODAY</TH>
            <TH colSpan={2}>MONTHLY</TH>
            <TH colSpan={2}>YEARLY</TH>
          </tr>
          <tr>
            <TH className="text-left"></TH>
            <TH>ODA</TH><TH>KİŞİ</TH>
            <TH>ODA</TH><TH>KİŞİ</TH>
            <TH>ODA</TH><TH>KİŞİ</TH>
            <TH>ODA</TH><TH>KİŞİ</TH>
            <TH>ODA</TH><TH>KİŞİ</TH>
            <TH>ODA</TH><TH>KİŞİ</TH>
            <TH>ODA</TH><TH>KİŞİ</TH>
            <TH>ODA</TH><TH>KİŞİ</TH>
            <TH>ODA</TH><TH>KİŞİ</TH>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-gray-50">
              <TDLabel>{r.label}</TDLabel>
              <TD>{fmt(r.todayRoom)}</TD><TD>{fmt(r.todayPax)}</TD>
              <TD>{fmt(r.mtdRoom)}</TD><TD>{fmt(r.mtdPax)}</TD>
              <TD>{fmt(r.budgetRoom)}</TD><TD>{fmt(r.budgetPax)}</TD>
              <TD>{fmt(r.forecastRoom)}</TD><TD>{fmt(r.forecastPax)}</TD>
              <TD>{fmt(r.ytdRoom)}</TD><TD>{fmt(r.ytdPax)}</TD>
              <TD>{fmt(r.ytdBudgetRoom)}</TD><TD>{fmt(r.ytdBudgetPax)}</TD>
              <TD>{fmt(r.lyTodayRoom)}</TD><TD>{fmt(r.lyTodayPax)}</TD>
              <TD>{fmt(r.lyMonthRoom)}</TD><TD>{fmt(r.lyMonthPax)}</TD>
              <TD>{fmt(r.lyYearRoom)}</TD><TD>{fmt(r.lyYearPax)}</TD>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Section 4: Forecast Occupancy ────────────────────────────────────────────
function ForecastSection({ fc }: { fc: ForecastOccupancy }) {
  return (
    <div className="flex gap-6 flex-wrap">
      <div>
        <div className="text-xs font-bold mb-1">FORECAST OCCUPANCY / Tahmini Doluluk — TODAY / Bugün</div>
        <table className="border-collapse text-xs">
          <thead>
            <tr>
              <TH className="w-40 text-left"></TH>
              <TH>ROOM/ODA</TH><TH>PAX/KİŞİ</TH>
              <TH>ROOM/ODA %</TH><TH>PAX/KİŞİ %</TH>
            </tr>
          </thead>
          <tbody>
            <tr className="hover:bg-gray-50">
              <TDLabel>ARRIVALS / Geliş</TDLabel>
              <TD>{fmt(fc.todayArrivalsRoom)}</TD><TD>{fmt(fc.todayArrivalsPax)}</TD>
              <TD>{fmtPct(fc.todayArrivalsRoomPct)}</TD><TD>{fmtPct(fc.todayArrivalsPaxPct)}</TD>
            </tr>
            <tr className="hover:bg-gray-50">
              <TDLabel>DEPARTURES / Gidiş</TDLabel>
              <TD>{fmt(fc.todayDepartRoom)}</TD><TD>{fmt(fc.todayDepartPax)}</TD>
              <TD>{fmtPct(fc.todayDepartRoomPct)}</TD><TD>{fmtPct(fc.todayDepartPaxPct)}</TD>
            </tr>
          </tbody>
        </table>
      </div>
      <div>
        <div className="text-xs font-bold mb-1">FORECAST OCCUPANCY / Tahmini Doluluk — TOMORROW / Yarın</div>
        <table className="border-collapse text-xs">
          <thead>
            <tr>
              <TH className="w-40 text-left"></TH>
              <TH>ROOM/ODA</TH><TH>PAX/KİŞİ</TH>
              <TH>ROOM/ODA %</TH><TH>PAX/KİŞİ %</TH>
            </tr>
          </thead>
          <tbody>
            <tr className="hover:bg-gray-50">
              <TDLabel>ARRIVALS / Geliş</TDLabel>
              <TD>{fmt(fc.tmrwArrivalsRoom)}</TD><TD>{fmt(fc.tmrwArrivalsPax)}</TD>
              <TD>{fmtPct(fc.tmrwArrivalsRoomPct)}</TD><TD>{fmtPct(fc.tmrwArrivalsPaxPct)}</TD>
            </tr>
            <tr className="hover:bg-gray-50">
              <TDLabel>DEPARTURES / Gidiş</TDLabel>
              <TD>{fmt(fc.tmrwDepartRoom)}</TD><TD>{fmt(fc.tmrwDepartPax)}</TD>
              <TD>{fmtPct(fc.tmrwDepartRoomPct)}</TD><TD>{fmtPct(fc.tmrwDepartPaxPct)}</TD>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Exchange Rate Section ────────────────────────────────────────────────────
function ExchangeSection({ er }: { er: ExchangeRate }) {
  return (
    <div className="overflow-x-auto">
      <div className="text-xs font-bold mb-1">KUR BİLGİLERİ / EXCHANGE RATES</div>
      <table className="border-collapse text-xs">
        <thead>
          <tr>
            <TH colSpan={2} className="bg-amber-50">GÜNCEL / CURRENT</TH>
            <TH colSpan={4} className="bg-amber-50"></TH>
            <TH colSpan={3} className="bg-green-50">GEÇEN YIL / LAST YEAR</TH>
          </tr>
          <tr>
            <TH>Daily / Günlük</TH>
            <TH>Month / Aylık Ort.</TH>
            <TH>Budget / Aylık Ort.</TH>
            <TH>Forecast / Aylık Ort.</TH>
            <TH>Year / Yıllık Ort.</TH>
            <TH>Budget / Yıllık Ort.</TH>
            <TH>Daily / Günlük</TH>
            <TH>Month / Aylık</TH>
            <TH>Year / Yıllık</TH>
          </tr>
        </thead>
        <tbody>
          <tr className="hover:bg-gray-50">
            <TD>{fmtRate(er.dailyRate)}</TD>
            <TD>{fmtRate(er.monthlyAvgRate)}</TD>
            <TD>{fmtRate(er.budgetRate)}</TD>
            <TD>{fmtRate(er.forecastRate)}</TD>
            <TD>{fmtRate(er.yearlyAvgRate)}</TD>
            <TD>{fmtRate(er.yearlyBudgetRate)}</TD>
            <TD>{fmtRate(er.lyDailyRate)}</TD>
            <TD>{fmtRate(er.lyMonthlyRate)}</TD>
            <TD>{fmtRate(er.lyYearlyRate)}</TD>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function KapakDetailPage({ params }: { params: { date: string } }) {
  const { date } = params;
  const router = useRouter();
  const [data, setData] = useState<KapakData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allDates, setAllDates] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([
      fetch(`/api/finance/kapak?date=${date}`).then((r) => r.json()),
      fetch('/api/finance/kapak').then((r) => r.json()),
    ])
      .then(([detail, list]) => {
        if (detail.success) setData(detail.data);
        else setError('Veri bulunamadı');
        if (list.success) setAllDates(list.data as string[]);
      })
      .catch(() => setError('Bağlantı hatası'))
      .finally(() => setLoading(false));
  }, [date]);

  const sortedDates = [...allDates].sort();
  const currentIdx = sortedDates.indexOf(date);
  const prevDate = currentIdx > 0 ? sortedDates[currentIdx - 1] : null;
  const nextDate = currentIdx < sortedDates.length - 1 ? sortedDates[currentIdx + 1] : null;

  const formatDate = (d: string) => {
    const dt = new Date(d);
    const months = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
    return `${dt.getDate()} ${months[dt.getMonth()]} ${dt.getFullYear()}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-muted-foreground text-sm">Yükleniyor...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/finance/gelirler/kapak')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Geri
        </Button>
        <div className="text-destructive text-sm">{error ?? 'Bu tarihe ait kapak raporu bulunamadı.'}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/finance/gelirler/kapak')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Kapak Listesi
          </Button>
          <h1 className="text-xl font-bold">{formatDate(date)}</h1>
          <Badge variant="outline" className="text-xs">Kapak Raporu</Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={!prevDate}
            onClick={() => prevDate && router.push(`/dashboard/finance/gelirler/kapak/${prevDate}`)}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Önceki Gün
          </Button>
          <Button variant="outline" size="sm" disabled={!nextDate}
            onClick={() => nextDate && router.push(`/dashboard/finance/gelirler/kapak/${nextDate}`)}>
            Sonraki Gün <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Section 1: Revenues */}
      <div className="rounded-lg border bg-card p-4">
        <RevenueSection rows={data.revenueData} />
      </div>

      {/* Section 2: Statistics */}
      {data.statistics && (
        <div className="rounded-lg border bg-card p-4">
          <StatisticsSection s={data.statistics} />
        </div>
      )}

      {/* Section 3: Occupancy Breakdown */}
      {data.occupancyBreakdown && data.occupancyBreakdown.length > 0 && (
        <div className="rounded-lg border bg-card p-4">
          <OccupancySection rows={data.occupancyBreakdown as OccupancyRow[]} />
        </div>
      )}

      {/* Section 4: Forecast Occupancy */}
      {data.forecastOccupancy && (
        <div className="rounded-lg border bg-card p-4">
          <ForecastSection fc={data.forecastOccupancy} />
        </div>
      )}

      {/* Exchange Rates */}
      {data.exchangeRate && (
        <div className="rounded-lg border bg-card p-4">
          <ExchangeSection er={data.exchangeRate} />
        </div>
      )}
    </div>
  );
}
