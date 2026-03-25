'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Plus,
  Search,
  Target,
  Calendar,
  Eye,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertCircle,
  Grid3X3,
  Globe,
  ArrowRight,
  Copy,
  Download,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'sonner';
import { exportToExcel, exportToPDF, ExportColumn } from '@/lib/export-utils';

const statusLabels: Record<string, { label: string; color: string }> = {
  TASLAK: { label: 'Taslak', color: 'bg-gray-500' },
  AKTIF: { label: 'Aktif', color: 'bg-green-500' },
  KAPALI: { label: 'Kapalı', color: 'bg-blue-500' },
  ARSIV: { label: 'Arşiv', color: 'bg-purple-500' },
};

export default function StrategyPage() {
  const router = useRouter();
  const [periods, setPeriods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    missionContent: '',
    visionContent: '',
    visionTargetYear: '',
  });
  const [creating, setCreating] = useState(false);
  
  // Copy dialog state
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [selectedPeriodForCopy, setSelectedPeriodForCopy] = useState<any>(null);
  const [copyFormData, setCopyFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
    copyActions: true,
    copyKPILinks: false,
    copyRiskLinks: false,
  });
  const [copying, setCopying] = useState(false);

  useEffect(() => {
    fetchPeriods();
  }, [statusFilter]);

  const fetchPeriods = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      
      const res = await fetch(`/api/strategy-periods?${params}`);
      if (res.ok) {
        const data = await res.json();
        setPeriods(data);
      }
    } catch (error) {
      console.error('Error fetching periods:', error);
      toast.error('Dönemler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.startDate || !formData.endDate) {
      toast.error('Lütfen zorunlu alanları doldurun');
      return;
    }

    try {
      setCreating(true);
      const res = await fetch('/api/strategy-periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const newPeriod = await res.json();
        toast.success('Strateji dönemi oluşturuldu');
        setDialogOpen(false);
        setFormData({
          name: '',
          description: '',
          startDate: '',
          endDate: '',
          missionContent: '',
          visionContent: '',
          visionTargetYear: '',
        });
        router.push(`/dashboard/strategy/${newPeriod.id}`);
      } else {
        const error = await res.json();
        toast.error(error.error || 'Oluşturma başarısız');
      }
    } catch (error) {
      console.error('Error creating period:', error);
      toast.error('Bir hata oluştu');
    } finally {
      setCreating(false);
    }
  };

  const openCopyDialog = (period: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPeriodForCopy(period);
    // Calculate default dates: next year from source period end
    const sourceEndDate = new Date(period.endDate);
    const sourceDuration = new Date(period.endDate).getTime() - new Date(period.startDate).getTime();
    const newStartDate = new Date(sourceEndDate);
    newStartDate.setDate(newStartDate.getDate() + 1);
    const newEndDate = new Date(newStartDate.getTime() + sourceDuration);
    
    setCopyFormData({
      name: `${period.name} (Kopya)`,
      startDate: newStartDate.toISOString().split('T')[0],
      endDate: newEndDate.toISOString().split('T')[0],
      copyActions: true,
      copyKPILinks: false,
      copyRiskLinks: false,
    });
    setCopyDialogOpen(true);
  };

  const handleCopy = async () => {
    if (!copyFormData.name || !copyFormData.startDate || !copyFormData.endDate) {
      toast.error('Lütfen zorunlu alanları doldurun');
      return;
    }

    try {
      setCopying(true);
      const res = await fetch(`/api/strategy-periods/${selectedPeriodForCopy.id}/copy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(copyFormData),
      });

      if (res.ok) {
        const newPeriod = await res.json();
        toast.success(newPeriod.message || 'Dönem başarıyla kopyalandı');
        setCopyDialogOpen(false);
        setSelectedPeriodForCopy(null);
        router.push(`/dashboard/strategy/${newPeriod.id}`);
      } else {
        const error = await res.json();
        toast.error(error.error || 'Kopyalama başarısız');
      }
    } catch (error) {
      console.error('Error copying period:', error);
      toast.error('Bir hata oluştu');
    } finally {
      setCopying(false);
    }
  };

  const filteredPeriods = periods.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.code.toLowerCase().includes(search.toLowerCase())
  );

  // İstatistikler
  const stats = {
    total: periods.length,
    active: periods.filter((p) => p.status === 'AKTIF').length,
    totalObjectives: periods.reduce((sum, p) => sum + (p.objectives?.length || 0), 0),
    totalGoals: periods.reduce(
      (sum, p) =>
        sum +
        (p.objectives?.reduce((s: number, o: any) => s + (o.goals?.length || 0), 0) || 0),
      0
    ),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Stratejik Planlama</h1>
          <p className="text-muted-foreground">
            Misyon, vizyon, stratejik amaçlar ve hedefler
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={filteredPeriods.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                Dışa Aktar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => {
                const columns: ExportColumn[] = [
                  { key: 'code', header: 'Kod' },
                  { key: 'name', header: 'Dönem Adı' },
                  { key: 'status', header: 'Durum' },
                  { key: 'startDate', header: 'Başlangıç' },
                  { key: 'endDate', header: 'Bitiş' },
                  { key: 'objectives', header: 'Amaç Sayısı' },
                  { key: 'goals', header: 'Hedef Sayısı' },
                ];
                const data = filteredPeriods.map(p => ({
                  code: p.code,
                  name: p.name,
                  status: statusLabels[p.status]?.label || p.status,
                  startDate: format(new Date(p.startDate), 'dd.MM.yyyy'),
                  endDate: format(new Date(p.endDate), 'dd.MM.yyyy'),
                  objectives: p.objectives?.length || 0,
                  goals: p.objectives?.reduce((s: number, o: any) => s + (o.goals?.length || 0), 0) || 0,
                }));
                exportToExcel(data, columns, 'Strateji-Donemleri', 'Strateji Dönemleri');
                toast.success('Excel dosyası indirildi');
              }}>
                <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
                Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                const columns: ExportColumn[] = [
                  { key: 'code', header: 'Kod' },
                  { key: 'name', header: 'Dönem Adı' },
                  { key: 'status', header: 'Durum' },
                  { key: 'startDate', header: 'Başlangıç' },
                  { key: 'endDate', header: 'Bitiş' },
                  { key: 'objectives', header: 'Amaç Sayısı' },
                  { key: 'goals', header: 'Hedef Sayısı' },
                ];
                const data = filteredPeriods.map(p => ({
                  code: p.code,
                  name: p.name,
                  status: statusLabels[p.status]?.label || p.status,
                  startDate: format(new Date(p.startDate), 'dd.MM.yyyy'),
                  endDate: format(new Date(p.endDate), 'dd.MM.yyyy'),
                  objectives: p.objectives?.length || 0,
                  goals: p.objectives?.reduce((s: number, o: any) => s + (o.goals?.length || 0), 0) || 0,
                }));
                exportToPDF(data, columns, 'Strateji-Donemleri', 'Strateji Dönemleri Listesi');
                toast.success('PDF dosyası indirildi');
              }}>
                <FileText className="h-4 w-4 mr-2 text-red-600" />
                PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Yeni Dönem
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Yeni Strateji Dönemi Oluştur</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Dönem Adı *</Label>
                  <Input
                    placeholder="Örn: 2026 Stratejik Planı"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Başlangıç Tarihi *</Label>
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData({ ...formData, startDate: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Bitiş Tarihi *</Label>
                  <Input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData({ ...formData, endDate: e.target.value })
                    }
                  />
                </div>
                <div className="col-span-2">
                  <Label>Açıklama</Label>
                  <Textarea
                    placeholder="Dönem hakkında açıklama..."
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Misyon & Vizyon</h4>
                <div className="space-y-4">
                  <div>
                    <Label>Misyon</Label>
                    <Textarea
                      placeholder="Kurumun varlık nedeni ve temel amacı..."
                      value={formData.missionContent}
                      onChange={(e) =>
                        setFormData({ ...formData, missionContent: e.target.value })
                      }
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label>Vizyon</Label>
                    <Textarea
                      placeholder="Gelecekte ulaşılmak istenen durum..."
                      value={formData.visionContent}
                      onChange={(e) =>
                        setFormData({ ...formData, visionContent: e.target.value })
                      }
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label>Vizyon Hedef Yılı</Label>
                    <Input
                      type="number"
                      placeholder="Örn: 2030"
                      value={formData.visionTargetYear}
                      onChange={(e) =>
                        setFormData({ ...formData, visionTargetYear: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
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

      {/* İstatistikler */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Dönem</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktif Dönem</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stratejik Amaç</CardTitle>
            <Target className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.totalObjectives}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Hedef</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.totalGoals}</div>
          </CardContent>
        </Card>
      </div>

      {/* Stratejik Analiz Araçları */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-green-500"
          onClick={() => router.push('/dashboard/strategy/swot')}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Grid3X3 className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <CardTitle>SWOT Analizi</CardTitle>
                  <p className="text-sm text-muted-foreground">Güçlü yönler, zayıf yönler, fırsatlar ve tehditler</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span>S - Güçlü</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span>W - Zayıf</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span>O - Fırsat</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                <span>T - Tehdit</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-purple-500"
          onClick={() => router.push('/dashboard/strategy/pestel')}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Globe className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <CardTitle>PESTEL Analizi</CardTitle>
                  <p className="text-sm text-muted-foreground">Dış çevre faktörlerinin stratejik analizi</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 text-xs flex-wrap">
              <Badge variant="outline" className="bg-red-50">Politik</Badge>
              <Badge variant="outline" className="bg-green-50">Ekonomik</Badge>
              <Badge variant="outline" className="bg-blue-50">Sosyal</Badge>
              <Badge variant="outline" className="bg-purple-50">Teknolojik</Badge>
              <Badge variant="outline" className="bg-emerald-50">Çevresel</Badge>
              <Badge variant="outline" className="bg-orange-50">Yasal</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtreler */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Dönem ara..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
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
                <SelectItem value="KAPALI">Kapalı</SelectItem>
                <SelectItem value="ARSIV">Arşiv</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Dönem Listesi */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredPeriods.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <Target className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Henüz strateji dönemi bulunmuyor</p>
            <Button className="mt-4" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              İlk Dönemi Oluştur
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredPeriods.map((period) => {
            const objectiveCount = period.objectives?.length || 0;
            const goalCount = period.objectives?.reduce(
              (sum: number, o: any) => sum + (o.goals?.length || 0),
              0
            ) || 0;
            const actionCount = period.objectives?.reduce(
              (sum: number, o: any) =>
                sum +
                (o.goals?.reduce(
                  (s: number, g: any) =>
                    s + (g.actions?.length || 0) + (g.subGoals?.reduce((ss: number, sg: any) => ss + (sg.actions?.length || 0), 0) || 0),
                  0
                ) || 0),
              0
            ) || 0;

            return (
              <Card
                key={period.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => router.push(`/dashboard/strategy/${period.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <Badge
                        className={`${statusLabels[period.status]?.color} text-white mb-2`}
                      >
                        {statusLabels[period.status]?.label}
                      </Badge>
                      <CardTitle className="text-lg">{period.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{period.code}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Şablon Olarak Kopyala"
                        onClick={(e) => openCopyDialog(period, e)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {format(new Date(period.startDate), 'dd MMM yyyy', { locale: tr })} -{' '}
                        {format(new Date(period.endDate), 'dd MMM yyyy', { locale: tr })}
                      </span>
                    </div>

                    {period.mission && (
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-xs font-medium text-muted-foreground mb-1">MİSYON</p>
                        <p className="text-sm line-clamp-2">{period.mission.content}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                      <div className="text-center">
                        <p className="text-lg font-semibold text-blue-600">{objectiveCount}</p>
                        <p className="text-xs text-muted-foreground">Amaç</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-semibold text-purple-600">{goalCount}</p>
                        <p className="text-xs text-muted-foreground">Hedef</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-semibold text-green-600">{actionCount}</p>
                        <p className="text-xs text-muted-foreground">Aksiyon</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Copy Period Dialog */}
      <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Dönemi Şablon Olarak Kopyala</DialogTitle>
          </DialogHeader>
          {selectedPeriodForCopy && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Kaynak Dönem</p>
                <p className="font-medium">{selectedPeriodForCopy.name}</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(selectedPeriodForCopy.startDate), 'dd MMM yyyy', { locale: tr })} - {format(new Date(selectedPeriodForCopy.endDate), 'dd MMM yyyy', { locale: tr })}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>Yeni Dönem Adı *</Label>
                  <Input
                    placeholder="Örn: 2027-2029 Stratejik Planı"
                    value={copyFormData.name}
                    onChange={(e) =>
                      setCopyFormData({ ...copyFormData, name: e.target.value })
                    }
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Başlangıç Tarihi *</Label>
                    <Input
                      type="date"
                      value={copyFormData.startDate}
                      onChange={(e) =>
                        setCopyFormData({ ...copyFormData, startDate: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Bitiş Tarihi *</Label>
                    <Input
                      type="date"
                      value={copyFormData.endDate}
                      onChange={(e) =>
                        setCopyFormData({ ...copyFormData, endDate: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <Label className="text-sm font-medium">Kopyalama Seçenekleri</Label>
                  <p className="text-xs text-muted-foreground mb-3">
                    Misyon, Vizyon, Stratejik Amaçlar, Amaçlar, Hedefler ve Alt Hedefler her zaman kopyalanır.
                  </p>
                  
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="copyActions"
                        checked={copyFormData.copyActions}
                        onCheckedChange={(checked) =>
                          setCopyFormData({ ...copyFormData, copyActions: checked as boolean })
                        }
                      />
                      <label
                        htmlFor="copyActions"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Aksiyonları ve kilometre taşlarını kopyala
                      </label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="copyKPILinks"
                        checked={copyFormData.copyKPILinks}
                        onCheckedChange={(checked) =>
                          setCopyFormData({ ...copyFormData, copyKPILinks: checked as boolean })
                        }
                      />
                      <label
                        htmlFor="copyKPILinks"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        KPI bağlantılarını kopyala
                      </label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="copyRiskLinks"
                        checked={copyFormData.copyRiskLinks}
                        onCheckedChange={(checked) =>
                          setCopyFormData({ ...copyFormData, copyRiskLinks: checked as boolean })
                        }
                      />
                      <label
                        htmlFor="copyRiskLinks"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Risk bağlantılarını kopyala
                      </label>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-700">
                  <p className="font-medium mb-1">Not:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Yeni dönem &quot;Taslak&quot; durumunda oluşturulacak</li>
                    <li>İlerleme değerleri sıfırlanacak</li>
                    <li>Gerçekleşen tarihler ve bütçeler kopyalanmayacak</li>
                  </ul>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setCopyDialogOpen(false);
                    setSelectedPeriodForCopy(null);
                  }}
                >
                  İptal
                </Button>
                <Button onClick={handleCopy} disabled={copying}>
                  {copying ? 'Kopyalanıyor...' : 'Kopyala'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
