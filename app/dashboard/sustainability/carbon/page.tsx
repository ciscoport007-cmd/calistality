'use client';

import { useState, useEffect } from 'react';
import { Wind, Plus, Trash2, RefreshCw, TrendingDown, Leaf, Factory, Zap, Truck, Package, MoreHorizontal, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { toast } from 'sonner';

// ---- Kapsam Tanımları ----
const SCOPES = [
  {
    scope: 1,
    label: 'Kapsam 1',
    title: 'Doğrudan Emisyonlar',
    desc: 'Yakıt yanması, jeneratör, araç yakıtı',
    color: '#ef4444',
    bg: 'bg-red-50',
    border: 'border-red-200',
    textColor: 'text-red-700',
    icon: Factory,
    categories: ['Doğalgaz', 'LPG', 'Jeneratör Yakıtı', 'Araç Yakıtı', 'Soğutma Gazları', 'Diğer'],
  },
  {
    scope: 2,
    label: 'Kapsam 2',
    title: 'Satın Alınan Enerji',
    desc: 'Elektrik, ısı, buhar, soğutma',
    color: '#eab308',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    textColor: 'text-yellow-700',
    icon: Zap,
    categories: ['Elektrik', 'Isı/Buhar', 'Soğutma Enerjisi', 'Diğer'],
  },
  {
    scope: 3,
    label: 'Kapsam 3',
    title: 'Dolaylı Emisyonlar',
    desc: 'Çalışan ulaşımı, iş seyahati, tedarik',
    color: '#8b5cf6',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    textColor: 'text-purple-700',
    icon: Truck,
    categories: ['İş Seyahati', 'Çalışan Ulaşımı', 'Tedarik Zinciri', 'Misafir Ulaşımı', 'Diğer'],
  },
  {
    scope: 4,
    label: 'Kapsam 4',
    title: 'Su ve Atık',
    desc: 'Su tüketimi, atık bertarafı, arıtma',
    color: '#3b82f6',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    textColor: 'text-blue-700',
    icon: Wind,
    categories: ['Su Tüketimi', 'Atık Bertarafı', 'Atıksu Arıtma', 'Geri Dönüşüm', 'Diğer'],
  },
  {
    scope: 5,
    label: 'Kapsam 5',
    title: 'Otel İçi Hizmetler',
    desc: 'Servis araçları, peyzaj, yüzme havuzu',
    color: '#10b981',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    textColor: 'text-emerald-700',
    icon: Package,
    categories: ['Servis Araçları', 'Peyzaj/Bahçe', 'Yüzme Havuzu', 'Çamaşırhane', 'Mutfak/Catering', 'Diğer'],
  },
  {
    scope: 6,
    label: 'Kapsam 6',
    title: 'Diğer Emisyonlar',
    desc: 'Kimyasallar, inşaat, özel kalemler',
    color: '#6b7280',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    textColor: 'text-gray-700',
    icon: MoreHorizontal,
    categories: ['Kimyasallar', 'İnşaat/Tadilat', 'Özel Kalem', 'Diğer'],
  },
];

const SCOPE_COLORS = SCOPES.map(s => s.color);

interface CarbonEntry {
  id: string;
  code: string;
  scope: number;
  category: string;
  description: string | null;
  amountKg: number;
  entryDate: string;
  year: number;
  month: number;
  createdBy: { name: string | null };
}

interface CarbonData {
  entries: CarbonEntry[];
  scopeTotals: Record<number, number>;
  monthlyTotals: Array<{ month: string; s1: number; s2: number; s3: number; s4: number; s5: number; s6: number; total: number }>;
  totalKg: number;
  totalTon: number;
}

const MONTHS_TR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

const emptyForm = {
  scope: '1',
  category: '',
  description: '',
  amountKg: '',
  entryDate: new Date().toISOString().split('T')[0],
};

export default function CarbonPage() {
  const [data, setData] = useState<CarbonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filterScope, setFilterScope] = useState<string>('all');
  const [expandedScope, setExpandedScope] = useState<number | null>(null);

  useEffect(() => { fetchData(); }, [year]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sustainability/carbon-entries?year=${year}`);
      if (res.ok) {
        setData(await res.json());
      } else {
        toast.error('Veriler yüklenemedi');
      }
    } catch {
      toast.error('Bağlantı hatası');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.scope || !form.category || !form.amountKg || !form.entryDate) {
      toast.error('Tüm zorunlu alanları doldurun');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/sustainability/carbon-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope: parseInt(form.scope),
          category: form.category,
          description: form.description || null,
          amountKg: parseFloat(form.amountKg),
          entryDate: form.entryDate,
        }),
      });
      if (res.ok) {
        toast.success('Emisyon kaydı eklendi');
        setShowDialog(false);
        setForm(emptyForm);
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Kaydedilemedi');
      }
    } catch {
      toast.error('Bağlantı hatası');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu kayıt silinecek. Emin misiniz?')) return;
    try {
      const res = await fetch(`/api/sustainability/carbon-entries/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Kayıt silindi');
        fetchData();
      } else {
        toast.error('Silinemedi');
      }
    } catch {
      toast.error('Bağlantı hatası');
    }
  };

  const selectedScopeInfo = SCOPES.find(s => s.scope === parseInt(form.scope));

  const chartData = data?.monthlyTotals.map(m => ({
    ay: MONTHS_TR[parseInt(m.month.split('-')[1]) - 1],
    'Kapsam 1': parseFloat(m.s1.toFixed(1)),
    'Kapsam 2': parseFloat(m.s2.toFixed(1)),
    'Kapsam 3': parseFloat(m.s3.toFixed(1)),
    'Kapsam 4': parseFloat(m.s4.toFixed(1)),
    'Kapsam 5': parseFloat(m.s5.toFixed(1)),
    'Kapsam 6': parseFloat(m.s6.toFixed(1)),
  })) || [];

  const pieData = data
    ? SCOPES
        .map(s => ({ name: s.label, value: parseFloat((data.scopeTotals[s.scope] || 0).toFixed(1)) }))
        .filter(d => d.value > 0)
    : [];

  const filteredEntries = data?.entries.filter(e =>
    filterScope === 'all' ? true : e.scope === parseInt(filterScope)
  ) || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 rounded-lg">
            <Leaf className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Karbon Ayak İzi</h1>
            <p className="text-sm text-gray-500">6 Kapsam Manuel Emisyon Takibi</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Select value={String(year)} onValueChange={v => setYear(parseInt(v))}>
            <SelectTrigger className="w-24 h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026, 2027].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" onClick={fetchData}><RefreshCw className="w-4 h-4" /></Button>
          <Button size="sm" onClick={() => setShowDialog(true)}>
            <Plus className="w-4 h-4 mr-1" />Emisyon Ekle
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <div key={i} className="h-24 bg-gray-200 rounded" />)}
          </div>
        </div>
      ) : (
        <>
          {/* Toplam KPI */}
          <Card className="border-slate-200 bg-gradient-to-br from-slate-50 to-white">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Toplam Karbon Emisyonu ({year})</p>
                  <p className="text-3xl font-bold text-slate-800 mt-1">
                    {data?.totalTon.toFixed(2) ?? '—'} <span className="text-base font-normal text-gray-500">ton CO₂</span>
                  </p>
                  <p className="text-sm text-gray-400 mt-1">{data?.totalKg.toFixed(0) ?? 0} kg toplam</p>
                </div>
                <Leaf className="w-10 h-10 text-slate-300" />
              </div>
            </CardContent>
          </Card>

          {/* 6 Kapsam Kartları */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {SCOPES.map(s => {
              const Icon = s.icon;
              const total = data?.scopeTotals[s.scope] || 0;
              const isExpanded = expandedScope === s.scope;
              return (
                <Card
                  key={s.scope}
                  className={`${s.border} border cursor-pointer hover:shadow-md transition-shadow`}
                  onClick={() => setExpandedScope(isExpanded ? null : s.scope)}
                >
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge style={{ backgroundColor: s.color + '20', color: s.color }} className="text-xs font-medium px-2 py-0">
                            {s.label}
                          </Badge>
                          <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </div>
                        <p className="text-xs font-semibold text-gray-700">{s.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{s.desc}</p>
                      </div>
                      <div className={`p-2 rounded-lg ${s.bg}`}>
                        <Icon className="w-4 h-4" style={{ color: s.color }} />
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xl font-bold" style={{ color: s.color }}>
                        {total >= 1000 ? `${(total / 1000).toFixed(2)} t` : `${total.toFixed(1)} kg`}
                        <span className="text-xs font-normal text-gray-400 ml-1">CO₂</span>
                      </p>
                      <p className="text-xs text-gray-400">
                        {data && data.totalKg > 0
                          ? `Toplam emisyonun %${((total / data.totalKg) * 100).toFixed(1)}`
                          : 'Kayıt yok'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Grafikler */}
          {chartData.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Aylık Emisyon Trendi</CardTitle>
                  <CardDescription>Kapsam bazlı kg CO₂ / ay</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="ay" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      {SCOPES.map(s => (
                        <Bar key={s.scope} dataKey={s.label} stackId="a" fill={s.color} name={s.label} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Kapsam Dağılımı</CardTitle>
                  <CardDescription>Toplam emisyonda pay</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                        {pieData.map((_, i) => <Cell key={i} fill={SCOPE_COLORS[i % SCOPE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => `${v.toFixed(1)} kg CO₂`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Kayıt Tablosu */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Emisyon Kayıtları</CardTitle>
                  <CardDescription>{year} yılı manuel girişler</CardDescription>
                </div>
                <Select value={filterScope} onValueChange={setFilterScope}>
                  <SelectTrigger className="w-36 h-8 text-sm"><SelectValue placeholder="Tüm Kapsamlar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tüm Kapsamlar</SelectItem>
                    {SCOPES.map(s => <SelectItem key={s.scope} value={String(s.scope)}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {filteredEntries.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kod</TableHead>
                      <TableHead>Kapsam</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead>Açıklama</TableHead>
                      <TableHead className="text-right">Miktar (kg CO₂)</TableHead>
                      <TableHead>Tarih</TableHead>
                      <TableHead>Ekleyen</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEntries.map(e => {
                      const scopeInfo = SCOPES.find(s => s.scope === e.scope);
                      return (
                        <TableRow key={e.id}>
                          <TableCell className="font-mono text-xs text-gray-500">{e.code}</TableCell>
                          <TableCell>
                            <Badge style={{ backgroundColor: (scopeInfo?.color || '#6b7280') + '20', color: scopeInfo?.color || '#6b7280' }} className="text-xs">
                              {scopeInfo?.label || `Kapsam ${e.scope}`}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{e.category}</TableCell>
                          <TableCell className="text-sm text-gray-500">{e.description || '—'}</TableCell>
                          <TableCell className="text-right font-semibold text-sm">{e.amountKg.toFixed(2)}</TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {new Date(e.entryDate).toLocaleDateString('tr-TR')}
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">{e.createdBy?.name || '—'}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-600" onClick={() => handleDelete(e.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-10 text-gray-400">
                  <Leaf className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Henüz kayıt yok</p>
                  <Button variant="link" className="text-sm mt-1" onClick={() => setShowDialog(true)}>
                    İlk emisyon kaydını ekle
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Emisyon Ekleme Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Emisyon Kaydı Ekle
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Kapsam <span className="text-red-500">*</span></Label>
              <Select value={form.scope} onValueChange={v => setForm({ ...form, scope: v, category: '' })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCOPES.map(s => (
                    <SelectItem key={s.scope} value={String(s.scope)}>
                      <span className="font-medium">{s.label}</span>
                      <span className="text-gray-500 ml-2">— {s.title}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedScopeInfo && (
                <p className="text-xs text-gray-400 mt-1">{selectedScopeInfo.desc}</p>
              )}
            </div>

            <div>
              <Label>Kategori <span className="text-red-500">*</span></Label>
              <Select
                value={form.category}
                onValueChange={v => setForm({ ...form, category: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Kategori seçin" />
                </SelectTrigger>
                <SelectContent>
                  {(selectedScopeInfo?.categories || []).map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Açıklama</Label>
              <Input
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Opsiyonel açıklama"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Miktar (kg CO₂) <span className="text-red-500">*</span></Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.amountKg}
                  onChange={e => setForm({ ...form, amountKg: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>Tarih <span className="text-red-500">*</span></Label>
                <Input
                  type="date"
                  value={form.entryDate}
                  onChange={e => setForm({ ...form, entryDate: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>İptal</Button>
            <Button
              onClick={handleSave}
              disabled={saving || !form.category || !form.amountKg || !form.entryDate}
            >
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
