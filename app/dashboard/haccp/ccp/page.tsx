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
import { Plus, CheckSquare, AlertTriangle, CheckCircle2, Pencil } from 'lucide-react';

interface CCP {
  id: string;
  code: string;
  name: string;
  process: string;
  description: string | null;
  criticalLimitMin: number | null;
  criticalLimitMax: number | null;
  criticalLimitUnit: string | null;
  criticalLimitDesc: string | null;
  monitoringMethod: string | null;
  monitoringFrequency: string | null;
  responsible: { id: string; name: string; surname: string } | null;
  correctiveProcedure: string | null;
  isActive: boolean;
  _count: { checklists: number };
}

interface Checklist {
  id: string;
  ccpId: string;
  ccp: { id: string; code: string; name: string; process: string };
  checkDate: string;
  status: string;
  measuredValue: number | null;
  notes: string | null;
  nonConformity: string | null;
  capaCreated: boolean;
  isApproved: boolean;
  approvedBy: { name: string; surname: string } | null;
  approvedAt: string | null;
  checkedBy: { name: string; surname: string };
}

const processLabels: Record<string, string> = {
  PISIRME: 'Pişirme', SOGUTMA: 'Soğutma', SAKLAMA: 'Saklama',
  SERVIS: 'Servis', HAZIRLIK: 'Hazırlık', TESLIM: 'Teslim Alma',
};

const processColors: Record<string, string> = {
  PISIRME: 'bg-orange-100 text-orange-700',
  SOGUTMA: 'bg-blue-100 text-blue-700',
  SAKLAMA: 'bg-purple-100 text-purple-700',
  SERVIS: 'bg-green-100 text-green-700',
  HAZIRLIK: 'bg-yellow-100 text-yellow-700',
  TESLIM: 'bg-gray-100 text-gray-700',
};

