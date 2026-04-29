'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { RefreshCw, TrendingUp, TrendingDown, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine,
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
  ytdActualEUR: number; ytdBudgetEUR: number;
  lyTodayEUR: number; lyMonthEUR: number; lyYearEUR: number;
}

interface TrendPoint {
  date: string;
  roomsEUR: number; fbEUR: number; spaEUR: number; otherEUR: number; totalEUR: number;
}

interface KapakData { reportDate: string; revenueData: RevenueRow[] }

interface DeptSummary {
  key: string; label: string; emoji: string; patterns: string[]; color: string;
  actual: number; budget: number; today: number; ytd: number; ytdBudg: number; ly: number;
  vPct: number; totalRows: RevenueRow[];
}

// ─── Department config ────────────────────────────────────────────────────────

const DEPTS = [
  { key: 'all',   label: 'Tümü',  emoji: '',   patterns: [] as string[], color: '#4f46e5' },
  { key: 'rooms', label: 'Rooms', emoji: '🏨', patterns: ['ALL.INC', 'HB ROOM'],  color: '#4f46e5' },
  { key: 'fb',    label: 'F&B',   emoji: '🍽️', patterns: ['F&B FOOD', 'F&B BEV'], color: '#0891b2' },
  { key: 'spa',   label: 'Spa',   emoji: '💆', patterns: ['SPA'],                 color: '#16a34a' },
  { key: 'other', label: 'Diğer', emoji: '🔧', patterns: ['MISC'],                color: '#f59e0b' },
];

