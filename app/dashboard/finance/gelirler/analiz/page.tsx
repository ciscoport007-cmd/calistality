'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ArrowLeft, BarChart3, TrendingUp, Download, RefreshCw, Euro, BanknoteIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
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

function fmtEUR(n: number) {
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n) + ' €';
}
function fmtTL(n: number) {
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n) + ' ₺';
}

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i);

export default function AnalizPage() {
  const [currency, setCurrency] = useState<'EUR' | 'TL'>('EUR');
  const [tab, setTab] = useState('yearly');

  // Yıl karşılaştırma state
  const [year1, setYear1] = useState(currentYear);
  const [year2, setYear2] = useState(currentYear - 1);
  const [yearlyData, setYearlyData] = useState<{ category: string; [k: string]: number | string }[]>([]);
  const [yearlyLoading, setYearlyLoading] = useState(false);

  // Aylık karşılaştırma state
  const [month1, setMonth1] = useState(new Date().getMonth() + 1);
  const [monthYear1, setMonthYear1] = useState(currentYear);
  const [month2, setMonth2] = useState(new Date().getMonth() === 0 ? 12 : new Date().getMonth());
  const [monthYear2, setMonthYear2] = useState(new Date().getMonth() === 0 ? currentYear - 1 : currentYear);
  const [monthlyData, setMonthlyData] = useState<{ day: number; [k: string]: number }[]>([]);
  const [monthlyLoading, setMonthlyLoading] = useState(false);

  // Kategori trendi state
  const [selectedCat, setSelectedCat] = useState(CATEGORY_OPTIONS[0].value);
  const [catYear1, setCatYear1] = useState(currentYear);
  const [catYear2, setCatYear2] = useState(currentYear - 1);
  const [catData, setCatData] = useState<{ month: string; [k: string]: number | string }[]>([]);
  const [catLoading, setCatLoading] = useState(false);

  const fmt = useCallback((v: number) => (currency === 'EUR' ? fmtEUR(v) : fmtTL(v)), [currency]);

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

  const fetchCategory = useCallback(async () => {
    setCatLoading(true);
    try {
      const res = await fetch(
        `/api/finance/revenue/compare?mode=category&year1=${catYear1}&year2=${catYear2}&category=${encodeURIComponent(selectedCat)}&currency=${currency}`
      );
      const json = await res.json();
      if (json.success) {
        setCatData(
          json.data.comparison.map((c: { month: string; [k: string]: number | string }) => ({
            ...c,
            month: MONTHS[parseInt(String(c.month)) - 1],
          }))
        );
      }
    } finally {
      setCatLoading(false);
    }
  }, [catYear1, catYear2, selectedCat, currency]);

  useEffect(() => {
    if (tab === 'yearly') fetchYearly();
  }, [tab, fetchYearly]);

  useEffect(() => {
    if (tab === 'monthly') fetchMonthly();
  }, [tab, fetchMonthly]);

  useEffect(() => {
    if (tab === 'category') fetchCategory();
  }, [tab, fetchCategory]);

  const exportExcel = () => {
    const from = new Date(year2, 0, 1).toISOString();
    const to = new Date(year1, 11, 31).toISOString();
    window.open(
      `/api/finance/revenue/export?from=${from}&to=${to}&currency=${currency}`,
      '_blank'
    );
  };

  const yearlyBarData = yearlyData.map((d) => ({
    name: CATEGORY_OPTIONS.find((c) => c.value === d.category)?.label ?? d.category.split('/')[0].slice(0, 20),
    [`${year1}`]: d[`year_${year1}`] as number,
    [`${year2}`]: d[`year_${year2}`] as number,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
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
          <Button variant="outline" size="sm" onClick={exportExcel}>
            <Download className="h-4 w-4 mr-2" />
            Excel İndir
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="yearly">Yıl Karşılaştırma</TabsTrigger>
          <TabsTrigger value="monthly">Ay Karşılaştırma</TabsTrigger>
          <TabsTrigger value="category">Kategori Trendi</TabsTrigger>
        </TabsList>

        {/* YIL KARŞILAŞTIRMA */}
        <TabsContent value="yearly" className="space-y-4 mt-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-600">Yıl 1:</label>
              <Select value={String(year1)} onValueChange={(v) => setYear1(Number(v))}>
                <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-600">Yıl 2:</label>
              <Select value={String(year2)} onValueChange={(v) => setYear2(Number(v))}>
                <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" onClick={fetchYearly} disabled={yearlyLoading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${yearlyLoading ? 'animate-spin' : ''}`} />
              Güncelle
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{year1} vs {year2} — Kategori Bazlı</CardTitle>
              <CardDescription>Toplam gelir karşılaştırması ({currency})</CardDescription>
            </CardHeader>
            <CardContent>
              {yearlyLoading ? (
                <div className="h-72 flex items-center justify-center text-gray-400">Yükleniyor...</div>
              ) : yearlyBarData.length === 0 ? (
                <div className="h-72 flex items-center justify-center text-gray-400">Veri bulunamadı</div>
              ) : (
                <ResponsiveContainer width="100%" height={288}>
                  <BarChart data={yearlyBarData} margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                    <Tooltip formatter={(v: number) => fmt(v)} />
                    <Legend />
                    <Bar dataKey={String(year1)} fill="#6366f1" radius={[3, 3, 0, 0]} />
                    <Bar dataKey={String(year2)} fill="#a5b4fc" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {yearlyData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Değişim Tablosu</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 text-gray-500 font-medium">Kategori</th>
                        <th className="text-right py-2 text-gray-500 font-medium">{year1}</th>
                        <th className="text-right py-2 text-gray-500 font-medium">{year2}</th>
                        <th className="text-right py-2 text-gray-500 font-medium">Değişim</th>
                      </tr>
                    </thead>
                    <tbody>
                      {yearlyData.map((row) => {
                        const v1 = row[`year_${year1}`] as number;
                        const v2 = row[`year_${year2}`] as number;
                        const chg = row.changePct as number;
                        return (
                          <tr key={row.category} className="border-b last:border-0 hover:bg-gray-50">
                            <td className="py-2 text-gray-700">
                              {CATEGORY_OPTIONS.find((c) => c.value === row.category)?.label ?? row.category.split('/')[0]}
                            </td>
                            <td className="py-2 text-right font-medium">{fmt(v1)}</td>
                            <td className="py-2 text-right text-gray-500">{fmt(v2)}</td>
                            <td className="py-2 text-right">
                              <Badge
                                className={
                                  chg > 0
                                    ? 'bg-green-100 text-green-800'
                                    : chg < 0
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-gray-100 text-gray-600'
                                }
                              >
                                {chg > 0 ? '+' : ''}{chg.toFixed(1)}%
                              </Badge>
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

        {/* AY KARŞILAŞTIRMA */}
        <TabsContent value="monthly" className="space-y-4 mt-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-600">Dönem 1:</label>
              <Select value={String(month1)} onValueChange={(v) => setMonth1(Number(v))}>
                <SelectTrigger className="w-28"><SelectValue placeholder="Ay" /></SelectTrigger>
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
            <span className="text-gray-400 font-medium">vs</span>
            <div className="flex items-center gap-2">
              <Select value={String(month2)} onValueChange={(v) => setMonth2(Number(v))}>
                <SelectTrigger className="w-28"><SelectValue placeholder="Ay" /></SelectTrigger>
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
            <Button size="sm" onClick={fetchMonthly} disabled={monthlyLoading}>
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
                <div className="h-72 flex items-center justify-center text-gray-400">Yükleniyor...</div>
              ) : monthlyData.length === 0 ? (
                <div className="h-72 flex items-center justify-center text-gray-400">Veri bulunamadı</div>
              ) : (
                <ResponsiveContainer width="100%" height={288}>
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} label={{ value: 'Gün', position: 'insideBottom', offset: -5, fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                    <Tooltip formatter={(v: number) => fmt(v)} />
                    <Legend />
                    {Object.keys(monthlyData[0] ?? {})
                      .filter((k) => k !== 'day')
                      .map((key, i) => (
                        <Line
                          key={key}
                          type="monotone"
                          dataKey={key}
                          stroke={i === 0 ? '#6366f1' : '#f59e0b'}
                          strokeWidth={2}
                          dot={false}
                        />
                      ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* KATEGORİ TRENDİ */}
        <TabsContent value="category" className="space-y-4 mt-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-600">Kategori:</label>
              <Select value={selectedCat} onValueChange={setSelectedCat}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Select value={String(catYear1)} onValueChange={(v) => setCatYear1(Number(v))}>
                <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
              <span className="text-gray-400">vs</span>
              <Select value={String(catYear2)} onValueChange={(v) => setCatYear2(Number(v))}>
                <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" onClick={fetchCategory} disabled={catLoading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${catLoading ? 'animate-spin' : ''}`} />
              Güncelle
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {CATEGORY_OPTIONS.find((c) => c.value === selectedCat)?.label} — Aylık Trend
              </CardTitle>
              <CardDescription>{catYear1} vs {catYear2} karşılaştırması ({currency})</CardDescription>
            </CardHeader>
            <CardContent>
              {catLoading ? (
                <div className="h-72 flex items-center justify-center text-gray-400">Yükleniyor...</div>
              ) : catData.length === 0 ? (
                <div className="h-72 flex items-center justify-center text-gray-400">Veri bulunamadı</div>
              ) : (
                <ResponsiveContainer width="100%" height={288}>
                  <BarChart data={catData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                    <Tooltip formatter={(v: number) => fmt(v)} />
                    <Legend />
                    <Bar dataKey={String(catYear1)} fill="#6366f1" radius={[3, 3, 0, 0]} />
                    <Bar dataKey={String(catYear2)} fill="#a5b4fc" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {catData.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {
                  label: `${catYear1} Toplam`,
                  value: catData.reduce((s, d) => s + (d[String(catYear1)] as number ?? 0), 0),
                },
                {
                  label: `${catYear2} Toplam`,
                  value: catData.reduce((s, d) => s + (d[String(catYear2)] as number ?? 0), 0),
                },
                {
                  label: `${catYear1} En Yüksek Ay`,
                  value: Math.max(...catData.map((d) => d[String(catYear1)] as number ?? 0)),
                },
                {
                  label: `${catYear1} En Düşük Ay`,
                  value: Math.min(...catData.filter((d) => (d[String(catYear1)] as number) > 0).map((d) => d[String(catYear1)] as number ?? 0)),
                },
              ].map((stat) => (
                <Card key={stat.label} className="bg-gray-50">
                  <CardContent className="pt-4">
                    <p className="text-xs text-gray-500">{stat.label}</p>
                    <p className="text-lg font-bold text-gray-800 mt-1">{fmt(stat.value)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
