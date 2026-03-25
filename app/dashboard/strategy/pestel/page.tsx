'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus,
  Search,
  FileText,
  CheckCircle,
  Clock,
  Archive,
  Globe,
  ArrowRight,
  Building2,
  Calendar,
  Landmark,
  DollarSign,
  Users,
  Cpu,
  Leaf,
  Scale,
  Download,
  FileSpreadsheet,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { exportToExcel, exportToPDF, ExportColumn } from '@/lib/export-utils';

interface PESTELStudy {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: string;
  analysisDate: string;
  period: { id: string; code: string; name: string };
  department: { id: string; name: string } | null;
  createdBy: { id: string; name: string; surname: string | null };
  factors: any[];
  createdAt: string;
}

interface Period {
  id: string;
  code: string;
  name: string;
}

interface Department {
  id: string;
  name: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  TASLAK: { label: 'Taslak', color: 'bg-gray-100 text-gray-800', icon: FileText },
  AKTIF: { label: 'Aktif', color: 'bg-blue-100 text-blue-800', icon: Clock },
  TAMAMLANDI: { label: 'Tamamlandı', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  ARSIV: { label: 'Arşiv', color: 'bg-yellow-100 text-yellow-800', icon: Archive },
};

const categoryConfig: Record<string, { label: string; icon: any; color: string }> = {
  POLITICAL: { label: 'Politik', icon: Landmark, color: 'text-red-600' },
  ECONOMIC: { label: 'Ekonomik', icon: DollarSign, color: 'text-green-600' },
  SOCIAL: { label: 'Sosyal', icon: Users, color: 'text-blue-600' },
  TECHNOLOGICAL: { label: 'Teknolojik', icon: Cpu, color: 'text-purple-600' },
  ENVIRONMENTAL: { label: 'Çevresel', icon: Leaf, color: 'text-emerald-600' },
  LEGAL: { label: 'Yasal', icon: Scale, color: 'text-orange-600' },
};

export default function PESTELStudiesPage() {
  const router = useRouter();
  const [studies, setStudies] = useState<PESTELStudy[]>([]);
  const [stats, setStats] = useState({ total: 0, draft: 0, active: 0, completed: 0 });
  const [periods, setPeriods] = useState<Period[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    periodId: '',
    departmentId: '',
  });

