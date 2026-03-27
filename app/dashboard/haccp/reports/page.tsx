'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { TrendingUp, Thermometer, CheckSquare, Bug, FlaskConical, ClipboardList, Download, AlertTriangle } from 'lucide-react';

interface TempLog {
  id: string;
  equipment: { code: string; name: string; location: string; minTemp: number | null; maxTemp: number | null };
  temperature: number;
  measuredAt: string;
  isOutOfRange: boolean;
  correctiveAction: string | null;
  measuredBy: { name: string; surname: string };
}

interface CCPChecklist {
  id: string;
  ccp: { code: string; name: string; process: string };
  checkDate: string;
  status: string;
  measuredValue: number | null;
  nonConformity: string | null;
  isApproved: boolean;
  checkedBy: { name: string; surname: string };
}

interface PestLog {
  id: string;
  station: { code: string; name: string; areaType: string; location: string };
  controlDate: string;
  status: string;
  findings: string | null;
  externalCompany: string | null;
  inspectedBy: { name: string; surname: string };
}

interface FoodSample {
  id: string;
  code: string;
  productName: string;
  sampleDate: string;
  mealType: string | null;
  storageTemp: number | null;
  expiryDateTime: string;
  isExpired: boolean;
  isDisposed: boolean;
  disposedAt: string | null;
  createdBy: { name: string; surname: string };
}

const processLabels: Record<string, string> = {
  PISIRME: 'Pişirme', SOGUTMA: 'Soğutma', SAKLAMA: 'Saklama',
  SERVIS: 'Servis', HAZIRLIK: 'Hazırlık', TESLIM: 'Teslim Alma',
};

const areaLabels: Record<string, string> = {
  MUTFAK: 'Mutfak', DEPO: 'Depo', COP_ALANI: 'Çöp Alanı',
  RESTORAN: 'Restoran', BAHCE: 'Bahçe', TEKNIK: 'Teknik Alan', DIGER: 'Diğer',
};

const pestStatusLabels: Record<string, string> = {
  TEMIZ: 'Temiz', AKTIVITE_VAR: 'Aktivite Var', HASARLI: 'Hasarlı', DEGISTIRILDI: 'Değiştirildi',
};

