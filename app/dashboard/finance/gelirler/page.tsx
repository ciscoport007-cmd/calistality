'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { format, subMonths } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
  TrendingUp,
  TrendingDown,
  Upload,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Info,
  Calendar,
  Euro,
  BanknoteIcon,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const CATEGORY_LABELS: Record<string, string> = {
  'TOTAL ROOM REVENUES': 'Oda Gelirleri',
  'TOTAL EXTRA FOOD REVENUES': 'Yiyecek Gelirleri',
  'TOTAL EXTRA BEVERAGE REVENUES': 'İçecek Gelirleri',
  'TOTAL SPA REVENUE': 'Spa Gelirleri',
  'TOTAL OTHER REVENUES': 'Diğer Gelirler',
  'TOTAL FOOTBALL REVENUE': 'Futbol Gelirleri',
  'TOTAL A LA CARTE REVENUE': 'Alakart Gelirleri',
  'TOTAL TRANSPORTATIONS REVENUE': 'Transfer Gelirleri',
  'TOTAL SPORT ACADEMY REVENUE': 'Spor Akademi Gelirleri',
};

const CATEGORY_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ec4899', '#14b8a6', '#f97316', '#8b5cf6', '#06b6d4', '#84cc16'];

function fmtEUR(n: number) {
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n) + ' €';
}
function fmtTL(n: number) {
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n) + ' ₺';
}
function pctColor(pct: number) {
  if (pct > 5) return 'text-green-600';
  if (pct < -5) return 'text-red-600';
  return 'text-yellow-600';
}

interface StatsData {
  latestReport: { date: string; fileName: string; uploadedBy: string } | null;
  totalReports: number;
  monthly: {
    totalTL: number;
    totalEUR: number;
    budgetTL: number;
    budgetEUR: number;
    budgetVariancePct: number;
    byCategory: Record<string, { tl: number; eur: number; budgetTL: number; budgetEUR: number }>;
  };
  prevMonthly: { totalTL: number; totalEUR: number; monthOverMonthPct: number };
  yearly: { totalEUR: number; budgetEUR: number; variancePct: number };
  trendData: { date: string; dailyEUR: number; dailyTL: number }[];
  missingDays: string[];
  alerts: { type: string; message: string }[];
}

