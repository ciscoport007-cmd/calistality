'use client';

import { useState, useEffect } from 'react';
import { BarChart3, Download, FileText, Leaf, Zap, Droplets, Trash2, Wind, Calendar, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ReportData {
  energy: {
    monthly: Array<{ month: string; kwh: number; cost: number }>;
    total: number;
    totalCost: number;
  };
  water: {
    monthly: Array<{ month: string; m3: number }>;
    total: number;
  };
  waste: {
    byType: Array<{ type: string; kg: number; recycled: number }>;
    total: number;
    recyclingRate: number;
  };
  carbon: {
    total: number;
    byMonth: Array<{ month: string; kg: number }>;
  };
}

const MONTHS_TR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

const WASTE_TYPE_LABELS: Record<string, string> = {
  ORGANIK: 'Organik', PLASTIK: 'Plastik', CAM: 'Cam', KAGIT: 'Kağıt', TEHLIKELI: 'Tehlikeli', DIGER: 'Diğer',
};

export default function ReportsPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [carbonData, setCarbonData] = useState<any>(null);
  const [dashStats, setDashStats] = useState<any>(null);

  useEffect(() => {
    fetchReportData();
  }, [year]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const [carbonRes, statsRes] = await Promise.all([
        fetch(`/api/sustainability/carbon?year=${year}`),
        fetch('/api/sustainability'),
      ]);
      if (carbonRes.ok) setCarbonData(await carbonRes.json());
      if (statsRes.ok) setDashStats(await statsRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const carbonMonthly = carbonData?.byMonth?.map((m: any) => ({
    ay: MONTHS_TR[parseInt(m.month.split('-')[1]) - 1],
    'CO₂ (kg)': parseFloat(m.total.toFixed(2)),
  })) || [];

  const handleExport = () => {
    const reportContent = `
ENERJİ & ÇEVRE YÖNETİMİ RAPORU
Yıl: ${year}
Tarih: ${new Date().toLocaleDateString('tr-TR')}

ÖZET
=====================================
Enerji Tüketimi: ${dashStats?.energy?.totalKwh?.toFixed(0) || '—'} kWh
Su Tüketimi: ${dashStats?.water?.totalM3?.toFixed(0) || '—'} m³
Atık Miktarı: ${dashStats?.waste?.totalKg?.toFixed(0) || '—'} kg
Geri Dönüşüm: %${dashStats?.waste?.recyclingRate?.toFixed(1) || '—'}
Karbon Emisyonu: ${carbonData?.totalCarbonTon?.toFixed(2) || '—'} ton CO₂

Aktif Hedefler: ${dashStats?.stats?.activeTargets || 0}
Açık Aksiyonlar: ${dashStats?.stats?.openActions || 0}
Aktif Uyarılar: ${dashStats?.stats?.unresolvedAlerts || 0}

KARBON DAĞILIMI (Kaynak Bazlı)
=====================================
${Object.entries(carbonData?.bySource || {}).map(([k, v]: [string, any]) => `${k}: ${v.toFixed(1)} kg CO₂`).join('\n')}
    `.trim();

    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `surdurulebilirlik-raporu-${year}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 rounded-lg">
            <BarChart3 className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Raporlar & Denetim Paneli</h1>
            <p className="text-sm text-gray-500">ESG · Turquality · Green Star · ISO 14001</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Select value={String(year)} onValueChange={v => setYear(parseInt(v))}>
            <SelectTrigger className="w-24 h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026, 2027].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" onClick={fetchReportData}><RefreshCw className="w-4 h-4" /></Button>
          <Button size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-1" />Rapor İndir
          </Button>
        </div>
      </div>

      {/* ESG Summary Card */}
      <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50">
        <CardContent className="py-4">
          <div className="flex items-center gap-3 mb-4">
            <Leaf className="w-5 h-5 text-emerald-600" />
            <div>
              <p className="font-semibold text-emerald-800">ESG Sürdürülebilirlik Özeti — {year}</p>
              <p className="text-xs text-emerald-600">Çevresel Performans Göstergesi</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/60 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-yellow-600" />
                <p className="text-xs text-gray-600 font-medium">Enerji</p>
              </div>
              <p className="text-xl font-bold text-gray-900">
                {dashStats?.energy?.totalKwh ? `${(dashStats.energy.totalKwh / 1000).toFixed(1)} MWh` : '—'}
              </p>
              <p className="text-xs text-gray-500">bu ay</p>
            </div>
            <div className="bg-white/60 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Droplets className="w-4 h-4 text-blue-600" />
                <p className="text-xs text-gray-600 font-medium">Su</p>
              </div>
              <p className="text-xl font-bold text-gray-900">
                {dashStats?.water?.totalM3 ? `${dashStats.water.totalM3.toFixed(0)} m³` : '—'}
              </p>
              <p className="text-xs text-gray-500">bu ay</p>
            </div>
            <div className="bg-white/60 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Trash2 className="w-4 h-4 text-green-600" />
                <p className="text-xs text-gray-600 font-medium">Geri Dönüşüm</p>
              </div>
              <p className="text-xl font-bold text-green-700">
                {dashStats?.waste?.recyclingRate ? `%${dashStats.waste.recyclingRate.toFixed(1)}` : '—'}
              </p>
              <p className="text-xs text-gray-500">oran</p>
            </div>
            <div className="bg-white/60 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Wind className="w-4 h-4 text-slate-600" />
                <p className="text-xs text-gray-600 font-medium">Karbon</p>
              </div>
              <p className="text-xl font-bold text-gray-900">
                {carbonData?.totalCarbonTon ? `${carbonData.totalCarbonTon.toFixed(2)} ton` : '—'}
              </p>
              <p className="text-xs text-gray-500">CO₂ ({year})</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="carbon">
        <TabsList>
          <TabsTrigger value="carbon">Karbon Raporu</TabsTrigger>
          <TabsTrigger value="summary">Özet Tablo</TabsTrigger>
        </TabsList>

        <TabsContent value="carbon" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Aylık CO₂ Emisyon Trendi — {year}</CardTitle>
              <CardDescription>Tüm enerji kaynaklarından hesaplanan toplam emisyon</CardDescription>
            </CardHeader>
            <CardContent>
              {carbonMonthly.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={carbonMonthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="ay" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="CO₂ (kg)" fill="#64748b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <Wind className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>Karbon verisi yok — enerji okumalarını girin</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {carbonData?.bySource && Object.keys(carbonData.bySource).length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Kaynak Bazlı Emisyon Dökümü</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Enerji Kaynağı</TableHead>
                      <TableHead className="text-right">CO₂ (kg)</TableHead>
                      <TableHead className="text-right">CO₂ (ton)</TableHead>
                      <TableHead className="text-right">Pay (%)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(carbonData.bySource as Record<string, number>)
                      .sort((a, b) => b[1] - a[1])
                      .map(([source, kg]) => (
                        <TableRow key={source}>
                          <TableCell className="font-medium">{source}</TableCell>
                          <TableCell className="text-right font-mono">{kg.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-mono">{(kg / 1000).toFixed(4)}</TableCell>
                          <TableCell className="text-right">
                            {carbonData.totalCarbonKg > 0
                              ? `%${((kg / carbonData.totalCarbonKg) * 100).toFixed(1)}`
                              : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    <TableRow className="font-bold bg-gray-50">
                      <TableCell>TOPLAM</TableCell>
                      <TableCell className="text-right font-mono">{carbonData.totalCarbonKg.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono">{carbonData.totalCarbonTon.toFixed(4)}</TableCell>
                      <TableCell className="text-right">%100</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="summary" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Performans Özeti</CardTitle>
              <CardDescription>Tüm sürdürülebilirlik metrikleri özet tablosu</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Metrik</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead className="text-right">Değer</TableHead>
                    <TableHead>Birim</TableHead>
                    <TableHead>Durum</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Enerji Tüketimi</TableCell>
                    <TableCell><Badge className="bg-yellow-100 text-yellow-800 text-xs">Enerji</Badge></TableCell>
                    <TableCell className="text-right font-mono">{dashStats?.energy?.totalKwh?.toFixed(0) || '—'}</TableCell>
                    <TableCell>kWh</TableCell>
                    <TableCell>
                      {dashStats?.energy?.changePercent !== undefined && (
                        <Badge className={dashStats.energy.changePercent <= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {dashStats.energy.changePercent > 0 ? '+' : ''}{dashStats.energy.changePercent.toFixed(1)}%
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Su Tüketimi</TableCell>
                    <TableCell><Badge className="bg-blue-100 text-blue-800 text-xs">Su</Badge></TableCell>
                    <TableCell className="text-right font-mono">{dashStats?.water?.totalM3?.toFixed(0) || '—'}</TableCell>
                    <TableCell>m³</TableCell>
                    <TableCell>
                      {dashStats?.water?.changePercent !== undefined && (
                        <Badge className={dashStats.water.changePercent <= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {dashStats.water.changePercent > 0 ? '+' : ''}{dashStats.water.changePercent.toFixed(1)}%
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Toplam Atık</TableCell>
                    <TableCell><Badge className="bg-green-100 text-green-800 text-xs">Atık</Badge></TableCell>
                    <TableCell className="text-right font-mono">{dashStats?.waste?.totalKg?.toFixed(0) || '—'}</TableCell>
                    <TableCell>kg</TableCell>
                    <TableCell><Badge className="bg-gray-100 text-gray-800 text-xs">Bu ay</Badge></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Geri Dönüşüm Oranı</TableCell>
                    <TableCell><Badge className="bg-green-100 text-green-800 text-xs">Atık</Badge></TableCell>
                    <TableCell className="text-right font-mono">{dashStats?.waste?.recyclingRate?.toFixed(1) || '—'}</TableCell>
                    <TableCell>%</TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${(dashStats?.waste?.recyclingRate || 0) >= 50 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {(dashStats?.waste?.recyclingRate || 0) >= 50 ? 'İyi' : 'Geliştirilmeli'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Karbon Emisyonu</TableCell>
                    <TableCell><Badge className="bg-slate-100 text-slate-800 text-xs">Karbon</Badge></TableCell>
                    <TableCell className="text-right font-mono">{carbonData?.totalCarbonTon?.toFixed(2) || '—'}</TableCell>
                    <TableCell>ton CO₂</TableCell>
                    <TableCell><Badge className="bg-gray-100 text-gray-800 text-xs">{year}</Badge></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