export default function CCPPage() {
  const [ccps, setCCPs] = useState<CCP[]>([]);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterProcess, setFilterProcess] = useState('');

  const [ccpDialogOpen, setCCPDialogOpen] = useState(false);
  const [editCCP, setEditCCP] = useState<CCP | null>(null);
  const [ccpForm, setCCPForm] = useState({
    name: '', process: '', description: '',
    criticalLimitMin: '', criticalLimitMax: '', criticalLimitUnit: '', criticalLimitDesc: '',
    monitoringMethod: '', monitoringFrequency: '', correctiveProcedure: '',
  });
  const [savingCCP, setSavingCCP] = useState(false);

  const [checklistDialogOpen, setChecklistDialogOpen] = useState(false);
  const [checkForm, setCheckForm] = useState({ ccpId: '', checkDate: '', status: '', measuredValue: '', notes: '', nonConformity: '' });
  const [savingCheck, setSavingCheck] = useState(false);

  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [selectedChecklist, setSelectedChecklist] = useState<Checklist | null>(null);

  const fetchCCPs = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterProcess) params.set('process', filterProcess);
    const res = await fetch(`/api/haccp/ccp?${params}`);
    if (res.ok) setCCPs(await res.json());
  }, [filterProcess]);

  const fetchChecklists = useCallback(async () => {
    const res = await fetch('/api/haccp/ccp/checklists');
    if (res.ok) setChecklists(await res.json());
  }, []);

  useEffect(() => {
    Promise.all([fetchCCPs(), fetchChecklists()]).finally(() => setLoading(false));
  }, [fetchCCPs, fetchChecklists]);

  const openCCPDialog = (ccp?: CCP) => {
    if (ccp) {
      setEditCCP(ccp);
      setCCPForm({
        name: ccp.name, process: ccp.process, description: ccp.description ?? '',
        criticalLimitMin: ccp.criticalLimitMin?.toString() ?? '',
        criticalLimitMax: ccp.criticalLimitMax?.toString() ?? '',
        criticalLimitUnit: ccp.criticalLimitUnit ?? '',
        criticalLimitDesc: ccp.criticalLimitDesc ?? '',
        monitoringMethod: ccp.monitoringMethod ?? '',
        monitoringFrequency: ccp.monitoringFrequency ?? '',
        correctiveProcedure: ccp.correctiveProcedure ?? '',
      });
    } else {
      setEditCCP(null);
      setCCPForm({ name: '', process: '', description: '', criticalLimitMin: '', criticalLimitMax: '', criticalLimitUnit: '', criticalLimitDesc: '', monitoringMethod: '', monitoringFrequency: '', correctiveProcedure: '' });
    }
    setCCPDialogOpen(true);
  };

  const saveCCP = async () => {
    if (!ccpForm.name || !ccpForm.process) { toast.error('Ad ve süreç zorunludur'); return; }
    setSavingCCP(true);
    try {
      const url = editCCP ? `/api/haccp/ccp/${editCCP.id}` : '/api/haccp/ccp';
      const res = await fetch(url, { method: editCCP ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ccpForm) });
      if (!res.ok) throw new Error();
      toast.success(editCCP ? 'CCP güncellendi' : 'CCP eklendi');
      setCCPDialogOpen(false);
      fetchCCPs();
    } catch { toast.error('İşlem başarısız'); }
    finally { setSavingCCP(false); }
  };

  const openChecklistDialog = (ccpId?: string) => {
    const today = new Date().toISOString().slice(0, 10);
    setCheckForm({ ccpId: ccpId ?? '', checkDate: today, status: '', measuredValue: '', notes: '', nonConformity: '' });
    setChecklistDialogOpen(true);
  };

  const saveChecklist = async () => {
    if (!checkForm.ccpId || !checkForm.checkDate || !checkForm.status) { toast.error('CCP, tarih ve durum zorunludur'); return; }
    setSavingCheck(true);
    try {
      const res = await fetch('/api/haccp/ccp/checklists', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(checkForm) });
      if (!res.ok) throw new Error();
      if (checkForm.status === 'UYGUNSUZ') {
        toast.warning('Uygunsuzluk kaydedildi. Yönetici onayı gereklidir.');
      } else {
        toast.success('Kontrol kaydedildi');
      }
      setChecklistDialogOpen(false);
      fetchChecklists();
    } catch { toast.error('Kayıt başarısız'); }
    finally { setSavingCheck(false); }
  };

  const approveChecklist = async (id: string) => {
    try {
      const res = await fetch(`/api/haccp/ccp/checklists/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ approve: true }) });
      if (!res.ok) throw new Error();
      toast.success('Onaylandı');
      setApproveDialogOpen(false);
      fetchChecklists();
    } catch { toast.error('Onay başarısız'); }
  };

  if (loading) return <div className="p-6"><div className="h-8 w-64 bg-gray-200 rounded animate-pulse" /></div>;

  const pendingApproval = checklists.filter((c) => c.status === 'UYGUNSUZ' && !c.isApproved);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CCP Kontrol Noktaları</h1>
          <p className="text-gray-500 mt-1">Kritik kontrol noktaları tanımları ve günlük kontrol listeleri</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => openCCPDialog()}>
            <Plus className="h-4 w-4 mr-2" /> CCP Ekle
          </Button>
          <Button onClick={() => openChecklistDialog()}>
            <CheckSquare className="h-4 w-4 mr-2" /> Kontrol Gir
          </Button>
        </div>
      </div>

      {pendingApproval.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center gap-2 text-yellow-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="text-sm font-medium">{pendingApproval.length} uygunsuz kontrol onay bekliyor</span>
        </div>
      )}

      <Tabs defaultValue="checklists">
        <TabsList>
          <TabsTrigger value="checklists">Kontrol Kayıtları</TabsTrigger>
          <TabsTrigger value="ccps">CCP Tanımları ({ccps.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="checklists" className="space-y-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>CCP</TableHead>
                  <TableHead>Süreç</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Ölçüm</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Yapan</TableHead>
                  <TableHead>Onay</TableHead>
                  <TableHead>İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {checklists.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-gray-400 py-8">Henüz kayıt yok</TableCell>
                  </TableRow>
                ) : (
                  checklists.map((c) => (
                    <TableRow key={c.id} className={c.status === 'UYGUNSUZ' ? 'bg-yellow-50' : undefined}>
                      <TableCell className="font-medium">
                        <div>{c.ccp.name}</div>
                        <div className="text-xs text-gray-400">{c.ccp.code}</div>
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${processColors[c.ccp.process]}`}>
                          {processLabels[c.ccp.process] ?? c.ccp.process}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{new Date(c.checkDate).toLocaleDateString('tr-TR')}</TableCell>
                      <TableCell className="text-sm">{c.measuredValue !== null ? `${c.measuredValue}` : '—'}</TableCell>
                      <TableCell>
                        <Badge className={c.status === 'YAPILDI' ? 'bg-green-100 text-green-800' : c.status === 'UYGUNSUZ' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}>
                          {c.status === 'YAPILDI' ? 'Yapıldı' : c.status === 'YAPILMADI' ? 'Yapılmadı' : 'Uygunsuz'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{c.checkedBy.name} {c.checkedBy.surname}</TableCell>
                      <TableCell>
                        {c.isApproved ? (
                          <div className="flex items-center gap-1 text-green-600 text-xs">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Onaylı</span>
                          </div>
                        ) : c.status === 'UYGUNSUZ' ? (
                          <Badge variant="outline" className="text-yellow-700 border-yellow-400 text-xs">Onay Bekliyor</Badge>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        {c.status === 'UYGUNSUZ' && !c.isApproved && (
                          <Button size="sm" variant="outline" onClick={() => { setSelectedChecklist(c); setApproveDialogOpen(true); }}>
                            Onayla
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

        <TabsContent value="ccps" className="space-y-4">
          <div className="flex gap-2">
            <Select value={filterProcess || 'all'} onValueChange={(v) => setFilterProcess(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Tüm süreçler" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Süreçler</SelectItem>
                {Object.entries(processLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ccps.map((ccp) => (
              <Card key={ccp.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">{ccp.name}</CardTitle>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${processColors[ccp.process]}`}>
                      {processLabels[ccp.process] ?? ccp.process}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">{ccp.code}</p>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(ccp.criticalLimitMin !== null || ccp.criticalLimitMax !== null || ccp.criticalLimitDesc) && (
                    <div className="text-xs text-gray-600">
                      <span className="font-medium">Kritik Limit: </span>
                      {ccp.criticalLimitDesc ?? `${ccp.criticalLimitMin ?? '—'} – ${ccp.criticalLimitMax ?? '—'} ${ccp.criticalLimitUnit ?? ''}`}
                    </div>
                  )}
                  {ccp.monitoringMethod && (
                    <div className="text-xs text-gray-600">
                      <span className="font-medium">İzleme: </span>{ccp.monitoringMethod}
                    </div>
                  )}
                  <div className="text-xs text-gray-400">{ccp._count.checklists} kontrol kaydı</div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => openChecklistDialog(ccp.id)}>
                      <Plus className="h-3 w-3 mr-1" /> Kontrol Gir
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openCCPDialog(ccp)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* CCP Ekleme Dialog */}
      <Dialog open={ccpDialogOpen} onOpenChange={setCCPDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editCCP ? 'CCP Düzenle' : 'Yeni CCP Tanımla'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label>CCP Adı *</Label>
                <Input value={ccpForm.name} onChange={(e) => setCCPForm((f) => ({ ...f, name: e.target.value }))} placeholder="ör: Pişirme Sıcaklığı Kontrolü" />
              </div>
              <div className="space-y-1.5">
                <Label>Süreç *</Label>
                <Select value={ccpForm.process} onValueChange={(v) => setCCPForm((f) => ({ ...f, process: v }))}>
                  <SelectTrigger><SelectValue placeholder="Seçin" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(processLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Limit Birimi</Label>
                <Input value={ccpForm.criticalLimitUnit} onChange={(e) => setCCPForm((f) => ({ ...f, criticalLimitUnit: e.target.value }))} placeholder="°C, dakika, vb." />
              </div>
              <div className="space-y-1.5">
                <Label>Min Kritik Limit</Label>
                <Input type="number" value={ccpForm.criticalLimitMin} onChange={(e) => setCCPForm((f) => ({ ...f, criticalLimitMin: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Max Kritik Limit</Label>
                <Input type="number" value={ccpForm.criticalLimitMax} onChange={(e) => setCCPForm((f) => ({ ...f, criticalLimitMax: e.target.value }))} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Kritik Limit Açıklaması</Label>
                <Input value={ccpForm.criticalLimitDesc} onChange={(e) => setCCPForm((f) => ({ ...f, criticalLimitDesc: e.target.value }))} placeholder="ör: Min 75°C iç sıcaklık" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>İzleme Yöntemi</Label>
                <Input value={ccpForm.monitoringMethod} onChange={(e) => setCCPForm((f) => ({ ...f, monitoringMethod: e.target.value }))} placeholder="ör: Gıda termometresi ile ölçüm" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>İzleme Sıklığı</Label>
                <Input value={ccpForm.monitoringFrequency} onChange={(e) => setCCPForm((f) => ({ ...f, monitoringFrequency: e.target.value }))} placeholder="ör: Her porsiyon için" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Düzeltici Faaliyet Prosedürü</Label>
                <Textarea value={ccpForm.correctiveProcedure} onChange={(e) => setCCPForm((f) => ({ ...f, correctiveProcedure: e.target.value }))} rows={2} placeholder="Limit aşıldığında ne yapılmalı?" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCCPDialogOpen(false)}>İptal</Button>
            <Button onClick={saveCCP} disabled={savingCCP}>{savingCCP ? 'Kaydediliyor...' : 'Kaydet'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Kontrol Giriş Dialog */}
      <Dialog open={checklistDialogOpen} onOpenChange={setChecklistDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>CCP Kontrol Girişi</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>CCP Noktası *</Label>
              <Select value={checkForm.ccpId} onValueChange={(v) => setCheckForm((f) => ({ ...f, ccpId: v }))}>
                <SelectTrigger><SelectValue placeholder="CCP seçin" /></SelectTrigger>
                <SelectContent>
                  {ccps.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name} ({processLabels[c.process]})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Tarih *</Label>
                <Input type="date" value={checkForm.checkDate} onChange={(e) => setCheckForm((f) => ({ ...f, checkDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Ölçülen Değer</Label>
                <Input type="number" step="0.1" value={checkForm.measuredValue} onChange={(e) => setCheckForm((f) => ({ ...f, measuredValue: e.target.value }))} placeholder="ör: 76.5" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Durum *</Label>
              <Select value={checkForm.status} onValueChange={(v) => setCheckForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue placeholder="Sonuç" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="YAPILDI">Yapıldı — Uygun</SelectItem>
                  <SelectItem value="YAPILMADI">Yapılmadı</SelectItem>
                  <SelectItem value="UYGUNSUZ">Uygunsuz</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {checkForm.status === 'UYGUNSUZ' && (
              <div className="space-y-1.5">
                <Label>Uygunsuzluk Açıklaması</Label>
                <Textarea value={checkForm.nonConformity} onChange={(e) => setCheckForm((f) => ({ ...f, nonConformity: e.target.value }))} rows={2} placeholder="Uygunsuzluğu açıklayın..." />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Not</Label>
              <Textarea value={checkForm.notes} onChange={(e) => setCheckForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChecklistDialogOpen(false)}>İptal</Button>
            <Button onClick={saveChecklist} disabled={savingCheck}>{savingCheck ? 'Kaydediliyor...' : 'Kaydet'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Onay Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Uygunsuzluk Onayı</DialogTitle>
          </DialogHeader>
          {selectedChecklist && (
            <div className="space-y-4">
              <div className="bg-yellow-50 rounded-lg p-3 text-sm space-y-1">
                <p className="font-medium">{selectedChecklist.ccp.name}</p>
                <p className="text-gray-600">{new Date(selectedChecklist.checkDate).toLocaleDateString('tr-TR')}</p>
                {selectedChecklist.nonConformity && (
                  <p className="text-red-600">Uygunsuzluk: {selectedChecklist.nonConformity}</p>
                )}
                <p className="text-gray-500">Kaydeden: {selectedChecklist.checkedBy.name} {selectedChecklist.checkedBy.surname}</p>
              </div>
              <p className="text-sm text-gray-600">Bu uygunsuz CCP kaydını onaylıyor musunuz? Onaylama işlemi kayıt sahibini bilgilendirir.</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>İptal</Button>
            <Button onClick={() => selectedChecklist && approveChecklist(selectedChecklist.id)}>Onayla</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
