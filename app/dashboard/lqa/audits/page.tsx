'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  ClipboardCheck,
  Search,
  Eye,
  Trash2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface AuditUser {
  id: string;
  name: string;
  surname: string;
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
  createdAt: string;
}

interface ApiResponse {
  data: Audit[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
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

export default function LQAAuditsPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'Admin';
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const fetchAudits = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (typeFilter !== 'ALL') params.set('type', typeFilter);
      if (search.trim()) params.set('search', search.trim());

      const res = await fetch(`/api/lqa/audits?${params.toString()}`);
      if (!res.ok) throw new Error('Denetimler alınamadı');
      const json: ApiResponse = await res.json();
      setAudits(Array.isArray(json) ? json : json.data ?? []);
      setTotal(json.meta?.total ?? 0);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Hata';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, typeFilter, search]);

  useEffect(() => {
    fetchAudits();
  }, [fetchAudits]);

  const handleDelete = async (auditId: string, auditCode: string) => {
    if (!confirm(`"${auditCode}" kodlu denetimi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`)) return;
    setDeletingId(auditId);
    try {
      const res = await fetch(`/api/lqa/audits/${auditId}`, { method: 'DELETE' });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error((errData as { error?: string }).error ?? 'Silinemedi');
      }
      setAudits((prev) => prev.filter((a) => a.id !== auditId));
      setTotal((prev) => prev - 1);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Silinemedi';
      setError(message);
    } finally {
      setDeletingId(null);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <ClipboardCheck className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Denetimler</h1>
            <p className="text-gray-500 text-sm">LQA denetim listesi ve yönetimi</p>
          </div>
        </div>
        <Button size="sm" asChild>
          <Link href="/dashboard/lqa/audits/new">
            <Plus className="w-4 h-4 mr-1" />
            Yeni Denetim
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Kod veya başlıkta ara…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Durum filtrele" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tüm Durumlar</SelectItem>
                <SelectItem value="TASLAK">Taslak</SelectItem>
                <SelectItem value="DEVAM_EDIYOR">Devam Ediyor</SelectItem>
                <SelectItem value="TAMAMLANDI">Tamamlandı</SelectItem>
                <SelectItem value="IPTAL">İptal</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={typeFilter}
              onValueChange={(v) => {
                setTypeFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Tür filtrele" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tüm Türler</SelectItem>
                <SelectItem value="IC">İç Denetim</SelectItem>
                <SelectItem value="DIS">Dış Denetim</SelectItem>
                <SelectItem value="MYSTERY">Mystery Guest</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : audits.length === 0 ? (
            <div className="text-center text-gray-400 py-16">
              <ClipboardCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Denetim bulunamadı</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-4 font-medium text-gray-600">Kod</th>
                    <th className="text-left p-4 font-medium text-gray-600">Başlık</th>
                    <th className="text-left p-4 font-medium text-gray-600">Tür</th>
                    <th className="text-left p-4 font-medium text-gray-600">Tarih</th>
                    <th className="text-left p-4 font-medium text-gray-600">Denetçi</th>
                    <th className="text-center p-4 font-medium text-gray-600">Puan</th>
                    <th className="text-center p-4 font-medium text-gray-600">Durum</th>
                    <th className="text-right p-4 font-medium text-gray-600">İşlem</th>
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
                      <tr key={audit.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4 font-mono text-xs text-gray-600 whitespace-nowrap">
                          {audit.code}
                        </td>
                        <td className="p-4">
                          <Link
                            href={`/dashboard/lqa/audits/${audit.id}`}
                            className="font-medium text-gray-900 hover:text-blue-600 hover:underline"
                          >
                            {audit.title}
                          </Link>
                        </td>
                        <td className="p-4 text-gray-600 whitespace-nowrap">
                          {AUDIT_TYPE_LABELS[audit.type] ?? audit.type}
                        </td>
                        <td className="p-4 text-gray-600 whitespace-nowrap">
                          {audit.auditDate
                            ? new Date(audit.auditDate).toLocaleDateString('tr-TR')
                            : '—'}
                        </td>
                        <td className="p-4 text-gray-600 whitespace-nowrap">
                          {audit.auditor
                            ? `${audit.auditor.name} ${audit.auditor.surname}`
                            : '—'}
                        </td>
                        <td className="p-4 text-center">
                          {audit.totalScore !== null ? (
                            <span className={`font-bold ${getScoreColor(audit.totalScore)}`}>
                              %{audit.totalScore.toFixed(0)}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <span
                            className={`text-xs px-2 py-1 rounded-full font-medium ${statusCfg.className}`}
                          >
                            {statusCfg.label}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/dashboard/lqa/audits/${audit.id}`}>
                                <Eye className="w-4 h-4" />
                              </Link>
                            </Button>
                            {isAdmin && audit.status === 'TAMAMLANDI' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDelete(audit.id, audit.code)}
                                disabled={deletingId === audit.id}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Toplam {total} denetim · Sayfa {page} / {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
              Önceki
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Sonraki
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
