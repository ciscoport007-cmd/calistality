'use client';

import { useEffect, useState, useCallback } from 'react';
import { format, subMonths, addMonths } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
  ChevronLeft,
  ChevronRight,
  BedDouble,
  Users,
  TrendingUp,
  TrendingDown,
  Banknote,
  Building2,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';

// ─── Tipler ──────────────────────────────────────────────────────────────────

interface LatestStats {
  reportDate: string;
  occupancyToday: number;
  occupancyMTD: number;
  occupancyBudget: number;
  occupancyForecast: number;
  occupancyYTD: number;
  lyOccupancyToday: number;
  lyOccupancyMTD: number;
  adrToday: number;
  adrMTD: number;
  adrBudget: number;
  adrForecast: number;
  adrYTD: number;
  lyAdrToday: number;
  lyAdrMTD: number;
  revPARToday: number;
  revPARMTD: number;
  revPARBudget: number;
  revPARYTD: number;
  lyRevPARToday: number;
  lyRevPARMTD: number;
  paxToday: number;
  paxMTD: number;
  paxBudget: number;
  paxForecast: number;
  paxYTD: number;
  lyPaxToday: number;
  lyPaxMTD: number;
  soldRoomToday: number;
  soldRoomMTD: number;
  soldRoomBudget: number;
  availRoomToday: number;
  availRoomMTD: number;
  compRoomToday: number;
  compRoomMTD: number;
  outOfOrderToday: number;
  outOfOrderMTD: number;
  avgSalesRateToday: number;
  avgSalesRateMTD: number;
}

interface ExchangeRateData {
  reportDate: string;
  dailyRate: number;
  monthlyAvgRate: number;
  budgetRate: number;
  forecastRate: number;
  yearlyAvgRate: number;
  yearlyBudgetRate: number;
  lyDailyRate: number;
  lyMonthlyRate: number;
  lyYearlyRate: number;
}

interface TrendPoint {
  date: string;
  occupancyToday: number;
  occupancyMTD: number;
  adrToday: number;
  adrMTD: number;
  revPARToday: number;
  revPARMTD: number;
  paxToday: number;
  paxMTD: number;
  soldRoomToday: number;
  availRoomToday: number;
}

interface StatsData {
  latest: LatestStats | null;
  exchangeRate: ExchangeRateData | null;
  trendData: TrendPoint[];
  exchangeRateTrend: { date: string; dailyRate: number; monthlyAvgRate: number }[];
  kapakMissing?: boolean;
}

// ─── Yardımcı fonksiyonlar ───────────────────────────────────────────────────

function fmtEUR(n: number) {
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + ' €';
}

function fmtPct(n: number) {
  return n.toFixed(1) + '%';
}

function fmtNum(n: number) {
  return new Intl.NumberFormat('tr-TR').format(Math.round(n));
}

function fmtRate(n: number) {
  return n.toFixed(4) + ' ₺';
}

