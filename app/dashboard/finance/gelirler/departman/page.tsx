'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { format, subMonths, addMonths, startOfMonth } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ArrowLeft, ChevronLeft, ChevronRight, RefreshCw, TrendingUp, TrendingDown, Euro } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts';

// ── Types ──────────────────────────────────────────────────────────────────

interface CategoryStats {
  eur: number;
  tl: number;
  budgetEUR: number;
  budgetTL: number;
}

interface StatsPayload {
  monthly: {
    totalEUR: number;
    budgetEUR: number;
    budgetVariancePct: number;
    byCategory: Record<string, CategoryStats>;
  };
  prevMonthly: { totalEUR: number; monthOverMonthPct: number };
}

interface DeptSummary {
  key: string;
  name: string;
  subtitle: string;
  color: string;
  eur: number;
  budgetEUR: number;
  variancePct: number;
  share: number;
  cats: { label: string; eur: number; budgetEUR: number; pct: number }[];
}

// ── Config ─────────────────────────────────────────────────────────────────

const CAT_LABELS: Record<string, string> = {
  'TOTAL ROOM REVENUES': 'Oda Gelirleri',
  'TOTAL EXTRA FOOD REVENUES': 'Yiyecek',
  'TOTAL EXTRA BEVERAGE REVENUES': 'İçecek',
  'TOTAL SPA REVENUE': 'Spa',
  'TOTAL OTHER REVENUES': 'Diğer',
  'TOTAL FOOTBALL REVENUE': 'Futbol',
  'TOTAL A LA CARTE REVENUE': 'Alakart',
  'TOTAL TRANSPORTATIONS REVENUE': 'Transfer',
  'TOTAL SPORT ACADEMY REVENUE': 'Spor Akademi',
};

