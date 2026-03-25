'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft, Users, Trash2, Edit, CheckCircle, Shield, Building2, Calendar,
  FileText, UserPlus, Award, Briefcase, Network, MapPin, Download, ExternalLink, Loader2,
  Plus, Eye, Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { CommitteeOrgChart } from '@/components/committee-org-chart';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface Committee {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: string;
  status: string;
  mission: string | null;
  responsibilities: string | null;
  responsibilitiesFile: string | null;
  responsibilitiesFileName: string | null;
  authorities: string | null;
  gmApproval: boolean;
  gmApprovalDate: string | null;
  meetingFrequency: string | null;
  firstMeetingDate: string | null;
  meetingTime: string | null;
  meetingRoom: { id: string; name: string; code: string; location: string | null } | null;
  establishedDate: string | null;
  department: { id: string; name: string } | null;
  chairman: { id: string; name: string; surname: string; position: { name: string } | null } | null;
  secretary: { id: string; name: string; surname: string; position: { name: string } | null } | null;
  gmApprovedBy: { id: string; name: string } | null;
  parent: { id: string; name: string; code: string } | null;
  children: { id: string; name: string; code: string; status: string }[];
  members: CommitteeMember[];
  meetings: any[];
  documents: any[];
  createdAt: string;
}

interface CommitteeMember {
  id: string;
  role: string;
  jobDescription: string | null;
  responsibilities: string | null;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  user: {
    id: string;
    name: string;
    surname: string;
    email: string;
    position: { name: string } | null;
    department: { name: string } | null;
  };
}

const roleLabels: Record<string, string> = {
  BASKAN: 'Başkan',
  BASKAN_YARDIMCISI: 'Başkan Yardımcısı',
  SEKRETER: 'Sekreter',
  UYE: 'Üye',
  GOZLEMCI: 'Gözlemci',
};

const typeLabels: Record<string, string> = {
  DAIMI: 'Daimi',
  GECICI: 'Geçici',
  PROJE: 'Proje',
  YONETIM: 'Yönetim',
  DENETIM: 'Denetim',
  KALITE: 'Kalite',
};

const statusLabels: Record<string, { label: string; color: string }> = {
  TASLAK: { label: 'Taslak', color: 'bg-gray-500' },
  AKTIF: { label: 'Aktif', color: 'bg-green-500' },
  ASKIDA: { label: 'Askıda', color: 'bg-yellow-500' },
  KAPALI: { label: 'Kapalı', color: 'bg-red-500' },
};

const frequencyLabels: Record<string, string> = {
  HAFTALIK: 'Haftalık',
  IKI_HAFTADA_BIR: '2 Haftada 1',
  AYLIK: 'Aylık',
  IKI_AYDA_BIR: '2 Ayda 1',
  CEYREKLIK: 'Çeyreklik',
  YILLIK: 'Yıllık',
};

