'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, ArrowRight, Thermometer, AlertTriangle, BoxIcon, GitBranch } from 'lucide-react';

interface Personnel {
  id: string;
  name: string;
  surname: string;
  portorStatus: 'gecerli' | 'suresi_dolmus' | 'kayit_yok';
}

interface Warehouse {
  id: string;
  code: string;
  name: string;
  type: string;
}

interface Movement {
  id: string;
  code: string;
  movementDate: string;
  productName: string;
  quantity: number;
  unit: string;
  lotNumber: string | null;
  transportTemp: number | null;
  hasTempWarning: boolean;
  notes: string | null;
  isAutoCreated: boolean;
  staff: { id: string; name: string; surname: string };
  sourceWarehouse: { id: string; code: string; name: string; type: string };
  targetWarehouse: { id: string; code: string; name: string; type: string };
  ingredient: {
    id: string;
    production: { id: string; code: string; productName: string } | null;
  } | null;
}

interface TraceChainItem {
  id: string;
  code: string;
  movementDate: string;
  sourceWarehouse: { id: string; name: string; type: string };
  targetWarehouse: { id: string; name: string; type: string };
  quantity: number;
  unit: string;
  staff: { id: string; name: string; surname: string };
}

interface TraceDetail {
  movement: Movement & { sourceWarehouse: Warehouse; targetWarehouse: Warehouse };
  chain: TraceChainItem[];
}

const warehouseTypeLabels: Record<string, string> = {
  ANA_DEPO: 'Ana Depo', MUTFAK: 'Mutfak', SOGUK_ODA: 'Soğuk Oda', KILER: 'Kiler', DIGER: 'Diğer',
};

const UNITS = ['kg', 'g', 'litre', 'ml', 'adet', 'porsiyon', 'kutu', 'paket'];

function PortorBadge({ status }: { status: Personnel['portorStatus'] }) {
  if (status === 'gecerli') return <Badge className="bg-green-100 text-green-700 text-xs">✅ Geçerli</Badge>;
  if (status === 'suresi_dolmus') return <Badge variant="destructive" className="text-xs">⚠️ Süresi Dolmuş</Badge>;
  return <Badge className="bg-gray-100 text-gray-500 text-xs">— Kayıt Yok</Badge>;
}

const emptyForm = () => ({
  movementDate: new Date().toISOString().slice(0, 16),
  productName: '',
  quantity: '',
  unit: 'kg',
  staffId: '',
  sourceWarehouseId: '',
  targetWarehouseId: '',
  lotNumber: '',
  transportTemp: '',
  notes: '',
});

