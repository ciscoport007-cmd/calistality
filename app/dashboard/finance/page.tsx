'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import Link from 'next/link';
import {
  TrendingUp, TrendingDown, RefreshCw, Upload, BarChart3,
  AlertTriangle, CheckCircle, Info, History, Activity, ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

// ── Types ──────────────────────────────────────────────────────────────────

interface CategoryStats { eur: number; tl: number; budgetEUR: number; budgetTL: number }

interface StatsData {
  latestReport: { date: string; fileName: string; uploadedBy: string } | null;
  totalReports: number;
  monthly: {
    totalEUR: number; totalTL: number; budgetEUR: number;
    budgetVariancePct: number; byCategory: Record<string, CategoryStats>;
  };
  prevMonthly: { totalEUR: number; monthOverMonthPct: number };
  yearly: { totalEUR: number; budgetEUR: number; variancePct: number };
  trendData: { date: string; dailyEUR: number; dailyTL: number }[];
  alerts: { type: string; message: string }[];
  missingDays: string[];
}

interface HotelLatest {
  occupancyMTD: number; adrMTD: number; revPARMTD: number; paxMTD: number;
  occupancyBudget: number; adrBudget: number;
  lyOccupancyMTD: number; lyAdrMTD: number; lyRevPARMTD: number;
}

interface HotelTrendPoint { date: string; occupancyMTD: number; adrMTD: number }
interface LyMonth { month: string; [k: string]: number | string }

// ── Constants ──────────────────────────────────────────────────────────────

const MONTHS_SHORT = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
const currentYear = new Date().getFullYear();

const CATEGORY_LABELS: Record<string, string> = {
  'TOTAL ROOM REVENUES': 'Oda',
  'TOTAL EXTRA FOOD REVENUES': 'Yiyecek',
  'TOTAL EXTRA BEVERAGE REVENUES': 'İçecek',
  'TOTAL SPA REVENUE': 'Spa',
  'TOTAL OTHER REVENUES': 'Diğer',
  'TOTAL FOOTBALL REVENUE': 'Futbol',
  'TOTAL A LA CARTE REVENUE': 'Alakart',
  'TOTAL TRANSPORTATIONS REVENUE': 'Transfer',
  'TOTAL SPORT ACADEMY REVENUE': 'Spor Akademi',
};

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtEUR(n: number) {
  return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(n) + ' €';
}
function fmtPct(n: number) { return (n >= 0 ? '+' : '') + n.toFixed(1) + '%'; }

// ── Sub-components ─────────────────────────────────────────────────────────

function BudgetGauge({ variancePct }: { variancePct: number }) {
  const achievement = Math.min(Math.max(100 + variancePct, 0), 150);
  const r = 52; const cx = 70; const cy = 65;
  const halfCircumference = Math.PI * r;
  const progress = Math.min(achievement / 120, 1);
  const dashOffset = halfCircumference * (1 - progress);
  const color = variancePct >= 0 ? '#16a34a' : variancePct > -10 ? '#d97706' : '#dc2626';
  return (
    <div className="flex flex-col items-center py-2">
      <svg width="140" height="78" viewBox="0 0 140 78">
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 0 ${cx + r} ${cy}`}
          fill="none" stroke="#e5e7eb" strokeWidth="14" strokeLinecap="round" />
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 0 ${cx + r} ${cy}`}
          fill="none" stroke={color} strokeWidth="14" strokeLinecap="round"
          strokeDasharray={halfCircumference} strokeDashoffset={dashOffset} />
        <line x1={cx} y1={cy - r + 7} x2={cx} y2={cy - r - 5}
          stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <div className="text-center -mt-1">
        <p className="text-2xl font-bold" style={{ color }}>{achievement.toFixed(1)}%</p>
        <p className="text-xs text-gray-500 mt-0.5">bütçe gerçekleşme</p>
        <Badge className={`text-[10px] mt-1.5 ${variancePct >= 0 ? 'bg-green-100 text-green-700 hover:bg-green-100' : variancePct > -10 ? 'bg-amber-100 text-amber-700 hover:bg-amber-100' : 'bg-red-100 text-red-700 hover:bg-red-100'}`}>
          {variancePct >= 0 ? '+' : ''}{variancePct.toFixed(1)}% sapma
        </Badge>
      </div>
    </div>
  );
}

