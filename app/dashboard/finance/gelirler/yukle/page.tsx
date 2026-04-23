'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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

interface UploadState {
  status: 'idle' | 'loading' | 'preview' | 'success' | 'error';
  message?: string;
  newDays?: string[];
  duplicateDays?: string[];
  totalParsed?: number;
  savedCount?: number;
  skippedCount?: number;
}

export default function YuklemePage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [state, setState] = useState<UploadState>({ status: 'idle' });
  const [overwriteMode, setOverwriteMode] = useState(false);

  const handleFile = useCallback((f: File) => {
    if (!f.name.endsWith('.xlsx') && !f.name.endsWith('.xls')) {
      setState({ status: 'error', message: 'Sadece .xlsx veya .xls dosyası kabul edilir' });
      return;
    }
    setFile(f);
    setState({ status: 'idle' });
    setOverwriteMode(false);
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
          });
          return;
        }

        setState({
          status: 'success',
          savedCount: json.savedCount,
          skippedCount: json.skippedCount,
          message: json.message,
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
    setOverwriteMode(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/finance/gelirler">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Geri
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Günlük Rapor Yükle</h1>
          <p className="text-sm text-gray-500">Daily Report XLSX dosyasını sisteme aktarın</p>
        </div>
      </div>

      {/* Yükleme Alanı */}
      {state.status !== 'success' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dosya Seç</CardTitle>
            <CardDescription>
              Her gün için oluşturulan &quot;Daily Report&quot; Excel dosyasını yükleyin. Birden fazla günü içeren
              dosyalar da kabul edilir.
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
                accept=".xlsx,.xls"
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
                  <p className="text-sm">.xlsx veya .xls formatı</p>
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

      {/* Bilgi Kartı */}
      <Card className="bg-gray-50 border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-gray-600 flex items-center gap-2">
            <Info className="h-4 w-4" />
            Beklenen Dosya Formatı
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-gray-500 space-y-1">
          <p>• Her günlük sheet adı <strong>DD.MM.YYYY</strong> formatında olmalıdır</p>
          <p>• KAPAK sayfaları otomatik atlanır</p>
          <p>• B sütununda kategori adları, C-J sütunlarında gelir verileri olmalıdır</p>
          <p>• Tek bir dosyada birden fazla gün bulunabilir</p>
          <p>• Aynı gün tekrar yüklenirse sistem uyarı verir</p>
        </CardContent>
      </Card>
    </div>
  );
}
