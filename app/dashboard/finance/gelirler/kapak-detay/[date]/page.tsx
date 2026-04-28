'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ChevronDown, ChevronRight, BarChart2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Entry {
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

interface GroupedData {
  grouped: { total: Entry; items: Entry[] }[];
  orphans: Entry[];
}

const CATEGORY_COLORS: Record<string, string> = {
  'TOTAL ROOM': 'bg-blue-50 dark:bg-blue-950/30',
  'TOTAL EXTRA FOOD': 'bg-orange-50 dark:bg-orange-950/30',
  'TOTAL EXTRA BEVERAGE': 'bg-amber-50 dark:bg-amber-950/30',
  'TOTAL SPA': 'bg-purple-50 dark:bg-purple-950/30',
  'TOTAL FOOTBALL': 'bg-green-50 dark:bg-green-950/30',
  'TOTAL A LA CARTE': 'bg-rose-50 dark:bg-rose-950/30',
  'TOTAL TRANSPORTATIONS': 'bg-sky-50 dark:bg-sky-950/30',
  'TOTAL SPORT ACADEMY': 'bg-teal-50 dark:bg-teal-950/30',
  'TOTAL OTHER': 'bg-slate-50 dark:bg-slate-950/30',
};

function getCategoryColor(category: string): string {
  for (const [key, cls] of Object.entries(CATEGORY_COLORS)) {
    if (category.toUpperCase().startsWith(key)) return cls;
  }
  return 'bg-muted/30';
}

function shortLabel(category: string): string {
  // Remove the " / Türkçe karşılığı" suffix
  return category.split(' / ')[0].trim();
}

