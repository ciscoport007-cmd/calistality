'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronDown, ChevronUp, Info, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell, ReferenceLine,
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OccupancyData {
  actualRooms:     number;
  budgetRooms:     number;
  actualPax:       number;
  budgetPax:       number;
  occupancyMTD:    number;
  occupancyBudget: number;
  availRoomMTD:    number;
}

interface DeptBase {
  key:            string;
  label:          string;
  defaultRoomPct: number;
  staticBudget:   number;
  actual:         number;
  roomRatio:      number;
  paxRatio:       number;
}

interface ApiData {
  reportDate:  string;
  occupancy:   OccupancyData;
  departments: DeptBase[];
}

interface DeptResult extends DeptBase {
  roomPct:              number;
  flexBudget:           number;
  totalVariance:        number;
  volumeVariance:       number;
  operationalVariance:  number;
}

// ─── Computation ──────────────────────────────────────────────────────────────

function computeFlex(dept: DeptBase, roomPct: number): DeptResult {
  const paxPct     = 1 - roomPct;
  const flexBudget = dept.staticBudget * roomPct * dept.roomRatio
                   + dept.staticBudget * paxPct  * dept.paxRatio;
  return {
    ...dept,
    roomPct,
    flexBudget,
    totalVariance:       dept.actual - dept.staticBudget,
    volumeVariance:      flexBudget  - dept.staticBudget,
    operationalVariance: dept.actual - flexBudget,
  };
}

// ─── Formatters ───────────────────────────────────────────────────────────────

const fmt0   = (n: number) => new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(n);
const fmtEUR = (n: number) => n === 0 ? '—' : `${fmt0(Math.abs(n))} €`;
const fmtPct = (n: number, sign = false) => {
  if (Math.abs(n) < 0.05) return '—';
  return `${sign && n > 0 ? '+' : ''}${n.toFixed(1)}%`;
};
const varPct = (a: number, b: number) => b !== 0 ? ((a - b) / Math.abs(b)) * 100 : 0;