const TOTAL_PATTERNS = ['TOTAL SALES REVENUE', 'TOTAL SALES', 'TOTALS', 'TOPLAM'];
const PIE_COLORS     = ['#4f46e5', '#0891b2', '#16a34a', '#f59e0b', '#db2777'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function matchLabel(label: string, patterns: string[]) {
  const up = label.toUpperCase();
  return patterns.some((p) => up.includes(p));
}

const fmt0   = (n: number) => new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(n);
const fmtEUR = (n: number) => n === 0 ? '—' : `${fmt0(n)} €`;
const fmtTL  = (n: number) => n === 0 ? '—' : `${fmt0(n)} ₺`;
const fmtPct = (n: number, sign = false) => n === 0 ? '—' : `${sign && n > 0 ? '+' : ''}${n.toFixed(1)}%`;
const varPct = (a: number, b: number) => b > 0 ? ((a - b) / b) * 100 : 0;
const shortDate = (d: string) => format(new Date(d), 'd MMM', { locale: tr });

const TOOLTIP_STYLE = { fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' };

function TargetBadge({ pct }: { pct: number }) {
  if (pct >= 5)  return <div className="flex items-center gap-1 text-green-600 text-xs"><CheckCircle  className="h-4 w-4" />Hedef aşıldı</div>;
  if (pct >= -5) return <div className="flex items-center gap-1 text-amber-600 text-xs"><AlertTriangle className="h-4 w-4" />Hedefe yakın</div>;
  return               <div className="flex items-center gap-1 text-red-600 text-xs"><XCircle       className="h-4 w-4" />Hedefin altında</div>;
}

// ─── Detail Sheet ─────────────────────────────────────────────────────────────

function DeptDetailSheet({ dept, subRows, trend, open, onClose, currency }: {
  dept: DeptSummary; subRows: RevenueRow[]; trend: TrendPoint[];
  open: boolean; onClose: () => void; currency: 'eur' | 'tl' | 'both';
}) {
  const deptSubRows = subRows.filter((r) => matchLabel(r.label, dept.patterns));
  const trendKey = dept.key === 'rooms' ? 'roomsEUR' : dept.key === 'fb' ? 'fbEUR' : dept.key === 'spa' ? 'spaEUR' : 'otherEUR';
  const getTrendVal = (d: TrendPoint) => trendKey === 'roomsEUR' ? d.roomsEUR : trendKey === 'fbEUR' ? d.fbEUR : trendKey === 'spaEUR' ? d.spaEUR : d.otherEUR;
  const chartData = trend.map((d) => ({ gun: shortDate(d.date), Gelir: getTrendVal(d) }));

  const fmtVal = (eur: number, tl: number) => {
    if (currency === 'tl')   return fmtTL(tl);
    if (currency === 'both') return `${fmtEUR(eur)} / ${fmtTL(tl)}`;
    return fmtEUR(eur);
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-[520px] sm:max-w-[520px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-lg">
            <span>{dept.emoji}</span>
            <span>{dept.label} Departmanı Detayları</span>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Bugün', value: fmtEUR(dept.today) },
              { label: 'MTD Actual', value: fmtEUR(dept.actual) },
              { label: 'MTD Budget', value: fmtEUR(dept.budget) },
            ].map((m) => (
              <div key={m.label} className="rounded-lg border p-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase">{m.label}</p>
                <p className="text-base font-bold mt-0.5">{m.value}</p>
              </div>
            ))}
          </div>

          {/* YTD + LY + Variance */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border p-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase">YTD</p>
              <p className="text-base font-bold mt-0.5">{fmtEUR(dept.ytd)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase">LY MTD</p>
              <p className="text-base font-bold mt-0.5 text-muted-foreground">{dept.ly > 0 ? fmtEUR(dept.ly) : '—'}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase">MTD Sapma</p>
              <p className={`text-base font-bold mt-0.5 ${dept.vPct >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmtPct(dept.vPct, true)}</p>
            </div>
          </div>

          {/* Mini trend chart */}
          {chartData.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">MTD Trend (€)</p>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={chartData} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="gun" tick={{ fontSize: 8, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 8, fill: '#6b7280' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${(v/1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v: number) => fmtEUR(v)} contentStyle={TOOLTIP_STYLE} />
                  <Line type="monotone" dataKey="Gelir" stroke={dept.color} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Sub rows */}
          {deptSubRows.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Alt Kategoriler</p>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Kalem</th>
                      <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Bugün</th>
                      <th className="px-3 py-2 text-right font-semibold text-muted-foreground">MTD</th>
                      <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Sapma%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deptSubRows.map((r, i) => (
                      <tr key={i} className="border-t border-border/40 hover:bg-muted/10">
                        <td className="px-3 py-1.5 font-medium">{r.label}</td>
                        <td className="px-3 py-1.5 text-right">{fmtVal(r.todayEUR, r.todayTL)}</td>
                        <td className="px-3 py-1.5 text-right">{fmtVal(r.mtdActualEUR, r.mtdActualTL)}</td>
                        <td className="px-3 py-1.5 text-right">
                          {r.mtdBudgetEUR > 0 ? (
                            <span className={varPct(r.mtdActualEUR, r.mtdBudgetEUR) >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {fmtPct(varPct(r.mtdActualEUR, r.mtdBudgetEUR), true)}
                            </span>
                          ) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-14 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-52 rounded-xl" />
        <Skeleton className="h-52 rounded-xl" />
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function DepartmanPage() {
  const { filters, update, days } = useFinanceFilters();
  const [kapak, setKapak]         = useState<KapakData | null>(null);
  const [trend, setTrend]         = useState<TrendPoint[]>([]);
  const [loading, setLoading]     = useState(true);
  const [activeDept, setActiveDept]     = useState('all');
  const [selectedDept, setSelectedDept] = useState<DeptSummary | null>(null);

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

  const rows    = kapak?.revenueData ?? [];
  const subRows = rows.filter((r) => !r.isTotal);
  const latestDate = kapak ? format(new Date(kapak.reportDate), 'd MMMM yyyy', { locale: tr }) : '';

  const fmtVal = (eur: number, tl: number) => {
    if (filters.currency === 'tl')   return fmtTL(tl);
    if (filters.currency === 'both') return `${fmtEUR(eur)} / ${fmtTL(tl)}`;
    return fmtEUR(eur);
  };

  // Build dept summaries
  const deptSummaries: DeptSummary[] = DEPTS.filter((d) => d.key !== 'all').map((dept) => {
    const totalRows = rows.filter((r) => !matchLabel(r.label, TOTAL_PATTERNS) && matchLabel(r.label, dept.patterns));
    const actual  = totalRows.reduce((s, r) => s + r.mtdActualEUR, 0);
    const budget  = totalRows.reduce((s, r) => s + r.mtdBudgetEUR, 0);
    const today   = totalRows.reduce((s, r) => s + r.todayEUR, 0);
    const ytd     = totalRows.reduce((s, r) => s + r.ytdActualEUR, 0);
    const ytdBudg = totalRows.reduce((s, r) => s + r.ytdBudgetEUR, 0);
    const ly      = totalRows.reduce((s, r) => s + r.lyMonthEUR, 0);
    return { ...dept, actual, budget, today, ytd, ytdBudg, ly, vPct: varPct(actual, budget), totalRows };
  });

  const visibleDepts = activeDept === 'all' ? deptSummaries : deptSummaries.filter((d) => d.key === activeDept);

  const grandActual = deptSummaries.reduce((s, d) => s + d.actual, 0);
  const grandBudget = deptSummaries.reduce((s, d) => s + d.budget, 0);
  const grandToday  = deptSummaries.reduce((s, d) => s + d.today, 0);
  const grandYTD    = deptSummaries.reduce((s, d) => s + d.ytd, 0);
  const grandLY     = deptSummaries.reduce((s, d) => s + d.ly, 0);

  const pieData = deptSummaries.filter((d) => d.today > 0).map((d, i) => ({
    name: `${d.emoji} ${d.label}`, value: d.today, color: PIE_COLORS[i],
  }));

  const varData = deptSummaries.filter((d) => d.budget > 0).map((d) => ({ dept: d.label, variance: d.vPct }));

  const lineData = trend.map((d) => ({
    gun: shortDate(d.date),
    Oda: d.roomsEUR, 'F&B': d.fbEUR, Spa: d.spaEUR, Diğer: d.otherEUR,
  }));

  // YoY Radar — YoY% per dept
  const yoyRadar = deptSummaries.map((d) => ({
    dept: `${d.emoji} ${d.label}`,
    'YoY %': d.ly > 0 ? +varPct(d.actual, d.ly).toFixed(1) : 0,
  }));

  // CSV export
  const handleExport = () => {
    downloadCSV(`departman-${latestDate || 'export'}.csv`,
      ['Departman', 'Bugün (€)', 'MTD Actual (€)', 'MTD Budget (€)', 'Var%', 'YTD (€)', 'LY MTD (€)', 'YoY%'],
      deptSummaries.map((d) => [
        d.label, d.today, d.actual, d.budget,
        `${d.vPct.toFixed(1)}%`, d.ytd,
        d.ly > 0 ? d.ly : '',
        d.ly > 0 ? `${varPct(d.actual, d.ly).toFixed(1)}%` : '',
      ])
    );
  };

  if (loading) return <PageSkeleton />;

  if (!kapak) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-muted-foreground">Veri bulunamadı</p>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1" />Yenile</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Departman Raporu</h1>
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

      {/* Dept tabs */}
      <div className="flex gap-2 flex-wrap">
        {DEPTS.map((d) => (
          <button key={d.key} onClick={() => setActiveDept(d.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              activeDept === d.key ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'
            }`}>
            {d.emoji} {d.label}
          </button>
        ))}
      </div>

      {/* Grand total summary */}
      <Card className="border-l-4 border-l-primary">
        <CardContent className="py-3 px-4">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div><p className="text-xs text-muted-foreground">TOPLAM Bugün</p><p className="text-lg font-bold">{fmtEUR(grandToday)}</p></div>
            <div><p className="text-xs text-muted-foreground">TOPLAM MTD</p><p className="text-lg font-bold">{fmtEUR(grandActual)}</p></div>
            <div><p className="text-xs text-muted-foreground">MTD Bütçe</p><p className="text-lg font-bold text-muted-foreground">{fmtEUR(grandBudget)}</p></div>
            <div>
              <p className="text-xs text-muted-foreground">MTD Sapma</p>
              <div className={`flex items-center gap-1 text-lg font-bold ${varPct(grandActual, grandBudget) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {varPct(grandActual, grandBudget) >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                {fmtPct(varPct(grandActual, grandBudget), true)}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">TOPLAM YTD</p>
              <p className="text-lg font-bold">{fmtEUR(grandYTD)}</p>
              {grandLY > 0 && <p className="text-xs text-muted-foreground">LY: {fmtEUR(grandLY)}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dept performance table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Departman Performans Tablosu — tıkla → detay</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead className="border-b border-border">
                <tr className="bg-muted/50">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground min-w-[120px]">Departman</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">Bugün</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">MTD Actual</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">MTD Budget</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground">Var%</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">YTD</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">LY MTD</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">YoY%</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground">Durum</th>
                </tr>
              </thead>
              <tbody>
                {visibleDepts.map((dept) => (
                  <>
                    <tr
                      key={dept.key}
                      className="border-b border-border/40 bg-muted/20 font-semibold cursor-pointer hover:bg-muted/40 transition-colors"
                      onClick={() => setSelectedDept(dept)}
                    >
                      <td className="px-3 py-2 text-xs">{dept.emoji} {dept.label}</td>
                      <td className="px-3 py-2 text-right text-xs">{fmtVal(dept.today, dept.today)}</td>
                      <td className="px-3 py-2 text-right text-xs">{fmtEUR(dept.actual)}</td>
                      <td className="px-3 py-2 text-right text-xs text-muted-foreground">{fmtEUR(dept.budget)}</td>
                      <td className="px-3 py-2 text-center">
                        <Badge className={`text-[10px] px-1.5 py-0 ${dept.vPct >= 0 ? 'bg-green-100 text-green-700 hover:bg-green-100' : 'bg-red-100 text-red-700 hover:bg-red-100'}`}>
                          {fmtPct(dept.vPct, true)}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-right text-xs">{fmtEUR(dept.ytd)}</td>
                      <td className="px-3 py-2 text-right text-xs text-muted-foreground">{dept.ly > 0 ? fmtEUR(dept.ly) : '—'}</td>
                      <td className="px-3 py-2 text-right text-xs">
                        {dept.ly > 0 ? (
                          <span className={`font-medium ${varPct(dept.actual, dept.ly) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {fmtPct(varPct(dept.actual, dept.ly), true)}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-2 text-center"><TargetBadge pct={dept.vPct} /></td>
                    </tr>
                    {/* Sub-rows for active dept */}
                    {activeDept === dept.key && subRows.filter((r) => matchLabel(r.label, dept.patterns)).map((sub, si) => (
                      <tr key={`${dept.key}-sub-${si}`} className="border-b border-border/30 hover:bg-muted/10">
                        <td className="px-3 py-1.5 text-xs text-muted-foreground pl-8">{sub.label}</td>
                        <td className="px-3 py-1.5 text-right text-xs">{fmtEUR(sub.todayEUR)}</td>
                        <td className="px-3 py-1.5 text-right text-xs">{fmtEUR(sub.mtdActualEUR)}</td>
                        <td className="px-3 py-1.5 text-right text-xs text-muted-foreground">{fmtEUR(sub.mtdBudgetEUR)}</td>
                        <td className="px-3 py-1.5 text-center text-xs">
                          {sub.mtdBudgetEUR > 0 ? (
                            <span className={`text-xs ${varPct(sub.mtdActualEUR, sub.mtdBudgetEUR) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {fmtPct(varPct(sub.mtdActualEUR, sub.mtdBudgetEUR), true)}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-3 py-1.5 text-right text-xs">{fmtEUR(sub.ytdActualEUR)}</td>
                        <td className="px-3 py-1.5 text-right text-xs text-muted-foreground">{sub.lyMonthEUR > 0 ? fmtEUR(sub.lyMonthEUR) : '—'}</td>
                        <td className="px-3 py-1.5 text-right text-xs">
                          {sub.lyMonthEUR > 0 ? (
                            <span className={varPct(sub.mtdActualEUR, sub.lyMonthEUR) >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {fmtPct(varPct(sub.mtdActualEUR, sub.lyMonthEUR), true)}
                            </span>
                          ) : '—'}
                        </td>
                        <td />
                      </tr>
                    ))}
                  </>
                ))}
                {/* Grand total row */}
                <tr className="border-t-2 border-border bg-muted/40 font-bold">
                  <td className="px-3 py-2.5 text-xs">TOPLAM</td>
                  <td className="px-3 py-2.5 text-right text-xs">{fmtEUR(grandToday)}</td>
                  <td className="px-3 py-2.5 text-right text-xs">{fmtEUR(grandActual)}</td>
                  <td className="px-3 py-2.5 text-right text-xs">{fmtEUR(grandBudget)}</td>
                  <td className="px-3 py-2.5 text-center">
                    <Badge className={`text-[10px] px-1.5 py-0 ${varPct(grandActual, grandBudget) >= 0 ? 'bg-green-100 text-green-700 hover:bg-green-100' : 'bg-red-100 text-red-700 hover:bg-red-100'}`}>
                      {fmtPct(varPct(grandActual, grandBudget), true)}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5 text-right text-xs">{fmtEUR(grandYTD)}</td>
                  <td className="px-3 py-2.5 text-right text-xs">{grandLY > 0 ? fmtEUR(grandLY) : '—'}</td>
                  <td className="px-3 py-2.5 text-right text-xs">
                    {grandLY > 0 && (
                      <span className={varPct(grandActual, grandLY) >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {fmtPct(varPct(grandActual, grandLY), true)}
                      </span>
                    )}
                  </td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Pie — today's mix */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Departman Katkısı — Bugün (€)</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">Veri yok</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">
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
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{fmtEUR(d.value)}</span>
                        <span className="text-muted-foreground">{grandToday > 0 ? `${((d.value/grandToday)*100).toFixed(0)}%` : ''}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Budget variance */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Bütçe Sapması — MTD (%)</CardTitle>
          </CardHeader>
          <CardContent>
            {varData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">Veri yok</div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={varData} margin={{ left: 8, right: 32, top: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="dept" tick={{ fontSize: 10, fill: '#374151' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: '#6b7280' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v.toFixed(0)}%`} />
                  <Tooltip formatter={(v: number) => [`${v.toFixed(1)}%`, 'Sapma']} contentStyle={TOOLTIP_STYLE} />
                  <ReferenceLine y={0} stroke="#9ca3af" />
                  <Bar dataKey="variance" radius={[3,3,0,0]}
                    label={{ position: 'top', fontSize: 10, formatter: (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%` }}>
                    {varData.map((d, i) => <Cell key={i} fill={d.variance >= 0 ? '#16a34a' : '#dc2626'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Multi-line trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Departman Trend — MTD Son {days} Gün (€)</CardTitle>
          </CardHeader>
          <CardContent>
            {lineData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">Veri yok</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={lineData} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="gun" tick={{ fontSize: 9, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: '#6b7280' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${(v/1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v: number) => fmtEUR(v)} contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Line type="monotone" dataKey="Oda"   stroke="#4f46e5" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="F&B"   stroke="#0891b2" strokeWidth={2}   dot={false} />
                  <Line type="monotone" dataKey="Spa"   stroke="#16a34a" strokeWidth={2}   dot={false} />
                  <Line type="monotone" dataKey="Diğer" stroke="#f59e0b" strokeWidth={2}   dot={false} strokeDasharray="4 3" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* YoY Radar */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">YoY Büyüme — Departman Bazlı (%)</CardTitle>
          </CardHeader>
          <CardContent>
            {yoyRadar.every((d) => d['YoY %'] === 0) ? (
              <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">Geçen yıl verisi yok</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={yoyRadar}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="dept" tick={{ fontSize: 10 }} />
                  <Radar name="YoY %" dataKey="YoY %" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.25} />
                  <Tooltip formatter={(v: number) => [`${v.toFixed(1)}%`, 'YoY Büyüme']} contentStyle={TOOLTIP_STYLE} />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dept Detail Sheet */}
      {selectedDept && (
        <DeptDetailSheet
          dept={selectedDept}
          subRows={subRows}
          trend={trend}
          open={selectedDept !== null}
          onClose={() => setSelectedDept(null)}
          currency={filters.currency}
        />
      )}

    </div>
  );
}
