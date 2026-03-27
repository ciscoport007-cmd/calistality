'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Bug, AlertTriangle, Pencil, MapPin } from 'lucide-react';

interface Station {
  id: string;
  code: string;
  name: string;
  areaType: string;
  location: string;
  stationType: string | null;
  controlFrequency: string;
  lastControlDate: string | null;
  nextControlDate: string | null;
  isActive: boolean;
  _count: { pestLogs: number };
}

interface PestLog {
  id: string;
  stationId: string;
  station: { id: string; code: string; name: string; areaType: string; location: string };
  controlDate: string;
  status: string;
  findings: string | null;
  externalCompany: string | null;
  actionRequired: boolean;
  actionTaken: string | null;
  inspectedBy: { name: string; surname: string };
}

const areaLabels: Record<string, string> = {
  MUTFAK: 'Mutfak', DEPO: 'Depo', COP_ALANI: 'Çöp Alanı',
  RESTORAN: 'Restoran', BAHCE: 'Bahçe', TEKNIK: 'Teknik Alan', DIGER: 'Diğer',
};

const statusLabels: Record<string, string> = {
  TEMIZ: 'Temiz', AKTIVITE_VAR: 'Aktivite Var', HASARLI: 'Hasarlı', DEGISTIRILDI: 'Değiştirildi',
};

const statusColors: Record<string, string> = {
  TEMIZ: 'bg-green-100 text-green-700',
  AKTIVITE_VAR: 'bg-red-100 text-red-700',
  HASARLI: 'bg-orange-100 text-orange-700',
  DEGISTIRILDI: 'bg-blue-100 text-blue-700',
};

const frequencyLabels: Record<string, string> = {
  HAFTALIK: 'Haftalık', AYLIK: 'Aylık', IKI_AYLIK: '2 Aylık', UC_AYLIK: '3 Aylık',
};

