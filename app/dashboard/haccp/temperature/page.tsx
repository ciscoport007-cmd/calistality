'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Thermometer, AlertTriangle, CheckCircle2, Settings, Pencil } from 'lucide-react';

interface Equipment {
  id: string;
  code: string;
  name: string;
  type: string;
  location: string;
  minTemp: number | null;
  maxTemp: number | null;
  targetTemp: number | null;
  measurementFrequency: string | null;
  status: string;
  _count: { temperatureLogs: number };
}

interface TempLog {
  id: string;
  equipmentId: string;
  equipment: { id: string; code: string; name: string; location: string; minTemp: number | null; maxTemp: number | null };
  temperature: number;
  measuredAt: string;
  isOutOfRange: boolean;
  notes: string | null;
  correctiveAction: string | null;
  correctiveActionAt: string | null;
  measuredBy: { name: string; surname: string };
  correctiveActionBy: { name: string; surname: string } | null;
}

const equipmentTypeLabels: Record<string, string> = {
  BUZDOLABI: 'Buzdolabı',
  DERIN_DONDURUCU: 'Derin Dondurucu',
  SICAK_TUTUCU: 'Sıcak Tutucu',
  ACIK_BUFE: 'Açık Büfe',
  FIRIN: 'Fırın',
  PISIRME_EKIPMAN: 'Pişirme Ekipmanı',
  DIGER: 'Diğer',
};

const frequencyLabels: Record<string, string> = {
  SAATLIK: 'Saatlik',
  VARDIYA_BASI: 'Vardiya Başı',
  GUNDE_3_KEZ: 'Günde 3 Kez',
  GUNDE_2_KEZ: 'Günde 2 Kez',
  GUNLUK: 'Günlük',
};

