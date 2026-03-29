'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Lightbulb, FolderKanban, TrendingUp, CheckCircle, Star, ThumbsUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend, PieChart, Pie, Cell,
} from 'recharts';
import { toast } from 'react-hot-toast';

const CATEGORY_LABELS: Record<string, string> = {
  MISAFIR_DENEYIMI: 'Misafir Deneyimi',
  OPERASYONEL_VERIMLILIK: 'Op. Verimlilik',
  SURDURULEBILIRLIK: 'Sürdürülebilirlik',
  TEKNOLOJI: 'Teknoloji',
  PERSONEL_REFAHI: 'Personel Refahı',
  MALIYET_AZALTMA: 'Maliyet Azaltma',
  GELIR_ARTIRMA: 'Gelir Artırma',
};

const STATUS_LABELS: Record<string, string> = {
  YENI: 'Yeni',
  DEGERLENDIRME: 'Değerlendirme',
  ONAYLANDI: 'Onaylandı',
  PROJELESTI: 'Projeye Dönüştü',
  REDDEDILDI: 'Reddedildi',
  ARSIV: 'Arşiv',
};

const STATUS_COLORS: Record<string, string> = {
  YENI: '#3B82F6',
  DEGERLENDIRME: '#F59E0B',
  ONAYLANDI: '#10B981',
  PROJELESTI: '#8B5CF6',
  REDDEDILDI: '#EF4444',
  ARSIV: '#9CA3AF',
};

const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316', '#06B6D4'];

interface Metrics {
  totalIdeas: number;
  approvalRate: number;
  conversionRate: number;
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  ideasByStatus: { status: string; count: number }[];
  ideasByCategory: { category: string; count: number }[];
  ideasByDepartment: { departmentName: string; count: number }[];
  projectsByStatus: { status: string; count: number }[];
  monthlyTrend: { month: string; count: number }[];
  topIdeas: any[];
}

const IDEA_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  YENI: { label: 'Yeni', color: 'bg-blue-100 text-blue-800' },
  DEGERLENDIRME: { label: 'Değerlendirme', color: 'bg-yellow-100 text-yellow-800' },
  ONAYLANDI: { label: 'Onaylandı', color: 'bg-green-100 text-green-800' },
  PROJELESTI: { label: 'Projeye Dönüştü', color: 'bg-purple-100 text-purple-800' },
  REDDEDILDI: { label: 'Reddedildi', color: 'bg-red-100 text-red-800' },
  ARSIV: { label: 'Arşiv', color: 'bg-gray-100 text-gray-800' },
};

export default function InnovationDashboardPage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/innovation/dashboard')
      .then((r) => r.json())
      .then((data) => { setMetrics(data); setLoading(false); })
      .catch(() => { toast.error('Veriler yüklenemedi'); setLoading(false); });
  }, []);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!metrics) return null;

  const trendData = metrics.monthlyTrend.map((m) => ({
    month: m.month.slice(5), // MM
    count: m.count,
  }));

  const categoryData = metrics.ideasByCategory.map((c, i) => ({
    name: CATEGORY_LABELS[c.category] ?? c.category,
    count: c.count,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }));

  const deptData = metrics.ideasByDepartment.slice(0, 8).map((d) => ({
    name: d.departmentName,
    count: d.count,
  }));

  const statusData = metrics.ideasByStatus.map((s) => ({
    name: STATUS_LABELS[s.status] ?? s.status,
    value: s.count,
    fill: STATUS_COLORS[s.status] ?? '#9CA3AF',
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">İnovasyon Dashboard</h2>
        <p className="text-muted-foreground">İnovasyon faaliyetlerinizin özeti</p>
      </div>

      {/* Stat Kartları */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
            </div>
            <p className="text-2xl font-bold">{metrics.totalIdeas}</p>
            <p className="text-xs text-muted-foreground mt-1">Toplam Fikir</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-2xl font-bold">%{metrics.approvalRate}</p>
            <p className="text-xs text-muted-foreground mt-1">Onay Oranı</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="h-5 w-5 text-purple-500" />
            </div>
            <p className="text-2xl font-bold">%{metrics.conversionRate}</p>
            <p className="text-xs text-muted-foreground mt-1">Proje Dönüşümü</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <FolderKanban className="h-5 w-5 text-blue-500" />
            </div>
            <p className="text-2xl font-bold">{metrics.totalProjects}</p>
            <p className="text-xs text-muted-foreground mt-1">Toplam Proje</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <FolderKanban className="h-5 w-5 text-orange-500" />
            </div>
            <p className="text-2xl font-bold">{metrics.activeProjects}</p>
            <p className="text-xs text-muted-foreground mt-1">Aktif Proje</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="h-5 w-5 text-teal-500" />
            </div>
            <p className="text-2xl font-bold">{metrics.completedProjects}</p>
            <p className="text-xs text-muted-foreground mt-1">Tamamlanan</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Aylık Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Aylık Fikir Trendi (Son 12 Ay)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip formatter={(v) => [`${v} fikir`, 'Fikir']} />
                <Line type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Durum Dağılımı */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Durum Dağılımı</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Veri yok</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" nameKey="name">
                    {statusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip formatter={(v, name) => [`${v} fikir`, name]} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Departman Katılımı */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Departman Katılımı</CardTitle>
          </CardHeader>
          <CardContent>
            {deptData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Departman verisi yok</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={deptData} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={110} />
                  <Tooltip formatter={(v) => [`${v} fikir`, 'Fikir']} />
                  <Bar dataKey="count" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Kategori Dağılımı */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Kategori Dağılımı</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Veri yok</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={categoryData}>
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip formatter={(v) => [`${v} fikir`, 'Fikir']} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {categoryData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* En Çok Oy Alan Fikirler */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-500" />
            En Çok Oy Alan 5 Fikir
          </CardTitle>
        </CardHeader>
        <CardContent>
          {metrics.topIdeas.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Henüz oy verilmiş fikir yok</p>
          ) : (
            <div className="space-y-3">
              {metrics.topIdeas.map((idea: any, i) => (
                <div
                  key={idea.id}
                  className="flex items-center justify-between gap-4 p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/dashboard/innovation/${idea.id}`)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center text-xs font-bold shrink-0">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{idea.title}</p>
                      <p className="text-xs text-muted-foreground">{idea.code}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-1 text-sm font-medium text-green-700">
                      <ThumbsUp className="h-3.5 w-3.5" />
                      {idea.score >= 0 ? '+' : ''}{idea.score}
                    </div>
                    <Badge className={`text-xs ${IDEA_STATUS_CONFIG[idea.status]?.color ?? ''}`}>
                      {IDEA_STATUS_CONFIG[idea.status]?.label ?? idea.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
