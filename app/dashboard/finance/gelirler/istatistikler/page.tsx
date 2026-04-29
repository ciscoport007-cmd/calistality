'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, getDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import { RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LineChart, Line, BarChart, Bar, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, Cell,
} from 'recharts';
import { useFinanceFilters, type DateRange } from '@/hooks/use-finance-filters';
import { FinanceFilterBar } from '@/components/finance/filter-bar';
import { downloadCSV } from '@/lib/csv-export';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Statistics {
  occupancyToday: number; occupancyMTD: number; occupancyBudget: number;
  occupancyForecast: number; occupancyYTD: number;
  lyOccupancyToday: number; lyOccupancyMTD: number; lyOccupancyYTD: number;
  adrToday: number; adrMTD: number; adrBudget: number; adrForecast: number; adrYTD: number;
  lyAdrToday: number; lyAdrMTD: number; lyAdrYTD: number;
  soldRoomToday: number; soldRoomMTD: number; soldRoomBudget: number; soldRoomYTD: number;
  availRoomToday: number; availRoomMTD: number; availRoomBudget: number; availRoomYTD: number;
  compRoomToday: number; compRoomMTD: number;
  paxToday: number; paxMTD: number; paxBudget: number; paxYTD: number;
  outOfOrderToday: number; outOfOrderMTD: number;
  avgSalesRateToday: number; avgSalesRateMTD: number; avgSalesRateBudget: number; avgSalesRateYTD: number;
  lySoldRoomToday: number; lySoldRoomMTD: number;
  lyPaxToday: number; lyPaxMTD: number;
}

interface TrendPoint {
  date: string;
  occupancyToday: number; occupancyMTD: number; occupancyBudget: number; lyOccupancyToday: number;
  adrToday: number; adrMTD: number; soldRoomToday: number; paxToday: number;
}

interface WeekStats {
  occ: number; lyOcc: number;
  adr: number;
  soldRoom: number; pax: number;
}

