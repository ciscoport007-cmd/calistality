'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  ClipboardCheck,
  TrendingUp,
  Target,
  Award,
  CheckCircle2,
  Clock,
  XCircle,
  BarChart3,
  FileText,
  Settings,
} from 'lucide-react';
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
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts';

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

interface CategoryScore {
  category: string;
  score: number;
  target: number;
}

interface MonthlyTrend {
  month: string;
  score: number;
  count: number;
}

interface TargetComparison {
  category: string;
  target: number;
  actual: number | null;
}

interface DashboardData {
  stats: {
    totalAudits: number;
    completedAudits: number;
    inProgressAudits: number;
    averageScore: number | null;
  };
  categoryScores: CategoryScore[];
  recentAudits: AuditSummary[];
  monthlyTrend: MonthlyTrend[];
  targetComparisons: TargetComparison[];
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

function getScoreBg(score: number | null): string {
  if (score === null) return 'bg-gray-50';
  if (score >= 90) return 'bg-green-50';
  if (score >= 80) return 'bg-yellow-50';
  if (score >= 70) return 'bg-orange-50';
  return 'bg-red-50';
}

function getScoreBarColor(score: number): string {
  if (score >= 90) return '#16a34a';
  if (score >= 80) return '#ca8a04';
  if (score >= 70) return '#ea580c';
  return '#dc2626';
}

export default function LQADashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/lqa/dashboard')
      .then((r) => {
        if (!r.ok) throw new Error('Veri alınamadı');
        return r.json();
      })
      .then(setData)
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Bilinmeyen hata';
        setError(message);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-72" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-gray-200 rounded" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-64 bg-gray-200 rounded" />
            <div className="h-64 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          Hata: {error}
        </div>
      </div>
    );
  }

  const avgScore = data?.stats.averageScore ?? null;

  const radarData =
    data?.categoryScores.map((cs) => ({
      category: cs.category.length > 12 ? cs.category.slice(0, 12) + '…' : cs.category,
      fullName: cs.category,
      puan: cs.score,
      hedef: cs.target,
    })) ?? [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Award className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">LQA Kalite Değerlendirme</h1>
            <p className="text-gray-500 text-sm">Leading Quality Assurance · Denetim ve Kalite Yönetimi</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/lqa/reports">
              <BarChart3 className="w-4 h-4 mr-1" />
              Raporlar
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/dashboard/lqa/audits/new">
              <Plus className="w-4 h-4 mr-1" />
              Yeni Denetim
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Toplam Denetim</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{data?.stats.totalAudits ?? 0}</p>
                <p className="text-xs text-gray-400 mt-1">Bu yıl</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <ClipboardCheck className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Tamamlandı</p>
                <p className="text-3xl font-bold text-green-700 mt-1">{data?.stats.completedAudits ?? 0}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {data && data.stats.totalAudits > 0
                    ? `%${Math.round((data.stats.completedAudits / data.stats.totalAudits) * 100)} tamamlanma`
                    : 'Veri yok'}
                </p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-white">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Devam Ediyor</p>
                <p className="text-3xl font-bold text-orange-700 mt-1">{data?.stats.inProgressAudits ?? 0}</p>
                <p className="text-xs text-gray-400 mt-1">Aktif denetim</p>
              </div>
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`border-2 ${avgScore !== null && avgScore >= 90 ? 'border-green-300' : avgScore !== null && avgScore >= 80 ? 'border-yellow-300' : avgScore !== null && avgScore >= 70 ? 'border-orange-300' : 'border-red-300'} ${getScoreBg(avgScore)}`}
        >
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Ortalama Puan</p>
                <p className={`text-4xl font-bold mt-1 ${getScoreColor(avgScore)}`}>
                  {avgScore !== null ? `%${avgScore.toFixed(1)}` : '—'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {avgScore !== null && avgScore >= 90
                    ? 'Mükemmel'
                    : avgScore !== null && avgScore >= 80
                      ? 'İyi'
                      : avgScore !== null && avgScore >= 70
                        ? 'Geliştirilmeli'
                        : avgScore !== null
                          ? 'Kritik'
                          : 'Veri yok'}
                </p>
              </div>
              <div className={`p-2 rounded-lg ${getScoreBg(avgScore)}`}>
                <TrendingUp className={`w-5 h-5 ${getScoreColor(avgScore)}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Category Radar Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Kategori Puanları</CardTitle>
            <CardDescription>LQA kategorilerine göre performans</CardDescription>
          </CardHeader>
          <CardContent>
            {radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="category" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Radar name="Puan" dataKey="puan" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                  <Radar name="Hedef" dataKey="hedef" stroke="#22c55e" fill="#22c55e" fillOpacity={0.1} strokeDasharray="4 4" />
                  <Tooltip formatter={(v: number) => `%${v}`} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-gray-400 text-sm">
                Henüz veri yok
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Aylık Trend</CardTitle>
            <CardDescription>Son 12 ay ortalama puanlar</CardDescription>
          </CardHeader>
          <CardContent>
            {data && data.monthlyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={data.monthlyTrend}>
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
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-gray-400 text-sm">
                Henüz veri yok
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Category Bar Chart */}
      {data && data.categoryScores.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Kategori Karşılaştırması</CardTitle>
            <CardDescription>Fiili puan vs hedef</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.categoryScores} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                <YAxis dataKey="category" type="category" width={150} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => `%${v}`} />
                <Bar dataKey="score" name="Fiili" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                <Bar dataKey="target" name="Hedef" fill="#e5e7eb" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Recent Audits & Targets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Audits */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Son Denetimler</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/lqa/audits">Tümünü Gör</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {data && data.recentAudits.length > 0 ? (
              <div className="space-y-2">
                {data.recentAudits.slice(0, 5).map((audit) => {
                  const statusCfg = STATUS_CONFIG[audit.status] ?? { label: audit.status, className: 'bg-gray-100 text-gray-700' };
                  return (
                    <Link
                      key={audit.id}
                      href={`/dashboard/lqa/audits/${audit.id}`}
                      className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{audit.title}</p>
                        <p className="text-xs text-gray-500">
                          {AUDIT_TYPE_LABELS[audit.type] ?? audit.type} ·{' '}
                          {audit.auditDate
                            ? new Date(audit.auditDate).toLocaleDateString('tr-TR')
                            : '—'}
                          {audit.auditor
                            ? ` · ${audit.auditor.name} ${audit.auditor.surname}`
                            : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                        {audit.totalScore !== null && (
                          <span className={`text-sm font-bold ${getScoreColor(audit.totalScore)}`}>
                            %{audit.totalScore.toFixed(0)}
                          </span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCfg.className}`}>
                          {statusCfg.label}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-center text-gray-400 text-sm py-8">Henüz denetim yok</div>
            )}
          </CardContent>
        </Card>

        {/* Targets */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Hedef Karşılaştırması</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/lqa/targets">Hedefleri Yönet</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {data && data.targetComparisons.length > 0 ? (
              <div className="space-y-3">
                {data.targetComparisons.map((tc, idx) => {
                  const actual = tc.actual ?? 0;
                  const diff = actual - tc.target;
                  return (
                    <div key={idx}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">{tc.category}</span>
                        <div className="flex items-center gap-2">
                          {tc.actual !== null && (
                            <span className={`text-xs font-bold ${getScoreColor(actual)}`}>
                              %{actual.toFixed(0)}
                            </span>
                          )}
                          <span className="text-xs text-gray-400">/ %{tc.target}</span>
                          {tc.actual !== null && (
                            <span
                              className={`text-xs font-medium ${diff >= 0 ? 'text-green-600' : 'text-red-600'}`}
                            >
                              {diff >= 0 ? '+' : ''}{diff.toFixed(0)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{
                            width: `${Math.min(actual, 100)}%`,
                            backgroundColor: getScoreBarColor(actual),
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center text-gray-400 text-sm py-8">Hedef tanımlanmamış</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Navigation */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Modüller</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              title: 'Denetimler',
              description: 'Denetim listesi ve yönetimi',
              href: '/dashboard/lqa/audits',
              icon: ClipboardCheck,
              color: 'text-blue-600',
              bg: 'bg-blue-50 hover:bg-blue-100',
              border: 'border-blue-200',
            },
            {
              title: 'Standartlar',
              description: 'LQA kategori ve kriterleri',
              href: '/dashboard/lqa/standards',
              icon: FileText,
              color: 'text-purple-600',
              bg: 'bg-purple-50 hover:bg-purple-100',
              border: 'border-purple-200',
            },
            {
              title: 'Raporlar',
              description: 'Analitik ve raporlama',
              href: '/dashboard/lqa/reports',
              icon: BarChart3,
              color: 'text-emerald-600',
              bg: 'bg-emerald-50 hover:bg-emerald-100',
              border: 'border-emerald-200',
            },
            {
              title: 'Hedefler',
              description: 'Kalite hedefi yönetimi',
              href: '/dashboard/lqa/targets',
              icon: Target,
              color: 'text-orange-600',
              bg: 'bg-orange-50 hover:bg-orange-100',
              border: 'border-orange-200',
            },
          ].map((mod) => (
            <Link
              key={mod.href}
              href={mod.href}
              className={`flex items-start justify-between p-4 rounded-xl border cursor-pointer transition-colors ${mod.bg} ${mod.border}`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white shadow-sm">
                  <mod.icon className={`w-5 h-5 ${mod.color}`} />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{mod.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{mod.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
