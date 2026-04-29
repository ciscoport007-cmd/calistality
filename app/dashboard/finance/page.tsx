'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import Link from 'next/link';
import {
  TrendingUp, TrendingDown, RefreshCw, Upload, AlertTriangle, CheckCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';
import { useFinanceFilters } from '@/hooks/use-finance-filters';
import { FinanceFilterBar } from '@/components/finance/filter-bar';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RevenueRow {
  label: string; isTotal: boolean;
  todayTL: number; todayEUR: number;
  mtdActualTL: number; mtdActualEUR: number;
  mtdBudgetTL: number; mtdBudgetEUR: number;
  ytdActualEUR: number; ytdBudgetEUR: number;
  lyTodayEUR: number; lyMonthEUR: number; lyYearEUR: number;
}

interface Statistics {
  occupancyToday: number; occupancyMTD: number; occupancyBudget: number; occupancyYTD: number;
  lyOccupancyToday: number; lyOccupancyMTD: number;
  adrToday: number; adrMTD: number; adrBudget: number;
  soldRoomToday: number; soldRoomMTD: number;
  availRoomToday: number;
  paxToday: number;
}

interface KapakData {
  reportDate: string;
  revenueData: RevenueRow[];
  statistics: Statistics | null;
}

interface TrendPoint {
  date: string;
  todayTL: number; todayEUR: number;
  totalEUR: number; totalTL: number; totalBudgetEUR: number; lyMonthEUR: number;
  roomsEUR: number; fbEUR: number; spaEUR: number; otherEUR: number;
  occupancyToday: number; occupancyMTD: number; occupancyBudget: number; lyOccupancyToday: number;
  adrToday: number; soldRoomToday: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TOTAL_LABELS = ['TOTAL SALES REVENUE', 'TOTAL SALES', 'TOTALS', 'TOPLAM'];
const ROOM_LABELS  = ['ALL.INC', 'HB ROOM'];
const FB_LABELS    = ['F&B FOOD', 'F&B BEV'];
const SPA_LABELS   = ['SPA'];
const OTHER_LABELS = ['MISC'];
const PIE_COLORS   = ['#4f46e5', '#0891b2', '#16a34a', '#f59e0b'];

const DEPT_ALERT_DEFS = [
  { label: 'Oda',  patterns: ROOM_LABELS  },
  { label: 'F&B',  patterns: FB_LABELS    },
  { label: 'Spa',  patterns: SPA_LABELS   },
  { label: 'Diğer', patterns: OTHER_LABELS },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function matchLabel(label: string, patterns: string[]) {
  const up = label.toUpperCase();
  return patterns.some((p) => up.includes(p));
}

function findTotal(rows: RevenueRow[]) {
  return rows.find((r) => r.isTotal && matchLabel(r.label, TOTAL_LABELS));
}

function sumField(rows: RevenueRow[], patterns: string[], field: keyof RevenueRow): number {
  return rows
    .filter((r) => matchLabel(r.label, patterns))
    .reduce((acc, r) => acc + ((r[field] as number) ?? 0), 0);
}

const fmt0   = (n: number) => new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(n);
const fmtEUR = (n: number) => `${fmt0(n)} €`;
const fmtTL  = (n: number) => `${fmt0(n)} ₺`;
const fmtPct = (n: number, sign = false) => `${sign && n > 0 ? '+' : ''}${n.toFixed(1)}%`;
const shortDate = (d: string) => format(new Date(d), 'd MMM', { locale: tr });

const TOOLTIP_STYLE = { fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' };

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ title, main, sub1, sub2, progress, progressColor, trend, trendLabel }: {
  title: string; main: string; sub1?: string; sub2?: string;
  progress?: number; progressColor?: string;
  trend?: number; trendLabel?: string;
}) {
  const up = (trend ?? 0) >= 0;
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{title}</p>
        <p className="text-2xl font-bold mt-1 leading-tight">{main}</p>
        {sub1 && <p className="text-xs text-muted-foreground mt-0.5">{sub1}</p>}
        {sub2 && <p className="text-xs text-muted-foreground mt-0.5">{sub2}</p>}
        {progress !== undefined && (
          <div className="mt-2">
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(progress, 100)}%`, backgroundColor: progressColor ?? '#4f46e5' }} />
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">{fmtPct(progress)} gerçekleşme</p>
          </div>
        )}
        {trend !== undefined && (
          <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${up ? 'text-green-600' : 'text-red-600'}`}>
            {up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {trendLabel ?? fmtPct(trend, true)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Occupancy Gauge ──────────────────────────────────────────────────────────

function OccGauge({ value, budget }: { value: number; budget: number }) {
  const r = 48; const cx = 60; const cy = 58;
  const half = Math.PI * r;
  const offset = half * (1 - Math.min(value / 100, 1));
  const color = value >= budget ? '#16a34a' : value >= budget * 0.9 ? '#d97706' : '#dc2626';
  return (
    <div className="flex flex-col items-center">
      <svg width="120" height="66" viewBox="0 0 120 66">
        <path d={`M ${cx-r} ${cy} A ${r} ${r} 0 0 1 ${cx+r} ${cy}`} fill="none" stroke="#e5e7eb" strokeWidth="12" strokeLinecap="round" />
        <path d={`M ${cx-r} ${cy} A ${r} ${r} 0 0 1 ${cx+r} ${cy}`} fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
          strokeDasharray={half} strokeDashoffset={offset} />
      </svg>
      <div className="-mt-2 text-center">
        <p className="text-xl font-bold" style={{ color }}>{fmtPct(value)}</p>
        <p className="text-[10px] text-muted-foreground">Bütçe: {fmtPct(budget)}</p>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Skeleton className="lg:col-span-2 h-56 rounded-xl" />
        <Skeleton className="h-56 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-52 rounded-xl" />
        <Skeleton className="h-52 rounded-xl" />
      </div>
    </div>
  );
}

// ─── Alert helpers ────────────────────────────────────────────────────────────

interface Alert { type: 'error' | 'warn' | 'ok'; msg: string }

function computeAlerts(kapak: KapakData | null, trend: TrendPoint[]): Alert[] {
  const alerts: Alert[] = [];
  if (!kapak) return alerts;
  const stat = kapak.statistics;
  const rows = kapak.revenueData;

  if (stat) {
    if (stat.adrMTD < stat.adrBudget * 0.95)
      alerts.push({ type: 'warn', msg: `ADR bütçenin altında (${fmtEUR(stat.adrMTD)} < ${fmtEUR(stat.adrBudget)})` });
  }

  // Dept-level budget alerts
  DEPT_ALERT_DEFS.forEach(({ label, patterns }) => {
    const actual = sumField(rows, patterns, 'mtdActualEUR');
    const budget = sumField(rows, patterns, 'mtdBudgetEUR');
    if (budget > 0) {
      const vp = ((actual - budget) / budget) * 100;
      if (vp <= -5)  alerts.push({ type: 'error', msg: `${label} MTD bütçenin %${Math.abs(vp).toFixed(1)} gerisinde` });
      if (vp >= 5)   alerts.push({ type: 'ok',    msg: `${label} MTD bütçeyi ${fmtPct(vp, true)} aştı` });
    }
  });

  // Grand total
  const totalRow = findTotal(rows);
  if (totalRow && totalRow.mtdBudgetEUR > 0) {
    const varPct = ((totalRow.mtdActualEUR - totalRow.mtdBudgetEUR) / totalRow.mtdBudgetEUR) * 100;
    if (varPct <= -10)
      alerts.push({ type: 'error', msg: `TOPLAM MTD gelir bütçenin %${Math.abs(varPct).toFixed(1)} gerisinde` });
  }

  // Day-over-day drop
  if (trend.length >= 2) {
    const last = trend[trend.length - 1];
    const prev = trend[trend.length - 2];
    if (prev.todayEUR > 0) {
      const dayChg = ((last.todayEUR - prev.todayEUR) / prev.todayEUR) * 100;
      if (dayChg <= -10)
        alerts.push({ type: 'warn', msg: `Bugünkü gelir dünden ${fmtPct(dayChg)} düştü` });
    }
  }

  // 3-day occupancy check
  const last3 = trend.slice(-3);
  if (last3.length === 3 && last3.every((d) => d.occupancyToday > 0 && d.occupancyToday < 75))
    alerts.push({ type: 'warn', msg: 'Son 3 gündür doluluk %75\'in altında' });

  return alerts;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function GenelBakis() {
  const { filters, update, days } = useFinanceFilters();
  const [kapak, setKapak]  = useState<KapakData | null>(null);
  const [trend, setTrend]  = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);

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

  // Currency-aware value formatter
  const fmt = useCallback((eur: number, tl?: number) => {
    if (filters.currency === 'tl' && tl != null) return fmtTL(tl);
    if (filters.currency === 'both' && tl != null) return `${fmtEUR(eur)} / ${fmtTL(tl)}`;
    return fmtEUR(eur);
  }, [filters.currency]);

  const rows = kapak?.revenueData ?? [];
  const stat = kapak?.statistics ?? null;
  const totalRow = findTotal(rows);

  const todayTL   = totalRow?.todayTL  ?? 0;
  const todayEUR  = totalRow?.todayEUR ?? 0;
  const mtdActual = totalRow?.mtdActualEUR ?? 0;
  const mtdBudget = totalRow?.mtdBudgetEUR ?? 0;
  const mtdPct    = mtdBudget > 0 ? (mtdActual / mtdBudget) * 100 : 0;
  const ytdActual = totalRow?.ytdActualEUR ?? 0;
  const ytdBudget = totalRow?.ytdBudgetEUR ?? 0;
  const ytdVar    = ytdBudget > 0 ? ((ytdActual - ytdBudget) / ytdBudget) * 100 : 0;
  const lyMonth   = totalRow?.lyMonthEUR ?? 0;
  const yoyMTD    = lyMonth > 0 ? ((mtdActual - lyMonth) / lyMonth) * 100 : 0;
  const mtdVar    = mtdBudget > 0 ? ((mtdActual - mtdBudget) / mtdBudget) * 100 : 0;

  const trendChart = trend.map((d) => ({
    gun: shortDate(d.date),
    'Bu Yıl': d.totalEUR,
    'Geçen Yıl': d.lyMonthEUR,
    'Bütçe': d.totalBudgetEUR,
  }));

  const pieData = [
    { name: 'Oda',   value: sumField(rows, ROOM_LABELS,  'todayEUR'), color: PIE_COLORS[0] },
    { name: 'F&B',   value: sumField(rows, FB_LABELS,    'todayEUR'), color: PIE_COLORS[1] },
    { name: 'Spa',   value: sumField(rows, SPA_LABELS,   'todayEUR'), color: PIE_COLORS[2] },
    { name: 'Diğer', value: sumField(rows, OTHER_LABELS, 'todayEUR'), color: PIE_COLORS[3] },
  ].filter((d) => d.value > 0);

  const occChart = trend.map((d) => ({
    gun: shortDate(d.date),
    'Bu Yıl': d.occupancyMTD,
    'Geçen Yıl': d.lyOccupancyToday,
    'Bütçe': d.occupancyBudget,
  }));

  const mkVar = (patterns: string[]) => {
    const a = sumField(rows, patterns, 'mtdActualEUR');
    const b = sumField(rows, patterns, 'mtdBudgetEUR');
    return b > 0 ? ((a - b) / b) * 100 : 0;
  };
  const deptBudgetChart = [
    { dept: 'Oda',   variance: mkVar(ROOM_LABELS)  },
    { dept: 'F&B',   variance: mkVar(FB_LABELS)    },
    { dept: 'Spa',   variance: mkVar(SPA_LABELS)   },
    { dept: 'Diğer', variance: mkVar(OTHER_LABELS) },
  ].filter((d) => d.variance !== 0);

  const alerts       = computeAlerts(kapak, trend);
  const latestDate   = kapak ? format(new Date(kapak.reportDate), 'd MMMM yyyy', { locale: tr }) : '';
  const progressColor = mtdPct >= 100 ? '#16a34a' : mtdPct >= 90 ? '#d97706' : '#dc2626';

  const prevEUR = trend.length >= 2 ? (trend[trend.length - 2]?.todayEUR ?? 0) : 0;
  const dayTrend = prevEUR > 0 ? ((todayEUR - prevEUR) / prevEUR) * 100 : undefined;

  if (loading) return <PageSkeleton />;

  if (!kapak) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">Henüz veri yüklenmemiş</p>
        <Link href="/dashboard/finance/gelirler/yukle">
          <Button><Upload className="h-4 w-4 mr-2" />Veri Yükle</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Finans Genel Bakış</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Son veri: {latestDate}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1" />Yenile</Button>
            <Link href="/dashboard/finance/gelirler/yukle">
              <Button size="sm"><Upload className="h-4 w-4 mr-1" />Veri Yükle</Button>
            </Link>
          </div>
          <FinanceFilterBar
            dateRange={filters.dateRange}
            currency={filters.currency}
            onDateChange={(r) => update({ dateRange: r })}
            onCurrencyChange={(c) => update({ currency: c })}
          />
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-1.5">
          {alerts.map((a, i) => (
            <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${
              a.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
              a.type === 'warn'  ? 'bg-amber-50 border-amber-200 text-amber-800' :
                                   'bg-green-50 border-green-200 text-green-800'
            }`}>
              {a.type === 'ok' ? <CheckCircle className="h-4 w-4 flex-shrink-0" /> : <AlertTriangle className="h-4 w-4 flex-shrink-0" />}
              {a.msg}
            </div>
          ))}
        </div>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Bugünkü Gelir (Today)"
          main={fmt(todayEUR, todayTL)}
          sub1={filters.currency === 'eur' ? `₺: ${fmtTL(todayTL)}` : `€: ${fmtEUR(todayEUR)}`}
          sub2={prevEUR > 0 ? `Dün: ${fmt(prevEUR)}` : undefined}
          trend={dayTrend}
        />
        <KpiCard
          title="Ay Geliri (MTD)"
          main={fmt(mtdActual, totalRow?.mtdActualTL)}
          sub1={`Bütçe: ${fmtEUR(mtdBudget)}`}
          sub2={`Sapma: ${fmtEUR(mtdActual - mtdBudget)}`}
          progress={mtdPct}
          progressColor={progressColor}
        />
        <KpiCard
          title="Yıl Geliri (YTD)"
          main={fmt(ytdActual, totalRow?.ytdActualEUR)}
          sub1={`Bütçe: ${fmtEUR(ytdBudget)}`}
          sub2={lyMonth > 0 ? `Geçen Yıl MTD: ${fmtEUR(lyMonth)}` : undefined}
          trend={ytdVar}
          trendLabel={`YTD Bütçe: ${fmtPct(ytdVar, true)}`}
        />
        <div className="rounded-xl border bg-card p-4">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Bugünkü Doluluk</p>
          {stat ? (
            <>
              <OccGauge value={stat.occupancyToday} budget={stat.occupancyBudget} />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>MTD: {fmtPct(stat.occupancyMTD)}</span>
                <span>YTD: {fmtPct(stat.occupancyYTD ?? 0)}</span>
              </div>
            </>
          ) : <p className="text-sm text-muted-foreground py-4 text-center">Veri yok</p>}
        </div>
      </div>

      {/* Charts row 1: Revenue Trend + Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">MTD Gelir Trendi (€) — Son {days} Gün</CardTitle>
          </CardHeader>
          <CardContent>
            {trendChart.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">Veri yok</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trendChart} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="gun" tick={{ fontSize: 9, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: '#6b7280' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${(v/1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v: number) => fmtEUR(v)} contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="Bu Yıl"    stroke="#4f46e5" strokeWidth={2.5} dot={false} activeDot={{ r: 3 }} />
                  <Line type="monotone" dataKey="Geçen Yıl" stroke="#9ca3af" strokeWidth={1.5} strokeDasharray="5 3" dot={false} />
                  <Line type="monotone" dataKey="Bütçe"     stroke="#ef4444" strokeWidth={1.5} strokeDasharray="3 3" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Gelir Dağılımı — Bugün</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">Veri yok</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                      {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => [fmtEUR(v), '']} contentStyle={TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1 mt-1">
                  {pieData.map((d, i) => {
                    const total = pieData.reduce((s, x) => s + x.value, 0);
                    return (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                          <span className="text-muted-foreground">{d.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{fmtEUR(d.value)}</span>
                          <span className="text-muted-foreground text-[10px]">{total > 0 ? `${((d.value/total)*100).toFixed(0)}%` : ''}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2: Occupancy trend + Budget variance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Doluluk Trendi — Son {days} Gün (%)</CardTitle>
          </CardHeader>
          <CardContent>
            {occChart.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">Veri yok</div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={occChart} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="occFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="gun" tick={{ fontSize: 9, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#6b7280' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v}%`} />
                  <Tooltip formatter={(v: number) => [`${v.toFixed(1)}%`]} contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="Bu Yıl"    stroke="#7c3aed" fill="url(#occFill)" strokeWidth={2.5} dot={false} />
                  <Area type="monotone" dataKey="Geçen Yıl" stroke="#9ca3af" fill="none" strokeWidth={1.5} strokeDasharray="5 3" dot={false} />
                  <ReferenceLine y={stat?.occupancyBudget ?? 80} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Bütçe', fontSize: 10, fill: '#ef4444' }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Departman Bütçe Sapması — MTD (%)</CardTitle>
          </CardHeader>
          <CardContent>
            {deptBudgetChart.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">Veri yok</div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={deptBudgetChart} layout="vertical" margin={{ left: 8, right: 32, top: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 9, fill: '#6b7280' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v.toFixed(0)}%`} />
                  <YAxis type="category" dataKey="dept" tick={{ fontSize: 11, fill: '#374151' }} tickLine={false} axisLine={false} width={36} />
                  <Tooltip formatter={(v: number) => [`${v.toFixed(1)}%`, 'Sapma']} contentStyle={TOOLTIP_STYLE} />
                  <ReferenceLine x={0} stroke="#9ca3af" />
                  <Bar dataKey="variance" radius={[0, 3, 3, 0]}
                    label={{ position: 'right', fontSize: 10, formatter: (v: number) => `${v.toFixed(1)}%` }}>
                    {deptBudgetChart.map((d, i) => <Cell key={i} fill={d.variance >= 0 ? '#16a34a' : '#dc2626'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Hotel metrics summary */}
      {stat && (
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Otel Metrikleri — Son Rapor</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Doluluk MTD', value: fmtPct(stat.occupancyMTD), sub: `Bütçe: ${fmtPct(stat.occupancyBudget)}`, up: stat.occupancyMTD >= stat.occupancyBudget },
              { label: 'ADR Today',   value: fmtEUR(stat.adrToday),      sub: `MTD: ${fmtEUR(stat.adrMTD)}`,            up: stat.adrMTD >= stat.adrBudget },
              { label: 'Satılan Oda', value: `${fmt0(stat.soldRoomToday)}`,   sub: `MTD: ${fmt0(stat.soldRoomMTD)}`,  up: true },
              { label: 'PAX Today',   value: `${fmt0(stat.paxToday)}`,        sub: `Müsait: ${fmt0(stat.availRoomToday)}`, up: true },
            ].map((m) => (
              <Card key={m.label}>
                <CardContent className="py-3 px-4">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{m.label}</p>
                  <p className="text-lg font-bold mt-0.5">{m.value}</p>
                  <div className={`flex items-center gap-1 text-xs mt-1 ${m.up ? 'text-green-600' : 'text-amber-600'}`}>
                    {m.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {m.sub}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* YoY summary */}
      {lyMonth > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">MTD Gelir — Bu Yıl vs Geçen Yıl</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6 flex-wrap">
              <div>
                <p className="text-xs text-muted-foreground">Bu Yıl MTD</p>
                <p className="text-xl font-bold">{fmtEUR(mtdActual)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Geçen Yıl MTD</p>
                <p className="text-xl font-bold text-muted-foreground">{fmtEUR(lyMonth)}</p>
              </div>
              <div className={`flex items-center gap-1 text-lg font-semibold ${yoyMTD >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {yoyMTD >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                {fmtPct(yoyMTD, true)} YoY
              </div>
              <Badge className={mtdVar >= 0 ? 'bg-green-100 text-green-700 hover:bg-green-100' : 'bg-red-100 text-red-700 hover:bg-red-100'}>
                Bütçe sapması: {fmtPct(mtdVar, true)}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