interface KapakData { reportDate: string; statistics: Statistics | null }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt0   = (n: number) => new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(n);
const fmtEUR = (n: number) => n === 0 ? '—' : `${fmt0(n)} €`;
const fmtPct = (n: number, sign = false) => n === 0 ? '—' : `${sign && n > 0 ? '+' : ''}${n.toFixed(1)}%`;
const varPct = (a: number, b: number) => b > 0 ? ((a - b) / b) * 100 : 0;
const shortDate = (d: string) => format(new Date(d), 'd MMM', { locale: tr });
const TOOLTIP_STYLE = { fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' };
const WEEKDAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

// Pazartesi'den bugüne kadar günlük trend verilerinden WTD ortalamaları hesapla
function computeWeekStats(trend: TrendPoint[]): WeekStats | null {
  const now = new Date();
  const dow = now.getDay(); // 0=Pazar, 1=Pzt, ..., 6=Cmt
  const daysFromMon = (dow + 6) % 7; // Pazartesi=0, Salı=1, ..., Pazar=6
  const monday = new Date(now);
  monday.setDate(now.getDate() - daysFromMon);
  monday.setHours(0, 0, 0, 0);

  const weekData = trend.filter((d) => new Date(d.date + 'T00:00:00') >= monday);
  if (weekData.length === 0) return null;

  const n = weekData.length;
  return {
    occ:      weekData.reduce((s, d) => s + d.occupancyToday, 0) / n,
    lyOcc:    weekData.reduce((s, d) => s + d.lyOccupancyToday, 0) / n,
    adr:      weekData.reduce((s, d) => s + d.adrToday, 0) / n,
    soldRoom: weekData.reduce((s, d) => s + d.soldRoomToday, 0),
    pax:      weekData.reduce((s, d) => s + d.paxToday, 0),
  };
}

// Seçilen periyoda göre hangi stat alanlarının gösterileceği
function getPeriodStats(stat: Statistics, dateRange: DateRange, week?: WeekStats | null) {
  if (dateRange === 'today') {
    return {
      label:    'Bugün',
      activeCol: 'today' as const,
      occ:      stat.occupancyToday,   lyOcc:  stat.lyOccupancyToday,  occBudget: stat.occupancyBudget,
      adr:      stat.adrToday,         lyAdr:  stat.lyAdrToday,        adrBudget: stat.adrBudget,
      pax:      stat.paxToday,         lyPax:  stat.lyPaxToday,        paxBudget: stat.paxBudget,
      soldRoom: stat.soldRoomToday,    availRoom: stat.availRoomToday,
    };
  }
  if (dateRange === 'week') {
    return {
      label:    'Bu Hafta',
      activeCol: 'today' as const,
      occ:      week?.occ      ?? stat.occupancyMTD,   lyOcc:  week?.lyOcc  ?? stat.lyOccupancyMTD,  occBudget: stat.occupancyBudget,
      adr:      week?.adr      ?? stat.adrMTD,          lyAdr:  stat.lyAdrMTD,                        adrBudget: stat.adrBudget,
      pax:      week?.pax      ?? stat.paxMTD,          lyPax:  stat.lyPaxMTD,                        paxBudget: stat.paxBudget,
      soldRoom: week?.soldRoom ?? stat.soldRoomMTD,     availRoom: stat.availRoomMTD,
    };
  }
  if (dateRange === 'year') {
    return {
      label:    'YTD',
      activeCol: 'ytd' as const,
      occ:      stat.occupancyYTD,     lyOcc:  stat.lyOccupancyYTD,   occBudget: stat.occupancyBudget,
      adr:      stat.adrYTD,           lyAdr:  stat.lyAdrYTD,         adrBudget: stat.adrBudget,
      pax:      stat.paxYTD,           lyPax:  stat.lyPaxMTD,         paxBudget: stat.paxBudget,
      soldRoom: stat.soldRoomYTD,      availRoom: stat.availRoomYTD,
    };
  }
  // month (MTD) — default
  return {
    label:    'MTD',
    activeCol: 'mtd' as const,
    occ:      stat.occupancyMTD,     lyOcc:  stat.lyOccupancyMTD,   occBudget: stat.occupancyBudget,
    adr:      stat.adrMTD,           lyAdr:  stat.lyAdrMTD,         adrBudget: stat.adrBudget,
    pax:      stat.paxMTD,           lyPax:  stat.lyPaxMTD,         paxBudget: stat.paxBudget,
    soldRoom: stat.soldRoomMTD,      availRoom: stat.availRoomMTD,
  };
}

// ─── Heatmap ──────────────────────────────────────────────────────────────────

function OccupancyHeatmap({ trend }: { trend: TrendPoint[] }) {
  const occMap = new Map(trend.map((d) => [d.date, d.occupancyToday]));
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const date = new Date(year, month, i + 1);
    const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`;
    return { day: i + 1, dateStr, occ: occMap.get(dateStr) ?? null };
  });

  const firstDow = new Date(year, month, 1).getDay();
  const firstMon = (firstDow + 6) % 7; // Mon=0

  const getColor = (occ: number | null) => {
    if (occ === null) return '#f3f4f6';
    if (occ >= 90) return '#15803d';
    if (occ >= 80) return '#16a34a';
    if (occ >= 70) return '#4ade80';
    if (occ >= 60) return '#fbbf24';
    if (occ >= 50) return '#f97316';
    return '#dc2626';
  };
  const getTextColor = (occ: number | null) => (occ !== null && occ >= 60 ? 'white' : '#374151');

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'].map((d) => (
          <div key={d} className="text-center text-[9px] font-medium text-muted-foreground">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstMon }, (_, i) => <div key={`e-${i}`} />)}
        {days.map(({ day, dateStr, occ }) => (
          <div key={dateStr}
            className="aspect-square rounded flex items-center justify-center text-[9px] font-medium cursor-default select-none"
            style={{ backgroundColor: getColor(occ), color: getTextColor(occ) }}
            title={occ !== null ? `${dateStr}: ${occ.toFixed(1)}%` : 'Veri yok'}>
            {day}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        {[
          { color: '#15803d', label: '90%+' },
          { color: '#16a34a', label: '80-89%' },
          { color: '#4ade80', label: '70-79%' },
          { color: '#fbbf24', label: '60-69%' },
          { color: '#f97316', label: '50-59%' },
          { color: '#dc2626', label: '<50%'   },
          { color: '#f3f4f6', label: 'Yok'    },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1">
            <div className="w-3 h-3 rounded border border-gray-200" style={{ backgroundColor: color }} />
            <span className="text-[10px] text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Stat Row ─────────────────────────────────────────────────────────────────

function StatTableRow({ label, today, mtdActual, mtdBudget, ytdActual, lyToday, lyMTD, isPct = false, isEUR = false, occColor = false }: {
  label: string; today: number; mtdActual: number; mtdBudget: number;
  ytdActual: number; lyToday: number; lyMTD: number;
  isPct?: boolean; isEUR?: boolean; occColor?: boolean;
}) {
  const fmt = isPct ? fmtPct : isEUR ? fmtEUR : (n: number) => fmt0(n);
  const mtdVar = varPct(mtdActual, mtdBudget);
  const yoyMTD = lyMTD > 0 ? ((mtdActual - lyMTD) / lyMTD) * 100 : 0;

  const occCellColor = (v: number) => {
    if (!occColor || !isPct) return '';
    if (v >= 80) return 'text-green-700 font-semibold';
    if (v >= 70) return 'text-amber-600 font-semibold';
    return 'text-red-600 font-semibold';
  };

  return (
    <tr className="border-b border-border/40 hover:bg-muted/20">
      <td className="px-3 py-2 text-xs font-medium sticky left-0 bg-inherit min-w-[180px]">{label}</td>
      <td className={`px-3 py-2 text-right text-xs ${occCellColor(today)}`}>{fmt(today)}</td>
      <td className={`px-3 py-2 text-right text-xs ${occCellColor(mtdActual)}`}>{fmt(mtdActual)}</td>
      <td className="px-3 py-2 text-right text-xs text-muted-foreground">{fmt(mtdBudget)}</td>
      <td className="px-3 py-2 text-center text-xs">
        {mtdBudget > 0 ? (
          <Badge className={`text-[10px] px-1.5 py-0 ${mtdVar >= 0 ? 'bg-green-100 text-green-700 hover:bg-green-100' : 'bg-red-100 text-red-700 hover:bg-red-100'}`}>
            {fmtPct(mtdVar, true)}
          </Badge>
        ) : <span className="text-muted-foreground">—</span>}
      </td>
      <td className={`px-3 py-2 text-right text-xs ${occCellColor(ytdActual)}`}>{fmt(ytdActual)}</td>
      <td className="px-3 py-2 text-right text-xs text-muted-foreground">{lyToday > 0 ? fmt(lyToday) : '—'}</td>
      <td className="px-3 py-2 text-right text-xs text-muted-foreground">{lyMTD > 0 ? fmt(lyMTD) : '—'}</td>
      <td className="px-3 py-2 text-center text-xs">
        {lyMTD > 0 ? (
          <span className={`text-xs font-medium ${yoyMTD >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {fmtPct(yoyMTD, true)}
          </span>
        ) : '—'}
      </td>
    </tr>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
      <Skeleton className="h-56 rounded-xl" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-56 rounded-xl" />
        <Skeleton className="h-56 rounded-xl" />
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function IstatistiklerPage() {
  const { filters, update, days } = useFinanceFilters();
  const [kapak, setKapak]   = useState<KapakData | null>(null);
  const [trend, setTrend]   = useState<TrendPoint[]>([]);
  const [loading, setLoading]   = useState(true);
  const [activeChart, setActiveChart] = useState<'occ' | 'adr'>('occ');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [kRes, tRes] = await Promise.all([
        fetch('/api/finance/kapak?latest=true'),
        fetch(`/api/finance/kapak/trend?days=${days}`),
      ]);
      const [kJson, tJson] = await Promise.all([kRes.json(), tRes.json()]);
      if (kJson.success) setKapak(kJson.data);
      if (tJson.success) setTrend(tJson.data);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  const stat = kapak?.statistics ?? null;
  const latestDate = kapak ? format(new Date(kapak.reportDate), 'd MMMM yyyy', { locale: tr }) : '';

  const occTrend = trend.map((d) => ({
    gun: shortDate(d.date),
    'Bu Yıl MTD': d.occupancyMTD,
    'Geçen Yıl':  d.lyOccupancyToday,
    'Bütçe':      d.occupancyBudget,
  }));

  const adrTrend = trend.map((d) => ({
    gun: shortDate(d.date),
    'ADR MTD (€)': d.adrMTD,
    'Satılan Oda': d.soldRoomToday,
  }));

  // Weekday radar
  const weekdayOcc: Record<number, number[]> = { 0:[],1:[],2:[],3:[],4:[],5:[],6:[] };
  trend.forEach((d) => weekdayOcc[getDay(new Date(d.date))].push(d.occupancyToday));
  const radarData = [1,2,3,4,5,6,0].map((dow, i) => ({
    day: WEEKDAYS[i],
    'Doluluk %': weekdayOcc[dow].length > 0
      ? +(weekdayOcc[dow].reduce((a, b) => a + b, 0) / weekdayOcc[dow].length).toFixed(1) : 0,
  }));

  // Monthly RevPAR grouped bar — group trend by month, take last entry per month
  const monthMap = new Map<string, { month: string; revpar: number; lyRevpar: number }>();
  trend.forEach((d) => {
    const m = d.date.slice(0, 7); // 'YYYY-MM'
    const revpar   = d.adrMTD > 0 && d.occupancyMTD > 0 ? d.adrMTD * (d.occupancyMTD / 100) : 0;
    const lyRevpar = 0; // LY RevPAR from trend not available — placeholder
    monthMap.set(m, {
      month: format(new Date(d.date), 'MMM yy', { locale: tr }),
      revpar,
      lyRevpar,
    });
  });
  const monthlyRevpar = Array.from(monthMap.values());

  // CSV export
  const handleExport = () => {
    if (!stat) return;
    const revpar   = stat.adrMTD > 0 && stat.occupancyMTD > 0 ? stat.adrMTD * (stat.occupancyMTD / 100) : 0;
    const lyRevpar = stat.lyAdrMTD > 0 && stat.lyOccupancyMTD > 0 ? stat.lyAdrMTD * (stat.lyOccupancyMTD / 100) : 0;
    downloadCSV(`istatistikler-${latestDate || 'export'}.csv`,
      ['Metrik', 'Bugün', 'MTD', 'MTD Bütçe', 'YTD'],
      [
        ['Müsait Oda', stat.availRoomToday, stat.availRoomMTD, stat.availRoomBudget, stat.availRoomYTD],
        ['Satılan Oda', stat.soldRoomToday, stat.soldRoomMTD, stat.soldRoomBudget, stat.soldRoomYTD],
        ['Ücretsiz Oda', stat.compRoomToday, stat.compRoomMTD, 0, 0],
        ['Doluluk %', `${stat.occupancyToday.toFixed(1)}%`, `${stat.occupancyMTD.toFixed(1)}%`, `${stat.occupancyBudget.toFixed(1)}%`, `${stat.occupancyYTD.toFixed(1)}%`],
        ['ADR (€)', stat.adrToday, stat.adrMTD, stat.adrBudget, stat.adrYTD],
        ['RevPAR (€)', revpar.toFixed(2), revpar.toFixed(2), 0, 0],
        ['PAX', stat.paxToday, stat.paxMTD, stat.paxBudget, stat.paxYTD],
      ]
    );
  };

  if (loading) return <PageSkeleton />;

  if (!stat) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-muted-foreground">İstatistik verisi bulunamadı</p>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1" />Yenile</Button>
      </div>
    );
  }

  const weekStats = filters.dateRange === 'week' ? computeWeekStats(trend) : null;
  const ps        = getPeriodStats(stat, filters.dateRange, weekStats);
  const revpar   = ps.adr   > 0 && ps.occ   > 0 ? ps.adr   * (ps.occ   / 100) : 0;
  const lyRevpar = ps.lyAdr > 0 && ps.lyOcc > 0 ? ps.lyAdr * (ps.lyOcc / 100) : 0;

  // Tablo sütun vurgu stili
  const colHdr = (col: 'today' | 'mtd' | 'ytd') =>
    ps.activeCol === col
      ? 'px-3 py-2 text-right text-xs font-bold text-primary bg-primary/5'
      : 'px-3 py-2 text-right text-xs font-semibold text-muted-foreground';

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">İstatistikler</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Son veri: {latestDate}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1" />Yenile</Button>
          <FinanceFilterBar
            dateRange={filters.dateRange}
            currency={filters.currency}
            onDateChange={(r) => update({ dateRange: r })}
            onCurrencyChange={(c) => update({ currency: c })}
            onExport={handleExport}
          />
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: `Doluluk (${ps.label})`, value: fmtPct(ps.occ),  sub: `Bütçe: ${fmtPct(ps.occBudget)}`, ly: `LY: ${fmtPct(ps.lyOcc)}`,  up: ps.occ   >= ps.lyOcc,   color: '#7c3aed' },
          { label: `ADR (${ps.label})`,     value: fmtEUR(ps.adr),  sub: `Bütçe: ${fmtEUR(ps.adrBudget)}`, ly: `LY: ${fmtEUR(ps.lyAdr)}`,  up: ps.adr   >= ps.lyAdr,   color: '#0891b2' },
          { label: `RevPAR (${ps.label})`,  value: fmtEUR(revpar),  sub: 'ADR × Occ%',                      ly: `LY: ${fmtEUR(lyRevpar)}`,  up: revpar   >= lyRevpar,    color: '#0f766e' },
          { label: `PAX (${ps.label})`,     value: fmt0(ps.pax),    sub: `Bütçe: ${fmt0(ps.paxBudget)}`,   ly: `LY: ${fmt0(ps.lyPax)}`,    up: ps.pax   >= ps.lyPax,   color: '#db2777' },
        ].map((m) => (
          <Card key={m.label} className="border-l-4" style={{ borderLeftColor: m.color }}>
            <CardContent className="pt-4 pb-4">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{m.label}</p>
              <p className="text-xl font-bold mt-1">{m.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{m.sub}</p>
              <div className={`flex items-center gap-1 mt-1.5 text-xs font-medium ${m.up ? 'text-green-600' : 'text-red-600'}`}>
                {m.up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                {m.ly}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Statistics table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">
            Oda İstatistikleri Tablosu
            <span className="ml-2 text-[10px] font-normal text-primary border border-primary/30 bg-primary/5 px-1.5 py-0.5 rounded">
              {ps.label} seçili
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="border-b border-border">
                <tr className="bg-muted/50">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground sticky left-0 bg-muted/50 min-w-[180px]">Metrik</th>
                  <th className={colHdr('today')}>Bugün</th>
                  <th className={colHdr('mtd')}>MTD</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">MTD Bütçe</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground">Var%</th>
                  <th className={colHdr('ytd')}>YTD</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">LY Bugün</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">LY MTD</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground">YoY%</th>
                </tr>
              </thead>
              <tbody>
                <StatTableRow label="Müsait Oda"    today={stat.availRoomToday}    mtdActual={stat.availRoomMTD}    mtdBudget={stat.availRoomBudget}    ytdActual={stat.availRoomYTD}    lyToday={0}                   lyMTD={0} />
                <StatTableRow label="Satılan Oda"   today={stat.soldRoomToday}     mtdActual={stat.soldRoomMTD}     mtdBudget={stat.soldRoomBudget}     ytdActual={stat.soldRoomYTD}     lyToday={stat.lySoldRoomToday} lyMTD={stat.lySoldRoomMTD} />
                <StatTableRow label="Ücretsiz Oda"  today={stat.compRoomToday}     mtdActual={stat.compRoomMTD}     mtdBudget={0}                       ytdActual={0}                    lyToday={0}                   lyMTD={0} />
                <StatTableRow label="Doluluk %"     today={stat.occupancyToday}    mtdActual={stat.occupancyMTD}    mtdBudget={stat.occupancyBudget}    ytdActual={stat.occupancyYTD}    lyToday={stat.lyOccupancyToday} lyMTD={stat.lyOccupancyMTD} isPct occColor />
                <StatTableRow label="ADR (€)"       today={stat.adrToday}          mtdActual={stat.adrMTD}          mtdBudget={stat.adrBudget}          ytdActual={stat.adrYTD}          lyToday={stat.lyAdrToday}      lyMTD={stat.lyAdrMTD} isEUR />
                <StatTableRow label="RevPAR (€)"    today={stat.adrToday * (stat.occupancyToday/100)} mtdActual={revpar} mtdBudget={0} ytdActual={0} lyToday={0} lyMTD={lyRevpar} isEUR />
                <StatTableRow label="Ort. Satış F." today={stat.avgSalesRateToday} mtdActual={stat.avgSalesRateMTD} mtdBudget={stat.avgSalesRateBudget} ytdActual={stat.avgSalesRateYTD} lyToday={0}                   lyMTD={0} isEUR />
                <StatTableRow label="PAX"           today={stat.paxToday}          mtdActual={stat.paxMTD}          mtdBudget={stat.paxBudget}          ytdActual={stat.paxYTD}          lyToday={stat.lyPaxToday}      lyMTD={stat.lyPaxMTD} />
                <StatTableRow label="OoO Oda"       today={stat.outOfOrderToday}   mtdActual={stat.outOfOrderMTD}   mtdBudget={0}                       ytdActual={0}                    lyToday={0}                   lyMTD={0} />
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Trend — Son {days} Gün</CardTitle>
            <div className="flex rounded-lg border overflow-hidden text-xs">
              <button onClick={() => setActiveChart('occ')}
                className={`px-2 py-1 transition-colors ${activeChart === 'occ' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
                Doluluk
              </button>
              <button onClick={() => setActiveChart('adr')}
                className={`px-2 py-1 transition-colors ${activeChart === 'adr' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
                ADR
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {activeChart === 'occ' ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={occTrend} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="gun" tick={{ fontSize: 9, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#6b7280' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v}%`} />
                  <Tooltip formatter={(v: number) => [`${v.toFixed(1)}%`]} contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Line type="monotone" dataKey="Bu Yıl MTD" stroke="#7c3aed" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="Geçen Yıl"  stroke="#9ca3af" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
                  <Line type="monotone" dataKey="Bütçe"      stroke="#ef4444" strokeWidth={1.5} strokeDasharray="3 3" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={adrTrend} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="gun" tick={{ fontSize: 9, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left"  tick={{ fontSize: 9, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar  yAxisId="right" dataKey="Satılan Oda" fill="#e0e7ff" radius={[2,2,0,0]} />
                  <Line yAxisId="left"  type="monotone" dataKey="ADR MTD (€)" stroke="#0891b2" strokeWidth={2.5} dot={false} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Haftanın Günü Analizi — Ort. Doluluk %</CardTitle>
          </CardHeader>
          <CardContent>
            {radarData.every((d) => d['Doluluk %'] === 0) ? (
              <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">Yeterli veri yok</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <Radar name="Doluluk %" dataKey="Doluluk %" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.3} />
                  <Tooltip formatter={(v: number) => [`${v.toFixed(1)}%`, 'Ort. Doluluk']} contentStyle={TOOLTIP_STYLE} />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Heatmap */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Doluluk Isı Haritası — {format(new Date(), 'MMMM yyyy', { locale: tr })}</CardTitle>
        </CardHeader>
        <CardContent>
          <OccupancyHeatmap trend={trend} />
        </CardContent>
      </Card>

      {/* Monthly RevPAR comparison */}
      {monthlyRevpar.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Aylık RevPAR MTD Trendi (€)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyRevpar} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#374151' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#6b7280' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${fmt0(v)}€`} />
                <Tooltip formatter={(v: number) => [fmtEUR(v), 'RevPAR']} contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="revpar" fill="#0f766e" radius={[3,3,0,0]}
                  label={{ position: 'top', fontSize: 10, formatter: (v: number) => v > 0 ? fmtEUR(v) : '' }}>
                  {monthlyRevpar.map((_, i) => <Cell key={i} fill={i === monthlyRevpar.length - 1 ? '#0f766e' : '#99f6e4'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Performance indicators */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Performans Göstergeleri</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { label: 'ADR YoY Büyüme',          value: fmtPct(varPct(stat.adrMTD, stat.lyAdrMTD), true),         good: stat.adrMTD >= stat.lyAdrMTD },
              { label: 'RevPAR YoY Büyüme',        value: fmtPct(varPct(revpar, lyRevpar), true),                   good: revpar >= lyRevpar },
              { label: 'Doluluk vs Bütçe (pp)',    value: `${(stat.occupancyMTD - stat.occupancyBudget).toFixed(1)} pp`, good: stat.occupancyMTD >= stat.occupancyBudget },
              { label: 'Ort. Satış Fiyatı MTD',   value: fmtEUR(stat.avgSalesRateMTD),                             good: stat.avgSalesRateMTD >= stat.avgSalesRateBudget },
              { label: 'Bütçe Gerçekleşme (Occ)', value: stat.occupancyBudget > 0 ? `${((stat.occupancyMTD / stat.occupancyBudget) * 100).toFixed(0)}%` : '—', good: stat.occupancyMTD >= stat.occupancyBudget },
              { label: 'Doluluk YTD',              value: fmtPct(stat.occupancyYTD),                                good: stat.occupancyYTD >= stat.lyOccupancyYTD },
            ].map((m) => (
              <div key={m.label} className="flex flex-col gap-0.5">
                <p className="text-xs text-muted-foreground">{m.label}</p>
                <p className={`text-base font-bold ${m.good ? 'text-green-600' : 'text-red-600'}`}>{m.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