export default function ReportsPage() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));

  const [tempLogs, setTempLogs] = useState<TempLog[]>([]);
  const [ccpLogs, setCCPLogs] = useState<CCPChecklist[]>([]);
  const [pestLogs, setPestLogs] = useState<PestLog[]>([]);
  const [sampleLogs, setSampleLogs] = useState<FoodSample[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, cRes, pRes, sRes] = await Promise.all([
        fetch(`/api/haccp/temperature?startDate=${startDate}&endDate=${endDate}`),
        fetch(`/api/haccp/ccp/checklists?startDate=${startDate}&endDate=${endDate}`),
        fetch(`/api/haccp/pest/logs?startDate=${startDate}&endDate=${endDate}`),
        fetch(`/api/haccp/food-samples?startDate=${startDate}&endDate=${endDate}`),
      ]);
      if (tRes.ok) setTempLogs(await tRes.json());
      if (cRes.ok) setCCPLogs(await cRes.json());
      if (pRes.ok) setPestLogs(await pRes.json());
      if (sRes.ok) setSampleLogs(await sRes.json());
    } catch {
      toast.error('Veriler alınamadı');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const exportToCSV = (data: Record<string, unknown>[], filename: string) => {
    if (data.length === 0) { toast.error('Dışa aktarılacak veri yok'); return; }
    const headers = Object.keys(data[0]);
    const rows = data.map((row) => headers.map((h) => JSON.stringify(row[h] ?? '')).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${startDate}_${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const outOfRangeCount = tempLogs.filter((l) => l.isOutOfRange).length;
  const outOfRangeWithoutCapa = tempLogs.filter((l) => l.isOutOfRange && !l.correctiveAction).length;
  const nonConformantCCP = ccpLogs.filter((c) => c.status === 'UYGUNSUZ').length;
  const pestActivities = pestLogs.filter((p) => p.status === 'AKTIVITE_VAR').length;
  const expiredSamples = sampleLogs.filter((s) => s.isExpired).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Raporlama & Denetim Paneli</h1>
          <p className="text-gray-500 mt-1">Denetçi görünümü — tüm HACCP kayıtlarının kronolojik özeti</p>
        </div>
      </div>

      {/* Tarih Filtresi */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-end gap-4 flex-wrap">
            <div className="space-y-1.5">
              <Label>Başlangıç Tarihi</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1.5">
              <Label>Bitiş Tarihi</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" />
            </div>
            <Button onClick={fetchAll} disabled={loading}>
              {loading ? 'Yükleniyor...' : 'Filtrele'}
            </Button>
            <div className="flex gap-2 ml-auto flex-wrap">
              <Select onValueChange={(period) => {
                const now = new Date();
                const start = new Date();
                if (period === '7') start.setDate(now.getDate() - 7);
                else if (period === '30') start.setDate(now.getDate() - 30);
                else if (period === '90') start.setDate(now.getDate() - 90);
                setStartDate(start.toISOString().slice(0, 10));
                setEndDate(now.toISOString().slice(0, 10));
              }}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Hızlı seçim" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Son 7 gün</SelectItem>
                  <SelectItem value="30">Son 30 gün</SelectItem>
                  <SelectItem value="90">Son 90 gün</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Özet İstatistikler */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Thermometer className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Sıcaklık Kayıtları</p>
                <p className="text-xl font-bold">{tempLogs.length}</p>
                {outOfRangeCount > 0 && (
                  <p className="text-xs text-red-600">{outOfRangeCount} limit dışı</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckSquare className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">CCP Kontrolleri</p>
                <p className="text-xl font-bold">{ccpLogs.length}</p>
                {nonConformantCCP > 0 && (
                  <p className="text-xs text-red-600">{nonConformantCCP} uygunsuz</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Bug className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Haşere Kontrolleri</p>
                <p className="text-xl font-bold">{pestLogs.length}</p>
                {pestActivities > 0 && (
                  <p className="text-xs text-red-600">{pestActivities} aktivite</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FlaskConical className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Gıda Numuneleri</p>
                <p className="text-xl font-bold">{sampleLogs.length}</p>
                {expiredSamples > 0 && (
                  <p className="text-xs text-red-600">{expiredSamples} süresi dolmuş</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Uyarı Özeti */}
      {(outOfRangeWithoutCapa > 0 || nonConformantCCP > 0 || pestActivities > 0 || expiredSamples > 0) && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-4 w-4" /> Denetim Uyarıları
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {outOfRangeWithoutCapa > 0 && (
              <p className="text-sm text-red-600">• {outOfRangeWithoutCapa} limit dışı sıcaklık kaydı düzeltici faaliyet olmadan kapatılmış</p>
            )}
            {nonConformantCCP > 0 && (
              <p className="text-sm text-red-600">• {nonConformantCCP} CCP kontrolünde uygunsuzluk tespit edildi</p>
            )}
            {pestActivities > 0 && (
              <p className="text-sm text-red-600">• {pestActivities} istasyonda haşere aktivitesi tespit edildi</p>
            )}
            {expiredSamples > 0 && (
              <p className="text-sm text-red-600">• {expiredSamples} gıda numunesinin süresi dolmuş</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Detaylı Tablolar */}
      <Tabs defaultValue="temperature">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="temperature" className="flex items-center gap-1.5">
            <Thermometer className="h-3.5 w-3.5" /> Sıcaklık
            {outOfRangeCount > 0 && <Badge variant="destructive" className="ml-1 text-xs h-4 px-1">{outOfRangeCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="ccp" className="flex items-center gap-1.5">
            <CheckSquare className="h-3.5 w-3.5" /> CCP
            {nonConformantCCP > 0 && <Badge variant="destructive" className="ml-1 text-xs h-4 px-1">{nonConformantCCP}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="pest" className="flex items-center gap-1.5">
            <Bug className="h-3.5 w-3.5" /> Haşere
          </TabsTrigger>
          <TabsTrigger value="samples" className="flex items-center gap-1.5">
            <FlaskConical className="h-3.5 w-3.5" /> Numuneler
          </TabsTrigger>
        </TabsList>

        {/* Sıcaklık Raporu */}
        <TabsContent value="temperature">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Sıcaklık Kayıtları Raporu</CardTitle>
              <Button size="sm" variant="outline" onClick={() => exportToCSV(tempLogs.map((l) => ({
                Ekipman: l.equipment.name, Konum: l.equipment.location,
                'Sıcaklık (°C)': l.temperature,
                'Min Limit': l.equipment.minTemp ?? '', 'Max Limit': l.equipment.maxTemp ?? '',
                'Limit Dışı': l.isOutOfRange ? 'Evet' : 'Hayır',
                Tarih: new Date(l.measuredAt).toLocaleString('tr-TR'),
                Ölçen: `${l.measuredBy.name} ${l.measuredBy.surname}`,
                'Düzeltici Faaliyet': l.correctiveAction ?? '',
              })), 'sicaklik_raporu')}>
                <Download className="h-3.5 w-3.5 mr-1" /> CSV
              </Button>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ekipman</TableHead>
                  <TableHead>Sıcaklık</TableHead>
                  <TableHead>Tarih/Saat</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Düzeltici Faaliyet</TableHead>
                  <TableHead>Ölçen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tempLogs.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-gray-400 py-6">Bu dönemde kayıt yok</TableCell></TableRow>
                ) : (
                  tempLogs.map((log) => (
                    <TableRow key={log.id} className={log.isOutOfRange ? 'bg-red-50' : undefined}>
                      <TableCell>
                        <div className="font-medium text-sm">{log.equipment.name}</div>
                        <div className="text-xs text-gray-400">{log.equipment.location}</div>
                      </TableCell>
                      <TableCell>
                        <span className={`font-bold ${log.isOutOfRange ? 'text-red-600' : 'text-green-600'}`}>
                          {log.temperature}°C
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{new Date(log.measuredAt).toLocaleString('tr-TR')}</TableCell>
                      <TableCell>
                        {log.isOutOfRange ? (
                          <Badge variant="destructive" className="text-xs">Limit Dışı</Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-700 text-xs">Normal</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm max-w-48">
                        {log.correctiveAction ? (
                          <span className="text-green-700">{log.correctiveAction}</span>
                        ) : log.isOutOfRange ? (
                          <span className="text-red-500 text-xs">Girilmemiş!</span>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-sm">{log.measuredBy.name} {log.measuredBy.surname}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* CCP Uyum Raporu */}
        <TabsContent value="ccp">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">CCP Uyum Raporu</CardTitle>
              <Button size="sm" variant="outline" onClick={() => exportToCSV(ccpLogs.map((c) => ({
                CCP: c.ccp.name, Süreç: processLabels[c.ccp.process] ?? c.ccp.process,
                Tarih: new Date(c.checkDate).toLocaleDateString('tr-TR'),
                'Ölçülen Değer': c.measuredValue ?? '',
                Durum: c.status,
                Uygunsuzluk: c.nonConformity ?? '',
                Onay: c.isApproved ? 'Onaylı' : 'Onay Bekliyor',
                Yapan: `${c.checkedBy.name} ${c.checkedBy.surname}`,
              })), 'ccp_uyum_raporu')}>
                <Download className="h-3.5 w-3.5 mr-1" /> CSV
              </Button>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>CCP</TableHead>
                  <TableHead>Süreç</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Ölçüm</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Uygunsuzluk</TableHead>
                  <TableHead>Onay</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ccpLogs.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-gray-400 py-6">Bu dönemde kayıt yok</TableCell></TableRow>
                ) : (
                  ccpLogs.map((c) => (
                    <TableRow key={c.id} className={c.status === 'UYGUNSUZ' ? 'bg-yellow-50' : undefined}>
                      <TableCell className="font-medium text-sm">{c.ccp.name}</TableCell>
                      <TableCell className="text-sm">{processLabels[c.ccp.process] ?? c.ccp.process}</TableCell>
                      <TableCell className="text-sm">{new Date(c.checkDate).toLocaleDateString('tr-TR')}</TableCell>
                      <TableCell className="text-sm">{c.measuredValue !== null ? c.measuredValue : '—'}</TableCell>
                      <TableCell>
                        <Badge className={c.status === 'YAPILDI' ? 'bg-green-100 text-green-700' : c.status === 'UYGUNSUZ' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'} >
                          {c.status === 'YAPILDI' ? 'Yapıldı' : c.status === 'YAPILMADI' ? 'Yapılmadı' : 'Uygunsuz'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm max-w-40 truncate">{c.nonConformity ?? '—'}</TableCell>
                      <TableCell>
                        {c.isApproved ? (
                          <Badge className="bg-green-100 text-green-700 text-xs">Onaylı</Badge>
                        ) : c.status === 'UYGUNSUZ' ? (
                          <Badge variant="outline" className="text-yellow-700 border-yellow-400 text-xs">Bekliyor</Badge>
                        ) : '—'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Haşere Kontrol Geçmişi */}
        <TabsContent value="pest">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Haşere Kontrol Geçmişi</CardTitle>
              <Button size="sm" variant="outline" onClick={() => exportToCSV(pestLogs.map((p) => ({
                İstasyon: p.station.name, Alan: areaLabels[p.station.areaType] ?? p.station.areaType,
                Tarih: new Date(p.controlDate).toLocaleDateString('tr-TR'),
                Durum: pestStatusLabels[p.status] ?? p.status,
                Bulgular: p.findings ?? '',
                'Dış Firma': p.externalCompany ?? '',
                Yapan: `${p.inspectedBy.name} ${p.inspectedBy.surname}`,
              })), 'hasere_kontrol_raporu')}>
                <Download className="h-3.5 w-3.5 mr-1" /> CSV
              </Button>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>İstasyon</TableHead>
                  <TableHead>Alan</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Bulgular</TableHead>
                  <TableHead>Dış Firma</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pestLogs.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-gray-400 py-6">Bu dönemde kayıt yok</TableCell></TableRow>
                ) : (
                  pestLogs.map((log) => (
                    <TableRow key={log.id} className={log.status === 'AKTIVITE_VAR' ? 'bg-red-50' : undefined}>
                      <TableCell>
                        <div className="font-medium text-sm">{log.station.name}</div>
                        <div className="text-xs text-gray-400">{log.station.code}</div>
                      </TableCell>
                      <TableCell className="text-sm">{areaLabels[log.station.areaType] ?? log.station.areaType}</TableCell>
                      <TableCell className="text-sm">{new Date(log.controlDate).toLocaleDateString('tr-TR')}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          log.status === 'TEMIZ' ? 'bg-green-100 text-green-700' :
                          log.status === 'AKTIVITE_VAR' ? 'bg-red-100 text-red-700' :
                          'bg-orange-100 text-orange-700'
                        }`}>
                          {pestStatusLabels[log.status] ?? log.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm max-w-40 truncate">{log.findings ?? '—'}</TableCell>
                      <TableCell className="text-sm">{log.externalCompany ?? '—'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Numune Takibi */}
        <TabsContent value="samples">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Gıda Numune Takip Raporu</CardTitle>
              <Button size="sm" variant="outline" onClick={() => exportToCSV(sampleLogs.map((s) => ({
                Kod: s.code, Ürün: s.productName,
                Tarih: new Date(s.sampleDate).toLocaleDateString('tr-TR'),
                'Saklama °C': s.storageTemp ?? '',
                'Son Tarih': new Date(s.expiryDateTime).toLocaleString('tr-TR'),
                Durum: s.isDisposed ? 'İmha Edildi' : s.isExpired ? 'Süresi Doldu' : 'Aktif',
                'İmha Tarihi': s.disposedAt ? new Date(s.disposedAt).toLocaleDateString('tr-TR') : '',
              })), 'numune_raporu')}>
                <Download className="h-3.5 w-3.5 mr-1" /> CSV
              </Button>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kod</TableHead>
                  <TableHead>Ürün</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Saklama</TableHead>
                  <TableHead>Son Tarih</TableHead>
                  <TableHead>Durum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sampleLogs.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-gray-400 py-6">Bu dönemde kayıt yok</TableCell></TableRow>
                ) : (
                  sampleLogs.map((s) => (
                    <TableRow key={s.id} className={s.isExpired && !s.isDisposed ? 'bg-red-50' : undefined}>
                      <TableCell className="font-mono text-xs">{s.code}</TableCell>
                      <TableCell className="font-medium text-sm">{s.productName}</TableCell>
                      <TableCell className="text-sm">{new Date(s.sampleDate).toLocaleDateString('tr-TR')}</TableCell>
                      <TableCell className="text-sm">{s.storageTemp !== null ? `${s.storageTemp}°C` : '—'}</TableCell>
                      <TableCell className="text-sm">{new Date(s.expiryDateTime).toLocaleString('tr-TR')}</TableCell>
                      <TableCell>
                        {s.isDisposed ? (
                          <Badge className="bg-gray-100 text-gray-600 text-xs">İmha Edildi</Badge>
                        ) : s.isExpired ? (
                          <Badge variant="destructive" className="text-xs">Süresi Doldu</Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-700 text-xs">Aktif</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
