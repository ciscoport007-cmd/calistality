'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import {
  BarChart3,
  Download,
  AlertCircle,
  TrendingUp,
  ClipboardCheck,
} from 'lucide-react';

interface MonthlyTrend {
  month: string;
  score: number;
  count: number;
}

interface CategoryScore {
  category: string;
  score: number;
  target: number;
}

interface FailedCriterion {
  criterionCode: string;
  criterionDescription: string;
  failCount: number;
  category: string;
}

interface AuditSummary {
  id: string;
  code: string;
  title: string;
  type: string;
  auditDate: string;
  auditor: { name: string; surname: string } | null;
  totalScore: number | null;
  status: string;
}

interface DashboardData {
  categoryScores: CategoryScore[];
  monthlyTrend: MonthlyTrend[];
  topFailedCriteria?: FailedCriterion[];
}

const AUDIT_TYPE_LABELS: Record<string, string> = {
  IC: 'İç Denetim',
  DIS: 'Dış Denetim',
  MYSTERY: 'Mystery Guest',
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  TASLAK: { label: 'Taslak', className: 'bg-gray-100 text-gray-700' },
  DEVAM_EDIYOR: { label: 'Devam Ediyor', className: 'bg-blue-100 text-blue-700' },
  TAMAMLANDI: { label: 'Tamamlandı', className: 'bg-green-100 text-green-700' },
  IPTAL: { label: 'İptal', className: 'bg-red-100 text-red-700' },
};

function getScoreColor(score: number | null): string {
  if (score === null) return 'text-gray-400';
  if (score >= 90) return 'text-green-600';
  if (score >= 80) return 'text-yellow-600';
  if (score >= 70) return 'text-orange-600';
  return 'text-red-600';
}

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 3 }, (_, i) => CURRENT_YEAR - i);
const QUARTERS = [
  { value: 'ALL', label: 'Tüm Yıl' },
  { value: 'Q1', label: '1. Çeyrek (Oca-Mar)' },
  { value: 'Q2', label: '2. Çeyrek (Nis-Haz)' },
  { value: 'Q3', label: '3. Çeyrek (Tem-Eyl)' },
  { value: 'Q4', label: '4. Çeyrek (Eki-Ara)' },
];

