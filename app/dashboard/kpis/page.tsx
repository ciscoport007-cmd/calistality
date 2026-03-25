'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, BarChart3, Target, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle } from 'lucide-react';
import { ExportButton } from '@/components/ui/export-button';
import { formatDate } from '@/lib/export-utils';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

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

const measurementTypeLabels: Record<string, string> = {
  KPI: 'KPI',
  HEDEF: 'Hedef',
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

export default function KPIsPage() {
  const router = useRouter();
  const [kpis, setKpis] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    measurementType: 'KPI',
    type: 'OPERASYONEL',
    categoryId: '',
    departmentId: '',
    unit: '%',
    formula: '',
    dataSource: '',
    period: 'AYLIK',
    targetValue: '',
    minValue: '',
    maxValue: '',
    warningThreshold: '',
    criticalThreshold: '',
    trendDirection: 'YUKARI_IYI',
    weight: '1',
    ownerId: '',
  });

  useEffect(() => {
    fetchKPIs();
    fetchCategories();
    fetchDepartments();
    fetchUsers();
  }, [search, statusFilter, typeFilter, categoryFilter]);

  const fetchKPIs = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
      if (typeFilter && typeFilter !== 'all') params.append('type', typeFilter);
      if (categoryFilter && categoryFilter !== 'all') params.append('categoryId', categoryFilter);

      const res = await fetch(`/api/kpis?${params}`);
      const data = await res.json();
      setKpis(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('KPI listesi hatası:', error);
      setKpis([]);
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

  const handleCreate = async () => {
    try {
      const res = await fetch('/api/kpis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setIsOpen(false);
        setFormData({
          name: '',
          description: '',
          measurementType: 'KPI',
          type: 'OPERASYONEL',
          categoryId: '',
          departmentId: '',
          unit: '%',
          formula: '',
          dataSource: '',
          period: 'AYLIK',
          targetValue: '',
          minValue: '',
          maxValue: '',
          warningThreshold: '',
          criticalThreshold: '',
          trendDirection: 'YUKARI_IYI',
          weight: '1',
          ownerId: '',
        });
        fetchKPIs();
      }
    } catch (error) {
      console.error('KPI oluşturma hatası:', error);
    }
  };

  const getPerformanceIcon = (kpi: any) => {
    if (!kpi.currentPerformance) return <Minus className="h-4 w-4 text-gray-400" />;
    if (kpi.currentPerformance >= 100) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (kpi.currentPerformance >= 80) return <TrendingUp className="h-4 w-4 text-blue-500" />;
    if (kpi.currentPerformance >= 60) return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    return <TrendingDown className="h-4 w-4 text-red-500" />;
  };

  const getPerformanceColor = (performance: number | null) => {
    if (!performance) return 'text-gray-400';
    if (performance >= 100) return 'text-green-600';
    if (performance >= 80) return 'text-blue-600';
    if (performance >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  // İstatistikler
  const totalKPIs = kpis.length;
  const activeKPIs = kpis.filter(k => k.status === 'AKTIF').length;
  const onTargetKPIs = kpis.filter(k => k.currentPerformance && k.currentPerformance >= 100).length;
  const warningKPIs = kpis.filter(k => k.currentPerformance && k.currentPerformance < 80 && k.currentPerformance >= 60).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Ölçüm Yönetimi (KPI)</h1>
          <p className="text-muted-foreground">Performans göstergeleri ve trend analizi</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Yeni KPI
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Yeni KPI Tanımla</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>İsim *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="KPI veya Hedef adı"
                  />
                </div>
                <div>
                  <Label>Ölçüm Türü *</Label>
                  <Select
                    value={formData.measurementType}
                    onValueChange={(v) => setFormData({ ...formData, measurementType: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(measurementTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tip</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(v) => setFormData({ ...formData, type: v })}
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
                  <Label>Kategori</Label>
                  <Select
                    value={formData.categoryId}
                    onValueChange={(v) => setFormData({ ...formData, categoryId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Departman</Label>
                  <Select
                    value={formData.departmentId}
                    onValueChange={(v) => setFormData({ ...formData, departmentId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Sorumlu</Label>
                  <Select
                    value={formData.ownerId}
                    onValueChange={(v) => setFormData({ ...formData, ownerId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name} {user.surname}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Birim *</Label>
                  <Input
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="%, adet, TL, gün..."
                  />
                </div>
                <div>
                  <Label>Periyot</Label>
                  <Select
                    value={formData.period}
                    onValueChange={(v) => setFormData({ ...formData, period: v })}
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
                  <Label>Hedef Değer *</Label>
                  <Input
                    type="number"
                    value={formData.targetValue}
                    onChange={(e) => setFormData({ ...formData, targetValue: e.target.value })}
                    placeholder="100"
                  />
                </div>
                <div>
                  <Label>Uyarı Eşiği</Label>
                  <Input
                    type="number"
                    value={formData.warningThreshold}
                    onChange={(e) => setFormData({ ...formData, warningThreshold: e.target.value })}
                    placeholder="80"
                  />
                </div>
                <div>
                  <Label>Kritik Eşik</Label>
                  <Input
                    type="number"
                    value={formData.criticalThreshold}
                    onChange={(e) => setFormData({ ...formData, criticalThreshold: e.target.value })}
                    placeholder="60"
                  />
                </div>
                <div>
                  <Label>Trend Yönü</Label>
                  <Select
                    value={formData.trendDirection}
                    onValueChange={(v) => setFormData({ ...formData, trendDirection: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(trendLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label>Açıklama</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="col-span-2">
                  <Label>Formül / Hesaplama Yöntemi</Label>
                  <Textarea
                    value={formData.formula}
                    onChange={(e) => setFormData({ ...formData, formula: e.target.value })}
                    rows={2}
                    placeholder="Örn: (Toplam Satış / Hedef Satış) x 100"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsOpen(false)}>İptal</Button>
                <Button
                  onClick={handleCreate}
                  disabled={!formData.name || !formData.targetValue || !formData.unit}
                >
                  Oluştur
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* İstatistikler */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm text-muted-foreground">Toplam KPI</p>
                <p className="text-2xl font-bold">{totalKPIs}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Target className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm text-muted-foreground">Aktif KPI</p>
                <p className="text-2xl font-bold">{activeKPIs}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-emerald-500" />
              <div className="ml-4">
                <p className="text-sm text-muted-foreground">Hedefte</p>
                <p className="text-2xl font-bold">{onTargetKPIs}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
              <div className="ml-4">
                <p className="text-sm text-muted-foreground">Uyarı</p>
                <p className="text-2xl font-bold">{warningKPIs}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtreler */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="KPI ara..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Durum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü</SelectItem>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Tip" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü</SelectItem>
                {Object.entries(typeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* KPI Listesi */}
      <Card>
        <CardHeader>
          <CardTitle>KPI Listesi</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kod</TableHead>
                <TableHead>İsim</TableHead>
                <TableHead>Tip</TableHead>
                <TableHead>Periyot</TableHead>
                <TableHead>Hedef</TableHead>
                <TableHead>Son Ölçüm</TableHead>
                <TableHead>Performans</TableHead>
                <TableHead>Durum</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {kpis.map((kpi) => (
                <TableRow
                  key={kpi.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/dashboard/kpis/${kpi.id}`)}
                >
                  <TableCell className="font-medium">{kpi.code}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{kpi.name}</p>
                      {kpi.category && (
                        <p className="text-xs text-muted-foreground">{kpi.category.name}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{typeLabels[kpi.type] || kpi.type}</TableCell>
                  <TableCell>{periodLabels[kpi.period] || kpi.period}</TableCell>
                  <TableCell>
                    {kpi.targetValue} {kpi.unit}
                  </TableCell>
                  <TableCell>
                    {kpi.lastMeasurementValue !== null ? (
                      <span>{kpi.lastMeasurementValue} {kpi.unit}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {getPerformanceIcon(kpi)}
                      <span className={getPerformanceColor(kpi.currentPerformance)}>
                        {kpi.currentPerformance ? `%${kpi.currentPerformance.toFixed(1)}` : '-'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[kpi.status]}>
                      {statusLabels[kpi.status] || kpi.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {kpis.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    KPI bulunamadı
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
