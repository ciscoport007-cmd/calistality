'use client';

import { useState, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
  Upload,
  FileSpreadsheet,
  X,
  CheckCircle,
  AlertTriangle,
  Info,
  ArrowLeft,
  Loader2,
  History,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface SheetWarning {
  sheetName: string;
  warnings: string[];
}

interface ColDiag {
  index: number;
  letter: string;
  raw: string;
  num: number;
}

interface KapakRawRow {
  rowIdx: number;
  cells: Array<{ col: string; val: string | number | null }>;
}

interface KapakDiagnostic {
  sheetName: string;
  rowMap: Record<string, { idx: number; byLabel: boolean }>;
  sampleValues: { soldRoomToday: number; occupancyToday: number; adrToday: number; dailyRate: number };
  rawRows: KapakRawRow[];
}

interface UploadState {
  status: 'idle' | 'loading' | 'preview' | 'success' | 'error';
  message?: string;
  newDays?: string[];
  duplicateDays?: string[];
  totalParsed?: number;
  savedCount?: number;
  skippedCount?: number;
  sheetWarnings?: SheetWarning[];
  columnDiagnostic?: ColDiag[];
  kapakDiagnostics?: KapakDiagnostic[];
}

function ColumnDiagPanel({ cols }: { cols: ColDiag[] }) {
  const LY_CURRENT = [10, 11, 12]; // mevcut varsayım
  return (
    <details className="border border-gray-200 rounded-lg">
      <summary className="px-3 py-2 text-xs font-medium text-gray-600 cursor-pointer select-none">
        Sütun Tanısı — LY verileri doğru sütunda mı? (tıkla)
      </summary>
      <div className="px-3 pb-3 overflow-x-auto">
        <p className="text-xs text-gray-500 mb-2">
          Aşağıda ilk TOTAL satırının ham değerleri görünmektedir. Sarı satırlar{' '}
          <strong>şu an LY olarak okunan sütunlar (K=10, L=11, M=12)</strong>. Değerler 0
          ise sütun indeksleri yanlış olabilir.
        </p>
        <table className="text-xs font-mono border-collapse w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-200 px-2 py-1 text-left">İndeks</th>
              <th className="border border-gray-200 px-2 py-1 text-left">Sütun</th>
              <th className="border border-gray-200 px-2 py-1 text-left">Ham Değer</th>
              <th className="border border-gray-200 px-2 py-1 text-right">Sayısal</th>
            </tr>
          </thead>
          <tbody>
            {cols.map((c) => (
              <tr
                key={c.index}
                className={
                  LY_CURRENT.includes(c.index)
                    ? 'bg-yellow-50 font-semibold'
                    : c.index < 2
                    ? 'text-gray-400'
                    : ''
                }
              >
                <td className="border border-gray-200 px-2 py-1">{c.index}</td>
                <td className="border border-gray-200 px-2 py-1">{c.letter}</td>
                <td className="border border-gray-200 px-2 py-1 max-w-[160px] truncate">{c.raw || '—'}</td>
                <td className="border border-gray-200 px-2 py-1 text-right">
                  {c.num !== 0 ? c.num.toLocaleString('tr-TR') : <span className="text-gray-400">0</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function KapakDiagPanel({ diags }: { diags: KapakDiagnostic[] }) {
  if (!diags || diags.length === 0) return null;
  return (
    <div className="space-y-2">
      {diags.map((d) => {
        const hasData =
          d.sampleValues.soldRoomToday > 0 ||
          d.sampleValues.occupancyToday > 0 ||
          d.sampleValues.adrToday > 0;
        return (
          <div key={d.sheetName} className={`border rounded-lg ${hasData ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
            <div className={`px-3 py-2 flex items-center gap-2 text-xs font-semibold ${hasData ? 'text-green-800' : 'text-red-800'}`}>
              {hasData ? <CheckCircle className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
              KAPAK: {d.sheetName}
              {hasData ? ' — veri okundu ✓' : ' — veriler 0 (satır bulunamadı!)'}
            </div>
            <div className="px-3 pb-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-white rounded p-1.5 border border-gray-100">
                <span className="text-gray-500 block">Satılan Oda</span>
                <span className={`font-mono font-bold ${d.sampleValues.soldRoomToday > 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {d.sampleValues.soldRoomToday}
                </span>
              </div>
              <div className="bg-white rounded p-1.5 border border-gray-100">
                <span className="text-gray-500 block">Doluluk</span>
                <span className={`font-mono font-bold ${d.sampleValues.occupancyToday > 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {(d.sampleValues.occupancyToday * 100).toFixed(1)}%
                </span>
              </div>
              <div className="bg-white rounded p-1.5 border border-gray-100">
                <span className="text-gray-500 block">ADR</span>
                <span className={`font-mono font-bold ${d.sampleValues.adrToday > 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {d.sampleValues.adrToday.toFixed(0)} €
                </span>
              </div>
              <div className="bg-white rounded p-1.5 border border-gray-100">
                <span className="text-gray-500 block">Kur (EUR)</span>
                <span className={`font-mono font-bold ${d.sampleValues.dailyRate > 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {d.sampleValues.dailyRate > 0 ? d.sampleValues.dailyRate.toFixed(4) : '0'}
                </span>
              </div>
            </div>

            {/* Satır haritası */}
            <details className="px-3 pb-2">
              <summary className="text-xs text-gray-500 cursor-pointer select-none mb-1">
                Satır haritası (etiketle mi, yoksa sabit indeks mi kullanıldı?)
              </summary>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {Object.entries(d.rowMap).map(([lbl, info]) => (
                  <span
                    key={lbl}
                    className={`text-xs px-2 py-0.5 rounded-full font-mono ${info.byLabel ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}
                  >
                    {lbl}={info.idx} {info.byLabel ? '✓' : '(fallback)'}
                  </span>
                ))}
              </div>
            </details>

            {/* Ham satır dökümü */}
            {!hasData && (
              <details className="px-3 pb-3">
                <summary className="text-xs text-red-600 font-medium cursor-pointer select-none mb-1">
                  Ham satırlar (25-74) — verinin hangi satırda olduğunu bulmak için
                </summary>
                <div className="overflow-x-auto mt-1">
                  <table className="text-xs font-mono border-collapse w-full">
                    <thead>
                      <tr className="bg-red-100">
                        <th className="border border-red-200 px-1.5 py-1 text-left">Satır</th>
                        <th className="border border-red-200 px-1.5 py-1 text-left">A</th>
                        <th className="border border-red-200 px-1.5 py-1 text-left">B</th>
                        <th className="border border-red-200 px-1.5 py-1 text-left">C</th>
                        <th className="border border-red-200 px-1.5 py-1 text-left">D</th>
                        <th className="border border-red-200 px-1.5 py-1 text-left">E</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.rawRows.map((r) => {
                        const hasAnyVal = r.cells.some(c => c.val !== null && c.val !== '' && c.val !== 0);
                        if (!hasAnyVal) return null;
                        return (
                          <tr key={r.rowIdx} className="hover:bg-red-50">
                            <td className="border border-red-100 px-1.5 py-0.5 text-gray-400">{r.rowIdx}</td>
                            {r.cells.map((c) => (
                              <td key={c.col} className="border border-red-100 px-1.5 py-0.5 max-w-[120px] truncate">
                                {c.val !== null ? String(c.val) : <span className="text-gray-300">—</span>}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </details>
            )}
          </div>
        );
      })}
    </div>
  );
}

function WarningsPanel({ warnings }: { warnings: SheetWarning[] }) {
  if (warnings.length === 0) return null;
  return (
    <div className="space-y-2">
      {warnings.map((w) => (
        <div key={w.sheetName} className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-amber-800 mb-1 flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5" />
            {w.sheetName}
          </p>
          <ul className="space-y-0.5">
            {w.warnings.map((msg, i) => (
              <li key={i} className="text-xs text-amber-700">
                • {msg}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export default function YuklemePage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [state, setState] = useState<UploadState>({ status: 'idle' });

  const handleFile = useCallback((f: File) => {
    const name = f.name.toLowerCase();
    if (!name.endsWith('.xlsx') && !name.endsWith('.xls') && !name.endsWith('.csv')) {
      setState({ status: 'error', message: 'Sadece .xlsx, .xls veya .csv dosyası kabul edilir' });
      return;
    }
    setFile(f);
    setState({ status: 'idle' });
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  const upload = useCallback(
    async (mode: 'analyze' | 'newOnly' | 'overwrite' = 'analyze') => {
      if (!file) return;
      setState({ status: 'loading' });
      const fd = new FormData();
      fd.append('file', file);
      if (mode === 'overwrite') fd.append('forceOverwrite', 'true');
      if (mode === 'newOnly') fd.append('saveNewOnly', 'true');

      try {
        const res = await fetch('/api/finance/revenue/upload', { method: 'POST', body: fd });
        const json = await res.json();

        if (!res.ok) {
          setState({ status: 'error', message: json.error ?? 'Yükleme başarısız' });
          return;
        }

        if (json.preview) {
          setState({
            status: 'preview',
            message: json.message,
            newDays: json.newDays,
            duplicateDays: json.duplicateDays,
            totalParsed: json.totalParsed,
            sheetWarnings: json.sheetWarnings ?? [],
            columnDiagnostic: json.columnDiagnostic,
            kapakDiagnostics: json.kapakDiagnostics,
          });
          return;
        }

        setState({
          status: 'success',
          savedCount: json.savedCount,
          skippedCount: json.skippedCount,
          message: json.message,
          sheetWarnings: json.sheetWarnings ?? [],
          columnDiagnostic: json.columnDiagnostic,
          kapakDiagnostics: json.kapakDiagnostics,
        });
      } catch {
        setState({ status: 'error', message: 'Sunucu ile bağlantı kurulamadı' });
      }
    },
    [file]
  );

  const reset = () => {
    setFile(null);
    setState({ status: 'idle' });
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/finance/gelirler">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Geri
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Günlük Rapor Yükle</h1>
            <p className="text-sm text-gray-500">Daily Report dosyasını sisteme aktarın</p>
          </div>
        </div>
        <Link href="/dashboard/finance/gelirler/gecmis">
          <Button variant="outline" size="sm">
            <History className="h-4 w-4 mr-1" />
            Geçmiş
          </Button>
        </Link>
      </div>

      {/* Yükleme Alanı */}
      {state.status !== 'success' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dosya Seç</CardTitle>
            <CardDescription>
              Her gün için oluşturulan &quot;Daily Report&quot; Excel dosyasını yükleyin. Birden
              fazla günü içeren dosyalar da kabul edilir.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              onDrop={onDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onClick={() => fileRef.current?.click()}
              className={`relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
                dragging
                  ? 'border-indigo-500 bg-indigo-50'
                  : file
                  ? 'border-green-400 bg-green-50'
                  : 'border-gray-200 hover:border-indigo-400 hover:bg-gray-50'
              }`}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              {file ? (
                <div className="flex flex-col items-center gap-3">
                  <FileSpreadsheet className="h-12 w-12 text-green-500" />
                  <p className="font-semibold text-gray-800">{file.name}</p>
                  <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      reset();
                    }}
                    className="text-red-500 hover:text-red-700 flex items-center gap-1 text-sm mt-1"
                  >
                    <X className="h-4 w-4" /> Kaldır
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 text-gray-500">
                  <Upload className="h-12 w-12 text-gray-300" />
                  <p className="font-medium">Dosyayı sürükle bırak veya tıkla</p>
                  <p className="text-sm">.xlsx, .xls veya .csv formatı</p>
                </div>
              )}
            </div>

            {file && state.status === 'idle' && (
              <Button
                className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white"
                onClick={() => upload('analyze')}
              >
                <Upload className="h-4 w-4 mr-2" />
                Dosyayı Analiz Et ve Yükle
              </Button>
            )}

            {state.status === 'loading' && (
              <div className="flex items-center justify-center gap-2 mt-4 py-3 text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Dosya işleniyor, lütfen bekleyin...</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Önizleme — Duplicate Uyarısı */}
      {state.status === 'preview' && (
        <Card className="border-yellow-300">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="h-5 w-5" />
              Yükleme Özeti
            </CardTitle>
            <CardDescription>{state.message}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(state.sheetWarnings?.length ?? 0) > 0 && (
              <WarningsPanel warnings={state.sheetWarnings!} />
            )}
            {state.columnDiagnostic && (
              <ColumnDiagPanel cols={state.columnDiagnostic} />
            )}
            <KapakDiagPanel diags={state.kapakDiagnostics ?? []} />

            {(state.newDays?.length ?? 0) > 0 && (
              <div>
                <p className="text-sm font-medium text-green-700 mb-2 flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  Yeni günler ({state.newDays!.length} adet)
                </p>
                <div className="flex flex-wrap gap-2">
                  {state.newDays!.map((d) => (
                    <Badge key={d} className="bg-green-100 text-green-800 border-green-200">
                      {format(new Date(d), 'dd MMM yyyy', { locale: tr })}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {(state.duplicateDays?.length ?? 0) > 0 && (
              <div>
                <p className="text-sm font-medium text-yellow-700 mb-2 flex items-center gap-1">
                  <Info className="h-4 w-4" />
                  Zaten mevcut günler ({state.duplicateDays!.length} adet)
                </p>
                <div className="flex flex-wrap gap-2">
                  {state.duplicateDays!.map((d) => (
                    <Badge key={d} variant="outline" className="border-yellow-300 text-yellow-700">
                      {format(new Date(d), 'dd MMM yyyy', { locale: tr })}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              {(state.newDays?.length ?? 0) > 0 && (
                <Button
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  onClick={() => upload('newOnly')}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Sadece Yenileri Kaydet ({state.newDays!.length} gün)
                </Button>
              )}
              {(state.duplicateDays?.length ?? 0) > 0 && (
                <Button
                  variant="outline"
                  className="border-red-300 text-red-600 hover:bg-red-50"
                  onClick={() => upload('overwrite')}
                >
                  Tüm Günleri Üzerine Yaz
                </Button>
              )}
              <Button variant="ghost" onClick={reset}>
                İptal
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Başarı */}
      {state.status === 'success' && (
        <div className="space-y-4">
          <Card className="border-green-300 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center gap-4 text-center">
                <CheckCircle className="h-14 w-14 text-green-500" />
                <div>
                  <p className="text-lg font-semibold text-green-800">{state.message}</p>
                  <p className="text-sm text-green-600 mt-1">
                    {state.savedCount} gün kaydedildi
                    {(state.skippedCount ?? 0) > 0 && `, ${state.skippedCount} gün atlandı`}
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button onClick={reset} variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    Başka Dosya Yükle
                  </Button>
                  <Link href="/dashboard/finance/gelirler">
                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
                      Gelirlere Dön
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          {(state.sheetWarnings?.length ?? 0) > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">Veri Uyarıları</p>
              <WarningsPanel warnings={state.sheetWarnings!} />
            </div>
          )}
          {state.columnDiagnostic && (
            <ColumnDiagPanel cols={state.columnDiagnostic} />
          )}
          <KapakDiagPanel diags={state.kapakDiagnostics ?? []} />
        </div>
      )}

      {/* Hata */}
      {state.status === 'error' && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {state.message}
          <button onClick={() => setState({ status: 'idle' })} className="ml-auto">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Bilgi Kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="bg-gray-50 border-gray-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-600 flex items-center gap-2">
              <Info className="h-4 w-4" />
              Excel Formatı
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-gray-500 space-y-1">
            <p>• Sheet adı <strong>DD.MM.YYYY</strong> formatında olmalıdır</p>
            <p>• KAPAK sayfaları otomatik atlanır</p>
            <p>• B sütununda kategori, C-J sütunlarında gelir verileri</p>
            <p>• K-M sütunlarında LY (Geçen Yıl) verileri</p>
            <p>• Tek dosyada birden fazla gün desteklenir</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-50 border-gray-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-600 flex items-center gap-2">
              <Info className="h-4 w-4" />
              CSV Formatı
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-gray-500 space-y-1">
            <p>• Dosya adında <strong>DD.MM.YYYY</strong> tarihi olmalıdır</p>
            <p>• İlk satır başlık (atlanır), virgül veya noktalı virgül ayraç</p>
            <p>• Sütun sırası: Kategori, DailyTL, DailyEUR, MonthlyTL,</p>
            <p>• &nbsp;&nbsp;MonthlyEUR, BudgetTL, BudgetEUR, YearlyEUR, YearlyBudget</p>
            <p>• Tek dosya = tek gün</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
