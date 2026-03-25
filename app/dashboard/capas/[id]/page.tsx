'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Save, Plus, FileUp, Trash2, CheckCircle, Clock, AlertTriangle, XCircle, Camera, Image as ImageIcon, Eye, Download } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'sonner';

// Admin veya Yönetici rolü kontrolü
const checkIsAdmin = (role?: string): boolean => {
  if (!role) return false;
  const adminRoles = ['Admin', 'Yönetici', 'admin', 'Strateji Ofisi', 'strateji ofisi'];
  return adminRoles.some(r => role.toLowerCase() === r.toLowerCase());
};

const statusLabels: Record<string, string> = {
  TASLAK: 'Taslak',
  ACIK: 'Açık',
  KOK_NEDEN_ANALIZI: 'Kök Neden Analizi',
  AKSIYON_PLANLAMA: 'Aksiyon Planlama',
  UYGULAMA: 'Uygulama',
  DOGRULAMA: 'Doğrulama',
  KAPATILDI: 'Kapatıldı',
  IPTAL_EDILDI: 'İptal Edildi',
};

const statusColors: Record<string, string> = {
  TASLAK: 'bg-gray-100 text-gray-800',
  ACIK: 'bg-blue-100 text-blue-800',
  KOK_NEDEN_ANALIZI: 'bg-purple-100 text-purple-800',
  AKSIYON_PLANLAMA: 'bg-yellow-100 text-yellow-800',
  UYGULAMA: 'bg-orange-100 text-orange-800',
  DOGRULAMA: 'bg-cyan-100 text-cyan-800',
  KAPATILDI: 'bg-green-100 text-green-800',
  IPTAL_EDILDI: 'bg-red-100 text-red-800',
};

const typeLabels: Record<string, string> = {
  DUZELTICI: 'Düzeltici',
  ONLEYICI: 'Önleyici',
  IYILESTIRME: 'İyileştirme',
};

const typeColors: Record<string, string> = {
  DUZELTICI: 'bg-red-100 text-red-800',
  ONLEYICI: 'bg-blue-100 text-blue-800',
  IYILESTIRME: 'bg-green-100 text-green-800',
};

const sourceLabels: Record<string, string> = {
  SIKAYET: 'Misafir Şikayeti',
  DENETIM: 'Denetim',
  RISK: 'Risk',
  OLAY: 'Olay/Kaza',
  ONERI: 'Öneri',
  YASAL: 'Yasal',
  PROSES: 'Proses',
  DIGER: 'Diğer',
};

const priorityLabels: Record<string, string> = {
  DUSUK: 'Düşük',
  ORTA: 'Orta',
  YUKSEK: 'Yüksek',
  KRITIK: 'Kritik',
};

const priorityColors: Record<string, string> = {
  DUSUK: 'bg-gray-100 text-gray-800',
  ORTA: 'bg-blue-100 text-blue-800',
  YUKSEK: 'bg-orange-100 text-orange-800',
  KRITIK: 'bg-red-100 text-red-800',
};

const actionStatusLabels: Record<string, string> = {
  ACIK: 'Açık',
  DEVAM_EDIYOR: 'Devam Ediyor',
  TAMAMLANDI: 'Tamamlandı',
  IPTAL: 'İptal',
};

const rootCauseMethods = [
  '5 Neden (5 Why)',
  'Balık Kılçığı (Ishikawa)',
  'Pareto Analizi',
  'FMEA',
  '8D',
  'Diğer',
];

