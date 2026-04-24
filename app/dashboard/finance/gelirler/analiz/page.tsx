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
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';

// ── Constants ──────────────────────────────────────────────────────────────

const MONTHS = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
const MONTHS_SHORT = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];

const CATEGORY_OPTIONS = [
  { value: 'TOTAL ROOM REVENUES', label: 'Oda Gelirleri' },
  { value: 'TOTAL EXTRA FOOD REVENUES', label: 'Yiyecek Gelirleri' },
  { value: 'TOTAL EXTRA BEVERAGE REVENUES', label: 'İçecek Gelirleri' },
  { value: 'TOTAL SPA REVENUE', label: 'Spa Gelirleri' },
  { value: 'TOTAL OTHER REVENUES', label: 'Diğer Gelirler' },
  { value: 'TOTAL FOOTBALL REVENUE', label: 'Futbol Gelirleri' },
  { value: 'TOTAL A LA CARTE REVENUE', label: 'Alakart Gelirleri' },
  { value: 'TOTAL TRANSPORTATIONS REVENUE', label: 'Transfer Gelirleri' },
  { value: 'TOTAL SPORT ACADEMY REVENUE', label: 'Spor Akademi Gelirleri' },
];

const C1 = '#1e40af';
const C2 = '#b45309';
const C3 = '#166534';

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i);

// ── Types ──────────────────────────────────────────────────────────────────

interface BudgetMonth {
  month: number; monthName: string;
  actualEUR: number; budgetEUR: number;
  variancePct: number | null; hasData: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtEUR(n: number) {
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n) + ' €';
}
function fmtTL(n: number) {
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n) + ' ₺';
}

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

