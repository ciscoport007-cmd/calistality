'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, ClipboardCheck, AlertCircle } from 'lucide-react';

interface UserOption {
  id: string;
  name: string;
  surname: string;
  email: string;
}

interface Category {
  id: string;
  code: string;
  name: string;
  weight: number;
}

interface FormData {
  title: string;
  type: string;
  auditDate: string;
  auditorId: string;
  selectedCategories: string[];
  areaInfo: string;
  notes: string;
}

export default function NewAuditPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserOption[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    title: '',
    type: 'IC',
    auditDate: new Date().toISOString().slice(0, 10),
    auditorId: '',
    selectedCategories: [],
    areaInfo: '',
    notes: '',
  });

  useEffect(() => {
    Promise.all([
      fetch('/api/users').then((r) => r.json()),
      fetch('/api/lqa/categories').then((r) => r.json()),
    ])
      .then(([usersData, categoriesData]) => {
        const usersList: UserOption[] = Array.isArray(usersData)
          ? usersData
          : usersData.data ?? [];
        const catsList: Category[] = Array.isArray(categoriesData)
          ? categoriesData
          : categoriesData.data ?? [];
        setUsers(usersList);
        setCategories(catsList);
        // Default: all categories selected
        setFormData((prev) => ({
          ...prev,
          selectedCategories: catsList.map((c) => c.id),
        }));
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Hata';
        setError(message);
      })
      .finally(() => setLoading(false));
  }, []);

  const toggleCategory = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedCategories: prev.selectedCategories.includes(id)
        ? prev.selectedCategories.filter((c) => c !== id)
        : [...prev.selectedCategories, id],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('Denetim başlığı zorunludur');
      return;
    }
    if (formData.selectedCategories.length === 0) {
      setError('En az bir kategori seçilmelidir');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/lqa/audits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title.trim(),
          type: formData.type,
          auditDate: formData.auditDate,
          auditorId: formData.auditorId || null,
          categoryIds: formData.selectedCategories,
          areaInfo: formData.areaInfo.trim() || null,
          notes: formData.notes.trim() || null,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error((errData as { error?: string }).error ?? 'Denetim oluşturulamadı');
      }
      const created = await res.json();
      const auditId = created.id ?? created.data?.id;
      router.push(`/dashboard/lqa/audits/${auditId}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Hata';
      setError(message);
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-64" />
          <div className="h-96 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/lqa/audits">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Geri
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <ClipboardCheck className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Yeni LQA Denetimi</h1>
            <p className="text-gray-500 text-sm">Denetim bilgilerini girin</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Temel Bilgiler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">
                Denetim Başlığı <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Örn: Ön Büro Aylık LQA Denetimi"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">
                  Denetim Türü <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, type: v }))}
                >
                  <SelectTrigger id="type" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IC">İç Denetim</SelectItem>
                    <SelectItem value="DIS">Dış Denetim</SelectItem>
                    <SelectItem value="MYSTERY">Mystery Guest</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="auditDate">
                  Denetim Tarihi <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="auditDate"
                  type="date"
                  value={formData.auditDate}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, auditDate: e.target.value }))
                  }
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="auditor">Denetçi</Label>
              <Select
                value={formData.auditorId || 'NONE'}
                onValueChange={(v) => setFormData((prev) => ({ ...prev, auditorId: v === 'NONE' ? '' : v }))}
              >
                <SelectTrigger id="auditor" className="mt-1">
                  <SelectValue placeholder="Denetçi seçin (isteğe bağlı)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">— Seçiniz —</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} {u.surname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="areaInfo">Alan / Oda Bilgisi</Label>
              <Input
                id="areaInfo"
                value={formData.areaInfo}
                onChange={(e) => setFormData((prev) => ({ ...prev, areaInfo: e.target.value }))}
                placeholder="Örn: 101-110 numaralı odalar, Restoran, Lobi"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="notes">Notlar</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Denetim öncesi notlar veya özel talimatlar"
                rows={3}
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Category Selection */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Denetlenecek Kategoriler{' '}
                <span className="text-sm font-normal text-gray-500">
                  ({formData.selectedCategories.length} seçili)
                </span>
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      selectedCategories: categories.map((c) => c.id),
                    }))
                  }
                >
                  Tümünü Seç
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, selectedCategories: [] }))
                  }
                >
                  Temizle
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {categories.map((cat) => (
                <label
                  key={cat.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    formData.selectedCategories.includes(cat.id)
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <Checkbox
                    checked={formData.selectedCategories.includes(cat.id)}
                    onCheckedChange={() => toggleCategory(cat.id)}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">{cat.name}</p>
                    <p className="text-xs text-gray-500">Ağırlık: %{cat.weight}</p>
                  </div>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" asChild>
            <Link href="/dashboard/lqa/audits">İptal</Link>
          </Button>
          <Button
            type="submit"
            disabled={saving || !formData.title.trim() || formData.selectedCategories.length === 0}
          >
            {saving ? 'Oluşturuluyor…' : 'Denetimi Oluştur'}
          </Button>
        </div>
      </form>
    </div>
  );
}
