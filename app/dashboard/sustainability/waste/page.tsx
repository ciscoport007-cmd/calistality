'use client';

import { useState, useEffect } from 'react';
import { Trash2, Plus, RefreshCw, FileText, Upload, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { toast } from 'sonner';

interface WasteRecord {
  id: string;
  code: string;
  recordDate: string;
  period: string;
  wasteType: string;
  area: string;
  quantity: number;
  isRecycled: boolean;
  disposalFirm: string | null;
  waybillNo: string | null;
  notes: string | null;
  createdBy: { id: string; name: string; surname: string | null };
  createdAt: string;
}

const WASTE_TYPE_LABELS: Record<string, string> = {
  ORGANIK: 'Organik',
  PLASTIK: 'Plastik',
  CAM: 'Cam',
  KAGIT: 'Kağıt',
  TEHLIKELI: 'Tehlikeli',
  DIGER: 'Diğer',
};

const WASTE_TYPE_COLORS: Record<string, string> = {
  ORGANIK: 'bg-green-100 text-green-800',
  PLASTIK: 'bg-blue-100 text-blue-800',
  CAM: 'bg-cyan-100 text-cyan-800',
  KAGIT: 'bg-yellow-100 text-yellow-800',
  TEHLIKELI: 'bg-red-100 text-red-800',
  DIGER: 'bg-gray-100 text-gray-800',
};

const CHART_COLORS = ['#22c55e', '#3b82f6', '#06b6d4', '#eab308', '#ef4444', '#6b7280'];

const AREA_OPTIONS = ['Mutfak', 'Bar', 'Restoran', 'Housekeeping', 'Bahçe', 'Spa', 'Teknik', 'Ofis', 'Diğer'];

export default function WastePage() {
  const [records, setRecords] = useState<WasteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [filterArea, setFilterArea] = useState('all');

  const [form, setForm] = useState({
    recordDate: new Date().toISOString().split('T')[0],
    period: 'GUNLUK',
    wasteType: 'ORGANIK',
    area: 'Mutfak',
    quantity: '',
    isRecycled: false,
    disposalFirm: '',
    waybillNo: '',
    notes: '',
  });

  useEffect(() => {
    fetchRecords();
  }, [filterType, filterArea]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (filterType && filterType !== 'all') params.set('wasteType', filterType);
      if (filterArea && filterArea !== 'all') params.set('area', filterArea);
      const res = await fetch(`/api/sustainability/waste?${params}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records || []);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Kayıtlar yüklenemedi');
      }
    } catch (e) {
      console.error(e);
      toast.error('Bağlantı hatası');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const res = await fetch('/api/sustainability/waste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, quantity: parseFloat(form.quantity) }),
      });
      if (res.ok) {
        toast.success('Atık kaydı oluşturuldu');
        setShowDialog(false);
        setForm({ recordDate: new Date().toISOString().split('T')[0], period: 'GUNLUK', wasteType: 'ORGANIK', area: 'Mutfak', quantity: '', isRecycled: false, disposalFirm: '', waybillNo: '', notes: '' });
        fetchRecords();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Hata oluştu');
      }
    } catch (e) {
      toast.error('Kayıt oluşturulamadı');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu kaydı silmek istediğinizden emin misiniz?')) return;
    try {
      const res = await fetch(`/api/sustainability/waste/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Silindi');
        fetchRecords();
      }
    } catch (e) {
      toast.error('Silinemedi');
    }
  };

  // Chart data
  const typeData = Object.keys(WASTE_TYPE_LABELS).map(type => ({
    name: WASTE_TYPE_LABELS[type],
    kg: records.filter(r => r.wasteType === type).reduce((s, r) => s + r.quantity, 0),
  })).filter(d => d.kg > 0);

  const totalKg = records.reduce((s, r) => s + r.quantity, 0);
  const recycledKg = records.filter(r => r.isRecycled).reduce((s, r) => s + r.quantity, 0);
  const recyclingRate = totalKg > 0 ? (recycledKg / totalKg) * 100 : 0;
  const hazardousKg = records.filter(r => r.wasteType === 'TEHLIKELI').reduce((s, r) => s + r.quantity, 0);

  const pieData = [
    { name: 'Geri Dönüştürülen', value: recycledKg },
    { name: 'Diğer Atık', value: totalKg - recycledKg },
  ].filter(d => d.value > 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <Trash2 className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Atık Yönetimi</h1>
            <p className="text-sm text-gray-500">Organik · Plastik · Cam · Kağıt · Tehlikeli</p>
          </div>
        </div>
        <Button size="sm" onClick={() => setShowDialog(true)}>
          <Plus className="w-4 h-4 mr-1" /> Kayıt Ekle
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Toplam Atık</p>
            <p className="text-2xl font-bold">{totalKg.toFixed(1)} <span className="text-sm font-normal text-gray-500">kg</span></p>
            <p className="text-xs text-gray-400 mt-1">{records.length} kayıt</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Geri Dönüşüm</p>
            <p className="text-2xl font-bold text-green-700">{recycledKg.toFixed(1)} <span className="text-sm font-normal">kg</span></p>
            <div className="flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-3 h-3 text-green-600" />
              <p className="text-xs text-green-700 font-medium">%{recyclingRate.toFixed(1)} oran</p>
            </div>
          </CardContent>
        </Card>
        <Card className={hazardousKg > 0 ? 'border-red-200 bg-red-50' : ''}>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Tehlikeli Atık</p>
            <p className={`text-2xl font-bold ${hazardousKg > 0 ? 'text-red-700' : ''}`}>{hazardousKg.toFixed(1)} <span className="text-sm font-normal">kg</span></p>
            {hazardousKg > 0 && (
              <div className="flex items-center gap-1 mt-1">
                <AlertTriangle className="w-3 h-3 text-red-600" />
                <p className="text-xs text-red-700">Lisanslı imha gerekli</p>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Kişi Başı</p>
            <p className="text-2xl font-bold">{(totalKg / Math.max(records.length, 1)).toFixed(2)} <span className="text-sm font-normal text-gray-500">kg/gün</span></p>
            <p className="text-xs text-gray-400 mt-1">Ortalama günlük</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Atık Türüne Göre Dağılım</CardTitle>
          </CardHeader>
          <CardContent>
            {typeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={typeData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={60} />
                  <Tooltip formatter={(v: number) => `${v.toFixed(1)} kg`} />
                  <Bar dataKey="kg" fill="#22c55e" radius={[0, 4, 4, 0]}>
                    {typeData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">Veri yok</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Geri Dönüşüm Oranı</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                    {pieData.map((_, i) => <Cell key={i} fill={i === 0 ? '#22c55e' : '#d1d5db'} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => `${v.toFixed(1)} kg`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">Veri yok</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters + Table */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Atık Kayıtları</CardTitle>
            <div className="flex gap-2">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Tür filtre" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Türler</SelectItem>
                  {Object.entries(WASTE_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterArea} onValueChange={setFilterArea}>
                <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="Alan filtre" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Alanlar</SelectItem>
                  {AREA_OPTIONS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm" onClick={fetchRecords}><RefreshCw className="w-4 h-4" /></Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-400">Yükleniyor...</div>
          ) : records.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Trash2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>Kayıt bulunamadı</p>
              <Button variant="link" onClick={() => setShowDialog(true)}>İlk kaydı ekle</Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kod</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Tür</TableHead>
                  <TableHead>Alan</TableHead>
                  <TableHead className="text-right">Miktar (kg)</TableHead>
                  <TableHead>Geri Dönüşüm</TableHead>
                  <TableHead>Lisanslı Firma</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map(r => (
                  <TableRow key={r.id} className={r.wasteType === 'TEHLIKELI' ? 'bg-red-50' : ''}>
                    <TableCell className="font-mono text-xs">{r.code}</TableCell>
                    <TableCell className="text-sm">{new Date(r.recordDate).toLocaleDateString('tr-TR')}</TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${WASTE_TYPE_COLORS[r.wasteType]}`}>
                        {WASTE_TYPE_LABELS[r.wasteType]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{r.area}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{r.quantity.toFixed(2)}</TableCell>
                    <TableCell>
                      {r.isRecycled ? (
                        <Badge className="bg-green-100 text-green-800 text-xs"><CheckCircle2 className="w-3 h-3 mr-1" />Evet</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">Hayır</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">{r.disposalFirm || '-'}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 h-7 px-2" onClick={() => handleDelete(r.id)}>Sil</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Yeni Atık Kaydı</DialogTitle>
            <DialogDescription>Atık türü, miktarı ve alanı girerek kayıt oluşturun.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tarih *</Label>
                <Input type="date" value={form.recordDate} onChange={e => setForm({ ...form, recordDate: e.target.value })} />
              </div>
              <div>
                <Label>Dönem</Label>
                <Select value={form.period} onValueChange={v => setForm({ ...form, period: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GUNLUK">Günlük</SelectItem>
                    <SelectItem value="HAFTALIK">Haftalık</SelectItem>
                    <SelectItem value="AYLIK">Aylık</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Atık Türü *</Label>
                <Select value={form.wasteType} onValueChange={v => setForm({ ...form, wasteType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(WASTE_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Alan *</Label>
                <Select value={form.area} onValueChange={v => setForm({ ...form, area: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {AREA_OPTIONS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Miktar (kg) *</Label>
              <Input type="number" step="0.01" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} placeholder="0.00" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="recycled" checked={form.isRecycled} onChange={e => setForm({ ...form, isRecycled: e.target.checked })} className="rounded" />
              <Label htmlFor="recycled">Geri dönüştürüldü</Label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Lisanslı Firma</Label>
                <Input value={form.disposalFirm} onChange={e => setForm({ ...form, disposalFirm: e.target.value })} placeholder="Firma adı" />
              </div>
              <div>
                <Label>İrsaliye No</Label>
                <Input value={form.waybillNo} onChange={e => setForm({ ...form, waybillNo: e.target.value })} placeholder="No" />
              </div>
            </div>
            <div>
              <Label>Notlar</Label>
              <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>İptal</Button>
            <Button onClick={handleCreate} disabled={!form.quantity || !form.recordDate}>Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
