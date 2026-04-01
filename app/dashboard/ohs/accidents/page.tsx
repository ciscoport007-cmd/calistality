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
  AlertOctagon,
  Search,
  Plus,
  Eye,
  Upload,
  Calendar,
  MapPin,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/export-utils';

interface OHSAccident {
  id: string;
  code: string;
  title: string;
  accidentDate: string;
  location: string;
  department: { id: string; name: string; code: string };
  description: string;
  status: string;
  createdBy: { id: string; name: string; surname?: string };
  createdAt: string;
  involvedPersons: Array<{
    id: string;
    externalName?: string;
    externalRole?: string;
    duty?: string;
    position?: string;
    personDepartment?: { id: string; name: string };
    notes?: string;
  }>;
}

interface Department {
  id: string;
  name: string;
  code: string;
}

const STATUS_LABELS: Record<string, string> = {
  ACIK: 'Açık',
  ANALIZ: 'Kök Neden Analizi',
  ONLEM_ALIYOR: 'Önlem Alınıyor',
  KAPATILDI: 'Kapatıldı',
  TAMAMLANDI: 'Tamamlandı',
};

const STATUS_COLORS: Record<string, string> = {
  ACIK: 'bg-red-100 text-red-800',
  ANALIZ: 'bg-yellow-100 text-yellow-800',
  ONLEM_ALIYOR: 'bg-blue-100 text-blue-800',
  KAPATILDI: 'bg-gray-100 text-gray-800',
  TAMAMLANDI: 'bg-green-100 text-green-800',
};

const POSITION_OPTIONS = ['Çalışan', 'Orta Düzey Yönetici', 'Üst Düzey Yönetici'];