export default function CommitteeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession() || {};
  const [committee, setCommittee] = useState<Committee | null>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [committeeMeetings, setCommitteeMeetings] = useState<any[]>([]);
  const [meetingsLoading, setMeetingsLoading] = useState(false);
  const [decisions, setDecisions] = useState<any[]>([]);
  const [decisionsLoading, setDecisionsLoading] = useState(false);
  const [decisionDialogOpen, setDecisionDialogOpen] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);
  const [decisionForm, setDecisionForm] = useState({
    title: '',
    description: '',
    meetingDate: '',
    dueDate: '',
    responsibleDepartmentId: '',
    responsibleUserId: '',
    meetingId: '',
  });
  const [editingDecision, setEditingDecision] = useState<any>(null);
  const [generateMeetingsDialogOpen, setGenerateMeetingsDialogOpen] = useState(false);
  const [generatingMeetings, setGeneratingMeetings] = useState(false);
  const [generateForm, setGenerateForm] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
  });

  const [memberForm, setMemberForm] = useState({
    userId: '',
    role: 'UYE',
    jobDescription: '',
    responsibilities: '',
  });

  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    mission: '',
    responsibilities: '',
    authorities: '',
    status: '',
  });

  const fetchCommittee = async () => {
    try {
      const res = await fetch(`/api/committees/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setCommittee(data);
        setEditForm({
          name: data.name || '',
          description: data.description || '',
          mission: data.mission || '',
          responsibilities: data.responsibilities || '',
          authorities: data.authorities || '',
          status: data.status || 'TASLAK',
        });
      } else {
        toast.error('Komite bulunamadı');
        router.push('/dashboard/committees');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        const userList = data.users || data;
        setUsers(Array.isArray(userList) ? userList : []);
      }
    } catch (error) {
      console.error('Users fetch error:', error);
    }
  };

  const fetchCommitteeMeetings = async () => {
    setMeetingsLoading(true);
    try {
      const res = await fetch(`/api/committees/${params.id}/meetings`);
      if (res.ok) {
        const data = await res.json();
        setCommitteeMeetings(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Committee meetings fetch error:', error);
    } finally {
      setMeetingsLoading(false);
    }
  };

  const fetchDecisions = async () => {
    setDecisionsLoading(true);
    try {
      const res = await fetch(`/api/committees/${params.id}/decisions`);
      if (res.ok) {
        const data = await res.json();
        setDecisions(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Decisions fetch error:', error);
    } finally {
      setDecisionsLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/departments');
      if (res.ok) {
        const data = await res.json();
        const depts = data.departments || data;
        setDepartments(Array.isArray(depts) ? depts : []);
      }
    } catch (error) {
      console.error('Departments fetch error:', error);
    }
  };

  const handleCreateDecision = async () => {
    if (!decisionForm.title) { toast.error('Karar başlığı zorunludur'); return; }
    try {
      const res = await fetch(`/api/committees/${params.id}/decisions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(decisionForm),
      });
      if (res.ok) {
        toast.success('Karar oluşturuldu');
        setDecisionDialogOpen(false);
        setDecisionForm({ title: '', description: '', meetingDate: '', dueDate: '', responsibleDepartmentId: '', responsibleUserId: '', meetingId: '' });
        fetchDecisions();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Karar oluşturulamadı');
      }
    } catch { toast.error('Hata oluştu'); }
  };

  const handleUpdateDecisionStatus = async (decisionId: string, status: string) => {
    try {
      const res = await fetch(`/api/committees/${params.id}/decisions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decisionId, status }),
      });
      if (res.ok) {
        toast.success('Karar durumu güncellendi');
        fetchDecisions();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Güncelleme başarısız');
      }
    } catch { toast.error('Hata oluştu'); }
  };

  const handleGenerateMeetings = async () => {
    if (!generateForm.startDate) {
      toast.error('Başlangıç tarihi zorunludur');
      return;
    }
    setGeneratingMeetings(true);
    try {
      const res = await fetch(`/api/committees/${params.id}/meetings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: generateForm.startDate,
          endDate: generateForm.endDate || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Toplantılar oluşturuldu');
        setGenerateMeetingsDialogOpen(false);
        fetchCommitteeMeetings();
      } else {
        toast.error(data.error || 'Bir hata oluştu');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    } finally {
      setGeneratingMeetings(false);
    }
  };

  useEffect(() => {
    if (params.id) {
      fetchCommittee();
      fetchUsers();
      fetchCommitteeMeetings();
      fetchDecisions();
      fetchDepartments();
    }
  }, [params.id]);

  const handleAddMember = async () => {
    if (!memberForm.userId) {
      toast.error('Kullanıcı seçimi zorunludur');
      return;
    }

    try {
      const res = await fetch(`/api/committees/${params.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(memberForm),
      });

      if (res.ok) {
        toast.success('Üye eklendi');
        setMemberDialogOpen(false);
        setMemberForm({ userId: '', role: 'UYE', jobDescription: '', responsibilities: '' });
        fetchCommittee();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Bir hata oluştu');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Bu üyeyi komiteden çıkarmak istediğinize emin misiniz?')) return;

    try {
      const res = await fetch(`/api/committees/${params.id}/members?memberId=${memberId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Üye çıkarıldı');
        fetchCommittee();
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    }
  };

  const handleGMApproval = async () => {
    if (!confirm('Genel Müdür onayı vermek istediğinize emin misiniz?')) return;

    try {
      const res = await fetch(`/api/committees/${params.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });

      if (res.ok) {
        toast.success('GM onayı verildi');
        fetchCommittee();
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    }
  };

  const handleUpdate = async () => {
    try {
      const res = await fetch(`/api/committees/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      if (res.ok) {
        toast.success('Komite güncellendi');
        setEditDialogOpen(false);
        fetchCommittee();
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    }
  };

  const handleDownloadPdf = async () => {
    if (!committee?.responsibilitiesFile) return;
    
    setDownloadingPdf(true);
    try {
      const res = await fetch('/api/upload/url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cloud_storage_path: committee.responsibilitiesFile,
          isPublic: false,
          fileName: committee.responsibilitiesFileName || 'sorumluluklar.pdf',
        }),
      });

      if (res.ok) {
        const { url } = await res.json();
        const link = document.createElement('a');
        link.href = url;
        link.download = committee.responsibilitiesFileName || 'sorumluluklar.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        toast.error('Dosya indirilemedi');
      }
    } catch (error) {
      toast.error('Dosya indirilemedi');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handlePreviewPdf = async () => {
    if (!committee?.responsibilitiesFile) return;
    
    try {
      const res = await fetch('/api/upload/url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cloud_storage_path: committee.responsibilitiesFile,
          isPublic: false,
          fileName: committee.responsibilitiesFileName || 'sorumluluklar.pdf',
          forPreview: true,
        }),
      });

      if (res.ok) {
        const { url } = await res.json();
        window.open(url, '_blank');
      } else {
        toast.error('Dosya açılamadı');
      }
    } catch (error) {
      toast.error('Dosya açılamadı');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Yükleniyor...</div>;
  }

  if (!committee) {
    return null;
  }

  const existingMemberIds = committee.members.map(m => m.user.id);
  const availableUsers = users.filter(u => !existingMemberIds.includes(u.id));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Geri
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{committee.name}</h1>
            <p className="text-muted-foreground">{committee.code}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={statusLabels[committee.status]?.color || 'bg-gray-500'}>
            {statusLabels[committee.status]?.label || committee.status}
          </Badge>
          {committee.gmApproval && (
            <Badge variant="outline" className="text-green-600">
              <CheckCircle className="h-3 w-3 mr-1" /> GM Onaylı
            </Badge>
          )}
          <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
            <Edit className="h-4 w-4 mr-2" /> Düzenle
          </Button>
          {!committee.gmApproval && committee.status === 'TASLAK' && (
            <Button onClick={handleGMApproval}>
              <Shield className="h-4 w-4 mr-2" /> GM Onayı
            </Button>
          )}
        </div>
      </div>

      {/* Özet Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{committee.members.length}</div>
                <p className="text-sm text-muted-foreground">Toplam Üye</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-500" />
              <div>
                <div className="text-lg font-medium">
                  {committee.chairman ? `${committee.chairman.name} ${committee.chairman.surname}` : '-'}
                </div>
                <p className="text-sm text-muted-foreground">Başkan</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-purple-500" />
              <div>
                <div className="text-lg font-medium">{committee.meetingRoom?.name || '-'}</div>
                <p className="text-sm text-muted-foreground">Toplantı Salonu</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-green-500" />
              <div>
                <div className="text-lg font-medium">{committeeMeetings.length}</div>
                <p className="text-sm text-muted-foreground">Toplantı</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="members" className="space-y-4">
        <TabsList>
          <TabsTrigger value="members">Üyeler ({committee.members.length})</TabsTrigger>
          <TabsTrigger value="meetings">Toplantılar ({committeeMeetings.length})</TabsTrigger>
          <TabsTrigger value="decisions">Kararlar ({decisions.length})</TabsTrigger>
          <TabsTrigger value="info">Görev / Yetki / Sorumluluk</TabsTrigger>
          <TabsTrigger value="org">Organizasyon Şeması</TabsTrigger>
        </TabsList>

        {/* Üyeler Tab */}
        <TabsContent value="members">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Komite Üyeleri</CardTitle>
                <CardDescription>Komitede görev alan personeller</CardDescription>
              </div>
              <Button onClick={() => setMemberDialogOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" /> Üye Ekle
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kişi</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Pozisyon</TableHead>
                    <TableHead>Departman</TableHead>
                    <TableHead>Başlangıç</TableHead>
                    <TableHead>Görev Tanımı</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {committee.members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{member.user.name} {member.user.surname}</div>
                          <div className="text-sm text-muted-foreground">{member.user.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={member.role === 'BASKAN' ? 'default' : 'outline'}>
                          {roleLabels[member.role] || member.role}
                        </Badge>
                      </TableCell>
                      <TableCell>{member.user.position?.name || '-'}</TableCell>
                      <TableCell>{member.user.department?.name || '-'}</TableCell>
                      <TableCell>
                        {format(new Date(member.startDate), 'dd MMM yyyy', { locale: tr })}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground line-clamp-1">
                          {member.jobDescription || '-'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveMember(member.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {committee.members.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Henüz üye eklenmemiş
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Toplantılar Tab */}
        <TabsContent value="meetings">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" /> Komite Toplantıları
                </CardTitle>
                <CardDescription>
                  Bu komiteye ait tüm toplantılar (Toplantı Yönetimi modülünde de görünür)
                </CardDescription>
              </div>
              {committee.meetingFrequency && (
                <Button onClick={() => setGenerateMeetingsDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" /> Toplantı Planla
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {meetingsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : committeeMeetings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Henüz toplantı planlanmamış.</p>
                  {committee.meetingFrequency ? (
                    <Button
                      variant="outline"
                      className="mt-3"
                      onClick={() => setGenerateMeetingsDialogOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" /> Toplantıları Oluştur
                    </Button>
                  ) : (
                    <p className="text-sm mt-2">Toplantı sıklığı belirlenmemiş. Komiteyi düzenleyerek sıklık belirleyin.</p>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kod</TableHead>
                      <TableHead>Başlık</TableHead>
                      <TableHead>Tarih</TableHead>
                      <TableHead>Saat</TableHead>
                      <TableHead>Durum</TableHead>
                      <TableHead>Katılımcı</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {committeeMeetings.map((meeting) => (
                      <TableRow key={meeting.id}>
                        <TableCell className="font-mono text-sm">{meeting.code}</TableCell>
                        <TableCell className="font-medium">{meeting.title}</TableCell>
                        <TableCell>
                          {meeting.date ? format(new Date(meeting.date), 'dd MMM yyyy', { locale: tr }) : '-'}
                        </TableCell>
                        <TableCell>
                          {meeting.startTime ? format(new Date(meeting.startTime), 'HH:mm') : '-'}
                          {meeting.endTime ? ` - ${format(new Date(meeting.endTime), 'HH:mm')}` : ''}
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            meeting.status === 'TAMAMLANDI' ? 'secondary' :
                            meeting.status === 'DEVAM_EDIYOR' ? 'default' :
                            meeting.status === 'IPTAL' ? 'destructive' : 'outline'
                          }>
                            {meeting.status === 'PLANLANMIS' ? 'Planlandı' :
                             meeting.status === 'DEVAM_EDIYOR' ? 'Devam Ediyor' :
                             meeting.status === 'TAMAMLANDI' ? 'Tamamlandı' :
                             meeting.status === 'IPTAL' ? 'İptal' :
                             meeting.status === 'ERTELENDI' ? 'Ertelendi' : meeting.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{meeting.participants?.length || 0}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/dashboard/meetings/${meeting.id}`)}
                          >
                            <Eye className="h-4 w-4" />
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

        {/* Kararlar Tab */}
        <TabsContent value="decisions">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Komite Kararları</CardTitle>
                <Button onClick={() => { setEditingDecision(null); setDecisionForm({ title: '', description: '', meetingDate: '', dueDate: '', responsibleDepartmentId: '', responsibleUserId: '', meetingId: '' }); setDecisionDialogOpen(true); }}>
                  <Plus className="w-4 h-4 mr-1" /> Yeni Karar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {decisionsLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : decisions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Henüz karar bulunmuyor</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Karar No</TableHead>
                      <TableHead>Başlık</TableHead>
                      <TableHead>Toplantı Tarihi</TableHead>
                      <TableHead>Termin Tarihi</TableHead>
                      <TableHead>Sorumlu Departman</TableHead>
                      <TableHead>Sorumlu Kişi</TableHead>
                      <TableHead>Durum</TableHead>
                      <TableHead>İşlem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {decisions.map((d: any) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-mono text-xs">{d.decisionNumber}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{d.title}</p>
                            {d.description && <p className="text-xs text-muted-foreground line-clamp-1">{d.description}</p>}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{d.meetingDate ? format(new Date(d.meetingDate), 'dd.MM.yyyy', { locale: tr }) : '-'}</TableCell>
                        <TableCell className="text-sm">{d.dueDate ? format(new Date(d.dueDate), 'dd.MM.yyyy', { locale: tr }) : '-'}</TableCell>
                        <TableCell className="text-sm">{d.responsibleDepartment?.name || '-'}</TableCell>
                        <TableCell className="text-sm">{d.responsibleUser ? `${d.responsibleUser.name} ${d.responsibleUser.surname || ''}`.trim() : '-'}</TableCell>
                        <TableCell>
                          <Badge variant={d.status === 'TAMAMLANDI' ? 'default' : d.status === 'DEVAM_EDIYOR' ? 'secondary' : d.status === 'IPTAL' ? 'destructive' : 'outline'}>
                            {d.status === 'BEKLEMEDE' ? 'Beklemede' : d.status === 'DEVAM_EDIYOR' ? 'Devam Ediyor' : d.status === 'TAMAMLANDI' ? 'Tamamlandı' : 'İptal'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Select value={d.status} onValueChange={(v) => handleUpdateDecisionStatus(d.id, v)}>
                            <SelectTrigger className="w-[140px] h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="BEKLEMEDE">Beklemede</SelectItem>
                              <SelectItem value="DEVAM_EDIYOR">Devam Ediyor</SelectItem>
                              <SelectItem value="TAMAMLANDI">Tamamlandı</SelectItem>
                              <SelectItem value="IPTAL">İptal</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Görev / Yetki / Sorumluluk Tab */}
        <TabsContent value="info">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" /> Misyon
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {committee.mission || 'Belirtilmemiş'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tip & Toplantı Bilgileri</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Komite Tipi:</span>
                  <Badge variant="outline">{typeLabels[committee.type] || committee.type}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Toplantı Sıklığı:</span>
                  <span>{frequencyLabels[committee.meetingFrequency || ''] || committee.meetingFrequency || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Toplantı Salonu:</span>
                  <span>{committee.meetingRoom?.name || '-'}</span>
                </div>
                {committee.meetingRoom?.location && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Konum:</span>
                    <span>{committee.meetingRoom.location}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Toplantı Saati:</span>
                  <span>{committee.meetingTime || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">İlk Toplantı Günü:</span>
                  <span>{committee.firstMeetingDate ? new Date(committee.firstMeetingDate).toLocaleDateString('tr-TR') : '-'}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" /> Sorumluluklar
                </CardTitle>
              </CardHeader>
              <CardContent>
                {committee.responsibilitiesFile ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/50">
                      <FileText className="h-5 w-5 text-red-500" />
                      <span className="flex-1 truncate">
                        {committee.responsibilitiesFileName || 'Sorumluluklar.pdf'}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePreviewPdf}
                      >
                        <ExternalLink className="h-4 w-4 mr-1" /> Görüntüle
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadPdf}
                        disabled={downloadingPdf}
                      >
                        {downloadingPdf ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4 mr-1" />
                        )}
                        İndir
                      </Button>
                    </div>
                  </div>
                ) : committee.responsibilities ? (
                  <ul className="list-disc list-inside space-y-1">
                    {committee.responsibilities.split('\n').filter(r => r.trim()).map((r, i) => (
                      <li key={i} className="text-muted-foreground">{r}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">Belirtilmemiş</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Yetkiler</CardTitle>
              </CardHeader>
              <CardContent>
                {committee.authorities ? (
                  <ul className="list-disc list-inside space-y-1">
                    {committee.authorities.split('\n').filter(a => a.trim()).map((a, i) => (
                      <li key={i} className="text-muted-foreground">{a}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">Belirtilmemiş</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Organizasyon Şeması Tab */}
        <TabsContent value="org">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="h-5 w-5" /> Organizasyon Şeması
              </CardTitle>
              <CardDescription>
                Üyeleri sürükle-bırak ile hiyerarşik olarak düzenleyin
              </CardDescription>
            </CardHeader>
            <CardContent>
              {committee.members.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Henüz üye eklenmemiş. Önce üye ekleyin.
                </p>
              ) : (
                <CommitteeOrgChart 
                  committeeId={committee.id} 
                  members={committee.members}
                  onUpdate={fetchCommittee}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Üye Ekle Dialog */}
      <Dialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Komiteye Üye Ekle</DialogTitle>
            <DialogDescription>Yeni bir üye atayın</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Kullanıcı *</Label>
              <Select
                value={memberForm.userId || 'none'}
                onValueChange={(v) => setMemberForm({ ...memberForm, userId: v === 'none' ? '' : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Seçiniz</SelectItem>
                  {availableUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} {u.surname} - {u.department?.name || ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Rol</Label>
              <Select
                value={memberForm.role}
                onValueChange={(v) => setMemberForm({ ...memberForm, role: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(roleLabels).map(([key, val]) => (
                    <SelectItem key={key} value={key}>{val}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Görev Tanımı</Label>
              <Textarea
                value={memberForm.jobDescription}
                onChange={(e) => setMemberForm({ ...memberForm, jobDescription: e.target.value })}
                placeholder="Bu üyenin komitedeki görevi"
              />
            </div>
            <div>
              <Label>Sorumluluklar</Label>
              <Textarea
                value={memberForm.responsibilities}
                onChange={(e) => setMemberForm({ ...memberForm, responsibilities: e.target.value })}
                placeholder="Her satıra bir sorumluluk"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMemberDialogOpen(false)}>İptal</Button>
            <Button onClick={handleAddMember}>Üye Ekle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Düzenle Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Komite Düzenle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Komite Adı</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Açıklama</Label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />
            </div>
            <div>
              <Label>Misyon</Label>
              <Textarea
                value={editForm.mission}
                onChange={(e) => setEditForm({ ...editForm, mission: e.target.value })}
              />
            </div>
            <div>
              <Label>Durum</Label>
              <Select
                value={editForm.status}
                onValueChange={(v) => setEditForm({ ...editForm, status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusLabels).map(([key, val]) => (
                    <SelectItem key={key} value={key}>{val.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>İptal</Button>
            <Button onClick={handleUpdate}>Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toplantı Planla Dialog */}
      <Dialog open={generateMeetingsDialogOpen} onOpenChange={setGenerateMeetingsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Toplantı Planla</DialogTitle>
            <DialogDescription>
              Komite toplantı sıklığına ({frequencyLabels[committee?.meetingFrequency || ''] || committee?.meetingFrequency || '-'}) göre toplantılar otomatik oluşturulacaktır. Oluşturulan toplantılar Toplantı Yönetimi modülünde de görünecektir.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Başlangıç Tarihi *</Label>
              <Input
                type="date"
                value={generateForm.startDate}
                onChange={(e) => setGenerateForm({ ...generateForm, startDate: e.target.value })}
              />
            </div>
            <div>
              <Label>Bitiş Tarihi (Boş bırakılırsa 1 yıl ileri planlanır)</Label>
              <Input
                type="date"
                value={generateForm.endDate}
                onChange={(e) => setGenerateForm({ ...generateForm, endDate: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateMeetingsDialogOpen(false)}>İptal</Button>
            <Button onClick={handleGenerateMeetings} disabled={generatingMeetings}>
              {generatingMeetings ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Oluşturuluyor...</> : 'Toplantıları Oluştur'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Karar Oluştur Dialog */}
      <Dialog open={decisionDialogOpen} onOpenChange={setDecisionDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Yeni Karar Oluştur</DialogTitle>
            <DialogDescription>Komite kararı bilgilerini girin</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Karar Başlığı *</Label>
              <Input value={decisionForm.title} onChange={(e) => setDecisionForm({ ...decisionForm, title: e.target.value })} placeholder="Karar başlığı" />
            </div>
            <div>
              <Label>Açıklama</Label>
              <Textarea value={decisionForm.description} onChange={(e) => setDecisionForm({ ...decisionForm, description: e.target.value })} placeholder="Karar detayı" rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Toplantı Tarihi</Label>
                <Input type="date" value={decisionForm.meetingDate} onChange={(e) => setDecisionForm({ ...decisionForm, meetingDate: e.target.value })} />
              </div>
              <div>
                <Label>Termin Tarihi</Label>
                <Input type="date" value={decisionForm.dueDate} onChange={(e) => setDecisionForm({ ...decisionForm, dueDate: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>İlgili Toplantı</Label>
              <Select value={decisionForm.meetingId} onValueChange={(v) => setDecisionForm({ ...decisionForm, meetingId: v })}>
                <SelectTrigger><SelectValue placeholder="Toplantı seçin (opsiyonel)" /></SelectTrigger>
                <SelectContent>
                  {committeeMeetings.map((m: any) => (
                    <SelectItem key={m.id} value={m.id}>{m.title} - {m.meetingDate ? format(new Date(m.meetingDate), 'dd.MM.yyyy', { locale: tr }) : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Sorumlu Departman</Label>
              <Select value={decisionForm.responsibleDepartmentId} onValueChange={(v) => setDecisionForm({ ...decisionForm, responsibleDepartmentId: v })}>
                <SelectTrigger><SelectValue placeholder="Departman seçin" /></SelectTrigger>
                <SelectContent>
                  {departments.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Sorumlu Kişi</Label>
              <Select value={decisionForm.responsibleUserId} onValueChange={(v) => setDecisionForm({ ...decisionForm, responsibleUserId: v })}>
                <SelectTrigger><SelectValue placeholder="Kişi seçin" /></SelectTrigger>
                <SelectContent>
                  {users.map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>{u.name} {u.surname || ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDecisionDialogOpen(false)}>Vazgeç</Button>
            <Button onClick={handleCreateDecision}>Oluştur</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
