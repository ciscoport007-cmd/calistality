'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, getDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import { RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  LineChart, Line, BarChart, Bar, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend,
} from 'recharts';

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
  adrToday: number; adrMTD: number; soldRoomToday: number;
}

interface KapakData { reportDate: string; statistics: Statistics | null }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt0 = (n: number) => new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(n);
const fmtEUR = (n: number) => n === 0 ? '—' : `${fmt0(n)} €`;
const fmtPct = (n: number, sign = false) => n === 0 ? '—' : `${sign && n > 0 ? '+' : ''}${n.toFixed(1)}%`;
const varPct = (a: number, b: number) => b > 0 ? ((a - b) / b) * 100 : 0;
const shortDate = (d: string) => format(new Date(d), 'd MMM', { locale: tr });
const TOOLTIP_STYLE = { fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' };
const WEEKDAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

// ─── Stat Row ─────────────────────────────────────────────────────────────────

function StatTableRow({ label, today, mtdActual, mtdBudget, ytdActual, lyToday, lyMTD, isPct = false, isEUR = false }: {
  label: string; today: number; mtdActual: number; mtdBudget: number;
  ytdActual: number; lyToday: number; lyMTD: number; isPct?: boolean; isEUR?: boolean;
}) {
  const fmt = isPct ? (n: number) => fmtPct(n) : isEUR ? (n: number) => fmtEUR(n) : (n: number) => fmt0(n);
  const mtdVar = varPct(mtdActual, mtdBudget);
  const yoyMTD = lyMTD > 0 ? ((mtdActual - lyMTD) / lyMTD) * 100 : 0;

  return (
    <tr className="border-b border-border/40 hover:bg-muted/20">
      <td className="px-3 py-2 text-xs font-medium sticky left-0 bg-inherit min-w-[180px]">{label}</td>
      <td className="px-3 py-2 text-right text-xs">{fmt(today)}</td>
      <td className="px-3 py-2 text-right text-xs">{fmt(mtdActual)}</td>
      <td className="px-3 py-2 text-right text-xs text-muted-foreground">{fmt(mtdBudget)}</td>
      <td className="px-3 py-2 text-center text-xs">
        {mtdBudget > 0 ? (
          <Badge className={`text-[10px] px-1.5 py-0 ${mtdVar >= 0 ? 'bg-green-100 text-green-700 hover:bg-green-100' : 'bg-red-100 text-red-700 hover:bg-red-100'}`}>
            {fmtPct(mtdVar, true)}
          </Badge>
        ) : <span className="text-muted-foreground">—</span>}
      </td>
      <td className="px-3 py-2 text-right text-xs">{fmt(ytdActual)}</td>
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

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function IstatistiklerPage() {
  const [kapak, setKapak] = useState<KapakData | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChart, setActiveChart] = useState<'occ' | 'adr'>('occ');

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

  const stat = kapak?.statistics ?? null;
  const latestDate = kapak ? format(new Date(kapak.reportDate), 'd MMMM yyyy', { locale: tr }) : '';

  const occTrend = trend.map((d) => ({
    gun: shortDate(d.date),
    'Bu Yıl MTD': d.occupancyMTD,
    'Geçen Yıl': d.lyOccupancyToday,
    'Bütçe': d.occupancyBudget,
  }));

  const adrTrend = trend.map((d) => ({
    gun: shortDate(d.date),
    'ADR MTD (€)': d.adrMTD,
    'Satılan Oda': d.soldRoomToday,
  }));

  const weekdayOcc: Record<number, number[]> = { 0:[], 1:[], 2:[], 3:[], 4:[], 5:[], 6:[] };
  trend.forEach((d) => {
    const dow = getDay(new Date(d.date));
    weekdayOcc[dow].push(d.occupancyToday);
  });
  const radarData = [1,2,3,4,5,6,0].map((dow, i) => ({
    day: WEEKDAYS[i],
    'Doluluk %': weekdayOcc[dow].length > 0
      ? +(weekdayOcc[dow].reduce((a, b) => a + b, 0) / weekdayOcc[dow].length).toFixed(1) : 0,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <RefreshCw className="h-5 w-5 animate-spin mr-2" /> Yükleniyor...
      </div>
    );
  }

  if (!stat) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-muted-foreground">İstatistik verisi bulunamadı</p>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1" />Yenile</Button>
      </div>
    );
  }

  const revpar   = stat.adrMTD    > 0 && stat.occupancyMTD   > 0 ? stat.adrMTD    * (stat.occupancyMTD   / 100) : 0;
  const lyRevpar = stat.lyAdrMTD > 0 && stat.lyOccupancyMTD > 0 ? stat.lyAdrMTD * (stat.lyOccupancyMTD / 100) : 0;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">İstatistikler</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Son veri: {latestDate}</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1" />Yenile</Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Doluluk MTD', value: fmtPct(stat.occupancyMTD), sub: `Bütçe: ${fmtPct(stat.occupancyBudget)}`, ly: `LY: ${fmtPct(stat.lyOccupancyMTD)}`, up: stat.occupancyMTD >= stat.lyOccupancyMTD, color: '#7c3aed' },
          { label: 'ADR MTD',     value: fmtEUR(stat.adrMTD),       sub: `Bütçe: ${fmtEUR(stat.adrBudget)}`,       ly: `LY: ${fmtEUR(stat.lyAdrMTD)}`,       up: stat.adrMTD >= stat.lyAdrMTD,       color: '#0891b2' },
          { label: 'RevPAR MTD',  value: fmtEUR(revpar),            sub: `Occ × ADR`,                               ly: `LY: ${fmtEUR(lyRevpar)}`,             up: revpar >= lyRevpar,                  color: '#0f766e' },
          { label: 'PAX MTD',     value: fmt0(stat.paxMTD),         sub: `Bütçe: ${fmt0(stat.paxBudget)}`,          ly: `LY: ${fmt0(stat.lyPaxMTD)}`,          up: stat.paxMTD >= stat.lyPaxMTD,       color: '#db2777' },
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
          <CardTitle className="text-sm font-semibold">Oda İstatistikleri Tablosu</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="border-b border-border">
                <tr className="bg-muted/50">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground sticky left-0 bg-muted/50 min-w-[180px]">Metrik</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">Bugün</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">MTD</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">MTD Bütçe</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground">Var%</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">YTD</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">LY Bugün</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">LY MTD</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground">YoY%</th>
                </tr>
              </thead>
              <tbody>
                <StatTableRow label="Müsait Oda"    today={stat.availRoomToday}    mtdActual={stat.availRoomMTD}    mtdBudget={stat.availRoomBudget}    ytdActual={stat.availRoomYTD}    lyToday={0}                   lyMTD={0} />
                <StatTableRow label="Satılan Oda"   today={stat.soldRoomToday}     mtdActual={stat.soldRoomMTD}     mtdBudget={stat.soldRoomBudget}     ytdActual={stat.soldRoomYTD}     lyToday={stat.lySoldRoomToday} lyMTD={stat.lySoldRoomMTD} />
                <StatTableRow label="Ücretsiz Oda"  today={stat.compRoomToday}     mtdActual={stat.compRoomMTD}     mtdBudget={0}                       ytdActual={0}                    lyToday={0}                   lyMTD={0} />
                <StatTableRow label="Doluluk %"     today={stat.occupancyToday}    mtdActual={stat.occupancyMTD}    mtdBudget={stat.occupancyBudget}    ytdActual={stat.occupancyYTD}    lyToday={stat.lyOccupancyToday} lyMTD={stat.lyOccupancyMTD} isPct />
                <StatTableRow label="ADR (€)"       today={stat.adrToday}          mtdActual={stat.adrMTD}          mtdBudget={stat.adrBudget}          ytdActual={stat.adrYTD}          lyToday={stat.lyAdrToday}      lyMTD={stat.lyAdrMTD} isEUR />
                <StatTableRow label="Ort. Satış F." today={stat.avgSalesRateToday} mtdActual={stat.avgSalesRateMTD} mtdBudget={stat.avgSalesRateBudget} ytdActual={stat.avgSalesRateYTD} lyToday={0}                   lyMTD={0} isEUR />
                <StatTableRow label="PAX"           today={stat.paxToday}          mtdActual={stat.paxMTD}          mtdBudget={stat.paxBudget}          ytdActual={stat.paxYTD}          lyToday={stat.lyPaxToday}      lyMTD={stat.lyPaxMTD} />
                <StatTableRow label="OoO Oda"       today={stat.outOfOrderToday}   mtdActual={stat.outOfOrderMTD}   mtdBudget={0}                       ytdActual={0}                    lyToday={0}                   lyMTD={0} />
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Trend — Son 30 Gün</CardTitle>
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
                  <YAxis yAxisId="left" tick={{ fontSize: 9, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar yAxisId="right" dataKey="Satılan Oda" fill="#e0e7ff" radius={[2,2,0,0]} />
                  <Line yAxisId="left" type="monotone" dataKey="ADR MTD (€)" stroke="#0891b2" strokeWidth={2.5} dot={false} />
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

      {/* Performance indicators */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Performans Göstergeleri</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { label: 'ADR YoY Büyüme',        value: fmtPct(varPct(stat.adrMTD, stat.lyAdrMTD), true),     good: stat.adrMTD >= stat.lyAdrMTD },
              { label: 'RevPAR YoY Büyüme',     value: fmtPct(varPct(revpar, lyRevpar), true),               good: revpar >= lyRevpar },
              { label: 'Doluluk vs Bütçe (pp)', value: `${(stat.occupancyMTD - stat.occupancyBudget).toFixed(1)} pp`, good: stat.occupancyMTD >= stat.occupancyBudget },
              { label: 'Ort. Satış Fiyatı MTD', value: fmtEUR(stat.avgSalesRateMTD),                         good: stat.avgSalesRateMTD >= stat.avgSalesRateBudget },
              { label: 'Bütçe Gerçekleşme (Occ)', value: stat.occupancyBudget > 0 ? `${((stat.occupancyMTD / stat.occupancyBudget) * 100).toFixed(0)}%` : '—', good: stat.occupancyMTD >= stat.occupancyBudget },
              { label: 'Doluluk YTD',            value: fmtPct(stat.occupancyYTD),                            good: stat.occupancyYTD >= stat.lyOccupancyYTD },
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