export default function LQAReportsPage() {
  const [year, setYear] = useState(String(CURRENT_YEAR));
  const [quarter, setQuarter] = useState('ALL');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [audits, setAudits] = useState<AuditSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ year });
      if (quarter !== 'ALL') params.set('quarter', quarter);

      const [dashRes, auditsRes] = await Promise.all([
        fetch(`/api/lqa/dashboard?${params.toString()}`),
        fetch(`/api/lqa/audits?status=TAMAMLANDI&year=${year}&limit=50`),
      ]);

      if (!dashRes.ok) throw new Error('Dashboard verisi alınamadı');
      const dashJson: DashboardData = await dashRes.json();
      setDashboardData(dashJson);

      if (auditsRes.ok) {
        const auditsJson = await auditsRes.json();
        setAudits(Array.isArray(auditsJson) ? auditsJson : auditsJson.data ?? []);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Hata';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [year, quarter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExport = () => {
    // CSV export of audits
    const headers = ['Kod', 'Başlık', 'Tür', 'Tarih', 'Denetçi', 'Puan', 'Durum'];
    const rows = audits.map((a) => [
      a.code,
      a.title,
      AUDIT_TYPE_LABELS[a.type] ?? a.type,
      a.auditDate ? new Date(a.auditDate).toLocaleDateString('tr-TR') : '',
      a.auditor ? `${a.auditor.name} ${a.auditor.surname}` : '',
      a.totalScore !== null ? `%${a.totalScore.toFixed(1)}` : '',
      STATUS_CONFIG[a.status]?.label ?? a.status,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lqa-denetimler-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 rounded-lg">
            <BarChart3 className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Raporlar & Analitik</h1>
            <p className="text-gray-500 text-sm">LQA performans analizi ve raporlama</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={audits.length === 0}>
          <Download className="w-4 h-4 mr-1" />
          CSV İndir
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={year} onValueChange={(v) => { setYear(v); }}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Yıl" />
          </SelectTrigger>
          <SelectContent>
            {YEARS.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={quarter} onValueChange={setQuarter}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Dönem" />
          </SelectTrigger>
          <SelectContent>
            {QUARTERS.map((q) => (
              <SelectItem key={q.value} value={q.value}>
                {q.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-64 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Score Trend */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  Puan Trendi
                </CardTitle>
                <CardDescription>Aylık ortalama LQA puanı</CardDescription>
              </CardHeader>
              <CardContent>
                {dashboardData && dashboardData.monthlyTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={dashboardData.monthlyTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis domain={[50, 100]} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => `%${v}`} />
                      <Line
                        type="monotone"
                        dataKey="score"
                        name="Ort. Puan"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="count"
                        name="Denetim Sayısı"
                        stroke="#94a3b8"
                        strokeWidth={1}
                        strokeDasharray="4 4"
                        dot={false}
                        yAxisId={0}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[240px] flex items-center justify-center text-gray-400 text-sm">
                    Veri yok
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Category Comparison */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-purple-600" />
                  Kategori Karşılaştırması
                </CardTitle>
                <CardDescription>Fiili puan vs hedef (%)</CardDescription>
              </CardHeader>
              <CardContent>
                {dashboardData && dashboardData.categoryScores.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={dashboardData.categoryScores}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="category"
                        tick={{ fontSize: 9 }}
                        interval={0}
                        angle={-25}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => `%${v}`} />
                      <Legend />
                      <Bar dataKey="score" name="Fiili" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="target" name="Hedef" fill="#d1fae5" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[240px] flex items-center justify-center text-gray-400 text-sm">
                    Veri yok
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top Failed Criteria */}
          {dashboardData?.topFailedCriteria && dashboardData.topFailedCriteria.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">En Çok Başarısız Olunan Kriterler</CardTitle>
                <CardDescription>En fazla "Hayır" cevabı alınan ilk 10 kriter</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left p-3 font-medium text-gray-600">#</th>
                        <th className="text-left p-3 font-medium text-gray-600">Kriter</th>
                        <th className="text-left p-3 font-medium text-gray-600">Kategori</th>
                        <th className="text-center p-3 font-medium text-gray-600">Başarısız Sayısı</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {dashboardData.topFailedCriteria.slice(0, 10).map((fc, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="p-3 text-gray-400 text-xs font-bold">{idx + 1}</td>
                          <td className="p-3">
                            <p className="text-gray-800">{fc.criterionDescription}</p>
                            <p className="text-xs text-gray-400 font-mono">{fc.criterionCode}</p>
                          </td>
                          <td className="p-3">
                            <span className="text-xs px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full">
                              {fc.category}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span className="font-bold text-red-600">{fc.failCount}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Audit History */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ClipboardCheck className="w-4 h-4 text-blue-600" />
                    Denetim Geçmişi
                  </CardTitle>
                  <CardDescription>
                    {year} yılı tamamlanmış denetimler ({audits.length} kayıt)
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={handleExport} disabled={audits.length === 0}>
                  <Download className="w-4 h-4 mr-1" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {audits.length === 0 ? (
                <div className="text-center text-gray-400 py-12 text-sm">
                  Bu dönem için tamamlanmış denetim yok
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left p-3 font-medium text-gray-600">Kod</th>
                        <th className="text-left p-3 font-medium text-gray-600">Başlık</th>
                        <th className="text-left p-3 font-medium text-gray-600">Tür</th>
                        <th className="text-left p-3 font-medium text-gray-600">Tarih</th>
                        <th className="text-left p-3 font-medium text-gray-600">Denetçi</th>
                        <th className="text-center p-3 font-medium text-gray-600">Puan</th>
                        <th className="text-center p-3 font-medium text-gray-600">Durum</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {audits.map((audit) => {
                        const statusCfg =
                          STATUS_CONFIG[audit.status] ?? {
                            label: audit.status,
                            className: 'bg-gray-100 text-gray-700',
                          };
                        return (
                          <tr key={audit.id} className="hover:bg-gray-50">
                            <td className="p-3 font-mono text-xs text-gray-500">{audit.code}</td>
                            <td className="p-3 font-medium text-gray-900">{audit.title}</td>
                            <td className="p-3 text-gray-600">
                              {AUDIT_TYPE_LABELS[audit.type] ?? audit.type}
                            </td>
                            <td className="p-3 text-gray-600 whitespace-nowrap">
                              {audit.auditDate
                                ? new Date(audit.auditDate).toLocaleDateString('tr-TR')
                                : '—'}
                            </td>
                            <td className="p-3 text-gray-600 whitespace-nowrap">
                              {audit.auditor
                                ? `${audit.auditor.name} ${audit.auditor.surname}`
                                : '—'}
                            </td>
                            <td className="p-3 text-center">
                              {audit.totalScore !== null ? (
                                <span className={`font-bold ${getScoreColor(audit.totalScore)}`}>
                                  %{audit.totalScore.toFixed(1)}
                                </span>
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCfg.className}`}
                              >
                                {statusCfg.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
