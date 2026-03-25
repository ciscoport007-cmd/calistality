'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  GraduationCap,
  Plus,
  Search,
  Filter,
  BookOpen,
  Users,
  Clock,
  Award,
  Eye,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';

const TRAINING_TYPES = [
  { value: 'ORYANTASYON', label: 'Oryantasyon Eğitimi' },
  { value: 'TEKNIK', label: 'Teknik Eğitim' },
  { value: 'KALITE', label: 'Kalite Eğitimi' },
  { value: 'GUVENLIK', label: 'İş Güvenliği' },
  { value: 'YAZILIM', label: 'Yazılım Eğitimi' },
  { value: 'YONETIM', label: 'Yönetim Becerileri' },
  { value: 'MESLEKI', label: 'Mesleki Gelişim' },
  { value: 'SERTIFIKA', label: 'Sertifika Programı' },
  { value: 'DIGER', label: 'Diğer' },
];

const TRAINING_METHODS = [
  { value: 'SINIF_ICI', label: 'Sınıf İçi Eğitim' },
  { value: 'ONLINE', label: 'Online Eğitim' },
  { value: 'WEBINAR', label: 'Webinar' },
  { value: 'SAHADA', label: 'Sahada Uygulama' },
  { value: 'BIREYSEL', label: 'Bireysel Çalışma' },
  { value: 'KARMA', label: 'Karma Eğitim' },
];

