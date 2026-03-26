'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Heart,
  Search,
  Plus,
  Syringe,
  FileText,
  Upload,
  X,
  Calendar,
  User,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/export-utils';

interface HealthRecord {
  id: string;
  code: string;
  user?: { id: string; name: string; surname?: string };
  personName?: string;
  personDuty?: string;
  personDepartment?: { id: string; name: string };
  examType: string;
  examDate: string;
  nextExamDate?: string;
  physicianName: string;
  institution?: string;
  result: string;
  restrictions?: string;
  notes?: string;
  reportFileName?: string;
  createdBy: { id: string; name: string; surname?: string };
  createdAt: string;
}

interface Vaccination {
  id: string;
  user: { id: string; name: string; surname?: string };
  vaccineType: string;
  vaccineName?: string;
  vaccineDate: string;
  nextDoseDate?: string;
  doseNumber: number;
  administeredBy?: string;
  batchNumber?: string;
  notes?: string;
  createdBy: { id: string; name: string; surname?: string };
}

interface UserType {
  id: string;
  name: string;
  surname?: string;
}

interface Department {
  id: string;
  name: string;
}

const EXAM_TYPE_LABELS: Record<string, string> = {
  ISEGIRIS: 'İşe Giriş',
  PERIYODIK: 'Periyodik',
  ISEDEGISIKLIGI: 'İş Değişikliği',
  OZEL: 'Özel',
};

const RESULT_LABELS: Record<string, string> = {
  UYGUN: 'Uygun',
  KISITLI_UYGUN: 'Kısıtlı Uygun',
  UYGUN_DEGIL: 'Uygun Değil',
  KONTROL_GEREKLI: 'Kontrol Gerekli',
};

const RESULT_COLORS: Record<string, string> = {
  UYGUN: 'bg-green-100 text-green-800',
  KISITLI_UYGUN: 'bg-yellow-100 text-yellow-800',
  UYGUN_DEGIL: 'bg-red-100 text-red-800',
  KONTROL_GEREKLI: 'bg-orange-100 text-orange-800',
};

const VACCINE_TYPE_LABELS: Record<string, string> = {
  TETANOS: 'Tetanos',
  HEPATIT_A: 'Hepatit A',
  HEPATIT_B: 'Hepatit B',
  GRIP: 'Grip',
  KOVID: 'COVID-19',
  KUDUZ: 'Kuduz',
  DIGER: 'Diğer',
};