const fmt = (n: number, decimals = 0) =>
  n === 0 ? '-' : n.toLocaleString('tr-TR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const fmtEUR = (n: number) => (n === 0 ? '-' : `€${fmt(n, 2)}`);
const fmtTL = (n: number) => (n === 0 ? '-' : `₺${fmt(n, 2)}`);

function formatDate(dateStr: string): string {
  const months = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
  const d = new Date(dateStr);
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function ColHeader({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <th className="px-2 py-2 text-center text-xs font-semibold whitespace-nowrap border-b">
      <div>{children}</div>
      {sub && <div className="text-[10px] font-normal text-muted-foreground">{sub}</div>}
    </th>
  );
}

function DataCell({ value, className }: { value: string; className?: string }) {
  return (
    <td className={cn('px-2 py-1.5 text-right text-xs tabular-nums whitespace-nowrap', className)}>
      {value}
    </td>
  );
}

function computeGrandTotal(groups: { total: Entry; items: Entry[] }[]): Entry {
  const sum = (key: keyof Entry) =>
    groups.reduce((acc, g) => acc + (g.total[key] as number), 0);
  return {
    id: '__grand_total__',
    category: 'TOPLAM',
    parentCategory: null,
    isTotal: true,
    dailyActualTL: sum('dailyActualTL'),
    dailyActualEUR: sum('dailyActualEUR'),
    monthlyActualTL: sum('monthlyActualTL'),
    monthlyActualEUR: sum('monthlyActualEUR'),
    monthlyBudgetTL: sum('monthlyBudgetTL'),
    monthlyBudgetEUR: sum('monthlyBudgetEUR'),
    yearlyActualEUR: sum('yearlyActualEUR'),
    yearlyBudgetEUR: sum('yearlyBudgetEUR'),
    lyDailyEUR: sum('lyDailyEUR'),
    lyMonthlyEUR: sum('lyMonthlyEUR'),
    lyYearlyEUR: sum('lyYearlyEUR'),
  };
}

function GrandTotalRow({ total }: { total: Entry }) {
  return (
    <tr className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-b-2 border-gray-700 dark:border-gray-300">
      <td className="px-3 py-2.5 sticky left-0 z-10 bg-gray-900 dark:bg-gray-100">
        <div className="flex items-center gap-1.5 min-w-[220px]">
          <span className="font-bold text-xs tracking-wide uppercase">TOPLAM</span>
        </div>
      </td>
      <DataCell value={fmtTL(total.dailyActualTL)} className="font-bold text-white dark:text-gray-900" />
      <DataCell value={fmtEUR(total.dailyActualEUR)} className="font-bold text-white dark:text-gray-900" />
      <DataCell value={fmtTL(total.monthlyActualTL)} className="font-bold text-white dark:text-gray-900" />
      <DataCell value={fmtEUR(total.monthlyActualEUR)} className="font-bold text-white dark:text-gray-900" />
      <DataCell value={fmtTL(total.monthlyBudgetTL)} className="font-bold text-white dark:text-gray-900" />
      <DataCell value={fmtEUR(total.monthlyBudgetEUR)} className="font-bold text-white dark:text-gray-900" />
      <DataCell value={fmtEUR(total.yearlyActualEUR)} className="font-bold text-white dark:text-gray-900" />
      <DataCell value={fmtEUR(total.yearlyBudgetEUR)} className="font-bold text-white dark:text-gray-900" />
      <DataCell value={fmtEUR(total.lyDailyEUR)} className="font-bold text-gray-300 dark:text-gray-600" />
      <DataCell value={fmtEUR(total.lyMonthlyEUR)} className="font-bold text-gray-300 dark:text-gray-600" />
      <DataCell value={fmtEUR(total.lyYearlyEUR)} className="font-bold text-gray-300 dark:text-gray-600" />
    </tr>
  );
}

function GroupRow({
  group,
  open,
  onToggle,
}: {
  group: { total: Entry; items: Entry[] };
  open: boolean;
  onToggle: () => void;
}) {
  const t = group.total;
  const color = getCategoryColor(t.category);

  return (
    <>
      {/* Total row */}
      <tr
        className={cn('cursor-pointer select-none hover:opacity-90 transition-opacity', color)}
        onClick={onToggle}
      >
        <td className="px-3 py-2 sticky left-0 z-10" style={{ background: 'inherit' }}>
          <div className="flex items-center gap-1.5 min-w-[220px]">
            {group.items.length > 0 ? (
              open ? <ChevronDown className="w-3.5 h-3.5 shrink-0 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
            ) : (
              <span className="w-3.5" />
            )}
            <span className="font-semibold text-xs">{shortLabel(t.category)}</span>
            {group.items.length > 0 && (
              <Badge variant="secondary" className="ml-auto text-[10px] py-0 h-4">{group.items.length}</Badge>
            )}
          </div>
        </td>
        <DataCell value={fmtTL(t.dailyActualTL)} className="font-semibold" />
        <DataCell value={fmtEUR(t.dailyActualEUR)} className="font-semibold" />
        <DataCell value={fmtTL(t.monthlyActualTL)} className="font-semibold" />
        <DataCell value={fmtEUR(t.monthlyActualEUR)} className="font-semibold" />
        <DataCell value={fmtTL(t.monthlyBudgetTL)} className="font-semibold" />
        <DataCell value={fmtEUR(t.monthlyBudgetEUR)} className="font-semibold" />
        <DataCell value={fmtEUR(t.yearlyActualEUR)} className="font-semibold" />
        <DataCell value={fmtEUR(t.yearlyBudgetEUR)} className="font-semibold" />
        <DataCell value={fmtEUR(t.lyDailyEUR)} className="font-semibold text-muted-foreground" />
        <DataCell value={fmtEUR(t.lyMonthlyEUR)} className="font-semibold text-muted-foreground" />
        <DataCell value={fmtEUR(t.lyYearlyEUR)} className="font-semibold text-muted-foreground" />
      </tr>

      {/* Sub-item rows */}
      {open &&
        group.items.map((item) => (
          <tr key={item.id} className="hover:bg-muted/30 transition-colors border-b border-border/30">
            <td className="px-3 py-1.5 sticky left-0 bg-background z-10">
              <div className="flex items-center gap-1.5 pl-6 min-w-[220px]">
                <span className="text-xs text-muted-foreground">{shortLabel(item.category)}</span>
              </div>
            </td>
            <DataCell value={fmtTL(item.dailyActualTL)} />
            <DataCell value={fmtEUR(item.dailyActualEUR)} />
            <DataCell value={fmtTL(item.monthlyActualTL)} />
            <DataCell value={fmtEUR(item.monthlyActualEUR)} />
            <DataCell value={fmtTL(item.monthlyBudgetTL)} />
            <DataCell value={fmtEUR(item.monthlyBudgetEUR)} />
            <DataCell value={fmtEUR(item.yearlyActualEUR)} />
            <DataCell value={fmtEUR(item.yearlyBudgetEUR)} />
            <DataCell value={fmtEUR(item.lyDailyEUR)} className="text-muted-foreground" />
            <DataCell value={fmtEUR(item.lyMonthlyEUR)} className="text-muted-foreground" />
            <DataCell value={fmtEUR(item.lyYearlyEUR)} className="text-muted-foreground" />
          </tr>
        ))}
    </>
  );
}

export default function KapakDetayDatePage({ params }: { params: { date: string } }) {
  const { date } = params;
  const router = useRouter();
  const [data, setData] = useState<GroupedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch(`/api/finance/revenue/detail?date=${date}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          setData(res.data);
          // Open all groups by default
          const keys = new Set(res.data.grouped.map((g: { total: Entry }) => g.total.category));
          setOpenGroups(keys as Set<string>);
        } else if (res.success && !res.data) {
          setError('Bu tarih için detay verisi bulunamadı.');
        } else {
          setError('Veriler alınamadı');
        }
      })
      .catch(() => setError('Bağlantı hatası'))
      .finally(() => setLoading(false));
  }, [date]);

  function toggleGroup(cat: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  function toggleAll() {
    if (!data) return;
    if (openGroups.size === data.grouped.length) {
      setOpenGroups(new Set());
    } else {
      setOpenGroups(new Set(data.grouped.map((g) => g.total.category)));
    }
  }

  const formattedDate = formatDate(date);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-muted-foreground text-sm">Yükleniyor...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Geri
        </Button>
        <div className="text-center py-16 text-muted-foreground text-sm">{error}</div>
      </div>
    );
  }

  if (!data) return null;

  const allOpen = openGroups.size === data.grouped.length;
  const grandTotal = computeGrandTotal(data.grouped);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Geri
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-muted-foreground" />
              Kapak Detay
              <Badge variant="outline" className="text-sm font-normal">{formattedDate}</Badge>
            </h1>
            <p className="text-muted-foreground text-xs mt-0.5">
              {data.grouped.length} gelir kategorisi ·{' '}
              {data.grouped.reduce((s, g) => s + g.items.length, 0)} kalem
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={toggleAll}>
          {allOpen ? 'Tümünü Kapat' : 'Tümünü Aç'}
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-muted/60 border-b">
              <th className="px-3 py-2.5 text-left text-xs font-semibold sticky left-0 bg-muted/60 z-20 min-w-[220px] border-b">
                Gelir Kalemi
              </th>
              {/* Daily */}
              <ColHeader sub="TL">Günlük<br/>Gerçekleşen</ColHeader>
              <ColHeader sub="EUR">Günlük<br/>Gerçekleşen</ColHeader>
              {/* Monthly Actual */}
              <ColHeader sub="TL">Aylık<br/>Gerçekleşen</ColHeader>
              <ColHeader sub="EUR">Aylık<br/>Gerçekleşen</ColHeader>
              {/* Monthly Budget */}
              <ColHeader sub="TL">Aylık<br/>Bütçe</ColHeader>
              <ColHeader sub="EUR">Aylık<br/>Bütçe</ColHeader>
              {/* Yearly */}
              <ColHeader sub="EUR">Yıllık<br/>Gerçekleşen</ColHeader>
              <ColHeader sub="EUR">Yıllık<br/>Bütçe</ColHeader>
              {/* Last Year */}
              <ColHeader sub="EUR">GY<br/>Günlük</ColHeader>
              <ColHeader sub="EUR">GY<br/>Aylık</ColHeader>
              <ColHeader sub="EUR">GY<br/>Yıllık</ColHeader>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            <GrandTotalRow total={grandTotal} />
            {data.grouped.map((group) => (
              <GroupRow
                key={group.total.id}
                group={group}
                open={openGroups.has(group.total.category)}
                onToggle={() => toggleGroup(group.total.category)}
              />
            ))}
            {data.orphans.length > 0 && (
              <>
                <tr className="bg-muted/20">
                  <td colSpan={12} className="px-3 py-1.5 text-xs font-medium text-muted-foreground sticky left-0">
                    Diğer
                  </td>
                </tr>
                {data.orphans.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/30">
                    <td className="px-3 py-1.5 sticky left-0 bg-background z-10">
                      <span className="text-xs">{shortLabel(item.category)}</span>
                    </td>
                    <DataCell value={fmtTL(item.dailyActualTL)} />
                    <DataCell value={fmtEUR(item.dailyActualEUR)} />
                    <DataCell value={fmtTL(item.monthlyActualTL)} />
                    <DataCell value={fmtEUR(item.monthlyActualEUR)} />
                    <DataCell value={fmtTL(item.monthlyBudgetTL)} />
                    <DataCell value={fmtEUR(item.monthlyBudgetEUR)} />
                    <DataCell value={fmtEUR(item.yearlyActualEUR)} />
                    <DataCell value={fmtEUR(item.yearlyBudgetEUR)} />
                    <DataCell value={fmtEUR(item.lyDailyEUR)} className="text-muted-foreground" />
                    <DataCell value={fmtEUR(item.lyMonthlyEUR)} className="text-muted-foreground" />
                    <DataCell value={fmtEUR(item.lyYearlyEUR)} className="text-muted-foreground" />
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground pt-1">
        <span className="font-medium">GY = Geçen Yıl</span>
        <span>· Satır başına tıklayarak alt kalemleri açıp kapatabilirsiniz</span>
      </div>
    </div>
  );
}