export default function TrainingsPage() {
  const router = useRouter();
  const [trainings, setTrainings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterActive, setFilterActive] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'TEKNIK',
    method: 'SINIF_ICI',
    durationMinutes: 60,
    objectives: '',
    content: '',
    hasCertificate: false,
    certificateValidityMonths: null as number | null,
    hasExam: false,
    passingScore: null as number | null,
    isRecurring: false,
    recurringMonths: null as number | null,
  });

  useEffect(() => {
    fetchTrainings();
  }, [search, filterType, filterActive]);

  const fetchTrainings = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterType) params.set('type', filterType);
      if (filterActive) params.set('isActive', filterActive);

      const res = await fetch(`/api/trainings?${params}`);
      const data = await res.json();
      setTrainings(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching trainings:', error);
      setTrainings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name) {
      toast.error('Eğitim adı zorunludur');
      return;
    }

    try {
      const res = await fetch('/api/trainings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error('Oluşturma hatası');

      toast.success('Eğitim oluşturuldu');
      setCreateDialogOpen(false);
      setFormData({
        name: '',
        description: '',
        type: 'TEKNIK',
        method: 'SINIF_ICI',
        durationMinutes: 60,
        objectives: '',
        content: '',
        hasCertificate: false,
        certificateValidityMonths: null,
        hasExam: false,
        passingScore: null,
        isRecurring: false,
        recurringMonths: null,
      });
      fetchTrainings();
    } catch (error) {
      toast.error('Eğitim oluşturulamadı');
    }
  };

  const getTypeLabel = (type: string) => {
    return TRAINING_TYPES.find((t) => t.value === type)?.label || type;
  };

  const getMethodLabel = (method: string) => {
    return TRAINING_METHODS.find((m) => m.value === method)?.label || method;
  };

  const stats = {
    total: trainings.length,
    active: trainings.filter((t) => t.isActive).length,
    withCertificate: trainings.filter((t) => t.hasCertificate).length,
    recurring: trainings.filter((t) => t.isRecurring).length,
  };

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Eğitim Yönetimi</h1>
          <p className="text-muted-foreground">
            Eğitim tanımları, planlar ve katılım takibi
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/trainings/plans')}
          >
            <BookOpen className="mr-2 h-4 w-4" />
            Eğitim Planları
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Yeni Eğitim
          </Button>
        </div>
      </div>

      {/* İstatistikler */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Toplam Eğitim</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Aktif Eğitim</CardTitle>
            <BookOpen className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Sertifikalı</CardTitle>
            <Award className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.withCertificate}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Periyodik</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.recurring}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtreler */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Eğitim ara..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Tür" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Türler</SelectItem>
                {TRAINING_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterActive} onValueChange={setFilterActive}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Durum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü</SelectItem>
                <SelectItem value="true">Aktif</SelectItem>
                <SelectItem value="false">Pasif</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tablo */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kod</TableHead>
                <TableHead>Eğitim Adı</TableHead>
                <TableHead>Tür</TableHead>
                <TableHead>Yöntem</TableHead>
                <TableHead>Süre</TableHead>
                <TableHead>Özellikler</TableHead>
                <TableHead>Plan/Gereksinim</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Yükleniyor...
                  </TableCell>
                </TableRow>
              ) : trainings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Eğitim bulunamadı
                  </TableCell>
                </TableRow>
              ) : (
                trainings.map((training) => (
                  <TableRow
                    key={training.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/dashboard/trainings/${training.id}`)}
                  >
                    <TableCell className="font-mono text-sm">{training.code}</TableCell>
                    <TableCell>
                      <div className="font-medium">{training.name}</div>
                      {training.description && (
                        <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                          {training.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getTypeLabel(training.type)}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{getMethodLabel(training.method)}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {training.durationMinutes >= 60
                          ? `${Math.floor(training.durationMinutes / 60)} saat ${training.durationMinutes % 60 > 0 ? `${training.durationMinutes % 60} dk` : ''}`
                          : `${training.durationMinutes} dk`}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {training.hasCertificate && (
                          <Badge variant="secondary" className="text-xs">
                            <Award className="mr-1 h-3 w-3" />
                            Sertifika
                          </Badge>
                        )}
                        {training.hasExam && (
                          <Badge variant="secondary" className="text-xs">
                            Sınav
                          </Badge>
                        )}
                        {training.isRecurring && (
                          <Badge variant="secondary" className="text-xs">
                            <Clock className="mr-1 h-3 w-3" />
                            Periyodik
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2 text-sm">
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-3 w-3" />
                          {training._count?.plans || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {training._count?.requirements || 0}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Eğitim Oluşturma Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Yeni Eğitim Oluştur</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Eğitim Adı *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Eğitim adını girin"
                />
              </div>
              <div>
                <Label>Tür</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) => setFormData({ ...formData, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRAINING_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Yöntem</Label>
                <Select
                  value={formData.method}
                  onValueChange={(v) => setFormData({ ...formData, method: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRAINING_METHODS.map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Süre (dakika)</Label>
                <Input
                  type="number"
                  value={formData.durationMinutes}
                  onChange={(e) =>
                    setFormData({ ...formData, durationMinutes: parseInt(e.target.value) || 60 })
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Açıklama</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Eğitim açıklaması"
                  rows={2}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Eğitim Hedefleri</Label>
                <Textarea
                  value={formData.objectives}
                  onChange={(e) => setFormData({ ...formData, objectives: e.target.value })}
                  placeholder="Eğitim hedeflerini girin"
                  rows={2}
                />
              </div>
            </div>

            <div className="border-t pt-4 space-y-4">
              <h4 className="font-medium">Özellikler</h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasCertificate"
                    checked={formData.hasCertificate}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, hasCertificate: checked as boolean })
                    }
                  />
                  <Label htmlFor="hasCertificate">Sertifika Verilecek</Label>
                </div>
                {formData.hasCertificate && (
                  <div>
                    <Label>Sertifika Geçerlilik Süresi (ay)</Label>
                    <Input
                      type="number"
                      value={formData.certificateValidityMonths || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          certificateValidityMonths: e.target.value ? parseInt(e.target.value) : null,
                        })
                      }
                    />
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasExam"
                    checked={formData.hasExam}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, hasExam: checked as boolean })
                    }
                  />
                  <Label htmlFor="hasExam">Sınav Yapılacak</Label>
                </div>
                {formData.hasExam && (
                  <div>
                    <Label>Geçme Puanı</Label>
                    <Input
                      type="number"
                      value={formData.passingScore || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          passingScore: e.target.value ? parseInt(e.target.value) : null,
                        })
                      }
                    />
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isRecurring"
                    checked={formData.isRecurring}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, isRecurring: checked as boolean })
                    }
                  />
                  <Label htmlFor="isRecurring">Periyodik Tekrar</Label>
                </div>
                {formData.isRecurring && (
                  <div>
                    <Label>Tekrar Periyodu (ay)</Label>
                    <Input
                      type="number"
                      value={formData.recurringMonths || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          recurringMonths: e.target.value ? parseInt(e.target.value) : null,
                        })
                      }
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              İptal
            </Button>
            <Button onClick={handleCreate}>Oluştur</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
