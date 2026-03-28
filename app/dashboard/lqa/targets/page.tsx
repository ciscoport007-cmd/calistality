'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Legend,
} from 'recharts';
import { Plus, Target, Pencil, Trash2, AlertCircle, TrendingUp } from 'lucide-react';

interface Category {
  id: string;
  code: string;
  name: string;
}

interface LQATarget {
  id: string;
  category: { id: string; name: string; code: string };
  targetScore: number;
  period: string;
  year: number;
  actualScore?: number | null;
}

interface TargetFormData {
  categoryId: string;
  targetScore: string;
  period: string;
  year: string;
}

const PERIOD_LABELS: Record<string, string> = {
  ANNUAL: 'Yıllık',
  Q1: '1. Çeyrek',
  Q2: '2. Çeyrek',
  Q3: '3. Çeyrek',
  Q4: '4. Çeyrek',
};

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 3 }, (_, i) => CURRENT_YEAR + i - 1);

function getScoreColor(score: number | null | undefined): string {
  if (score === null || score === undefined) return 'text-gray-400';
  if (score >= 90) return 'text-green-600';
  if (score >= 80) return 'text-yellow-600';
  if (score >= 70) return 'text-orange-600';
  return 'text-red-600';
}

export default function LQATargetsPage() {
  const [targets, setTargets] = useState<LQATarget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<LQATarget | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [yearFilter, setYearFilter] = useState(String(CURRENT_YEAR));
  const [formData, setFormData] = useState<TargetFormData>({
    categoryId: '',
    targetScore: '90',
    period: 'ANNUAL',
    year: String(CURRENT_YEAR),
  });

  const fetchTargets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/lqa/targets?year=${yearFilter}`);
      if (!res.ok) throw new Error('Hedefler alınamadı');
      const data = await res.json();
      setTargets(Array.isArray(data) ? data : data.data ?? []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Hata';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [yearFilter]);

  useEffect(() => {
    Promise.all([
      fetch('/api/lqa/categories').then((r) => r.json()),
    ])
      .then(([catsData]) => {
        setCategories(Array.isArray(catsData) ? catsData : catsData.data ?? []);
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Hata';
        setError(message);
      });
  }, []);

  useEffect(() => {
    fetchTargets();
  }, [fetchTargets]);

  const openAdd = () => {
    setEditTarget(null);
    setFormData({
      categoryId: categories[0]?.id ?? '',
      targetScore: '90',
      period: 'ANNUAL',
      year: yearFilter,
    });
    setDialogOpen(true);
  };

  const openEdit = (t: LQATarget) => {
    setEditTarget(t);
    setFormData({
      categoryId: t.category.id,
      targetScore: String(t.targetScore),
      period: t.period,
      year: String(t.year),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.categoryId) {
      setError('Kategori seçilmelidir');
      return;
    }
    const score = parseFloat(formData.targetScore);
    if (isNaN(score) || score < 0 || score > 100) {
      setError('Hedef puan 0-100 arasında olmalıdır');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const body = {
        categoryId: formData.categoryId,
        targetScore: score,
        period: formData.period,
        year: parseInt(formData.year),
      };
      const url = editTarget ? `/api/lqa/targets/${editTarget.id}` : '/api/lqa/targets';
      const method = editTarget ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error((errData as { error?: string }).error ?? 'Kaydedilemedi');
      }
      await fetchTargets();
      setDialogOpen(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Hata';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu hedefi silmek istediğinizden emin misiniz?')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/lqa/targets/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Silinemedi');
      setTargets((prev) => prev.filter((t) => t.id !== id));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Hata';
      setError(message);
    } finally {
      setDeletingId(null);
    }
  };

  // Chart data: group annual targets by category for comparison
  const annualTargets = targets.filter((t) => t.period === 'ANNUAL');
  const chartData = annualTargets.map((t) => ({
    category:
      t.category.name.length > 15 ? t.category.name.slice(0, 15) + '…' : t.category.name,
    fullName: t.category.name,
    hedef: t.targetScore,
    fiili: t.actualScore ?? null,
  }));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 rounded-lg">
            <Target className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Kalite Hedefleri</h1>
            <p className="text-gray-500 text-sm">LQA kategori hedefleri ve performans takibi</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={openAdd}>
            <Plus className="w-4 h-4 mr-1" />
            Yeni Hedef
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
          <button className="ml-auto text-red-500 hover:text-red-700" onClick={() => setError(null)}>
            ✕
          </button>
        </div>
      )}

      {/* Comparison Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-orange-600" />
              Hedef vs Fiili Puan
            </CardTitle>
            <CardDescription>Yıllık kategoriler için karşılaştırma</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="category"
                  tick={{ fontSize: 10 }}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={55}
                />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v: unknown) => (v != null ? `%${v}` : 'Veri yok')}
                />
                <Legend />
                <Bar dataKey="hedef" name="Hedef" fill="#fed7aa" radius={[4, 4, 0, 0]} />
                <Bar dataKey="fiili" name="Fiili" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Targets Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : targets.length === 0 ? (
            <div className="text-center text-gray-400 py-16">
              <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Hedef tanımlanmamış</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={openAdd}>
                İlk hedefi ekle
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-4 font-medium text-gray-600">Kategori</th>
                    <th className="text-center p-4 font-medium text-gray-600">Dönem</th>
                    <th className="text-center p-4 font-medium text-gray-600">Yıl</th>
                    <th className="text-center p-4 font-medium text-gray-600">Hedef</th>
                    <th className="text-center p-4 font-medium text-gray-600">Fiili</th>
                    <th className="text-center p-4 font-medium text-gray-600">Fark</th>
                    <th className="text-center p-4 font-medium text-gray-600">Durum</th>
                    <th className="text-right p-4 font-medium text-gray-600">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {targets.map((target) => {
                    const actual = target.actualScore ?? null;
                    const diff = actual !== null ? actual - target.targetScore : null;
                    const met = diff !== null && diff >= 0;
                    return (
                      <tr key={target.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4 font-medium text-gray-900">{target.category.name}</td>
                        <td className="p-4 text-center text-gray-600">
                          {PERIOD_LABELS[target.period] ?? target.period}
                        </td>
                        <td className="p-4 text-center text-gray-600">{target.year}</td>
                        <td className="p-4 text-center font-bold text-orange-600">
                          %{target.targetScore}
                        </td>
                        <td className="p-4 text-center">
                          {actual !== null ? (
                            <span className={`font-bold ${getScoreColor(actual)}`}>
                              %{actual.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {diff !== null ? (
                            <span
                              className={`font-medium text-sm ${diff >= 0 ? 'text-green-600' : 'text-red-600'}`}
                            >
                              {diff >= 0 ? '+' : ''}
                              {diff.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {actual === null ? (
                            <span className="text-xs text-gray-400">Beklemede</span>
                          ) : met ? (
                            <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">
                              Hedef Tuttu
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-medium">
                              Hedef Tutmadı
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => openEdit(target)}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDelete(target.id)}
                              disabled={deletingId === target.id}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
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

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Hedef Düzenle' : 'Yeni Hedef Ekle'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="target-category">
                Kategori <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.categoryId}
                onValueChange={(v) => setFormData((prev) => ({ ...prev, categoryId: v }))}
              >
                <SelectTrigger id="target-category" className="mt-1">
                  <SelectValue placeholder="Kategori seçin" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="target-period">Dönem</Label>
                <Select
                  value={formData.period}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, period: v }))}
                >
                  <SelectTrigger id="target-period" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ANNUAL">Yıllık</SelectItem>
                    <SelectItem value="Q1">1. Çeyrek</SelectItem>
                    <SelectItem value="Q2">2. Çeyrek</SelectItem>
                    <SelectItem value="Q3">3. Çeyrek</SelectItem>
                    <SelectItem value="Q4">4. Çeyrek</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="target-year">Yıl</Label>
                <Select
                  value={formData.year}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, year: v }))}
                >
                  <SelectTrigger id="target-year" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="target-score">
                Hedef Puan (%) <span className="text-red-500">*</span>
              </Label>
              <div className="relative mt-1">
                <Input
                  id="target-score"
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={formData.targetScore}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, targetScore: e.target.value }))
                  }
                  className="pr-8"
                />
                <span className="absolute right-3 top-2.5 text-gray-400 text-sm">%</span>
              </div>
            </div>

            {/* Score preview */}
            {formData.targetScore && (
              <div
                className={`p-3 rounded-lg text-center border ${parseFloat(formData.targetScore) >= 90 ? 'bg-green-50 border-green-200' : parseFloat(formData.targetScore) >= 80 ? 'bg-yellow-50 border-yellow-200' : 'bg-orange-50 border-orange-200'}`}
              >
                <p className="text-xs text-gray-500">Hedef puan seviyesi</p>
                <p className={`font-bold text-lg mt-0.5 ${getScoreColor(parseFloat(formData.targetScore))}`}>
                  {parseFloat(formData.targetScore) >= 90
                    ? 'Mükemmel'
                    : parseFloat(formData.targetScore) >= 80
                      ? 'İyi'
                      : parseFloat(formData.targetScore) >= 70
                        ? 'Geliştirilmeli'
                        : 'Kritik'}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              İptal
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !formData.categoryId || !formData.targetScore}
            >
              {saving ? 'Kaydediliyor…' : editTarget ? 'Güncelle' : 'Ekle'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
