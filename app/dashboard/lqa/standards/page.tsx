'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  Plus,
  FileText,
  ChevronRight,
  Pencil,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Star,
} from 'lucide-react';

interface Category {
  id: string;
  code: string;
  name: string;
  description: string | null;
  weight: number;
  iconName: string | null;
  _count?: { criteria: number };
}

interface Criterion {
  id: string;
  code: string;
  description: string;
  weight: number;
  isCritical: boolean;
  category: { id: string; name: string };
}

const CATEGORY_COLORS = [
  { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'bg-blue-100', text: 'text-blue-600' },
  { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'bg-purple-100', text: 'text-purple-600' },
  { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'bg-emerald-100', text: 'text-emerald-600' },
  { bg: 'bg-orange-50', border: 'border-orange-200', icon: 'bg-orange-100', text: 'text-orange-600' },
  { bg: 'bg-pink-50', border: 'border-pink-200', icon: 'bg-pink-100', text: 'text-pink-600' },
  { bg: 'bg-teal-50', border: 'border-teal-200', icon: 'bg-teal-100', text: 'text-teal-600' },
  { bg: 'bg-yellow-50', border: 'border-yellow-200', icon: 'bg-yellow-100', text: 'text-yellow-600' },
  { bg: 'bg-indigo-50', border: 'border-indigo-200', icon: 'bg-indigo-100', text: 'text-indigo-600' },
];

interface CriterionFormData {
  code: string;
  description: string;
  weight: string;
  isCritical: boolean;
}

