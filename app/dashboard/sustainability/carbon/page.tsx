'use client';

import { useState, useEffect } from 'react';
import { Wind, Settings, RefreshCw, TrendingDown, TrendingUp, Leaf, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area } from 'recharts';
import { toast } from 'sonner';

interface CarbonData {
  totalCarbonKg: number;
  totalCarbonTon: number;
  bySource: Record<string, number>;
  byMonth: Array<{ month: string; elektrik: number; dogalgaz: number; lpg: number; jenerator: number; su: number; total: number }>;
  kpis: {
    co2PerGuest: number;
    emissionFactors: Array<{ id: string; sourceType: string; factor: number; unit: string; year: number; source: string | null }>;
  };
}

const SOURCE_LABELS: Record<string, string> = {
  ELEKTRIK: 'Elektrik',
  DOGALGAZ: 'Doğalgaz',
  LPG: 'LPG',
  JENERATOR: 'Jeneratör',
  SU: 'Su',
};

const SOURCE_COLORS: Record<string, string> = {
  ELEKTRIK: '#eab308',
  DOGALGAZ: '#f97316',
  LPG: '#ef4444',
  JENERATOR: '#6b7280',
  SU: '#3b82f6',
};

const PIE_COLORS = ['#eab308', '#f97316', '#ef4444', '#6b7280', '#3b82f6'];

