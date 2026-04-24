'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ArrowLeft, TrendingUp, TrendingDown, Euro, BanknoteIcon } from 'lucide-react';
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

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ec4899', '#14b8a6', '#f97316', '#8b5cf6', '#06b6d4', '#84cc16'];

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
}

function fmtEUR(n: number) {
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + ' €';
}
function fmtTL(n: number) {
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + ' ₺';
}

export default function DayDetailPage() {
  const params = useParams();
  const dateParam = params.date as string;
  const [entries, setEntries] = useState<RevenueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState<'EUR' | 'TL'>('EUR');
  const [expandedCat, setExpandedCat] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/finance/revenue?date=${dateParam}`);
        const json = await res.json();
        if (json.success) setEntries(json.data);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [dateParam]);

  const totals = entries.filter((e) => e.isTotal);
  const grandTotal = totals.reduce(
    (s, e) => ({
      dailyEUR: s.dailyEUR + e.dailyActualEUR,
      dailyTL: s.dailyTL + e.dailyActualTL,
      monthlyEUR: s.monthlyEUR + e.monthlyActualEUR,
      monthlyTL: s.monthlyTL + e.monthlyActualTL,
      budgetEUR: s.budgetEUR + e.monthlyBudgetEUR,
      budgetTL: s.budgetTL + e.monthlyBudgetTL,
    }),
    { dailyEUR: 0, dailyTL: 0, monthlyEUR: 0, monthlyTL: 0, budgetEUR: 0, budgetTL: 0 }
  );

  const budgetPct =
    grandTotal.budgetEUR > 0
      ? ((grandTotal.monthlyEUR - grandTotal.budgetEUR) / grandTotal.budgetEUR) * 100
      : 0;

  const barData = totals.map((e, i) => ({
    name: CAT_LABELS[TOTAL_CATS.find((t) => e.category.toUpperCase().startsWith(t)) ?? ''] ?? e.category.split('/')[0].slice(0, 15),
    Günlük: currency === 'EUR' ? e.dailyActualEUR : e.dailyActualTL,
    fill: COLORS[i % COLORS.length],
  }));

  const getChildren = (parentCat: string) =>
    entries.filter((e) => !e.isTotal && e.parentCategory === parentCat && (currency === 'EUR' ? e.dailyActualEUR : e.dailyActualTL) !== 0);

  const fmt = (v: number) => (currency === 'EUR' ? fmtEUR(v) : fmtTL(v));
  const daily = (e: RevenueEntry) => (currency === 'EUR' ? e.dailyActualEUR : e.dailyActualTL);
  const monthly = (e: RevenueEntry) => (currency === 'EUR' ? e.monthlyActualEUR : e.monthlyActualTL);
  const budget = (e: RevenueEntry) => (currency === 'EUR' ? e.monthlyBudgetEUR : e.monthlyBudgetTL);

  let displayDate: string;
  try {
    displayDate = format(new Date(dateParam), 'dd MMMM yyyy, EEEE', { locale: tr });
  } catch {
    displayDate = dateParam;
  }

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
            <h1 className="text-xl font-bold text-gray-900 capitalize">{displayDate}</h1>
            <p className="text-sm text-gray-500">Günlük gelir detayı</p>
          </div>
        </div>
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
          {/* Özet Kartlar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Günlük Gelir</CardDescription>
                <CardTitle className="text-xl">{fmt(currency === 'EUR' ? grandTotal.dailyEUR : grandTotal.dailyTL)}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Aylık Gerçekleşen</CardDescription>
                <CardTitle className="text-xl">{fmt(currency === 'EUR' ? grandTotal.monthlyEUR : grandTotal.monthlyTL)}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Aylık Bütçe</CardDescription>
                <CardTitle className="text-xl">{fmt(currency === 'EUR' ? grandTotal.budgetEUR : grandTotal.budgetTL)}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Bütçe Sapması</CardDescription>
                <CardTitle className={`text-xl flex items-center gap-1 ${budgetPct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {budgetPct >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                  {budgetPct.toFixed(1)}%
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Günlük Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Günlük Gelir — Kategori Dağılımı</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={barData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
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

          {/* Kategori Detayları */}
          <div className="space-y-3">
            {totals.map((total, i) => {
              const children = getChildren(total.category);
              const isExpanded = expandedCat === total.category;
              const bPct = budget(total) > 0 ? ((monthly(total) - budget(total)) / budget(total)) * 100 : 0;

              return (
                <Card key={total.id}>
                  <CardHeader
                    className="pb-3 cursor-pointer"
                    onClick={() => setExpandedCat(isExpanded ? null : total.category)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-10 rounded-sm flex-shrink-0"
                          style={{ backgroundColor: COLORS[i % COLORS.length] }}
                        />
                        <div>
                          <CardTitle className="text-sm font-semibold">
                            {CAT_LABELS[TOTAL_CATS.find((t) => total.category.toUpperCase().startsWith(t)) ?? ''] ?? total.category.split('/')[0].trim()}
                          </CardTitle>
                          <CardDescription className="text-xs">{children.length} alt kalem</CardDescription>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-800">{fmt(daily(total))}</p>
                        <p className="text-xs text-gray-500">Günlük</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mt-3 text-sm">
                      <div>
                        <p className="text-xs text-gray-400">Aylık Gerçekleşen</p>
                        <p className="font-medium">{fmt(monthly(total))}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Aylık Bütçe</p>
                        <p className="font-medium">{fmt(budget(total))}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Sapma</p>
                        <Badge
                          className={`text-xs ${bPct >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                        >
                          {bPct >= 0 ? '+' : ''}{bPct.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>

                  {isExpanded && children.length > 0 && (
                    <CardContent className="pt-0">
                      <div className="border-t pt-3 space-y-2">
                        {children.map((child) => (
                          <div
                            key={child.id}
                            className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-gray-50 text-sm"
                          >
                            <span className="text-gray-600 truncate max-w-xs">{child.category}</span>
                            <div className="flex items-center gap-6 text-right flex-shrink-0">
                              <div>
                                <p className="text-xs text-gray-400">Günlük</p>
                                <p className="font-medium text-gray-800">{fmt(daily(child))}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-400">Aylık</p>
                                <p className="text-gray-600">{fmt(monthly(child))}</p>
                              </div>
                            </div>
                          </div>
                        ))}
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
