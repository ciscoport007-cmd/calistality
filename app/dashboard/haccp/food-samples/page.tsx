'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, FlaskConical, AlertTriangle, Clock, CheckCircle2, Trash2 } from 'lucide-react';

interface FoodSample {
  id: string;
  code: string;
  productName: string;
  sampleDate: string;
  sampleTime: string | null;
  mealType: string | null;
  storageTemp: number | null;
  retentionHours: number;
  expiryDateTime: string;
  isExpired: boolean;
  isDisposed: boolean;
  disposedAt: string | null;
  disposedBy: { name: string; surname: string } | null;
  notes: string | null;
  createdBy: { name: string; surname: string };
}

const mealTypeLabels: Record<string, string> = {
  KAHVALTI: 'Kahvaltı', OGLE: 'Öğle', AKSAM: 'Akşam', ARA_OGUN: 'Ara Öğün', DIGER: 'Diğer',
};

function getTimeRemaining(expiryDateTime: string): { hours: number; urgent: boolean; expired: boolean } {
  const now = new Date();
  const expiry = new Date(expiryDateTime);
  const diffMs = expiry.getTime() - now.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  return { hours, urgent: hours >= 0 && hours < 12, expired: hours < 0 };
}

export default function FoodSamplesPage() {
  const [samples, setSamples] = useState<FoodSample[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active');

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [form, setForm] = useState({ productName: '', sampleDate: '', sampleTime: '', mealType: '', storageTemp: '', retentionHours: '72', notes: '' });
  const [saving, setSaving] = useState(false);

  const [disposeDialogOpen, setDisposeDialogOpen] = useState(false);
  const [selectedSample, setSelectedSample] = useState<FoodSample | null>(null);

  const fetchSamples = useCallback(async () => {
    const params = new URLSearchParams();
    if (filter === 'expired') { params.set('isExpired', 'true'); params.set('isDisposed', 'false'); }
    else if (filter === 'active') { params.set('isDisposed', 'false'); }
    else if (filter === 'disposed') params.set('isDisposed', 'true');
    const res = await fetch(`/api/haccp/food-samples?${params}`);
    if (res.ok) setSamples(await res.json());
  }, [filter]);

  useEffect(() => {
    fetchSamples().finally(() => setLoading(false));
  }, [fetchSamples]);

  const saveSample = async () => {
    if (!form.productName || !form.sampleDate) { toast.error('Ürün adı ve tarih zorunludur'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/haccp/food-samples', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error();
      toast.success('Numune kaydedildi');
      setAddDialogOpen(false);
      fetchSamples();
    } catch { toast.error('Kayıt başarısız'); }
    finally { setSaving(false); }
  };

  const disposeSample = async () => {
    if (!selectedSample) return;
    try {
      const res = await fetch(`/api/haccp/food-samples/${selectedSample.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dispose: true }) });
      if (!res.ok) throw new Error();
      toast.success('Numune imha edildi');
      setDisposeDialogOpen(false);
      fetchSamples();
    } catch { toast.error('İmha işlemi başarısız'); }
  };

  const openAddDialog = () => {
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date().toTimeString().slice(0, 5);
    setForm({ productName: '', sampleDate: today, sampleTime: now, mealType: '', storageTemp: '4', retentionHours: '72', notes: '' });
    setAddDialogOpen(true);
  };

  if (loading) return <div className="p-6"><div className="h-8 w-64 bg-gray-200 rounded animate-pulse" /></div>;

  const expiredCount = samples.filter((s) => s.isExpired && !s.isDisposed).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gıda Numune Takibi</h1>
          <p className="text-gray-500 mt-1">Günlük yemek numunesi saklama ve takip sistemi (72 saat)</p>
        </div>
        <Button onClick={openAddDialog}>
          <Plus className="h-4 w-4 mr-2" /> Numune Ekle
        </Button>
      </div>

      {expiredCount > 0 && filter !== 'disposed' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="text-sm font-medium">{expiredCount} numunenin süresi dolmuş — imha edilmesi gerekiyor</span>
        </div>
      )}

      {/* Özet kartlar */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="cursor-pointer" onClick={() => setFilter('active')}>
          <CardContent className="p-4 flex items-center gap-3">
            <FlaskConical className={`h-5 w-5 ${filter === 'active' ? 'text-purple-600' : 'text-gray-400'}`} />
            <div>
              <p className="text-xs text-gray-500">Aktif Numuneler</p>
              <p className="text-xl font-bold">{samples.filter((s) => !s.isDisposed && !s.isExpired).length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer" onClick={() => setFilter('expired')}>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className={`h-5 w-5 ${filter === 'expired' ? 'text-red-600' : 'text-gray-400'}`} />
            <div>
              <p className="text-xs text-gray-500">Süresi Dolan</p>
              <p className="text-xl font-bold text-red-600">{samples.filter((s) => s.isExpired && !s.isDisposed).length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer" onClick={() => setFilter('disposed')}>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className={`h-5 w-5 ${filter === 'disposed' ? 'text-green-600' : 'text-gray-400'}`} />
            <div>
              <p className="text-xs text-gray-500">İmha Edilen</p>
              <p className="text-xl font-bold">{samples.filter((s) => s.isDisposed).length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kod</TableHead>
              <TableHead>Ürün Adı</TableHead>
              <TableHead>Öğün</TableHead>
              <TableHead>Numune Tarihi</TableHead>
              <TableHead>Saklama (°C)</TableHead>
              <TableHead>Son Tarih</TableHead>
              <TableHead>Kalan Süre</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead>İşlem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {samples.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center text-gray-400 py-8">Kayıt bulunamadı</TableCell></TableRow>
            ) : (
              samples.map((sample) => {
                const remaining = getTimeRemaining(sample.expiryDateTime);
                return (
                  <TableRow key={sample.id} className={sample.isExpired && !sample.isDisposed ? 'bg-red-50' : undefined}>
                    <TableCell className="font-mono text-xs">{sample.code}</TableCell>
                    <TableCell className="font-medium">{sample.productName}</TableCell>
                    <TableCell className="text-sm">{sample.mealType ? mealTypeLabels[sample.mealType] ?? sample.mealType : '—'}</TableCell>
                    <TableCell className="text-sm">
                      {new Date(sample.sampleDate).toLocaleDateString('tr-TR')}
                      {sample.sampleTime && <span className="text-gray-400 ml-1">{sample.sampleTime}</span>}
                    </TableCell>
                    <TableCell className="text-sm">{sample.storageTemp !== null ? `${sample.storageTemp}°C` : '—'}</TableCell>
                    <TableCell className="text-sm">{new Date(sample.expiryDateTime).toLocaleString('tr-TR')}</TableCell>
                    <TableCell>
                      {sample.isDisposed ? (
                        <span className="text-xs text-gray-400">İmha edildi</span>
                      ) : remaining.expired ? (
                        <span className="text-xs font-medium text-red-600">Süresi doldu</span>
                      ) : remaining.urgent ? (
                        <span className="text-xs font-medium text-orange-600 flex items-center gap-1">
                          <Clock className="h-3 w-3" />{remaining.hours}s kaldı
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500">{remaining.hours}s kaldı</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {sample.isDisposed ? (
                        <Badge className="bg-gray-100 text-gray-600 text-xs">İmha Edildi</Badge>
                      ) : sample.isExpired ? (
                        <Badge variant="destructive" className="text-xs">Süresi Doldu</Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-700 text-xs">Aktif</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {!sample.isDisposed && (
                        <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => { setSelectedSample(sample); setDisposeDialogOpen(true); }}>
                          <Trash2 className="h-3 w-3 mr-1" /> İmha Et
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

      {/* Numune Ekleme Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Yeni Gıda Numunesi</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Ürün / Yemek Adı *</Label>
              <Input value={form.productName} onChange={(e) => setForm((f) => ({ ...f, productName: e.target.value }))} placeholder="ör: Izgara Tavuk" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Tarih *</Label>
                <Input type="date" value={form.sampleDate} onChange={(e) => setForm((f) => ({ ...f, sampleDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Saat</Label>
                <Input type="time" value={form.sampleTime} onChange={(e) => setForm((f) => ({ ...f, sampleTime: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Öğün</Label>
                <Select value={form.mealType || 'none'} onValueChange={(v) => setForm((f) => ({ ...f, mealType: v === 'none' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="Seçin" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Belirtilmemiş</SelectItem>
                    {Object.entries(mealTypeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Saklama Sıcaklığı (°C)</Label>
                <Input type="number" step="0.1" value={form.storageTemp} onChange={(e) => setForm((f) => ({ ...f, storageTemp: e.target.value }))} placeholder="4" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Saklama Süresi (saat)</Label>
              <Select value={form.retentionHours} onValueChange={(v) => setForm((f) => ({ ...f, retentionHours: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="48">48 saat</SelectItem>
                  <SelectItem value="72">72 saat (standart)</SelectItem>
                  <SelectItem value="96">96 saat</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Not</Label>
              <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>İptal</Button>
            <Button onClick={saveSample} disabled={saving}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* İmha Dialog */}
      <Dialog open={disposeDialogOpen} onOpenChange={setDisposeDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Numune İmhası</DialogTitle></DialogHeader>
          {selectedSample && (
            <div className="space-y-3">
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <p className="font-medium">{selectedSample.productName}</p>
                <p className="text-gray-500">{selectedSample.code}</p>
                <p className="text-gray-500">{new Date(selectedSample.sampleDate).toLocaleDateString('tr-TR')}</p>
              </div>
              <p className="text-sm text-gray-600">Bu numuneyi imha etmek istediğinizi onaylıyor musunuz?</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisposeDialogOpen(false)}>İptal</Button>
            <Button variant="destructive" onClick={disposeSample}>İmha Et</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
