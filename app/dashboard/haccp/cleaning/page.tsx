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
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Plus, ClipboardList, AlertTriangle, CheckCircle2, Settings, Pencil, Trash2 } from 'lucide-react';

interface CleaningArea {
  id: string;
  name: string;
  areaType: string;
  description: string | null;
  checklistItems: string;
  frequency: string;
  isActive: boolean;
  _count: { cleaningLogs: number };
}

interface CleaningLog {
  id: string;
  areaId: string;
  area: { id: string; name: string; areaType: string };
  logDate: string;
  shift: string | null;
  checklistResults: string;
  overallStatus: string;
  notes: string | null;
  actionRequired: boolean;
  actionTaken: string | null;
  isSignedOff: boolean;
  signedOffBy: { name: string; surname: string } | null;
  signedOffAt: string | null;
  performedBy: { name: string; surname: string };
}

interface ChecklistResult {
  item: string;
  done: boolean;
  note: string;
}

const areaTypeLabels: Record<string, string> = {
  mutfak: 'Mutfak', soguk_depo: 'Soğuk Depo', kuru_depo: 'Kuru Depo',
  ekipman: 'Ekipman', restoran: 'Restoran', diger: 'Diğer',
};

const statusColors: Record<string, string> = {
  TAMAM: 'bg-green-100 text-green-700',
  EKSIK: 'bg-yellow-100 text-yellow-700',
  UYGUNSUZ: 'bg-red-100 text-red-700',
};

const frequencyLabels: Record<string, string> = {
  GUNLUK: 'Günlük', VARDIYAL: 'Vardiyalık', HAFTALIK: 'Haftalık',
};