export default function TemperaturePage() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [logs, setLogs] = useState<TempLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [outOfRangeOnly, setOutOfRangeOnly] = useState(false);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState('');

  const [equipDialogOpen, setEquipDialogOpen] = useState(false);
  const [editEquipment, setEditEquipment] = useState<Equipment | null>(null);
  const [equipForm, setEquipForm] = useState({ name: '', type: '', location: '', brand: '', model: '', minTemp: '', maxTemp: '', targetTemp: '', measurementFrequency: '', notes: '' });
  const [savingEquip, setSavingEquip] = useState(false);

  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [logForm, setLogForm] = useState({ equipmentId: '', temperature: '', measuredAt: '', notes: '' });
  const [savingLog, setSavingLog] = useState(false);

  const [capaDialogOpen, setCapaDialogOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<TempLog | null>(null);
  const [correctiveAction, setCorrectiveAction] = useState('');
  const [savingCapa, setSavingCapa] = useState(false);

  const fetchEquipment = useCallback(async () => {
    const res = await fetch('/api/haccp/equipment');
    if (res.ok) setEquipment(await res.json());
  }, []);

  const fetchLogs = useCallback(async () => {
    const params = new URLSearchParams();
    if (outOfRangeOnly) params.set('outOfRangeOnly', 'true');
    if (selectedEquipmentId) params.set('equipmentId', selectedEquipmentId);
    const res = await fetch(`/api/haccp/temperature?${params}`);
    if (res.ok) setLogs(await res.json());
  }, [outOfRangeOnly, selectedEquipmentId]);

  useEffect(() => {
    Promise.all([fetchEquipment(), fetchLogs()]).finally(() => setLoading(false));
  }, [fetchEquipment, fetchLogs]);

  const openEquipDialog = (equip?: Equipment) => {
    if (equip) {
      setEditEquipment(equip);
      setEquipForm({
        name: equip.name, type: equip.type, location: equip.location,
        brand: '', model: '', minTemp: equip.minTemp?.toString() ?? '',
        maxTemp: equip.maxTemp?.toString() ?? '', targetTemp: equip.targetTemp?.toString() ?? '',
        measurementFrequency: equip.measurementFrequency ?? '', notes: '',
      });
    } else {
      setEditEquipment(null);
      setEquipForm({ name: '', type: '', location: '', brand: '', model: '', minTemp: '', maxTemp: '', targetTemp: '', measurementFrequency: '', notes: '' });
    }
    setEquipDialogOpen(true);
  };

  const saveEquipment = async () => {
    if (!equipForm.name || !equipForm.type || !equipForm.location) {
      toast.error('Ad, tip ve konum zorunludur');
      return;
    }
    setSavingEquip(true);
    try {
      const url = editEquipment ? `/api/haccp/equipment/${editEquipment.id}` : '/api/haccp/equipment';
      const method = editEquipment ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(equipForm) });
      if (!res.ok) throw new Error();
      toast.success(editEquipment ? 'Ekipman güncellendi' : 'Ekipman eklendi');
      setEquipDialogOpen(false);
      fetchEquipment();
    } catch {
      toast.error('İşlem başarısız');
    } finally {
      setSavingEquip(false);
    }
  };

  const openLogDialog = (equipId?: string) => {
    const now = new Date();
    const localISO = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setLogForm({ equipmentId: equipId ?? '', temperature: '', measuredAt: localISO, notes: '' });
    setLogDialogOpen(true);
  };

  const saveLog = async () => {
    if (!logForm.equipmentId || logForm.temperature === '') {
      toast.error('Ekipman ve sıcaklık zorunludur');
      return;
    }
    setSavingLog(true);
    try {
      const res = await fetch('/api/haccp/temperature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logForm),
      });
      if (!res.ok) throw new Error();
      const newLog: TempLog = await res.json();
      if (newLog.isOutOfRange) {
        toast.warning('Limit dışı sıcaklık! Düzeltici faaliyet girmeniz gerekmektedir.', { duration: 5000 });
      } else {
        toast.success('Sıcaklık kaydedildi');
      }
      setLogDialogOpen(false);
      fetchLogs();
    } catch {
      toast.error('Kayıt başarısız');
    } finally {
      setSavingLog(false);
    }
  };

  const openCapaDialog = (log: TempLog) => {
    setSelectedLog(log);
    setCorrectiveAction(log.correctiveAction ?? '');
    setCapaDialogOpen(true);
  };

  const saveCapa = async () => {
    if (!correctiveAction.trim()) {
      toast.error('Düzeltici faaliyet açıklaması zorunludur');
      return;
    }
    setSavingCapa(true);
    try {
      const res = await fetch(`/api/haccp/temperature/${selectedLog!.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correctiveAction }),
      });
      if (!res.ok) throw new Error();
      toast.success('Düzeltici faaliyet kaydedildi');
      setCapaDialogOpen(false);
      fetchLogs();
    } catch {
      toast.error('Kayıt başarısız');
    } finally {
      setSavingCapa(false);
    }
  };

  if (loading) {
    return <div className="p-6"><div className="h-8 w-64 bg-gray-200 rounded animate-pulse" /></div>;
  }

  const outOfRangeCount = logs.filter((l) => l.isOutOfRange && !l.correctiveAction).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sıcaklık Takip Sistemi</h1>
          <p className="text-gray-500 mt-1">Ekipman sıcaklık kayıtları ve limit dışı yönetimi</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => openEquipDialog()}>
            <Settings className="h-4 w-4 mr-2" /> Ekipman Ekle
          </Button>
          <Button onClick={() => openLogDialog()}>
            <Plus className="h-4 w-4 mr-2" /> Sıcaklık Gir
          </Button>
        </div>
      </div>

      {outOfRangeCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="text-sm font-medium">{outOfRangeCount} adet limit dışı kayıt düzeltici faaliyet bekliyor</span>
        </div>
      )}

      <Tabs defaultValue="logs">
        <TabsList>
          <TabsTrigger value="logs">Sıcaklık Kayıtları</TabsTrigger>
          <TabsTrigger value="equipment">Ekipmanlar ({equipment.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <Select value={selectedEquipmentId || 'all'} onValueChange={(v) => setSelectedEquipmentId(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Tüm ekipmanlar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Ekipmanlar</SelectItem>
                {equipment.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant={outOfRangeOnly ? 'destructive' : 'outline'}
              size="sm"
              onClick={() => setOutOfRangeOnly((v) => !v)}
            >
              {outOfRangeOnly ? 'Tüm Kayıtlar' : 'Sadece Limit Dışı'}
            </Button>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ekipman</TableHead>
                  <TableHead>Konum</TableHead>
                  <TableHead>Sıcaklık</TableHead>
                  <TableHead>Limit</TableHead>
                  <TableHead>Tarih/Saat</TableHead>
                  <TableHead>Ölçen</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-gray-400 py-8">Kayıt bulunamadı</TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id} className={log.isOutOfRange ? 'bg-red-50' : undefined}>
                      <TableCell className="font-medium">{log.equipment.name}</TableCell>
                      <TableCell className="text-sm text-gray-500">{log.equipment.location}</TableCell>
                      <TableCell>
                        <span className={`font-bold text-lg ${log.isOutOfRange ? 'text-red-600' : 'text-green-600'}`}>
                          {log.temperature}°C
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-gray-500">
                        {log.equipment.minTemp !== null && `${log.equipment.minTemp}°C`}
                        {log.equipment.minTemp !== null && log.equipment.maxTemp !== null && ' – '}
                        {log.equipment.maxTemp !== null && `${log.equipment.maxTemp}°C`}
                      </TableCell>
                      <TableCell className="text-sm">{new Date(log.measuredAt).toLocaleString('tr-TR')}</TableCell>
                      <TableCell className="text-sm">{log.measuredBy.name} {log.measuredBy.surname}</TableCell>
                      <TableCell>
                        {log.isOutOfRange ? (
                          log.correctiveAction ? (
                            <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Düzeltildi</Badge>
                          ) : (
                            <Badge variant="destructive">Limit Dışı</Badge>
                          )
                        ) : (
                          <Badge className="bg-green-100 text-green-800 border-green-200">Normal</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {log.isOutOfRange && !log.correctiveAction && (
                          <Button size="sm" variant="destructive" onClick={() => openCapaDialog(log)}>
                            Düzeltici Faaliyet
                          </Button>
                        )}
                        {log.isOutOfRange && log.correctiveAction && (
                          <Button size="sm" variant="outline" onClick={() => openCapaDialog(log)}>
                            Görüntüle
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="equipment" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {equipment.map((equip) => (
              <Card key={equip.id} className={equip.status === 'ARIZALI' ? 'border-red-200' : undefined}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">{equip.name}</CardTitle>
                    <Badge variant={equip.status === 'AKTIF' ? 'default' : equip.status === 'ARIZALI' ? 'destructive' : 'secondary'}>
                      {equip.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500">{equip.code} • {equip.location}</p>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Thermometer className="h-3.5 w-3.5 text-gray-400" />
                    <span className="text-gray-600">
                      {equipmentTypeLabels[equip.type] ?? equip.type}
                    </span>
                  </div>
                  {(equip.minTemp !== null || equip.maxTemp !== null) && (
                    <div className="text-xs text-gray-500">
                      Limit: {equip.minTemp !== null ? `${equip.minTemp}°C` : '–'} /  {equip.maxTemp !== null ? `${equip.maxTemp}°C` : '–'}
                    </div>
                  )}
                  {equip.measurementFrequency && (
                    <div className="text-xs text-gray-500">
                      Ölçüm: {frequencyLabels[equip.measurementFrequency] ?? equip.measurementFrequency}
                    </div>
                  )}
                  <div className="text-xs text-gray-400">{equip._count.temperatureLogs} kayıt</div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => openLogDialog(equip.id)}>
                      <Plus className="h-3 w-3 mr-1" /> Ölçüm Gir
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openEquipDialog(equip)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Ekipman Dialog */}
      <Dialog open={equipDialogOpen} onOpenChange={setEquipDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editEquipment ? 'Ekipman Düzenle' : 'Yeni Ekipman Ekle'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Ekipman Adı *</Label>
              <Input value={equipForm.name} onChange={(e) => setEquipForm((f) => ({ ...f, name: e.target.value }))} placeholder="ör: Soğuk Hava Deposu 1" />
            </div>
            <div className="space-y-1.5">
              <Label>Tip *</Label>
              <Select value={equipForm.type} onValueChange={(v) => setEquipForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue placeholder="Seçin" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(equipmentTypeLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Konum *</Label>
              <Input value={equipForm.location} onChange={(e) => setEquipForm((f) => ({ ...f, location: e.target.value }))} placeholder="ör: Ana Mutfak" />
            </div>
            <div className="space-y-1.5">
              <Label>Min Sıcaklık (°C)</Label>
              <Input type="number" value={equipForm.minTemp} onChange={(e) => setEquipForm((f) => ({ ...f, minTemp: e.target.value }))} placeholder="-18" />
            </div>
            <div className="space-y-1.5">
              <Label>Max Sıcaklık (°C)</Label>
              <Input type="number" value={equipForm.maxTemp} onChange={(e) => setEquipForm((f) => ({ ...f, maxTemp: e.target.value }))} placeholder="4" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Ölçüm Periyodu</Label>
              <Select value={equipForm.measurementFrequency || 'none'} onValueChange={(v) => setEquipForm((f) => ({ ...f, measurementFrequency: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Seçin" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Belirtilmemiş</SelectItem>
                  {Object.entries(frequencyLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEquipDialogOpen(false)}>İptal</Button>
            <Button onClick={saveEquipment} disabled={savingEquip}>
              {savingEquip ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sıcaklık Giriş Dialog */}
      <Dialog open={logDialogOpen} onOpenChange={setLogDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sıcaklık Ölçümü Gir</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Ekipman *</Label>
              <Select value={logForm.equipmentId} onValueChange={(v) => setLogForm((f) => ({ ...f, equipmentId: v }))}>
                <SelectTrigger><SelectValue placeholder="Ekipman seçin" /></SelectTrigger>
                <SelectContent>
                  {equipment.filter((e) => e.status === 'AKTIF').map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name} — {e.location}
                      {e.minTemp !== null && e.maxTemp !== null && ` (${e.minTemp}°C / ${e.maxTemp}°C)`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Sıcaklık (°C) *</Label>
              <Input type="number" step="0.1" value={logForm.temperature} onChange={(e) => setLogForm((f) => ({ ...f, temperature: e.target.value }))} placeholder="ör: 4.5" />
            </div>
            <div className="space-y-1.5">
              <Label>Ölçüm Tarihi/Saati</Label>
              <Input type="datetime-local" value={logForm.measuredAt} onChange={(e) => setLogForm((f) => ({ ...f, measuredAt: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Not</Label>
              <Textarea value={logForm.notes} onChange={(e) => setLogForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogDialogOpen(false)}>İptal</Button>
            <Button onClick={saveLog} disabled={savingLog}>
              {savingLog ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Düzeltici Faaliyet Dialog */}
      <Dialog open={capaDialogOpen} onOpenChange={setCapaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Düzeltici Faaliyet
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="bg-red-50 rounded-lg p-3 text-sm">
                <p className="font-medium">{selectedLog.equipment.name}</p>
                <p className="text-red-600 font-bold text-lg">{selectedLog.temperature}°C</p>
                <p className="text-gray-500">
                  {new Date(selectedLog.measuredAt).toLocaleString('tr-TR')}
                  {selectedLog.equipment.minTemp !== null && ` | Limit: ${selectedLog.equipment.minTemp}°C – ${selectedLog.equipment.maxTemp}°C`}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Alınan Düzeltici Önlem *</Label>
                <Textarea
                  value={correctiveAction}
                  onChange={(e) => setCorrectiveAction(e.target.value)}
                  placeholder="Alınan önlemi açıklayın..."
                  rows={3}
                />
              </div>
              {selectedLog.correctiveAction && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Düzeltici faaliyet daha önce girildi: {selectedLog.correctiveAction}</span>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCapaDialogOpen(false)}>Kapat</Button>
            {!selectedLog?.correctiveAction && (
              <Button onClick={saveCapa} disabled={savingCapa}>
                {savingCapa ? 'Kaydediliyor...' : 'Kaydet'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
