'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  ArrowLeft, Save, Plus, Edit, Target, TrendingUp, TrendingDown, 
  BarChart3, Calendar, User, AlertTriangle, CheckCircle, Minus,
  Activity, Trash2, Pencil, Link2, Flag, Crosshair
} from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
  Bar,
  BarChart,
} from 'recharts';

const typeLabels: Record<string, string> = {
  VERIMLILIK: 'Verimlilik',
  KALITE: 'Kalite',
  MALIYET: 'Maliyet',
  TESLIMAT: 'Teslimat',
  MUSTERI: 'Müşteri',
  CALISANLAR: 'Çalışanlar',
  SUREC: 'Sürec',
  FINANSAL: 'Finansal',
  STRATEJIK: 'Stratejik',
  OPERASYONEL: 'Operasyonel',
};

const statusLabels: Record<string, string> = {
  TASLAK: 'Taslak',
  AKTIF: 'Aktif',
  ASKIDA: 'Askıda',
  PASIF: 'Pasif',
};

const statusColors: Record<string, string> = {
  TASLAK: 'bg-gray-100 text-gray-800',
  AKTIF: 'bg-green-100 text-green-800',
  ASKIDA: 'bg-yellow-100 text-yellow-800',
  PASIF: 'bg-red-100 text-red-800',
};

const periodLabels: Record<string, string> = {
  GUNLUK: 'Günlük',
  HAFTALIK: 'Haftalık',
  AYLIK: 'Aylık',
  UCAYLIK: 'Üç Aylık',
  ALTIAYLIK: 'Altı Aylık',
  YILLIK: 'Yıllık',
};

const trendLabels: Record<string, string> = {
  YUKARI_IYI: 'Yüksek İyi',
  ASAGI_IYI: 'Düşük İyi',
  HEDEF: 'Hedefe Yakın',
};

const measurementStatusColors: Record<string, string> = {
  BASARILI: 'bg-green-100 text-green-800',
  UYARI: 'bg-yellow-100 text-yellow-800',
  KRITIK: 'bg-red-100 text-red-800',
};