const TOOLTIP_STYLE = { fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' };

// ─── Variance cell ────────────────────────────────────────────────────────────

function VarCell({ val, base }: { val: number; base?: number }) {
  const favorable = val >= 0;
  const cls       = favorable ? 'text-green-700' : 'text-red-600';
  const pct       = base && base !== 0 ? varPct(val + base, base) : null;
  return (
    <td className="px-3 py-2 text-right text-xs whitespace-nowrap">
      <span className={`font-medium ${cls}`}>
        {val >= 0 ? '+' : '-'}{fmtEUR(Math.abs(val))}
      </span>
      {pct !== null && (
        <div className={`text-[10px] ${cls}`}>{fmtPct(pct, true)}</div>
      )}
    </td>
  );
}

// ─── Occupancy Summary ────────────────────────────────────────────────────────

function OccupancySummary({ occ }: { occ: OccupancyData }) {
  const roomDiff = occ.actualRooms    - occ.budgetRooms;
  const paxDiff  = occ.actualPax      - occ.budgetPax;
  const occDiff  = occ.occupancyMTD   - occ.occupancyBudget;

  function MetricCard({ title, actual, budget, diff, unit, isPercent }: {
    title: string; actual: number; budget: number; diff: number; unit: string; isPercent?: boolean;
  }) {
    const favorable = diff >= 0;
    return (
      <Card>
        <CardContent className="pt-4 pb-3">
          <p className="text-xs text-muted-foreground mb-1">{title}</p>
          <p className="text-xl font-bold">
            {isPercent ? actual.toFixed(1) : fmt0(actual)}
            <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Bütçe: {isPercent ? budget.toFixed(1) : fmt0(budget)} {unit}
          </p>
          <div className={`flex items-center gap-1 text-xs mt-1 font-medium ${favorable ? 'text-green-600' : 'text-red-600'}`}>
            {favorable ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {diff >= 0 ? '+' : ''}{isPercent ? diff.toFixed(1) : fmt0(diff)} {unit}
            {!isPercent && budget > 0 && (
              <span className="ml-1">({fmtPct(varPct(actual, budget), true)})</span>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      <MetricCard
        title="Dolu Oda (MTD)" actual={occ.actualRooms} budget={occ.budgetRooms}
        diff={roomDiff} unit="oda"
      />
      <MetricCard
        title="Kişi Sayısı / Pax (MTD)" actual={occ.actualPax} budget={occ.budgetPax}
        diff={paxDiff} unit="kişi"
      />
      <div className="col-span-2 lg:col-span-1">
        <MetricCard
          title="Oda Doluluk Oranı (MTD)" actual={occ.occupancyMTD} budget={occ.occupancyBudget}
          diff={occDiff} unit="%" isPercent
        />
      </div>
    </div>
  );
}

// ─── Assumption Controls ──────────────────────────────────────────────────────

function AssumptionControls({ depts, roomPcts, onChange }: {
  depts:    DeptBase[];
  roomPcts: Record<string, number>;
  onChange: (key: string, val: number) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Her departman için maliyetin kaçta kaçının <strong>oda sayısına</strong> (oda temizliği, buklet vb.),
        kaçının <strong>kişi sayısına</strong> (kahvaltı, F&B tüketimi vb.) bağlı olduğunu belirtin.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
        {depts.map((dept) => {
          const rp = roomPcts[dept.key] ?? dept.defaultRoomPct;
          return (
            <div key={dept.key} className="space-y-2">
              <p className="text-xs font-semibold">{dept.label}</p>
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>Oda bazlı</span>
                  <span className="font-medium text-indigo-600">{(rp * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range" min={0} max={100} step={5}
                  value={Math.round(rp * 100)}
                  onChange={(e) => onChange(dept.key, Number(e.target.value) / 100)}
                  className="w-full h-1.5 accent-indigo-600 cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>Kişi bazlı</span>
                  <span className="font-medium text-amber-600">{((1 - rp) * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Analysis Table ──────────────────────────────────────────────────────

function FlexTable({ results }: { results: DeptResult[] }) {
  const totals = results.reduce(
    (acc, r) => ({
      staticBudget:        acc.staticBudget        + r.staticBudget,
      flexBudget:          acc.flexBudget           + r.flexBudget,
      actual:              acc.actual               + r.actual,
      totalVariance:       acc.totalVariance        + r.totalVariance,
      volumeVariance:      acc.volumeVariance       + r.volumeVariance,
      operationalVariance: acc.operationalVariance  + r.operationalVariance,
    }),
    { staticBudget: 0, flexBudget: 0, actual: 0, totalVariance: 0, volumeVariance: 0, operationalVariance: 0 },
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[900px]">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground sticky left-0 bg-muted/50 min-w-[160px]">Departman</th>
            <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground whitespace-nowrap">Statik Bütçe</th>
            <th className="px-3 py-2.5 text-right text-xs font-semibold text-amber-600 whitespace-nowrap">Esnek Bütçe ✱</th>
            <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground whitespace-nowrap">Gerçekleşen</th>
            <th className="px-3 py-2.5 text-right text-xs font-semibold text-blue-600 whitespace-nowrap">Hacim Sapması</th>
            <th className="px-3 py-2.5 text-right text-xs font-semibold text-orange-600 whitespace-nowrap">Operasyonel Sapma</th>
            <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground whitespace-nowrap">Toplam Sapma</th>
          </tr>
          <tr className="border-b border-border/30 bg-muted/20">
            <td className="px-3 py-1 text-[10px] text-muted-foreground sticky left-0 bg-muted/20"></td>
            <td className="px-3 py-1 text-right text-[10px] text-muted-foreground">Yıl başı planı</td>
            <td className="px-3 py-1 text-right text-[10px] text-amber-600">Gerçek doluluğa göre</td>
            <td className="px-3 py-1 text-right text-[10px] text-muted-foreground">Gerçek</td>
            <td className="px-3 py-1 text-right text-[10px] text-blue-500">Esnek − Statik</td>
            <td className="px-3 py-1 text-right text-[10px] text-orange-500">Gerçek − Esnek</td>
            <td className="px-3 py-1 text-right text-[10px] text-muted-foreground">Gerçek − Statik</td>
          </tr>
        </thead>
        <tbody>
          {results.map((r) => (
            <tr key={r.key} className="border-b border-border/40 hover:bg-muted/20">
              <td className="px-3 py-2 text-xs font-medium sticky left-0 bg-background">{r.label}</td>
              <td className="px-3 py-2 text-right text-xs whitespace-nowrap">{fmtEUR(r.staticBudget)}</td>
              <td className="px-3 py-2 text-right text-xs whitespace-nowrap font-medium text-amber-700">{fmtEUR(r.flexBudget)}</td>
              <td className="px-3 py-2 text-right text-xs whitespace-nowrap">{fmtEUR(r.actual)}</td>
              <VarCell val={r.volumeVariance}      base={r.staticBudget} />
              <VarCell val={r.operationalVariance} base={r.flexBudget}   />
              <VarCell val={r.totalVariance}        base={r.staticBudget} />
            </tr>
          ))}
          <tr className="border-t-2 border-border bg-muted/40 font-semibold">
            <td className="px-3 py-2.5 text-xs sticky left-0 bg-muted/40">TOPLAM</td>
            <td className="px-3 py-2.5 text-right text-xs whitespace-nowrap">{fmtEUR(totals.staticBudget)}</td>
            <td className="px-3 py-2.5 text-right text-xs whitespace-nowrap text-amber-700">{fmtEUR(totals.flexBudget)}</td>
            <td className="px-3 py-2.5 text-right text-xs whitespace-nowrap">{fmtEUR(totals.actual)}</td>
            <VarCell val={totals.volumeVariance}      base={totals.staticBudget} />
            <VarCell val={totals.operationalVariance} base={totals.flexBudget}   />
            <VarCell val={totals.totalVariance}        base={totals.staticBudget} />
          </tr>
        </tbody>
      </table>
      <p className="text-[10px] text-muted-foreground mt-2 px-3 pb-3">
        ✱ Esnek Bütçe = Statik Bütçe × (Oda payı × Gerçek Oda / Bütçe Oda) + (Kişi payı × Gerçek Kişi / Bütçe Kişi)
      </p>
    </div>
  );
}

// ─── Chart: Statik / Esnek / Gerçekleşen ─────────────────────────────────────

function BudgetCompareChart({ results }: { results: DeptResult[] }) {
  const data = results.map((r) => ({
    dept:           r.label.split(' ')[0],
    'Statik Bütçe': Math.round(r.staticBudget),
    'Esnek Bütçe':  Math.round(r.flexBudget),
    'Gerçekleşen':  Math.round(r.actual),
    opFav:          r.operationalVariance >= 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} barCategoryGap="25%" barGap={3} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
        <XAxis dataKey="dept" tick={{ fontSize: 10, fill: '#374151' }} tickLine={false} axisLine={false} />
        <YAxis
          tick={{ fontSize: 9, fill: '#6b7280' }} tickLine={false} axisLine={false}
          tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`}
        />
        <Tooltip formatter={(v: number) => fmtEUR(v)} contentStyle={TOOLTIP_STYLE} />
        <Legend wrapperStyle={{ fontSize: 10 }} />
        <Bar dataKey="Statik Bütçe" fill="#9ca3af"  radius={[2, 2, 0, 0]} />
        <Bar dataKey="Esnek Bütçe"  fill="#f59e0b"  radius={[2, 2, 0, 0]} />
        <Bar dataKey="Gerçekleşen"  radius={[2, 2, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.opFav ? '#16a34a' : '#dc2626'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Chart: Hacim vs Operasyonel Sapma ────────────────────────────────────────

function VarianceBreakdownChart({ results }: { results: DeptResult[] }) {
  const data = results.map((r) => ({
    dept:                r.label.split(' ')[0],
    'Hacim Sapması':     Math.round(r.volumeVariance),
    'Operasyonel Sapma': Math.round(r.operationalVariance),
    volFav:              r.volumeVariance      >= 0,
    opFav:               r.operationalVariance >= 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} barCategoryGap="30%" barGap={3} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
        <XAxis dataKey="dept" tick={{ fontSize: 10, fill: '#374151' }} tickLine={false} axisLine={false} />
        <YAxis
          tick={{ fontSize: 9, fill: '#6b7280' }} tickLine={false} axisLine={false}
          tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`}
        />
        <ReferenceLine y={0} stroke="#374151" strokeWidth={1} />
        <Tooltip
          formatter={(v: number) => [`${v >= 0 ? '+' : ''}${fmtEUR(v)}`]}
          contentStyle={TOOLTIP_STYLE}
        />
        <Legend wrapperStyle={{ fontSize: 10 }} />
        <Bar dataKey="Hacim Sapması" radius={[2, 2, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.volFav ? '#3b82f6' : '#93c5fd'} />
          ))}
        </Bar>
        <Bar dataKey="Operasyonel Sapma" radius={[2, 2, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.opFav ? '#16a34a' : '#dc2626'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-14 rounded-xl" />
      <div className="grid grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </div>
      <Skeleton className="h-64 rounded-xl" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-60 rounded-xl" />
        <Skeleton className="h-60 rounded-xl" />
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EsnekButcePage() {
  const [apiData, setApiData]               = useState<ApiData | null>(null);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState<string | null>(null);
  const [showAssumptions, setShowAssumptions] = useState(false);
  const [roomPcts, setRoomPcts]             = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch('/api/finance/revenue/flexible-budget');
      const json = await res.json();
      if (json.success && json.data) {
        setApiData(json.data);
        const initial: Record<string, number> = {};
        for (const dept of json.data.departments) {
          initial[dept.key] = dept.defaultRoomPct;
        }
        setRoomPcts(initial);
      } else {
        setError('Veri bulunamadı');
      }
    } catch {
      setError('Bağlantı hatası');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <PageSkeleton />;

  if (error || !apiData) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-muted-foreground text-sm">{error ?? 'Veri bulunamadı. Lütfen önce Excel yükleyin.'}</p>
        <Button variant="outline" size="sm" onClick={load}>Yeniden Dene</Button>
      </div>
    );
  }

  const results     = apiData.departments.map((d) => computeFlex(d, roomPcts[d.key] ?? d.defaultRoomPct));
  const latestDate  = format(new Date(apiData.reportDate), 'd MMMM yyyy', { locale: tr });

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Doluluk Bazlı Bütçe Sapma</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Son veri: {latestDate} — Esnek Bütçeleme Analizi (MTD)</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="h-4 w-4 mr-1" />Yenile
        </Button>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-2.5 rounded-lg border border-blue-200 bg-blue-50 p-3.5 text-xs text-blue-800">
        <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-500" />
        <div className="space-y-1">
          <p>
            <strong>Hacim Sapması</strong> = Doluluk farkının yarattığı beklenen sapma.
            Oda doluluk veya pax sayısı bütçenin altındaysa gelirler doğal olarak düşer — yönetimin kontrolü dışındadır.
          </p>
          <p>
            <strong>Operasyonel Sapma</strong> = Gerçekleşen doluluk seviyesinde departmanın bütçeyi tutturabilme performansı.
            "Doluluk tutmadı" bahanesi burada geçersizdir; bu sapma doğrudan departman yönetiminin sorumluluğundadır.
          </p>
          <p>
            <strong>Esnek Bütçe</strong> = Gerçekleşen oda ve kişi sayısına göre yeniden hesaplanan bütçe hedefi.
          </p>
        </div>
      </div>

      {/* Occupancy Summary */}
      <OccupancySummary occ={apiData.occupancy} />

      {/* Assumption Controls */}
      <Card>
        <CardHeader
          className="pb-3 cursor-pointer select-none"
          onClick={() => setShowAssumptions((v) => !v)}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">
              Maliyet Sürücüsü Varsayımları — Oda / Kişi Oranı
            </CardTitle>
            {showAssumptions
              ? <ChevronUp   className="h-4 w-4 text-muted-foreground" />
              : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Varsayımları değiştirin — tablo ve grafikler anında güncellenir.
          </p>
        </CardHeader>
        {showAssumptions && (
          <CardContent className="pt-0">
            <AssumptionControls
              depts={apiData.departments}
              roomPcts={roomPcts}
              onChange={(key, val) => setRoomPcts((prev) => ({ ...prev, [key]: val }))}
            />
          </CardContent>
        )}
      </Card>

      {/* Main Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">
            Esnek Bütçe Sapma Tablosu — MTD (€)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <FlexTable results={results} />
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Bütçe Karşılaştırması — Statik / Esnek / Gerçekleşen (€)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[10px] text-muted-foreground mb-2">
              Yeşil = Gerçekleşen ≥ Esnek Bütçe (olumlu operasyonel performans) · Kırmızı = Gerçekleşen &lt; Esnek Bütçe
            </p>
            <BudgetCompareChart results={results} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Sapma Analizi — Hacim vs Operasyonel (€)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[10px] text-muted-foreground mb-2">
              Mavi = Hacim kaynaklı (doluluk etkisi) · Yeşil/Kırmızı = Operasyonel (yönetim performansı)
            </p>
            <VarianceBreakdownChart results={results} />
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
