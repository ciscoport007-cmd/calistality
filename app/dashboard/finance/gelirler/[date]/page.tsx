'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Euro,
  BanknoteIcon,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

const TOTAL_CATS = [
  'TOTAL ROOM REVENUES',
  'TOTAL EXTRA FOOD REVENUES',
  'TOTAL EXTRA BEVERAGE REVENUES',
  'TOTAL SPA REVENUE',
  'TOTAL OTHER REVENUES',
  'TOTAL FOOTBALL REVENUE',
  'TOTAL A LA CARTE REVENUE',
  'TOTAL TRANSPORTATIONS REVENUE',
  'TOTAL SPORT ACADEMY REVENUE',
];

const CAT_LABELS: Record<string, string> = {
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

const COLORS = [
  '#6366f1', '#22c55e', '#f59e0b', '#ec4899',
  '#14b8a6', '#f97316', '#8b5cf6', '#06b6d4', '#84cc16',
];

interface RevenueEntry {
  id: string;
  category: string;
  parentCategory: string | null;
  isTotal: boolean;
  dailyActualTL: number;
  dailyActualEUR: number;
  monthlyActualTL: number;
  monthlyActualEUR: number;
  monthlyBudgetTL: number;
  monthlyBudgetEUR: number;
  yearlyActualEUR: number;
  yearlyBudgetEUR: number;
  lyDailyEUR: number;
  lyMonthlyEUR: number;
  lyYearlyEUR: number;
}

function fmtEUR(n: number) {
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + ' €';
}
function fmtTL(n: number) {
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + ' ₺';
}
function pctDiff(actual: number, ref: number): number | null {
  if (!ref) return null;
  return ((actual - ref) / ref) * 100;
}
function pctColor(p: number) {
  return p >= 0 ? 'text-green-600' : 'text-red-600';
}
function pctStr(p: number) {
  return `${p >= 0 ? '+' : ''}${p.toFixed(1)}%`;
}

export default function DayDetailPage() {
  const params = useParams();
  const dateParam = params.date as string;
  const [entries, setEntries] = useState<RevenueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState<'EUR' | 'TL'>('EUR');
  const [expandedCat, setExpandedCat] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/finance/revenue?date=${dateParam}`)
      .then((r) => r.json())
      .then((json) => { if (json.success) setEntries(json.data); })
      .finally(() => setLoading(false));
  }, [dateParam]);

  const isEUR = currency === 'EUR';
  const fmt = (v: number) => (isEUR ? fmtEUR(v) : fmtTL(v));
  const daily = (e: RevenueEntry) => (isEUR ? e.dailyActualEUR : e.dailyActualTL);
  const monthly = (e: RevenueEntry) => (isEUR ? e.monthlyActualEUR : e.monthlyActualTL);
  const budget = (e: RevenueEntry) => (isEUR ? e.monthlyBudgetEUR : e.monthlyBudgetTL);

  const totals = entries.filter((e) => e.isTotal);

  // Show ALL sub-items, not just non-zero daily ones
  const getChildren = (parentCat: string) =>
    entries.filter((e) => !e.isTotal && e.parentCategory === parentCat);

  const grandTotal = totals.reduce(
    (s, e) => ({
      dailyEUR: s.dailyEUR + e.dailyActualEUR,
      dailyTL: s.dailyTL + e.dailyActualTL,
      monthlyEUR: s.monthlyEUR + e.monthlyActualEUR,
      monthlyTL: s.monthlyTL + e.monthlyActualTL,
      budgetEUR: s.budgetEUR + e.monthlyBudgetEUR,
      budgetTL: s.budgetTL + e.monthlyBudgetTL,
      ytdEUR: s.ytdEUR + e.yearlyActualEUR,
      ytdBudgetEUR: s.ytdBudgetEUR + e.yearlyBudgetEUR,
      lyDailyEUR: s.lyDailyEUR + e.lyDailyEUR,
      lyMonthlyEUR: s.lyMonthlyEUR + e.lyMonthlyEUR,
      lyYearlyEUR: s.lyYearlyEUR + e.lyYearlyEUR,
    }),
    {
      dailyEUR: 0, dailyTL: 0, monthlyEUR: 0, monthlyTL: 0,
      budgetEUR: 0, budgetTL: 0, ytdEUR: 0, ytdBudgetEUR: 0,
      lyDailyEUR: 0, lyMonthlyEUR: 0, lyYearlyEUR: 0,
    }
  );

  const gDailyVal = isEUR ? grandTotal.dailyEUR : grandTotal.dailyTL;
  const gMonthlyVal = isEUR ? grandTotal.monthlyEUR : grandTotal.monthlyTL;
  const gBudgetVal = isEUR ? grandTotal.budgetEUR : grandTotal.budgetTL;

  const budgetPct = pctDiff(grandTotal.monthlyEUR, grandTotal.budgetEUR);
  const lyDailyPct = pctDiff(grandTotal.dailyEUR, grandTotal.lyDailyEUR);
  const lyMonthlyPct = pctDiff(grandTotal.monthlyEUR, grandTotal.lyMonthlyEUR);
  const ytdPct = pctDiff(grandTotal.ytdEUR, grandTotal.ytdBudgetEUR);
  const lyYtdPct = pctDiff(grandTotal.ytdEUR, grandTotal.lyYearlyEUR);

  const barData = totals.map((e, i) => ({
    name:
      CAT_LABELS[TOTAL_CATS.find((t) => e.category.toUpperCase().startsWith(t)) ?? ''] ??
      e.category.split('/')[0].slice(0, 15),
    Günlük: daily(e),
    fill: COLORS[i % COLORS.length],
  }));

  let displayDate = dateParam;
  try {
    displayDate = format(new Date(dateParam), 'dd MMMM yyyy, EEEE', { locale: tr });
  } catch {
    // keep raw
  }

  const catLabel = (cat: string) =>
    CAT_LABELS[TOTAL_CATS.find((t) => cat.toUpperCase().startsWith(t)) ?? ''] ??
    cat.split('/')[0].trim();

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
            <h1 className="text-xl font-bold text-gray-900 capitalize">{displayDate}</h1>
            <p className="text-sm text-gray-500">Günlük gelir detayı</p>
          </div>
        </div>
        <div className="flex rounded-lg border bg-white overflow-hidden">
          <button
            onClick={() => setCurrency('EUR')}
            className={`px-3 py-1.5 text-sm font-medium flex items-center gap-1 transition-colors ${
              isEUR ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Euro className="h-3.5 w-3.5" /> EUR
          </button>
          <button
            onClick={() => setCurrency('TL')}
            className={`px-3 py-1.5 text-sm font-medium flex items-center gap-1 transition-colors ${
              !isEUR ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <BanknoteIcon className="h-3.5 w-3.5" /> TL
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-gray-400">Yükleniyor...</div>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64 gap-3">
            <p className="text-gray-400">Bu tarihe ait veri bulunamadı</p>
            <Link href="/dashboard/finance/gelirler/yukle">
              <Button size="sm" variant="outline">Veri Yükle</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ── Özet KPI Kartları ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
            {/* Günlük Gelir */}
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardDescription className="text-xs">Günlük Gelir</CardDescription>
                <CardTitle className="text-lg leading-tight">{fmt(gDailyVal)}</CardTitle>
                {lyDailyPct !== null && (
                  <p className={`text-xs font-medium ${pctColor(lyDailyPct)}`}>
                    LY: {pctStr(lyDailyPct)}
                  </p>
                )}
              </CardHeader>
            </Card>

            {/* Aylık Gerçekleşen */}
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardDescription className="text-xs">Aylık Gerçekleşen</CardDescription>
                <CardTitle className="text-lg leading-tight">{fmt(gMonthlyVal)}</CardTitle>
                {lyMonthlyPct !== null && (
                  <p className={`text-xs font-medium ${pctColor(lyMonthlyPct)}`}>
                    LY: {pctStr(lyMonthlyPct)}
                  </p>
                )}
              </CardHeader>
            </Card>

            {/* Aylık Bütçe */}
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardDescription className="text-xs">Aylık Bütçe</CardDescription>
                <CardTitle className="text-lg leading-tight">{fmt(gBudgetVal)}</CardTitle>
              </CardHeader>
            </Card>

            {/* Bütçe Sapması */}
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardDescription className="text-xs">Bütçe Sapması</CardDescription>
                {budgetPct !== null ? (
                  <CardTitle className={`text-lg flex items-center gap-1 ${pctColor(budgetPct)}`}>
                    {budgetPct >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    {pctStr(budgetPct)}
                  </CardTitle>
                ) : (
                  <CardTitle className="text-lg text-gray-400">—</CardTitle>
                )}
              </CardHeader>
            </Card>

            {/* YTD Gerçekleşen */}
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardDescription className="text-xs">YTD Gerçekleşen</CardDescription>
                <CardTitle className="text-lg leading-tight">{fmtEUR(grandTotal.ytdEUR)}</CardTitle>
                {lyYtdPct !== null && (
                  <p className={`text-xs font-medium ${pctColor(lyYtdPct)}`}>
                    LY: {pctStr(lyYtdPct)}
                  </p>
                )}
              </CardHeader>
            </Card>

            {/* YTD Bütçe Sapması */}
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardDescription className="text-xs">YTD Bütçe Sapması</CardDescription>
                {ytdPct !== null ? (
                  <CardTitle className={`text-lg flex items-center gap-1 ${pctColor(ytdPct)}`}>
                    {ytdPct >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    {pctStr(ytdPct)}
                  </CardTitle>
                ) : (
                  <CardTitle className="text-lg text-gray-400">—</CardTitle>
                )}
              </CardHeader>
            </Card>
          </div>

          {/* ── Bar Chart ── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Günlük Gelir — Kategori Dağılımı</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={barData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                  />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={70} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Bar dataKey="Günlük" radius={[0, 4, 4, 0]}>
                    {barData.map((d, i) => (
                      <Cell key={i} fill={d.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* ── Kategori Kartları ── */}
          <div className="space-y-3">
            {totals.map((total, i) => {
              const children = getChildren(total.category);
              const isExpanded = expandedCat === total.category;

              const bPct = pctDiff(monthly(total), budget(total));
              const lyDPct = pctDiff(daily(total), total.lyDailyEUR);
              const lyMPct = pctDiff(monthly(total), total.lyMonthlyEUR);
              const ytdBPct = pctDiff(total.yearlyActualEUR, total.yearlyBudgetEUR);
              const lyYPct = pctDiff(total.yearlyActualEUR, total.lyYearlyEUR);

              return (
                <Card
                  key={total.id}
                  className={`transition-all ${isExpanded ? 'ring-1 ring-indigo-300' : ''}`}
                >
                  <CardHeader
                    className="pb-3 cursor-pointer select-none"
                    onClick={() => setExpandedCat(isExpanded ? null : total.category)}
                  >
                    {/* Top row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-10 rounded-sm flex-shrink-0"
                          style={{ backgroundColor: COLORS[i % COLORS.length] }}
                        />
                        <div>
                          <CardTitle className="text-sm font-semibold">
                            {catLabel(total.category)}
                          </CardTitle>
                          <CardDescription className="text-xs">
                            {children.length} alt kalem
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-bold text-gray-800">{fmt(daily(total))}</p>
                          {lyDPct !== null && (
                            <p className={`text-xs font-medium ${pctColor(lyDPct)}`}>
                              LY {pctStr(lyDPct)}
                            </p>
                          )}
                        </div>
                        {isExpanded
                          ? <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          : <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />}
                      </div>
                    </div>

                    {/* Metrics grid — 6 columns */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mt-3 text-sm">
                      <div>
                        <p className="text-xs text-gray-400">Aylık Gerç.</p>
                        <p className="font-medium">{fmt(monthly(total))}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Aylık Bütçe</p>
                        <p className="font-medium">{fmt(budget(total))}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Bütçe Sapma</p>
                        {bPct !== null ? (
                          <Badge className={`text-xs ${bPct >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {pctStr(bPct)}
                          </Badge>
                        ) : <span className="text-gray-400 text-xs">—</span>}
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">YTD Gerç.</p>
                        <p className="font-medium">{fmtEUR(total.yearlyActualEUR)}</p>
                        {ytdBPct !== null && (
                          <p className={`text-xs ${pctColor(ytdBPct)}`}>{pctStr(ytdBPct)}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">LY Aylık</p>
                        <p className="font-medium">{fmtEUR(total.lyMonthlyEUR)}</p>
                        {lyMPct !== null && (
                          <p className={`text-xs ${pctColor(lyMPct)}`}>{pctStr(lyMPct)}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">LY YTD</p>
                        <p className="font-medium">{fmtEUR(total.lyYearlyEUR)}</p>
                        {lyYPct !== null && (
                          <p className={`text-xs ${pctColor(lyYPct)}`}>{pctStr(lyYPct)}</p>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  {/* ── Alt Kırılım Tablosu ── */}
                  {isExpanded && (
                    <CardContent className="pt-0 pb-4">
                      <div className="border-t">
                        {children.length === 0 ? (
                          <p className="text-sm text-gray-400 py-4 text-center">
                            Alt kırılım bulunamadı
                          </p>
                        ) : (
                          <div className="overflow-x-auto mt-3">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-gray-400 border-b">
                                  <th className="text-left pb-2 font-medium pr-3 min-w-[160px]">
                                    Kategori
                                  </th>
                                  <th className="text-right pb-2 font-medium px-2 whitespace-nowrap">
                                    Günlük
                                  </th>
                                  <th className="text-right pb-2 font-medium px-2 whitespace-nowrap text-gray-300">
                                    LY Gün.
                                  </th>
                                  <th className="text-right pb-2 font-medium px-2 whitespace-nowrap">
                                    Aylık Gerç.
                                  </th>
                                  <th className="text-right pb-2 font-medium px-2 whitespace-nowrap">
                                    Aylık Bütçe
                                  </th>
                                  <th className="text-right pb-2 font-medium px-2 whitespace-nowrap">
                                    Sapma%
                                  </th>
                                  <th className="text-right pb-2 font-medium px-2 whitespace-nowrap">
                                    YTD
                                  </th>
                                  <th className="text-right pb-2 font-medium px-2 whitespace-nowrap text-gray-300">
                                    LY Aylık
                                  </th>
                                  <th className="text-right pb-2 font-medium px-2 whitespace-nowrap text-gray-300">
                                    LY YTD
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50">
                                {children.map((child) => {
                                  const bP = pctDiff(monthly(child), budget(child));
                                  const hasValue =
                                    daily(child) !== 0 || monthly(child) !== 0 || child.yearlyActualEUR !== 0;
                                  return (
                                    <tr
                                      key={child.id}
                                      className={`transition-colors ${
                                        hasValue ? 'hover:bg-indigo-50/40' : 'opacity-35'
                                      }`}
                                    >
                                      <td className="py-1.5 pr-3 text-gray-700 max-w-[200px]">
                                        <span
                                          className="block truncate"
                                          title={child.category}
                                        >
                                          {child.category}
                                        </span>
                                      </td>
                                      <td className="py-1.5 text-right px-2 font-semibold text-gray-800">
                                        {fmt(daily(child))}
                                      </td>
                                      <td className="py-1.5 text-right px-2 text-gray-400">
                                        {fmtEUR(child.lyDailyEUR)}
                                      </td>
                                      <td className="py-1.5 text-right px-2 text-gray-700">
                                        {fmt(monthly(child))}
                                      </td>
                                      <td className="py-1.5 text-right px-2 text-gray-500">
                                        {fmt(budget(child))}
                                      </td>
                                      <td className="py-1.5 text-right px-2">
                                        {bP !== null ? (
                                          <span className={`font-medium ${pctColor(bP)}`}>
                                            {pctStr(bP)}
                                          </span>
                                        ) : (
                                          <span className="text-gray-300">—</span>
                                        )}
                                      </td>
                                      <td className="py-1.5 text-right px-2 text-gray-600">
                                        {fmtEUR(child.yearlyActualEUR)}
                                      </td>
                                      <td className="py-1.5 text-right px-2 text-gray-400">
                                        {fmtEUR(child.lyMonthlyEUR)}
                                      </td>
                                      <td className="py-1.5 text-right px-2 text-gray-400">
                                        {fmtEUR(child.lyYearlyEUR)}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                              {/* Toplam satırı */}
                              <tfoot>
                                <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold text-gray-800">
                                  <td className="py-2 pr-3">Toplam</td>
                                  <td className="py-2 text-right px-2">{fmt(daily(total))}</td>
                                  <td className="py-2 text-right px-2 text-gray-500">
                                    {fmtEUR(total.lyDailyEUR)}
                                  </td>
                                  <td className="py-2 text-right px-2">{fmt(monthly(total))}</td>
                                  <td className="py-2 text-right px-2">{fmt(budget(total))}</td>
                                  <td className="py-2 text-right px-2">
                                    {bPct !== null ? (
                                      <span className={pctColor(bPct)}>{pctStr(bPct)}</span>
                                    ) : (
                                      '—'
                                    )}
                                  </td>
                                  <td className="py-2 text-right px-2">
                                    {fmtEUR(total.yearlyActualEUR)}
                                  </td>
                                  <td className="py-2 text-right px-2 text-gray-500">
                                    {fmtEUR(total.lyMonthlyEUR)}
                                  </td>
                                  <td className="py-2 text-right px-2 text-gray-500">
                                    {fmtEUR(total.lyYearlyEUR)}
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
