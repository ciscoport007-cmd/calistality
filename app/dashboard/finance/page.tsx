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
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TOTAL_LABELS = ['TOTAL SALES REVENUE', 'TOTAL SALES', 'TOTALS', 'TOPLAM'];
const ROOM_LABELS  = ['ALL.INC', 'HB ROOM'];
const FB_LABELS    = ['F&B FOOD', 'F&B BEV'];
const SPA_LABELS   = ['SPA'];
const OTHER_LABELS = ['MISC'];

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

const fmt0 = (n: number) => new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(n);
const fmtEUR = (n: number) => `${fmt0(n)} €`;
const fmtTL  = (n: number) => `${fmt0(n)} ₺`;
const fmtPct = (n: number, sign = false) => `${sign && n > 0 ? '+' : ''}${n.toFixed(1)}%`;
const shortDate = (d: string) => format(new Date(d), 'd MMM', { locale: tr });

const PIE_COLORS = ['#4f46e5', '#0891b2', '#16a34a', '#f59e0b'];

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
  const pct = Math.min(value / 100, 1);
  const offset = half * (1 - pct);
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

// ─── Alert helpers ────────────────────────────────────────────────────────────

interface Alert { type: 'error' | 'warn' | 'ok'; msg: string }

function computeAlerts(kapak: KapakData | null, trend: TrendPoint[]): Alert[] {
  const alerts: Alert[] = [];
  if (!kapak) return alerts;
  const stat = kapak.statistics;
  const rows = kapak.revenueData;

  if (stat) {
    if (stat.occupancyMTD < 75) alerts.push({ type: 'warn', msg: `MTD Doluluk %${fmtPct(stat.occupancyMTD)} — hedefin altında` });
    if (stat.adrMTD < stat.adrBudget * 0.95) alerts.push({ type: 'warn', msg: `ADR bütçenin altında (${fmtEUR(stat.adrMTD)} < ${fmtEUR(stat.adrBudget)})` });
  }

  const totalRow = findTotal(rows);
  if (totalRow) {
    const varPct = totalRow.mtdBudgetEUR > 0 ? ((totalRow.mtdActualEUR - totalRow.mtdBudgetEUR) / totalRow.mtdBudgetEUR) * 100 : 0;
    if (varPct >= 5) alerts.push({ type: 'ok', msg: `MTD gelir bütçeyi ${fmtPct(varPct, true)} aştı` });
    if (varPct <= -10) alerts.push({ type: 'error', msg: `MTD gelir bütçenin %${Math.abs(varPct).toFixed(1)} gerisinde` });
  }

  if (trend.length >= 2) {
    const last = trend[trend.length - 1];
    const prev = trend[trend.length - 2];
    if (prev.todayTL > 0) {
      const dayChg = ((last.todayTL - prev.todayTL) / prev.todayTL) * 100;
      if (dayChg <= -10) alerts.push({ type: 'warn', msg: `Bugünkü gelir dünden ${fmtPct(dayChg)} düştü` });
    }
  }

  return alerts;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function GenelBakis() {
  const [kapak, setKapak] = useState<KapakData | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [kRes, tRes] = await Promise.all([
        fetch('/api/finance/kapak?latest=true'),
        fetch('/api/finance/kapak/trend?days=30'),
      ]);
      const [kJson, tJson] = await Promise.all([kRes.json(), tRes.json()]);
      if (kJson.success) setKapak(kJson.data);
      if (tJson.success) setTrend(tJson.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const rows = kapak?.revenueData ?? [];
  const stat = kapak?.statistics ?? null;
  const totalRow = findTotal(rows);

  const todayTL  = totalRow?.todayTL  ?? 0;
  const todayEUR = totalRow?.todayEUR ?? 0;
  const mtdActual = totalRow?.mtdActualEUR ?? 0;
  const mtdBudget = totalRow?.mtdBudgetEUR ?? 0;
  const mtdPct    = mtdBudget > 0 ? (mtdActual / mtdBudget) * 100 : 0;
  const mtdVar    = mtdBudget > 0 ? ((mtdActual - mtdBudget) / mtdBudget) * 100 : 0;
  const ytdActual = totalRow?.ytdActualEUR ?? 0;
  const ytdBudget = totalRow?.ytdBudgetEUR ?? 0;
  const ytdVar    = ytdBudget > 0 ? ((ytdActual - ytdBudget) / ytdBudget) * 100 : 0;
  const lyMonth   = totalRow?.lyMonthEUR ?? 0;
  const yoyMTD    = lyMonth > 0 ? ((mtdActual - lyMonth) / lyMonth) * 100 : 0;

  // Trend chart data
  const trendChart = trend.map((d) => ({
    gun: shortDate(d.date),
    'Bu Yıl': d.totalEUR,
    'Geçen Yıl': d.lyMonthEUR,
    'Bütçe': d.totalBudgetEUR,
  }));

  // Pie chart — today's revenue mix
  const pieData = [
    { name: 'Oda',   value: sumField(rows, ROOM_LABELS,  'todayEUR'), color: PIE_COLORS[0] },
    { name: 'F&B',   value: sumField(rows, FB_LABELS,    'todayEUR'), color: PIE_COLORS[1] },
    { name: 'Spa',   value: sumField(rows, SPA_LABELS,   'todayEUR'), color: PIE_COLORS[2] },
    { name: 'Diğer', value: sumField(rows, OTHER_LABELS, 'todayEUR'), color: PIE_COLORS[3] },
  ].filter((d) => d.value > 0);

  // Occupancy trend
  const occChart = trend.map((d) => ({
    gun: shortDate(d.date),
    'Bu Yıl': d.occupancyMTD,
    'Geçen Yıl': d.lyOccupancyToday,
    'Bütçe': d.occupancyBudget,
  }));

  // Budget variance bar (by dept)
  const mkVar = (patterns: string[]) => {
    const a = sumField(rows, patterns, 'mtdActualEUR');
    const b = sumField(rows, patterns, 'mtdBudgetEUR');
    return b > 0 ? ((a - b) / b) * 100 : 0;
  };
  const deptBudgetChart = [
    { dept: 'Oda',   variance: mkVar(ROOM_LABELS) },
    { dept: 'F&B',   variance: mkVar(FB_LABELS) },
    { dept: 'Spa',   variance: mkVar(SPA_LABELS) },
    { dept: 'Diğer', variance: mkVar(OTHER_LABELS) },
  ].filter((d) => d.variance !== 0);

  const alerts = computeAlerts(kapak, trend);
  const latestDate = kapak ? format(new Date(kapak.reportDate), 'd MMMM yyyy', { locale: tr }) : '';
  const progressColor = mtdPct >= 100 ? '#16a34a' : mtdPct >= 90 ? '#d97706' : '#dc2626';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <RefreshCw className="h-5 w-5 animate-spin mr-2" /> Yükleniyor...
      </div>
    );
  }

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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Finans Genel Bakış</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Son veri: {latestDate}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1" />Yenile</Button>
          <Link href="/dashboard/finance/gelirler/yukle">
            <Button size="sm"><Upload className="h-4 w-4 mr-1" />Veri Yükle</Button>
          </Link>
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
          main={fmtTL(todayTL)}
          sub1={`EUR: ${fmtEUR(todayEUR)}`}
          sub2={trend.length >= 2 ? `Dün: ${fmtTL(trend[trend.length-2]?.todayTL ?? 0)}` : undefined}
          trend={trend.length >= 2 && (trend[trend.length-2]?.todayTL ?? 0) > 0
            ? ((todayTL - (trend[trend.length-2]?.todayTL ?? 0)) / (trend[trend.length-2]?.todayTL ?? 1)) * 100
            : undefined}
        />
        <KpiCard
          title="Ay Geliri (MTD)"
          main={fmtEUR(mtdActual)}
          sub1={`Bütçe: ${fmtEUR(mtdBudget)}`}
          sub2={`Sapma: ${fmtEUR(mtdActual - mtdBudget)}`}
          progress={mtdPct}
          progressColor={progressColor}
        />
        <KpiCard
          title="Yıl Geliri (YTD)"
          main={fmtEUR(ytdActual)}
          sub1={`Bütçe: ${fmtEUR(ytdBudget)}`}
          sub2={`Geçen Yıl MTD: ${fmtEUR(lyMonth)}`}
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
            <CardTitle className="text-sm font-semibold">Günlük MTD Gelir Trendi — Son 30 Gün (€)</CardTitle>
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
                  <Line type="monotone" dataKey="Bu Yıl" stroke="#4f46e5" strokeWidth={2.5} dot={false} activeDot={{ r: 3 }} />
                  <Line type="monotone" dataKey="Geçen Yıl" stroke="#9ca3af" strokeWidth={1.5} strokeDasharray="5 3" dot={false} />
                  <Line type="monotone" dataKey="Bütçe" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="3 3" dot={false} />
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
                    <Tooltip formatter={(v: number) => fmtEUR(v)} contentStyle={TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1 mt-1">
                  {pieData.map((d, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                        <span className="text-muted-foreground">{d.name}</span>
                      </div>
                      <span className="font-medium">{fmtEUR(d.value)}</span>
                    </div>
                  ))}
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
            <CardTitle className="text-sm font-semibold">Doluluk Trendi — Son 30 Gün (%)</CardTitle>
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
                  <Area type="monotone" dataKey="Bu Yıl" stroke="#7c3aed" fill="url(#occFill)" strokeWidth={2.5} dot={false} />
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
                    fill="#16a34a"
                    label={{ position: 'right', fontSize: 10, formatter: (v: number) => `${v.toFixed(1)}%` }}>
                    {deptBudgetChart.map((d, i) => (
                      <Cell key={i} fill={d.variance >= 0 ? '#16a34a' : '#dc2626'} />
                    ))}
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
              { label: 'Satılan Oda', value: fmt0(stat.soldRoomToday),   sub: `MTD: ${fmt0(stat.soldRoomMTD)}`,         up: true },
              { label: 'PAX Today',   value: fmt0(stat.paxToday),        sub: `Müsait: ${fmt0(stat.availRoomToday)}`,   up: true },
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