export default function LQAStandardsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [loadingCriteria, setLoadingCriteria] = useState(false);
  const [criteriaDialogOpen, setCriteriaDialogOpen] = useState(false);
  const [addCriterionOpen, setAddCriterionOpen] = useState(false);
  const [editCriterion, setEditCriterion] = useState<Criterion | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CriterionFormData>({
    code: '',
    description: '',
    weight: '1',
    isCritical: false,
  });

  useEffect(() => {
    fetch('/api/lqa/categories')
      .then((r) => {
        if (!r.ok) throw new Error('Kategoriler alınamadı');
        return r.json();
      })
      .then((data) => setCategories(Array.isArray(data) ? data : data.data ?? []))
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Hata';
        setError(message);
      })
      .finally(() => setLoadingCategories(false));
  }, []);

  const openCategory = (cat: Category) => {
    setSelectedCategory(cat);
    setCriteriaDialogOpen(true);
    setLoadingCriteria(true);
    fetch(`/api/lqa/criteria?categoryId=${cat.id}`)
      .then((r) => {
        if (!r.ok) throw new Error('Kriterler alınamadı');
        return r.json();
      })
      .then((data) => setCriteria(Array.isArray(data) ? data : data.data ?? []))
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Hata';
        setError(message);
      })
      .finally(() => setLoadingCriteria(false));
  };

  const openAddCriterion = () => {
    setEditCriterion(null);
    setFormData({ code: '', description: '', weight: '1', isCritical: false });
    setAddCriterionOpen(true);
  };

  const openEditCriterion = (c: Criterion) => {
    setEditCriterion(c);
    setFormData({
      code: c.code,
      description: c.description,
      weight: String(c.weight),
      isCritical: c.isCritical,
    });
    setAddCriterionOpen(true);
  };

  const handleSaveCriterion = async () => {
    if (!selectedCategory) return;
    setSaving(true);
    try {
      const body = {
        categoryId: selectedCategory.id,
        code: formData.code,
        description: formData.description,
        weight: parseFloat(formData.weight) || 1,
        isCritical: formData.isCritical,
      };
      const url = editCriterion ? `/api/lqa/criteria/${editCriterion.id}` : '/api/lqa/criteria';
      const method = editCriterion ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Kaydedilemedi');
      const saved: Criterion = await res.json();
      if (editCriterion) {
        setCriteria((prev) => prev.map((c) => (c.id === saved.id ? saved : c)));
      } else {
        setCriteria((prev) => [...prev, saved]);
        setCategories((prev) =>
          prev.map((cat) =>
            cat.id === selectedCategory.id
              ? { ...cat, _count: { criteria: (cat._count?.criteria ?? 0) + 1 } }
              : cat
          )
        );
      }
      setAddCriterionOpen(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Hata';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCriterion = async (criterionId: string) => {
    setDeletingId(criterionId);
    try {
      const res = await fetch(`/api/lqa/criteria/${criterionId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Silinemedi');
      setCriteria((prev) => prev.filter((c) => c.id !== criterionId));
      if (selectedCategory) {
        setCategories((prev) =>
          prev.map((cat) =>
            cat.id === selectedCategory.id
              ? { ...cat, _count: { criteria: Math.max(0, (cat._count?.criteria ?? 1) - 1) } }
              : cat
          )
        );
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Hata';
      setError(message);
    } finally {
      setDeletingId(null);
    }
  };

  if (loadingCategories) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-64" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-36 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <FileText className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">LQA Standart Kütüphanesi</h1>
            <p className="text-gray-500 text-sm">Kategori ve kriter yönetimi</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Category Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {categories.map((cat, idx) => {
          const colorSet = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
          return (
            <Card
              key={cat.id}
              className={`border cursor-pointer transition-all hover:shadow-md ${colorSet.bg} ${colorSet.border}`}
            >
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${colorSet.icon} flex-shrink-0`}>
                    <Star className={`w-5 h-5 ${colorSet.text}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 text-sm leading-tight">{cat.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Kod: {cat.code}</p>
                    <p className="text-xs text-gray-500">Ağırlık: %{cat.weight}</p>
                    <div className="flex items-center gap-1 mt-2">
                      <span className={`text-xs font-bold ${colorSet.text}`}>
                        {cat._count?.criteria ?? 0} kriter
                      </span>
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full mt-3 text-xs"
                  onClick={() => openCategory(cat)}
                >
                  Kriterleri Görüntüle
                  <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {categories.length === 0 && !loadingCategories && (
        <div className="text-center text-gray-400 py-16">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Kategori tanımlanmamış</p>
        </div>
      )}

      {/* Criteria Dialog */}
      <Dialog open={criteriaDialogOpen} onOpenChange={setCriteriaDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-purple-600" />
              {selectedCategory?.name} — Kriterler
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex justify-end">
              <Button size="sm" onClick={openAddCriterion}>
                <Plus className="w-4 h-4 mr-1" />
                Yeni Kriter Ekle
              </Button>
            </div>

            {loadingCriteria ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-14 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            ) : criteria.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-3 font-medium text-gray-600">Kod</th>
                      <th className="text-left p-3 font-medium text-gray-600">Açıklama</th>
                      <th className="text-center p-3 font-medium text-gray-600">Ağırlık</th>
                      <th className="text-center p-3 font-medium text-gray-600">Kritik</th>
                      <th className="text-right p-3 font-medium text-gray-600">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {criteria.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="p-3 font-mono text-xs text-gray-600 whitespace-nowrap">{c.code}</td>
                        <td className="p-3 text-gray-800">{c.description}</td>
                        <td className="p-3 text-center text-gray-600">{c.weight}</td>
                        <td className="p-3 text-center">
                          {c.isCritical ? (
                            <Badge className="bg-red-100 text-red-700 text-xs">Kritik</Badge>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => openEditCriterion(c)}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeleteCriterion(c.id)}
                              disabled={deletingId === c.id}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center text-gray-400 py-8 text-sm">
                Bu kategoride henüz kriter yok
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Criterion Dialog */}
      <Dialog open={addCriterionOpen} onOpenChange={setAddCriterionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editCriterion ? 'Kriter Düzenle' : 'Yeni Kriter Ekle'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="crit-code">Kriter Kodu</Label>
              <Input
                id="crit-code"
                value={formData.code}
                onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value }))}
                placeholder="Örn: K001"
              />
            </div>
            <div>
              <Label htmlFor="crit-desc">Açıklama</Label>
              <Input
                id="crit-desc"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Kriter açıklaması"
              />
            </div>
            <div>
              <Label htmlFor="crit-weight">Ağırlık</Label>
              <Input
                id="crit-weight"
                type="number"
                min="0.1"
                step="0.1"
                value={formData.weight}
                onChange={(e) => setFormData((prev) => ({ ...prev, weight: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="crit-critical"
                checked={formData.isCritical}
                onChange={(e) => setFormData((prev) => ({ ...prev, isCritical: e.target.checked }))}
                className="rounded"
              />
              <Label htmlFor="crit-critical" className="cursor-pointer">
                Kritik Kriter (başarısızlık durumunda uyarı)
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddCriterionOpen(false)}>
              İptal
            </Button>
            <Button onClick={handleSaveCriterion} disabled={saving || !formData.code || !formData.description}>
              {saving ? 'Kaydediliyor…' : editCriterion ? 'Güncelle' : 'Ekle'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
