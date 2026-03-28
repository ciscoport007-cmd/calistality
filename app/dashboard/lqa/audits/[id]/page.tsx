'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  ClipboardCheck,
  AlertCircle,
  CheckCircle2,
  Camera,
  ChevronDown,
  ChevronUp,
  Award,
} from 'lucide-react';

interface AuditUser {
  id: string;
  name: string;
  surname: string;
}

interface AuditItem {
  id: string;
  criterionId: string;
  criterion: {
    id: string;
    code: string;
    description: string;
    weight: number;
    isCritical: boolean;
    category: { id: string; name: string; code: string };
  };
  answer: 'EVET' | 'HAYIR' | 'NA' | null;
  notes: string | null;
  score: number | null;
}

interface AuditCategory {
  id: string;
  code: string;
  name: string;
  iconName: string | null;
}

interface Audit {
  id: string;
  code: string;
  title: string;
  type: string;
  auditDate: string;
  auditor: AuditUser | null;
  totalScore: number | null;
  status: string;
  notes: string | null;
  areaInfo: string | null;
  categories: AuditCategory[];
  items: AuditItem[];
}

interface CategoryGroup {
  category: AuditCategory;
  items: AuditItem[];
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

type AnswerValue = 'EVET' | 'HAYIR' | 'NA';

function getScoreColor(score: number | null): string {
  if (score === null) return 'text-gray-400';
  if (score >= 90) return 'text-green-600';
  if (score >= 80) return 'text-yellow-600';
  if (score >= 70) return 'text-orange-600';
  return 'text-red-600';
}

function getScoreBg(score: number | null): string {
  if (score === null) return 'bg-gray-50';
  if (score >= 90) return 'bg-green-50 border-green-200';
  if (score >= 80) return 'bg-yellow-50 border-yellow-200';
  if (score >= 70) return 'bg-orange-50 border-orange-200';
  return 'bg-red-50 border-red-200';
}

export default function AuditDetailPage() {
  const params = useParams();
  const router = useRouter();
  const auditId = params.id as string;

  const [audit, setAudit] = useState<Audit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [localItems, setLocalItems] = useState<Map<string, AuditItem>>(new Map());

  const fetchAudit = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/lqa/audits/${auditId}`);
      if (!res.ok) throw new Error('Denetim bulunamadı');
      const data: Audit = await res.json();
      setAudit(data);
      const itemMap = new Map<string, AuditItem>();
      (data.items ?? []).forEach((item) => itemMap.set(item.id, item));
      setLocalItems(itemMap);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Hata';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [auditId]);

  useEffect(() => {
    fetchAudit();
  }, [fetchAudit]);

  const handleAnswer = async (item: AuditItem, answer: AnswerValue) => {
    // Optimistic update
    setLocalItems((prev) => {
      const next = new Map(prev);
      next.set(item.id, { ...item, answer });
      return next;
    });

    setSavingItemId(item.id);
    try {
      const res = await fetch(`/api/lqa/audits/${auditId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: item.id, answer, notes: item.notes }),
      });
      if (!res.ok) throw new Error('Kaydedilemedi');
      const updated: AuditItem = await res.json();
      setLocalItems((prev) => {
        const next = new Map(prev);
        next.set(updated.id, updated);
        return next;
      });
    } catch (err: unknown) {
      // Revert on error
      setLocalItems((prev) => {
        const next = new Map(prev);
        next.set(item.id, item);
        return next;
      });
      setError(err instanceof Error ? err.message : 'Kaydetme hatası');
    } finally {
      setSavingItemId(null);
    }
  };

  const handleNotesChange = async (item: AuditItem, notes: string) => {
    setLocalItems((prev) => {
      const next = new Map(prev);
      next.set(item.id, { ...item, notes });
      return next;
    });
  };

  const handleNotesBlur = async (item: AuditItem) => {
    const current = localItems.get(item.id) ?? item;
    if (current.notes === item.notes) return;
    setSavingItemId(item.id);
    try {
      const res = await fetch(`/api/lqa/audits/${auditId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: item.id, answer: current.answer, notes: current.notes }),
      });
      if (!res.ok) throw new Error('Kaydedilemedi');
      const updated: AuditItem = await res.json();
      setLocalItems((prev) => {
        const next = new Map(prev);
        next.set(updated.id, updated);
        return next;
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Not kaydetme hatası');
    } finally {
      setSavingItemId(null);
    }
  };

  const handleComplete = async () => {
    setCompleting(true);
    try {
      const res = await fetch(`/api/lqa/audits/${auditId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error((errData as { error?: string }).error ?? 'Tamamlanamadı');
      }
      await fetchAudit();
      setCompleteDialogOpen(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Hata');
    } finally {
      setCompleting(false);
    }
  };

  const toggleCategory = (catId: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) {
        next.delete(catId);
      } else {
        next.add(catId);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-72" />
          <div className="h-24 bg-gray-200 rounded" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (error && !audit) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          Hata: {error}
        </div>
      </div>
    );
  }

  if (!audit) return null;

  // Group items by category
  const categoryGroups: CategoryGroup[] = (audit.categories ?? []).map((cat) => ({
    category: cat,
    items: (audit.items ?? []).filter(
      (item) => item.criterion?.category?.id === cat.id
    ),
  }));

  const totalItems = audit.items?.length ?? 0;
  const answeredItems = [...localItems.values()].filter((item) => item.answer !== null).length;
  const progress = totalItems > 0 ? Math.round((answeredItems / totalItems) * 100) : 0;

  const statusCfg =
    STATUS_CONFIG[audit.status] ?? { label: audit.status, className: 'bg-gray-100 text-gray-700' };
  const isEditable = audit.status === 'TASLAK' || audit.status === 'DEVAM_EDIYOR';

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/lqa/audits">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Denetimler
          </Link>
        </Button>
      </div>

      {/* Audit Info Card */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ClipboardCheck className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-gray-900">{audit.title}</h1>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCfg.className}`}
                  >
                    {statusCfg.label}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {audit.code} · {AUDIT_TYPE_LABELS[audit.type] ?? audit.type} ·{' '}
                  {audit.auditDate
                    ? new Date(audit.auditDate).toLocaleDateString('tr-TR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : '—'}
                  {audit.auditor ? ` · ${audit.auditor.name} ${audit.auditor.surname}` : ''}
                </p>
                {audit.areaInfo && (
                  <p className="text-xs text-gray-400 mt-0.5">Alan: {audit.areaInfo}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Score */}
              {audit.totalScore !== null && (
                <div
                  className={`text-center px-4 py-2 rounded-xl border ${getScoreBg(audit.totalScore)}`}
                >
                  <p className="text-xs text-gray-500 font-medium">Toplam Puan</p>
                  <p className={`text-3xl font-bold ${getScoreColor(audit.totalScore)}`}>
                    %{audit.totalScore.toFixed(1)}
                  </p>
                </div>
              )}

              {/* Progress */}
              <div className="text-center">
                <p className="text-xs text-gray-500 font-medium">İlerleme</p>
                <p className="text-3xl font-bold text-blue-600">%{progress}</p>
                <p className="text-xs text-gray-400">
                  {answeredItems}/{totalItems}
                </p>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-blue-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
          <button className="ml-auto text-red-500 hover:text-red-700" onClick={() => setError(null)}>
            ✕
          </button>
        </div>
      )}

      {/* Category Sections */}
      {categoryGroups.map(({ category, items: catItems }) => {
        const localCatItems = catItems.map((item) => localItems.get(item.id) ?? item);
        const answeredCat = localCatItems.filter((i) => i.answer !== null).length;
        const isCollapsed = collapsedCategories.has(category.id);

        return (
          <Card key={category.id}>
            <CardHeader
              className="pb-3 cursor-pointer select-none"
              onClick={() => toggleCategory(category.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-blue-100 rounded">
                    <ClipboardCheck className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{category.name}</CardTitle>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {answeredCat}/{catItems.length} kriter yanıtlandı
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-gray-200 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full bg-blue-500 transition-all"
                      style={{
                        width: catItems.length > 0 ? `${(answeredCat / catItems.length) * 100}%` : '0%',
                      }}
                    />
                  </div>
                  {answeredCat === catItems.length && catItems.length > 0 ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : null}
                  {isCollapsed ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </div>
            </CardHeader>

            {!isCollapsed && (
              <CardContent className="pt-0">
                {catItems.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">Bu kategori için kriter yok</p>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="text-left p-3 font-medium text-gray-600 w-8">#</th>
                          <th className="text-left p-3 font-medium text-gray-600">Kriter</th>
                          <th className="text-center p-3 font-medium text-gray-600 whitespace-nowrap">Cevap</th>
                          <th className="text-left p-3 font-medium text-gray-600">Not</th>
                          <th className="text-center p-3 font-medium text-gray-600 w-10">Foto</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {catItems.map((item, idx) => {
                          const localItem = localItems.get(item.id) ?? item;
                          const isSaving = savingItemId === item.id;
                          return (
                            <tr
                              key={item.id}
                              className={`${localItem.answer === null && isEditable ? 'bg-amber-50/30' : ''} hover:bg-gray-50 transition-colors`}
                            >
                              <td className="p-3 text-gray-400 text-xs">{idx + 1}</td>
                              <td className="p-3">
                                <div className="flex items-start gap-1.5">
                                  {item.criterion.isCritical && (
                                    <span className="mt-0.5 inline-block w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                                  )}
                                  <span className="text-gray-800">{item.criterion.description}</span>
                                </div>
                                <p className="text-xs text-gray-400 mt-0.5 font-mono">
                                  {item.criterion.code}
                                </p>
                              </td>
                              <td className="p-3">
                                <div className="flex items-center justify-center gap-1">
                                  {(['EVET', 'HAYIR', 'NA'] as AnswerValue[]).map((ans) => (
                                    <button
                                      key={ans}
                                      type="button"
                                      disabled={!isEditable || isSaving}
                                      onClick={() => isEditable && handleAnswer(item, ans)}
                                      className={`px-2 py-1 rounded text-xs font-medium border transition-all ${
                                        localItem.answer === ans
                                          ? ans === 'EVET'
                                            ? 'bg-green-500 text-white border-green-500'
                                            : ans === 'HAYIR'
                                              ? 'bg-red-500 text-white border-red-500'
                                              : 'bg-gray-500 text-white border-gray-500'
                                          : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                                      } ${!isEditable ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                                    >
                                      {ans === 'NA' ? 'N/A' : ans}
                                    </button>
                                  ))}
                                  {isSaving && (
                                    <span className="text-xs text-gray-400 ml-1">…</span>
                                  )}
                                </div>
                              </td>
                              <td className="p-3">
                                <Input
                                  value={localItem.notes ?? ''}
                                  onChange={(e) => handleNotesChange(localItem, e.target.value)}
                                  onBlur={() => handleNotesBlur(localItem)}
                                  placeholder="Not ekle…"
                                  disabled={!isEditable}
                                  className="h-7 text-xs"
                                />
                              </td>
                              <td className="p-3 text-center">
                                <button
                                  type="button"
                                  disabled={!isEditable}
                                  className="text-gray-300 hover:text-gray-500 disabled:opacity-30"
                                  title="Fotoğraf ekle (yakında)"
                                >
                                  <Camera className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}

      {/* Complete Button */}
      {isEditable && (
        <div className="flex justify-end pt-2">
          <Button
            size="lg"
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={() => setCompleteDialogOpen(true)}
          >
            <CheckCircle2 className="w-5 h-5 mr-2" />
            Denetimi Tamamla
          </Button>
        </div>
      )}

      {/* Completed score summary */}
      {audit.status === 'TAMAMLANDI' && audit.totalScore !== null && (
        <Card className={`border-2 ${getScoreBg(audit.totalScore)}`}>
          <CardContent className="pt-6 pb-6">
            <div className="text-center">
              <Award className={`w-12 h-12 mx-auto mb-3 ${getScoreColor(audit.totalScore)}`} />
              <p className="text-gray-600 font-medium">Denetim Tamamlandı</p>
              <p className={`text-5xl font-bold mt-2 ${getScoreColor(audit.totalScore)}`}>
                %{audit.totalScore.toFixed(1)}
              </p>
              <p className={`text-sm mt-2 font-medium ${getScoreColor(audit.totalScore)}`}>
                {audit.totalScore >= 90
                  ? 'Mükemmel Performans'
                  : audit.totalScore >= 80
                    ? 'İyi Performans'
                    : audit.totalScore >= 70
                      ? 'Geliştirilmesi Gerekiyor'
                      : 'Kritik Düzeltmeler Gerekli'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Complete Confirmation Dialog */}
      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Denetimi Tamamla</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-gray-600">
            <p>
              Denetimi tamamlamak istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </p>
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
              <p className="font-medium text-blue-800">Denetim özeti:</p>
              <ul className="mt-1 space-y-1 text-blue-700">
                <li>• Toplam kriter: {totalItems}</li>
                <li>• Yanıtlanan: {answeredItems}</li>
                <li>• Yanıtsız: {totalItems - answeredItems}</li>
              </ul>
            </div>
            {totalItems - answeredItems > 0 && (
              <p className="text-amber-600 font-medium">
                Uyarı: {totalItems - answeredItems} kriter henüz yanıtlanmamış. N/A olarak sayılacak.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteDialogOpen(false)}>
              Geri Dön
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handleComplete}
              disabled={completing}
            >
              {completing ? 'Tamamlanıyor…' : 'Tamamla'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
