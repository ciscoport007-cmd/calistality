'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
  AlertTriangle,
  Search,
  Plus,
  Eye,
  Upload,
  Calendar,
  User,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/export-utils';

interface OHSNearMiss {
  id: string;
  code: string;
  title: string;
  eventDate: string;
  department: { id: string; name: string; code: string };
  description: string;
  reporter?: { id: string; name: string; surname?: string };
  reporterName?: string;
  potentialConsequence?: string;
  responsibleName?: string;
  suggestedMeasure?: string;
  responsibleNote?: string;
  evidenceFileName?: string;
  evidenceCloudPath?: string;
  status: string;
  completedAt?: string;
  createdBy: { id: string; name: string; surname?: string };
  createdAt: string;
}

const NM_STATUS_LABELS: Record<string, string> = {
  ACIK: 'Açık',
  TAMAMLANDI: 'Tamamlandı',
};

const NM_STATUS_COLORS: Record<string, string> = {
  ACIK: 'bg-yellow-100 text-yellow-800',
  TAMAMLANDI: 'bg-green-100 text-green-800',
};

interface Department {
  id: string;
  name: string;
  code: string;
}

export default function OHSNearMissesPage() {
  const router = useRouter();
  const [nearMisses, setNearMisses] = useState<OHSNearMiss[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Filtreler
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Form
  const [formData, setFormData] = useState({
    title: '',
    eventDate: '',
    departmentId: '',
    description: '',
    reporterName: '',
    potentialConsequence: '',
    suggestedMeasure: '',
    responsibleName: '',
    responsibleNote: '',
  });
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);

  useEffect(() => {
    fetchNearMisses();
    fetchDepartments();
  }, [search, statusFilter, departmentFilter, startDate, endDate]);

  const fetchNearMisses = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
      if (departmentFilter && departmentFilter !== 'all') params.set('departmentId', departmentFilter);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const response = await fetch(`/api/ohs/near-misses?${params}`);
      if (response.ok) {
        const data = await response.json();
        setNearMisses(Array.isArray(data) ? data : []);
      } else {
        setNearMisses([]);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Ramak kala kayıtları yüklenemedi');
      setNearMisses([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/departments');
      if (response.ok) {
        const data = await response.json();
        const depts = data.departments || data;
        setDepartments(Array.isArray(depts) ? depts : []);
      }
    } catch (error) {
      console.error('Departments fetch error:', error);
    }
  };

  const handleCreate = async () => {
    if (!formData.title || !formData.eventDate || !formData.departmentId || !formData.description) {
      toast.error('Lütfen tüm zorunlu alanları doldurun');
      return;
    }

    try {
      setCreating(true);

      let evidenceData = {};

      if (evidenceFile) {
        const presignedResponse = await fetch('/api/upload/presigned', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: evidenceFile.name,
            contentType: evidenceFile.type,
            isPublic: false,
          }),
        });

        if (!presignedResponse.ok) {
          throw new Error('Dosya yükleme URL\'si alınamadı');
        }

        const { uploadUrl, cloud_storage_path } = await presignedResponse.json();

        const uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          body: evidenceFile,
          headers: { 'Content-Type': evidenceFile.type },
        });

        if (!uploadResponse.ok) {
          throw new Error('Dosya yüklenemedi');
        }

        evidenceData = {
          evidenceFileName: evidenceFile.name,
          evidenceFileSize: evidenceFile.size,
          evidenceFileType: evidenceFile.type,
          evidenceCloudPath: cloud_storage_path,
          evidenceIsPublic: false,
        };
      }

      const response = await fetch('/api/ohs/near-misses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          ...evidenceData,
        }),
      });

      if (response.ok) {
        toast.success('Ramak kala kaydı başarıyla oluşturuldu');
        setCreateOpen(false);
        setFormData({
          title: '',
          eventDate: '',
          departmentId: '',
          description: '',
          reporterName: '',
          potentialConsequence: '',
          suggestedMeasure: '',
          responsibleName: '',
          responsibleNote: '',
        });
        setEvidenceFile(null);
        fetchNearMisses();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Ramak kala kaydı oluşturulamadı');
      }
    } catch (error) {
      console.error('Create error:', error);
      toast.error('Ramak kala kaydı oluşturulurken hata oluştu');
    } finally {
      setCreating(false);
    }
  };

  const getReporterDisplay = (nm: OHSNearMiss) => {
    if (nm.reporterName) return nm.reporterName;
    if (nm.reporter) return `${nm.reporter.name} ${nm.reporter.surname || ''}`.trim();
    return '-';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="w-7 h-7 text-yellow-600" />
            Ramak Kala Bildirimleri
          </h1>
          <p className="text-muted-foreground">
            Potansiyel tehlike durumlarını bildirin ve önlemleri takip edin
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-yellow-600 hover:bg-yellow-700">
          <Plus className="w-4 h-4 mr-2" />
          Yeni Bildirim
        </Button>
      </div>

      {/* Filtreler */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Bildirim ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Durum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Durumlar</SelectItem>
                {Object.entries(NM_STATUS_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Departman" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Departmanlar</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="Başlangıç"
            />
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="Bitiş"
            />
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
                <TableHead>Başlık</TableHead>
                <TableHead>Olay Tarihi</TableHead>
                <TableHead>Departman</TableHead>
                <TableHead>Bildiren</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Önerilen Önlem</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Yükleniyor...
                  </TableCell>
                </TableRow>
              ) : nearMisses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Ramak kala kaydı bulunamadı
                  </TableCell>
                </TableRow>
              ) : (
                nearMisses.map((nm) => (
                  <TableRow key={nm.id}>
                    <TableCell className="font-mono text-sm">{nm.code}</TableCell>
                    <TableCell className="font-medium">{nm.title}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        {formatDate(nm.eventDate)}
                      </div>
                    </TableCell>
                    <TableCell>{nm.department?.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4 text-muted-foreground" />
                        {getReporterDisplay(nm)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={NM_STATUS_COLORS[nm.status] || 'bg-yellow-100 text-yellow-800'}>
                        {NM_STATUS_LABELS[nm.status] || nm.status || 'Açık'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground truncate block max-w-[200px]">
                        {nm.suggestedMeasure || '-'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => router.push(`/dashboard/ohs/near-misses/${nm.id}`)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Yeni Ramak Kala Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              Yeni Ramak Kala Bildirimi
            </DialogTitle>
            <DialogDescription>
              Potansiyel tehlike durumunu bildirin. Tüm çalışanlar bildirim yapabilir.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Temel Bilgiler */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Olay Başlığı *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ne olabilirdi? Kısa açıklama"
                />
              </div>
              <div className="space-y-2">
                <Label>Olay Tarihi *</Label>
                <Input
                  type="datetime-local"
                  value={formData.eventDate}
                  onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Departman *</Label>
                <Select
                  value={formData.departmentId}
                  onValueChange={(v) => setFormData({ ...formData, departmentId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Departman seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Bildiren Kişi</Label>
                <Input
                  value={formData.reporterName}
                  onChange={(e) => setFormData({ ...formData, reporterName: e.target.value })}
                  placeholder="İsim Soyisim girin"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Olay Açıklaması *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Ne olabilirdi? Potansiyel tehlikeyi detaylı açıklayın"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Olası Sonuç</Label>
              <Textarea
                value={formData.potentialConsequence}
                onChange={(e) => setFormData({ ...formData, potentialConsequence: e.target.value })}
                placeholder="Olay gerçekleşseydi ne olabilirdi?"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Önerilen Önlem</Label>
                <Textarea
                  value={formData.suggestedMeasure}
                  onChange={(e) => setFormData({ ...formData, suggestedMeasure: e.target.value })}
                  placeholder="Bu tehlikeyi önlemek için ne yapılabilir?"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Sorumlu Kişi</Label>
                <Input
                  value={formData.responsibleName}
                  onChange={(e) => setFormData({ ...formData, responsibleName: e.target.value })}
                  placeholder="Sorumlu kişi adı"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Sorumlu Notu</Label>
              <Textarea
                value={formData.responsibleNote}
                onChange={(e) => setFormData({ ...formData, responsibleNote: e.target.value })}
                placeholder="Ek notlar (ilgili sorumlular için)"
                rows={2}
              />
            </div>

            {/* Kanıt Dokümanı (Opsiyonel) */}
            <div className="space-y-2">
              <Label>Kanıt Dokümanı (Opsiyonel)</Label>
              <div className="border-2 border-dashed rounded-lg p-4">
                {evidenceFile ? (
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{evidenceFile.name}</span>
                    <Button variant="ghost" size="sm" onClick={() => setEvidenceFile(null)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Fotoğraf veya doküman yüklemek için tıklayın</span>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)}
                    />
                  </label>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              İptal
            </Button>
            <Button onClick={handleCreate} disabled={creating} className="bg-yellow-600 hover:bg-yellow-700">
              {creating ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
