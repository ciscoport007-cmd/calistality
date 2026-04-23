'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
  ArrowLeft, TrendingUp, TrendingDown, Download, RefreshCw, Euro, BanknoteIcon,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

const CATEGORY_OPTIONS = [
  { value: 'TOTAL ROOM REVENUES', label: 'Oda Gelirleri' },
  { value: 'TOTAL EXTRA FOOD REVENUES', label: 'Yiyecek Gelirleri' },
  { value: 'TOTAL EXTRA BEVERAGE REVENUES', label: 'İçecek Gelirleri' },
  { value: 'TOTAL SPA REVENUE', label: 'Spa Gelirleri' },
  { value: 'TOTAL OTHER REVENUES', label: 'Diğer Gelirler' },
];

const C1 = '#1e40af'; // blue-800 — mevcut yıl
const C2 = '#b45309'; // amber-700 — geçen yıl

function fmtEUR(n: number) {
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n) + ' €';
}
function fmtTL(n: number) {
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n) + ' ₺';
}

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i);

function EmptyState({ message }: { message: string }) {
  return (
    <div className="h-64 flex flex-col items-center justify-center gap-2 text-gray-400">
      <p className="font-medium">{message}</p>
      <p className="text-xs text-center max-w-xs">
        Karşılaştırma yapılabilmesi için her iki dönem için de veri yüklenmiş olmalıdır.
      </p>
    </div>
  );
}