// ── Main Page ──────────────────────────────────────────────────────────────

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

  // --- Bütçe Sapma ---
  const [budgetYear, setBudgetYear] = useState(currentYear);
  const [budgetData, setBudgetData] = useState<BudgetMonth[]>([]);
  const [budgetLoading, setBudgetLoading] = useState(false);

  // --- Sezon Trendi ---
  const [sYear1, setSYear1] = useState(currentYear);
  const [sYear2, setSYear2] = useState(currentYear - 1);
  const [sYear3, setSYear3] = useState(currentYear - 2);
  const [seasonData, setSeasonData] = useState<{ ay: string; [k: string]: number | string }[]>([]);
  const [seasonLoading, setSeasonLoading] = useState(false);

  // ── Fetch functions ──────────────────────────────────────────────────────

  const fetchYTD = useCallback(async () => {
    setYtdLoading(true);
    try {
      const res = await fetch(`/api/finance/revenue/compare?mode=ytd&year1=${ytdYear1}&year2=${ytdYear2}&currency=${currency}`);
      const json = await res.json();
      if (json.success) {
        setYtdData(json.data.comparison.map((c: { month: string; [k: string]: number | string }) => ({
          ...c, month: MONTHS[parseInt(String(c.month)) - 1],
        })));
        setYtdTotal1(json.data.total1);
        setYtdTotal2(json.data.total2);
        setYtdChangePct(json.data.changePct);
      }
    } finally { setYtdLoading(false); }
  }, [ytdYear1, ytdYear2, currency]);

  const fetchYearly = useCallback(async () => {
    setYearlyLoading(true);
    try {
      const res = await fetch(`/api/finance/revenue/compare?mode=yearly&year1=${year1}&year2=${year2}&currency=${currency}`);
      const json = await res.json();
      if (json.success) setYearlyData(json.data.comparison);
    } finally { setYearlyLoading(false); }
  }, [year1, year2, currency]);

  const fetchMonthly = useCallback(async () => {
    setMonthlyLoading(true);
    try {
      const res = await fetch(`/api/finance/revenue/compare?mode=monthly&year1=${monthYear1}&month1=${month1}&year2=${monthYear2}&month2=${month2}&currency=${currency}`);
      const json = await res.json();
      if (json.success) {
        const p1 = json.data.period1.data as { day: number; value: number }[];
        const p2 = json.data.period2.data as { day: number; value: number }[];
        const maxLen = Math.max(p1.length, p2.length);
        setMonthlyData(Array.from({ length: maxLen }, (_, i) => ({
          day: i + 1,
          [`${MONTHS[month1 - 1]} ${monthYear1}`]: p1[i]?.value ?? 0,
          [`${MONTHS[month2 - 1]} ${monthYear2}`]: p2[i]?.value ?? 0,
        })));
      }
    } finally { setMonthlyLoading(false); }
  }, [month1, monthYear1, month2, monthYear2, currency]);

  const fetchBudget = useCallback(async () => {
    setBudgetLoading(true);
    try {
      const res = await fetch(`/api/finance/revenue/budget-trend?year=${budgetYear}`);
      const json = await res.json();
      if (json.success) setBudgetData(json.data.months);
    } finally { setBudgetLoading(false); }
  }, [budgetYear]);

  const fetchSeason = useCallback(async () => {
    setSeasonLoading(true);
    try {
      const years = [sYear1, sYear2, sYear3];
      const results = await Promise.all(
        years.map((y) => fetch(`/api/finance/revenue/budget-trend?year=${y}`).then((r) => r.json()))
      );
      const merged = Array.from({ length: 12 }, (_, i) => {
        const row: { ay: string; [k: string]: number | string } = { ay: MONTHS_SHORT[i] };
        results.forEach((r, idx) => {
          if (r.success) row[String(years[idx])] = r.data.months[i]?.actualEUR ?? 0;
        });
        return row;
      });
      setSeasonData(merged);
    } finally { setSeasonLoading(false); }
  }, [sYear1, sYear2, sYear3]);

  // ── Effects ──────────────────────────────────────────────────────────────

  useEffect(() => { if (tab === 'ytd') fetchYTD(); }, [tab, fetchYTD]);
  useEffect(() => { if (tab === 'yearly') fetchYearly(); }, [tab, fetchYearly]);
  useEffect(() => { if (tab === 'monthly') fetchMonthly(); }, [tab, fetchMonthly]);
  useEffect(() => { if (tab === 'budget') fetchBudget(); }, [tab, fetchBudget]);
  useEffect(() => { if (tab === 'season') fetchSeason(); }, [tab, fetchSeason]);

  // ── Derived data ─────────────────────────────────────────────────────────

  const exportExcel = () => {
    const from = new Date(Math.min(year1, year2), 0, 1).toISOString();
    const to = new Date(Math.max(year1, year2), 11, 31).toISOString();
    window.open(`/api/finance/revenue/export?from=${from}&to=${to}&currency=${currency}`, '_blank');
  };

  const yearlyBarData = yearlyData.map((d) => ({
    name: CATEGORY_OPTIONS.find((c) => c.value === d.category)?.label ?? (d.category as string).split('/')[0].slice(0, 18),
    [`${year1}`]: d[`year_${year1}`] as number,
    [`${year2}`]: d[`year_${year2}`] as number,
  }));

  const budgetBarData = budgetData
    .filter((m) => m.hasData || m.budgetEUR > 0)
    .map((m) => ({ ay: m.monthName.slice(0, 3), Gerçekleşen: m.actualEUR, Bütçe: m.budgetEUR }));

  const budgetVarianceData = budgetData
    .filter((m) => m.hasData && m.variancePct !== null)
    .map((m) => ({ ay: m.monthName.slice(0, 3), sapma: m.variancePct }));

  const today = new Date();
  const ytdPeriodLabel = `1 Ocak — ${format(today, 'd MMMM', { locale: tr })}`;
  const tickFmt = (v: number) => `${(v / 1000).toFixed(0)}K`;
  const tooltipStyle = { fontSize: 12, borderRadius: 6 };
  const seasonColors = [C1, C2, C3];

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/finance/gelirler">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />Geri
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Gelir Analizi</h1>
            <p className="text-sm text-gray-500">Dönemsel karşılaştırma ve trend analizi</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border bg-white overflow-hidden">
            <button onClick={() => setCurrency('EUR')}
              className={`px-3 py-1.5 text-sm font-medium flex items-center gap-1 transition-colors ${currency === 'EUR' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
              <Euro className="h-3.5 w-3.5" /> EUR
            </button>
            <button onClick={() => setCurrency('TL')}
              className={`px-3 py-1.5 text-sm font-medium flex items-center gap-1 transition-colors ${currency === 'TL' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
              <BanknoteIcon className="h-3.5 w-3.5" /> TL
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={exportExcel}>
            <Download className="h-4 w-4 mr-2" />Excel İndir
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="ytd">YTD</TabsTrigger>
          <TabsTrigger value="yearly">Yıllık</TabsTrigger>
          <TabsTrigger value="monthly">Aylık</TabsTrigger>
          <TabsTrigger value="budget">Bütçe Sapma</TabsTrigger>
          <TabsTrigger value="season">Sezon Trendi</TabsTrigger>
        </TabsList>

        {/* ══════════════ YTD ══════════════ */}
        <TabsContent value="ytd" className="space-y-4 mt-4">
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-sm text-gray-500">Dönem: <span className="font-medium text-gray-700">{ytdPeriodLabel}</span></p>
            <div className="flex items-center gap-2 ml-auto">
              <Select value={String(ytdYear1)} onValueChange={(v) => setYtdYear1(Number(v))}>
                <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                <SelectContent>{YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
              </Select>
              <span className="text-gray-400 font-bold">vs</span>
              <Select value={String(ytdYear2)} onValueChange={(v) => setYtdYear2(Number(v))}>
                <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                <SelectContent>{YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
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
                <p className="text-xl font-bold mt-1" style={{ color: C2 }}>{ytdTotal2 > 0 ? fmt(ytdTotal2) : '—'}</p>
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
              {ytdLoading ? <div className="h-64 flex items-center justify-center text-gray-400">Yükleniyor...</div>
                : ytdData.length === 0 ? <EmptyState message="Veri bulunamadı" />
                : (
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
              <CardHeader><CardTitle className="text-base">YTD Aylık Detay</CardTitle></CardHeader>
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
                            <td className="py-2.5 px-3 text-right font-semibold" style={{ color: C1 }}>{v1 > 0 ? fmt(v1) : '—'}</td>
                            <td className="py-2.5 px-3 text-right" style={{ color: C2 }}>{v2 > 0 ? fmt(v2) : '—'}</td>
                            <td className="py-2.5 px-3 text-right">
                              {chg !== null ? (
                                <Badge className={chg >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                  {chg >= 0 ? '+' : ''}{chg.toFixed(1)}%
                                </Badge>
                              ) : <span className="text-gray-300 text-xs">—</span>}
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold">
                        <td className="py-2.5 px-3 text-gray-900">Toplam</td>
                        <td className="py-2.5 px-3 text-right" style={{ color: C1 }}>{fmt(ytdTotal1)}</td>
                        <td className="py-2.5 px-3 text-right" style={{ color: C2 }}>{ytdTotal2 > 0 ? fmt(ytdTotal2) : '—'}</td>
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

        {/* ══════════════ YILLIK ══════════════ */}
        <TabsContent value="yearly" className="space-y-4 mt-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={String(year1)} onValueChange={(v) => setYear1(Number(v))}>
              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
              <SelectContent>{YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
            <span className="text-gray-400 font-bold">vs</span>
            <Select value={String(year2)} onValueChange={(v) => setYear2(Number(v))}>
              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
              <SelectContent>{YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={fetchYearly} disabled={yearlyLoading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${yearlyLoading ? 'animate-spin' : ''}`} />Güncelle
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{year1} vs {year2} — Kategori Bazlı Yıllık Gelir</CardTitle>
              <CardDescription>Günlük aktüel gelirlerin yıllık toplamı ({currency})</CardDescription>
            </CardHeader>
            <CardContent>
              {yearlyLoading ? <div className="h-64 flex items-center justify-center text-gray-400">Yükleniyor...</div>
                : yearlyBarData.length === 0 ? <EmptyState message="Veri bulunamadı" />
                : (
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
              <CardHeader><CardTitle className="text-base">Yıllık Değişim Tablosu</CardTitle></CardHeader>
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
                              {CATEGORY_OPTIONS.find((c) => c.value === row.category)?.label ?? (row.category as string).split('/')[0]}
                            </td>
                            <td className="py-2.5 px-3 text-right font-semibold" style={{ color: C1 }}>{v1 > 0 ? fmt(v1) : '—'}</td>
                            <td className="py-2.5 px-3 text-right" style={{ color: C2 }}>
                              {v2 > 0 ? fmt(v2) : <span className="text-gray-400 text-xs">Veri yok</span>}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              {v2 > 0 ? (
                                <Badge className={chg >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                  {chg >= 0 ? '+' : ''}{chg.toFixed(1)}%
                                </Badge>
                              ) : <span className="text-gray-300 text-xs">—</span>}
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

        {/* ══════════════ AYLIK ══════════════ */}
        <TabsContent value="monthly" className="space-y-4 mt-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Select value={String(month1)} onValueChange={(v) => setMonth1(Number(v))}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={String(monthYear1)} onValueChange={(v) => setMonthYear1(Number(v))}>
                <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                <SelectContent>{YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <span className="text-gray-400 font-bold">vs</span>
            <div className="flex items-center gap-2">
              <Select value={String(month2)} onValueChange={(v) => setMonth2(Number(v))}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={String(monthYear2)} onValueChange={(v) => setMonthYear2(Number(v))}>
                <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                <SelectContent>{YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button size="sm" variant="outline" onClick={fetchMonthly} disabled={monthlyLoading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${monthlyLoading ? 'animate-spin' : ''}`} />Güncelle
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{MONTHS[month1 - 1]} {monthYear1} vs {MONTHS[month2 - 1]} {monthYear2}</CardTitle>
              <CardDescription>Günlük gelir karşılaştırması ({currency})</CardDescription>
            </CardHeader>
            <CardContent>
              {monthlyLoading ? <div className="h-64 flex items-center justify-center text-gray-400">Yükleniyor...</div>
                : monthlyData.length === 0 ? <EmptyState message="Veri bulunamadı" />
                : (
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={monthlyData} margin={{ left: 10, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                      <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#374151' }} label={{ value: 'Gün', position: 'insideBottom', offset: -5, fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11, fill: '#374151' }} tickFormatter={tickFmt} />
                      <Tooltip formatter={(v: number) => fmt(v)} contentStyle={tooltipStyle} />
                      <Legend />
                      {Object.keys(monthlyData[0] ?? {}).filter((k) => k !== 'day').map((key, i) => (
                        <Line key={key} type="monotone" dataKey={key} stroke={i === 0 ? C1 : C2}
                          strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════ BÜTÇE SAPMA ══════════════ */}
        <TabsContent value="budget" className="space-y-4 mt-4">
          <div className="flex items-center gap-3">
            <Select value={String(budgetYear)} onValueChange={(v) => setBudgetYear(Number(v))}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>{YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={fetchBudget} disabled={budgetLoading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${budgetLoading ? 'animate-spin' : ''}`} />Güncelle
            </Button>
          </div>

          {budgetLoading ? (
            <div className="h-64 flex items-center justify-center text-gray-400">Yükleniyor...</div>
          ) : budgetBarData.length === 0 ? (
            <EmptyState message="Veri bulunamadı" />
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Gerçekleşen vs Bütçe — {budgetYear}</CardTitle>
                  <CardDescription>Aylık EUR bazlı gelir ve bütçe karşılaştırması</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={budgetBarData} margin={{ left: 10, right: 10 }} barGap={3}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                      <XAxis dataKey="ay" tick={{ fontSize: 11, fill: '#374151' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#374151' }} tickFormatter={tickFmt} />
                      <Tooltip formatter={(v: number) => fmtEUR(v)} contentStyle={tooltipStyle} />
                      <Legend />
                      <Bar dataKey="Gerçekleşen" fill={C1} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Bütçe" fill="#d1d5db" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {budgetVarianceData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Bütçe Sapma Trendi (%) — {budgetYear}</CardTitle>
                    <CardDescription>Pozitif = bütçe üstü, negatif = bütçe altı</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={budgetVarianceData} margin={{ left: 10, right: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                        <XAxis dataKey="ay" tick={{ fontSize: 11, fill: '#374151' }} />
                        <YAxis tick={{ fontSize: 11, fill: '#374151' }} tickFormatter={(v) => `${v}%`} />
                        <Tooltip formatter={(v: number) => [`${v >= 0 ? '+' : ''}${v.toFixed(1)}%`, 'Sapma']} contentStyle={tooltipStyle} />
                        <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="4 2" />
                        {budgetVarianceData.map((d, i) => (
                          <Bar key={i} dataKey="sapma" fill={(d.sapma as number) >= 0 ? '#16a34a' : '#dc2626'} radius={[3, 3, 0, 0]} />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader><CardTitle className="text-base">Aylık Detay Tablosu — {budgetYear}</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="text-left py-2.5 px-3 text-gray-500 font-medium">Ay</th>
                          <th className="text-right py-2.5 px-3 font-semibold" style={{ color: C1 }}>Gerçekleşen</th>
                          <th className="text-right py-2.5 px-3 text-gray-500 font-medium">Bütçe</th>
                          <th className="text-right py-2.5 px-3 text-gray-500 font-medium">Sapma</th>
                          <th className="text-right py-2.5 px-3 text-gray-500 font-medium">Gerçekleşme</th>
                        </tr>
                      </thead>
                      <tbody>
                        {budgetData.map((m) => {
                          const achievement = m.budgetEUR > 0 ? (m.actualEUR / m.budgetEUR) * 100 : null;
                          return (
                            <tr key={m.month} className="border-b last:border-0 hover:bg-gray-50">
                              <td className="py-2.5 px-3 text-gray-700 font-medium">{m.monthName}</td>
                              <td className="py-2.5 px-3 text-right font-semibold" style={{ color: C1 }}>
                                {m.hasData ? fmtEUR(m.actualEUR) : <span className="text-gray-300 text-xs">—</span>}
                              </td>
                              <td className="py-2.5 px-3 text-right text-gray-500">
                                {m.budgetEUR > 0 ? fmtEUR(m.budgetEUR) : <span className="text-gray-300 text-xs">—</span>}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                {m.variancePct !== null ? (
                                  <Badge className={m.variancePct >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                    {m.variancePct >= 0 ? '+' : ''}{m.variancePct.toFixed(1)}%
                                  </Badge>
                                ) : <span className="text-gray-300 text-xs">—</span>}
                              </td>
                              <td className="py-2.5 px-3 text-right text-xs text-gray-600">
                                {achievement !== null ? `${achievement.toFixed(0)}%` : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ══════════════ SEZON TRENDİ ══════════════ */}
        <TabsContent value="season" className="space-y-4 mt-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-gray-500">Karşılaştır:</span>
            {[
              { val: sYear1, set: setSYear1 },
              { val: sYear2, set: setSYear2 },
              { val: sYear3, set: setSYear3 },
            ].map(({ val, set }, idx) => (
              <Select key={idx} value={String(val)} onValueChange={(v) => set(Number(v))}>
                <SelectTrigger className="w-24" style={{ borderColor: seasonColors[idx], color: seasonColors[idx] }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>{YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
              </Select>
            ))}
            <Button size="sm" variant="outline" onClick={fetchSeason} disabled={seasonLoading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${seasonLoading ? 'animate-spin' : ''}`} />Güncelle
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sezon Gelir Trendi — {sYear1} / {sYear2} / {sYear3}</CardTitle>
              <CardDescription>Aylık gerçekleşen gelir (EUR) — sezon karşılaştırması</CardDescription>
            </CardHeader>
            <CardContent>
              {seasonLoading ? (
                <div className="h-64 flex items-center justify-center text-gray-400">Yükleniyor...</div>
              ) : seasonData.length === 0 ? (
                <EmptyState message="Veri bulunamadı" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={seasonData} margin={{ left: 10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="ay" tick={{ fontSize: 11, fill: '#374151' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#374151' }} tickFormatter={tickFmt} />
                    <Tooltip formatter={(v: number) => fmtEUR(v)} contentStyle={tooltipStyle} />
                    <Legend />
                    {[sYear1, sYear2, sYear3].map((y, i) => (
                      <Line key={y} type="monotone" dataKey={String(y)} stroke={seasonColors[i]}
                        strokeWidth={2.5} dot={{ r: 3, fill: seasonColors[i] }} activeDot={{ r: 5 }} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {seasonData.some((d) => (d[String(sYear1)] as number) > 0) && (
            <Card>
              <CardHeader><CardTitle className="text-base">Sezon Karşılaştırma Tablosu</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left py-2.5 px-3 text-gray-500 font-medium">Ay</th>
                        {[sYear1, sYear2, sYear3].map((y, i) => (
                          <th key={y} className="text-right py-2.5 px-3 font-semibold" style={{ color: seasonColors[i] }}>{y}</th>
                        ))}
                        <th className="text-right py-2.5 px-3 text-gray-500 font-medium">Y/Y Değişim</th>
                      </tr>
                    </thead>
                    <tbody>
                      {seasonData.map((row) => {
                        const v1 = row[String(sYear1)] as number;
                        const v2 = row[String(sYear2)] as number;
                        const chg = v2 > 0 ? ((v1 - v2) / v2) * 100 : null;
                        return (
                          <tr key={String(row.ay)} className="border-b last:border-0 hover:bg-gray-50">
                            <td className="py-2.5 px-3 text-gray-700 font-medium">{row.ay}</td>
                            {[sYear1, sYear2, sYear3].map((y, i) => (
                              <td key={y} className="py-2.5 px-3 text-right" style={{ color: seasonColors[i] }}>
                                {(row[String(y)] as number) > 0 ? fmtEUR(row[String(y)] as number) : <span className="text-gray-300 text-xs">—</span>}
                              </td>
                            ))}
                            <td className="py-2.5 px-3 text-right">
                              {chg !== null ? (
                                <Badge className={chg >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                  {chg >= 0 ? '+' : ''}{chg.toFixed(1)}%
                                </Badge>
                              ) : <span className="text-gray-300 text-xs">—</span>}
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
      </Tabs>
    </div>
  );
}