export default function OHSHealthPage() {
  const { data: session } = useSession();
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([]);
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('records');

  // Dialog states
  const [recordDialogOpen, setRecordDialogOpen] = useState(false);
  const [vaccinationDialogOpen, setVaccinationDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Edit dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<HealthRecord | null>(null);
  const [updating, setUpdating] = useState(false);
  const [editForm, setEditForm] = useState({
    personName: '', personDuty: '', personDepartmentId: '',
    examType: '', examDate: '', nextExamDate: '',
    physicianName: '', institution: '', result: '', restrictions: '', notes: '',
  });
  
  // Filters
  const [search, setSearch] = useState('');
  const [examTypeFilter, setExamTypeFilter] = useState('');
  const [resultFilter, setResultFilter] = useState('');
  
  // Health Record Form - now uses personName instead of userId
  const [recordForm, setRecordForm] = useState({
    personName: '',
    personDuty: '',
    personDepartmentId: '',
    examType: '',
    examDate: '',
    nextExamDate: '',
    physicianName: '',
    institution: '',
    result: '',
    restrictions: '',
    notes: '',
  });
  const [reportFile, setReportFile] = useState<File | null>(null);
  
  // Vaccination Form - keeps userId dropdown
  const [vaccinationForm, setVaccinationForm] = useState({
    userId: '',
    vaccineType: '',
    vaccineName: '',
    vaccineDate: '',
    nextDoseDate: '',
    doseNumber: '1',
    administeredBy: '',
    batchNumber: '',
    notes: '',
  });

  useEffect(() => {
    fetchHealthRecords();
    fetchVaccinations();
    fetchUsers();
    fetchDepartments();
  }, [search, examTypeFilter, resultFilter]);

  const fetchHealthRecords = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (examTypeFilter && examTypeFilter !== 'all') params.set('examType', examTypeFilter);
      if (resultFilter && resultFilter !== 'all') params.set('result', resultFilter);

      const response = await fetch(`/api/ohs/health/records?${params}`);
      if (response.ok) {
        const data = await response.json();
        setHealthRecords(Array.isArray(data) ? data : []);
      } else {
        setHealthRecords([]);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      setHealthRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchVaccinations = async () => {
    try {
      const response = await fetch('/api/ohs/health/vaccinations');
      if (response.ok) {
        const data = await response.json();
        setVaccinations(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users?forReviewers=true');
      if (response.ok) {
        const data = await response.json();
        const list = data.users || data;
        setUsers(Array.isArray(list) ? list : []);
      }
    } catch (error) {
      console.error('Users fetch error:', error);
    }
  };

  const canEditRecord = (record: HealthRecord) => {
    if (!session?.user) return false;
    const role = (session.user as any).role || '';
    const adminRoles = ['Admin', 'Yönetici', 'admin', 'Strateji Ofisi'];
    if (adminRoles.some(r => role.toLowerCase() === r.toLowerCase())) return true;
    return session.user.id === record.createdBy.id;
  };

  const handleRowClick = (record: HealthRecord) => {
    if (!canEditRecord(record)) return;
    setSelectedRecord(record);
    setEditForm({
      personName: record.personName || (record.user ? `${record.user.name} ${record.user.surname || ''}`.trim() : ''),
      personDuty: record.personDuty || '',
      personDepartmentId: record.personDepartment?.id || '',
      examType: record.examType,
      examDate: record.examDate ? record.examDate.split('T')[0] : '',
      nextExamDate: record.nextExamDate ? record.nextExamDate.split('T')[0] : '',
      physicianName: record.physicianName,
      institution: record.institution || '',
      result: record.result,
      restrictions: record.restrictions || '',
      notes: record.notes || '',
    });
    setEditDialogOpen(true);
  };

  const handleUpdateRecord = async () => {
    if (!selectedRecord) return;
    if (!editForm.personName || !editForm.examType || !editForm.examDate || !editForm.physicianName || !editForm.result) {
      toast.error('Lütfen zorunlu alanları doldurun');
      return;
    }
    try {
      setUpdating(true);
      const response = await fetch(`/api/ohs/health/records/${selectedRecord.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editForm,
          personDepartmentId: editForm.personDepartmentId || null,
          nextExamDate: editForm.nextExamDate || null,
        }),
      });
      if (response.ok) {
        toast.success('Kayıt güncellendi');
        setEditDialogOpen(false);
        setSelectedRecord(null);
        fetchHealthRecords();
      } else {
        const err = await response.json();
        toast.error(err.error || 'Kayıt güncellenemedi');
      }
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Hata oluştu');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteRecord = async (record: HealthRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Bu sağlık kaydını silmek istediğinize emin misiniz?')) return;
    try {
      const response = await fetch(`/api/ohs/health/records/${record.id}`, { method: 'DELETE' });
      if (response.ok) {
        toast.success('Kayıt silindi');
        fetchHealthRecords();
      } else {
        const err = await response.json();
        toast.error(err.error || 'Kayıt silinemedi');
      }
    } catch {
      toast.error('Hata oluştu');
    }
  };

  const handleDeleteVaccination = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Bu aşı kaydını silmek istediğinize emin misiniz?')) return;
    try {
      const response = await fetch(`/api/ohs/health/vaccinations/${id}`, { method: 'DELETE' });
      if (response.ok) {
        toast.success('Aşı kaydı silindi');
        fetchVaccinations();
      } else {
        const err = await response.json();
        toast.error(err.error || 'Kayıt silinemedi');
      }
    } catch {
      toast.error('Hata oluştu');
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

  const handleCreateRecord = async () => {
    if (!recordForm.personName || !recordForm.examType || !recordForm.examDate || !recordForm.physicianName || !recordForm.result) {
      toast.error('Lütfen zorunlu alanları doldurun');
      return;
    }

    try {
      setCreating(true);
      let reportData = {};

      if (reportFile) {
        const presignedResponse = await fetch('/api/upload/presigned', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: reportFile.name,
            contentType: reportFile.type,
            isPublic: false,
          }),
        });

        if (presignedResponse.ok) {
          const { uploadUrl, cloud_storage_path } = await presignedResponse.json();
          await fetch(uploadUrl, {
            method: 'PUT',
            body: reportFile,
            headers: { 'Content-Type': reportFile.type },
          });

          reportData = {
            reportFileName: reportFile.name,
            reportFileSize: reportFile.size,
            reportFileType: reportFile.type,
            reportCloudPath: cloud_storage_path,
            reportIsPublic: false,
          };
        }
      }

      const response = await fetch('/api/ohs/health/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...recordForm, ...reportData }),
      });

      if (response.ok) {
        toast.success('Sağlık kaydı oluşturuldu');
        setRecordDialogOpen(false);
        setRecordForm({
          personName: '', personDuty: '', personDepartmentId: '',
          examType: '', examDate: '', nextExamDate: '',
          physicianName: '', institution: '', result: '', restrictions: '', notes: '',
        });
        setReportFile(null);
        fetchHealthRecords();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Kayıt oluşturulamadı');
      }
    } catch (error) {
      console.error('Create error:', error);
      toast.error('Hata oluştu');
    } finally {
      setCreating(false);
    }
  };

  const handleCreateVaccination = async () => {
    if (!vaccinationForm.userId || !vaccinationForm.vaccineType || !vaccinationForm.vaccineDate) {
      toast.error('Lütfen zorunlu alanları doldurun');
      return;
    }

    try {
      setCreating(true);
      const response = await fetch('/api/ohs/health/vaccinations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...vaccinationForm,
          doseNumber: parseInt(vaccinationForm.doseNumber),
        }),
      });

      if (response.ok) {
        toast.success('Aşı kaydı oluşturuldu');
        setVaccinationDialogOpen(false);
        setVaccinationForm({
          userId: '', vaccineType: '', vaccineName: '', vaccineDate: '',
          nextDoseDate: '', doseNumber: '1', administeredBy: '', batchNumber: '', notes: '',
        });
        fetchVaccinations();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Kayıt oluşturulamadı');
      }
    } catch (error) {
      console.error('Create error:', error);
      toast.error('Hata oluştu');
    } finally {
      setCreating(false);
    }
  };

  // Süresi yaklaşanlar
  const expiringRecords = healthRecords.filter(r => {
    if (!r.nextExamDate) return false;
    const nextDate = new Date(r.nextExamDate);
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
    return nextDate <= thirtyDaysLater && nextDate >= new Date();
  });

  const getPersonDisplay = (record: HealthRecord) => {
    if (record.personName) return record.personName;
    if (record.user) return `${record.user.name} ${record.user.surname || ''}`.trim();
    return '-';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Heart className="w-7 h-7 text-pink-600" />
            Sağlık Gözetimi
          </h1>
          <p className="text-muted-foreground">
            Personel sağlık muayeneleri ve aşı takibi
          </p>
        </div>
      </div>

      {/* Uyarı */}
      {expiringRecords.length > 0 && (
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <span className="font-medium">
                {expiringRecords.length} personelin muayene tarihi yaklaşıyor
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="records" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Sağlık Kayıtları
          </TabsTrigger>
          <TabsTrigger value="vaccinations" className="flex items-center gap-2">
            <Syringe className="w-4 h-4" />
            Aşı Takibi
          </TabsTrigger>
        </TabsList>

        {/* Sağlık Kayıtları */}
        <TabsContent value="records" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-4">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Ara..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={examTypeFilter} onValueChange={setExamTypeFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Muayene Türü" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  {Object.entries(EXAM_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={resultFilter} onValueChange={setResultFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Sonuç" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  {Object.entries(RESULT_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setRecordDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Yeni Kayıt
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kod</TableHead>
                    <TableHead>Personel</TableHead>
                    <TableHead>Tür</TableHead>
                    <TableHead>Muayene Tarihi</TableHead>
                    <TableHead>Sonraki Muayene</TableHead>
                    <TableHead>Hekim</TableHead>
                    <TableHead>Sonuç</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Yükleniyor...
                      </TableCell>
                    </TableRow>
                  ) : healthRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Kayıt bulunamadı
                      </TableCell>
                    </TableRow>
                  ) : (
                    healthRecords.map((record) => (
                      <TableRow
                        key={record.id}
                        className={canEditRecord(record) ? 'cursor-pointer hover:bg-muted/50' : ''}
                        onClick={() => handleRowClick(record)}
                      >
                        <TableCell className="font-mono text-sm">{record.code}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            {getPersonDisplay(record)}
                          </div>
                        </TableCell>
                        <TableCell>{EXAM_TYPE_LABELS[record.examType]}</TableCell>
                        <TableCell>{formatDate(record.examDate)}</TableCell>
                        <TableCell>
                          {record.nextExamDate ? (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              {formatDate(record.nextExamDate)}
                            </div>
                          ) : '-'}
                        </TableCell>
                        <TableCell>{record.physicianName}</TableCell>
                        <TableCell>
                          <Badge className={RESULT_COLORS[record.result]}>
                            {RESULT_LABELS[record.result]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {canEditRecord(record) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={(e) => handleDeleteRecord(record, e)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aşı Takibi */}
        <TabsContent value="vaccinations" className="space-y-4">
          <div className="flex items-center justify-end">
            <Button onClick={() => setVaccinationDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Yeni Aşı
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Personel</TableHead>
                    <TableHead>Aşı Türü</TableHead>
                    <TableHead>Aşı Tarihi</TableHead>
                    <TableHead>Doz No</TableHead>
                    <TableHead>Sonraki Doz</TableHead>
                    <TableHead>Uygulayan</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vaccinations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Kayıt bulunamadı
                      </TableCell>
                    </TableRow>
                  ) : (
                    vaccinations.map((vac) => {
                      const canDeleteVac = (() => {
                        if (!session?.user) return false;
                        const role = (session.user as any).role || '';
                        const adminRoles = ['Admin', 'Yönetici', 'admin', 'Strateji Ofisi'];
                        if (adminRoles.some(r => role.toLowerCase() === r.toLowerCase())) return true;
                        return session.user.id === vac.createdBy?.id;
                      })();
                      return (
                        <TableRow key={vac.id}>
                          <TableCell>
                            {vac.user?.name} {vac.user?.surname}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {VACCINE_TYPE_LABELS[vac.vaccineType] || vac.vaccineType}
                            </Badge>
                            {vac.vaccineName && <span className="ml-2 text-sm text-muted-foreground">{vac.vaccineName}</span>}
                          </TableCell>
                          <TableCell>{formatDate(vac.vaccineDate)}</TableCell>
                          <TableCell>{vac.doseNumber}. Doz</TableCell>
                          <TableCell>
                            {vac.nextDoseDate ? formatDate(vac.nextDoseDate) : '-'}
                          </TableCell>
                          <TableCell>{vac.administeredBy || '-'}</TableCell>
                          <TableCell>
                            {canDeleteVac && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={(e) => handleDeleteVaccination(vac.id, e)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Sağlık Kaydı Dialog */}
      <Dialog open={recordDialogOpen} onOpenChange={setRecordDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Yeni Sağlık Kaydı</DialogTitle>
            <DialogDescription>Personel sağlık muayene bilgilerini girin</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>İsim Soyisim *</Label>
                <Input
                  value={recordForm.personName}
                  onChange={(e) => setRecordForm({ ...recordForm, personName: e.target.value })}
                  placeholder="İsim Soyisim girin"
                />
              </div>
              <div className="space-y-2">
                <Label>Görev</Label>
                <Input
                  value={recordForm.personDuty}
                  onChange={(e) => setRecordForm({ ...recordForm, personDuty: e.target.value })}
                  placeholder="Görev girin"
                />
              </div>
              <div className="space-y-2">
                <Label>Departman</Label>
                <Select
                  value={recordForm.personDepartmentId}
                  onValueChange={(v) => setRecordForm({ ...recordForm, personDepartmentId: v })}
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
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Muayene Türü *</Label>
                <Select value={recordForm.examType} onValueChange={(v) => setRecordForm({ ...recordForm, examType: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(EXAM_TYPE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sonuç *</Label>
                <Select value={recordForm.result} onValueChange={(v) => setRecordForm({ ...recordForm, result: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(RESULT_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Muayene Tarihi *</Label>
                <Input type="date" value={recordForm.examDate} onChange={(e) => setRecordForm({ ...recordForm, examDate: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Sonraki Muayene Tarihi</Label>
                <Input type="date" value={recordForm.nextExamDate} onChange={(e) => setRecordForm({ ...recordForm, nextExamDate: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Hekim Adı *</Label>
                <Input value={recordForm.physicianName} onChange={(e) => setRecordForm({ ...recordForm, physicianName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Kurum</Label>
                <Input value={recordForm.institution} onChange={(e) => setRecordForm({ ...recordForm, institution: e.target.value })} />
              </div>
            </div>
            {recordForm.result === 'KISITLI_UYGUN' && (
              <div className="space-y-2">
                <Label>Kısıtlamalar</Label>
                <Textarea value={recordForm.restrictions} onChange={(e) => setRecordForm({ ...recordForm, restrictions: e.target.value })} rows={2} />
              </div>
            )}
            <div className="space-y-2">
              <Label>Notlar</Label>
              <Textarea value={recordForm.notes} onChange={(e) => setRecordForm({ ...recordForm, notes: e.target.value })} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Rapor Dokümanı</Label>
              <div className="border-2 border-dashed rounded-lg p-4">
                {reportFile ? (
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{reportFile.name}</span>
                    <Button variant="ghost" size="sm" onClick={() => setReportFile(null)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Rapor yükle</span>
                    <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setReportFile(e.target.files?.[0] || null)} />
                  </label>
                )}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRecordDialogOpen(false)}>İptal</Button>
            <Button onClick={handleCreateRecord} disabled={creating}>
              {creating ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sağlık Kaydı Düzenleme Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sağlık Kaydını Düzenle</DialogTitle>
            <DialogDescription>{selectedRecord?.code} kodlu kaydı düzenliyorsunuz</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>İsim Soyisim *</Label>
                <Input
                  value={editForm.personName}
                  onChange={(e) => setEditForm({ ...editForm, personName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Görev</Label>
                <Input
                  value={editForm.personDuty}
                  onChange={(e) => setEditForm({ ...editForm, personDuty: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Departman</Label>
                <Select
                  value={editForm.personDepartmentId || '__none__'}
                  onValueChange={(v) => setEditForm({ ...editForm, personDepartmentId: v === '__none__' ? '' : v })}
                >
                  <SelectTrigger><SelectValue placeholder="Departman seçin" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Seçilmedi</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Muayene Türü *</Label>
                <Select value={editForm.examType} onValueChange={(v) => setEditForm({ ...editForm, examType: v })}>
                  <SelectTrigger><SelectValue placeholder="Seçin" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(EXAM_TYPE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sonuç *</Label>
                <Select value={editForm.result} onValueChange={(v) => setEditForm({ ...editForm, result: v })}>
                  <SelectTrigger><SelectValue placeholder="Seçin" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(RESULT_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Muayene Tarihi *</Label>
                <Input type="date" value={editForm.examDate} onChange={(e) => setEditForm({ ...editForm, examDate: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Sonraki Muayene Tarihi</Label>
                <Input type="date" value={editForm.nextExamDate} onChange={(e) => setEditForm({ ...editForm, nextExamDate: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Hekim Adı *</Label>
                <Input value={editForm.physicianName} onChange={(e) => setEditForm({ ...editForm, physicianName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Kurum</Label>
                <Input value={editForm.institution} onChange={(e) => setEditForm({ ...editForm, institution: e.target.value })} />
              </div>
            </div>
            {editForm.result === 'KISITLI_UYGUN' && (
              <div className="space-y-2">
                <Label>Kısıtlamalar</Label>
                <Textarea value={editForm.restrictions} onChange={(e) => setEditForm({ ...editForm, restrictions: e.target.value })} rows={2} />
              </div>
            )}
            <div className="space-y-2">
              <Label>Notlar</Label>
              <Textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} rows={2} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>İptal</Button>
            <Button onClick={handleUpdateRecord} disabled={updating}>
              {updating ? 'Kaydediliyor...' : 'Güncelle'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Aşı Kaydı Dialog */}
      <Dialog open={vaccinationDialogOpen} onOpenChange={setVaccinationDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Yeni Aşı Kaydı</DialogTitle>
            <DialogDescription>Aşı bilgilerini girin</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Personel *</Label>
              <Select
                value={vaccinationForm.userId || '__none__'}
                onValueChange={(v) => setVaccinationForm({ ...vaccinationForm, userId: v === '__none__' ? '' : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Personel seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Personel seçin</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name} {u.surname}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Aşı Türü *</Label>
                <Select value={vaccinationForm.vaccineType} onValueChange={(v) => setVaccinationForm({ ...vaccinationForm, vaccineType: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(VACCINE_TYPE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Aşı Adı</Label>
                <Input value={vaccinationForm.vaccineName} onChange={(e) => setVaccinationForm({ ...vaccinationForm, vaccineName: e.target.value })} placeholder="Örn: Biontech" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Aşı Tarihi *</Label>
                <Input type="date" value={vaccinationForm.vaccineDate} onChange={(e) => setVaccinationForm({ ...vaccinationForm, vaccineDate: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Doz Numarası</Label>
                <Input type="number" min="1" value={vaccinationForm.doseNumber} onChange={(e) => setVaccinationForm({ ...vaccinationForm, doseNumber: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Sonraki Doz Tarihi</Label>
              <Input type="date" value={vaccinationForm.nextDoseDate} onChange={(e) => setVaccinationForm({ ...vaccinationForm, nextDoseDate: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Uygulayan</Label>
                <Input value={vaccinationForm.administeredBy} onChange={(e) => setVaccinationForm({ ...vaccinationForm, administeredBy: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Lot No</Label>
                <Input value={vaccinationForm.batchNumber} onChange={(e) => setVaccinationForm({ ...vaccinationForm, batchNumber: e.target.value })} />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setVaccinationDialogOpen(false)}>İptal</Button>
            <Button onClick={handleCreateVaccination} disabled={creating}>
              {creating ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
