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
import { Plus, Trash2, AlertTriangle, ClipboardList, User, Flame, Package } from 'lucide-react';

interface Personnel {
  id: string;
  name: string;
  surname: string;
  portorStatus: 'gecerli' | 'suresi_dolmus' | 'kayit_yok';
  portorNextExamDate: string | null;
}

interface Warehouse {
  id: string;
  code: string;
  name: string;
  type: string;
}

interface Ingredient {
  name: string;
  quantity: string;
  unit: string;
  warehouseId: string;
  lotNumber: string;
}

interface ProductionIngredientRecord {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  lotNumber: string | null;
  warehouse: { id: string; code: string; name: string; type: string } | null;
}

interface ProductionRecord {
  id: string;
  code: string;
  productionDate: string;
  productName: string;
  quantity: number;
  quantityUnit: string;
  cookingTemp: number | null;
  cookingDuration: number | null;
  finalInternalTemp: number | null;
  hasTempWarning: boolean;
  notes: string | null;
  staff: { id: string; name: string; surname: string };
  createdBy: { id: string; name: string; surname: string };
  ingredients: ProductionIngredientRecord[];
}

const warehouseTypeLabels: Record<string, string> = {
  ANA_DEPO: 'Ana Depo', MUTFAK: 'Mutfak', SOGUK_ODA: 'Soğuk Oda', KILER: 'Kiler', DIGER: 'Diğer',
};

const UNITS = ['kg', 'g', 'litre', 'ml', 'adet', 'porsiyon', 'kutu', 'paket'];

function PortorBadge({ status }: { status: Personnel['portorStatus'] }) {
  if (status === 'gecerli') return <Badge className="bg-green-100 text-green-700 text-xs ml-1">✅ Geçerli</Badge>;
  if (status === 'suresi_dolmus') return <Badge variant="destructive" className="text-xs ml-1">⚠️ Süresi Dolmuş</Badge>;
  return <Badge className="bg-gray-100 text-gray-500 text-xs ml-1">— Kayıt Yok</Badge>;
}

const emptyIngredient = (): Ingredient => ({ name: '', quantity: '', unit: 'kg', warehouseId: '', lotNumber: '' });
const emptyForm = () => ({
  productionDate: new Date().toISOString().slice(0, 16),
  productName: '',
  quantity: '',
  quantityUnit: 'kg',
  staffId: '',
  cookingTemp: '',
  cookingDuration: '',
  finalInternalTemp: '',
  notes: '',
});