const DEPT_GROUPS = [
  {
    key: 'rooms',
    name: 'Odalar',
    subtitle: 'Rooms Division',
    color: '#4f46e5',
    cats: ['TOTAL ROOM REVENUES'],
  },
  {
    key: 'fnb',
    name: 'Yiyecek & İçecek',
    subtitle: 'Food & Beverage',
    color: '#0891b2',
    cats: ['TOTAL EXTRA FOOD REVENUES', 'TOTAL EXTRA BEVERAGE REVENUES', 'TOTAL A LA CARTE REVENUE'],
  },
  {
    key: 'spa',
    name: 'Spa & Spor',
    subtitle: 'Leisure',
    color: '#7c3aed',
    cats: ['TOTAL SPA REVENUE', 'TOTAL FOOTBALL REVENUE', 'TOTAL SPORT ACADEMY REVENUE'],
  },
  {
    key: 'other',
    name: 'Diğer',
    subtitle: 'Other Revenues',
    color: '#d97706',
    cats: ['TOTAL OTHER REVENUES', 'TOTAL TRANSPORTATIONS REVENUE'],
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtEUR(n: number) {
  return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(n) + ' €';
}

function buildDepts(byCategory: Record<string, CategoryStats>, totalEUR: number): DeptSummary[] {
  return DEPT_GROUPS.map((g) => {
    const matching = g.cats.map((c) => byCategory[c]).filter(Boolean);
    const eur = matching.reduce((s, v) => s + v.eur, 0);
    const budgetEUR = matching.reduce((s, v) => s + v.budgetEUR, 0);
    const variancePct = budgetEUR > 0 ? ((eur - budgetEUR) / budgetEUR) * 100 : 0;
    const share = totalEUR > 0 ? (eur / totalEUR) * 100 : 0;
    const cats = g.cats
      .map((c) => ({
        label: CAT_LABELS[c] ?? c,
        eur: byCategory[c]?.eur ?? 0,
        budgetEUR: byCategory[c]?.budgetEUR ?? 0,
        pct: (byCategory[c]?.budgetEUR ?? 0) > 0
          ? ((byCategory[c]?.eur ?? 0) / (byCategory[c]?.budgetEUR ?? 0)) * 100
          : 0,
      }))
      .filter((c) => c.eur > 0 || c.budgetEUR > 0);
    return { ...g, eur, budgetEUR, variancePct, share, cats };
  }).filter((d) => d.eur > 0 || d.budgetEUR > 0);
}

// ── Sub-components ─────────────────────────────────────────────────────────

function DeptCard({ dept }: { dept: DeptSummary }) {
  const achievement = dept.budgetEUR > 0 ? (dept.eur / dept.budgetEUR) * 100 : 0;
  const up = dept.variancePct >= 0;
  return (
    <Card className="border-t-4" style={{ borderTopColor: dept.color }}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{dept.name}</CardTitle>
            <CardDescription className="text-xs mt-0.5">{dept.subtitle}</CardDescription>
          </div>
          <Badge className={`text-[10px] ${up ? 'bg-green-100 text-green-700 hover:bg-green-100' : dept.variancePct > -10 ? 'bg-amber-100 text-amber-700 hover:bg-amber-100' : 'bg-red-100 text-red-700 hover:bg-red-100'}`}>
            {up ? '+' : ''}{dept.variancePct.toFixed(1)}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="flex items-end justify-between mb-1">
            <p className="text-2xl font-bold text-gray-900">{fmtEUR(dept.eur)}</p>
            <p className="text-xs text-gray-400">%{dept.share.toFixed(1)} pay</p>
          </div>
          <p className="text-xs text-gray-500">Bütçe: {fmtEUR(dept.budgetEUR)}</p>
          <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(achievement, 100)}%`,
                backgroundColor: dept.color,
                opacity: 0.85,
              }}
            />
          </div>
          <p className="text-[10px] text-gray-400 mt-0.5">{achievement.toFixed(1)}% bütçe gerçekleşme</p>
        </div>

        {dept.cats.length > 1 && (
          <div className="space-y-1.5 pt-1 border-t">
            {dept.cats.map((c) => (
              <div key={c.label} className="flex items-center justify-between text-xs">
                <span className="text-gray-600">{c.label}</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-800">{fmtEUR(c.eur)}</span>
                  {c.budgetEUR > 0 && (
                    <Badge className={`text-[9px] px-1 py-0 ${c.pct >= 100 ? 'bg-green-100 text-green-700 hover:bg-green-100' : c.pct >= 80 ? 'bg-amber-100 text-amber-700 hover:bg-amber-100' : 'bg-red-100 text-red-700 hover:bg-red-100'}`}>
                      {c.pct.toFixed(0)}%
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function DepartmanPage() {
  const [refDate, setRefDate] = useState(() => startOfMonth(new Date()));
  const [data, setData] = useState<StatsPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const dateStr = format(refDate, 'yyyy-MM-dd');
      const res = await fetch(`/api/finance/revenue/stats?date=${dateStr}`);
      const json = await res.json();
      if (json.success) setData(json.data);
    } finally {
      setLoading(false);
    }
  }, [refDate]);

  useEffect(() => { load(); }, [load]);

  const depts = data ? buildDepts(data.monthly.byCategory, data.monthly.totalEUR) : [];

  const barData = depts.map((d) => ({
    name: d.name,
    Gerçekleşen: Math.round(d.eur),
    Bütçe: Math.round(d.budgetEUR),
    color: d.color,
  }));

  const monthLabel = format(refDate, 'MMMM yyyy', { locale: tr });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/finance">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Departman Raporları</h1>
            <p className="text-sm text-gray-500">Gelir dağılımı ve bütçe performansı</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Month nav */}
          <div className="flex items-center gap-1 border rounded-lg overflow-hidden bg-white">
            <button
              onClick={() => setRefDate((d) => startOfMonth(subMonths(d, 1)))}
              className="p-1.5 hover:bg-gray-50 text-gray-500"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 text-sm font-medium text-gray-700 capitalize min-w-[120px] text-center">
              {monthLabel}
            </span>
            <button
              onClick={() => setRefDate((d) => startOfMonth(addMonths(d, 1)))}
              className="p-1.5 hover:bg-gray-50 text-gray-500"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-400">
          <RefreshCw className="h-5 w-5 animate-spin mr-2" />
          Yükleniyor...
        </div>
      ) : depts.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
          <Euro className="h-10 w-10 opacity-30" />
          <p className="font-medium">{monthLabel} için veri bulunamadı</p>
          <Link href="/dashboard/finance/gelirler/yukle">
            <Button size="sm" variant="outline">Veri Yükle</Button>
          </Link>
        </div>
      ) : (
        <>
          {/* Summary row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {depts.map((d) => (
              <div key={d.key} className="flex items-start gap-3 p-4 rounded-xl border bg-white">
                <div className="w-2.5 h-10 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: d.color }} />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide truncate">{d.name}</p>
                  <p className="text-lg font-bold text-gray-900 mt-0.5">{fmtEUR(d.eur)}</p>
                  <div className={`flex items-center gap-1 text-xs font-medium mt-0.5 ${d.variancePct >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {d.variancePct >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {d.variancePct >= 0 ? '+' : ''}{d.variancePct.toFixed(1)}% bütçe
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Comparison Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-600">
                Gerçekleşen vs Bütçe — {monthLabel}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData} margin={{ left: 8, right: 8, top: 4, bottom: 0 }} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#374151' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false}
                    tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`}
                  />
                  <Tooltip
                    formatter={(v: number) => fmtEUR(v)}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Gerçekleşen" radius={[4, 4, 0, 0]}>
                    {barData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                  <Bar dataKey="Bütçe" fill="#e5e7eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Department Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {depts.map((d) => (
              <DeptCard key={d.key} dept={d} />
            ))}
          </div>

          {/* Summary Table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-600">Departman Özet Tablosu</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-2.5 px-3 text-gray-500 font-medium">Departman</th>
                      <th className="text-right py-2.5 px-3 text-gray-500 font-medium">Gerçekleşen</th>
                      <th className="text-right py-2.5 px-3 text-gray-500 font-medium">Bütçe</th>
                      <th className="text-right py-2.5 px-3 text-gray-500 font-medium">Gerçekleşme</th>
                      <th className="text-right py-2.5 px-3 text-gray-500 font-medium">Toplam Pay</th>
                      <th className="text-right py-2.5 px-3 text-gray-500 font-medium">Sapma</th>
                    </tr>
                  </thead>
                  <tbody>
                    {depts.map((d) => {
                      const achievement = d.budgetEUR > 0 ? (d.eur / d.budgetEUR) * 100 : 0;
                      return (
                        <tr key={d.key} className="border-b last:border-0 hover:bg-gray-50">
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-4 rounded-sm" style={{ backgroundColor: d.color }} />
                              <span className="font-medium text-gray-700">{d.name}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold text-gray-900">
                            {fmtEUR(d.eur)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-gray-500">
                            {d.budgetEUR > 0 ? fmtEUR(d.budgetEUR) : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {d.budgetEUR > 0 ? (
                              <div className="flex items-center justify-end gap-2">
                                <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full"
                                    style={{
                                      width: `${Math.min(achievement, 100)}%`,
                                      backgroundColor: d.color,
                                    }}
                                  />
                                </div>
                                <span className="text-xs text-gray-600 w-10 text-right">
                                  {achievement.toFixed(0)}%
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-300 text-xs">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right text-gray-600 text-xs">
                            %{d.share.toFixed(1)}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {d.budgetEUR > 0 ? (
                              <Badge className={`text-[10px] ${d.variancePct >= 0 ? 'bg-green-100 text-green-700 hover:bg-green-100' : d.variancePct > -10 ? 'bg-amber-100 text-amber-700 hover:bg-amber-100' : 'bg-red-100 text-red-700 hover:bg-red-100'}`}>
                                {d.variancePct >= 0 ? '+' : ''}{d.variancePct.toFixed(1)}%
                              </Badge>
                            ) : (
                              <span className="text-gray-300 text-xs">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold">
                      <td className="py-2.5 px-3 text-gray-900">Toplam</td>
                      <td className="py-2.5 px-3 text-right text-gray-900">
                        {fmtEUR(data?.monthly.totalEUR ?? 0)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-gray-600">
                        {fmtEUR(data?.monthly.budgetEUR ?? 0)}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {data?.monthly.budgetEUR ? (
                          <span className="text-xs text-gray-600">
                            {((data.monthly.totalEUR / data.monthly.budgetEUR) * 100).toFixed(0)}%
                          </span>
                        ) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right text-gray-600 text-xs">%100</td>
                      <td className="py-2.5 px-3 text-right">
                        <Badge className={`text-[10px] ${(data?.monthly.budgetVariancePct ?? 0) >= 0 ? 'bg-green-100 text-green-700 hover:bg-green-100' : 'bg-red-100 text-red-700 hover:bg-red-100'}`}>
                          {(data?.monthly.budgetVariancePct ?? 0) >= 0 ? '+' : ''}
                          {(data?.monthly.budgetVariancePct ?? 0).toFixed(1)}%
                        </Badge>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
