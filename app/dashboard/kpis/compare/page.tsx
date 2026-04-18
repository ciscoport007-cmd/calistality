'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  LineChart, Line, BarChart, Bar, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  Loader2, Plus, Minus, TrendingUp, TrendingDown,
  Download, FileSpreadsheet, AlertTriangle, BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { exportToExcel } from '@/lib/export-utils';
import type { ExportColumn } from '@/lib/export-utils';

// ── Types ──────────────────────────────────────────────────────────────────

interface KPIMeasurementData {
  id: string;
  measurementDate: string;
  value: number;
  targetValue: number | null;
  performance: number | null;
  status: string | null;
}

interface KPITargetData {
  id: string;
  year: number;
  period: string;
  periodNumber: number | null;
  targetValue: number;
  actualValue: number | null;
  performance: number | null;
}

interface KPIComparison {
  id: string;
  code: string;
  name: string;
  unit: string;
  period: string;
  targetValue: number;
  trendDirection: string;
  measurements: KPIMeasurementData[];
  targets: KPITargetData[];
  avgPerformance: number;
}

interface KPISummary {
  id: string;
  code: string;
  name: string;
  unit: string;
  createdAt: string;
}

// ── Constants & helpers ────────────────────────────────────────────────────

const KPI_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444'];

const BADGE_CLASSES = [
  'bg-blue-100 text-blue-800 hover:bg-blue-100',
  'bg-green-100 text-green-800 hover:bg-green-100',
  'bg-amber-100 text-amber-800 hover:bg-amber-100',
  'bg-purple-100 text-purple-800 hover:bg-purple-100',
  'bg-red-100 text-red-800 hover:bg-red-100',
];

function getPerformanceColor(perf: number): string {
  if (perf >= 100) return '#10B981';
  if (perf >= 80) return '#F59E0B';
  return '#EF4444';
}

function getPerformanceBg(perf: number): string {
  if (perf >= 100) return 'bg-green-100 text-green-800';
  if (perf >= 80) return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
}

