'use client';

import { useState, useEffect } from 'react';
import {
  Droplets,
  Plus,
  BarChart3,
  AlertTriangle,
  Settings,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { toast } from 'sonner';

interface Meter {
  id: string;
  code: string;
  name: string;
  type: string;
  category: string;
  level: string;
  location: string;
  unit: string;
  parentId: string | null;
  parent: { id: string; name: string; code: string } | null;
  _count: { readings: number };
}

interface Reading {
  id: string;
  meterId: string;
  readingDate: string;
  period: string;
  value: number;
  cost: number | null;
  occupancyRate: number | null;
  guestCount: number | null;
  notes: string | null;
  isAnomalous: boolean;
  createdBy: { id: string; name: string; surname: string | null };
  createdAt: string;
}

const PERIOD_LABELS: Record<string, string> = {
  GUNLUK: 'Günlük',
  HAFTALIK: 'Haftalık',
  AYLIK: 'Aylık',
};

export default function WaterPage() {
  const [meters, setMeters] = useState<Meter[]>([]);
  const [selectedMeter, setSelectedMeter] = useState<Meter | null>(null);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(true);
  const [readingsLoading, setReadingsLoading] = useState(false);
  const [showMeterDialog, setShowMeterDialog] = useState(false);
  const [showReadingDialog, setShowReadingDialog] = useState(false);

  const [meterForm, setMeterForm] = useState({
    name: '',
    level: 'ALT',
    location: '',
    unit: 'm3',
    parentId: '',
    notes: '',
  });

  const [readingForm, setReadingForm] = useState({
    readingDate: new Date().toISOString().split('T')[0],
    period: 'GUNLUK',
    value: '',
    cost: '',
    occupancyRate: '',
    guestCount: '',
    notes: '',
  });

  useEffect(() => {
    fetchMeters();
  }, []);

  useEffect(() => {
    if (selectedMeter) {
      fetchReadings(selectedMeter.id);
    }
  }, [selectedMeter]);

  const fetchMeters = async () => {
    try {
      const res = await fetch('/api/sustainability/meters?category=SU');
      if (res.ok) {
        const data = await res.json();
        setMeters(data.meters || []);
        if (data.meters?.length > 0 && !selectedMeter) {
          setSelectedMeter(data.meters[0]);
        }
      }
    } catch (error) {
      console.error('Sayaçlar yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReadings = async (meterId: string) => {
    setReadingsLoading(true);
    try {
      const res = await fetch(`/api/sustainability/meters/${meterId}/readings?limit=30`);
      if (res.ok) {
        const data = await res.json();
        setReadings(data.readings || []);
      }
    } catch (error) {
      console.error('Okumalar yüklenemedi:', error);
    } finally {
      setReadingsLoading(false);
    }
  };

  const handleCreateMeter = async () => {
    try {
      const res = await fetch('/api/sustainability/meters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...meterForm, type: 'SU', category: 'SU' }),
      });
      if (res.ok) {
        toast.success('Sayaç oluşturuldu');
        setShowMeterDialog(false);
        setMeterForm({ name: '', level: 'ALT', location: '', unit: 'm3', parentId: '', notes: '' });
        fetchMeters();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Hata oluştu');
      }
    } catch (error) {
      toast.error('Sayaç oluşturulamadı');
    }
  };

  const handleAddReading = async () => {
    if (!selectedMeter) return;
    try {
      const res = await fetch(`/api/sustainability/meters/${selectedMeter.id}/readings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(readingForm),
      });
      if (res.ok) {
        toast.success('Okuma kaydedildi');
        setShowReadingDialog(false);
        setReadingForm({
          readingDate: new Date().toISOString().split('T')[0],
          period: 'GUNLUK',
          value: '',
          cost: '',
          occupancyRate: '',
          guestCount: '',
          notes: '',
        });
        fetchReadings(selectedMeter.id);
      } else {
        const err = await res.json();
        toast.error(err.error || 'Hata oluştu');
      }
    } catch (error) {
      toast.error('Okuma kaydedilemedi');
    }
  };

  // Prepare chart data (last 14 readings, oldest first)
  const chartData = readings
    .slice(0, 14)
    .reverse()
    .map(r => ({
      date: new Date(r.readingDate).toLocaleDateString('tr-TR', { month: 'short', day: 'numeric' }),
      tüketim: r.value,
    }));

  const totalConsumption = readings.reduce((s, r) => s + r.value, 0);
  const leakCount = readings.filter(r => r.isAnomalous).length;
  const avgDailyConsumption = readings.length > 0 ? totalConsumption / readings.length : 0;

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="animate-pulse h-8 bg-gray-200 rounded w-48" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-gray-200 rounded" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Droplets className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Su Tüketim Yönetimi</h1>
            <p className="text-sm text-gray-500">Su sayaçları · Kaçak tespiti · Tüketim takibi</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowMeterDialog(true)}>
            <Settings className="w-4 h-4 mr-1" />
            Sayaç Ekle
          </Button>
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => setShowReadingDialog(true)}
            disabled={!selectedMeter}
          >
            <Plus className="w-4 h-4 mr-1" />
            Okuma Gir
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Meter List */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Sayaçlar</h3>
          {meters.length === 0 ? (
            <Card className="p-4 text-center text-gray-400 text-sm">
              <p>Sayaç bulunamadı</p>
              <Button variant="link" size="sm" onClick={() => setShowMeterDialog(true)}>
                Sayaç ekle
              </Button>
            </Card>
          ) : (
            meters.map(meter => (
              <Card
                key={meter.id}
                className={`cursor-pointer transition-all ${
                  selectedMeter?.id === meter.id
                    ? 'ring-2 ring-blue-400 bg-blue-50'
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => setSelectedMeter(meter)}
              >
                <CardContent className="py-3 px-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Droplets className="w-4 h-4 text-blue-400" />
                      <div>
                        <p className="text-sm font-medium truncate max-w-[120px]">{meter.name}</p>
                        <p className="text-xs text-gray-400">{meter.location}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge className="text-xs bg-blue-100 text-blue-800">Su</Badge>
                      {meter.level === 'ANA' && (
                        <Badge variant="outline" className="text-xs">Ana</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Right: Stats + Chart + Table */}
        <div className="md:col-span-3 space-y-4">
          {selectedMeter ? (
            <>
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <Card>
                  <CardContent className="py-3">
                    <p className="text-xs text-gray-500">Toplam Tüketim</p>
                    <p className="text-lg font-bold text-blue-700">
                      {totalConsumption.toFixed(1)} {selectedMeter.unit}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="py-3">
                    <p className="text-xs text-gray-500">Ortalama Günlük</p>
                    <p className="text-lg font-bold text-blue-700">
                      {avgDailyConsumption.toFixed(1)} {selectedMeter.unit}
                    </p>
                  </CardContent>
                </Card>
                <Card className={leakCount > 0 ? 'border-red-200 bg-red-50' : ''}>
                  <CardContent className="py-3">
                    <p className="text-xs text-gray-500">Kaçak Uyarısı</p>
                    <p className={`text-lg font-bold ${leakCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {leakCount} uyarı
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Chart */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{selectedMeter.name} - Tüketim Grafiği</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => fetchReadings(selectedMeter.id)}>
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Area
                          type="monotone"
                          dataKey="tüketim"
                          stroke="#3b82f6"
                          fill="url(#waterGrad)"
                          strokeWidth={2}
                          name={`Tüketim (${selectedMeter.unit})`}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[220px] flex items-center justify-center text-gray-400">
                      Henüz okuma kaydı yok
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Readings Table */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Son Okumalar</CardTitle>
                </CardHeader>
                <CardContent>
                  {readingsLoading ? (
                    <div className="text-center py-4 text-gray-400">Yükleniyor...</div>
                  ) : readings.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>Henüz okuma kaydı yok</p>
                      <Button variant="link" onClick={() => setShowReadingDialog(true)}>
                        İlk okumayı ekle
                      </Button>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tarih</TableHead>
                          <TableHead>Dönem</TableHead>
                          <TableHead className="text-right">Tüketim</TableHead>
                          <TableHead className="text-right">Maliyet</TableHead>
                          <TableHead className="text-right">Doluluk %</TableHead>
                          <TableHead>Durum</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {readings.map(reading => (
                          <TableRow key={reading.id} className={reading.isAnomalous ? 'bg-red-50' : ''}>
                            <TableCell className="text-sm">
                              {new Date(reading.readingDate).toLocaleDateString('tr-TR')}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {PERIOD_LABELS[reading.period] || reading.period}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {reading.value.toFixed(2)} {selectedMeter.unit}
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {reading.cost ? `₺${reading.cost.toFixed(2)}` : '-'}
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {reading.occupancyRate ? `%${reading.occupancyRate.toFixed(1)}` : '-'}
                            </TableCell>
                            <TableCell>
                              {reading.isAnomalous ? (
                                <Badge className="bg-red-100 text-red-800 text-xs">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  Kaçak Şüphesi
                                </Badge>
                              ) : (
                                <Badge className="bg-green-100 text-green-800 text-xs">Normal</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="h-full min-h-[400px] flex items-center justify-center">
              <div className="text-center text-gray-400">
                <Droplets className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Sol taraftan bir sayaç seçin</p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Create Meter Dialog */}
      <Dialog open={showMeterDialog} onOpenChange={setShowMeterDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Yeni Su Sayacı Ekle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Sayaç Adı *</Label>
              <Input
                value={meterForm.name}
                onChange={e => setMeterForm({ ...meterForm, name: e.target.value })}
                placeholder="Ör: Ana Su Sayacı"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Seviye</Label>
                <Select
                  value={meterForm.level}
                  onValueChange={v => setMeterForm({ ...meterForm, level: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ANA">Ana Sayaç</SelectItem>
                    <SelectItem value="ALT">Alt Sayaç</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Birim</Label>
                <Select
                  value={meterForm.unit}
                  onValueChange={v => setMeterForm({ ...meterForm, unit: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="m3">m³</SelectItem>
                    <SelectItem value="litre">Litre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Konum *</Label>
              <Input
                value={meterForm.location}
                onChange={e => setMeterForm({ ...meterForm, location: e.target.value })}
                placeholder="Ör: Mutfak, Havuz, Bahçe..."
              />
            </div>
            <div>
              <Label>Üst Sayaç</Label>
              <Select
                value={meterForm.parentId}
                onValueChange={v => setMeterForm({ ...meterForm, parentId: v })}
              >
                <SelectTrigger><SelectValue placeholder="Seç (opsiyonel)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Yok</SelectItem>
                  {meters.filter(m => m.level === 'ANA').map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notlar</Label>
              <Input
                value={meterForm.notes}
                onChange={e => setMeterForm({ ...meterForm, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMeterDialog(false)}>İptal</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleCreateMeter}>
              Oluştur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Reading Dialog */}
      <Dialog open={showReadingDialog} onOpenChange={setShowReadingDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Okuma Gir — {selectedMeter?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tarih *</Label>
                <Input
                  type="date"
                  value={readingForm.readingDate}
                  onChange={e => setReadingForm({ ...readingForm, readingDate: e.target.value })}
                />
              </div>
              <div>
                <Label>Dönem</Label>
                <Select
                  value={readingForm.period}
                  onValueChange={v => setReadingForm({ ...readingForm, period: v })}
                >
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
                <Label>Tüketim ({selectedMeter?.unit}) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={readingForm.value}
                  onChange={e => setReadingForm({ ...readingForm, value: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>Maliyet (₺)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={readingForm.cost}
                  onChange={e => setReadingForm({ ...readingForm, cost: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Doluluk Oranı (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  max="100"
                  value={readingForm.occupancyRate}
                  onChange={e => setReadingForm({ ...readingForm, occupancyRate: e.target.value })}
                  placeholder="0-100"
                />
              </div>
              <div>
                <Label>Misafir Sayısı</Label>
                <Input
                  type="number"
                  value={readingForm.guestCount}
                  onChange={e => setReadingForm({ ...readingForm, guestCount: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>
            <div>
              <Label>Notlar</Label>
              <Input
                value={readingForm.notes}
                onChange={e => setReadingForm({ ...readingForm, notes: e.target.value })}
                placeholder="Opsiyonel not..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReadingDialog(false)}>İptal</Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={handleAddReading}
              disabled={!readingForm.value}
            >
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