export default function PestPage() {
  const [stations, setStations] = useState<Station[]>([]);
  const [logs, setLogs] = useState<PestLog[]>([]);
  const [loading, setLoading] = useState(true);

  const [stationDialogOpen, setStationDialogOpen] = useState(false);
  const [editStation, setEditStation] = useState<Station | null>(null);
  const [stationForm, setStationForm] = useState({ name: '', areaType: '', location: '', stationType: '', controlFrequency: 'HAFTALIK' });
  const [savingStation, setSavingStation] = useState(false);

  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [logForm, setLogForm] = useState({ stationId: '', controlDate: '', status: '', findings: '', externalCompany: '', actionRequired: false, actionTaken: '' });
  const [savingLog, setSavingLog] = useState(false);

  const fetchStations = useCallback(async () => {
    const res = await fetch('/api/haccp/pest/stations');
    if (res.ok) setStations(await res.json());
  }, []);

  const fetchLogs = useCallback(async () => {
    const res = await fetch('/api/haccp/pest/logs');
    if (res.ok) setLogs(await res.json());
  }, []);

  useEffect(() => {
    Promise.all([fetchStations(), fetchLogs()]).finally(() => setLoading(false));
  }, [fetchStations, fetchLogs]);

  const openStationDialog = (station?: Station) => {
    if (station) {
      setEditStation(station);
      setStationForm({ name: station.name, areaType: station.areaType, location: station.location, stationType: station.stationType ?? '', controlFrequency: station.controlFrequency });
    } else {
      setEditStation(null);
      setStationForm({ name: '', areaType: '', location: '', stationType: '', controlFrequency: 'HAFTALIK' });
    }
    setStationDialogOpen(true);
  };

  const saveStation = async () => {
    if (!stationForm.name || !stationForm.areaType || !stationForm.location) { toast.error('Ad, alan tipi ve konum zorunludur'); return; }
    setSavingStation(true);
    try {
      const url = editStation ? `/api/haccp/pest/stations/${editStation.id}` : '/api/haccp/pest/stations';
      const res = await fetch(url, { method: editStation ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(stationForm) });
      if (!res.ok) throw new Error();
      toast.success(editStation ? 'İstasyon güncellendi' : 'İstasyon eklendi');
      setStationDialogOpen(false);
      fetchStations();
    } catch { toast.error('İşlem başarısız'); }
    finally { setSavingStation(false); }
  };

  const openLogDialog = (stationId?: string) => {
    const today = new Date().toISOString().slice(0, 10);
    setLogForm({ stationId: stationId ?? '', controlDate: today, status: '', findings: '', externalCompany: '', actionRequired: false, actionTaken: '' });
    setLogDialogOpen(true);
  };

  const saveLog = async () => {
    if (!logForm.stationId || !logForm.controlDate || !logForm.status) { toast.error('İstasyon, tarih ve durum zorunludur'); return; }
    setSavingLog(true);
    try {
      const res = await fetch('/api/haccp/pest/logs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logForm) });
      if (!res.ok) throw new Error();
      if (logForm.status === 'AKTIVITE_VAR') toast.warning('Haşere aktivitesi tespit edildi! Aksiyon alınması gerekiyor.');
      else toast.success('Kontrol kaydedildi');
      setLogDialogOpen(false);
      fetchLogs();
      fetchStations();
    } catch { toast.error('Kayıt başarısız'); }
    finally { setSavingLog(false); }
  };

  if (loading) return <div className="p-6"><div className="h-8 w-64 bg-gray-200 rounded animate-pulse" /></div>;

  const activeIssues = logs.filter((l) => l.status === 'AKTIVITE_VAR' && l.actionRequired && !l.actionTaken);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Haşere Kontrol Takibi</h1>
          <p className="text-gray-500 mt-1">İstasyon bazlı pest kontrol kayıtları ve periyodik denetim takibi</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => openStationDialog()}>
            <MapPin className="h-4 w-4 mr-2" /> İstasyon Ekle
          </Button>
          <Button onClick={() => openLogDialog()}>
            <Plus className="h-4 w-4 mr-2" /> Kontrol Gir
          </Button>
        </div>
      </div>

      {activeIssues.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="text-sm font-medium">{activeIssues.length} istasyonda haşere aktivitesi tespit edildi, aksiyon bekleniyor</span>
        </div>
      )}

      {/* Alan özet kartları */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(areaLabels).map(([key, label]) => {
          const count = stations.filter((s) => s.areaType === key).length;
          if (count === 0) return null;
          return (
            <Card key={key}>
              <CardContent className="p-3 text-center">
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-xl font-bold">{count}</p>
                <p className="text-xs text-gray-400">istasyon</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="logs">
        <TabsList>
          <TabsTrigger value="logs">Kontrol Kayıtları</TabsTrigger>
          <TabsTrigger value="stations">İstasyonlar ({stations.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="logs">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>İstasyon</TableHead>
                  <TableHead>Alan</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Bulgular</TableHead>
                  <TableHead>Dış Firma</TableHead>
                  <TableHead>Yapan</TableHead>
                  <TableHead>Aksiyon</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-gray-400 py-8">Henüz kayıt yok</TableCell></TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id} className={log.status === 'AKTIVITE_VAR' ? 'bg-red-50' : undefined}>
                      <TableCell className="font-medium">
                        <div>{log.station.name}</div>
                        <div className="text-xs text-gray-400">{log.station.code}</div>
                      </TableCell>
                      <TableCell className="text-sm">{areaLabels[log.station.areaType] ?? log.station.areaType}</TableCell>
                      <TableCell className="text-sm">{new Date(log.controlDate).toLocaleDateString('tr-TR')}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[log.status]}`}>
                          {statusLabels[log.status] ?? log.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm max-w-32 truncate">{log.findings ?? '—'}</TableCell>
                      <TableCell className="text-sm">{log.externalCompany ?? '—'}</TableCell>
                      <TableCell className="text-sm">{log.inspectedBy.name} {log.inspectedBy.surname}</TableCell>
                      <TableCell>
                        {log.actionRequired && !log.actionTaken ? (
                          <Badge variant="destructive" className="text-xs">Aksiyon Gerekli</Badge>
                        ) : log.actionTaken ? (
                          <Badge className="bg-green-100 text-green-700 text-xs">Alındı</Badge>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="stations">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stations.map((station) => (
              <Card key={station.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">{station.name}</CardTitle>
                    <Bug className="h-4 w-4 text-gray-400" />
                  </div>
                  <p className="text-xs text-gray-400">{station.code}</p>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-1.5 text-sm">
                    <MapPin className="h-3.5 w-3.5 text-gray-400" />
                    <span className="text-gray-600">{station.location}</span>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-xs">{areaLabels[station.areaType]}</Badge>
                    <Badge variant="outline" className="text-xs">{frequencyLabels[station.controlFrequency]}</Badge>
                  </div>
                  {station.lastControlDate && (
                    <p className="text-xs text-gray-500">Son kontrol: {new Date(station.lastControlDate).toLocaleDateString('tr-TR')}</p>
                  )}
                  <div className="text-xs text-gray-400">{station._count.pestLogs} kayıt</div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => openLogDialog(station.id)}>
                      <Plus className="h-3 w-3 mr-1" /> Kontrol Gir
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openStationDialog(station)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* İstasyon Dialog */}
      <Dialog open={stationDialogOpen} onOpenChange={setStationDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editStation ? 'İstasyon Düzenle' : 'Yeni İstasyon Ekle'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>İstasyon Adı *</Label>
              <Input value={stationForm.name} onChange={(e) => setStationForm((f) => ({ ...f, name: e.target.value }))} placeholder="ör: Mutfak Tuzak 1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Alan *</Label>
                <Select value={stationForm.areaType} onValueChange={(v) => setStationForm((f) => ({ ...f, areaType: v }))}>
                  <SelectTrigger><SelectValue placeholder="Seçin" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(areaLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Kontrol Sıklığı</Label>
                <Select value={stationForm.controlFrequency} onValueChange={(v) => setStationForm((f) => ({ ...f, controlFrequency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(frequencyLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Konum *</Label>
              <Input value={stationForm.location} onChange={(e) => setStationForm((f) => ({ ...f, location: e.target.value }))} placeholder="ör: Mutfak giriş kapısı yanı" />
            </div>
            <div className="space-y-1.5">
              <Label>İstasyon Tipi</Label>
              <Input value={stationForm.stationType} onChange={(e) => setStationForm((f) => ({ ...f, stationType: e.target.value }))} placeholder="ör: Yapışkan tuzak, elektrikli sinek tutucu" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStationDialogOpen(false)}>İptal</Button>
            <Button onClick={saveStation} disabled={savingStation}>{savingStation ? 'Kaydediliyor...' : 'Kaydet'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Kontrol Kayıt Dialog */}
      <Dialog open={logDialogOpen} onOpenChange={setLogDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Haşere Kontrol Kaydı</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>İstasyon *</Label>
              <Select value={logForm.stationId} onValueChange={(v) => setLogForm((f) => ({ ...f, stationId: v }))}>
                <SelectTrigger><SelectValue placeholder="İstasyon seçin" /></SelectTrigger>
                <SelectContent>
                  {stations.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} — {s.location}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Kontrol Tarihi *</Label>
                <Input type="date" value={logForm.controlDate} onChange={(e) => setLogForm((f) => ({ ...f, controlDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Durum *</Label>
                <Select value={logForm.status} onValueChange={(v) => setLogForm((f) => ({ ...f, status: v, actionRequired: v === 'AKTIVITE_VAR' }))}>
                  <SelectTrigger><SelectValue placeholder="Seçin" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Bulgular</Label>
              <Textarea value={logForm.findings} onChange={(e) => setLogForm((f) => ({ ...f, findings: e.target.value }))} rows={2} placeholder="Tespit edilen bulgular..." />
            </div>
            <div className="space-y-1.5">
              <Label>Dış Firma (varsa)</Label>
              <Input value={logForm.externalCompany} onChange={(e) => setLogForm((f) => ({ ...f, externalCompany: e.target.value }))} placeholder="Servis firması adı" />
            </div>
            {logForm.actionRequired && (
              <div className="space-y-1.5">
                <Label>Alınan Aksiyon</Label>
                <Textarea value={logForm.actionTaken} onChange={(e) => setLogForm((f) => ({ ...f, actionTaken: e.target.value }))} rows={2} placeholder="Alınan önlemi açıklayın..." />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogDialogOpen(false)}>İptal</Button>
            <Button onClick={saveLog} disabled={savingLog}>{savingLog ? 'Kaydediliyor...' : 'Kaydet'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