function formatVal(value: number | null | undefined, unit: string): string {
  if (value === null || value === undefined) return '—';
  const currency = unit === 'TL' || unit === '₺';
  const formatted = currency
    ? value.toLocaleString('tr-TR')
    : (value % 1 === 0 ? value.toString() : value.toFixed(2));
  return `${formatted} ${unit}`;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function KPIComparePage() {
  const [allKpis, setAllKpis] = useState<KPISummary[]>([]);
  const [selectedIds, setSelectedIds] = useState<(string | null)[]>([null, null]);
  const [comparisonData, setComparisonData] = useState<KPIComparison[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingKpis, setLoadingKpis] = useState(true);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/kpis?forGoalLinking=true')
      .then((r) => r.json())
      .then((data) => {
        setAllKpis(Array.isArray(data) ? data : []);
      })
      .catch(() => toast.error('KPI listesi yüklenemedi'))
      .finally(() => setLoadingKpis(false));
  }, []);

  // ── Normalized chart data ─────────────────────────────────────────────────

  const chartData = useMemo(() => {
    if (!comparisonData || comparisonData.length === 0) return [];

    const dateSet = new Set<string>();
    comparisonData.forEach((kpi) => {
      kpi.measurements.forEach((m) => {
        dateSet.add(format(new Date(m.measurementDate), 'yyyy-MM'));
      });
    });

    return [...dateSet].sort().map((dateKey) => {
      const point: Record<string, string | number | null> = {
        dateKey,
        dateLabel: format(new Date(`${dateKey}-01`), 'MMM yyyy', { locale: tr }),
      };
      comparisonData.forEach((kpi, idx) => {
        const m = kpi.measurements.find(
          (mes) => format(new Date(mes.measurementDate), 'yyyy-MM') === dateKey
        );
        point[`v${idx}`] = m?.value ?? null;
        point[`t${idx}`] = m?.targetValue ?? kpi.targetValue;
        point[`p${idx}`] = m?.performance ?? null;
      });
      return point;
    });
  }, [comparisonData]);

  const performanceChartData = useMemo(() => {
    if (!comparisonData) return [];
    return comparisonData.map((kpi, idx) => ({
      name: kpi.code,
      fullName: kpi.name,
      performance: Math.round(kpi.avgPerformance * 10) / 10,
      color: KPI_COLORS[idx],
    }));
  }, [comparisonData]);

  const tableRows = useMemo(() => {
    if (!comparisonData || chartData.length === 0) return [];
    return chartData.map((point) => ({
      period: point.dateLabel as string,
      kpis: comparisonData.map((_kpi, idx) => ({
        value: point[`v${idx}`] as number | null,
        target: point[`t${idx}`] as number | null,
        performance: point[`p${idx}`] as number | null,
        unit: _kpi.unit,
      })),
    }));
  }, [comparisonData, chartData]);

  const hasDifferentUnits = useMemo(
    () => comparisonData != null && new Set(comparisonData.map((k) => k.unit)).size > 1,
    [comparisonData]
  );

  // ── Handlers ──────────────────────────────────────────────────────────────

  const validIds = selectedIds.filter((id): id is string => id !== null);
  const hasNoDuplicates = new Set(validIds).size === validIds.length;
  const canCompare = validIds.length >= 2 && hasNoDuplicates;

  async function handleCompare() {
    if (!canCompare) return;
    setLoading(true);
    setComparisonData(null);
    try {
      const res = await fetch('/api/kpis/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kpiIds: validIds }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Karşılaştırma başarısız');
        return;
      }
      setComparisonData(data as KPIComparison[]);
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    } catch {
      toast.error('Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  }

  function handleExportExcel() {
    if (!comparisonData || tableRows.length === 0) {
      toast.error('Önce karşılaştırma yapın');
      return;
    }

    const columns: ExportColumn[] = [
      { header: 'Dönem', key: 'period', width: 15 },
      ...comparisonData.flatMap((kpi, idx) => [
        { header: `${kpi.code} Değer (${kpi.unit})`, key: `v${idx}`, width: 20 },
        { header: `${kpi.code} Hedef`, key: `t${idx}`, width: 15 },
        { header: `${kpi.code} Perf %`, key: `p${idx}`, width: 12 },
      ]),
    ];

    const data = tableRows.map((row) => {
      const r: Record<string, string | number> = { period: row.period };
      row.kpis.forEach((k, idx) => {
        r[`v${idx}`] = k.value !== null ? +(k.value.toFixed(2)) : '-';
        r[`t${idx}`] = k.target !== null ? +(k.target.toFixed(2)) : '-';
        r[`p${idx}`] = k.performance !== null ? `${k.performance.toFixed(1)}%` : '-';
      });
      return r;
    });

    exportToExcel(
      data,
      columns,
      `KPI-Karsilastirma-${format(new Date(), 'yyyy-MM-dd')}`,
      'Karşılaştırma'
    );
    toast.success('Excel dosyası indirildi');
  }

  async function handleExportPDF() {
    if (!comparisonData) {
      toast.error('Önce karşılaştırma yapın');
      return;
    }
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const doc = new jsPDF('l', 'mm', 'a4');

      doc.setFontSize(18);
      doc.text('KPI Karşılaştırma Raporu', 14, 20);
      doc.setFontSize(10);
      doc.text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`, 14, 28);
      doc.text(`KPI Sayısı: ${comparisonData.length}`, 14, 34);
      doc.text(`KPIlar: ${comparisonData.map((k) => k.code).join(', ')}`, 14, 40);

      // Özet tablo
      autoTable(doc, {
        head: [['KPI Kodu', 'KPI Adı', 'Birim', 'Hedef Değer', 'Ort. Performans %']],
        body: comparisonData.map((k) => [
          k.code,
          k.name,
          k.unit,
          k.targetValue.toFixed(2),
          `${k.avgPerformance.toFixed(1)}%`,
        ]),
        startY: 46,
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
      });

      // Detay tablo
      const lastY: number =
        ((doc as unknown) as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 80;

      const headers = [
        'Dönem',
        ...comparisonData.flatMap((k) => [
          `${k.code} Deger`,
          `${k.code} Hedef`,
          `${k.code} Perf%`,
        ]),
      ];

      const rows = tableRows.map((row) => [
        row.period,
        ...row.kpis.flatMap((k) => [
          k.value !== null ? k.value.toFixed(2) : '-',
          k.target !== null ? k.target.toFixed(2) : '-',
          k.performance !== null ? `${k.performance.toFixed(1)}%` : '-',
        ]),
      ]);

      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: lastY + 8,
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 247, 250] },
      });

      doc.save(`KPI-Karsilastirma-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('PDF indirildi');
    } catch {
      toast.error('PDF oluşturulamadı');
    }
  }

  // ── Select helpers ────────────────────────────────────────────────────────

  function setId(index: number, value: string | null) {
    setSelectedIds((prev) => {
      const next = [...prev];
      next[index] = value || null;
      return next;
    });
  }

  function addKpi() {
    if (selectedIds.length < 5) setSelectedIds((prev) => [...prev, null]);
  }

  function removeKpi(index: number) {
    if (selectedIds.length > 2) {
      setSelectedIds((prev) => prev.filter((_, i) => i !== index));
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-blue-600" />
          KPI Karşılaştırma
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          2-5 arası KPI seçip grafiklerle karşılaştırın
        </p>
      </div>

      {/* Selection Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">KPI Seçimi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {selectedIds.map((id, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: KPI_COLORS[idx] }}
                />
                <div className="flex-1 min-w-0">
                  <Select
                    value={id ?? ''}
                    onValueChange={(val) => setId(idx, val)}
                    disabled={loadingKpis}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={`KPI ${idx + 1} seçin`} />
                    </SelectTrigger>
                    <SelectContent>
                      {allKpis.map((kpi) => {
                        const alreadySelected = selectedIds.some(
                          (sid, i) => i !== idx && sid === kpi.id
                        );
                        return (
                          <SelectItem
                            key={kpi.id}
                            value={kpi.id}
                            disabled={alreadySelected}
                          >
                            {kpi.name} ({kpi.unit}) ·{' '}
                            {new Date(kpi.createdAt).getFullYear()}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                {selectedIds.length > 2 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeKpi(idx)}
                    className="h-9 w-9 flex-shrink-0"
                  >
                    <Minus className="h-4 w-4 text-red-500" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Selected KPI badges */}
          {validIds.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {validIds.map((id) => {
                const kpi = allKpis.find((k) => k.id === id);
                if (!kpi) return null;
                const colorIdx = selectedIds.findIndex((s) => s === id);
                return (
                  <Badge
                    key={id}
                    className={BADGE_CLASSES[colorIdx >= 0 ? colorIdx : 0]}
                  >
                    {kpi.code} — {kpi.name}
                  </Badge>
                );
              })}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            {selectedIds.length < 5 && (
              <Button
                variant="outline"
                size="sm"
                onClick={addKpi}
                className="gap-1"
              >
                <Plus className="h-4 w-4" /> KPI Ekle
              </Button>
            )}
            <Button
              onClick={handleCompare}
              disabled={!canCompare || loading}
              className="gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <BarChart3 className="h-4 w-4" />
              )}
              {loading ? 'Karşılaştırılıyor…' : 'Karşılaştır'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Results ───────────────────────────────────────────────────────── */}
      {comparisonData && (
        <div ref={resultsRef} className="space-y-6">
          {hasDifferentUnits && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Dikkat: Farklı birimler karşılaştırılıyor —{' '}
                {comparisonData.map((k) => `${k.code}: ${k.unit}`).join(', ')}
              </AlertDescription>
            </Alert>
          )}

          {/* Export buttons */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              className="gap-2"
            >
              <FileSpreadsheet className="h-4 w-4" /> Excel İndir
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              className="gap-2"
            >
              <Download className="h-4 w-4" /> PDF İndir
            </Button>
          </div>

          {/* b1 — Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {comparisonData.map((kpi, idx) => {
              const lastM =
                kpi.measurements.length > 0
                  ? kpi.measurements[kpi.measurements.length - 1]
                  : null;
              const perf = kpi.avgPerformance;
              return (
                <Card
                  key={kpi.id}
                  style={{ borderTop: `4px solid ${KPI_COLORS[idx]}` }}
                >
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500 font-mono truncate">
                          {kpi.code}
                        </p>
                        <p className="font-semibold text-sm leading-tight">
                          {kpi.name}
                        </p>
                      </div>
                      {kpi.trendDirection === 'YUKARI_IYI' ? (
                        <TrendingUp className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                      )}
                    </div>

                    <div>
                      <p className="text-xl font-bold truncate">
                        {lastM ? formatVal(lastM.value, kpi.unit) : '—'}
                      </p>
                      <p className="text-xs text-gray-500">Son ölçüm</p>
                    </div>

                    {kpi.measurements.length === 0 && (
                      <p className="text-xs text-amber-600">
                        Bu KPI için ölçüm verisi bulunamadı
                      </p>
                    )}

                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Hedef:</span>
                        <span>{formatVal(kpi.targetValue, kpi.unit)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Ort. Perf.:</span>
                        <span
                          className={`font-semibold px-1.5 py-0.5 rounded ${getPerformanceBg(perf)}`}
                        >
                          {perf.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* b2 — Time series line chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Zaman Serisi Karşılaştırması</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <p className="text-center text-gray-400 py-12">
                  Bu KPI için ölçüm verisi bulunamadı
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart
                    data={chartData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="dateLabel" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      labelFormatter={(label) => `Tarih: ${label}`}
                      formatter={(value, name) => {
                        if (value === null || value === undefined) return ['—', name];
                        const idx = parseInt(String(name).replace('v', ''));
                        const kpi = comparisonData[idx];
                        const numVal = Number(value);
                        return [
                          `Değer: ${numVal.toFixed(2)} ${kpi?.unit ?? ''}`,
                          kpi?.name ?? String(name),
                        ];
                      }}
                    />
                    <Legend
                      formatter={(value) => {
                        const idx = parseInt(String(value).replace('v', ''));
                        return comparisonData[idx]?.name ?? value;
                      }}
                    />
                    {comparisonData.map((kpi, idx) => (
                      <Line
                        key={kpi.id}
                        type="monotone"
                        dataKey={`v${idx}`}
                        stroke={KPI_COLORS[idx]}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        connectNulls={false}
                        name={`v${idx}`}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* b3 — Performance bar chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Ortalama Performans Karşılaştırması
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={performanceChartData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis unit="%" domain={[0, 'auto']} tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value) => [
                      `${Number(value).toFixed(1)}%`,
                      'Ort. Performans',
                    ]}
                    labelFormatter={(_label, payload) =>
                      payload?.[0]?.payload?.fullName ?? _label
                    }
                  />
                  <ReferenceLine
                    y={100}
                    stroke="#EF4444"
                    strokeDasharray="5 5"
                    label={{
                      value: '100%',
                      position: 'insideTopRight',
                      fill: '#EF4444',
                      fontSize: 11,
                    }}
                  />
                  <Bar
                    dataKey="performance"
                    name="Ort. Performans"
                    radius={[4, 4, 0, 0]}
                  >
                    {performanceChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={getPerformanceColor(entry.performance)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* b4 — Target vs Actual composed chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Hedef vs Gerçekleşen</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <p className="text-center text-gray-400 py-12">
                  Bu KPI için ölçüm verisi bulunamadı
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <ComposedChart
                    data={chartData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="dateLabel" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      labelFormatter={(label) => `Dönem: ${label}`}
                      formatter={(value, name) => {
                        if (value === null || value === undefined) return ['—', name];
                        const nameStr = String(name);
                        const isTarget = nameStr.startsWith('t');
                        const idx = parseInt(nameStr.slice(1));
                        const kpi = comparisonData[idx];
                        const numVal = Number(value);
                        const label = isTarget
                          ? `${kpi?.name} Hedef`
                          : `${kpi?.name} Gerçekleşen`;
                        return [
                          `${numVal.toFixed(2)} ${kpi?.unit ?? ''}`,
                          label,
                        ];
                      }}
                    />
                    <Legend
                      formatter={(value) => {
                        const nameStr = String(value);
                        const isTarget = nameStr.startsWith('t');
                        const idx = parseInt(nameStr.slice(1));
                        const kpi = comparisonData[idx];
                        return isTarget
                          ? `${kpi?.name} Hedef`
                          : `${kpi?.name} Gerçekleşen`;
                      }}
                    />
                    {comparisonData.map((kpi, idx) => (
                      <Bar
                        key={`bar-${kpi.id}`}
                        dataKey={`v${idx}`}
                        fill={KPI_COLORS[idx]}
                        opacity={0.75}
                        name={`v${idx}`}
                        radius={[2, 2, 0, 0]}
                      />
                    ))}
                    {comparisonData.map((kpi, idx) => (
                      <Line
                        key={`line-${kpi.id}`}
                        type="monotone"
                        dataKey={`t${idx}`}
                        stroke={KPI_COLORS[idx]}
                        strokeDasharray="5 5"
                        strokeWidth={2}
                        dot={false}
                        name={`t${idx}`}
                      />
                    ))}
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* b5 — Detail comparison table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detay Karşılaştırma Tablosu</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {tableRows.length === 0 ? (
                <p className="text-center text-gray-400 py-12">
                  Bu KPI için ölçüm verisi bulunamadı
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Dönem</TableHead>
                      {comparisonData.map((kpi, idx) => (
                        <>
                          <TableHead
                            key={`th-v-${idx}`}
                            className="whitespace-nowrap"
                            style={{ color: KPI_COLORS[idx] }}
                          >
                            {kpi.code} Değer
                          </TableHead>
                          <TableHead
                            key={`th-t-${idx}`}
                            className="whitespace-nowrap text-gray-500"
                          >
                            Hedef
                          </TableHead>
                          <TableHead
                            key={`th-p-${idx}`}
                            className="whitespace-nowrap text-gray-500"
                          >
                            Perf %
                          </TableHead>
                        </>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tableRows.map((row, rowIdx) => (
                      <TableRow key={rowIdx}>
                        <TableCell className="font-medium whitespace-nowrap">
                          {row.period}
                        </TableCell>
                        {row.kpis.map((k, idx) => (
                          <>
                            <TableCell key={`td-v-${idx}`} className="whitespace-nowrap">
                              {k.value !== null ? formatVal(k.value, k.unit) : '—'}
                            </TableCell>
                            <TableCell
                              key={`td-t-${idx}`}
                              className="whitespace-nowrap text-gray-500"
                            >
                              {k.target !== null ? formatVal(k.target, k.unit) : '—'}
                            </TableCell>
                            <TableCell key={`td-p-${idx}`}>
                              {k.performance !== null ? (
                                <span
                                  className={`px-2 py-0.5 rounded text-xs font-semibold ${getPerformanceBg(k.performance)}`}
                                >
                                  {k.performance.toFixed(1)}%
                                </span>
                              ) : (
                                '—'
                              )}
                            </TableCell>
                          </>
                        ))}
                      </TableRow>
                    ))}

                    {/* Average row */}
                    <TableRow className="bg-gray-50 font-semibold">
                      <TableCell>ORTALAMA</TableCell>
                      {comparisonData.map((kpi, idx) => {
                        const items = tableRows.map((r) => r.kpis[idx]);
                        const vals = items.filter((m) => m.value !== null);
                        const tgts = items.filter((m) => m.target !== null);
                        const prfs = items.filter((m) => m.performance !== null);
                        const avgVal =
                          vals.length > 0
                            ? vals.reduce((s, m) => s + (m.value ?? 0), 0) / vals.length
                            : null;
                        const avgTgt =
                          tgts.length > 0
                            ? tgts.reduce((s, m) => s + (m.target ?? 0), 0) / tgts.length
                            : null;
                        const avgPrf =
                          prfs.length > 0
                            ? prfs.reduce((s, m) => s + (m.performance ?? 0), 0) /
                              prfs.length
                            : null;
                        return (
                          <>
                            <TableCell key={`avg-v-${idx}`} className="whitespace-nowrap">
                              {avgVal !== null ? formatVal(avgVal, kpi.unit) : '—'}
                            </TableCell>
                            <TableCell
                              key={`avg-t-${idx}`}
                              className="whitespace-nowrap text-gray-500"
                            >
                              {avgTgt !== null ? formatVal(avgTgt, kpi.unit) : '—'}
                            </TableCell>
                            <TableCell key={`avg-p-${idx}`}>
                              {avgPrf !== null ? (
                                <span
                                  className={`px-2 py-0.5 rounded text-xs font-semibold ${getPerformanceBg(avgPrf)}`}
                                >
                                  {avgPrf.toFixed(1)}%
                                </span>
                              ) : (
                                '—'
                              )}
                            </TableCell>
                          </>
                        );
                      })}
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