export default function WarehouseMovementsPage() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [traceDetail, setTraceDetail] = useState<TraceDetail | null>(null);
  const [traceLoading, setTraceLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm());

  // Filtreler
  const [filterSource, setFilterSource] = useState('');
  const [filterTarget, setFilterTarget] = useState('');
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');

  const fetchMovements = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterSource) params.set('sourceWarehouseId', filterSource);
    if (filterTarget) params.set('targetWarehouseId', filterTarget);
    if (filterStart) params.set('startDate', filterStart);
    if (filterEnd) params.set('endDate', filterEnd);
    const res = await fetch(`/api/haccp/warehouse-movements?${params}`);
    if (res.ok) setMovements(await res.json());
  }, [filterSource, filterTarget, filterStart, filterEnd]);

  const fetchPersonnel = useCallback(async () => {
    const res = await fetch('/api/haccp/personnel');
    if (res.ok) setPersonnel(await res.json());
  }, []);

  const fetchWarehouses = useCallback(async () => {
    const res = await fetch('/api/haccp/warehouses');
    if (res.ok) setWarehouses(await res.json());
  }, []);

  useEffect(() => {
    Promise.all([fetchMovements(), fetchPersonnel(), fetchWarehouses()]).finally(() => setLoading(false));
  }, [fetchMovements, fetchPersonnel, fetchWarehouses]);

  const openTrace = async (id: string) => {
    setTraceLoading(true);
    try {
      const res = await fetch(`/api/haccp/warehouse-movements/${id}`);
      if (res.ok) setTraceDetail(await res.json());
    } catch {
      toast.error('İzlenebilirlik verisi alınamadı');
    } finally {
      setTraceLoading(false);
    }
  };

  const parsedTemp = form.transportTemp !== '' ? parseFloat(form.transportTemp) : null;
  const showColdChainWarning = parsedTemp !== null && !isNaN(parsedTemp) && parsedTemp > 8;

  const selectedStaff = personnel.find((p) => p.id === form.staffId);

  const save = async () => {
    if (!form.movementDate || !form.productName || !form.staffId || !form.sourceWarehouseId || !form.targetWarehouseId) {
      toast.error('Tarih, ürün, personel, kaynak ve hedef depo zorunludur');
      return;
    }
    if (form.sourceWarehouseId === form.targetWarehouseId) {
      toast.error('Kaynak ve hedef depo aynı olamaz');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/haccp/warehouse-movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast.success('Hareket kaydı oluşturuldu');
      setAddDialogOpen(false);
      fetchMovements();
    } catch {
      toast.error('Kayıt oluşturulamadı');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6"><div className="h-8 w-64 bg-gray-200 rounded animate-pulse" /></div>;

  const tempWarningCount = movements.filter((m) => m.hasTempWarning).length;

  return (
    <div className="p-6 space-y-6">
      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Depo Hareketleri</h1>
          <p className="text-gray-500 mt-1">Stok çıkışları ve soğuk zincir takibi</p>
        </div>
        <Button onClick={() => { setForm(emptyForm()); setAddDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Yeni Hareket
        </Button>
      </div>

      {/* Soğuk zincir uyarısı */}
      {tempWarningCount > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2 text-blue-700">
          <Thermometer className="h-4 w-4 shrink-0" />
          <span className="text-sm font-medium">{tempWarningCount} harekette nakliye sıcaklığı 8°C üzerinde — soğuk zincir uyarısı</span>
        </div>
      )}

      {/* Özet kartlar */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <BoxIcon className="h-5 w-5 text-indigo-600" />
            <div>
              <p className="text-xs text-gray-500">Toplam Hareket</p>
              <p className="text-xl font-bold">{movements.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Thermometer className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-xs text-gray-500">Soğuk Zincir Uyarısı</p>
              <p className="text-xl font-bold text-blue-600">{tempWarningCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <GitBranch className="h-5 w-5 text-purple-500" />
            <div>
              <p className="text-xs text-gray-500">Otomatik Kayıt</p>
              <p className="text-xl font-bold">{movements.filter((m) => m.isAutoCreated).length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtreler */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterSource || 'all'} onValueChange={(v) => setFilterSource(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Kaynak depo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Kaynak</SelectItem>
            {warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterTarget || 'all'} onValueChange={(v) => setFilterTarget(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Hedef depo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Hedef</SelectItem>
            {warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="date" className="w-40" value={filterStart} onChange={(e) => setFilterStart(e.target.value)} />
        <Input type="date" className="w-40" value={filterEnd} onChange={(e) => setFilterEnd(e.target.value)} />
        <Button variant="outline" size="sm" onClick={fetchMovements}>Filtrele</Button>
        {(filterSource || filterTarget || filterStart || filterEnd) && (
          <Button variant="ghost" size="sm" onClick={() => { setFilterSource(''); setFilterTarget(''); setFilterStart(''); setFilterEnd(''); }}>
            Temizle
          </Button>
        )}
      </div>

      {/* Tablo */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kod</TableHead>
              <TableHead>Tarih</TableHead>
              <TableHead>Ürün</TableHead>
              <TableHead>Miktar</TableHead>
              <TableHead>Kaynak → Hedef</TableHead>
              <TableHead>Personel</TableHead>
              <TableHead>Nakliye °C</TableHead>
              <TableHead>Lot No</TableHead>
              <TableHead>İzlenebilirlik</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movements.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center text-gray-400 py-8">Kayıt bulunamadı</TableCell></TableRow>
            ) : (
              movements.map((m) => (
                <TableRow key={m.id} className={m.hasTempWarning ? 'bg-blue-50' : undefined}>
                  <TableCell>
                    <span className="font-mono text-xs">{m.code}</span>
                    {m.isAutoCreated && (
                      <Badge className="bg-purple-100 text-purple-700 text-xs ml-1">Otomatik</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap">
                    {new Date(m.movementDate).toLocaleDateString('tr-TR')}
                    <span className="text-gray-400 ml-1 text-xs">{new Date(m.movementDate).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </TableCell>
                  <TableCell className="font-medium text-sm">{m.productName}</TableCell>
                  <TableCell className="text-sm">{m.quantity} {m.unit}</TableCell>
                  <TableCell className="text-sm">
                    <div className="flex items-center gap-1 whitespace-nowrap">
                      <span className="text-gray-700">{m.sourceWarehouse.name}</span>
                      <ArrowRight className="h-3 w-3 text-gray-400" />
                      <span className="text-gray-700">{m.targetWarehouse.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{m.staff.name} {m.staff.surname}</TableCell>
                  <TableCell className="text-sm">
                    {m.transportTemp !== null ? (
                      <span className={m.hasTempWarning ? 'text-blue-700 font-semibold' : ''}>
                        {m.transportTemp}°C
                        {m.hasTempWarning && <AlertTriangle className="h-3 w-3 inline ml-1" />}
                      </span>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="text-sm font-mono">{m.lotNumber || '—'}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => openTrace(m.id)}>
                      <GitBranch className="h-3 w-3 mr-1" /> İzle
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Yeni Hareket Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Yeni Depo Hareketi</DialogTitle>
            <DialogDescription>Depodan mutfak kilerine veya soğuk odalara yapılan çekimi kayıt altına alın.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Tarih & Saat *</Label>
                <Input type="datetime-local" value={form.movementDate} onChange={(e) => setForm((f) => ({ ...f, movementDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Personel *</Label>
                <Select value={form.staffId || 'none'} onValueChange={(v) => setForm((f) => ({ ...f, staffId: v === 'none' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="Personel seçin" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Seçin</SelectItem>
                    {personnel.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} {p.surname}
                        {p.portorStatus === 'gecerli' ? ' ✅' : p.portorStatus === 'suresi_dolmus' ? ' ⚠️' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedStaff && (
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-xs text-gray-500">Portör:</span>
                    <PortorBadge status={selectedStaff.portorStatus} />
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5 col-span-2">
                <Label>Ürün / Ham Madde Adı *</Label>
                <Input value={form.productName} onChange={(e) => setForm((f) => ({ ...f, productName: e.target.value }))} placeholder="ör: Dana kıyma" />
              </div>
              <div className="space-y-1.5">
                <Label>Lot / Parti No</Label>
                <Input value={form.lotNumber} onChange={(e) => setForm((f) => ({ ...f, lotNumber: e.target.value }))} placeholder="LOT-001" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Miktar *</Label>
                <Input type="number" step="0.1" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label>Birim</Label>
                <Select value={form.unit} onValueChange={(v) => setForm((f) => ({ ...f, unit: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Nakliye Sıcaklığı (°C)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.transportTemp}
                  onChange={(e) => setForm((f) => ({ ...f, transportTemp: e.target.value }))}
                  placeholder="ör: 4"
                  className={showColdChainWarning ? 'border-blue-400' : ''}
                />
                {showColdChainWarning && (
                  <p className="text-xs text-blue-700 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Soğuk zincir: 8°C üstü uyarı
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Kaynak Depo *</Label>
                <Select value={form.sourceWarehouseId || 'none'} onValueChange={(v) => setForm((f) => ({ ...f, sourceWarehouseId: v === 'none' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="Kaynak seçin" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Seçin</SelectItem>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.name} ({warehouseTypeLabels[w.type] ?? w.type})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Hedef Depo *</Label>
                <Select value={form.targetWarehouseId || 'none'} onValueChange={(v) => setForm((f) => ({ ...f, targetWarehouseId: v === 'none' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="Hedef seçin" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Seçin</SelectItem>
                    {warehouses.filter((w) => w.id !== form.sourceWarehouseId).map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.name} ({warehouseTypeLabels[w.type] ?? w.type})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Notlar</Label>
              <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>İptal</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* İzlenebilirlik Dialog */}
      <Dialog open={!!traceDetail} onOpenChange={() => setTraceDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>İzlenebilirlik Zinciri</DialogTitle>
            <DialogDescription>
              {traceDetail?.movement.productName}
              {traceDetail?.movement.lotNumber ? ` — Lot: ${traceDetail.movement.lotNumber}` : ''}
            </DialogDescription>
          </DialogHeader>
          {traceLoading ? (
            <div className="py-8 text-center text-gray-400">Yükleniyor...</div>
          ) : traceDetail ? (
            <div className="space-y-4">
              {/* Üretim bağlantısı */}
              {traceDetail.movement.ingredient?.production && (
                <div className="bg-purple-50 rounded-lg p-3 text-sm">
                  <p className="font-medium text-purple-800">Bağlı Üretim Kaydı</p>
                  <p className="text-purple-600">{traceDetail.movement.ingredient.production.code} — {traceDetail.movement.ingredient.production.productName}</p>
                </div>
              )}

              {/* Zincir */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">
                  Ürün Hareketleri ({traceDetail.chain.length} kayıt)
                </p>
                <div className="space-y-2">
                  {traceDetail.chain.map((item, idx) => (
                    <div key={item.id} className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full ${item.id === traceDetail.movement.id ? 'bg-indigo-600' : 'bg-gray-300'}`} />
                        {idx < traceDetail.chain.length - 1 && <div className="w-px h-8 bg-gray-200" />}
                      </div>
                      <div className={`flex-1 rounded-lg p-3 text-sm ${item.id === traceDetail.movement.id ? 'bg-indigo-50 border border-indigo-200' : 'bg-gray-50'}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-gray-500">{item.code}</span>
                            <span className="text-gray-700">{item.sourceWarehouse.name}</span>
                            <ArrowRight className="h-3 w-3 text-gray-400" />
                            <span className="text-gray-700">{item.targetWarehouse.name}</span>
                          </div>
                          <span className="text-xs text-gray-500">{new Date(item.movementDate).toLocaleDateString('tr-TR')}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          <span>{item.quantity} {item.unit}</span>
                          <span>{item.staff.name} {item.staff.surname}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
