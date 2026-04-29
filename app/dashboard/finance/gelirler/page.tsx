'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { RefreshCw, Upload, ChevronDown, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Cell,
} from 'recharts';
import { useFinanceFilters } from '@/hooks/use-finance-filters';
import { FinanceFilterBar } from '@/components/finance/filter-bar';
import { downloadCSV } from '@/lib/csv-export';

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

interface KapakData { reportDate: string; revenueData: RevenueRow[] }

interface TrendDay {
  date: string;
  roomsEUR: number; fbEUR: number; spaEUR: number; otherEUR: number;
  totalEUR: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TOTAL_PATTERNS = ['TOTAL SALES REVENUE', 'TOTAL SALES', 'TOTALS', 'TOPLAM'];
const DEPT_GROUPS: { key: string; label: string; patterns: string[]; color: string }[] = [
  { key: 'rooms', label: 'Oda Gelirleri',  patterns: ['ALL.INC', 'HB ROOM'],  color: '#4f46e5' },
  { key: 'fb',    label: 'F&B Gelirleri',  patterns: ['F&B FOOD', 'F&B BEV'], color: '#0891b2' },
  { key: 'spa',   label: 'Spa Gelirleri',  patterns: ['SPA'],                 color: '#16a34a' },
  { key: 'other', label: 'Diğer Gelirler', patterns: ['MISC'],                color: '#f59e0b' },
];
const STACKED_COLORS = ['#4f46e5', '#0891b2', '#16a34a', '#f59e0b'];
const DEPT_KEYS      = ['Oda', 'F&B', 'Spa', 'Diğer'] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function matchLabel(label: string, patterns: string[]) {
  const up = label.toUpperCase();
  return patterns.some((p) => up.includes(p));
}

function isGrandTotal(row: RevenueRow) {
  return row.isTotal && matchLabel(row.label, TOTAL_PATTERNS);
}

const fmt0   = (n: number) => new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(n);
const fmtEUR = (n: number) => n === 0 ? '—' : `${fmt0(n)} €`;
const fmtTL  = (n: number) => n === 0 ? '—' : `${fmt0(n)} ₺`;
const fmtPct = (n: number, sign = false) => n === 0 ? '—' : `${sign && n > 0 ? '+' : ''}${n.toFixed(1)}%`;
const varPct = (actual: number, budget: number) => budget > 0 ? ((actual - budget) / budget) * 100 : 0;
const yoyPct = (cur: number, ly: number)         => ly > 0     ? ((cur - ly) / ly) * 100          : 0;
const shortDate = (d: string) => format(new Date(d), 'd MMM', { locale: tr });

const TOOLTIP_STYLE = { fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' };

// ─── Variance badge ───────────────────────────────────────────────────────────

function VarBadge({ pct }: { pct: number }) {
  if (pct === 0) return <span className="text-muted-foreground text-xs">—</span>;
  const cls = pct >= 0 ? 'bg-green-100 text-green-700 hover:bg-green-100' : 'bg-red-100 text-red-700 hover:bg-red-100';
  return <Badge className={`text-[10px] px-1.5 py-0 ${cls}`}>{fmtPct(pct, true)}</Badge>;
}

// ─── Table row ────────────────────────────────────────────────────────────────

function TableRow({ row, indent = 0, expanded, onToggle, hasChildren, currency }: {
  row: RevenueRow; indent?: number; expanded?: boolean; onToggle?: () => void;
  hasChildren?: boolean; currency: 'eur' | 'tl' | 'both';
}) {
  const isTotal = row.isTotal;
  const mtdVar = varPct(row.mtdActualEUR, row.mtdBudgetEUR);
  const ytdVar = varPct(row.ytdActualEUR, row.ytdBudgetEUR);
  const yoy    = yoyPct(row.mtdActualEUR, row.lyMonthEUR);

  const fmtVal = (eur: number, tl: number) => {
    if (currency === 'tl')   return fmtTL(tl);
    if (currency === 'both') return `${fmtEUR(eur)} / ${fmtTL(tl)}`;
    return fmtEUR(eur);
  };

  return (
    <tr className={`border-b border-border/40 ${isTotal ? 'bg-muted/40 font-semibold' : 'hover:bg-muted/20'} text-sm`}>
      <td className="px-3 py-2 sticky left-0 bg-inherit min-w-[220px]">
        <div className="flex items-center gap-1" style={{ paddingLeft: `${indent * 16}px` }}>
          {hasChildren ? (
            <button onClick={onToggle} className="p-0.5 hover:bg-muted rounded">
              {expanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
            </button>
          ) : <span className="w-5" />}
          <span className={`text-xs ${isTotal ? 'font-bold' : ''}`}>{row.label}</span>
        </div>
      </td>
      <td className="px-3 py-2 text-right text-xs whitespace-nowrap">{fmtVal(row.todayEUR, row.todayTL)}</td>
      <td className="px-3 py-2 text-right text-xs whitespace-nowrap">{fmtVal(row.mtdActualEUR, row.mtdActualTL)}</td>
      <td className="px-3 py-2 text-right text-xs whitespace-nowrap">{fmtVal(row.mtdBudgetEUR, row.mtdBudgetTL)}</td>
      <td className="px-3 py-2 text-center text-xs"><VarBadge pct={mtdVar} /></td>
      <td className="px-3 py-2 text-right text-xs whitespace-nowrap">{fmtEUR(row.ytdActualEUR)}</td>
      <td className="px-3 py-2 text-right text-xs whitespace-nowrap">{fmtEUR(row.ytdBudgetEUR)}</td>
      <td className="px-3 py-2 text-center text-xs"><VarBadge pct={ytdVar} /></td>
      <td className="px-3 py-2 text-right text-xs whitespace-nowrap">{fmtEUR(row.lyMonthEUR)}</td>
      <td className="px-3 py-2 text-center text-xs"><VarBadge pct={yoy} /></td>
    </tr>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-14 rounded-xl" />
      <Skeleton className="h-72 rounded-xl" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-56 rounded-xl" />
        <Skeleton className="h-56 rounded-xl" />
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function GelirlerPage() {
  const { filters, update, days } = useFinanceFilters();
  const [kapak, setKapak]   = useState<KapakData | null>(null);
  const [trend, setTrend]   = useState<TrendDay[]>([]);
  const [loading, setLoading]  = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

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

  const toggleExpand = (key: string) => setExpanded((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  const rows      = kapak?.revenueData ?? [];
  const grandTotal = rows.find((r) => isGrandTotal(r));
  const subRows    = rows.filter((r) => !r.isTotal);
  const totalRows  = rows.filter((r) => r.isTotal && !isGrandTotal(r));

  const deptRows = DEPT_GROUPS.map((g) => ({
    ...g,
    rows: subRows.filter((r) => matchLabel(r.label, g.patterns)),
    subrows: [] as RevenueRow[],
  }));

  // Stacked area — MTD by dept
  const stackedData = trend.map((d) => ({
    gun: shortDate(d.date),
    Oda: d.roomsEUR, 'F&B': d.fbEUR, Spa: d.spaEUR, Diğer: d.otherEUR,
  }));

  // 100% Stacked Bar — Revenue Mix per day
  const mixData = trend.map((d) => {
    const total = d.roomsEUR + d.fbEUR + d.spaEUR + d.otherEUR;
    return {
      gun: shortDate(d.date),
      Oda:   total > 0 ? +((d.roomsEUR / total) * 100).toFixed(1) : 0,
      'F&B': total > 0 ? +((d.fbEUR   / total) * 100).toFixed(1) : 0,
      Spa:   total > 0 ? +((d.spaEUR  / total) * 100).toFixed(1) : 0,
      Diğer: total > 0 ? +((d.otherEUR/ total) * 100).toFixed(1) : 0,
    };
  });

  // Budget variance waterfall data
  const waterfallData = deptRows.map((g) => {
    const actual = g.rows.reduce((s, r) => s + r.mtdActualEUR, 0);
    const budget = g.rows.reduce((s, r) => s + r.mtdBudgetEUR, 0);
    return { dept: g.label.split(' ')[0], variance: actual - budget, vp: varPct(actual, budget), hasBudget: budget > 0 };
  }).filter((d) => d.hasBudget);

  const latestDate = kapak ? format(new Date(kapak.reportDate), 'd MMMM yyyy', { locale: tr }) : '';

  // CSV export
  const handleExport = () => {
    if (!rows.length) return;
    const headers = ['Gelir Kalemi', 'Günlük (€)', 'MTD Actual (€)', 'MTD Budget (€)', 'MTD Var%', 'YTD Actual (€)', 'YTD Budget (€)', 'YTD Var%', 'LY MTD (€)', 'YoY%'];
    const csvRows = rows.map((r) => [
      r.label,
      r.todayEUR, r.mtdActualEUR, r.mtdBudgetEUR,
      `${varPct(r.mtdActualEUR, r.mtdBudgetEUR).toFixed(1)}%`,
      r.ytdActualEUR, r.ytdBudgetEUR,
      `${varPct(r.ytdActualEUR, r.ytdBudgetEUR).toFixed(1)}%`,
      r.lyMonthEUR,
      `${yoyPct(r.mtdActualEUR, r.lyMonthEUR).toFixed(1)}%`,
    ]);
    downloadCSV(`gelirler-${latestDate || 'export'}.csv`, headers, csvRows);
  };

  if (loading) return <PageSkeleton />;

  if (!kapak) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">Henüz veri yüklenmemiş</p>
        <Link href="/dashboard/finance/gelirler/yukle"><Button><Upload className="h-4 w-4 mr-2" />Veri Yükle</Button></Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Gelirler</h1>
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
            onExport={handleExport}
          />
        </div>
      </div>

      {/* Revenue Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Hiyerarşik Gelir Tablosu — MTD / YTD / LY Karşılaştırma</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="border-b border-border">
                <tr className="bg-muted/50">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground sticky left-0 bg-muted/50 min-w-[220px]">Gelir Kalemi</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground whitespace-nowrap">Günlük</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground whitespace-nowrap">MTD Actual</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground whitespace-nowrap">MTD Budget</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground">MTD Var%</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground whitespace-nowrap">YTD Actual (€)</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground whitespace-nowrap">YTD Budget (€)</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground">YTD Var%</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground whitespace-nowrap">LY MTD (€)</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground">YoY%</th>
                </tr>
              </thead>
              <tbody>
                {grandTotal && <TableRow row={grandTotal} indent={0} currency={filters.currency} />}
                {deptRows.map((g) => (
                  <>
                    {g.rows.map((row, ri) => (
                      <TableRow
                        key={`${g.key}-${ri}`}
                        row={row}
                        indent={1}
                        hasChildren={g.subrows.length > 0}
                        expanded={expanded.has(g.key)}
                        onToggle={() => toggleExpand(g.key)}
                        currency={filters.currency}
                      />
                    ))}
                    {expanded.has(g.key) && g.subrows.map((row, ri) => (
                      <TableRow key={`${g.key}-sub-${ri}`} row={row} indent={2} currency={filters.currency} />
                    ))}
                  </>
                ))}
                {totalRows
                  .filter((r) => !DEPT_GROUPS.some((g) => matchLabel(r.label, g.patterns)))
                  .map((row, i) => <TableRow key={`other-${i}`} row={row} indent={1} currency={filters.currency} />)
                }
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Stacked area — dept revenue over time */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Departman Gelir Trendi — MTD (€)</CardTitle>
          </CardHeader>
          <CardContent>
            {stackedData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">Veri yok</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={stackedData} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                  <defs>
                    {DEPT_GROUPS.map((g, i) => (
                      <linearGradient key={g.key} id={`fill-${g.key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={STACKED_COLORS[i]} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={STACKED_COLORS[i]} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="gun" tick={{ fontSize: 9, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: '#6b7280' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${(v/1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v: number) => fmtEUR(v)} contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  {DEPT_GROUPS.map((g, i) => (
                    <Area key={g.key} type="monotone" dataKey={DEPT_KEYS[i]}
                      stroke={STACKED_COLORS[i]} fill={`url(#fill-${g.key})`} strokeWidth={2} dot={false} stackId="1" />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Budget variance by dept */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Bütçe Sapması — Departman Bazlı MTD (€)</CardTitle>
          </CardHeader>
          <CardContent>
            {waterfallData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">Veri yok</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={waterfallData} margin={{ left: 0, right: 40, top: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="dept" tick={{ fontSize: 10, fill: '#374151' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: '#6b7280' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${(v/1000).toFixed(0)}K€`} />
                  <Tooltip formatter={(v: number) => [fmtEUR(v as number), 'Sapma (Actual-Budget)']} contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="variance" radius={[3, 3, 0, 0]}
                    label={{ position: 'top', fontSize: 10, formatter: (v: number) => `${v >= 0 ? '+' : ''}${(v/1000).toFixed(0)}K` }}>
                    {waterfallData.map((d, i) => <Cell key={i} fill={d.variance >= 0 ? '#16a34a' : '#dc2626'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Revenue Mix Evrimi — 100% stacked bar */}
      {mixData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Gelir Mix Evrimi — Departman Payı (%) — Son {days} Gün</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={mixData} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="gun" tick={{ fontSize: 9, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#6b7280' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v}%`} />
                <Tooltip formatter={(v: number) => [`${v.toFixed(1)}%`]} contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                {DEPT_KEYS.map((key, i) => (
                  <Bar key={key} dataKey={key} stackId="mix" fill={STACKED_COLORS[i]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* YoY comparison */}
      {grandTotal && grandTotal.lyMonthEUR > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">MTD Gelir Karşılaştırması — Bu Yıl vs Geçen Yıl</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {deptRows.map((g) => {
                const cur = g.rows.reduce((s, r) => s + r.mtdActualEUR, 0);
                const ly  = g.rows.reduce((s, r) => s + r.lyMonthEUR, 0);
                const pct = yoyPct(cur, ly);
                const up  = pct >= 0;
                return (
                  <div key={g.key} className="flex flex-col gap-1">
                    <p className="text-xs font-semibold text-muted-foreground">{g.label.split(' ')[0]}</p>
                    <p className="text-lg font-bold">{fmtEUR(cur)}</p>
                    <p className="text-xs text-muted-foreground">LY: {fmtEUR(ly)}</p>
                    {ly > 0 && (
                      <div className={`flex items-center gap-1 text-xs font-medium ${up ? 'text-green-600' : 'text-red-600'}`}>
                        {up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                        {fmtPct(pct, true)} YoY
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
