'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft, Edit, Trash2, Save, Plus, UserPlus, AlertTriangle,
  CheckCircle, Clock, FileText, Upload, Download, Users, ClipboardList,
  Calendar, FileSearch, X, FileSpreadsheet, Paperclip, Eye, Image
} from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

const statusLabels: Record<string, string> = {
  PLANLI: 'Planlı',
  HAZIRLANIYOR: 'Hazırlanıyor',
  DEVAM_EDIYOR: 'Devam Ediyor',
  RAPORLANIYOR: 'Raporlanıyor',
  KAPATILDI: 'Kapatıldı',
  IPTAL_EDILDI: 'İptal Edildi',
  ERTELENDI: 'Ertelendi',
};

const statusColors: Record<string, string> = {
  PLANLI: 'bg-blue-100 text-blue-800',
  HAZIRLANIYOR: 'bg-purple-100 text-purple-800',
  DEVAM_EDIYOR: 'bg-yellow-100 text-yellow-800',
  RAPORLANIYOR: 'bg-orange-100 text-orange-800',
  KAPATILDI: 'bg-green-100 text-green-800',
  IPTAL_EDILDI: 'bg-red-100 text-red-800',
  ERTELENDI: 'bg-gray-100 text-gray-800',
};

const typeLabels: Record<string, string> = {
  IC_DENETIM: 'İç Denetim',
  DIS_DENETIM: 'Dış Denetim',
  TEDARIKCI_DENETIM: 'Tedarikçi Denetimi',
  SUREC_DENETIM: 'Süreç Denetimi',
  SISTEM_DENETIM: 'Sistem Denetimi',
};

const typeColors: Record<string, string> = {
  IC_DENETIM: 'bg-indigo-100 text-indigo-800',
  DIS_DENETIM: 'bg-teal-100 text-teal-800',
  TEDARIKCI_DENETIM: 'bg-amber-100 text-amber-800',
  SUREC_DENETIM: 'bg-cyan-100 text-cyan-800',
  SISTEM_DENETIM: 'bg-violet-100 text-violet-800',
};

const severityLabels: Record<string, string> = {
  MAJOR: 'Major',
  MINOR: 'Minor',
  GOZLEM: 'Gözlem',
  IYILESTIRME: 'İyileştirme',
  OLUMLU: 'Olumlu',
};

const severityColors: Record<string, string> = {
  MAJOR: 'bg-red-100 text-red-800',
  MINOR: 'bg-orange-100 text-orange-800',
  GOZLEM: 'bg-yellow-100 text-yellow-800',
  IYILESTIRME: 'bg-blue-100 text-blue-800',
  OLUMLU: 'bg-green-100 text-green-800',
};

const findingStatusLabels: Record<string, string> = {
  ACIK: 'Açık',
  AKSIYON_BEKLENIYOR: 'Aksiyon Bekleniyor',
  AKSIYON_UYGULANDI: 'Aksiyon Uygulandı',
  DOGRULANDI: 'Doğrulandı',
  KAPATILDI: 'Kapatıldı',
};

const findingStatusColors: Record<string, string> = {
  ACIK: 'bg-red-100 text-red-800',
  AKSIYON_BEKLENIYOR: 'bg-yellow-100 text-yellow-800',
  AKSIYON_UYGULANDI: 'bg-blue-100 text-blue-800',
  DOGRULANDI: 'bg-purple-100 text-purple-800',
  KAPATILDI: 'bg-green-100 text-green-800',
};

const teamRoleLabels: Record<string, string> = {
  BAS_DENETCI: 'Baş Denetçi',
  DENETCI: 'Denetçi',
  GOZLEMCI: 'Gözlemci',
  UZMAN: 'Uzman',
};

const checklistResultLabels: Record<string, string> = {
  UYGUN: 'Uygun',
  UYGUN_DEGIL: 'Uygun Değil',
  GOZLEM: 'Gözlem',
  DEGERLENDIRILMEDI: 'Değerlendirilmedi',
};