export default function OHSAccidentsPage() {
  const router = useRouter();
  const [accidents, setAccidents] = useState<OHSAccident[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    accidentDate: '',
    location: '',
    departmentId: '',
    description: '',
    rootCauseAnalysis: '',
    actionsTaken: '',
    preventiveMeasures: '',
  });
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [involvedPersons, setInvolvedPersons] = useState<Array<{
    externalName?: string;
    duty?: string;
    position?: string;
    personDepartmentId?: string;
    notes?: string;
    tcKimlikNo?: string;
    birthDate?: string;
    shift?: string;
    retrainingReceived?: boolean;
    retrainingDate?: string;
    retrainingNotes?: string;
    sickLeaveDays?: string;
    disabilityStatus?: string;
    disabilityRate?: string;
    disabilityNotes?: string;
  }>>([]);

  useEffect(() => {
    fetchAccidents();
    fetchDepartments();
  }, [search, statusFilter, departmentFilter, startDate, endDate]);

  const fetchAccidents = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
      if (departmentFilter && departmentFilter !== 'all') params.set('departmentId', departmentFilter);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const response = await fetch(`/api/ohs/accidents?${params}`);
      if (response.ok) {
        const data = await response.json();
        setAccidents(Array.isArray(data) ? data : []);
      } else {
        setAccidents([]);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Kazalar yüklenemedi');
      setAccidents([]);
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

  const addInvolvedPerson = () => {
    setInvolvedPersons([...involvedPersons, { externalName: '', duty: '', position: '', personDepartmentId: '', notes: '', tcKimlikNo: '', birthDate: '', shift: '', retrainingReceived: false, retrainingDate: '', retrainingNotes: '', sickLeaveDays: '', disabilityStatus: 'YOK', disabilityRate: '', disabilityNotes: '' }]);
  };

  const removeInvolvedPerson = (index: number) => {
    setInvolvedPersons(involvedPersons.filter((_, i) => i !== index));
  };

  const updateInvolvedPerson = (index: number, field: string, value: string | boolean) => {
    const updated = [...involvedPersons];
    updated[index] = { ...updated[index], [field]: value };
    setInvolvedPersons(updated);
  };

  const handleCreate = async () => {
    if (!formData.title || !formData.accidentDate || !formData.location || !formData.departmentId || !formData.description) {
      toast.error('Lütfen tüm zorunlu alanları doldurun');
      return;
    }

    try {
      setCreating(true);

      let evidenceFileName: string | undefined;
      let evidenceFileSize: number | undefined;
      let evidenceFileType: string | undefined;
      let evidenceCloudPath: string | undefined;

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

        evidenceFileName = evidenceFile.name;
        evidenceFileSize = evidenceFile.size;
        evidenceFileType = evidenceFile.type;
        evidenceCloudPath = cloud_storage_path;
      }

      const response = await fetch('/api/ohs/accidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          evidenceFileName,
          evidenceFileSize,
          evidenceFileType,
          evidenceCloudPath,
          evidenceIsPublic: evidenceFile ? false : undefined,
          involvedPersons: involvedPersons.filter(p => p.externalName),
        }),
      });

      if (response.ok) {
        toast.success('Kaza kaydı başarıyla oluşturuldu');
        setCreateOpen(false);
        setFormData({
          title: '', accidentDate: '', location: '', departmentId: '',
          description: '', rootCauseAnalysis: '', actionsTaken: '', preventiveMeasures: '',
        });
        setEvidenceFile(null);
        setInvolvedPersons([]);
        fetchAccidents();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Kaza kaydı oluşturulamadı');
      }
    } catch (error) {
      console.error('Create error:', error);
      toast.error('Kaza kaydı oluşturulurken hata oluştu');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <AlertOctagon className="w-7 h-7 text-red-600" />
            İş Kazaları
          </h1>
          <p className="text-muted-foreground">
            İş kazası kayıtlarını yönetin, kök neden analizi ve önlemleri takip edin
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-red-600 hover:bg-red-700">
          <Plus className="w-4 h-4 mr-2" />
          Yeni Kaza Kaydı
        </Button>
      </div>

      {/* Filtreler */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input placeholder="Kaza ara..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue placeholder="Durum" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Durumlar</SelectItem>
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger><SelectValue placeholder="Departman" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Departmanlar</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
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
                <TableHead>Tarih</TableHead>
                <TableHead>Konum</TableHead>
                <TableHead>Departman</TableHead>
                <TableHead>Karışanlar</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Yükleniyor...</TableCell>
                </TableRow>
              ) : accidents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Kaza kaydı bulunamadı</TableCell>
                </TableRow>
              ) : (
                accidents.map((accident) => (
                  <TableRow key={accident.id}>
                    <TableCell className="font-mono text-sm">{accident.code}</TableCell>
                    <TableCell className="font-medium">{accident.title}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        {formatDate(accident.accidentDate)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        {accident.location}
                      </div>
                    </TableCell>
                    <TableCell>{accident.department?.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        {accident.involvedPersons?.length || 0}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[accident.status] || ''}>
                        {STATUS_LABELS[accident.status] || accident.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => router.push(`/dashboard/ohs/accidents/${accident.id}`)}>
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

      {/* Yeni Kaza Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertOctagon className="w-5 h-5 text-red-600" />
              Yeni İş Kazası Kaydı
            </DialogTitle>
            <DialogDescription>
              İş kazası bilgilerini girin.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Temel Bilgiler */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kaza Başlığı *</Label>
                <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Kısa açıklama" />
              </div>
              <div className="space-y-2">
                <Label>Kaza Tarihi *</Label>
                <Input type="datetime-local" value={formData.accidentDate} onChange={(e) => setFormData({ ...formData, accidentDate: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kaza Yeri *</Label>
                <Input value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="Mutfak, Kat 3, Bahçe vb." />
              </div>
              <div className="space-y-2">
                <Label>Departman *</Label>
                <Select value={formData.departmentId} onValueChange={(v) => setFormData({ ...formData, departmentId: v })}>
                  <SelectTrigger><SelectValue placeholder="Departman seçin" /></SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Kaza Açıklaması *</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Kazanın nasıl gerçekleştiğini detaylı açıklayın" rows={3} />
            </div>

            {/* Karışan Personel */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Kazaya Karışan Personel</Label>
                <Button type="button" variant="outline" size="sm" onClick={addInvolvedPerson}>
                  <Plus className="w-4 h-4 mr-1" /> Kişi Ekle
                </Button>
              </div>
              {involvedPersons.map((person, index) => (
                <div key={index} className="p-3 border rounded-lg space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-muted-foreground">Kişi #{index + 1}</span>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeInvolvedPerson(index)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">İsim Soyisim *</Label>
                      <Input placeholder="Ad Soyad" value={person.externalName || ''} onChange={(e) => updateInvolvedPerson(index, 'externalName', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">TC Kimlik No</Label>
                      <Input placeholder="11 haneli TC" maxLength={11} value={person.tcKimlikNo || ''} onChange={(e) => updateInvolvedPerson(index, 'tcKimlikNo', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Doğum Tarihi</Label>
                      <Input type="date" value={person.birthDate || ''} onChange={(e) => updateInvolvedPerson(index, 'birthDate', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Görev</Label>
                      <Input placeholder="Görev bilgisi" value={person.duty || ''} onChange={(e) => updateInvolvedPerson(index, 'duty', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Pozisyon</Label>
                      <Select value={person.position || ''} onValueChange={(v) => updateInvolvedPerson(index, 'position', v)}>
                        <SelectTrigger><SelectValue placeholder="Pozisyon seçin" /></SelectTrigger>
                        <SelectContent>
                          {POSITION_OPTIONS.map((opt) => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Departman</Label>
                      <Select value={person.personDepartmentId || ''} onValueChange={(v) => updateInvolvedPerson(index, 'personDepartmentId', v)}>
                        <SelectTrigger><SelectValue placeholder="Departman seçin" /></SelectTrigger>
                        <SelectContent>
                          {departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Vardiya</Label>
                      <Select value={person.shift || ''} onValueChange={(v) => updateInvolvedPerson(index, 'shift', v)}>
                        <SelectTrigger><SelectValue placeholder="Vardiya seçin" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="GUNDUZ">Gündüz</SelectItem>
                          <SelectItem value="GECE">Gece</SelectItem>
                          <SelectItem value="AKSAM">Akşam</SelectItem>
                          <SelectItem value="ROTASYONLU">Rotasyonlu</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Raporlu Gün Sayısı</Label>
                      <Input type="number" min={0} placeholder="0" value={person.sickLeaveDays || ''} onChange={(e) => updateInvolvedPerson(index, 'sickLeaveDays', e.target.value)} />
                    </div>
                  </div>
                  {/* Eğitim Durumu */}
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="space-y-1 flex items-center gap-2">
                      <input type="checkbox" id={`retraining-${index}`} checked={person.retrainingReceived || false} onChange={(e) => updateInvolvedPerson(index, 'retrainingReceived', e.target.checked)} className="h-4 w-4" />
                      <Label htmlFor={`retraining-${index}`} className="text-xs">Kaza Sonrası Eğitim Aldı</Label>
                    </div>
                    {person.retrainingReceived && (
                      <div className="space-y-1">
                        <Label className="text-xs">Eğitim Tarihi</Label>
                        <Input type="date" value={person.retrainingDate || ''} onChange={(e) => updateInvolvedPerson(index, 'retrainingDate', e.target.value)} />
                      </div>
                    )}
                  </div>
                  {/* İşgöremezlik Durumu */}
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <div className="space-y-1">
                      <Label className="text-xs">İşgöremezlik Durumu</Label>
                      <Select value={person.disabilityStatus || 'YOK'} onValueChange={(v) => updateInvolvedPerson(index, 'disabilityStatus', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="YOK">Yok</SelectItem>
                          <SelectItem value="GECICI">Geçici</SelectItem>
                          <SelectItem value="KALICI">Kalıcı</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {person.disabilityStatus && person.disabilityStatus !== 'YOK' && (
                      <>
                        <div className="space-y-1">
                          <Label className="text-xs">İşgöremezlik Oranı (%)</Label>
                          <Input type="number" min={0} max={100} placeholder="%" value={person.disabilityRate || ''} onChange={(e) => updateInvolvedPerson(index, 'disabilityRate', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">İşgöremezlik Notu</Label>
                          <Input placeholder="Açıklama" value={person.disabilityNotes || ''} onChange={(e) => updateInvolvedPerson(index, 'disabilityNotes', e.target.value)} />
                        </div>
                      </>
                    )}
                  </div>
                  <div className="space-y-1 mt-2">
                    <Label className="text-xs">Not</Label>
                    <Input placeholder="Ek not" value={person.notes || ''} onChange={(e) => updateInvolvedPerson(index, 'notes', e.target.value)} />
                  </div>
                </div>
              ))}
            </div>

            {/* Analiz ve Önlemler */}
            <div className="space-y-2">
              <Label>Kök Neden Analizi</Label>
              <Textarea value={formData.rootCauseAnalysis} onChange={(e) => setFormData({ ...formData, rootCauseAnalysis: e.target.value })} placeholder="Kazanın kök nedenleri" rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Alınan Önlemler</Label>
              <Textarea value={formData.actionsTaken} onChange={(e) => setFormData({ ...formData, actionsTaken: e.target.value })} placeholder="Kaza sonrası alınan önlemler" rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Önleyici Tedbirler</Label>
              <Textarea value={formData.preventiveMeasures} onChange={(e) => setFormData({ ...formData, preventiveMeasures: e.target.value })} placeholder="Tekrar olmaması için önleyici tedbirler" rows={2} />
            </div>

            {/* Kanıt Dokümanı */}
            <div className="space-y-2">
              <Label>Kanıt Dokümanı</Label>
              <div className="border-2 border-dashed rounded-lg p-4">
                {evidenceFile ? (
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{evidenceFile.name}</span>
                    <Button variant="ghost" size="sm" onClick={() => setEvidenceFile(null)}><X className="w-4 h-4" /></Button>
                  </div>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Doküman yüklemek için tıklayın</span>
                    <input type="file" className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)} />
                  </label>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>İptal</Button>
            <Button onClick={handleCreate} disabled={creating} className="bg-red-600 hover:bg-red-700">
              {creating ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
