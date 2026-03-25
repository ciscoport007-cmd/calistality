'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
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
  Siren,
  Search,
  Plus,
  FileText,
  ClipboardCheck,
  Eye,
  Upload,
  X,
  Calendar,
  Clock,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/export-utils';

interface EmergencyPlan {
  id: string;
  code: string;
  type: string;
  title: string;
  description: string;
  procedures: string;
  status: string;
  version: string;
  validFrom?: string;
  validUntil?: string;
  createdBy: { id: string; name: string; surname?: string };
  _count: { drills: number };
}

interface EmergencyDrill {
  id: string;
  code: string;
  plan: { id: string; code: string; title: string; type: string };
  title: string;
  drillDate: string;
  duration?: number;
  participantCount?: number;
  departments?: string;
  result?: string;
  findings?: string;
  improvements?: string;
  createdBy: { id: string; name: string; surname?: string };
}

const EMERGENCY_TYPE_LABELS: Record<string, string> = {
  YANGIN: 'Yangın',
  DEPREM: 'Deprem',
  TAHLIYE: 'Tahliye',
  KIMYASAL_SIZINTI: 'Kimyasal Sızıntı',
  ELEKTRIK_KESINTISI: 'Elektrik Kesintisi',
  SU_BASKINI: 'Su Baskını',
  DOGAL_AFET: 'Doğal Afet',
  SAGLIK_ACIL: 'Sağlık Acil Durumu',
  GUVENLIK: 'Güvenlik Acil Durumu',
  DIGER: 'Diğer',
};

const PLAN_STATUS_LABELS: Record<string, string> = {
  TASLAK: 'Taslak',
  AKTIF: 'Aktif',
  GUNCELLENIYOR: 'Güncelleniyor',
  ARSIV: 'Arşiv',
};

const PLAN_STATUS_COLORS: Record<string, string> = {
  TASLAK: 'bg-gray-100 text-gray-800',
  AKTIF: 'bg-green-100 text-green-800',
  GUNCELLENIYOR: 'bg-yellow-100 text-yellow-800',
  ARSIV: 'bg-slate-100 text-slate-800',
};

const DRILL_RESULT_LABELS: Record<string, string> = {
  BASARILI: 'Başarılı',
  KISMEN_BASARILI: 'Kısmen Başarılı',
  BASARISIZ: 'Başarısız',
};

const DRILL_RESULT_COLORS: Record<string, string> = {
  BASARILI: 'bg-green-100 text-green-800',
  KISMEN_BASARILI: 'bg-yellow-100 text-yellow-800',
  BASARISIZ: 'bg-red-100 text-red-800',
};