export default function AuditDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [audit, setAudit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');
  const [users, setUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);

  // Dialog states
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false);
  const [isFindingDialogOpen, setIsFindingDialogOpen] = useState(false);
  const [isChecklistDialogOpen, setIsChecklistDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);

  // Form states
  const [editForm, setEditForm] = useState<any>({});
  const [teamForm, setTeamForm] = useState({ userId: '', role: 'DENETCI' });
  const [findingForm, setFindingForm] = useState({
    title: '',
    description: '',
    severity: 'MINOR',
    evidence: '',
    requirement: '',
    clause: '',
    area: '',
    assigneeId: '',
    correctionDeadline: '',
  });
  const [checklistForm, setChecklistForm] = useState({
    category: '',
    question: '',
    expected: '',
  });

  // Bulk upload states
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [bulkUploadText, setBulkUploadText] = useState('');
  const [bulkUploadLoading, setBulkUploadLoading] = useState(false);

  // Finding attachment states
  const [selectedFinding, setSelectedFinding] = useState<any>(null);
  const [isFindingAttachmentOpen, setIsFindingAttachmentOpen] = useState(false);
  const [findingAttachments, setFindingAttachments] = useState<Record<string, any[]>>({});
  const [uploadingFindingAttachment, setUploadingFindingAttachment] = useState(false);

  const fetchAudit = async () => {
    try {
      const res = await fetch(`/api/audits/${id}`);
      if (res.ok) {
        const data = await res.json();
        setAudit(data);
        setEditForm(data);
      } else {
        router.push('/dashboard/audits');
      }
    } catch (error) {
      console.error('Denetim detay hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFormData = async () => {
    try {
      const [usersRes, deptsRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/departments'),
      ]);
      const [usersData, deptsData] = await Promise.all([
        usersRes.json(),
        deptsRes.json(),
      ]);
      setUsers(usersData.users || []);
      setDepartments(deptsData.departments || []);
    } catch (error) {
      console.error('Form verisi hatası:', error);
    }
  };

  useEffect(() => {
    fetchAudit();
    fetchFormData();
  }, [id]);

  const handleUpdateAudit = async () => {
    try {
      const res = await fetch(`/api/audits/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        fetchAudit();
        setIsEditOpen(false);
      }
    } catch (error) {
      console.error('Denetim güncelleme hatası:', error);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/audits/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchAudit();
      }
    } catch (error) {
      console.error('Durum güncelleme hatası:', error);
    }
  };

  const handleAddTeamMember = async () => {
    try {
      const res = await fetch(`/api/audits/${id}/team`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(teamForm),
      });
      if (res.ok) {
        fetchAudit();
        setIsTeamDialogOpen(false);
        setTeamForm({ userId: '', role: 'DENETCI' });
      }
    } catch (error) {
      console.error('Ekip üyesi ekleme hatası:', error);
    }
  };

  const handleRemoveTeamMember = async (memberId: string) => {
    try {
      const res = await fetch(`/api/audits/${id}/team?memberId=${memberId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchAudit();
      }
    } catch (error) {
      console.error('Ekip üyesi silme hatası:', error);
    }
  };

  const handleAddFinding = async () => {
    try {
      const res = await fetch(`/api/audits/${id}/findings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(findingForm),
      });
      if (res.ok) {
        fetchAudit();
        setIsFindingDialogOpen(false);
        setFindingForm({
          title: '',
          description: '',
          severity: 'MINOR',
          evidence: '',
          requirement: '',
          clause: '',
          area: '',
          assigneeId: '',
          correctionDeadline: '',
        });
      }
    } catch (error) {
      console.error('Bulgu ekleme hatası:', error);
    }
  };

  const handleUpdateFinding = async (findingId: string, data: any) => {
    try {
      const res = await fetch(`/api/audits/${id}/findings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ findingId, ...data }),
      });
      if (res.ok) {
        fetchAudit();
      }
    } catch (error) {
      console.error('Bulgu güncelleme hatası:', error);
    }
  };

  const handleAddChecklist = async () => {
    try {
      const res = await fetch(`/api/audits/${id}/checklists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checklistForm),
      });
      if (res.ok) {
        fetchAudit();
        setIsChecklistDialogOpen(false);
        setChecklistForm({ category: '', question: '', expected: '' });
      }
    } catch (error) {
      console.error('Checklist ekleme hatası:', error);
    }
  };

  const handleUpdateChecklist = async (checklistId: string, data: any) => {
    try {
      const res = await fetch(`/api/audits/${id}/checklists`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checklistId, ...data }),
      });
      if (res.ok) {
        fetchAudit();
      }
    } catch (error) {
      console.error('Checklist güncelleme hatası:', error);
    }
  };

  const handleFileUpload = async (file: File, description: string, category: string) => {
    try {
      const res = await fetch(`/api/audits/${id}/attachments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          description,
          category,
        }),
      });

      if (res.ok) {
        const { uploadUrl } = await res.json();
        await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        });
        fetchAudit();
        setIsUploadDialogOpen(false);
      }
    } catch (error) {
      console.error('Dosya yükleme hatası:', error);
    }
  };

  // Toplu checklist yükleme
  const handleBulkUpload = async () => {
    if (!bulkUploadText.trim()) return;

    setBulkUploadLoading(true);
    try {
      // Parse text - each line is a checklist item
      // Format: Category|Question|Expected (or just Question)
      const lines = bulkUploadText.trim().split('\n').filter(line => line.trim());
      const items = lines.map((line, index) => {
        const parts = line.split('|').map(p => p.trim());
        if (parts.length >= 3) {
          return { category: parts[0], question: parts[1], expected: parts[2], sortOrder: index };
        } else if (parts.length === 2) {
          return { category: parts[0], question: parts[1], expected: '', sortOrder: index };
        } else {
          return { category: '', question: parts[0], expected: '', sortOrder: index };
        }
      }).filter(item => item.question);

      if (items.length === 0) {
        alert('Geçerli madde bulunamadı');
        return;
      }

      const res = await fetch(`/api/audits/${id}/checklists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(items),
      });

      if (res.ok) {
        fetchAudit();
        setIsBulkUploadOpen(false);
        setBulkUploadText('');
        alert(`${items.length} madde başarıyla eklendi`);
      }
    } catch (error) {
      console.error('Toplu yükleme hatası:', error);
      alert('Toplu yükleme sırasında bir hata oluştu');
    } finally {
      setBulkUploadLoading(false);
    }
  };

  // Bulgu dosyalarını getir
  const fetchFindingAttachments = async (findingId: string) => {
    try {
      const res = await fetch(`/api/audits/${id}/findings/${findingId}/attachments`);
      if (res.ok) {
        const data = await res.json();
        setFindingAttachments(prev => ({ ...prev, [findingId]: data }));
      }
    } catch (error) {
      console.error('Bulgu dosyaları hatası:', error);
    }
  };

  // Bulgu için dosya yükle
  const handleFindingFileUpload = async (file: File, findingId: string, description: string, category: string) => {
    setUploadingFindingAttachment(true);
    try {
      const res = await fetch(`/api/audits/${id}/findings/${findingId}/attachments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          description,
          category,
        }),
      });

      if (res.ok) {
        const { uploadUrl } = await res.json();
        await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        });
        await fetchFindingAttachments(findingId);
        alert('Dosya başarıyla yüklendi');
      }
    } catch (error) {
      console.error('Bulgu dosyası yükleme hatası:', error);
      alert('Dosya yüklenirken bir hata oluştu');
    } finally {
      setUploadingFindingAttachment(false);
    }
  };

  // Bulgu dosyasını sil
  const handleDeleteFindingAttachment = async (findingId: string, attachmentId: string) => {
    if (!confirm('Bu dosyayı silmek istediğinize emin misiniz?')) return;
    
    try {
      const res = await fetch(`/api/audits/${id}/findings/${findingId}/attachments?attachmentId=${attachmentId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchFindingAttachments(findingId);
      }
    } catch (error) {
      console.error('Dosya silme hatası:', error);
    }
  };

  // Bulgu detaylarını aç
  const openFindingDetails = (finding: any) => {
    setSelectedFinding(finding);
    setIsFindingAttachmentOpen(true);
    fetchFindingAttachments(finding.id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Yükleniyor...</div>
      </div>
    );
  }

  if (!audit) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Denetim bulunamadı</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/audits')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{audit.code}</h1>
              <Badge className={typeColors[audit.type]}>{typeLabels[audit.type]}</Badge>
              <Badge className={statusColors[audit.status]}>{statusLabels[audit.status]}</Badge>
            </div>
            <p className="text-muted-foreground">{audit.title}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Select value={audit.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(statusLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setIsEditOpen(true)}>
            <Edit className="mr-2 h-4 w-4" /> Düzenle
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="details">Detaylar</TabsTrigger>
          <TabsTrigger value="team">Denetim Ekibi</TabsTrigger>
          <TabsTrigger value="checklist">Checklist</TabsTrigger>
          <TabsTrigger value="findings">Bulgular ({audit.findings?.length || 0})</TabsTrigger>
          <TabsTrigger value="report">Rapor</TabsTrigger>
          <TabsTrigger value="files">Dosyalar</TabsTrigger>
          <TabsTrigger value="history">Geçmiş</TabsTrigger>
        </TabsList>

        {/* Detaylar Tab */}
        <TabsContent value="details" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Genel Bilgiler</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Denetim Türü</Label>
                    <p className="font-medium">{typeLabels[audit.type]}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Durum</Label>
                    <div><Badge className={statusColors[audit.status]}>{statusLabels[audit.status]}</Badge></div>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Açıklama</Label>
                  <p>{audit.description || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Kapsam</Label>
                  <p>{audit.scope || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Hedefler</Label>
                  <p>{audit.objectives || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Kriterler</Label>
                  <p>{audit.criteria || '-'}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Organizasyon & Tarihler</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {audit.type !== 'DIS_DENETIM' && audit.type !== 'TEDARIKCI_DENETIM' && (
                    <div>
                      <Label className="text-muted-foreground">Denetlenen Departman</Label>
                      <p className="font-medium">{audit.auditedDepartment?.name || '-'}</p>
                    </div>
                  )}
                  <div>
                    <Label className="text-muted-foreground">Denetimi Yapan</Label>
                    <p className="font-medium">{audit.department?.name || '-'}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Baş Denetçi</Label>
                  <p className="font-medium">
                    {audit.leadAuditor ? `${audit.leadAuditor.name} ${audit.leadAuditor.surname || ''}` : '-'}
                  </p>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Planlanan Başlangıç</Label>
                    <p>{audit.plannedStartDate ? format(new Date(audit.plannedStartDate), 'dd MMMM yyyy', { locale: tr }) : '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Planlanan Bitiş</Label>
                    <p>{audit.plannedEndDate ? format(new Date(audit.plannedEndDate), 'dd MMMM yyyy', { locale: tr }) : '-'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Gerçek Başlangıç</Label>
                    <p>{audit.actualStartDate ? format(new Date(audit.actualStartDate), 'dd MMMM yyyy', { locale: tr }) : '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Gerçek Bitiş</Label>
                    <p>{audit.actualEndDate ? format(new Date(audit.actualEndDate), 'dd MMMM yyyy', { locale: tr }) : '-'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Denetim Ekibi Tab */}
        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Denetim Ekibi</CardTitle>
              <Dialog open={isTeamDialogOpen} onOpenChange={setIsTeamDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <UserPlus className="mr-2 h-4 w-4" /> Üye Ekle
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Ekip Üyesi Ekle</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label>Kullanıcı</Label>
                      <Select
                        value={teamForm.userId || 'none'}
                        onValueChange={(value) => setTeamForm({ ...teamForm, userId: value === 'none' ? '' : value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Kullanıcı seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Seçiniz</SelectItem>
                          {users.filter(u => !audit.teamMembers?.some((m: any) => m.userId === u.id)).map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name} {user.surname}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Rol</Label>
                      <Select
                        value={teamForm.role}
                        onValueChange={(value) => setTeamForm({ ...teamForm, role: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(teamRoleLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsTeamDialogOpen(false)}>İptal</Button>
                    <Button onClick={handleAddTeamMember} disabled={!teamForm.userId}>Ekle</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {audit.teamMembers?.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Ekip üyesi eklenmemiş</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>İsim</TableHead>
                      <TableHead>E-posta</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {audit.teamMembers?.map((member: any) => (
                      <TableRow key={member.id}>
                        <TableCell>{member.user.name} {member.user.surname}</TableCell>
                        <TableCell>{member.user.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{teamRoleLabels[member.role] || member.role}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveTeamMember(member.id)}
                          >
                            <X className="h-4 w-4" />
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

        {/* Checklist Tab */}
        <TabsContent value="checklist" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Denetim Kontrol Listesi</CardTitle>
              <div className="flex gap-2">
                {/* Toplu Yükleme Butonu */}
                <Dialog open={isBulkUploadOpen} onOpenChange={setIsBulkUploadOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      <FileSpreadsheet className="mr-2 h-4 w-4" /> Toplu Yükle
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Toplu Madde Yükleme</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="p-4 bg-muted rounded-lg text-sm">
                        <p className="font-medium mb-2">Kullanım Talimatları:</p>
                        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                          <li>Her satır bir kontrol maddesi olacaktır</li>
                          <li>Format: <code className="bg-background px-1 rounded">Kategori|Soru|Beklenen Durum</code></li>
                          <li>Sadece soru girmek isterseniz: <code className="bg-background px-1 rounded">Soru metni</code></li>
                          <li>Kategori ve soru için: <code className="bg-background px-1 rounded">Kategori|Soru</code></li>
                        </ul>
                        <p className="mt-3 font-medium">Örnek:</p>
                        <pre className="bg-background p-2 rounded mt-1 text-xs overflow-x-auto">
{`ISO 9001 - 7.1|Kaynaklar belirleniyor mu?|Kaynak planı mevcut olmalı
ISO 9001 - 7.2|Personel yetkinlikleri tanımlı mı?|Yetkinlik matrisi güncel olmalı
Eğitim kayıtları düzenli tutuluyor mu?`}
                        </pre>
                      </div>
                      <div className="grid gap-2">
                        <Label>Kontrol Maddeleri</Label>
                        <Textarea
                          value={bulkUploadText}
                          onChange={(e) => setBulkUploadText(e.target.value)}
                          placeholder="Her satıra bir madde yazın..."
                          rows={10}
                          className="font-mono text-sm"
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {bulkUploadText.trim().split('\n').filter(l => l.trim()).length} madde algılandı
                      </p>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsBulkUploadOpen(false)}>İptal</Button>
                      <Button 
                        onClick={handleBulkUpload} 
                        disabled={bulkUploadLoading || !bulkUploadText.trim()}
                      >
                        {bulkUploadLoading ? 'Yükleniyor...' : 'Toplu Ekle'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Tekli Ekleme Butonu */}
                <Dialog open={isChecklistDialogOpen} onOpenChange={setIsChecklistDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="mr-2 h-4 w-4" /> Madde Ekle
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Checklist Maddesi Ekle</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label>Kategori</Label>
                        <Input
                          value={checklistForm.category}
                          onChange={(e) => setChecklistForm({ ...checklistForm, category: e.target.value })}
                          placeholder="Örn: ISO 9001 - Madde 7"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Soru / Kontrol Maddesi *</Label>
                        <Textarea
                          value={checklistForm.question}
                          onChange={(e) => setChecklistForm({ ...checklistForm, question: e.target.value })}
                          placeholder="Denetim sorusu veya kontrol maddesi"
                          rows={3}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Beklenen Durum</Label>
                        <Textarea
                          value={checklistForm.expected}
                          onChange={(e) => setChecklistForm({ ...checklistForm, expected: e.target.value })}
                          placeholder="Beklenen durum"
                          rows={2}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsChecklistDialogOpen(false)}>İptal</Button>
                      <Button onClick={handleAddChecklist} disabled={!checklistForm.question}>Ekle</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {audit.checklists?.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Checklist maddesi eklenmemiş</p>
              ) : (
                <div className="space-y-4">
                  {audit.checklists?.map((item: any, index: number) => (
                    <Card key={item.id} className="p-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            {item.category && <Badge variant="outline" className="mb-2">{item.category}</Badge>}
                            <p className="font-medium">{index + 1}. {item.question}</p>
                            {item.expected && <p className="text-sm text-muted-foreground mt-1">Beklenen: {item.expected}</p>}
                          </div>
                          <Select
                            value={item.result || 'DEGERLENDIRILMEDI'}
                            onValueChange={(value) => handleUpdateChecklist(item.id, { result: value, isCompleted: value !== 'DEGERLENDIRILMEDI' })}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(checklistResultLabels).map(([value, label]) => (
                                <SelectItem key={value} value={value}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm">Mevcut Durum</Label>
                            <Textarea
                              value={item.actual || ''}
                              onChange={(e) => handleUpdateChecklist(item.id, { actual: e.target.value })}
                              placeholder="Tespit edilen durum"
                              rows={2}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-sm">Notlar</Label>
                            <Textarea
                              value={item.notes || ''}
                              onChange={(e) => handleUpdateChecklist(item.id, { notes: e.target.value })}
                              placeholder="Ek notlar"
                              rows={2}
                              className="mt-1"
                            />
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bulgular Tab */}
        <TabsContent value="findings" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Denetim Bulguları</CardTitle>
              <Dialog open={isFindingDialogOpen} onOpenChange={setIsFindingDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" /> Bulgu Ekle
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Yeni Bulgu Ekle</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
                    <div className="grid gap-2">
                      <Label>Bulgu Başlığı *</Label>
                      <Input
                        value={findingForm.title}
                        onChange={(e) => setFindingForm({ ...findingForm, title: e.target.value })}
                        placeholder="Bulgu başlığı"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Ciddiyet *</Label>
                        <Select
                          value={findingForm.severity}
                          onValueChange={(value) => setFindingForm({ ...findingForm, severity: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(severityLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>İlgili Madde</Label>
                        <Input
                          value={findingForm.clause}
                          onChange={(e) => setFindingForm({ ...findingForm, clause: e.target.value })}
                          placeholder="Örn: ISO 9001:2015 - 8.5.1"
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label>Açıklama *</Label>
                      <Textarea
                        value={findingForm.description}
                        onChange={(e) => setFindingForm({ ...findingForm, description: e.target.value })}
                        placeholder="Bulgu açıklaması"
                        rows={3}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Kanıtlar</Label>
                      <Textarea
                        value={findingForm.evidence}
                        onChange={(e) => setFindingForm({ ...findingForm, evidence: e.target.value })}
                        placeholder="Tespit edilen kanıtlar"
                        rows={2}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>İhlal Edilen Gereklilik</Label>
                      <Input
                        value={findingForm.requirement}
                        onChange={(e) => setFindingForm({ ...findingForm, requirement: e.target.value })}
                        placeholder="İhlal edilen gereklilik"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Sorumlu Kişi</Label>
                        <Select
                          value={findingForm.assigneeId || 'none'}
                          onValueChange={(value) => setFindingForm({ ...findingForm, assigneeId: value === 'none' ? '' : value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seçin" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Seçiniz</SelectItem>
                            {users.map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.name} {user.surname}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>Düzeltme Tarihi</Label>
                        <Input
                          type="date"
                          value={findingForm.correctionDeadline}
                          onChange={(e) => setFindingForm({ ...findingForm, correctionDeadline: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsFindingDialogOpen(false)}>İptal</Button>
                    <Button onClick={handleAddFinding} disabled={!findingForm.title || !findingForm.description}>Ekle</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {audit.findings?.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Bulgu eklenmemiş</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kod</TableHead>
                      <TableHead>Başlık</TableHead>
                      <TableHead>Ciddiyet</TableHead>
                      <TableHead>Durum</TableHead>
                      <TableHead>Sorumlu</TableHead>
                      <TableHead>Son Tarih</TableHead>
                      <TableHead className="text-center">Dosyalar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {audit.findings?.map((finding: any) => (
                      <TableRow key={finding.id}>
                        <TableCell className="font-medium">{finding.code}</TableCell>
                        <TableCell>{finding.title}</TableCell>
                        <TableCell>
                          <Badge className={severityColors[finding.severity]}>
                            {severityLabels[finding.severity]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={finding.status}
                            onValueChange={(value) => handleUpdateFinding(finding.id, { status: value })}
                          >
                            <SelectTrigger className="w-[160px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(findingStatusLabels).map(([value, label]) => (
                                <SelectItem key={value} value={value}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {finding.assignee ? `${finding.assignee.name} ${finding.assignee.surname || ''}` : '-'}
                        </TableCell>
                        <TableCell>
                          {finding.correctionDeadline
                            ? format(new Date(finding.correctionDeadline), 'dd MMM yyyy', { locale: tr })
                            : '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openFindingDetails(finding)}
                          >
                            <Paperclip className="h-4 w-4 mr-1" />
                            {findingAttachments[finding.id]?.length || 0}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Bulgu Dosyaları Dialog */}
          <Dialog open={isFindingAttachmentOpen} onOpenChange={setIsFindingAttachmentOpen}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Paperclip className="h-5 w-5" />
                  Bulgu Dosyaları - {selectedFinding?.code}
                </DialogTitle>
              </DialogHeader>
              
              {selectedFinding && (
                <div className="space-y-4">
                  {/* Bulgu Özeti */}
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium">{selectedFinding.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{selectedFinding.description}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge className={severityColors[selectedFinding.severity]}>
                        {severityLabels[selectedFinding.severity]}
                      </Badge>
                      <Badge className={findingStatusColors[selectedFinding.status]}>
                        {findingStatusLabels[selectedFinding.status]}
                      </Badge>
                    </div>
                  </div>

                  {/* Dosya Yükleme */}
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      Yeni Dosya Yükle
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="finding-file">Dosya Seç</Label>
                        <Input
                          id="finding-file"
                          type="file"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const category = (document.getElementById('finding-category') as HTMLSelectElement)?.value || 'KANIT';
                              const description = (document.getElementById('finding-desc') as HTMLInputElement)?.value || '';
                              handleFindingFileUpload(file, selectedFinding.id, description, category);
                              e.target.value = '';
                            }
                          }}
                          disabled={uploadingFindingAttachment}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="finding-category">Kategori</Label>
                          <select
                            id="finding-category"
                            className="w-full border rounded-md p-2 text-sm"
                            defaultValue="KANIT"
                          >
                            <option value="KANIT">Kanıt</option>
                            <option value="FOTOGRAF">Fotoğraf</option>
                            <option value="RAPOR">Rapor</option>
                            <option value="DIGER">Diğer</option>
                          </select>
                        </div>
                        <div>
                          <Label htmlFor="finding-desc">Açıklama (Opsiyonel)</Label>
                          <Input id="finding-desc" placeholder="Dosya açıklaması" />
                        </div>
                      </div>
                      {uploadingFindingAttachment && (
                        <p className="text-sm text-muted-foreground">Yükleniyor...</p>
                      )}
                    </div>
                  </div>

                  {/* Mevcut Dosyalar */}
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Yüklü Dosyalar ({findingAttachments[selectedFinding.id]?.length || 0})
                    </h4>
                    {!findingAttachments[selectedFinding.id] || findingAttachments[selectedFinding.id].length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Bu bulgu için henüz dosya yüklenmemiş
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {findingAttachments[selectedFinding.id].map((attachment: any) => (
                          <div
                            key={attachment.id}
                            className="flex items-center justify-between p-3 border rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              {attachment.fileType?.startsWith('image/') ? (
                                <Image className="h-8 w-8 text-blue-500" />
                              ) : (
                                <FileText className="h-8 w-8 text-gray-500" />
                              )}
                              <div>
                                <p className="font-medium text-sm">{attachment.fileName}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Badge variant="outline" className="text-xs">
                                    {attachment.category === 'KANIT' ? 'Kanıt' :
                                     attachment.category === 'FOTOGRAF' ? 'Fotoğraf' :
                                     attachment.category === 'RAPOR' ? 'Rapor' : 'Diğer'}
                                  </Badge>
                                  <span>{(attachment.fileSize / 1024).toFixed(1)} KB</span>
                                  <span>•</span>
                                  <span>{format(new Date(attachment.createdAt), 'dd MMM yyyy', { locale: tr })}</span>
                                </div>
                                {attachment.description && (
                                  <p className="text-xs text-muted-foreground mt-1">{attachment.description}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => window.open(attachment.url, '_blank')}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  const link = document.createElement('a');
                                  link.href = attachment.url;
                                  link.download = attachment.fileName;
                                  link.click();
                                }}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-500 hover:text-red-700"
                                onClick={() => handleDeleteFindingAttachment(selectedFinding.id, attachment.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsFindingAttachmentOpen(false)}>
                  Kapat
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Rapor Tab */}
        <TabsContent value="report" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Açılış Toplantısı</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Toplantı Tarihi</Label>
                  <Input
                    type="date"
                    value={editForm.openingMeetingDate?.split('T')[0] || ''}
                    onChange={(e) => setEditForm({ ...editForm, openingMeetingDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Notlar</Label>
                  <Textarea
                    value={editForm.openingMeetingNotes || ''}
                    onChange={(e) => setEditForm({ ...editForm, openingMeetingNotes: e.target.value })}
                    rows={4}
                  />
                </div>
                <Button onClick={handleUpdateAudit}>Kaydet</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Kapanış Toplantısı</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Toplantı Tarihi</Label>
                  <Input
                    type="date"
                    value={editForm.closingMeetingDate?.split('T')[0] || ''}
                    onChange={(e) => setEditForm({ ...editForm, closingMeetingDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Notlar</Label>
                  <Textarea
                    value={editForm.closingMeetingNotes || ''}
                    onChange={(e) => setEditForm({ ...editForm, closingMeetingNotes: e.target.value })}
                    rows={4}
                  />
                </div>
                <Button onClick={handleUpdateAudit}>Kaydet</Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Denetim Raporu</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Rapor Tarihi</Label>
                <Input
                  type="date"
                  value={editForm.reportDate?.split('T')[0] || ''}
                  onChange={(e) => setEditForm({ ...editForm, reportDate: e.target.value })}
                />
              </div>
              <div>
                <Label>Denetim Raporu</Label>
                <Textarea
                  value={editForm.auditReport || ''}
                  onChange={(e) => setEditForm({ ...editForm, auditReport: e.target.value })}
                  rows={6}
                  placeholder="Denetim raporunu yazın..."
                />
              </div>
              <div>
                <Label>Sonuçlar ve Değerlendirme</Label>
                <Textarea
                  value={editForm.conclusions || ''}
                  onChange={(e) => setEditForm({ ...editForm, conclusions: e.target.value })}
                  rows={4}
                />
              </div>
              <div>
                <Label>Tavsiyeler</Label>
                <Textarea
                  value={editForm.recommendations || ''}
                  onChange={(e) => setEditForm({ ...editForm, recommendations: e.target.value })}
                  rows={4}
                />
              </div>
              <Button onClick={handleUpdateAudit}>Kaydet</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dosyalar Tab */}
        <TabsContent value="files" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Dosyalar</CardTitle>
              <FileUploadDialog
                open={isUploadDialogOpen}
                onOpenChange={setIsUploadDialogOpen}
                onUpload={handleFileUpload}
              />
            </CardHeader>
            <CardContent>
              {audit.attachments?.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Dosya eklenmemiş</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dosya Adı</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead>Boyut</TableHead>
                      <TableHead>Yükleyen</TableHead>
                      <TableHead>Tarih</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {audit.attachments?.map((file: any) => (
                      <TableRow key={file.id}>
                        <TableCell className="font-medium">{file.fileName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{file.category || 'DİĞER'}</Badge>
                        </TableCell>
                        <TableCell>{(file.fileSize / 1024).toFixed(1)} KB</TableCell>
                        <TableCell>{file.uploadedBy?.name}</TableCell>
                        <TableCell>
                          {format(new Date(file.createdAt), 'dd MMM yyyy', { locale: tr })}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" asChild>
                            <a href={file.url} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4" />
                            </a>
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

        {/* Geçmiş Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Değişiklik Geçmişi</CardTitle>
            </CardHeader>
            <CardContent>
              {audit.histories?.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Geçmiş kaydı yok</p>
              ) : (
                <div className="space-y-4">
                  {audit.histories?.map((history: any) => (
                    <div key={history.id} className="flex gap-4 pb-4 border-b last:border-0">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                          <Clock className="h-4 w-4" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{history.action}</p>
                            <p className="text-sm text-muted-foreground">
                              {history.user?.name} {history.user?.surname}
                            </p>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(history.createdAt), 'dd MMM yyyy HH:mm', { locale: tr })}
                          </p>
                        </div>
                        {history.newValue && <p className="text-sm mt-1">{history.newValue}</p>}
                        {history.comments && <p className="text-sm text-muted-foreground mt-1">{history.comments}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Denetimi Düzenle</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Başlık</Label>
              <Input
                value={editForm.title || ''}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Açıklama</Label>
              <Textarea
                value={editForm.description || ''}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Baş Denetçi</Label>
                <Select
                  value={editForm.leadAuditorId || 'none'}
                  onValueChange={(value) => setEditForm({ ...editForm, leadAuditorId: value === 'none' ? '' : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Seçiniz</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} {user.surname}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {editForm.type !== 'DIS_DENETIM' && editForm.type !== 'TEDARIKCI_DENETIM' && (
                <div className="grid gap-2">
                  <Label>Denetlenen Departman</Label>
                  <Select
                    value={editForm.auditedDepartmentId || 'none'}
                    onValueChange={(value) => setEditForm({ ...editForm, auditedDepartmentId: value === 'none' ? '' : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Seçiniz</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Planlanan Başlangıç</Label>
                <Input
                  type="date"
                  value={editForm.plannedStartDate?.split('T')[0] || ''}
                  onChange={(e) => setEditForm({ ...editForm, plannedStartDate: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Planlanan Bitiş</Label>
                <Input
                  type="date"
                  value={editForm.plannedEndDate?.split('T')[0] || ''}
                  onChange={(e) => setEditForm({ ...editForm, plannedEndDate: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Gerçek Başlangıç</Label>
                <Input
                  type="date"
                  value={editForm.actualStartDate?.split('T')[0] || ''}
                  onChange={(e) => setEditForm({ ...editForm, actualStartDate: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Gerçek Bitiş</Label>
                <Input
                  type="date"
                  value={editForm.actualEndDate?.split('T')[0] || ''}
                  onChange={(e) => setEditForm({ ...editForm, actualEndDate: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>İptal</Button>
            <Button onClick={handleUpdateAudit}>Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// File Upload Dialog Component
function FileUploadDialog({
  open,
  onOpenChange,
  onUpload,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (file: File, description: string, category: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('DIGER');

  const handleSubmit = () => {
    if (file) {
      onUpload(file, description, category);
      setFile(null);
      setDescription('');
      setCategory('DIGER');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Upload className="mr-2 h-4 w-4" /> Dosya Yükle
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dosya Yükle</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Dosya</Label>
            <Input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
          <div className="grid gap-2">
            <Label>Kategori</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PLAN">Plan</SelectItem>
                <SelectItem value="CHECKLIST">Checklist</SelectItem>
                <SelectItem value="RAPOR">Rapor</SelectItem>
                <SelectItem value="KANIT">Kanıt</SelectItem>
                <SelectItem value="DIGER">Diğer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Açıklama</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Dosya açıklaması"
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
          <Button onClick={handleSubmit} disabled={!file}>Yükle</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