export default function CleaningPage() {
  const [areas, setAreas] = useState<CleaningArea[]>([]);
  const [logs, setLogs] = useState<CleaningLog[]>([]);
  const [loading, setLoading] = useState(true);

  const [areaDialogOpen, setAreaDialogOpen] = useState(false);
  const [editArea, setEditArea] = useState<CleaningArea | null>(null);
  const [areaForm, setAreaForm] = useState({ name: '', areaType: '', description: '', checklistItems: [''], frequency: 'GUNLUK' });
  const [savingArea, setSavingArea] = useState(false);

  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [selectedArea, setSelectedArea] = useState<CleaningArea | null>(null);
  const [logForm, setLogForm] = useState({ areaId: '', logDate: '', shift: '', notes: '', actionTaken: '' });
  const [checkResults, setCheckResults] = useState<ChecklistResult[]>([]);
  const [savingLog, setSavingLog] = useState(false);

  const [signOffDialogOpen, setSignOffDialogOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<CleaningLog | null>(null);

  const fetchAreas = useCallback(async () => {
    const res = await fetch('/api/haccp/cleaning/areas');
    if (res.ok) setAreas(await res.json());
  }, []);

  const fetchLogs = useCallback(async () => {
    const res = await fetch('/api/haccp/cleaning/logs');
    if (res.ok) setLogs(await res.json());
  }, []);

  useEffect(() => {
    Promise.all([fetchAreas(), fetchLogs()]).finally(() => setLoading(false));
  }, [fetchAreas, fetchLogs]);

  const openAreaDialog = (area?: CleaningArea) => {
    if (area) {
      setEditArea(area);
      const items = JSON.parse(area.checklistItems) as string[];
      setAreaForm({ name: area.name, areaType: area.areaType, description: area.description ?? '', checklistItems: items, frequency: area.frequency });
    } else {
      setEditArea(null);
      setAreaForm({ name: '', areaType: '', description: '', checklistItems: [''], frequency: 'GUNLUK' });
    }
    setAreaDialogOpen(true);
  };

  const saveArea = async () => {
    const items = areaForm.checklistItems.filter((i) => i.trim());
    if (!areaForm.name || !areaForm.areaType || items.length === 0) { toast.error('Ad, alan tipi ve en az 1 kontrol maddesi zorunludur'); return; }
    setSavingArea(true);
    try {
      const url = editArea ? `/api/haccp/cleaning/areas/${editArea.id}` : '/api/haccp/cleaning/areas';
      const res = await fetch(url, { method: editArea ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...areaForm, checklistItems: items }) });
      if (!res.ok) throw new Error();
      toast.success(editArea ? 'Alan güncellendi' : 'Alan eklendi');
      setAreaDialogOpen(false);
      fetchAreas();
    } catch { toast.error('İşlem başarısız'); }
    finally { setSavingArea(false); }
  };

  const openLogDialog = (area: CleaningArea) => {
    const today = new Date().toISOString().slice(0, 10);
    const items = JSON.parse(area.checklistItems) as string[];
    setSelectedArea(area);
    setLogForm({ areaId: area.id, logDate: today, shift: '', notes: '', actionTaken: '' });
    setCheckResults(items.map((item) => ({ item, done: false, note: '' })));
    setLogDialogOpen(true);
  };

  const saveLog = async () => {
    const doneCount = checkResults.filter((r) => r.done).length;
    const total = checkResults.length;
    const allDone = doneCount === total;
    const hasIncomplete = doneCount < total;
    const overallStatus = allDone ? 'TAMAM' : hasIncomplete ? 'EKSIK' : 'TAMAM';

    setSavingLog(true);
    try {
      const res = await fetch('/api/haccp/cleaning/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...logForm,
          checklistResults: checkResults,
          overallStatus,
          actionRequired: hasIncomplete,
          actionTaken: logForm.actionTaken || null,
        }),
      });
      if (!res.ok) throw new Error();
      if (hasIncomplete) toast.warning(`${total - doneCount} kontrol maddesi tamamlanmamış. Yönetici bilgilendirildi.`);
      else toast.success('Temizlik kontrolü kaydedildi');
      setLogDialogOpen(false);
      fetchLogs();
    } catch { toast.error('Kayıt başarısız'); }
    finally { setSavingLog(false); }
  };

  const signOffLog = async (id: string) => {
    try {
      const res = await fetch(`/api/haccp/cleaning/logs/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ signOff: true }) });
      if (!res.ok) throw new Error();
      toast.success('Onaylandı');
      setSignOffDialogOpen(false);
      fetchLogs();
    } catch { toast.error('Onay başarısız'); }
  };

  if (loading) return <div className="p-6"><div className="h-8 w-64 bg-gray-200 rounded animate-pulse" /></div>;

  const pendingSignOff = logs.filter((l) => !l.isSignedOff);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Temizlik & Hijyen Kontrolleri</h1>
          <p className="text-gray-500 mt-1">Alan bazlı günlük temizlik ve hijyen kontrol listeleri</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => openAreaDialog()}>
            <Settings className="h-4 w-4 mr-2" /> Alan Tanımla
          </Button>
        </div>
      </div>

      {pendingSignOff.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center gap-2 text-yellow-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="text-sm font-medium">{pendingSignOff.length} temizlik kaydı imza bekliyor</span>
        </div>
      )}

      <Tabs defaultValue="areas">
        <TabsList>
          <TabsTrigger value="areas">Alanlar & Hızlı Giriş</TabsTrigger>
          <TabsTrigger value="logs">Kontrol Kayıtları</TabsTrigger>
        </TabsList>

        <TabsContent value="areas">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {areas.map((area) => {
              const items = JSON.parse(area.checklistItems) as string[];
              return (
                <Card key={area.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">{area.name}</CardTitle>
                      <Badge variant="outline" className="text-xs">{frequencyLabels[area.frequency] ?? area.frequency}</Badge>
                    </div>
                    <p className="text-xs text-gray-400">{areaTypeLabels[area.areaType] ?? area.areaType}</p>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <ul className="text-xs text-gray-600 space-y-1 max-h-24 overflow-y-auto">
                      {items.map((item, i) => (
                        <li key={i} className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                    <div className="text-xs text-gray-400">{area._count.cleaningLogs} kayıt</div>
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" className="flex-1" onClick={() => openLogDialog(area)}>
                        <Plus className="h-3 w-3 mr-1" /> Kontrol Yap
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openAreaDialog(area)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {areas.length === 0 && (
              <div className="col-span-3 text-center py-12 text-gray-400">
                <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Henüz temizlik alanı tanımlanmamış</p>
                <Button variant="outline" className="mt-3" onClick={() => openAreaDialog()}>Alan Ekle</Button>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Alan</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Vardiya</TableHead>
                  <TableHead>Sonuç</TableHead>
                  <TableHead>Yapan</TableHead>
                  <TableHead>İmza</TableHead>
                  <TableHead>İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-gray-400 py-8">Henüz kayıt yok</TableCell></TableRow>
                ) : (
                  logs.map((log) => {
                    const results = JSON.parse(log.checklistResults) as ChecklistResult[];
                    const doneCount = results.filter((r) => r.done).length;
                    return (
                      <TableRow key={log.id} className={log.overallStatus === 'UYGUNSUZ' ? 'bg-red-50' : log.overallStatus === 'EKSIK' ? 'bg-yellow-50' : undefined}>
                        <TableCell className="font-medium">{log.area.name}</TableCell>
                        <TableCell className="text-sm">{new Date(log.logDate).toLocaleDateString('tr-TR')}</TableCell>
                        <TableCell className="text-sm">{log.shift ?? '—'}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[log.overallStatus]}`}>
                              {log.overallStatus === 'TAMAM' ? 'Tamam' : log.overallStatus === 'EKSIK' ? 'Eksik' : 'Uygunsuz'}
                            </span>
                            <div className="text-xs text-gray-400">{doneCount}/{results.length} madde</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{log.performedBy.name} {log.performedBy.surname}</TableCell>
                        <TableCell>
                          {log.isSignedOff ? (
                            <div className="flex items-center gap-1 text-green-600 text-xs">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>{log.signedOffBy?.name}</span>
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-yellow-700 border-yellow-400 text-xs">Onay Bekliyor</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {!log.isSignedOff && (
                            <Button size="sm" variant="outline" onClick={() => { setSelectedLog(log); setSignOffDialogOpen(true); }}>
                              İmzala
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Alan Tanımlama Dialog */}
      <Dialog open={areaDialogOpen} onOpenChange={setAreaDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editArea ? 'Alan Düzenle' : 'Temizlik Alanı Tanımla'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Alan Adı *</Label>
              <Input value={areaForm.name} onChange={(e) => setAreaForm((f) => ({ ...f, name: e.target.value }))} placeholder="ör: Ana Mutfak" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Alan Tipi *</Label>
                <Select value={areaForm.areaType} onValueChange={(v) => setAreaForm((f) => ({ ...f, areaType: v }))}>
                  <SelectTrigger><SelectValue placeholder="Seçin" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(areaTypeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Sıklık</Label>
                <Select value={areaForm.frequency} onValueChange={(v) => setAreaForm((f) => ({ ...f, frequency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(frequencyLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Kontrol Listesi Maddeleri *</Label>
              <div className="space-y-2">
                {areaForm.checklistItems.map((item, i) => (
                  <div key={i} className="flex gap-2">
                    <Input value={item} onChange={(e) => {
                      const updated = [...areaForm.checklistItems];
                      updated[i] = e.target.value;
                      setAreaForm((f) => ({ ...f, checklistItems: updated }));
                    }} placeholder={`Madde ${i + 1}`} />
                    {areaForm.checklistItems.length > 1 && (
                      <Button size="sm" variant="ghost" onClick={() => setAreaForm((f) => ({ ...f, checklistItems: f.checklistItems.filter((_, idx) => idx !== i) }))}>
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button size="sm" variant="outline" onClick={() => setAreaForm((f) => ({ ...f, checklistItems: [...f.checklistItems, ''] }))}>
                  <Plus className="h-3 w-3 mr-1" /> Madde Ekle
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAreaDialogOpen(false)}>İptal</Button>
            <Button onClick={saveArea} disabled={savingArea}>{savingArea ? 'Kaydediliyor...' : 'Kaydet'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Kontrol Yapma Dialog */}
      <Dialog open={logDialogOpen} onOpenChange={setLogDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Temizlik Kontrolü — {selectedArea?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Tarih</Label>
                <Input type="date" value={logForm.logDate} onChange={(e) => setLogForm((f) => ({ ...f, logDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Vardiya</Label>
                <Select value={logForm.shift || 'none'} onValueChange={(v) => setLogForm((f) => ({ ...f, shift: v === 'none' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="Seçin" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Belirtilmemiş</SelectItem>
                    <SelectItem value="sabah">Sabah</SelectItem>
                    <SelectItem value="ogle">Öğle</SelectItem>
                    <SelectItem value="aksam">Akşam</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Kontrol Maddeleri</Label>
              {checkResults.map((result, i) => (
                <div key={i} className="flex items-start gap-3 p-2 rounded-lg bg-gray-50">
                  <Checkbox
                    checked={result.done}
                    onCheckedChange={(checked) => {
                      const updated = [...checkResults];
                      updated[i] = { ...result, done: !!checked };
                      setCheckResults(updated);
                    }}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <p className="text-sm">{result.item}</p>
                    {!result.done && (
                      <Input
                        className="mt-1 text-xs h-7"
                        placeholder="Neden yapılmadı?"
                        value={result.note}
                        onChange={(e) => {
                          const updated = [...checkResults];
                          updated[i] = { ...result, note: e.target.value };
                          setCheckResults(updated);
                        }}
                      />
                    )}
                  </div>
                </div>
              ))}
              <div className="text-xs text-gray-500">
                {checkResults.filter((r) => r.done).length} / {checkResults.length} tamamlandı
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Not</Label>
              <Textarea value={logForm.notes} onChange={(e) => setLogForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogDialogOpen(false)}>İptal</Button>
            <Button onClick={saveLog} disabled={savingLog}>{savingLog ? 'Kaydediliyor...' : 'Kaydet & İmzala'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* İmza Dialog */}
      <Dialog open={signOffDialogOpen} onOpenChange={setSignOffDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Temizlik Onayı</DialogTitle></DialogHeader>
          {selectedLog && (
            <div className="space-y-3">
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <p className="font-medium">{selectedLog.area.name}</p>
                <p className="text-gray-500">{new Date(selectedLog.logDate).toLocaleDateString('tr-TR')}</p>
                <p className="text-gray-500">Yapan: {selectedLog.performedBy.name} {selectedLog.performedBy.surname}</p>
                {selectedLog.overallStatus !== 'TAMAM' && (
                  <p className="text-yellow-600 mt-1">Durum: {selectedLog.overallStatus === 'EKSIK' ? 'Eksik Maddeler Var' : 'Uygunsuz'}</p>
                )}
              </div>
              <p className="text-sm text-gray-600">Bu temizlik kontrolünü onaylamak istiyor musunuz?</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSignOffDialogOpen(false)}>İptal</Button>
            <Button onClick={() => selectedLog && signOffLog(selectedLog.id)}>Onayla / İmzala</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
