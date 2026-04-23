'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
  ArrowLeft,
  Trash2,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  AlertTriangle,
  Loader2,
  Upload,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface HistoryRow {
  id: string;
  reportDate: string;
  fileName: string;
  sheetName: string;
  entryCount: number;
  uploadedBy: string;
  createdAt: string;
}

interface Meta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function GecmisPage() {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const fetchHistory = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/finance/revenue/history?page=${page}&limit=20`);
      const json = await res.json();
      if (json.success) {
        setRows(json.data);
        setMeta(json.meta);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory(1);
  }, [fetchHistory]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/finance/revenue/history?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setRows((prev) => prev.filter((r) => r.id !== id));
        setMeta((prev) => ({ ...prev, total: prev.total - 1 }));
      }
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/finance/gelirler/yukle">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Geri
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Yükleme Geçmişi</h1>
            <p className="text-sm text-gray-500">
              Sisteme aktarılan tüm günlük raporlar ({meta.total} kayıt)
            </p>
          </div>
        </div>
        <Link href="/dashboard/finance/gelirler/yukle">
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Yeni Yükle
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-gray-700">Yüklenen Raporlar</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              Yükleniyor...
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
              <FileSpreadsheet className="h-10 w-10" />
              <p className="text-sm">Henüz yükleme yapılmamış</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Tarih</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Dosya</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Sayfa</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-600">Kayıt</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Yükleyen</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Yükleme Zamanı</th>
                    <th className="py-3 px-4" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-3 px-4 font-medium text-gray-900">
                        {format(new Date(row.reportDate), 'dd MMM yyyy', { locale: tr })}
                      </td>
                      <td className="py-3 px-4 text-gray-600 max-w-[180px] truncate" title={row.fileName}>
                        {row.fileName}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="text-xs font-mono">
                          {row.sheetName}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center text-gray-600">{row.entryCount}</td>
                      <td className="py-3 px-4 text-gray-600">{row.uploadedBy}</td>
                      <td className="py-3 px-4 text-gray-500 text-xs">
                        {format(new Date(row.createdAt), 'dd.MM.yyyy HH:mm')}
                      </td>
                      <td className="py-3 px-4">
                        {confirmId === row.id ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-red-600">Emin misin?</span>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-6 px-2 text-xs"
                              disabled={deletingId === row.id}
                              onClick={() => handleDelete(row.id)}
                            >
                              {deletingId === row.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                'Sil'
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-xs"
                              onClick={() => setConfirmId(null)}
                            >
                              İptal
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-gray-400 hover:text-red-500"
                            onClick={() => setConfirmId(row.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <span className="text-xs text-gray-500">
                Sayfa {meta.page} / {meta.totalPages} ({meta.total} kayıt)
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={meta.page <= 1}
                  onClick={() => fetchHistory(meta.page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={meta.page >= meta.totalPages}
                  onClick={() => fetchHistory(meta.page + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-start gap-2 text-amber-800 text-xs">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p>
              Bir raporu sildiğinizde o güne ait tüm gelir kayıtları kalıcı olarak silinir ve
              geri alınamaz.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