function diffBadge(actual: number, reference: number, higherIsBetter = true) {
  if (!reference) return null;
  const pct = ((actual - reference) / reference) * 100;
  const positive = higherIsBetter ? pct >= 0 : pct <= 0;
  return (
    <Badge className={`text-xs ml-1 ${positive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
      {pct >= 0 ? '+' : ''}{pct.toFixed(1)}%
    </Badge>
  );
}

function formatTrendDate(dateStr: string) {
  try {
    return format(new Date(dateStr), 'd MMM', { locale: tr });
  } catch {
    return dateStr;
  }
}

// ─── KPI Kartı ───────────────────────────────────────────────────────────────

interface KpiCardProps {
  title: string;
  icon: React.ReactNode;
  today: number;
  mtd: number;
  budget: number;
  ly: number;
  lyMtd: number;
  fmt: (n: number) => string;
  color: string;
}

function KpiCard({ title, icon, today, mtd, budget, ly, lyMtd, fmt, color }: KpiCardProps) {
  const mtdVsBudget = budget > 0 ? ((mtd - budget) / budget) * 100 : 0;
  const todayVsLY = ly > 0 ? ((today - ly) / ly) * 100 : 0;
  const mtdVsLYMtd = lyMtd > 0 ? ((mtd - lyMtd) / lyMtd) * 100 : 0;

  return (
    <Card className="overflow-hidden">
      <div className="h-1" style={{ backgroundColor: color }} />
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardDescription className="font-medium text-gray-600">{title}</CardDescription>
          <div className="p-1.5 rounded-md" style={{ backgroundColor: color + '20' }}>
            <div style={{ color }}>{icon}</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Günlük */}
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-xs text-gray-400">Bugün</p>
            <p className="text-2xl font-bold text-gray-900">{fmt(today)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Geçen Yıl</p>
            <p className="text-sm text-gray-500">{fmt(ly)}</p>
            {todayVsLY !== 0 && (
              <span className={`text-xs font-medium ${todayVsLY >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {todayVsLY >= 0 ? '+' : ''}{todayVsLY.toFixed(1)}%
              </span>
            )}
          </div>
        </div>

        <div className="border-t pt-2 grid grid-cols-3 gap-2 text-xs">
          <div>
            <p className="text-gray-400">MTD</p>
            <p className="font-semibold">{fmt(mtd)}</p>
            {diffBadge(mtd, lyMtd)}
          </div>
          <div>
            <p className="text-gray-400">Bütçe</p>
            <p className="font-semibold">{fmt(budget)}</p>
          </div>
          <div>
            <p className="text-gray-400">Bütçe Sap.</p>
            <p className={`font-semibold ${mtdVsBudget >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {mtdVsBudget >= 0 ? '+' : ''}{mtdVsBudget.toFixed(1)}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Ana Sayfa ────────────────────────────────────────────────────────────────

export default function IstatistiklerPage() {
  const [refDate, setRefDate] = useState(new Date());
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeChart, setActiveChart] = useState<'occupancy' | 'adr' | 'revpar' | 'pax'>('occupancy');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const dateStr = format(refDate, 'yyyy-MM-dd');
      const res = await fetch(`/api/finance/revenue/statistics?date=${dateStr}`);
      const json = await res.json();
      if (json.success) setData(json.data);
    } finally {
      setLoading(false);
    }
  }, [refDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const monthLabel = format(refDate, 'MMMM yyyy', { locale: tr });
  const s = data?.latest;
  const er = data?.exchangeRate;
  const trend = data?.trendData ?? [];
  const erTrend = data?.exchangeRateTrend ?? [];

  const chartTabs = [
    { key: 'occupancy' as const, label: 'Doluluk %' },
    { key: 'adr' as const, label: 'ADR' },
    { key: 'revpar' as const, label: 'RevPAR' },
    { key: 'pax' as const, label: 'PAX' },
  ];

  const chartConfig: Record<string, { today: keyof TrendPoint; mtd: keyof TrendPoint; color: string; fmt: (n: number) => string }> = {
    occupancy: { today: 'occupancyToday', mtd: 'occupancyMTD', color: '#6366f1', fmt: fmtPct },
    adr:       { today: 'adrToday',       mtd: 'adrMTD',       color: '#22c55e', fmt: fmtEUR },
    revpar:    { today: 'revPARToday',    mtd: 'revPARMTD',    color: '#f59e0b', fmt: fmtEUR },
    pax:       { today: 'paxToday',       mtd: 'paxMTD',       color: '#ec4899', fmt: fmtNum },
  };

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Otelcilik İstatistikleri</h1>
          <p className="text-sm text-gray-500">Doluluk · ADR · RevPAR · PAX · Döviz Kuru</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setRefDate((d) => subMonths(d, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium capitalize min-w-[140px] text-center">{monthLabel}</span>
          <Button variant="outline" size="icon" onClick={() => setRefDate((d) => addMonths(d, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-gray-400">Yükleniyor...</div>
      ) : !s ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64 gap-3">
            <AlertTriangle className="h-8 w-8 text-amber-400" />
            <p className="text-gray-600 font-medium">
              {data?.kapakMissing
                ? 'KAPAK sayfası verisi eksik veya okunamadı'
                : 'Bu aya ait istatistik verisi bulunamadı'}
            </p>
            <p className="text-xs text-gray-400 text-center max-w-sm">
              {data?.kapakMissing
                ? 'Excel dosyanızda "KAPAK DD.MM.YYYY" adlı sheet bulunmalı ve doluluk/ADR satırları dolu olmalıdır. Güncel dosyayı tekrar yükleyin.'
                : 'Excel yükledikten sonra KAPAK sayfasından otomatik doldurulur.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPI Kartları */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <KpiCard
              title="Doluluk Oranı"
              icon={<BedDouble className="h-4 w-4" />}
              today={s.occupancyToday}
              mtd={s.occupancyMTD}
              budget={s.occupancyBudget}
              ly={s.lyOccupancyToday}
              lyMtd={s.lyOccupancyMTD}
              fmt={fmtPct}
              color="#6366f1"
            />
            <KpiCard
              title="ADR (Ort. Oda Fiyatı)"
              icon={<TrendingUp className="h-4 w-4" />}
              today={s.adrToday}
              mtd={s.adrMTD}
              budget={s.adrBudget}
              ly={s.lyAdrToday}
              lyMtd={s.lyAdrMTD}
              fmt={fmtEUR}
              color="#22c55e"
            />
            <KpiCard
              title="RevPAR"
              icon={<Building2 className="h-4 w-4" />}
              today={s.revPARToday}
              mtd={s.revPARMTD}
              budget={s.revPARBudget}
              ly={s.lyRevPARToday}
              lyMtd={s.lyRevPARMTD}
              fmt={fmtEUR}
              color="#f59e0b"
            />
            <KpiCard
              title="PAX (Misafir)"
              icon={<Users className="h-4 w-4" />}
              today={s.paxToday}
              mtd={s.paxMTD}
              budget={s.paxBudget}
              ly={s.lyPaxToday}
              lyMtd={s.lyPaxMTD}
              fmt={fmtNum}
              color="#ec4899"
            />
          </div>

          {/* Oda Detayları */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Mevcut Oda', today: s.availRoomToday, mtd: s.availRoomMTD },
              { label: 'Satılan Oda', today: s.soldRoomToday, mtd: s.soldRoomMTD },
              { label: 'Komp Oda', today: s.compRoomToday, mtd: s.compRoomMTD },
              { label: 'Arıza / OOO', today: s.outOfOrderToday, mtd: s.outOfOrderMTD },
            ].map((item) => (
              <Card key={item.label}>
                <CardHeader className="pb-1 pt-3 px-4">
                  <CardDescription className="text-xs">{item.label}</CardDescription>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  <p className="text-lg font-bold">{fmtNum(item.today)}</p>
                  <p className="text-xs text-gray-400">MTD: {fmtNum(item.mtd)}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Avg Sales Rate */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Ortalama Satış Fiyatı (Avg Sales Rate)</CardTitle>
              <CardDescription className="text-xs">KDV dahil, EUR — gerçekleşen konaklama satış ortalaması</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-8">
                <div>
                  <p className="text-xs text-gray-400">Bugün</p>
                  <p className="text-xl font-bold">{fmtEUR(s.avgSalesRateToday)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">MTD</p>
                  <p className="text-xl font-bold">{fmtEUR(s.avgSalesRateMTD)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">ADR vs Avg Sales</p>
                  <p className="text-sm text-gray-600">
                    Fark: {fmtEUR(s.avgSalesRateToday - s.adrToday)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trend Grafik */}
          {trend.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Aylık Trend</CardTitle>
                  <div className="flex gap-1 rounded-lg border bg-white overflow-hidden">
                    {chartTabs.map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setActiveChart(tab.key)}
                        className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                          activeChart === tab.key
                            ? 'bg-indigo-600 text-white'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={trend} margin={{ left: 0, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      tickFormatter={formatTrendDate}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) =>
                        activeChart === 'pax'
                          ? fmtNum(v)
                          : activeChart === 'occupancy'
                          ? v + '%'
                          : v + '€'
                      }
                      width={55}
                    />
                    <Tooltip
                      formatter={(v: number) => chartConfig[activeChart].fmt(v)}
                      labelFormatter={formatTrendDate}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey={chartConfig[activeChart].today}
                      name="Günlük"
                      stroke={chartConfig[activeChart].color}
                      dot={false}
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey={chartConfig[activeChart].mtd}
                      name="MTD"
                      stroke={chartConfig[activeChart].color + '80'}
                      dot={false}
                      strokeWidth={1.5}
                      strokeDasharray="4 2"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Döviz Kuru */}
          {er && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Kur Özeti */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Banknote className="h-4 w-4 text-teal-600" />
                    <CardTitle className="text-sm font-semibold">EUR/TL Kuru</CardTitle>
                  </div>
                  <CardDescription className="text-xs">
                    Rapor tarihi: {format(new Date(er.reportDate), 'dd MMMM yyyy', { locale: tr })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                    {[
                      { label: 'Günlük Kur', value: er.dailyRate, highlight: true },
                      { label: 'Aylık Ort.', value: er.monthlyAvgRate },
                      { label: 'Bütçe Kuru', value: er.budgetRate },
                      { label: 'Forecast', value: er.forecastRate },
                      { label: 'YTD Ort.', value: er.yearlyAvgRate },
                      { label: 'YTD Bütçe', value: er.yearlyBudgetRate },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center justify-between">
                        <span className="text-gray-400">{row.label}</span>
                        <span className={`font-semibold ${row.highlight ? 'text-teal-700 text-base' : 'text-gray-700'}`}>
                          {fmtRate(row.value)}
                        </span>
                      </div>
                    ))}
                    <div className="col-span-2 border-t pt-2 mt-1">
                      <p className="text-xs text-gray-400 mb-1">Geçen Yıl</p>
                      <div className="flex gap-6">
                        <div>
                          <p className="text-xs text-gray-400">Günlük</p>
                          <p className="font-medium">{fmtRate(er.lyDailyRate)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Aylık</p>
                          <p className="font-medium">{fmtRate(er.lyMonthlyRate)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Yıllık</p>
                          <p className="font-medium">{fmtRate(er.lyYearlyRate)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Kur Trendi */}
              {erTrend.length > 1 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">EUR/TL Kur Trendi</CardTitle>
                    <CardDescription className="text-xs">Günlük kur ve aylık ortalama</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart data={erTrend} margin={{ left: 0, right: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 10 }}
                          tickFormatter={formatTrendDate}
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          tick={{ fontSize: 10 }}
                          tickFormatter={(v) => v.toFixed(1)}
                          width={40}
                          domain={['auto', 'auto']}
                        />
                        <Tooltip
                          formatter={(v: number) => fmtRate(v)}
                          labelFormatter={formatTrendDate}
                        />
                        <Line
                          type="monotone"
                          dataKey="dailyRate"
                          name="Günlük"
                          stroke="#14b8a6"
                          dot={false}
                          strokeWidth={2}
                        />
                        <Line
                          type="monotone"
                          dataKey="monthlyAvgRate"
                          name="Aylık Ort."
                          stroke="#14b8a680"
                          dot={false}
                          strokeWidth={1.5}
                          strokeDasharray="4 2"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* MTD Sold Room Bar */}
          {trend.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Günlük Satılan Oda Sayısı</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={trend} margin={{ left: 0, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={formatTrendDate} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10 }} width={40} />
                    <Tooltip labelFormatter={formatTrendDate} formatter={(v: number) => fmtNum(v)} />
                    <Bar dataKey="soldRoomToday" name="Satılan Oda" fill="#6366f1" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="availRoomToday" name="Mevcut Oda" fill="#e0e7ff" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