  useEffect(() => {
    fetchData();
    fetchPeriods();
    fetchDepartments();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/pestel-studies');
      const data = await res.json();
      setStudies(data.studies || []);
      setStats(data.stats || { total: 0, draft: 0, active: 0, completed: 0 });
    } catch (error) {
      console.error('Error fetching PESTEL studies:', error);
      toast.error('Veriler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const fetchPeriods = async () => {
    try {
      const res = await fetch('/api/strategy-periods');
      const data = await res.json();
      const periods = data.periods || data;
      setPeriods(Array.isArray(periods) ? periods : []);
    } catch (error) {
      console.error('Error fetching periods:', error);
      setPeriods([]);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/departments');
      const data = await res.json();
      const deptList = data.departments || data;
      setDepartments(Array.isArray(deptList) ? deptList : []);
    } catch (error) {
      console.error('Error fetching departments:', error);
      setDepartments([]);
    }
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.periodId) {
      toast.error('Lütfen gerekli alanları doldurun');
      return;
    }

    setCreating(true);
    try {
      // "all" değerini boş string'e çevir (API tarafında null olarak işlenir)
      const submitData = {
        ...formData,
        departmentId: formData.departmentId === 'all' ? '' : formData.departmentId,
      };
      
      const res = await fetch('/api/pestel-studies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      if (res.ok) {
        const study = await res.json();
        toast.success('PESTEL çalışması oluşturuldu');
        setIsCreateOpen(false);
        setFormData({ name: '', description: '', periodId: '', departmentId: '' });
        router.push(`/dashboard/strategy/pestel/${study.id}`);
      } else {
        toast.error('Oluşturma başarısız');
      }
    } catch (error) {
      console.error('Error creating study:', error);
      toast.error('Sunucu hatası');
    } finally {
      setCreating(false);
    }
  };

  const filteredStudies = studies.filter(study => {
    const matchesSearch = study.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      study.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || study.status === statusFilter;
    const matchesPeriod = periodFilter === 'all' || study.period.id === periodFilter;
    return matchesSearch && matchesStatus && matchesPeriod;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">PESTEL Analizleri</h1>
          <p className="text-muted-foreground">Politik, Ekonomik, Sosyal, Teknolojik, Çevresel ve Yasal faktörler</p>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={filteredStudies.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                Dışa Aktar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => {
                const columns: ExportColumn[] = [
                  { header: 'Kod', key: 'code', width: 15 },
                  { header: 'Ad', key: 'name', width: 40 },
                  { header: 'Dönem', key: 'period', width: 25 },
                  { header: 'Departman', key: 'department', width: 20 },
                  { header: 'Durum', key: 'status', width: 15 },
                  { header: 'P', key: 'political', width: 8 },
                  { header: 'E', key: 'economic', width: 8 },
                  { header: 'S', key: 'social', width: 8 },
                  { header: 'T', key: 'technological', width: 8 },
                  { header: 'E', key: 'environmental', width: 8 },
                  { header: 'L', key: 'legal', width: 8 },
                  { header: 'Tarih', key: 'date', width: 15 },
                ];
                const data = filteredStudies.map(s => ({
                  code: s.code,
                  name: s.name,
                  period: s.period.name,
                  department: s.department?.name || 'Tüm Organizasyon',
                  status: statusConfig[s.status]?.label || s.status,
                  political: s.factors?.filter((f: any) => f.category === 'POLITICAL').length || 0,
                  economic: s.factors?.filter((f: any) => f.category === 'ECONOMIC').length || 0,
                  social: s.factors?.filter((f: any) => f.category === 'SOCIAL').length || 0,
                  technological: s.factors?.filter((f: any) => f.category === 'TECHNOLOGICAL').length || 0,
                  environmental: s.factors?.filter((f: any) => f.category === 'ENVIRONMENTAL').length || 0,
                  legal: s.factors?.filter((f: any) => f.category === 'LEGAL').length || 0,
                  date: new Date(s.analysisDate).toLocaleDateString('tr-TR'),
                }));
                exportToExcel(data, columns, 'PESTEL-Analizleri', 'PESTEL Listesi');
                toast.success('Excel dosyası indirildi');
              }}>
                <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
                Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                const columns: ExportColumn[] = [
                  { header: 'Kod', key: 'code', width: 15 },
                  { header: 'Ad', key: 'name', width: 40 },
                  { header: 'Dönem', key: 'period', width: 25 },
                  { header: 'Durum', key: 'status', width: 15 },
                  { header: 'Faktör Sayısı', key: 'total', width: 15 },
                ];
                const data = filteredStudies.map(s => ({
                  code: s.code,
                  name: s.name,
                  period: s.period.name,
                  status: statusConfig[s.status]?.label || s.status,
                  total: s.factors?.length || 0,
                }));
                exportToPDF(data, columns, 'PESTEL-Analizleri', 'PESTEL Analizleri Listesi');
                toast.success('PDF dosyası indirildi');
              }}>
                <FileText className="h-4 w-4 mr-2 text-red-600" />
                PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Yeni PESTEL Analizi
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Yeni PESTEL Analizi Oluştur</DialogTitle>
              </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>Ad *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="PESTEL analizi adı"
                />
              </div>
              <div>
                <Label>Strateji Dönemi *</Label>
                <Select
                  value={formData.periodId}
                  onValueChange={(value) => setFormData({ ...formData, periodId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Dönem seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {periods.map((period) => (
                      <SelectItem key={period.id} value={period.id}>
                        {period.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Departman (Opsiyonel)</Label>
                <Select
                  value={formData.departmentId}
                  onValueChange={(value) => setFormData({ ...formData, departmentId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tüm organizasyon" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tüm Organizasyon</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Açıklama</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Çalışma açıklaması"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  İptal
                </Button>
                <Button onClick={handleCreate} disabled={creating}>
                  {creating ? 'Oluşturuluyor...' : 'Oluştur'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Toplam</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Globe className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taslak</p>
                <p className="text-2xl font-bold">{stats.draft}</p>
              </div>
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Aktif</p>
                <p className="text-2xl font-bold">{stats.active}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tamamlanan</p>
                <p className="text-2xl font-bold">{stats.completed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Durum" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Durumlar</SelectItem>
            <SelectItem value="TASLAK">Taslak</SelectItem>
            <SelectItem value="AKTIF">Aktif</SelectItem>
            <SelectItem value="TAMAMLANDI">Tamamlandı</SelectItem>
            <SelectItem value="ARSIV">Arşiv</SelectItem>
          </SelectContent>
        </Select>
        <Select value={periodFilter} onValueChange={setPeriodFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Dönem" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Dönemler</SelectItem>
            {periods.map((period) => (
              <SelectItem key={period.id} value={period.id}>
                {period.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Studies Grid */}
      {filteredStudies.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Globe className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Henüz PESTEL analizi bulunmuyor</p>
            <Button className="mt-4" onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              İlk Analizi Oluştur
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredStudies.map((study) => {
            const config = statusConfig[study.status] || statusConfig.TASLAK;
            const StatusIcon = config.icon;
            
            // Kategori dağılımı
            const factors = study.factors || [];
            const categoryDist = Object.entries(categoryConfig).map(([key, val]) => ({
              key,
              ...val,
              count: factors.filter(f => f.category === key).length,
            }));

            return (
              <Card
                key={study.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => router.push(`/dashboard/strategy/pestel/${study.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{study.name}</CardTitle>
                      <CardDescription>{study.code}</CardDescription>
                    </div>
                    <Badge className={config.color}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {config.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {study.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {study.description}
                    </p>
                  )}
                  
                  {/* PESTEL Summary */}
                  <div className="grid grid-cols-6 gap-1">
                    {categoryDist.map((cat) => {
                      const CatIcon = cat.icon;
                      return (
                        <div key={cat.key} className="text-center" title={cat.label}>
                          <CatIcon className={`h-4 w-4 mx-auto ${cat.color}`} />
                          <p className="text-xs font-medium mt-1">{cat.count}</p>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(study.analysisDate).toLocaleDateString('tr-TR')}
                    </div>
                    {study.department && (
                      <div className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {study.department.name}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {factors.length} faktör
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => router.push(`/dashboard/strategy/pestel/${study.id}`)}>
                      Detay <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