export default function CAPADetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { data: session } = useSession() || {};
  const isUserAdmin = checkIsAdmin(session?.user?.role);
  const [capa, setCapa] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [isActionOpen, setIsActionOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [actionForm, setActionForm] = useState({
    title: '',
    description: '',
    assigneeId: '',
    priority: 'ORTA',
    dueDate: '',
  });

  const fetchCapa = async () => {
    try {
      const res = await fetch(`/api/capas/${id}`);
      const data = await res.json();
      setCapa(data);
      setFormData({
        title: data.title,
        description: data.description,
        type: data.type,
        source: data.source,
        priority: data.priority,
        status: data.status,
        responsibleUserId: data.responsibleUserId || '',
        teamId: data.teamId || '',
        departmentId: data.departmentId || '',
        rootCauseAnalysis: data.rootCauseAnalysis || '',
        rootCauseMethod: data.rootCauseMethod || '',
        actionPlan: data.actionPlan || '',
        expectedCompletion: data.expectedCompletion ? data.expectedCompletion.split('T')[0] : '',
        implementationNotes: data.implementationNotes || '',
        effectivenessReview: data.effectivenessReview || '',
        isEffective: data.isEffective,
        dueDate: data.dueDate ? data.dueDate.split('T')[0] : '',
      });
    } catch (error) {
      console.error('CAPA detay hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFormData = async () => {
    try {
      const [usersRes, deptsRes, groupsRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/departments'),
        fetch('/api/groups'),
      ]);
      const [usersData, deptsData, groupsData] = await Promise.all([
        usersRes.json(),
        deptsRes.json(),
        groupsRes.json(),
      ]);
      setUsers(usersData.users || []);
      setDepartments(deptsData.departments || []);
      setGroups(groupsData.groups || []);
    } catch (error) {
      console.error('Form verisi hatası:', error);
    }
  };

  useEffect(() => {
    fetchCapa();
    fetchFormData();
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/capas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        await fetchCapa();
        setEditMode(false);
      }
    } catch (error) {
      console.error('CAPA güncelleme hatası:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/capas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        toast.success('Durum başarıyla güncellendi');
        await fetchCapa();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Durum güncellenirken bir hata oluştu');
      }
    } catch (error) {
      console.error('Durum güncelleme hatası:', error);
      toast.error('Durum güncellenirken bir hata oluştu');
    }
  };

  const handleAddAction = async () => {
    try {
      const res = await fetch(`/api/capas/${id}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(actionForm),
      });
      if (res.ok) {
        setIsActionOpen(false);
        setActionForm({ title: '', description: '', assigneeId: '', priority: 'ORTA', dueDate: '' });
        await fetchCapa();
      }
    } catch (error) {
      console.error('Aksiyon ekleme hatası:', error);
    }
  };

  const handleActionStatusChange = async (actionId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/capas/${id}/actions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionId, status: newStatus }),
      });
      if (res.ok) {
        await fetchCapa();
      }
    } catch (error) {
      console.error('Aksiyon güncelleme hatası:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const res = await fetch(`/api/capas/${id}/attachments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          fileSize: file.size,
          attachmentType: 'GENEL',
        }),
      });
      const data = await res.json();

      // Presigned URL'e dosya yükle
      const hasContentDisposition = data.uploadUrl.includes('content-disposition');
      const headers: Record<string, string> = { 'Content-Type': file.type };
      if (hasContentDisposition) {
        headers['Content-Disposition'] = 'attachment';
      }

      await fetch(data.uploadUrl, {
        method: 'PUT',
        headers,
        body: file,
      });

      await fetchCapa();
    } catch (error) {
      console.error('Dosya yükleme hatası:', error);
    }
  };

  const handleEvidenceUpload = async (file: File) => {
    try {
      const res = await fetch(`/api/capas/${id}/attachments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          fileSize: file.size,
          attachmentType: 'KANIT',
        }),
      });
      const data = await res.json();

      // Presigned URL'e dosya yükle
      const hasContentDisposition = data.uploadUrl.includes('content-disposition');
      const headers: Record<string, string> = { 'Content-Type': file.type };
      if (hasContentDisposition) {
        headers['Content-Disposition'] = 'attachment';
      }

      await fetch(data.uploadUrl, {
        method: 'PUT',
        headers,
        body: file,
      });

      await fetchCapa();
    } catch (error) {
      console.error('Kanıt görseli yükleme hatası:', error);
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Yükleniyor...</div>;
  }

  if (!capa) {
    return <div className="p-6 text-center">CAPA bulunamadı</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/dashboard/capas')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Geri
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{capa.code}</h1>
              <Badge className={typeColors[capa.type]}>{typeLabels[capa.type]}</Badge>
              <Badge className={statusColors[capa.status]}>{statusLabels[capa.status]}</Badge>
              <Badge className={priorityColors[capa.priority]}>{priorityLabels[capa.priority]}</Badge>
            </div>
            <p className="text-sm text-gray-500 mt-1">{capa.title}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {editMode ? (
            <>
              <Button variant="outline" onClick={() => setEditMode(false)}>Vazgeç</Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </Button>
            </>
          ) : (
            <Button onClick={() => setEditMode(true)}>Düzenle</Button>
          )}
        </div>
      </div>

      {/* Durum Akışı */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Durum Akışı</CardTitle>
        </CardHeader>
        <CardContent>
          {isUserAdmin ? (
            <div className="space-y-3">
              <div className="flex gap-2 flex-wrap">
                {Object.entries(statusLabels).filter(([key]) => key !== 'IPTAL_EDILDI').map(([value, label]) => (
                  <Button
                    key={value}
                    variant={capa.status === value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleStatusChange(value)}
                    disabled={capa.status === 'KAPATILDI' || capa.status === 'IPTAL_EDILDI'}
                  >
                    {label}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-gray-500">
                İleri veya geri herhangi bir duruma geçiş yapabilirsiniz.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2 flex-wrap">
                {Object.entries(statusLabels).filter(([key]) => key !== 'IPTAL_EDILDI').map(([value, label]) => (
                  <Badge
                    key={value}
                    variant={capa.status === value ? 'default' : 'outline'}
                    className={capa.status === value ? statusColors[value] : 'bg-gray-50 text-gray-400'}
                  >
                    {label}
                  </Badge>
                ))}
              </div>
              <p className="text-sm text-amber-600">
                Durum değişikliği yapma yetkiniz bulunmamaktadır. Sadece Admin veya Yönetici bu işlemi yapabilir.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Detaylar</TabsTrigger>
          <TabsTrigger value="evidence">Kanıt Görselleri ({capa.attachments?.filter((a: any) => a.attachmentType === 'KANIT').length || 0})</TabsTrigger>
          <TabsTrigger value="rootcause">Kök Neden Analizi</TabsTrigger>
          <TabsTrigger value="actions">Aksiyonlar ({capa.actions?.length || 0})</TabsTrigger>
          <TabsTrigger value="effectiveness">Etkinlik Değerlendirme</TabsTrigger>
          <TabsTrigger value="files">Dosyalar ({capa.attachments?.filter((a: any) => a.attachmentType !== 'KANIT').length || 0})</TabsTrigger>
          <TabsTrigger value="history">Tarihçe</TabsTrigger>
        </TabsList>

        {/* Detaylar */}
        <TabsContent value="details">
          <Card>
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm text-gray-500">Başlık</Label>
                    {editMode ? (
                      <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
                    ) : (
                      <p className="font-medium">{capa.title}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">Açıklama</Label>
                    {editMode ? (
                      <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={4} />
                    ) : (
                      <p className="text-gray-700 whitespace-pre-wrap">{capa.description}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-gray-500">Tür</Label>
                      {editMode ? (
                        <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(typeLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="font-medium">{typeLabels[capa.type]}</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-sm text-gray-500">Kaynak</Label>
                      {editMode ? (
                        <Select value={formData.source} onValueChange={(v) => setFormData({ ...formData, source: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(sourceLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="font-medium">{sourceLabels[capa.source]}</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm text-gray-500">Sorumlu Kişi</Label>
                    {editMode ? (
                      <Select value={formData.responsibleUserId} onValueChange={(v) => setFormData({ ...formData, responsibleUserId: v })}>
                        <SelectTrigger><SelectValue placeholder="Seçin" /></SelectTrigger>
                        <SelectContent>
                          {users.map((u) => (
                            <SelectItem key={u.id} value={u.id}>{u.name} {u.surname}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="font-medium">
                        {capa.responsibleUser ? `${capa.responsibleUser.name} ${capa.responsibleUser.surname || ''}` : '-'}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">Departman</Label>
                    {editMode ? (
                      <Select value={formData.departmentId} onValueChange={(v) => setFormData({ ...formData, departmentId: v })}>
                        <SelectTrigger><SelectValue placeholder="Seçin" /></SelectTrigger>
                        <SelectContent>
                          {departments.map((d) => (
                            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="font-medium">{capa.department?.name || '-'}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">Hedef Tarih</Label>
                    {editMode ? (
                      <Input type="date" value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} />
                    ) : (
                      <p className="font-medium">
                        {capa.dueDate ? format(new Date(capa.dueDate), 'dd MMMM yyyy', { locale: tr }) : '-'}
                      </p>
                    )}
                  </div>
                  {capa.complaint && (
                    <div>
                      <Label className="text-sm text-gray-500">İlgili Şikayet</Label>
                      <p className="font-medium text-blue-600 cursor-pointer" onClick={() => router.push(`/dashboard/complaints/${capa.complaint.id}`)}>
                        {capa.complaint.code} - {capa.complaint.subject}
                      </p>
                    </div>
                  )}
                  <div>
                    <Label className="text-sm text-gray-500">Oluşturulma</Label>
                    <p className="font-medium">
                      {format(new Date(capa.createdAt), 'dd MMMM yyyy HH:mm', { locale: tr })}
                      <span className="text-gray-500 font-normal"> - {capa.createdBy?.name}</span>
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Kanıt Görselleri */}
        <TabsContent value="evidence">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5 text-orange-500" />
                  Kanıt Görselleri
                </CardTitle>
                <CardDescription>Uygunsuzluğa ait kanıt fotoğrafları ve görseller</CardDescription>
              </div>
              <div>
                <Input 
                  type="file" 
                  id="evidenceUpload" 
                  className="hidden" 
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    handleEvidenceUpload(file);
                  }} 
                />
                <Button onClick={() => document.getElementById('evidenceUpload')?.click()}>
                  <Camera className="h-4 w-4 mr-2" />
                  Kanıt Görseli Ekle
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {capa.attachments?.filter((a: any) => a.attachmentType === 'KANIT').length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                  <ImageIcon className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500 mb-2">Henüz kanıt görseli eklenmemiş</p>
                  <p className="text-sm text-gray-400">Uygunsuzluğu belgeleyen fotoğrafları buraya yükleyin</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {capa.attachments?.filter((a: any) => a.attachmentType === 'KANIT').map((att: any) => (
                    <div key={att.id} className="relative group border rounded-lg overflow-hidden bg-gray-50">
                      <div className="aspect-square relative">
                        {att.fileType?.startsWith('image/') ? (
                          <img 
                            src={att.url} 
                            alt={att.fileName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-100">
                            <ImageIcon className="h-12 w-12 text-gray-400" />
                          </div>
                        )}
                        {/* Overlay on hover */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <Button size="sm" variant="secondary" onClick={() => window.open(att.url, '_blank')}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <a href={att.url} download={att.fileName}>
                            <Button size="sm" variant="secondary">
                              <Download className="h-4 w-4" />
                            </Button>
                          </a>
                        </div>
                      </div>
                      <div className="p-2">
                        <p className="text-xs font-medium truncate" title={att.fileName}>{att.fileName}</p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(att.createdAt), 'dd MMM yyyy', { locale: tr })}
                        </p>
                        {att.description && (
                          <p className="text-xs text-gray-600 mt-1 truncate" title={att.description}>{att.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Kök Neden Analizi */}
        <TabsContent value="rootcause">
          <Card>
            <CardHeader>
              <CardTitle>Kök Neden Analizi</CardTitle>
              <CardDescription>Uygunsuzluğun kök nedenini belirleyin</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Kullanılan Metot</Label>
                {editMode ? (
                  <Select value={formData.rootCauseMethod} onValueChange={(v) => setFormData({ ...formData, rootCauseMethod: v })}>
                    <SelectTrigger><SelectValue placeholder="Metot seçin" /></SelectTrigger>
                    <SelectContent>
                      {rootCauseMethods.map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="font-medium">{capa.rootCauseMethod || '-'}</p>
                )}
              </div>
              <div>
                <Label>Kök Neden Analizi</Label>
                {editMode ? (
                  <Textarea
                    value={formData.rootCauseAnalysis}
                    onChange={(e) => setFormData({ ...formData, rootCauseAnalysis: e.target.value })}
                    rows={6}
                    placeholder="Kök neden analizini buraya yazın..."
                  />
                ) : (
                  <p className="whitespace-pre-wrap bg-gray-50 p-4 rounded-md">{capa.rootCauseAnalysis || 'Henüz yapılmadı'}</p>
                )}
              </div>
              <div>
                <Label>Aksiyon Planı</Label>
                {editMode ? (
                  <Textarea
                    value={formData.actionPlan}
                    onChange={(e) => setFormData({ ...formData, actionPlan: e.target.value })}
                    rows={4}
                    placeholder="Planlanan aksiyonları buraya yazın..."
                  />
                ) : (
                  <p className="whitespace-pre-wrap bg-gray-50 p-4 rounded-md">{capa.actionPlan || 'Henüz girilmedi'}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aksiyonlar */}
        <TabsContent value="actions">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Aksiyonlar</CardTitle>
                <CardDescription>CAPA kapsamındaki aksiyonları yönetin</CardDescription>
              </div>
              <Dialog open={isActionOpen} onOpenChange={setIsActionOpen}>
                <DialogTrigger asChild>
                  <Button><Plus className="h-4 w-4 mr-2" />Aksiyon Ekle</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Yeni Aksiyon</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Başlık *</Label>
                      <Input value={actionForm.title} onChange={(e) => setActionForm({ ...actionForm, title: e.target.value })} />
                    </div>
                    <div>
                      <Label>Açıklama</Label>
                      <Textarea value={actionForm.description} onChange={(e) => setActionForm({ ...actionForm, description: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Sorumlu *</Label>
                        <Select value={actionForm.assigneeId} onValueChange={(v) => setActionForm({ ...actionForm, assigneeId: v })}>
                          <SelectTrigger><SelectValue placeholder="Seçin" /></SelectTrigger>
                          <SelectContent>
                            {users.map((u) => (
                              <SelectItem key={u.id} value={u.id}>{u.name} {u.surname}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Öncelik</Label>
                        <Select value={actionForm.priority} onValueChange={(v) => setActionForm({ ...actionForm, priority: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(priorityLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label>Hedef Tarih</Label>
                      <Input type="date" value={actionForm.dueDate} onChange={(e) => setActionForm({ ...actionForm, dueDate: e.target.value })} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsActionOpen(false)}>Vazgeç</Button>
                    <Button onClick={handleAddAction} disabled={!actionForm.title || !actionForm.assigneeId}>Ekle</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {capa.actions?.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Henüz aksiyon eklenmemiş</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Başlık</TableHead>
                      <TableHead>Sorumlu</TableHead>
                      <TableHead>Öncelik</TableHead>
                      <TableHead>Hedef Tarih</TableHead>
                      <TableHead>Durum</TableHead>
                      <TableHead>İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {capa.actions?.map((action: any) => (
                      <TableRow key={action.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{action.title}</p>
                            {action.description && <p className="text-sm text-gray-500">{action.description}</p>}
                          </div>
                        </TableCell>
                        <TableCell>{action.assignee?.name} {action.assignee?.surname}</TableCell>
                        <TableCell><Badge className={priorityColors[action.priority]}>{priorityLabels[action.priority]}</Badge></TableCell>
                        <TableCell>{action.dueDate ? format(new Date(action.dueDate), 'dd MMM yyyy', { locale: tr }) : '-'}</TableCell>
                        <TableCell>
                          <Select value={action.status} onValueChange={(v) => handleActionStatusChange(action.id, v)}>
                            <SelectTrigger className="w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(actionStatusLabels).map(([value, label]) => (
                                <SelectItem key={value} value={value}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {action.status === 'ACIK' && (
                            <Button size="sm" variant="ghost" onClick={() => handleActionStatusChange(action.id, 'TAMAMLANDI')}>
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Etkinlik Değerlendirme */}
        <TabsContent value="effectiveness">
          <Card>
            <CardHeader>
              <CardTitle>Etkinlik Değerlendirmesi</CardTitle>
              <CardDescription>Yapılan aksiyonların etkinliğini değerlendirin</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Uygulama Notları</Label>
                {editMode ? (
                  <Textarea
                    value={formData.implementationNotes}
                    onChange={(e) => setFormData({ ...formData, implementationNotes: e.target.value })}
                    rows={4}
                    placeholder="Uygulama sırasındaki notlar..."
                  />
                ) : (
                  <p className="whitespace-pre-wrap bg-gray-50 p-4 rounded-md">{capa.implementationNotes || 'Henüz girilmedi'}</p>
                )}
              </div>
              <div>
                <Label>Etkinlik Değerlendirmesi</Label>
                {editMode ? (
                  <Textarea
                    value={formData.effectivenessReview}
                    onChange={(e) => setFormData({ ...formData, effectivenessReview: e.target.value })}
                    rows={4}
                    placeholder="Aksiyonların etkinlik değerlendirmesi..."
                  />
                ) : (
                  <p className="whitespace-pre-wrap bg-gray-50 p-4 rounded-md">{capa.effectivenessReview || 'Henüz değerlendirilmedi'}</p>
                )}
              </div>
              <div>
                <Label>Etkinlik Sonucu</Label>
                {editMode ? (
                  <Select value={formData.isEffective === null ? '' : String(formData.isEffective)} onValueChange={(v) => setFormData({ ...formData, isEffective: v === '' ? null : v === 'true' })}>
                    <SelectTrigger><SelectValue placeholder="Seçin" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Değerlendirilmedi</SelectItem>
                      <SelectItem value="true">Etkili</SelectItem>
                      <SelectItem value="false">Etkili Değil</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center gap-2">
                    {capa.isEffective === null ? (
                      <Badge variant="outline">Değerlendirilmedi</Badge>
                    ) : capa.isEffective ? (
                      <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Etkili</Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Etkili Değil</Badge>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dosyalar */}
        <TabsContent value="files">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Dosya Ekleri</CardTitle>
                <CardDescription>CAPA ile ilgili genel dosyalar (raporlar, belgeler vb.)</CardDescription>
              </div>
              <div>
                <Input type="file" id="fileUpload" className="hidden" onChange={handleFileUpload} />
                <Button onClick={() => document.getElementById('fileUpload')?.click()}>
                  <FileUp className="h-4 w-4 mr-2" />Dosya Yükle
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {capa.attachments?.filter((a: any) => a.attachmentType !== 'KANIT').length === 0 ? (
                <p className="text-center text-gray-500 py-8">Henüz dosya eklenmemiş</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dosya Adı</TableHead>
                      <TableHead>Boyut</TableHead>
                      <TableHead>Yükleyen</TableHead>
                      <TableHead>Tarih</TableHead>
                      <TableHead>İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {capa.attachments?.filter((a: any) => a.attachmentType !== 'KANIT').map((att: any) => (
                      <TableRow key={att.id}>
                        <TableCell>{att.fileName}</TableCell>
                        <TableCell>{(att.fileSize / 1024).toFixed(1)} KB</TableCell>
                        <TableCell>{att.uploadedBy?.name}</TableCell>
                        <TableCell>{format(new Date(att.createdAt), 'dd MMM yyyy', { locale: tr })}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" onClick={() => window.open(att.url, '_blank')}>Aç</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tarihçe */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Tarihçe</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {capa.histories?.map((h: any) => (
                  <div key={h.id} className="flex items-start gap-4 pb-4 border-b last:border-0">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                    <div className="flex-1">
                      <p className="font-medium">{h.action}</p>
                      {h.oldValue && <p className="text-sm text-gray-500">Eski: {h.oldValue}</p>}
                      {h.newValue && <p className="text-sm text-gray-500">Yeni: {h.newValue}</p>}
                      {h.comments && <p className="text-sm text-gray-600">{h.comments}</p>}
                      <p className="text-xs text-gray-400 mt-1">
                        {h.user?.name} - {format(new Date(h.createdAt), 'dd MMM yyyy HH:mm', { locale: tr })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