export default function CarbonPage() {
  const [data, setData] = useState<CarbonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [showFactorDialog, setShowFactorDialog] = useState(false);
  const [factorForm, setFactorForm] = useState({ sourceType: 'ELEKTRIK', factor: '', unit: 'kg CO2/kWh', year: String(new Date().getFullYear()), source: 'IPCC' });

  useEffect(() => {
    fetchData();
  }, [year]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sustainability/carbon?year=${year}`);
      if (res.ok) setData(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFactor = async () => {
    try {
      const res = await fetch('/api/sustainability/emission-factors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(factorForm),
      });
      if (res.ok) {
        toast.success('Emisyon faktörü güncellendi');
        setShowFactorDialog(false);
        fetchData();
      } else {
        toast.error('Hata oluştu');
      }
    } catch (e) {
      toast.error('Kaydedilemedi');
    }
  };

  const pieData = data
    ? Object.entries(data.bySource)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => ({ name: SOURCE_LABELS[k] || k, value: v }))
    : [];

  const chartData = data?.byMonth.map(m => ({
    ay: m.month.split('-')[1] + '/' + m.month.split('-')[0].slice(2),
    total: parseFloat(m.total.toFixed(2)),
    elektrik: parseFloat(m.elektrik.toFixed(2)),
    dogalgaz: parseFloat(m.dogalgaz.toFixed(2)),
    lpg: parseFloat(m.lpg.toFixed(2)),
    jenerator: parseFloat(m.jenerator.toFixed(2)),
  })) || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 rounded-lg">
            <Wind className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Karbon Ayak İzi</h1>
            <p className="text-sm text-gray-500">CO₂ Emisyon Hesaplama ve Raporlama</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Select value={String(year)} onValueChange={v => setYear(parseInt(v))}>
            <SelectTrigger className="w-24 h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026, 2027].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => setShowFactorDialog(true)}>
            <Settings className="w-4 h-4 mr-1" />Emisyon Faktörleri
          </Button>
          <Button variant="ghost" size="sm" onClick={fetchData}><RefreshCw className="w-4 h-4" /></Button>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-gray-200 rounded" />)}
          </div>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="md:col-span-2 border-slate-200 bg-gradient-to-br from-slate-50 to-white">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Toplam Karbon Emisyonu ({year})</p>
                    <p className="text-3xl font-bold text-slate-800 mt-1">
                      {data?.totalCarbonTon.toFixed(2)} <span className="text-base font-normal text-gray-500">ton CO₂</span>
                    </p>
                    <p className="text-sm text-gray-500 mt-1">{data?.totalCarbonKg.toFixed(0)} kg</p>
                  </div>
                  <div className="p-3 bg-slate-100 rounded-xl">
                    <Leaf className="w-7 h-7 text-slate-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide">CO₂ / Misafir</p>
                <p className="text-2xl font-bold">{data?.kpis.co2PerGuest.toFixed(2) || '—'}</p>
                <p className="text-xs text-gray-400 mt-1">kg CO₂ / misafir</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide">En Yüksek Kaynak</p>
                {data && Object.keys(data.bySource).length > 0 ? (
                  <>
                    <p className="text-xl font-bold mt-1">
                      {SOURCE_LABELS[Object.entries(data.bySource).sort((a, b) => b[1] - a[1])[0][0]] || '—'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {Object.entries(data.bySource).sort((a, b) => b[1] - a[1])[0][1].toFixed(1)} kg CO₂
                    </p>
                  </>
                ) : (
                  <p className="text-xl font-bold mt-1">—</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Aylık Karbon Trendi</CardTitle>
                <CardDescription>kg CO₂ / ay</CardDescription>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="carbonGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#64748b" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#64748b" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="ay" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Area type="monotone" dataKey="total" stroke="#64748b" fill="url(#carbonGrad)" strokeWidth={2} name="Toplam CO₂ (kg)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">Veri yok — önce enerji okumaları girin</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Kaynak Bazlı Dağılım</CardTitle>
                <CardDescription>Toplam emisyonda pay</CardDescription>
              </CardHeader>
              <CardContent>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                        {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => `${v.toFixed(1)} kg CO₂`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">Veri yok</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Emission Factors Table */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Emisyon Faktörleri</CardTitle>
                  <CardDescription>Tüketim birimi başına CO₂ katsayıları</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowFactorDialog(true)}>
                  <Settings className="w-4 h-4 mr-1" />Düzenle
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {data?.kpis.emissionFactors && data.kpis.emissionFactors.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kaynak</TableHead>
                      <TableHead className="text-right">Faktör</TableHead>
                      <TableHead>Birim</TableHead>
                      <TableHead>Yıl</TableHead>
                      <TableHead>Kaynak</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.kpis.emissionFactors.map(f => (
                      <TableRow key={f.id}>
                        <TableCell>
                          <Badge style={{ backgroundColor: SOURCE_COLORS[f.sourceType] + '20', color: SOURCE_COLORS[f.sourceType] }} className="text-xs font-medium">
                            {SOURCE_LABELS[f.sourceType] || f.sourceType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">{f.factor}</TableCell>
                        <TableCell className="text-sm text-gray-500">{f.unit}</TableCell>
                        <TableCell className="text-sm">{f.year}</TableCell>
                        <TableCell className="text-sm text-gray-500">{f.source || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Emisyon faktörü tanımlı değil</p>
                  <Button variant="link" onClick={() => setShowFactorDialog(true)}>Faktör Ekle</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Factor Dialog */}
      <Dialog open={showFactorDialog} onOpenChange={setShowFactorDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Emisyon Faktörü Tanımla</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Kaynak Türü</Label>
              <Select value={factorForm.sourceType} onValueChange={v => setFactorForm({ ...factorForm, sourceType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SOURCE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Faktör (kg CO₂)</Label>
                <Input type="number" step="0.0001" value={factorForm.factor} onChange={e => setFactorForm({ ...factorForm, factor: e.target.value })} placeholder="0.0" />
              </div>
              <div>
                <Label>Birim</Label>
                <Input value={factorForm.unit} onChange={e => setFactorForm({ ...factorForm, unit: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Yıl</Label>
                <Input value={factorForm.year} onChange={e => setFactorForm({ ...factorForm, year: e.target.value })} />
              </div>
              <div>
                <Label>Referans</Label>
                <Input value={factorForm.source} onChange={e => setFactorForm({ ...factorForm, source: e.target.value })} placeholder="IPCC, DEFRA..." />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFactorDialog(false)}>İptal</Button>
            <Button onClick={handleSaveFactor} disabled={!factorForm.factor}>Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