export default function KPIDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [kpi, setKPI] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [isMeasurementOpen, setIsMeasurementOpen] = useState(false);
  const [measurementForm, setMeasurementForm] = useState({
    measurementDate: new Date().toISOString().split('T')[0],
    periodStart: '',
    periodEnd: '',
    value: '',
    notes: '',
    dataSource: '',
  });
  const [categories, setCategories] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  
  // Ölçüm Düzenleme/Silme State'leri
  const [editMeasurementOpen, setEditMeasurementOpen] = useState(false);
  const [deleteMeasurementOpen, setDeleteMeasurementOpen] = useState(false);
  const [selectedMeasurement, setSelectedMeasurement] = useState<any>(null);
  const [editMeasurementForm, setEditMeasurementForm] = useState({
    measurementDate: '',
    periodStart: '',
    periodEnd: '',
    value: '',
    notes: '',
    dataSource: '',
  });
  
  // Departman Ağırlıklandırma State'leri
  const [deptWeights, setDeptWeights] = useState<any[]>([]);
  const [totalWeight, setTotalWeight] = useState(0);
  const [weightDialogOpen, setWeightDialogOpen] = useState(false);
  const [weightForm, setWeightForm] = useState({
    departmentId: '',
    weight: '',
    targetValue: '',
    minValue: '',
    maxValue: '',
    scoreFactor: '1',
    notes: '',
  });

  useEffect(() => {
    fetchKPI();
    fetchCategories();
    fetchDepartments();
    fetchUsers();
    fetchDeptWeights();
  }, [id]);

  const fetchKPI = async () => {
    try {
      const res = await fetch(`/api/kpis/${id}`);
      if (res.ok) {
        const data = await res.json();
        setKPI(data);
        setEditData(data);
      }
    } catch (error) {
      console.error('KPI detay hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/kpi-categories');
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Kategori listesi hatası:', error);
      setCategories([]);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/departments');
      const data = await res.json();
      const depts = data.departments || data;
      setDepartments(Array.isArray(depts) ? depts : []);
    } catch (error) {
      console.error('Departman listesi hatası:', error);
      setDepartments([]);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      const users = data.users || data;
      setUsers(Array.isArray(users) ? users : []);
    } catch (error) {
      console.error('Kullanıcı listesi hatası:', error);
      setUsers([]);
    }
  };

  // Departman Ağırlıklandırma Fonksiyonları
  const fetchDeptWeights = async () => {
    try {
      const res = await fetch(`/api/kpis/${id}/department-weights`);
      if (res.ok) {
        const data = await res.json();
        setDeptWeights(data.weights || []);
        setTotalWeight(data.totalWeight || 0);
      }
    } catch (error) {
      console.error('Departman ağırlıkları hatası:', error);
    }
  };

  const handleAddWeight = async () => {
    if (!weightForm.departmentId || !weightForm.weight) return;
    try {
      const res = await fetch(`/api/kpis/${id}/department-weights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          departmentId: weightForm.departmentId,
          weight: parseFloat(weightForm.weight),
          targetValue: weightForm.targetValue ? parseFloat(weightForm.targetValue) : null,
          minValue: weightForm.minValue ? parseFloat(weightForm.minValue) : null,
          maxValue: weightForm.maxValue ? parseFloat(weightForm.maxValue) : null,
          scoreFactor: weightForm.scoreFactor ? parseFloat(weightForm.scoreFactor) : 1,
          notes: weightForm.notes || null,
        }),
      });
      if (res.ok) {
        fetchDeptWeights();
        setWeightDialogOpen(false);
        setWeightForm({ departmentId: '', weight: '', targetValue: '', minValue: '', maxValue: '', scoreFactor: '1', notes: '' });
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (error) {
      console.error('Ağırlık ekleme hatası:', error);
    }
  };

  const handleDeleteWeight = async (weightId: string) => {
    if (!confirm('Bu ağırlığı silmek istediğinize emin misiniz?')) return;
    try {
      const res = await fetch(`/api/kpis/${id}/department-weights?weightId=${weightId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchDeptWeights();
      }
    } catch (error) {
      console.error('Ağırlık silme hatası:', error);
    }
  };

  const handleSave = async () => {
    try {
      const res = await fetch(`/api/kpis/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      });
      if (res.ok) {
        setIsEditing(false);
        fetchKPI();
      }
    } catch (error) {
      console.error('Güncelleme hatası:', error);
    }
  };

  const handleAddMeasurement = async () => {
    try {
      const res = await fetch(`/api/kpis/${id}/measurements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(measurementForm),
      });
      if (res.ok) {
        toast.success('Ölçüm başarıyla eklendi');
        setIsMeasurementOpen(false);
        setMeasurementForm({
          measurementDate: new Date().toISOString().split('T')[0],
          periodStart: '',
          periodEnd: '',
          value: '',
          notes: '',
          dataSource: '',
        });
        fetchKPI();
      }
    } catch (error) {
      console.error('Ölçüm ekleme hatası:', error);
      toast.error('Ölçüm eklenirken hata oluştu');
    }
  };

  const handleOpenEditMeasurement = (measurement: any) => {
    setSelectedMeasurement(measurement);
    setEditMeasurementForm({
      measurementDate: measurement.measurementDate ? new Date(measurement.measurementDate).toISOString().split('T')[0] : '',
      periodStart: measurement.periodStart ? new Date(measurement.periodStart).toISOString().split('T')[0] : '',
      periodEnd: measurement.periodEnd ? new Date(measurement.periodEnd).toISOString().split('T')[0] : '',
      value: measurement.value?.toString() || '',
      notes: measurement.notes || '',
      dataSource: measurement.dataSource || '',
    });
    setEditMeasurementOpen(true);
  };

  const handleUpdateMeasurement = async () => {
    if (!selectedMeasurement) return;
    
    try {
      const res = await fetch(`/api/kpis/${id}/measurements/${selectedMeasurement.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editMeasurementForm),
      });
      
      if (res.ok) {
        toast.success('Ölçüm başarıyla güncellendi');
        setEditMeasurementOpen(false);
        setSelectedMeasurement(null);
        fetchKPI();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Ölçüm güncellenirken hata oluştu');
      }
    } catch (error) {
      console.error('Ölçüm güncelleme hatası:', error);
      toast.error('Ölçüm güncellenirken hata oluştu');
    }
  };

  const handleOpenDeleteMeasurement = (measurement: any) => {
    setSelectedMeasurement(measurement);
    setDeleteMeasurementOpen(true);
  };

  const handleDeleteMeasurement = async () => {
    if (!selectedMeasurement) return;
    
    try {
      const res = await fetch(`/api/kpis/${id}/measurements/${selectedMeasurement.id}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        toast.success('Ölçüm başarıyla silindi');
        setDeleteMeasurementOpen(false);
        setSelectedMeasurement(null);
        fetchKPI();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Ölçüm silinirken hata oluştu');
      }
    } catch (error) {
      console.error('Ölçüm silme hatası:', error);
      toast.error('Ölçüm silinirken hata oluştu');
    }
  };

  const getPerformanceColor = (performance: number | null) => {
    if (!performance) return 'text-gray-400';
    if (performance >= 100) return 'text-green-600';
    if (performance >= 80) return 'text-blue-600';
    if (performance >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Grafik verileri hazırla
  const chartData = kpi?.measurements
    ?.slice()
    .reverse()
    .map((m: any) => ({
      date: format(new Date(m.measurementDate), 'dd MMM', { locale: tr }),
      fullDate: format(new Date(m.measurementDate), 'dd MMMM yyyy', { locale: tr }),
      value: m.value,
      target: m.targetValue || kpi.targetValue,
      performance: m.performance,
    })) || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!kpi) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">KPI bulunamadı</p>
        <Button variant="outline" onClick={() => router.back()} className="mt-4">
          Geri Dön
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold">{kpi.name}</h1>
              <Badge className={statusColors[kpi.status]}>
                {statusLabels[kpi.status]}
              </Badge>
            </div>
            <p className="text-muted-foreground">{kpi.code}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>İptal</Button>
              <Button onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" />
                Kaydet
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Düzenle
            </Button>
          )}
        </div>
      </div>

      {/* Performans Özeti */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Target className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm text-muted-foreground">Hedef</p>
                <p className="text-2xl font-bold">{kpi.targetValue} {kpi.unit}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm text-muted-foreground">Son Ölçüm</p>
                <p className="text-2xl font-bold">
                  {kpi.lastMeasurementValue !== null ? `${kpi.lastMeasurementValue} ${kpi.unit}` : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm text-muted-foreground">Performans (Ortalama)</p>
                {(() => {
                  const measurements = kpi.measurements || [];
                  const validPerfs = measurements.filter((m: any) => m.performance != null).map((m: any) => m.performance);
                  const avgPerf = validPerfs.length > 0 ? validPerfs.reduce((a: number, b: number) => a + b, 0) / validPerfs.length : null;
                  return (
                    <p className={`text-2xl font-bold ${getPerformanceColor(avgPerf)}`}>
                      {avgPerf !== null ? `%${avgPerf.toFixed(1)}` : '-'}
                    </p>
                  );
                })()}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-orange-500" />
              <div className="ml-4">
                <p className="text-sm text-muted-foreground">Ölçüm Sayısı</p>
                <p className="text-2xl font-bold">{kpi.measurements?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="trend" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trend">Trend Analizi</TabsTrigger>
          <TabsTrigger value="measurements">Ölçümler ({kpi.measurements?.length || 0})</TabsTrigger>
          <TabsTrigger value="strategic-goals">Stratejik Hedefler ({(kpi.goalKPIs?.length || 0) + (kpi.subGoalKPIs?.length || 0)})</TabsTrigger>
          <TabsTrigger value="dept-weights">Departman Ağırlıkları ({deptWeights.length})</TabsTrigger>
          <TabsTrigger value="details">Detaylar</TabsTrigger>
        </TabsList>

        {/* Trend Analizi */}
        <TabsContent value="trend">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Trend Grafiği</CardTitle>
                  <CardDescription>
                    {kpi.trendDirection === 'YUKARI_IYI' 
                      ? 'Yükselen değer iyi performansı gösterir' 
                      : kpi.trendDirection === 'ASAGI_IYI' 
                        ? 'Düşen değer iyi performansı gösterir'
                        : 'Hedefe yakın değer iyi performansı gösterir'
                    }
                  </CardDescription>
                </div>
                <Dialog open={isMeasurementOpen} onOpenChange={setIsMeasurementOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Veri Girişi
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Yeni Ölçüm Ekle</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Ölçüm Tarihi *</Label>
                        <Input
                          type="date"
                          value={measurementForm.measurementDate}
                          onChange={(e) => setMeasurementForm({ ...measurementForm, measurementDate: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Dönem Başlangıcı</Label>
                          <Input
                            type="date"
                            value={measurementForm.periodStart}
                            onChange={(e) => setMeasurementForm({ ...measurementForm, periodStart: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Dönem Sonu</Label>
                          <Input
                            type="date"
                            value={measurementForm.periodEnd}
                            onChange={(e) => setMeasurementForm({ ...measurementForm, periodEnd: e.target.value })}
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Değer ({kpi.unit}) *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={measurementForm.value}
                          onChange={(e) => setMeasurementForm({ ...measurementForm, value: e.target.value })}
                          placeholder={`Hedef: ${kpi.targetValue}`}
                        />
                      </div>
                      <div>
                        <Label>Veri Kaynağı</Label>
                        <Input
                          value={measurementForm.dataSource}
                          onChange={(e) => setMeasurementForm({ ...measurementForm, dataSource: e.target.value })}
                          placeholder="Örn: ERP sistemi, manuel sayim..."
                        />
                      </div>
                      <div>
                        <Label>Notlar</Label>
                        <Textarea
                          value={measurementForm.notes}
                          onChange={(e) => setMeasurementForm({ ...measurementForm, notes: e.target.value })}
                          rows={2}
                        />
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setIsMeasurementOpen(false)}>İptal</Button>
                        <Button
                          onClick={handleAddMeasurement}
                          disabled={!measurementForm.value || !measurementForm.measurementDate}
                        >
                          Ekle
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: number, name: string) => [
                          name === 'value' ? `${value} ${kpi.unit}` : `${value} ${kpi.unit}`,
                          name === 'value' ? 'Gerçekleşen' : 'Hedef'
                        ]}
                        labelFormatter={(label) => chartData.find((d: any) => d.date === label)?.fullDate || label}
                      />
                      <Legend />
                      <ReferenceLine y={kpi.targetValue} stroke="#22c55e" strokeDasharray="5 5" label="Hedef" />
                      {kpi.warningThreshold && (
                        <ReferenceLine y={kpi.warningThreshold} stroke="#eab308" strokeDasharray="3 3" />
                      )}
                      {kpi.criticalThreshold && (
                        <ReferenceLine y={kpi.criticalThreshold} stroke="#ef4444" strokeDasharray="3 3" />
                      )}
                      <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#3b82f6" 
                        fill="#3b82f6" 
                        fillOpacity={0.2}
                        name="Gerçekleşen"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mb-4" />
                  <p>Henüz ölçüm verisi yok</p>
                  <p className="text-sm">"Veri Girişi" butonuna tıklayarak ölçüm ekleyin</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Performans Bar Chart */}
          {chartData.length > 0 && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Performans Dağılımı</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis domain={[0, 150]} />
                      <Tooltip 
                        formatter={(value: number) => [`%${value.toFixed(1)}`, 'Performans']}
                      />
                      <ReferenceLine y={100} stroke="#22c55e" strokeDasharray="5 5" />
                      <Bar 
                        dataKey="performance" 
                        fill="#8b5cf6" 
                        name="Performans (%)"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Ölçümler */}
        <TabsContent value="measurements">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Ölçüm Geçmişi</CardTitle>
                <p className="text-sm text-muted-foreground">Yeni ölçüm eklemek için &quot;Trend Analizi&quot; sekmesindeki &quot;Veri Girişi&quot; butonunu kullanın</p>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarih</TableHead>
                    <TableHead>Değer</TableHead>
                    <TableHead>Hedef</TableHead>
                    <TableHead>Performans</TableHead>
                    <TableHead>Sapma</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Giren</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kpi.measurements?.map((m: any) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        {format(new Date(m.measurementDate), 'dd MMM yyyy', { locale: tr })}
                      </TableCell>
                      <TableCell className="font-medium">
                        {m.value} {kpi.unit}
                      </TableCell>
                      <TableCell>
                        {m.targetValue} {kpi.unit}
                      </TableCell>
                      <TableCell className={getPerformanceColor(m.performance)}>
                        %{m.performance?.toFixed(1) || '-'}
                      </TableCell>
                      <TableCell className={m.variance >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {m.variance >= 0 ? '+' : ''}{m.variance?.toFixed(2) || '-'}
                      </TableCell>
                      <TableCell>
                        {m.status && (
                          <Badge className={measurementStatusColors[m.status]}>
                            {m.status === 'BASARILI' ? 'Başarılı' : m.status === 'UYARI' ? 'Uyarı' : 'Kritik'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {m.createdBy?.name} {m.createdBy?.surname}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleOpenEditMeasurement(m)}
                            title="Düzenle"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleOpenDeleteMeasurement(m)}
                            title="Sil"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!kpi.measurements || kpi.measurements.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Henüz ölçüm yok
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stratejik Hedefler */}
        <TabsContent value="strategic-goals">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                Bağlı Stratejik Hedefler
              </CardTitle>
              <CardDescription>
                Bu KPI&apos;ın bağlı olduğu stratejik hedefler ve alt hedefler
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(kpi.goalKPIs?.length === 0 && kpi.subGoalKPIs?.length === 0) ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Bu KPI henüz bir stratejik hedefe bağlanmamış.</p>
                  <p className="text-sm mt-2">Strateji modülünden KPI&apos;yı bir hedefe bağlayabilirsiniz.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Ana Hedefler */}
                  {kpi.goalKPIs?.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Flag className="h-4 w-4 text-purple-500" />
                        Bağlı Ana Hedefler ({kpi.goalKPIs.length})
                      </h4>
                      <div className="space-y-3">
                        {kpi.goalKPIs.map((gk: any) => (
                          <div 
                            key={gk.id} 
                            className="border rounded-lg p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                            onClick={() => router.push(`/dashboard/strategy/${gk.goal?.objective?.period?.id}`)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className="text-xs">{gk.goal?.code}</Badge>
                                  <Badge className={`text-xs ${
                                    gk.goal?.status === 'AKTIF' ? 'bg-green-100 text-green-800' :
                                    gk.goal?.status === 'TAMAMLANDI' ? 'bg-blue-100 text-blue-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {statusLabels[gk.goal?.status] || gk.goal?.status}
                                  </Badge>
                                </div>
                                <p className="font-medium">{gk.goal?.name}</p>
                                <div className="text-sm text-muted-foreground mt-1 space-y-0.5">
                                  <p>Amaç: {gk.goal?.objective?.name}</p>
                                  <p>Dönem: {gk.goal?.objective?.period?.name}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-muted-foreground">Ağırlık</p>
                                <p className="font-semibold">{gk.weight || 1}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Alt Hedefler */}
                  {kpi.subGoalKPIs?.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Crosshair className="h-4 w-4 text-blue-500" />
                        Bağlı Alt Hedefler ({kpi.subGoalKPIs.length})
                      </h4>
                      <div className="space-y-3">
                        {kpi.subGoalKPIs.map((sgk: any) => (
                          <div 
                            key={sgk.id} 
                            className="border rounded-lg p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                            onClick={() => router.push(`/dashboard/strategy/${sgk.subGoal?.goal?.objective?.period?.id}`)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className="text-xs">{sgk.subGoal?.code}</Badge>
                                  <Badge className={`text-xs ${
                                    sgk.subGoal?.status === 'AKTIF' ? 'bg-green-100 text-green-800' :
                                    sgk.subGoal?.status === 'TAMAMLANDI' ? 'bg-blue-100 text-blue-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {statusLabels[sgk.subGoal?.status] || sgk.subGoal?.status}
                                  </Badge>
                                </div>
                                <p className="font-medium">{sgk.subGoal?.name}</p>
                                <div className="text-sm text-muted-foreground mt-1 space-y-0.5">
                                  <p>Ana Hedef: {sgk.subGoal?.goal?.name}</p>
                                  <p>Amaç: {sgk.subGoal?.goal?.objective?.name}</p>
                                  <p>Dönem: {sgk.subGoal?.goal?.objective?.period?.name}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-muted-foreground">Ağırlık</p>
                                <p className="font-semibold">{sgk.weight || 1}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Departman Ağırlıkları */}
        <TabsContent value="dept-weights">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Departman Ağırlıkları</CardTitle>
                  <CardDescription>
                    Bu KPI&apos;ın farklı departmanlara dağıtım oranları. Toplam ağırlık %100&apos;ü geçemez.
                  </CardDescription>
                </div>
                <Dialog open={weightDialogOpen} onOpenChange={setWeightDialogOpen}>
                  <DialogTrigger asChild>
                    <Button disabled={totalWeight >= 100}>
                      <Plus className="w-4 h-4 mr-2" />
                      Departman Ekle
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Departman Ağırlığı Ekle</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label>Departman *</Label>
                        <Select 
                          value={weightForm.departmentId} 
                          onValueChange={(v) => setWeightForm({...weightForm, departmentId: v})}
                        >
                          <SelectTrigger><SelectValue placeholder="Departman seçin" /></SelectTrigger>
                          <SelectContent>
                            {departments.filter(d => !deptWeights.some(w => w.departmentId === d.id)).map((dept) => (
                              <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Ağırlık (%) * <span className="text-xs text-muted-foreground">(Kalan: %{100 - totalWeight})</span></Label>
                        <Input 
                          type="number" 
                          min="0" 
                          max={100 - totalWeight}
                          value={weightForm.weight}
                          onChange={(e) => setWeightForm({...weightForm, weight: e.target.value})}
                          placeholder="Örn: 30"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Özel Hedef Değer</Label>
                          <Input 
                            type="number"
                            value={weightForm.targetValue}
                            onChange={(e) => setWeightForm({...weightForm, targetValue: e.target.value})}
                            placeholder="Opsiyonel"
                          />
                        </div>
                        <div>
                          <Label>Skor Çarpanı</Label>
                          <Input 
                            type="number"
                            step="0.1"
                            value={weightForm.scoreFactor}
                            onChange={(e) => setWeightForm({...weightForm, scoreFactor: e.target.value})}
                            placeholder="1.0"
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Not</Label>
                        <Textarea 
                          value={weightForm.notes}
                          onChange={(e) => setWeightForm({...weightForm, notes: e.target.value})}
                          placeholder="Ağırlıklandırma gerekçesi..."
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setWeightDialogOpen(false)}>İptal</Button>
                      <Button onClick={handleAddWeight} disabled={!weightForm.departmentId || !weightForm.weight}>Ekle</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {/* Özet */}
              <div className="mb-6 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-8">
                  <div>
                    <p className="text-sm text-muted-foreground">Toplam Ağırlık</p>
                    <p className="text-2xl font-bold">{totalWeight}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Kalan</p>
                    <p className="text-2xl font-bold text-green-600">{100 - totalWeight}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Departman Sayısı</p>
                    <p className="text-2xl font-bold">{deptWeights.length}</p>
                  </div>
                </div>
              </div>

              {deptWeights.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Henüz departman ağırlığı tanımlanmamış.</p>
                  <p className="text-sm">Bu KPI&apos;ı farklı departmanlara dağıtmak için &quot;Departman Ekle&quot; butonuna tıklayın.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Departman</TableHead>
                      <TableHead className="text-right">Ağırlık</TableHead>
                      <TableHead className="text-right">Özel Hedef</TableHead>
                      <TableHead className="text-right">Skor Çarpanı</TableHead>
                      <TableHead>Not</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deptWeights.map((w) => (
                      <TableRow key={w.id}>
                        <TableCell className="font-medium">{w.department?.name}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className="font-bold">%{w.weight}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {w.targetValue ? `${w.targetValue} ${kpi.unit}` : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {w.scoreFactor !== 1 ? `×${w.scoreFactor}` : '-'}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                          {w.notes || '-'}
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDeleteWeight(w.id)}
                          >
                            <Edit className="w-4 h-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Detaylar */}
        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>KPI Detayları</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>İsim</Label>
                    <Input
                      value={editData.name || ''}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Tip</Label>
                    <Select
                      value={editData.type || ''}
                      onValueChange={(v) => setEditData({ ...editData, type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(typeLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Durum</Label>
                    <Select
                      value={editData.status || ''}
                      onValueChange={(v) => setEditData({ ...editData, status: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(statusLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Birim</Label>
                    <Input
                      value={editData.unit || ''}
                      onChange={(e) => setEditData({ ...editData, unit: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Periyot</Label>
                    <Select
                      value={editData.period || ''}
                      onValueChange={(v) => setEditData({ ...editData, period: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(periodLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Hedef Değer</Label>
                    <Input
                      type="number"
                      value={editData.targetValue || ''}
                      onChange={(e) => setEditData({ ...editData, targetValue: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Uyarı Eşiği</Label>
                    <Input
                      type="number"
                      value={editData.warningThreshold || ''}
                      onChange={(e) => setEditData({ ...editData, warningThreshold: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Kritik Eşik</Label>
                    <Input
                      type="number"
                      value={editData.criticalThreshold || ''}
                      onChange={(e) => setEditData({ ...editData, criticalThreshold: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Açıklama</Label>
                    <Textarea
                      value={editData.description || ''}
                      onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Formül</Label>
                    <Textarea
                      value={editData.formula || ''}
                      onChange={(e) => setEditData({ ...editData, formula: e.target.value })}
                      rows={2}
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-muted-foreground">Tip</p>
                    <p className="font-medium">{typeLabels[kpi.type] || kpi.type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Kategori</p>
                    <p className="font-medium">{kpi.category?.name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Departman</p>
                    <p className="font-medium">{kpi.department?.name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Sorumlu</p>
                    <p className="font-medium">
                      {kpi.owner ? `${kpi.owner.name} ${kpi.owner.surname}` : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Birim</p>
                    <p className="font-medium">{kpi.unit}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Periyot</p>
                    <p className="font-medium">{periodLabels[kpi.period] || kpi.period}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Hedef Değer</p>
                    <p className="font-medium">{kpi.targetValue} {kpi.unit}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Trend Yönü</p>
                    <p className="font-medium">{trendLabels[kpi.trendDirection] || kpi.trendDirection}</p>
                  </div>
                  {kpi.warningThreshold && (
                    <div>
                      <p className="text-sm text-muted-foreground">Uyarı Eşiği</p>
                      <p className="font-medium text-yellow-600">{kpi.warningThreshold} {kpi.unit}</p>
                    </div>
                  )}
                  {kpi.criticalThreshold && (
                    <div>
                      <p className="text-sm text-muted-foreground">Kritik Eşik</p>
                      <p className="font-medium text-red-600">{kpi.criticalThreshold} {kpi.unit}</p>
                    </div>
                  )}
                  {kpi.description && (
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">Açıklama</p>
                      <p className="font-medium">{kpi.description}</p>
                    </div>
                  )}
                  {kpi.formula && (
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">Formül</p>
                      <p className="font-medium bg-muted p-2 rounded">{kpi.formula}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Oluşturulma</p>
                    <p className="font-medium">
                      {format(new Date(kpi.createdAt), 'dd MMM yyyy', { locale: tr })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Oluşturan</p>
                    <p className="font-medium">
                      {kpi.createdBy?.name} {kpi.createdBy?.surname}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Ölçüm Düzenleme Dialog */}
      <Dialog open={editMeasurementOpen} onOpenChange={setEditMeasurementOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ölçümü Düzenle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Ölçüm Tarihi *</Label>
              <Input
                type="date"
                value={editMeasurementForm.measurementDate}
                onChange={(e) => setEditMeasurementForm({ ...editMeasurementForm, measurementDate: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Dönem Başlangıcı</Label>
                <Input
                  type="date"
                  value={editMeasurementForm.periodStart}
                  onChange={(e) => setEditMeasurementForm({ ...editMeasurementForm, periodStart: e.target.value })}
                />
              </div>
              <div>
                <Label>Dönem Bitişi</Label>
                <Input
                  type="date"
                  value={editMeasurementForm.periodEnd}
                  onChange={(e) => setEditMeasurementForm({ ...editMeasurementForm, periodEnd: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Değer * ({kpi?.unit || 'birim'})</Label>
              <Input
                type="number"
                step="0.01"
                value={editMeasurementForm.value}
                onChange={(e) => setEditMeasurementForm({ ...editMeasurementForm, value: e.target.value })}
              />
            </div>
            <div>
              <Label>Veri Kaynağı</Label>
              <Input
                value={editMeasurementForm.dataSource}
                onChange={(e) => setEditMeasurementForm({ ...editMeasurementForm, dataSource: e.target.value })}
                placeholder="Veri kaynağını belirtin..."
              />
            </div>
            <div>
              <Label>Notlar</Label>
              <Textarea
                value={editMeasurementForm.notes}
                onChange={(e) => setEditMeasurementForm({ ...editMeasurementForm, notes: e.target.value })}
                placeholder="Ölçümle ilgili notlar..."
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setEditMeasurementOpen(false)}>
                İptal
              </Button>
              <Button onClick={handleUpdateMeasurement} disabled={!editMeasurementForm.value || !editMeasurementForm.measurementDate}>
                Güncelle
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ölçüm Silme Onay Dialog */}
      <AlertDialog open={deleteMeasurementOpen} onOpenChange={setDeleteMeasurementOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ölçümü Sil</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedMeasurement && (
                <>
                  <strong>{format(new Date(selectedMeasurement.measurementDate), 'dd MMMM yyyy', { locale: tr })}</strong> tarihli,{' '}
                  <strong>{selectedMeasurement.value} {kpi?.unit}</strong> değerindeki ölçümü silmek istediğinizden emin misiniz?
                  <br /><br />
                  Bu işlem geri alınamaz ve KPI&apos;ın performans geçmişini etkileyecektir.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMeasurement} className="bg-red-600 hover:bg-red-700">
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