export default function GelirlerPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState<'EUR' | 'TL'>('EUR');
  const [refDate] = useState(new Date());

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/finance/revenue/stats?date=${refDate.toISOString()}`);
      const json = await res.json();
      if (json.success) setStats(json.data);
    } finally {
      setLoading(false);
    }
  }, [refDate]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const pieData =
    stats?.monthly.byCategory
      ? Object.entries(stats.monthly.byCategory).map(([key, val]) => ({
          name: CATEGORY_LABELS[key] ?? key,
          value: currency === 'EUR' ? val.eur : val.tl,
        }))
      : [];

  const trendChartData =
    stats?.trendData.map((d) => ({
      date: format(new Date(d.date), 'dd MMM', { locale: tr }),
      Gelir: currency === 'EUR' ? d.dailyEUR : d.dailyTL,
    })) ?? [];

  const alertIcon = (type: string) => {
    if (type === 'warning') return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    if (type === 'success') return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <Info className="h-4 w-4 text-blue-500" />;
  };

  const monthlyTotal = currency === 'EUR' ? (stats?.monthly.totalEUR ?? 0) : (stats?.monthly.totalTL ?? 0);
  const monthlyBudget = currency === 'EUR' ? (stats?.monthly.budgetEUR ?? 0) : (stats?.monthly.budgetTL ?? 0);
  const prevMonthTotal = currency === 'EUR' ? (stats?.prevMonthly.totalEUR ?? 0) : (stats?.prevMonthly.totalTL ?? 0);

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gelirler</h1>
          <p className="text-sm text-gray-500 mt-1">
            {format(refDate, 'MMMM yyyy', { locale: tr })} dönemi gelir özeti
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border bg-white overflow-hidden">
            <button
              onClick={() => setCurrency('EUR')}
              className={`px-3 py-1.5 text-sm font-medium flex items-center gap-1 transition-colors ${currency === 'EUR' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <Euro className="h-3.5 w-3.5" /> EUR
            </button>
            <button
              onClick={() => setCurrency('TL')}
              className={`px-3 py-1.5 text-sm font-medium flex items-center gap-1 transition-colors ${currency === 'TL' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <BanknoteIcon className="h-3.5 w-3.5" /> TL
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={fetchStats} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Yenile
          </Button>
          <Link href="/dashboard/finance/gelirler/yukle">
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <Upload className="h-4 w-4 mr-2" />
              Veri Yükle
            </Button>
          </Link>
          <Link href="/dashboard/finance/gelirler/analiz">
            <Button variant="outline" size="sm">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analiz
            </Button>
          </Link>
        </div>
      </div>

      {/* Uyarılar */}
      {stats?.alerts && stats.alerts.length > 0 && (
        <div className="space-y-2">
          {stats.alerts.map((alert, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm ${
                alert.type === 'warning'
                  ? 'bg-yellow-50 border border-yellow-200 text-yellow-800'
                  : alert.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-blue-50 border border-blue-200 text-blue-800'
              }`}
            >
              {alertIcon(alert.type)}
              {alert.message}
            </div>
          ))}
        </div>
      )}

      {/* KPI Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Aylık Gelir</CardDescription>
            <CardTitle className="text-2xl font-bold">
              {loading ? '—' : currency === 'EUR' ? fmtEUR(monthlyTotal) : fmtTL(monthlyTotal)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`flex items-center gap-1 text-sm ${pctColor(stats?.prevMonthly.monthOverMonthPct ?? 0)}`}>
              {(stats?.prevMonthly.monthOverMonthPct ?? 0) >= 0 ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              {loading ? '—' : `${(stats?.prevMonthly.monthOverMonthPct ?? 0).toFixed(1)}% geçen ay`}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Geçen ay: {loading ? '—' : currency === 'EUR' ? fmtEUR(prevMonthTotal) : fmtTL(prevMonthTotal)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Bütçe vs Gerçekleşen</CardDescription>
            <CardTitle className="text-2xl font-bold">
              {loading ? '—' : `${(stats?.monthly.budgetVariancePct ?? 0).toFixed(1)}%`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full bg-gray-100 rounded-full h-2 mt-1">
              <div
                className={`h-2 rounded-full ${(stats?.monthly.budgetVariancePct ?? 0) >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min(100, Math.abs(stats?.monthly.budgetVariancePct ?? 0))}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Bütçe: {loading ? '—' : currency === 'EUR' ? fmtEUR(monthlyBudget) : fmtTL(monthlyBudget)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Yıllık Gerçekleşen (EUR)</CardDescription>
            <CardTitle className="text-2xl font-bold">
              {loading ? '—' : fmtEUR(stats?.yearly.totalEUR ?? 0)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`flex items-center gap-1 text-sm ${pctColor(stats?.yearly.variancePct ?? 0)}`}>
              {(stats?.yearly.variancePct ?? 0) >= 0 ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              {loading ? '—' : `${(stats?.yearly.variancePct ?? 0).toFixed(1)}% bütçe sapması`}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Yıllık bütçe: {loading ? '—' : fmtEUR(stats?.yearly.budgetEUR ?? 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Yüklenen Rapor</CardDescription>
            <CardTitle className="text-2xl font-bold">{loading ? '—' : stats?.totalReports ?? 0} gün</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <Calendar className="h-4 w-4" />
              {stats?.missingDays.length ? (
                <span className="text-yellow-600">{stats.missingDays.length} gün eksik (son 30 gün)</span>
              ) : (
                <span className="text-green-600">Son 30 gün tamamlandı</span>
              )}
            </div>
            {stats?.latestReport && (
              <p className="text-xs text-gray-400 mt-1">
                Son: {format(new Date(stats.latestReport.date), 'dd.MM.yyyy')}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Grafikler */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Grafiği */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Aylık Günlük Gelir Trendi</CardTitle>
            <CardDescription>{format(refDate, 'MMMM yyyy', { locale: tr })}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-64 flex items-center justify-center text-gray-400">Yükleniyor...</div>
            ) : trendChartData.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-gray-400 gap-3">
                <BarChart3 className="h-12 w-12 text-gray-200" />
                <p className="text-sm">Bu ay için henüz veri yüklenmemiş</p>
                <Link href="/dashboard/finance/gelirler/yukle">
                  <Button size="sm" variant="outline">Veri Yükle</Button>
                </Link>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={256}>
                <AreaChart data={trendChartData}>
                  <defs>
                    <linearGradient id="gelirGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                  <Tooltip
                    formatter={(v: number) =>
                      currency === 'EUR' ? fmtEUR(v) : fmtTL(v)
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="Gelir"
                    stroke="#6366f1"
                    fill="url(#gelirGrad)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Pasta Grafiği */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Kategori Dağılımı</CardTitle>
            <CardDescription>Aylık gerçekleşen</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-64 flex items-center justify-center text-gray-400">Yükleniyor...</div>
            ) : pieData.every((d) => d.value === 0) ? (
              <div className="h-64 flex items-center justify-center text-gray-400">
                <p className="text-sm">Veri yok</p>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((_, idx) => (
                        <Cell key={idx} fill={CATEGORY_COLORS[idx % CATEGORY_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => (currency === 'EUR' ? fmtEUR(v) : fmtTL(v))} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1 mt-2">
                  {pieData.map((d, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }}
                        />
                        <span className="text-gray-600 truncate max-w-[120px]">{d.name}</span>
                      </div>
                      <span className="font-medium text-gray-800">
                        {currency === 'EUR' ? fmtEUR(d.value) : fmtTL(d.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bütçe Karşılaştırma Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bütçe vs Gerçekleşen — Kategori Bazlı</CardTitle>
          <CardDescription>Aylık karşılaştırma ({currency})</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-48 flex items-center justify-center text-gray-400">Yükleniyor...</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={Object.entries(stats?.monthly.byCategory ?? {}).map(([key, val]) => ({
                  name: CATEGORY_LABELS[key] ?? key.split('/')[0].trim(),
                  Gerçekleşen: currency === 'EUR' ? val.eur : val.tl,
                  Bütçe: currency === 'EUR' ? val.budgetEUR : val.budgetTL,
                }))}
                margin={{ left: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(v: number) => (currency === 'EUR' ? fmtEUR(v) : fmtTL(v))} />
                <Legend />
                <Bar dataKey="Gerçekleşen" fill="#6366f1" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Bütçe" fill="#e2e8f0" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Eksik Günler */}
      {stats?.missingDays && stats.missingDays.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-yellow-800 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Son 30 Günde Eksik Veriler ({stats.missingDays.length} gün)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {stats.missingDays.map((d) => (
                <Badge key={d} variant="outline" className="border-yellow-300 text-yellow-700 bg-white">
                  {format(new Date(d), 'dd MMM', { locale: tr })}
                </Badge>
              ))}
            </div>
            <div className="mt-3">
              <Link href="/dashboard/finance/gelirler/yukle">
                <Button size="sm" className="bg-yellow-600 hover:bg-yellow-700 text-white">
                  <Upload className="h-4 w-4 mr-2" />
                  Eksik Günleri Yükle
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