export default function ProductionPage() {
  const [records, setRecords] = useState<ProductionRecord[]>([]);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [detailRecord, setDetailRecord] = useState<ProductionRecord | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState(emptyForm());
  const [ingredients, setIngredients] = useState<Ingredient[]>([emptyIngredient()]);

  // Filtreler
  const [searchText, setSearchText] = useState('');
  const [filterStaffId, setFilterStaffId] = useState('');
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');

  const fetchRecords = useCallback(async () => {
    const params = new URLSearchParams();
    if (searchText) params.set('search', searchText);
    if (filterStaffId) params.set('staffId', filterStaffId);
    if (filterStart) params.set('startDate', filterStart);
    if (filterEnd) params.set('endDate', filterEnd);
    const res = await fetch(`/api/haccp/production?${params}`);
    if (res.ok) setRecords(await res.json());
  }, [searchText, filterStaffId, filterStart, filterEnd]);

  const fetchPersonnel = useCallback(async () => {
    const res = await fetch('/api/haccp/personnel');
    if (res.ok) setPersonnel(await res.json());
  }, []);

  const fetchWarehouses = useCallback(async () => {
    const res = await fetch('/api/haccp/warehouses');
    if (res.ok) setWarehouses(await res.json());
  }, []);

  useEffect(() => {
    Promise.all([fetchRecords(), fetchPersonnel(), fetchWarehouses()]).finally(() => setLoading(false));
  }, [fetchRecords, fetchPersonnel, fetchWarehouses]);

  const openAdd = () => {
    setForm(emptyForm());
    setIngredients([emptyIngredient()]);
    setAddDialogOpen(true);
  };

  const setIngredientField = (idx: number, field: keyof Ingredient, value: string) => {
    setIngredients((prev) => prev.map((ing, i) => (i === idx ? { ...ing, [field]: value } : ing)));
  };

  const addIngredient = () => setIngredients((prev) => [...prev, emptyIngredient()]);
  const removeIngredient = (idx: number) => setIngredients((prev) => prev.filter((_, i) => i !== idx));

  const selectedStaff = personnel.find((p) => p.id === form.staffId);

  const cookingTempNum = form.cookingTemp !== '' ? parseFloat(form.cookingTemp) : null;
  const showTempWarning = cookingTempNum !== null && !isNaN(cookingTempNum) && cookingTempNum < 75;

  const save = async () => {
    if (!form.productionDate || !form.productName || !form.staffId) {
      toast.error('Tarih, ürün adı ve personel zorunludur');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/haccp/production', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          ingredients: ingredients.filter((i) => i.name.trim()),
        }),
      });
      if (!res.ok) throw new Error();
      toast.success('Üretim kaydı oluşturuldu');
      setAddDialogOpen(false);
      fetchRecords();
    } catch {
      toast.error('Kayıt oluşturulamadı');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6"><div className="h-8 w-64 bg-gray-200 rounded animate-pulse" /></div>;

  const warningCount = records.filter((r) => r.hasTempWarning).length;

  return (
    <div className="p-6 space-y-6">
      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Üretim Kayıtları</h1>
          <p className="text-gray-500 mt-1">Mutfak üretim süreçleri ve ham madde takibi</p>
        </div>
        <Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" /> Yeni Üretim Kaydı</Button>
      </div>

      {/* HACCP uyarı banner */}
      {warningCount > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-center gap-2 text-orange-700">
          <Flame className="h-4 w-4 shrink-0" />
          <span className="text-sm font-medium">{warningCount} kayıtta pişirme sıcaklığı 75°C altında — HACCP uyarısı</span>
        </div>
      )}

      {/* Özet kartlar */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <ClipboardList className="h-5 w-5 text-purple-600" />
            <div>
              <p className="text-xs text-gray-500">Toplam Kayıt</p>
              <p className="text-xl font-bold">{records.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Flame className="h-5 w-5 text-orange-500" />
            <div>
              <p className="text-xs text-gray-500">Sıcaklık Uyarısı</p>
              <p className="text-xl font-bold text-orange-600">{warningCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Package className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-xs text-gray-500">Ham Madde Girişi</p>
              <p className="text-xl font-bold">{records.reduce((s, r) => s + r.ingredients.length, 0)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtreler */}
      <div className="flex flex-wrap gap-3">
        <Input
          className="w-56"
          placeholder="Ürün adı veya kod ara..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
        <Select value={filterStaffId || 'all'} onValueChange={(v) => setFilterStaffId(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Personel filtrele" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Personel</SelectItem>
            {personnel.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name} {p.surname}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input type="date" className="w-40" value={filterStart} onChange={(e) => setFilterStart(e.target.value)} />
        <Input type="date" className="w-40" value={filterEnd} onChange={(e) => setFilterEnd(e.target.value)} />
        <Button variant="outline" size="sm" onClick={fetchRecords}>Filtrele</Button>
        {(searchText || filterStaffId || filterStart || filterEnd) && (
          <Button variant="ghost" size="sm" onClick={() => { setSearchText(''); setFilterStaffId(''); setFilterStart(''); setFilterEnd(''); }}>
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
              <TableHead>Tarih / Saat</TableHead>
              <TableHead>Ürün</TableHead>
              <TableHead>Miktar</TableHead>
              <TableHead>Personel</TableHead>
              <TableHead>Pişirme °C</TableHead>
              <TableHead>Son İç Temp</TableHead>
              <TableHead>Ham Madde</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead>İşlem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.length === 0 ? (
              <TableRow><TableCell colSpan={10} className="text-center text-gray-400 py-8">Kayıt bulunamadı</TableCell></TableRow>
            ) : (
              records.map((r) => (
                <TableRow key={r.id} className={r.hasTempWarning ? 'bg-orange-50' : undefined}>
                  <TableCell className="font-mono text-xs">{r.code}</TableCell>
                  <TableCell className="text-sm whitespace-nowrap">
                    {new Date(r.productionDate).toLocaleDateString('tr-TR')}
                    <span className="text-gray-400 ml-1 text-xs">{new Date(r.productionDate).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </TableCell>
                  <TableCell className="font-medium">{r.productName}</TableCell>
                  <TableCell className="text-sm">{r.quantity} {r.quantityUnit}</TableCell>
                  <TableCell className="text-sm">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3 text-gray-400" />
                      {r.staff.name} {r.staff.surname}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {r.cookingTemp !== null ? (
                      <span className={r.hasTempWarning ? 'text-orange-600 font-semibold' : ''}>
                        {r.cookingTemp}°C
                        {r.hasTempWarning && <AlertTriangle className="h-3 w-3 inline ml-1" />}
                      </span>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {r.finalInternalTemp !== null ? `${r.finalInternalTemp}°C` : '—'}
                  </TableCell>
                  <TableCell className="text-sm">{r.ingredients.length} kalem</TableCell>
                  <TableCell>
                    {r.hasTempWarning ? (
                      <Badge variant="destructive" className="text-xs">HACCP Uyarı</Badge>
                    ) : (
                      <Badge className="bg-green-100 text-green-700 text-xs">Normal</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => setDetailRecord(r)}>Detay</Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Yeni Üretim Kaydı Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Yeni Üretim Kaydı</DialogTitle>
            <DialogDescription>Mutfakta gerçekleştirilen üretimi kayıt altına alın.</DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            {/* Temel Bilgiler */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Tarih & Saat *</Label>
                <Input type="datetime-local" value={form.productionDate} onChange={(e) => setForm((f) => ({ ...f, productionDate: e.target.value }))} />
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
                <Label>Üretilen Ürün Adı *</Label>
                <Input value={form.productName} onChange={(e) => setForm((f) => ({ ...f, productName: e.target.value }))} placeholder="ör: Izgara Tavuk" />
              </div>
              <div className="space-y-1.5">
                <Label>Miktar</Label>
                <div className="flex gap-2">
                  <Input type="number" step="0.1" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} placeholder="0" />
                  <Select value={form.quantityUnit} onValueChange={(v) => setForm((f) => ({ ...f, quantityUnit: v }))}>
                    <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Pişirme Bilgileri */}
            <div className="border rounded-lg p-4 space-y-3 bg-gray-50">
              <p className="text-sm font-medium text-gray-700">Pişirme Bilgileri</p>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Pişirme Sıcaklığı (°C)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={form.cookingTemp}
                    onChange={(e) => setForm((f) => ({ ...f, cookingTemp: e.target.value }))}
                    placeholder="75"
                    className={showTempWarning ? 'border-orange-400' : ''}
                  />
                  {showTempWarning && (
                    <p className="text-xs text-orange-600 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> HACCP: 75°C altı uyarı
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Pişirme Süresi (dk)</Label>
                  <Input type="number" value={form.cookingDuration} onChange={(e) => setForm((f) => ({ ...f, cookingDuration: e.target.value }))} placeholder="0" />
                </div>
                <div className="space-y-1.5">
                  <Label>Son İç Sıcaklık (°C)</Label>
                  <Input type="number" step="0.1" value={form.finalInternalTemp} onChange={(e) => setForm((f) => ({ ...f, finalInternalTemp: e.target.value }))} placeholder="ör: 82" />
                </div>
              </div>
            </div>

            {/* Ham Maddeler */}
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700">Kullanılan Ham Maddeler</p>
                <Button type="button" size="sm" variant="outline" onClick={addIngredient}>
                  <Plus className="h-3 w-3 mr-1" /> Ekle
                </Button>
              </div>
              {ingredients.map((ing, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-3 space-y-1">
                    {idx === 0 && <Label className="text-xs">Ham Madde Adı</Label>}
                    <Input placeholder="ör: Tavuk göğsü" value={ing.name} onChange={(e) => setIngredientField(idx, 'name', e.target.value)} />
                  </div>
                  <div className="col-span-2 space-y-1">
                    {idx === 0 && <Label className="text-xs">Miktar</Label>}
                    <Input type="number" step="0.1" placeholder="0" value={ing.quantity} onChange={(e) => setIngredientField(idx, 'quantity', e.target.value)} />
                  </div>
                  <div className="col-span-1 space-y-1">
                    {idx === 0 && <Label className="text-xs">Birim</Label>}
                    <Select value={ing.unit} onValueChange={(v) => setIngredientField(idx, 'unit', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3 space-y-1">
                    {idx === 0 && <Label className="text-xs">Depo / Soğuk Oda</Label>}
                    <Select value={ing.warehouseId || 'none'} onValueChange={(v) => setIngredientField(idx, 'warehouseId', v === 'none' ? '' : v)}>
                      <SelectTrigger><SelectValue placeholder="Depo seçin" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">—</SelectItem>
                        {warehouses.map((w) => (
                          <SelectItem key={w.id} value={w.id}>{w.name} ({warehouseTypeLabels[w.type] ?? w.type})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 space-y-1">
                    {idx === 0 && <Label className="text-xs">Lot / Parti No</Label>}
                    <Input placeholder="LOT-001" value={ing.lotNumber} onChange={(e) => setIngredientField(idx, 'lotNumber', e.target.value)} />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    {idx > 0 && (
                      <Button type="button" size="sm" variant="ghost" className="text-red-500" onClick={() => removeIngredient(idx)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {ingredients.some((i) => i.warehouseId) && (
                <p className="text-xs text-blue-600 bg-blue-50 rounded p-2">
                  Depo seçilen ham maddeler için otomatik Depo Hareketi (çıkış) kaydı oluşturulacak.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Notlar / Sapma Açıklaması</Label>
              <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>İptal</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detay Dialog */}
      {detailRecord && (
        <Dialog open={!!detailRecord} onOpenChange={() => setDetailRecord(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{detailRecord.code} — {detailRecord.productName}</DialogTitle>
              <DialogDescription>
                {new Date(detailRecord.productionDate).toLocaleString('tr-TR')} tarihli üretim kaydı
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Personel</p>
                  <p className="font-medium">{detailRecord.staff.name} {detailRecord.staff.surname}</p>
                </div>
                <div>
                  <p className="text-gray-500">Miktar</p>
                  <p className="font-medium">{detailRecord.quantity} {detailRecord.quantityUnit}</p>
                </div>
                <div>
                  <p className="text-gray-500">Pişirme Sıcaklığı</p>
                  <p className={`font-medium ${detailRecord.hasTempWarning ? 'text-orange-600' : ''}`}>
                    {detailRecord.cookingTemp !== null ? `${detailRecord.cookingTemp}°C` : '—'}
                    {detailRecord.hasTempWarning && ' ⚠️'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Son İç Sıcaklık</p>
                  <p className="font-medium">{detailRecord.finalInternalTemp !== null ? `${detailRecord.finalInternalTemp}°C` : '—'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Pişirme Süresi</p>
                  <p className="font-medium">{detailRecord.cookingDuration !== null ? `${detailRecord.cookingDuration} dk` : '—'}</p>
                </div>
              </div>
              {detailRecord.notes && (
                <div>
                  <p className="text-xs text-gray-500">Notlar</p>
                  <p className="text-sm mt-1 bg-gray-50 rounded p-2">{detailRecord.notes}</p>
                </div>
              )}
              {detailRecord.ingredients.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Kullanılan Ham Maddeler</p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ham Madde</TableHead>
                        <TableHead>Miktar</TableHead>
                        <TableHead>Depo</TableHead>
                        <TableHead>Lot No</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailRecord.ingredients.map((ing) => (
                        <TableRow key={ing.id}>
                          <TableCell className="text-sm">{ing.name}</TableCell>
                          <TableCell className="text-sm">{ing.quantity} {ing.unit}</TableCell>
                          <TableCell className="text-sm">
                            {ing.warehouse ? `${ing.warehouse.name} (${warehouseTypeLabels[ing.warehouse.type] ?? ing.warehouse.type})` : '—'}
                          </TableCell>
                          <TableCell className="text-sm font-mono">{ing.lotNumber || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