export default function OHSEmergencyPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<EmergencyPlan[]>([]);
  const [drills, setDrills] = useState<EmergencyDrill[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('plans');
  
  // Dialog states
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [drillDialogOpen, setDrillDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  
  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Plan Form
  const [planForm, setPlanForm] = useState({
    type: '',
    title: '',
    description: '',
    procedures: '',
    evacuationRoutes: '',
    assemblyPoints: '',
    responsiblePersons: '',
    emergencyContacts: '',
    status: 'TASLAK',
    version: '1.0',
    validFrom: '',
    validUntil: '',
  });
  const [planDocument, setPlanDocument] = useState<File | null>(null);
  
  // Drill Form
  const [drillForm, setDrillForm] = useState({
    planId: '',
    title: '',
    drillDate: '',
    duration: '',
    participantCount: '',
    departments: '',
    result: '',
    findings: '',
    improvements: '',
  });
  const [drillReport, setDrillReport] = useState<File | null>(null);

  useEffect(() => {
    fetchPlans();
    fetchDrills();
  }, [search, typeFilter, statusFilter]);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (typeFilter && typeFilter !== 'all') params.set('type', typeFilter);
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);

      const response = await fetch(`/api/ohs/emergency/plans?${params}`);
      if (response.ok) {
        const data = await response.json();
        setPlans(Array.isArray(data) ? data : []);
      } else {
        setPlans([]);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDrills = async () => {
    try {
      const response = await fetch('/api/ohs/emergency/drills');
      if (response.ok) {
        const data = await response.json();
        setDrills(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    }
  };

  const handleCreatePlan = async () => {
    if (!planForm.type || !planForm.title || !planForm.description || !planForm.procedures) {
      toast.error('Lütfen zorunlu alanları doldurun');
      return;
    }

    try {
      setCreating(true);
      let documentData = {};

      if (planDocument) {
        const presignedResponse = await fetch('/api/upload/presigned', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: planDocument.name,
            contentType: planDocument.type,
            isPublic: false,
          }),
        });

        if (presignedResponse.ok) {
          const { uploadUrl, cloud_storage_path } = await presignedResponse.json();
          await fetch(uploadUrl, {
            method: 'PUT',
            body: planDocument,
            headers: { 'Content-Type': planDocument.type },
          });

          documentData = {
            documentFileName: planDocument.name,
            documentFileSize: planDocument.size,
            documentFileType: planDocument.type,
            documentCloudPath: cloud_storage_path,
            documentIsPublic: false,
          };
        }
      }

      const response = await fetch('/api/ohs/emergency/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...planForm, ...documentData }),
      });

      if (response.ok) {
        toast.success('Acil durum planı oluşturuldu');
        setPlanDialogOpen(false);
        setPlanForm({
          type: '', title: '', description: '', procedures: '',
          evacuationRoutes: '', assemblyPoints: '', responsiblePersons: '',
          emergencyContacts: '', status: 'TASLAK', version: '1.0',
          validFrom: '', validUntil: '',
        });
        setPlanDocument(null);
        fetchPlans();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Plan oluşturulamadı');
      }
    } catch (error) {
      console.error('Create error:', error);
      toast.error('Hata oluştu');
    } finally {
      setCreating(false);
    }
  };

  const handleCreateDrill = async () => {
    if (!drillForm.planId || !drillForm.title || !drillForm.drillDate) {
      toast.error('Lütfen zorunlu alanları doldurun');
      return;
    }

    try {
      setCreating(true);
      let reportData = {};

      if (drillReport) {
        const presignedResponse = await fetch('/api/upload/presigned', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: drillReport.name,
            contentType: drillReport.type,
            isPublic: false,
          }),
        });

        if (presignedResponse.ok) {
          const { uploadUrl, cloud_storage_path } = await presignedResponse.json();
          await fetch(uploadUrl, {
            method: 'PUT',
            body: drillReport,
            headers: { 'Content-Type': drillReport.type },
          });

          reportData = {
            reportFileName: drillReport.name,
            reportFileSize: drillReport.size,
            reportFileType: drillReport.type,
            reportCloudPath: cloud_storage_path,
            reportIsPublic: false,
          };
        }
      }

      const response = await fetch('/api/ohs/emergency/drills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...drillForm,
          duration: drillForm.duration ? parseInt(drillForm.duration) : null,
          participantCount: drillForm.participantCount ? parseInt(drillForm.participantCount) : null,
          ...reportData,
        }),
      });

      if (response.ok) {
        toast.success('Tatbikat kaydı oluşturuldu');
        setDrillDialogOpen(false);
        setDrillForm({
          planId: '', title: '', drillDate: '', duration: '',
          participantCount: '', departments: '', result: '',
          findings: '', improvements: '',
        });
        setDrillReport(null);
        fetchDrills();
        fetchPlans();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Tatbikat oluşturulamadı');
      }
    } catch (error) {
      console.error('Create error:', error);
      toast.error('Hata oluştu');
    } finally {
      setCreating(false);
    }
  };

  const activePlans = plans.filter(p => p.status === 'AKTIF');

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Siren className="w-7 h-7 text-cyan-600" />
            Acil Durum Yönetimi
          </h1>
          <p className="text-muted-foreground">
            Acil durum planları ve tatbikat kayıtları
          </p>
        </div>
      </div>

      {/* Özet Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Aktif Planlar</p>
                <p className="text-2xl font-bold">{activePlans.length}</p>
              </div>
              <FileText className="w-8 h-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Toplam Plan</p>
                <p className="text-2xl font-bold">{plans.length}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tatbikat Sayısı</p>
                <p className="text-2xl font-bold">{drills.length}</p>
              </div>
              <ClipboardCheck className="w-8 h-8 text-purple-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="plans" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Acil Durum Planları
          </TabsTrigger>
          <TabsTrigger value="drills" className="flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4" />
            Tatbikat Kayıtları
          </TabsTrigger>
        </TabsList>

        {/* Planlar */}
        <TabsContent value="plans" className="space-y-4">
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
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Tür" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  {Object.entries(EMERGENCY_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Durum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  {Object.entries(PLAN_STATUS_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setPlanDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Yeni Plan
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kod</TableHead>
                    <TableHead>Tür</TableHead>
                    <TableHead>Başlık</TableHead>
                    <TableHead>Versiyon</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Tatbikat</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Yükleniyor...
                      </TableCell>
                    </TableRow>
                  ) : plans.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Plan bulunamadı
                      </TableCell>
                    </TableRow>
                  ) : (
                    plans.map((plan) => (
                      <TableRow key={plan.id}>
                        <TableCell className="font-mono text-sm">{plan.code}</TableCell>
                        <TableCell>{EMERGENCY_TYPE_LABELS[plan.type] || plan.type}</TableCell>
                        <TableCell className="font-medium">{plan.title}</TableCell>
                        <TableCell>v{plan.version}</TableCell>
                        <TableCell>
                          <Badge className={PLAN_STATUS_COLORS[plan.status]}>
                            {PLAN_STATUS_LABELS[plan.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>{plan._count.drills} tatbikat</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => router.push(`/dashboard/ohs/emergency/${plan.id}`)}
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
        </TabsContent>

        {/* Tatbikatlar */}
        <TabsContent value="drills" className="space-y-4">
          <div className="flex items-center justify-end">
            <Button onClick={() => setDrillDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Yeni Tatbikat
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kod</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Başlık</TableHead>
                    <TableHead>Tarih</TableHead>
                    <TableHead>Süre</TableHead>
                    <TableHead>Katılımcı</TableHead>
                    <TableHead>Sonuç</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drills.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Tatbikat bulunamadı
                      </TableCell>
                    </TableRow>
                  ) : (
                    drills.map((drill) => (
                      <TableRow key={drill.id}>
                        <TableCell className="font-mono text-sm">{drill.code}</TableCell>
                        <TableCell>
                          <span className="text-muted-foreground">{drill.plan.code}</span>
                          <span className="ml-2">{drill.plan.title}</span>
                        </TableCell>
                        <TableCell className="font-medium">{drill.title}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            {formatDate(drill.drillDate)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {drill.duration ? (
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4 text-muted-foreground" />
                              {drill.duration} dk
                            </div>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          {drill.participantCount ? (
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4 text-muted-foreground" />
                              {drill.participantCount}
                            </div>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          {drill.result ? (
                            <Badge className={DRILL_RESULT_COLORS[drill.result]}>
                              {DRILL_RESULT_LABELS[drill.result]}
                            </Badge>
                          ) : (
                            <Badge variant="outline">Değerlendirilmedi</Badge>
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
      </Tabs>

      {/* Yeni Plan Dialog */}
      <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Yeni Acil Durum Planı</DialogTitle>
            <DialogDescription>Acil durum planı bilgilerini girin</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Acil Durum Türü *</Label>
                <Select value={planForm.type} onValueChange={(v) => setPlanForm({ ...planForm, type: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(EMERGENCY_TYPE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Plan Başlığı *</Label>
                <Input value={planForm.title} onChange={(e) => setPlanForm({ ...planForm, title: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Plan Açıklaması *</Label>
              <Textarea value={planForm.description} onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Acil Durum Prosedürleri *</Label>
              <Textarea value={planForm.procedures} onChange={(e) => setPlanForm({ ...planForm, procedures: e.target.value })} rows={4} placeholder="Adım adım yapılacaklar..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tahliye Güzergahları</Label>
                <Textarea value={planForm.evacuationRoutes} onChange={(e) => setPlanForm({ ...planForm, evacuationRoutes: e.target.value })} rows={2} />
              </div>
              <div className="space-y-2">
                <Label>Toplanma Noktaları</Label>
                <Textarea value={planForm.assemblyPoints} onChange={(e) => setPlanForm({ ...planForm, assemblyPoints: e.target.value })} rows={2} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sorumlu Kişiler/Ekipler</Label>
                <Textarea value={planForm.responsiblePersons} onChange={(e) => setPlanForm({ ...planForm, responsiblePersons: e.target.value })} rows={2} />
              </div>
              <div className="space-y-2">
                <Label>Acil İletişim Numaraları</Label>
                <Textarea value={planForm.emergencyContacts} onChange={(e) => setPlanForm({ ...planForm, emergencyContacts: e.target.value })} rows={2} />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Durum</Label>
                <Select value={planForm.status} onValueChange={(v) => setPlanForm({ ...planForm, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PLAN_STATUS_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Versiyon</Label>
                <Input value={planForm.version} onChange={(e) => setPlanForm({ ...planForm, version: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Geçerlilik Başlangıcı</Label>
                <Input type="date" value={planForm.validFrom} onChange={(e) => setPlanForm({ ...planForm, validFrom: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Geçerlilik Bitişi</Label>
                <Input type="date" value={planForm.validUntil} onChange={(e) => setPlanForm({ ...planForm, validUntil: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Plan Dokümanı</Label>
              <div className="border-2 border-dashed rounded-lg p-4">
                {planDocument ? (
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{planDocument.name}</span>
                    <Button variant="ghost" size="sm" onClick={() => setPlanDocument(null)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Doküman yükle</span>
                    <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={(e) => setPlanDocument(e.target.files?.[0] || null)} />
                  </label>
                )}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPlanDialogOpen(false)}>İptal</Button>
            <Button onClick={handleCreatePlan} disabled={creating}>
              {creating ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Yeni Tatbikat Dialog */}
      <Dialog open={drillDialogOpen} onOpenChange={setDrillDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Yeni Tatbikat Kaydı</DialogTitle>
            <DialogDescription>Tatbikat bilgilerini girin</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Acil Durum Planı *</Label>
              <Select value={drillForm.planId} onValueChange={(v) => setDrillForm({ ...drillForm, planId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Plan seçin" />
                </SelectTrigger>
                <SelectContent>
                  {plans.filter(p => p.status === 'AKTIF').map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.code} - {plan.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tatbikat Başlığı *</Label>
                <Input value={drillForm.title} onChange={(e) => setDrillForm({ ...drillForm, title: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Tatbikat Tarihi *</Label>
                <Input type="datetime-local" value={drillForm.drillDate} onChange={(e) => setDrillForm({ ...drillForm, drillDate: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Süre (dk)</Label>
                <Input type="number" min="1" value={drillForm.duration} onChange={(e) => setDrillForm({ ...drillForm, duration: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Katılımcı Sayısı</Label>
                <Input type="number" min="1" value={drillForm.participantCount} onChange={(e) => setDrillForm({ ...drillForm, participantCount: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Sonuç</Label>
                <Select value={drillForm.result} onValueChange={(v) => setDrillForm({ ...drillForm, result: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DRILL_RESULT_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Katılan Departmanlar</Label>
              <Input value={drillForm.departments} onChange={(e) => setDrillForm({ ...drillForm, departments: e.target.value })} placeholder="Örn: Üretim, Depo, Ofis" />
            </div>
            <div className="space-y-2">
              <Label>Bulgular</Label>
              <Textarea value={drillForm.findings} onChange={(e) => setDrillForm({ ...drillForm, findings: e.target.value })} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>İyileştirme Önerileri</Label>
              <Textarea value={drillForm.improvements} onChange={(e) => setDrillForm({ ...drillForm, improvements: e.target.value })} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Tatbikat Raporu</Label>
              <div className="border-2 border-dashed rounded-lg p-4">
                {drillReport ? (
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{drillReport.name}</span>
                    <Button variant="ghost" size="sm" onClick={() => setDrillReport(null)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Rapor yükle</span>
                    <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={(e) => setDrillReport(e.target.files?.[0] || null)} />
                  </label>
                )}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDrillDialogOpen(false)}>İptal</Button>
            <Button onClick={handleCreateDrill} disabled={creating}>
              {creating ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