function KpiCard({ title, value, sub, changePct, changeLabel, accentColor }: {
  title: string; value: string; sub?: string;
  changePct?: number; changeLabel?: string; accentColor: string;
}) {
  const up = (changePct ?? 0) >= 0;
  return (
    <Card className="border-l-4" style={{ borderLeftColor: accentColor }}>
      <CardContent className="pt-4 pb-4">
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{title}</p>
        <p className="text-xl font-bold text-gray-900 mt-1 leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        {changePct !== undefined && (
          <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${up ? 'text-green-700' : 'text-red-700'}`}>
            {up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {changeLabel ?? fmtPct(changePct)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AlertBanner({ type, message }: { type: string; message: string }) {
  const styles: Record<string, string> = {
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    success: 'bg-green-50 border-green-200 text-green-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };
  const icons: Record<string, React.ReactNode> = {
    warning: <AlertTriangle className="h-4 w-4 flex-shrink-0" />,
    success: <CheckCircle className="h-4 w-4 flex-shrink-0" />,
    info: <Info className="h-4 w-4 flex-shrink-0" />,
  };
  const s = styles[type] ?? styles.info;
  return (
    <div className={`flex items-start gap-2.5 px-4 py-2.5 rounded-lg border text-sm ${s}`}>
      {icons[type] ?? icons.info}{message}
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────

export default function FinanceDashboard() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [hotel, setHotel] = useState<HotelLatest | null>(null);
  const [hotelTrend, setHotelTrend] = useState<HotelTrendPoint[]>([]);
  const [lyData, setLyData] = useState<LyMonth[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, hRes, lyRes] = await Promise.all([
        fetch('/api/finance/revenue/stats'),
        fetch('/api/finance/revenue/statistics'),
        fetch(`/api/finance/revenue/compare?mode=ytd&year1=${currentYear}&year2=${currentYear - 1}&currency=EUR`),
      ]);
      const [sJson, hJson, lyJson] = await Promise.all([sRes.json(), hRes.json(), lyRes.json()]);
      if (sJson.success) setStats(sJson.data);
      if (hJson.success) {
        if (hJson.data.latest) setHotel(hJson.data.latest);
        if (hJson.data.trendData) setHotelTrend(hJson.data.trendData);
      }
      if (lyJson.success) setLyData(lyJson.data.comparison);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const trendPoints = (stats?.trendData ?? []).map((d) => ({
    gun: format(new Date(d.date), 'd MMM', { locale: tr }),
    EUR: d.dailyEUR,
  }));

  const deptData = Object.entries(stats?.monthly.byCategory ?? {})
    .map(([key, val]) => ({
      label: CATEGORY_LABELS[key] ?? key,
      eur: val.eur,
      budget: val.budgetEUR,
      pct: val.budgetEUR > 0 ? (val.eur / val.budgetEUR) * 100 : 0,
    }))
    .filter((d) => d.eur > 0 || d.budget > 0)
    .sort((a, b) => b.eur - a.eur);

  const occTrend = hotelTrend.map((d) => ({
    gun: format(new Date(d.date), 'd', { locale: tr }),
    '%': d.occupancyMTD,
  }));

  const adrTrend = hotelTrend.map((d) => ({
    gun: format(new Date(d.date), 'd', { locale: tr }),
    EUR: d.adrMTD,
  }));

  const lyBarData = lyData.map((d) => ({
    ay: MONTHS_SHORT[parseInt(String(d.month)) - 1],
    [String(currentYear)]: (d[String(currentYear)] as number) ?? 0,
    [String(currentYear - 1)]: (d[String(currentYear - 1)] as number) ?? 0,
  }));

  const tooltipStyle = { fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <RefreshCw className="h-5 w-5 animate-spin mr-2" />Yükleniyor...
      </div>
    );
  }

  const monthly = stats?.monthly;
  const prevMonthly = stats?.prevMonthly;
  const yearly = stats?.yearly;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finans Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {format(new Date(), 'd MMMM yyyy', { locale: tr })}
            {stats?.latestReport && (
              <span className="ml-2 text-gray-400">
                · Son veri: {format(new Date(stats.latestReport.date), 'd MMM', { locale: tr })}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4 mr-1" />Güncelle
          </Button>
          <Link href="/dashboard/finance/gelirler/yukle">
            <Button size="sm"><Upload className="h-4 w-4 mr-1" />Veri Yükle</Button>
          </Link>
        </div>
      </div>

      {/* Alerts */}
      {(stats?.alerts ?? []).length > 0 && (
        <div className="space-y-2">
          {stats!.alerts.map((a, i) => <AlertBanner key={i} type={a.type} message={a.message} />)}
        </div>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Aylık Gelir (MTD)" value={fmtEUR(monthly?.totalEUR ?? 0)}
          sub={`Bütçe: ${fmtEUR(monthly?.budgetEUR ?? 0)}`}
          changePct={monthly?.budgetVariancePct}
          changeLabel={`Bütçe: ${fmtPct(monthly?.budgetVariancePct ?? 0)}`}
          accentColor="#4f46e5" />
        <KpiCard title="Geçen Ay (MTD)" value={fmtEUR(prevMonthly?.totalEUR ?? 0)}
          sub="Önceki ay aynı dönem"
          changePct={prevMonthly?.monthOverMonthPct}
          changeLabel={`M/M: ${fmtPct(prevMonthly?.monthOverMonthPct ?? 0)}`}
          accentColor="#0891b2" />
        <KpiCard title="YTD Gelir" value={fmtEUR(yearly?.totalEUR ?? 0)}
          sub={`Bütçe: ${fmtEUR(yearly?.budgetEUR ?? 0)}`}
          changePct={yearly?.variancePct}
          changeLabel={`YTD: ${fmtPct(yearly?.variancePct ?? 0)}`}
          accentColor="#16a34a" />
        <KpiCard title="Eksik Günler" value={String(stats?.missingDays.length ?? 0)}
          sub={`Toplam ${stats?.totalReports ?? 0} rapor`}
          accentColor={(stats?.missingDays.length ?? 0) > 3 ? '#dc2626' : '#9ca3af'} />
      </div>

      {/* Gauge + Dept */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-semibold text-gray-600">Bütçe Gerçekleşme</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center pt-0">
            <BudgetGauge variancePct={monthly?.budgetVariancePct ?? 0} />
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-600">Departman Bazlı Gelir — MTD</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {deptData.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">Veri bulunamadı</p>
            ) : deptData.map((d) => (
              <div key={d.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-700 w-24 truncate">{d.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{fmtEUR(d.eur)}</span>
                    <Badge className={`text-[10px] px-1.5 py-0 ${d.pct >= 100 ? 'bg-green-100 text-green-700 hover:bg-green-100' : d.pct >= 80 ? 'bg-amber-100 text-amber-700 hover:bg-amber-100' : 'bg-red-100 text-red-700 hover:bg-red-100'}`}>
                      {d.budget > 0 ? `${d.pct.toFixed(0)}%` : '—'}
                    </Badge>
                  </div>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${d.pct >= 100 ? 'bg-green-500' : d.pct >= 80 ? 'bg-amber-400' : 'bg-red-400'}`}
                    style={{ width: `${Math.min(d.pct, 100)}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Daily Trend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-600">Günlük Gelir Trendi — Bu Ay (EUR)</CardTitle>
        </CardHeader>
        <CardContent>
          {trendPoints.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-sm text-gray-400">Veri bulunamadı</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={trendPoints} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="fillEUR" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="gun" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false}
                  tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(v: number) => [fmtEUR(v), 'Günlük']} contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="EUR" stroke="#4f46e5" strokeWidth={2.5}
                  fill="url(#fillEUR)" dot={false} activeDot={{ r: 4, fill: '#4f46e5' }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Hotel KPIs */}
      {hotel && (
        <div>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Otelcilik Metrikleri — MTD</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { title: 'Doluluk', value: `${hotel.occupancyMTD.toFixed(1)}%`, sub: `Bütçe: ${hotel.occupancyBudget?.toFixed(1) ?? '—'}%`, lyLabel: `LY: ${hotel.lyOccupancyMTD?.toFixed(1) ?? '—'}%`, up: hotel.occupancyMTD >= hotel.lyOccupancyMTD, color: '#7c3aed' },
              { title: 'ADR', value: `${hotel.adrMTD.toFixed(0)} €`, sub: `Bütçe: ${hotel.adrBudget?.toFixed(0) ?? '—'} €`, lyLabel: `LY: ${hotel.lyAdrMTD?.toFixed(0) ?? '—'} €`, up: hotel.adrMTD >= hotel.lyAdrMTD, color: '#0891b2' },
              { title: 'RevPAR', value: `${hotel.revPARMTD.toFixed(0)} €`, sub: 'ADR × Doluluk', lyLabel: `LY: ${hotel.lyRevPARMTD?.toFixed(0) ?? '—'} €`, up: hotel.revPARMTD >= hotel.lyRevPARMTD, color: '#0f766e' },
              { title: 'PAX', value: hotel.paxMTD.toLocaleString('tr-TR'), sub: 'MTD misafir', lyLabel: null, up: true, color: '#db2777' },
            ].map((m) => (
              <Card key={m.title} className="border-l-4" style={{ borderLeftColor: m.color }}>
                <CardContent className="pt-4 pb-4">
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{m.title}</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">{m.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{m.sub}</p>
                  {m.lyLabel && (
                    <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${m.up ? 'text-green-700' : 'text-red-700'}`}>
                      {m.up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                      {m.lyLabel}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Doluluk & ADR Trend Charts */}
      {occTrend.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Doluluk & ADR — Aylık MTD Trendi</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-600">Doluluk % MTD</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={150}>
                  <LineChart data={occTrend} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="gun" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false}
                      tickFormatter={(v: number) => `${v}%`} />
                    <Tooltip formatter={(v: number) => [`${v.toFixed(1)}%`, 'Doluluk MTD']} contentStyle={tooltipStyle} />
                    <Line type="monotone" dataKey="%" stroke="#7c3aed" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-600">ADR MTD (€)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={150}>
                  <LineChart data={adrTrend} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="gun" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(v: number) => [`${v.toFixed(0)} €`, 'ADR MTD']} contentStyle={tooltipStyle} />
                    <Line type="monotone" dataKey="EUR" stroke="#0891b2" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* LY Comparison Bar Chart */}
      {lyBarData.some((d) => (d[String(currentYear)] as number) > 0) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-600">
              Aylık Gelir Karşılaştırması — {currentYear} vs {currentYear - 1}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={lyBarData} margin={{ left: 8, right: 8, top: 4, bottom: 0 }} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="ay" tick={{ fontSize: 10, fill: '#374151' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false}
                  tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(v: number) => fmtEUR(v)} contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey={String(currentYear)} fill="#4f46e5" radius={[3, 3, 0, 0]} />
                <Bar dataKey={String(currentYear - 1)} fill="#b45309" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Quick Nav */}
      <div>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Hızlı Erişim</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { href: '/dashboard/finance/gelirler', label: 'Günlük Gelirler', icon: Activity },
            { href: '/dashboard/finance/gelirler/istatistikler', label: 'Otel İstatistikleri', icon: BarChart3 },
            { href: '/dashboard/finance/gelirler/analiz', label: 'Gelir Analizi', icon: TrendingUp },
            { href: '/dashboard/finance/gelirler/gecmis', label: 'Geçmiş Raporlar', icon: History },
          ].map((item) => (
            <Link key={item.href} href={item.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer hover:border-indigo-200">
                <CardContent className="py-3 px-4 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                      <item.icon className="h-4 w-4 text-indigo-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 leading-tight">{item.label}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}