export default function AnalizPage() {
  const [currency, setCurrency] = useState<'EUR' | 'TL'>('EUR');
  const [tab, setTab] = useState('ytd');
  const fmt = useCallback((v: number) => (currency === 'EUR' ? fmtEUR(v) : fmtTL(v)), [currency]);

  // --- YTD ---
  const [ytdYear1, setYtdYear1] = useState(currentYear);
  const [ytdYear2, setYtdYear2] = useState(currentYear - 1);
  const [ytdData, setYtdData] = useState<{ month: string; [k: string]: number | string }[]>([]);
  const [ytdTotal1, setYtdTotal1] = useState(0);
  const [ytdTotal2, setYtdTotal2] = useState(0);
  const [ytdChangePct, setYtdChangePct] = useState(0);
  const [ytdLoading, setYtdLoading] = useState(false);

  // --- Yıllık ---
  const [year1, setYear1] = useState(currentYear);
  const [year2, setYear2] = useState(currentYear - 1);
  const [yearlyData, setYearlyData] = useState<{ category: string; [k: string]: number | string }[]>([]);
  const [yearlyLoading, setYearlyLoading] = useState(false);

  // --- Aylık ---
  const [month1, setMonth1] = useState(new Date().getMonth() + 1);
  const [monthYear1, setMonthYear1] = useState(currentYear);
  const [month2, setMonth2] = useState(new Date().getMonth() === 0 ? 12 : new Date().getMonth());
  const [monthYear2, setMonthYear2] = useState(new Date().getMonth() === 0 ? currentYear - 1 : currentYear);
  const [monthlyData, setMonthlyData] = useState<{ day: number; [k: string]: number }[]>([]);
  const [monthlyLoading, setMonthlyLoading] = useState(false);

  const fetchYTD = useCallback(async () => {
    setYtdLoading(true);
    try {
      const res = await fetch(
        `/api/finance/revenue/compare?mode=ytd&year1=${ytdYear1}&year2=${ytdYear2}&currency=${currency}`
      );
      const json = await res.json();
      if (json.success) {
        setYtdData(
          json.data.comparison.map((c: { month: string; [k: string]: number | string }) => ({
            ...c,
            month: MONTHS[parseInt(String(c.month)) - 1],
          }))
        );
        setYtdTotal1(json.data.total1);
        setYtdTotal2(json.data.total2);
        setYtdChangePct(json.data.changePct);
      }
    } finally {
      setYtdLoading(false);
    }
  }, [ytdYear1, ytdYear2, currency]);

  const fetchYearly = useCallback(async () => {
    setYearlyLoading(true);
    try {
      const res = await fetch(
        `/api/finance/revenue/compare?mode=yearly&year1=${year1}&year2=${year2}&currency=${currency}`
      );
      const json = await res.json();
      if (json.success) setYearlyData(json.data.comparison);
    } finally {
      setYearlyLoading(false);
    }
  }, [year1, year2, currency]);

  const fetchMonthly = useCallback(async () => {
    setMonthlyLoading(true);
    try {
      const res = await fetch(
        `/api/finance/revenue/compare?mode=monthly&year1=${monthYear1}&month1=${month1}&year2=${monthYear2}&month2=${month2}&currency=${currency}`
      );
      const json = await res.json();
      if (json.success) {
        const p1 = json.data.period1.data as { day: number; value: number }[];
        const p2 = json.data.period2.data as { day: number; value: number }[];
        const maxLen = Math.max(p1.length, p2.length);
        const merged = Array.from({ length: maxLen }, (_, i) => ({
          day: i + 1,
          [`${MONTHS[month1 - 1]} ${monthYear1}`]: p1[i]?.value ?? 0,
          [`${MONTHS[month2 - 1]} ${monthYear2}`]: p2[i]?.value ?? 0,
        }));
        setMonthlyData(merged);
      }
    } finally {
      setMonthlyLoading(false);
    }
  }, [month1, monthYear1, month2, monthYear2, currency]);

  useEffect(() => { if (tab === 'ytd') fetchYTD(); }, [tab, fetchYTD]);
  useEffect(() => { if (tab === 'yearly') fetchYearly(); }, [tab, fetchYearly]);
  useEffect(() => { if (tab === 'monthly') fetchMonthly(); }, [tab, fetchMonthly]);

  const exportExcel = () => {
    const from = new Date(Math.min(year1, year2), 0, 1).toISOString();
    const to = new Date(Math.max(year1, year2), 11, 31).toISOString();
    window.open(`/api/finance/revenue/export?from=${from}&to=${to}&currency=${currency}`, '_blank');
  };

  const yearlyBarData = yearlyData.map((d) => ({
    name:
      CATEGORY_OPTIONS.find((c) => c.value === d.category)?.label ??
      (d.category as string).split('/')[0].slice(0, 18),
    [`${year1}`]: d[`year_${year1}`] as number,
    [`${year2}`]: d[`year_${year2}`] as number,
  }));

  const today = new Date();
  const ytdPeriodLabel = `1 Ocak — ${format(today, 'd MMMM', { locale: tr })}`;

  const tickFmt = (v: number) => `${(v / 1000).toFixed(0)}K`;
  const tooltipStyle = { fontSize: 12, borderRadius: 6 };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/finance/gelirler">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Geri
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Gelir Analizi</h1>
            <p className="text-sm text-gray-500">Dönemsel karşılaştırma ve trend analizi</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border bg-white overflow-hidden">
            <button
              onClick={() => setCurrency('EUR')}
              className={`px-3 py-1.5 text-sm font-medium flex items-center gap-1 transition-colors ${
                currency === 'EUR' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Euro className="h-3.5 w-3.5" /> EUR
            </button>
            <button
              onClick={() => setCurrency('TL')}
              className={`px-3 py-1.5 text-sm font-medium flex items-center gap-1 transition-colors ${
                currency === 'TL' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <BanknoteIcon className="h-3.5 w-3.5" /> TL
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={exportExcel}>
            <Download className="h-4 w-4 mr-2" />
            Excel İndir
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-3 w-full max-w-sm">
          <TabsTrigger value="ytd">YTD</TabsTrigger>
          <TabsTrigger value="yearly">Yıllık</TabsTrigger>
          <TabsTrigger value="monthly">Aylık</TabsTrigger>
        </TabsList>

        {/* ==================== YTD ==================== */}
        <TabsContent value="ytd" className="space-y-4 mt-4">
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-sm text-gray-500">
              Dönem: <span className="font-medium text-gray-700">{ytdPeriodLabel}</span>
            </p>
            <div className="flex items-center gap-2 ml-auto">
              <Select value={String(ytdYear1)} onValueChange={(v) => setYtdYear1(Number(v))}>
                <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
              <span className="text-gray-400 font-bold">vs</span>
              <Select value={String(ytdYear2)} onValueChange={(v) => setYtdYear2(Number(v))}>
                <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={fetchYTD} disabled={ytdLoading}>
                <RefreshCw className={`h-4 w-4 ${ytdLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Card className="border-l-4" style={{ borderLeftColor: C1 }}>
              <CardContent className="pt-4">
                <p className="text-xs text-gray-500">{ytdYear1} YTD Toplam</p>
                <p className="text-xl font-bold mt-1" style={{ color: C1 }}>{fmt(ytdTotal1)}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4" style={{ borderLeftColor: C2 }}>
              <CardContent className="pt-4">
                <p className="text-xs text-gray-500">{ytdYear2} YTD Toplam</p>
                <p className="text-xl font-bold mt-1" style={{ color: C2 }}>
                  {ytdTotal2 > 0 ? fmt(ytdTotal2) : '—'}
                </p>
              </CardContent>
            </Card>
            <Card className={`border-l-4 ${ytdChangePct >= 0 ? 'border-l-green-700' : 'border-l-red-700'}`}>
              <CardContent className="pt-4">
                <p className="text-xs text-gray-500">Değişim</p>
                <p className={`text-xl font-bold mt-1 flex items-center gap-1 ${ytdChangePct >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {ytdChangePct >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                  {ytdTotal2 > 0 ? `${ytdChangePct >= 0 ? '+' : ''}${ytdChangePct.toFixed(1)}%` : '—'}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">YTD — Aylık Gelir ({ytdYear1} vs {ytdYear2})</CardTitle>
              <CardDescription>{ytdPeriodLabel} dönemi ({currency})</CardDescription>
            </CardHeader>
            <CardContent>
              {ytdLoading ? (
                <div className="h-64 flex items-center justify-center text-gray-400">Yükleniyor...</div>
              ) : ytdData.length === 0 ? (
                <EmptyState message="Veri bulunamadı" />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={ytdData} margin={{ left: 10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#374151' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#374151' }} tickFormatter={tickFmt} />
                    <Tooltip formatter={(v: number) => fmt(v)} contentStyle={tooltipStyle} />
                    <Legend />
                    <Bar dataKey={String(ytdYear1)} fill={C1} radius={[4, 4, 0, 0]} />
                    <Bar dataKey={String(ytdYear2)} fill={C2} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {ytdData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">YTD Aylık Detay</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left py-2.5 px-3 text-gray-500 font-medium">Ay</th>
                        <th className="text-right py-2.5 px-3 font-semibold" style={{ color: C1 }}>{ytdYear1}</th>
                        <th className="text-right py-2.5 px-3 font-semibold" style={{ color: C2 }}>{ytdYear2}</th>
                        <th className="text-right py-2.5 px-3 text-gray-500 font-medium">Değişim</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ytdData.map((row) => {
                        const v1 = row[String(ytdYear1)] as number;
                        const v2 = row[String(ytdYear2)] as number;
                        const chg = v2 > 0 ? ((v1 - v2) / v2) * 100 : null;
                        return (
                          <tr key={String(row.month)} className="border-b last:border-0 hover:bg-gray-50">
                            <td className="py-2.5 px-3 text-gray-700 font-medium">{row.month}</td>
                            <td className="py-2.5 px-3 text-right font-semibold" style={{ color: C1 }}>
                              {v1 > 0 ? fmt(v1) : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-right" style={{ color: C2 }}>
                              {v2 > 0 ? fmt(v2) : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              {chg !== null ? (
                                <Badge className={chg >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                  {chg >= 0 ? '+' : ''}{chg.toFixed(1)}%
                                </Badge>
                              ) : (
                                <span className="text-gray-300 text-xs">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold">
                        <td className="py-2.5 px-3 text-gray-900">Toplam</td>
                        <td className="py-2.5 px-3 text-right" style={{ color: C1 }}>{fmt(ytdTotal1)}</td>
                        <td className="py-2.5 px-3 text-right" style={{ color: C2 }}>
                          {ytdTotal2 > 0 ? fmt(ytdTotal2) : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {ytdTotal2 > 0 && (
                            <Badge className={ytdChangePct >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                              {ytdChangePct >= 0 ? '+' : ''}{ytdChangePct.toFixed(1)}%
                            </Badge>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ==================== YILLIK ==================== */}
        <TabsContent value="yearly" className="space-y-4 mt-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={String(year1)} onValueChange={(v) => setYear1(Number(v))}>
              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
              <SelectContent>
                {YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <span className="text-gray-400 font-bold">vs</span>
            <Select value={String(year2)} onValueChange={(v) => setYear2(Number(v))}>
              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
              <SelectContent>
                {YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={fetchYearly} disabled={yearlyLoading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${yearlyLoading ? 'animate-spin' : ''}`} />
              Güncelle
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{year1} vs {year2} — Kategori Bazlı Yıllık Gelir</CardTitle>
              <CardDescription>Günlük aktüel gelirlerin yıllık toplamı ({currency})</CardDescription>
            </CardHeader>
            <CardContent>
              {yearlyLoading ? (
                <div className="h-64 flex items-center justify-center text-gray-400">Yükleniyor...</div>
              ) : yearlyBarData.length === 0 ? (
                <EmptyState message="Veri bulunamadı" />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={yearlyBarData} margin={{ left: 10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#374151' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#374151' }} tickFormatter={tickFmt} />
                    <Tooltip formatter={(v: number) => fmt(v)} contentStyle={tooltipStyle} />
                    <Legend />
                    <Bar dataKey={String(year1)} fill={C1} radius={[4, 4, 0, 0]} />
                    <Bar dataKey={String(year2)} fill={C2} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {yearlyData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Yıllık Değişim Tablosu</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left py-2.5 px-3 text-gray-500 font-medium">Kategori</th>
                        <th className="text-right py-2.5 px-3 font-semibold" style={{ color: C1 }}>{year1}</th>
                        <th className="text-right py-2.5 px-3 font-semibold" style={{ color: C2 }}>{year2}</th>
                        <th className="text-right py-2.5 px-3 text-gray-500 font-medium">Değişim</th>
                      </tr>
                    </thead>
                    <tbody>
                      {yearlyData.map((row) => {
                        const v1 = row[`year_${year1}`] as number;
                        const v2 = row[`year_${year2}`] as number;
                        const chg = row.changePct as number;
                        return (
                          <tr key={String(row.category)} className="border-b last:border-0 hover:bg-gray-50">
                            <td className="py-2.5 px-3 text-gray-700 font-medium">
                              {CATEGORY_OPTIONS.find((c) => c.value === row.category)?.label ??
                                (row.category as string).split('/')[0]}
                            </td>
                            <td className="py-2.5 px-3 text-right font-semibold" style={{ color: C1 }}>
                              {v1 > 0 ? fmt(v1) : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-right" style={{ color: C2 }}>
                              {v2 > 0 ? fmt(v2) : <span className="text-gray-400 text-xs">Veri yok</span>}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              {v2 > 0 ? (
                                <Badge className={chg >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                  {chg >= 0 ? '+' : ''}{chg.toFixed(1)}%
                                </Badge>
                              ) : (
                                <span className="text-gray-300 text-xs">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ==================== AYLIK ==================== */}
        <TabsContent value="monthly" className="space-y-4 mt-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Select value={String(month1)} onValueChange={(v) => setMonth1(Number(v))}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={String(monthYear1)} onValueChange={(v) => setMonthYear1(Number(v))}>
                <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <span className="text-gray-400 font-bold">vs</span>
            <div className="flex items-center gap-2">
              <Select value={String(month2)} onValueChange={(v) => setMonth2(Number(v))}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={String(monthYear2)} onValueChange={(v) => setMonthYear2(Number(v))}>
                <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" variant="outline" onClick={fetchMonthly} disabled={monthlyLoading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${monthlyLoading ? 'animate-spin' : ''}`} />
              Güncelle
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {MONTHS[month1 - 1]} {monthYear1} vs {MONTHS[month2 - 1]} {monthYear2}
              </CardTitle>
              <CardDescription>Günlük gelir karşılaştırması ({currency})</CardDescription>
            </CardHeader>
            <CardContent>
              {monthlyLoading ? (
                <div className="h-64 flex items-center justify-center text-gray-400">Yükleniyor...</div>
              ) : monthlyData.length === 0 ? (
                <EmptyState message="Veri bulunamadı" />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={monthlyData} margin={{ left: 10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 11, fill: '#374151' }}
                      label={{ value: 'Gün', position: 'insideBottom', offset: -5, fontSize: 11 }}
                    />
                    <YAxis tick={{ fontSize: 11, fill: '#374151' }} tickFormatter={tickFmt} />
                    <Tooltip formatter={(v: number) => fmt(v)} contentStyle={tooltipStyle} />
                    <Legend />
                    {Object.keys(monthlyData[0] ?? {})
                      .filter((k) => k !== 'day')
                      .map((key, i) => (
                        <Line
                          key={key}
                          type="monotone"
                          dataKey={key}
                          stroke={i === 0 ? C1 : C2}
                          strokeWidth={2.5}
                          dot={false}
                          activeDot={{ r: 4 }}
                        />
                      ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
