'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  Edit,
  Plus,
  Trash2,
  CheckCircle,
  Clock,
  Play,
  AlertTriangle,
  XCircle,
  Target,
  Calendar,
  User,
  Building2,
  DollarSign,
  Milestone,
  History,
  Users,
  FileText,
  TrendingUp,
  Save,
  Paperclip,
  MessageSquare,
  GitBranch,
  BarChart3,
  Upload,
  File,
  Link2,
  ShieldCheck,
} from 'lucide-react';
import ActionAttachments from '@/components/strategy/action-attachments';
import ActionComments from '@/components/strategy/action-comments';
import ActionWorkflow from '@/components/strategy/action-workflow';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  PLANLANDI: { label: 'Planlandı', color: 'bg-gray-100 text-gray-800', icon: Clock },
  DEVAM_EDIYOR: { label: 'Devam Ediyor', color: 'bg-blue-100 text-blue-800', icon: Play },
  BEKLEMEDE: { label: 'Beklemede', color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle },
  TAMAMLANDI: { label: 'Tamamlandı', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  IPTAL: { label: 'İptal', color: 'bg-red-100 text-red-800', icon: XCircle },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  DUSUK: { label: 'Düşük', color: 'bg-gray-100 text-gray-700' },
  ORTA: { label: 'Orta', color: 'bg-blue-100 text-blue-700' },
  YUKSEK: { label: 'Yüksek', color: 'bg-orange-100 text-orange-700' },
  KRITIK: { label: 'Kritik', color: 'bg-red-100 text-red-700' },
};

const milestoneStatusConfig: Record<string, { label: string; color: string }> = {
  BEKLIYOR: { label: 'Bekliyor', color: 'bg-gray-100 text-gray-800' },
  DEVAM_EDIYOR: { label: 'Devam Ediyor', color: 'bg-blue-100 text-blue-800' },
  TAMAMLANDI: { label: 'Tamamlandı', color: 'bg-green-100 text-green-800' },
  IPTAL: { label: 'İptal', color: 'bg-red-100 text-red-800' },
  GECIKTI: { label: 'Gecikti', color: 'bg-orange-100 text-orange-800' },
};

export default function ActionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [action, setAction] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [milestoneDialogOpen, setMilestoneDialogOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<any>(null);
  
  // RACI C & I states
  const [consultedUsers, setConsultedUsers] = useState<any[]>([]);
  const [informedUsers, setInformedUsers] = useState<any[]>([]);
  const [consultedDialogOpen, setConsultedDialogOpen] = useState(false);
  const [informedDialogOpen, setInformedDialogOpen] = useState(false);
  const [newConsultedUserId, setNewConsultedUserId] = useState('');
  const [newConsultedNotes, setNewConsultedNotes] = useState('');
  const [newInformedUserId, setNewInformedUserId] = useState('');
  const [informedSettings, setInformedSettings] = useState({
    notifyOnProgress: true,
    notifyOnComplete: true,
    notifyOnBlock: true,
  });
  
  // KPI states
  const [kpis, setKpis] = useState<any[]>([]);
  const [actionKpis, setActionKpis] = useState<any[]>([]);
  const [kpiDialogOpen, setKpiDialogOpen] = useState(false);
  const [selectedKpiId, setSelectedKpiId] = useState('');
  
  // Closing evidence states
  const [closingDialogOpen, setClosingDialogOpen] = useState(false);
  const [closingEvidence, setClosingEvidence] = useState<any[]>([]);
  const [closingNotes, setClosingNotes] = useState('');
  const [uploadingEvidence, setUploadingEvidence] = useState(false);

  // Form states
  const [formData, setFormData] = useState<any>({});
  const [milestoneForm, setMilestoneForm] = useState({
    name: '',
    description: '',
    plannedDate: '',
    weight: 1,
    deliverables: '',
  });

  useEffect(() => {
    if (id) {
      fetchAction();
      fetchUsers();
      fetchDepartments();
      fetchKpis();
      fetchActionKpis();
      fetchClosingEvidence();
      fetchRaci();
    }
  }, [id]);

  const fetchAction = async () => {
    try {
      const res = await fetch(`/api/strategic-actions/${id}`);
      if (res.ok) {
        const data = await res.json();
        setAction(data);
        setFormData({
          name: data.name,
          description: data.description || '',
          status: data.status,
          priority: data.priority,
          progress: data.progress,
          responsibleId: data.responsibleId || '',
          accountableId: data.accountableId || '',
          departmentId: data.departmentId || '',
          startDate: data.startDate ? data.startDate.split('T')[0] : '',
          dueDate: data.dueDate ? data.dueDate.split('T')[0] : '',
          budgetPlanned: data.budgetPlanned || '',
          budgetActual: data.budgetActual || '',
          currency: data.currency || 'TRY',
          budgetType: data.budgetType || '',
          expectedGain: data.expectedGain || '',
          notes: data.notes || '',
        });
      }
    } catch (error) {
      toast.error('Aksiyon yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || data);
      }
    } catch (error) {
      console.error('Kullanıcılar yüklenemedi');
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/departments');
      if (res.ok) {
        const data = await res.json();
        const deptList = data.departments || data;
        setDepartments(Array.isArray(deptList) ? deptList : []);
      }
    } catch (error) {
      console.error('Departmanlar yüklenemedi');
    }
  };

  // RACI C & I Functions
  const fetchRaci = async () => {
    try {
      const res = await fetch(`/api/strategic-actions/${id}/raci`);
      if (res.ok) {
        const data = await res.json();
        setConsultedUsers(data.consulted || []);
        setInformedUsers(data.informed || []);
      }
    } catch (error) {
      console.error('RACI yüklenemedi');
    }
  };

  const handleAddConsulted = async () => {
    if (!newConsultedUserId) return;
    try {
      const res = await fetch(`/api/strategic-actions/${id}/raci`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'consulted',
          userId: newConsultedUserId,
          notes: newConsultedNotes || null,
        }),
      });
      if (res.ok) {
        toast.success('Danışılacak kişi eklendi');
        fetchRaci();
        setConsultedDialogOpen(false);
        setNewConsultedUserId('');
        setNewConsultedNotes('');
      } else {
        const err = await res.json();
        toast.error(err.error);
      }
    } catch (error) {
      toast.error('Eklenemedi');
    }
  };

  const handleRemoveConsulted = async (entryId: string) => {
    try {
      const res = await fetch(`/api/strategic-actions/${id}/raci?type=consulted&entryId=${entryId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success('Kişi çıkarıldı');
        fetchRaci();
      }
    } catch (error) {
      toast.error('Silinemedi');
    }
  };

  const handleAddInformed = async () => {
    if (!newInformedUserId) return;
    try {
      const res = await fetch(`/api/strategic-actions/${id}/raci`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'informed',
          userId: newInformedUserId,
          ...informedSettings,
        }),
      });
      if (res.ok) {
        toast.success('Bilgilendirilecek kişi eklendi');
        fetchRaci();
        setInformedDialogOpen(false);
        setNewInformedUserId('');
        setInformedSettings({ notifyOnProgress: true, notifyOnComplete: true, notifyOnBlock: true });
      } else {
        const err = await res.json();
        toast.error(err.error);
      }
    } catch (error) {
      toast.error('Eklenemedi');
    }
  };

  const handleRemoveInformed = async (entryId: string) => {
    try {
      const res = await fetch(`/api/strategic-actions/${id}/raci?type=informed&entryId=${entryId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success('Kişi çıkarıldı');
        fetchRaci();
      }
    } catch (error) {
      toast.error('Silinemedi');
    }
  };

  const fetchKpis = async () => {
    try {
      const res = await fetch('/api/kpis');
      if (res.ok) {
        const data = await res.json();
        setKpis(Array.isArray(data) ? data : data.kpis || []);
      }
    } catch (error) {
      console.error('KPIlar yüklenemedi');
    }
  };

  const fetchActionKpis = async () => {
    try {
      const res = await fetch(`/api/strategic-actions/${id}/kpis`);
      if (res.ok) {
        const data = await res.json();
        setActionKpis(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Aksiyon KPIları yüklenemedi');
    }
  };

  const fetchClosingEvidence = async () => {
    try {
      const res = await fetch(`/api/strategic-actions/${id}/closing-evidence`);
      if (res.ok) {
        const data = await res.json();
        setClosingEvidence(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Kapanış kanıtları yüklenemedi');
    }
  };

  const handleAddKpi = async () => {
    if (!selectedKpiId) {
      toast.error('Lütfen bir KPI seçin');
      return;
    }

    try {
      const res = await fetch(`/api/strategic-actions/${id}/kpis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kpiId: selectedKpiId }),
      });

      if (res.ok) {
        toast.success('KPI bağlandı');
        setKpiDialogOpen(false);
        setSelectedKpiId('');
        fetchActionKpis();
      } else {
        const err = await res.json();
        toast.error(err.error || 'KPI bağlanamadı');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    }
  };

  const handleRemoveKpi = async (kpiId: string) => {
    if (!confirm('Bu KPI bağlantısını kaldırmak istediğinize emin misiniz?')) return;

    try {
      const res = await fetch(`/api/strategic-actions/${id}/kpis?kpiId=${kpiId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('KPI bağlantısı kaldırıldı');
        fetchActionKpis();
      } else {
        toast.error('Kaldırma başarısız');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    }
  };

  const handleUploadEvidence = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingEvidence(true);

      // Get presigned URL
      const res = await fetch(`/api/strategic-actions/${id}/closing-evidence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          description: 'Kapanış kanıtı'
        }),
      });

      if (!res.ok) {
        throw new Error('Presigned URL alınamadı');
      }

      const { uploadUrl, attachment } = await res.json();

      // Upload to S3
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error('Dosya yüklenemedi');
      }

      toast.success('Kanıt dosyası yüklendi');
      fetchClosingEvidence();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Dosya yüklenemedi');
    } finally {
      setUploadingEvidence(false);
      e.target.value = '';
    }
  };

  const handleDeleteEvidence = async (attachmentId: string) => {
    if (!confirm('Bu kanıt dosyasını silmek istediğinize emin misiniz?')) return;

    try {
      const res = await fetch(`/api/strategic-actions/${id}/closing-evidence?attachmentId=${attachmentId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Kanıt dosyası silindi');
        fetchClosingEvidence();
      } else {
        toast.error('Silme başarısız');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    }
  };

  const handleCloseAction = async () => {
    // Check if evidence is required and exists
    if (action?.closingEvidenceRequired && closingEvidence.length === 0) {
      toast.error('Aksiyonu kapatmak için en az bir kanıt dosyası yüklemelisiniz');
      return;
    }

    try {
      const res = await fetch(`/api/strategic-actions/${id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ closingNotes }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(data.message || 'Aksiyon tamamlandı');
        setClosingDialogOpen(false);
        setClosingNotes('');
        fetchAction();
      } else {
        const err = await res.json();
        if (err.code === 'EVIDENCE_REQUIRED') {
          toast.error('Aksiyonu kapatmak için en az bir kanıt dosyası yüklemelisiniz');
        } else {
          toast.error(err.error || 'Kapatma başarısız');
        }
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    }
  };

  const handleSave = async () => {
    try {
      const res = await fetch(`/api/strategic-actions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success('Aksiyon güncellendi');
        setEditMode(false);
        fetchAction();
      } else {
        toast.error('Güncelleme başarısız');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    }
  };

  const handleAddMilestone = async () => {
    try {
      const res = await fetch(`/api/strategic-actions/${id}/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(milestoneForm),
      });

      if (res.ok) {
        toast.success('Kilometre taşı eklendi');
        setMilestoneDialogOpen(false);
        setMilestoneForm({ name: '', description: '', plannedDate: '', weight: 1, deliverables: '' });
        fetchAction();
      } else {
        toast.error('Ekleme başarısız');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    }
  };

  const handleUpdateMilestone = async (milestoneId: string, data: any) => {
    try {
      const res = await fetch(`/api/strategic-actions/${id}/milestones/${milestoneId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        toast.success('Kilometre taşı güncellendi');
        fetchAction();
      } else {
        toast.error('Güncelleme başarısız');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    }
  };

  const handleDeleteMilestone = async (milestoneId: string) => {
    if (!confirm('Bu kilometre taşını silmek istediğinize emin misiniz?')) return;

    try {
      const res = await fetch(`/api/strategic-actions/${id}/milestones/${milestoneId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Kilometre taşı silindi');
        fetchAction();
      } else {
        toast.error('Silme başarısız');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!action) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Aksiyon bulunamadı</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Geri Dön
        </Button>
      </div>
    );
  }

  const status = statusConfig[action.status] || statusConfig.PLANLANDI;
  const priority = priorityConfig[action.priority] || priorityConfig.ORTA;
  const StatusIcon = status.icon;

  const budgetUsage = action.budgetPlanned && action.budgetActual
    ? Math.round((action.budgetActual / action.budgetPlanned) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{action.code}</h1>
              <Badge className={status.color}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {status.label}
              </Badge>
              <Badge className={priority.color}>{priority.label}</Badge>
            </div>
            <p className="text-gray-600 mt-1">{action.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {editMode ? (
            <>
              <Button variant="outline" onClick={() => setEditMode(false)}>Vazgeç</Button>
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" /> Kaydet
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setEditMode(true)}>
                <Edit className="h-4 w-4 mr-2" /> Düzenle
              </Button>
              {action.status !== 'TAMAMLANDI' && (
                <Button 
                  className="bg-green-600 hover:bg-green-700" 
                  onClick={() => setClosingDialogOpen(true)}
                >
                  <CheckCircle className="h-4 w-4 mr-2" /> Aksiyonu Tamamla
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Özet Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">İlerleme</p>
                <p className="text-2xl font-bold">%{typeof action.progress === 'number' ? action.progress.toFixed(2) : action.progress}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-400" />
            </div>
            <Progress value={action.progress || 0} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Kilometre Taşları</p>
                <p className="text-2xl font-bold">
                  {action.milestoneStats?.completed || 0}/{action.milestoneStats?.total || 0}
                </p>
              </div>
              <Milestone className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Planlanan Bütçe</p>
                <p className="text-2xl font-bold">
                  {action.budgetPlanned ? `${action.budgetPlanned.toLocaleString()} ${action.currency}` : '-'}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Bütçe Kullanımı</p>
                <p className="text-2xl font-bold">%{budgetUsage}</p>
              </div>
              <DollarSign className="h-8 w-8 text-orange-400" />
            </div>
            {action.budgetPlanned && <Progress value={budgetUsage} className="mt-2" />}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Beklenen Kazanç</p>
                <p className="text-2xl font-bold text-green-600">
                  {action.expectedGain ? `+${action.expectedGain.toLocaleString()} ${action.currency}` : '-'}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sekmeler */}
      <Tabs defaultValue="details" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="details">
            <FileText className="h-4 w-4 mr-2" /> Detaylar
          </TabsTrigger>
          <TabsTrigger value="workflow">
            <GitBranch className="h-4 w-4 mr-2" /> İş Akışı
          </TabsTrigger>
          <TabsTrigger value="raci">
            <Users className="h-4 w-4 mr-2" /> RACI
          </TabsTrigger>
          <TabsTrigger value="budget">
            <DollarSign className="h-4 w-4 mr-2" /> Bütçe
          </TabsTrigger>
          <TabsTrigger value="milestones">
            <Milestone className="h-4 w-4 mr-2" /> Kilometre Taşları
          </TabsTrigger>
          <TabsTrigger value="kpis">
            <BarChart3 className="h-4 w-4 mr-2" /> KPI&apos;lar
          </TabsTrigger>
          <TabsTrigger value="closing">
            <ShieldCheck className="h-4 w-4 mr-2" /> Kapanış Kanıtları
          </TabsTrigger>
          <TabsTrigger value="attachments">
            <Paperclip className="h-4 w-4 mr-2" /> Ekler
          </TabsTrigger>
          <TabsTrigger value="comments">
            <MessageSquare className="h-4 w-4 mr-2" /> Yorumlar
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" /> Tarihçe
          </TabsTrigger>
        </TabsList>

        {/* Detaylar Sekmesi */}
        <TabsContent value="details">
          <Card>
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label>Aksiyon Adı</Label>
                    {editMode ? (
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    ) : (
                      <p className="text-gray-900 mt-1">{action.name}</p>
                    )}
                  </div>
                  <div>
                    <Label>Açıklama</Label>
                    {editMode ? (
                      <Textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={3}
                      />
                    ) : (
                      <p className="text-gray-600 mt-1">{action.description || '-'}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Durum</Label>
                      {editMode ? (
                        <Select
                          value={formData.status}
                          onValueChange={(v) => setFormData({ ...formData, status: v })}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(statusConfig).map(([key, val]) => (
                              <SelectItem key={key} value={key}>{val.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge className={`mt-1 ${status.color}`}>{status.label}</Badge>
                      )}
                    </div>
                    <div>
                      <Label>Öncelik</Label>
                      {editMode ? (
                        <Select
                          value={formData.priority}
                          onValueChange={(v) => setFormData({ ...formData, priority: v })}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(priorityConfig).map(([key, val]) => (
                              <SelectItem key={key} value={key}>{val.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge className={`mt-1 ${priority.color}`}>{priority.label}</Badge>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label>İlerleme (%)</Label>
                    {editMode ? (
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={formData.progress}
                        onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value) || 0 })}
                      />
                    ) : (
                      <div className="mt-1">
                        <Progress value={action.progress || 0} className="h-3" />
                        <p className="text-sm text-gray-600 mt-1">%{typeof action.progress === 'number' ? action.progress.toFixed(2) : action.progress}</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label>Bağlı Hedef</Label>
                    <p className="text-gray-900 mt-1">
                      {action.goal ? (
                        <span>{action.goal.code} - {action.goal.name}</span>
                      ) : action.subGoal ? (
                        <span>{action.subGoal.code} - {action.subGoal.name}</span>
                      ) : '-'}
                    </p>
                  </div>
                  <div>
                    <Label>Departman</Label>
                    {editMode ? (
                      <Select
                        value={formData.departmentId}
                        onValueChange={(v) => setFormData({ ...formData, departmentId: v })}
                      >
                        <SelectTrigger><SelectValue placeholder="Seçiniz" /></SelectTrigger>
                        <SelectContent>
                          {departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-gray-900 mt-1">{action.department?.name || '-'}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Başlangıç Tarihi</Label>
                      {editMode ? (
                        <Input
                          type="date"
                          value={formData.startDate}
                          onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        />
                      ) : (
                        <p className="text-gray-900 mt-1">
                          {action.startDate ? format(new Date(action.startDate), 'dd MMM yyyy', { locale: tr }) : '-'}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label>Bitiş Tarihi</Label>
                      {editMode ? (
                        <Input
                          type="date"
                          value={formData.dueDate}
                          onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                        />
                      ) : (
                        <p className="text-gray-900 mt-1">
                          {action.dueDate ? format(new Date(action.dueDate), 'dd MMM yyyy', { locale: tr }) : '-'}
                        </p>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label>Notlar</Label>
                    {editMode ? (
                      <Textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        rows={3}
                      />
                    ) : (
                      <p className="text-gray-600 mt-1">{action.notes || '-'}</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* RACI Sekmesi */}
        <TabsContent value="raci">
          <Card>
            <CardHeader>
              <CardTitle>RACI Matrisi</CardTitle>
              <CardDescription>Sorumluluk atamaları</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* R ve A - Tek Kişi Seçimi */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-blue-600 font-bold">R</span>
                    </div>
                    <div>
                      <p className="font-medium">Responsible (Sorumlu)</p>
                      <p className="text-sm text-gray-500">İşi yapan kişi</p>
                    </div>
                  </div>
                  {editMode ? (
                    <Select
                      value={formData.responsibleId}
                      onValueChange={(v) => setFormData({ ...formData, responsibleId: v })}
                    >
                      <SelectTrigger><SelectValue placeholder="Seçiniz" /></SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name} {user.surname}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="mt-2 font-medium">
                      {action.responsible ? `${action.responsible.name}` : '-'}
                    </p>
                  )}
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <span className="text-green-600 font-bold">A</span>
                    </div>
                    <div>
                      <p className="font-medium">Accountable (Hesap Verebilir)</p>
                      <p className="text-sm text-gray-500">Onaylayan/Sahip</p>
                    </div>
                  </div>
                  {editMode ? (
                    <Select
                      value={formData.accountableId}
                      onValueChange={(v) => setFormData({ ...formData, accountableId: v })}
                    >
                      <SelectTrigger><SelectValue placeholder="Seçiniz" /></SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name} {user.surname}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="mt-2 font-medium">
                      {action.accountable ? `${action.accountable.name}` : '-'}
                    </p>
                  )}
                </div>
              </div>

              {/* C ve I - Çoklu Kişi Seçimi */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Consulted */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                        <span className="text-yellow-600 font-bold">C</span>
                      </div>
                      <div>
                        <p className="font-medium">Consulted (Danışılan)</p>
                        <p className="text-sm text-gray-500">Görüşü alınan kişiler</p>
                      </div>
                    </div>
                    {editMode && (
                      <Dialog open={consultedDialogOpen} onOpenChange={setConsultedDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Plus className="w-4 h-4 mr-1" /> Ekle
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Danışılacak Kişi Ekle</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div>
                              <Label>Kişi Seç</Label>
                              <Select value={newConsultedUserId} onValueChange={setNewConsultedUserId}>
                                <SelectTrigger><SelectValue placeholder="Seçiniz" /></SelectTrigger>
                                <SelectContent>
                                  {users.filter(u => !consultedUsers.some(c => c.userId === u.id)).map((user) => (
                                    <SelectItem key={user.id} value={user.id}>
                                      {user.name} {user.surname} {user.department?.name ? `(${user.department.name})` : ''}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Not (Opsiyonel)</Label>
                              <Input 
                                value={newConsultedNotes} 
                                onChange={(e) => setNewConsultedNotes(e.target.value)}
                                placeholder="Danışma gerekçesi..."
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setConsultedDialogOpen(false)}>İptal</Button>
                            <Button onClick={handleAddConsulted} disabled={!newConsultedUserId}>Ekle</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {consultedUsers.length === 0 ? (
                      <p className="text-sm text-gray-400 italic">Henüz kimse eklenmedi</p>
                    ) : (
                      consultedUsers.map((cu) => (
                        <div key={cu.id} className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                          <div>
                            <p className="text-sm font-medium">{cu.user.name}</p>
                            {cu.notes && <p className="text-xs text-gray-500">{cu.notes}</p>}
                          </div>
                          {editMode && (
                            <Button variant="ghost" size="sm" onClick={() => handleRemoveConsulted(cu.id)}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Informed */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                        <span className="text-purple-600 font-bold">I</span>
                      </div>
                      <div>
                        <p className="font-medium">Informed (Bilgilendirilecek)</p>
                        <p className="text-sm text-gray-500">Bilgi verilecek kişiler</p>
                      </div>
                    </div>
                    {editMode && (
                      <Dialog open={informedDialogOpen} onOpenChange={setInformedDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Plus className="w-4 h-4 mr-1" /> Ekle
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Bilgilendirilecek Kişi Ekle</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div>
                              <Label>Kişi Seç</Label>
                              <Select value={newInformedUserId} onValueChange={setNewInformedUserId}>
                                <SelectTrigger><SelectValue placeholder="Seçiniz" /></SelectTrigger>
                                <SelectContent>
                                  {users.filter(u => !informedUsers.some(i => i.userId === u.id)).map((user) => (
                                    <SelectItem key={user.id} value={user.id}>
                                      {user.name} {user.surname} {user.department?.name ? `(${user.department.name})` : ''}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Bildirim Ayarları</Label>
                              <div className="flex items-center gap-2">
                                <input type="checkbox" checked={informedSettings.notifyOnProgress} onChange={(e) => setInformedSettings({...informedSettings, notifyOnProgress: e.target.checked})} />
                                <span className="text-sm">İlerleme güncellemelerinde bilgilendir</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <input type="checkbox" checked={informedSettings.notifyOnComplete} onChange={(e) => setInformedSettings({...informedSettings, notifyOnComplete: e.target.checked})} />
                                <span className="text-sm">Tamamlandığında bilgilendir</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <input type="checkbox" checked={informedSettings.notifyOnBlock} onChange={(e) => setInformedSettings({...informedSettings, notifyOnBlock: e.target.checked})} />
                                <span className="text-sm">Blokaj durumunda bilgilendir</span>
                              </div>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setInformedDialogOpen(false)}>İptal</Button>
                            <Button onClick={handleAddInformed} disabled={!newInformedUserId}>Ekle</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {informedUsers.length === 0 ? (
                      <p className="text-sm text-gray-400 italic">Henüz kimse eklenmedi</p>
                    ) : (
                      informedUsers.map((iu) => (
                        <div key={iu.id} className="flex items-center justify-between p-2 bg-purple-50 rounded">
                          <div>
                            <p className="text-sm font-medium">{iu.user.name}</p>
                            <div className="flex gap-2 text-xs text-gray-500">
                              {iu.notifyOnProgress && <span className="bg-gray-200 px-1 rounded">İlerleme</span>}
                              {iu.notifyOnComplete && <span className="bg-gray-200 px-1 rounded">Tamamlanma</span>}
                              {iu.notifyOnBlock && <span className="bg-gray-200 px-1 rounded">Blokaj</span>}
                            </div>
                          </div>
                          {editMode && (
                            <Button variant="ghost" size="sm" onClick={() => handleRemoveInformed(iu.id)}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">RACI Açıklaması</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li><strong>R (Responsible):</strong> Görevi gerçekleştiren kişi</li>
                  <li><strong>A (Accountable):</strong> İşin sonucundan sorumlu, onay veren</li>
                  <li><strong>C (Consulted):</strong> Görüşü alınan, uzmanlık görüşü istenen kişiler</li>
                  <li><strong>I (Informed):</strong> İlerleme ve sonuçlar hakkında bilgilendirilecek kişiler</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bütçe Sekmesi */}
        <TabsContent value="budget">
          <Card>
            <CardHeader>
              <CardTitle>Bütçe Yönetimi</CardTitle>
              <CardDescription>Aksiyon bütçe takibi</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <Label>Planlanan Bütçe</Label>
                  {editMode ? (
                    <Input
                      type="number"
                      value={formData.budgetPlanned}
                      onChange={(e) => setFormData({ ...formData, budgetPlanned: e.target.value })}
                      placeholder="0"
                    />
                  ) : (
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {action.budgetPlanned ? `${action.budgetPlanned.toLocaleString()} ${action.currency}` : '-'}
                    </p>
                  )}
                </div>
                <div>
                  <Label>Gerçekleşen Bütçe</Label>
                  {editMode ? (
                    <Input
                      type="number"
                      value={formData.budgetActual}
                      onChange={(e) => setFormData({ ...formData, budgetActual: e.target.value })}
                      placeholder="0"
                    />
                  ) : (
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {action.budgetActual ? `${action.budgetActual.toLocaleString()} ${action.currency}` : '-'}
                    </p>
                  )}
                </div>
                <div>
                  <Label>Bütçe Tipi</Label>
                  {editMode ? (
                    <Select
                      value={formData.budgetType}
                      onValueChange={(v) => setFormData({ ...formData, budgetType: v })}
                    >
                      <SelectTrigger><SelectValue placeholder="Seçiniz" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CAPEX">CAPEX</SelectItem>
                        <SelectItem value="OPEX">OPEX</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-gray-900 mt-1">{action.budgetType || '-'}</p>
                  )}
                </div>
              </div>
              
              {/* Beklenen Kazanç */}
              <div className="border-t pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label>Beklenen Kazanç / Tasarruf</Label>
                    <p className="text-xs text-gray-500 mb-2">
                      Aksiyonun gerçekleşmesiyle elde edilecek tahmini kazanç veya tasarruf tutarı
                    </p>
                    {editMode ? (
                      <Input
                        type="number"
                        value={formData.expectedGain}
                        onChange={(e) => setFormData({ ...formData, expectedGain: e.target.value })}
                        placeholder="0"
                      />
                    ) : (
                      <p className="text-2xl font-bold text-green-600 mt-1">
                        {action.expectedGain ? `+${action.expectedGain.toLocaleString()} ${action.currency}` : '-'}
                      </p>
                    )}
                  </div>
                  
                  {/* Net Fayda Hesabı */}
                  {(action.budgetPlanned || action.expectedGain) && !editMode && (
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-medium text-blue-800 mb-2">Net Fayda Analizi</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Planlanan Maliyet:</span>
                          <span className="text-red-600 font-medium">
                            -{(action.budgetPlanned || 0).toLocaleString()} {action.currency}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Beklenen Kazanç:</span>
                          <span className="text-green-600 font-medium">
                            +{(action.expectedGain || 0).toLocaleString()} {action.currency}
                          </span>
                        </div>
                        <div className="border-t pt-2 flex justify-between">
                          <span className="font-medium">Net Fayda:</span>
                          <span className={`font-bold ${((action.expectedGain || 0) - (action.budgetPlanned || 0)) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                            {((action.expectedGain || 0) - (action.budgetPlanned || 0)) >= 0 ? '+' : ''}
                            {((action.expectedGain || 0) - (action.budgetPlanned || 0)).toLocaleString()} {action.currency}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {action.budgetPlanned && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Bütçe Kullanım Durumu</h4>
                  <Progress value={budgetUsage} className="h-4" />
                  <div className="flex justify-between text-sm mt-2">
                    <span>%{budgetUsage} kullanıldı</span>
                    <span className={budgetUsage > 100 ? 'text-red-600 font-medium' : ''}>
                      {budgetUsage > 100 ? 'Bütçe aşımı!' : `${100 - budgetUsage}% kalan`}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Kilometre Taşları Sekmesi */}
        <TabsContent value="milestones">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Kilometre Taşları</CardTitle>
                <CardDescription>Aksiyon adımları ve ilerleme takibi</CardDescription>
              </div>
              <Dialog open={milestoneDialogOpen} onOpenChange={setMilestoneDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" /> Yeni Kilometre Taşı
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Yeni Kilometre Taşı</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Adı *</Label>
                      <Input
                        value={milestoneForm.name}
                        onChange={(e) => setMilestoneForm({ ...milestoneForm, name: e.target.value })}
                        placeholder="Kilometre taşı adı"
                      />
                    </div>
                    <div>
                      <Label>Açıklama</Label>
                      <Textarea
                        value={milestoneForm.description}
                        onChange={(e) => setMilestoneForm({ ...milestoneForm, description: e.target.value })}
                        placeholder="Açıklama"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Planlanan Tarih *</Label>
                        <Input
                          type="date"
                          value={milestoneForm.plannedDate}
                          onChange={(e) => setMilestoneForm({ ...milestoneForm, plannedDate: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Ağırlık</Label>
                        <Input
                          type="number"
                          min={0.1}
                          step={0.1}
                          value={milestoneForm.weight}
                          onChange={(e) => setMilestoneForm({ ...milestoneForm, weight: parseFloat(e.target.value) || 1 })}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Ağırlıklar göreceli önem belirtir. Tamamlanan kilometre taşlarının ağırlıkları toplamı / toplam ağırlık oranı ilerleme yüzdesini belirler.
                        </p>
                      </div>
                    </div>
                    <div>
                      <Label>Teslim Edilecekler</Label>
                      <Textarea
                        value={milestoneForm.deliverables}
                        onChange={(e) => setMilestoneForm({ ...milestoneForm, deliverables: e.target.value })}
                        placeholder="Teslim edilecek çıktılar"
                      />
                    </div>
                    <Button onClick={handleAddMilestone} className="w-full">
                      Ekle
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {action.milestones?.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Henüz kilometre taşı eklenmemiş
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Adı</TableHead>
                      <TableHead>Durum</TableHead>
                      <TableHead>Planlanan</TableHead>
                      <TableHead>Gerçekleşen</TableHead>
                      <TableHead>Ağırlık</TableHead>
                      <TableHead>İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {action.milestones?.map((milestone: any) => {
                      const mStatus = milestoneStatusConfig[milestone.status] || milestoneStatusConfig.BEKLIYOR;
                      const isDelayed = new Date(milestone.plannedDate) < new Date() && milestone.status !== 'TAMAMLANDI';

                      return (
                        <TableRow key={milestone.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{milestone.name}</p>
                              {milestone.description && (
                                <p className="text-sm text-gray-500">{milestone.description}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={milestone.status}
                              onValueChange={(v) => handleUpdateMilestone(milestone.id, { status: v })}
                            >
                              <SelectTrigger className="w-[140px]">
                                <Badge className={mStatus.color}>{mStatus.label}</Badge>
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(milestoneStatusConfig).map(([key, val]) => (
                                  <SelectItem key={key} value={key}>{val.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className={isDelayed ? 'text-red-600' : ''}>
                            {format(new Date(milestone.plannedDate), 'dd MMM yyyy', { locale: tr })}
                          </TableCell>
                          <TableCell>
                            {milestone.actualDate
                              ? format(new Date(milestone.actualDate), 'dd MMM yyyy', { locale: tr })
                              : '-'}
                          </TableCell>
                          <TableCell>{milestone.weight}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteMilestone(milestone.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* KPI Sekmesi */}
        <TabsContent value="kpis">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Bağlı KPI&apos;lar</CardTitle>
                <CardDescription>Aksiyonla ilişkilendirilmiş performans göstergeleri</CardDescription>
              </div>
              <Dialog open={kpiDialogOpen} onOpenChange={setKpiDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" /> KPI Bağla
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>KPI Bağla</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>KPI Seçin</Label>
                      <Select value={selectedKpiId} onValueChange={setSelectedKpiId}>
                        <SelectTrigger>
                          <SelectValue placeholder="KPI seçin..." />
                        </SelectTrigger>
                        <SelectContent>
                          {kpis
                            .filter(k => !actionKpis.some(ak => ak.kpiId === k.id))
                            .map((kpi) => (
                              <SelectItem key={kpi.id} value={kpi.id}>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{kpi.code}</span>
                                  <span className="text-gray-500">-</span>
                                  <span>{kpi.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleAddKpi} className="w-full">
                      <Link2 className="h-4 w-4 mr-2" /> Bağla
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {actionKpis.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                  <p>Henüz KPI bağlanmamış</p>
                  <p className="text-sm">KPI bağlayarak aksiyonun performans göstergelerine etkisini takip edin</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kod</TableHead>
                      <TableHead>KPI Adı</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead>Sorumlu Kişi</TableHead>
                      <TableHead>İşlem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {actionKpis.map((link: any) => (
                      <TableRow key={link.id}>
                        <TableCell>
                          <Badge variant="outline">{link.kpi.code}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{link.kpi.name}</TableCell>
                        <TableCell>{link.kpi.category?.name || '-'}</TableCell>
                        <TableCell>{link.kpi.owner?.name || '-'}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveKpi(link.kpiId)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
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

        {/* Kapanış Kanıtları Sekmesi */}
        <TabsContent value="closing">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                Kapanış Kanıtları
              </CardTitle>
              <CardDescription>
                Aksiyon tamamlandığında sunulması gereken kanıt dokümanları
                {action?.closingEvidenceRequired && (
                  <Badge className="ml-2 bg-orange-100 text-orange-700">Zorunlu</Badge>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Upload Section */}
              {action?.status !== 'TAMAMLANDI' && (
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <Upload className="h-10 w-10 mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-600 mb-2">Kanıt dosyası yükleyin</p>
                  <p className="text-sm text-gray-400 mb-4">PDF, Word, Excel, resim dosyaları</p>
                  <input
                    type="file"
                    id="evidence-upload"
                    className="hidden"
                    onChange={handleUploadEvidence}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                    disabled={uploadingEvidence}
                  />
                  <label htmlFor="evidence-upload">
                    <Button
                      variant="outline"
                      asChild
                      disabled={uploadingEvidence}
                    >
                      <span>
                        {uploadingEvidence ? 'Yükleniyor...' : 'Dosya Seç'}
                      </span>
                    </Button>
                  </label>
                </div>
              )}

              {/* Evidence List */}
              {closingEvidence.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  Henüz kapanış kanıtı yüklenmemiş
                </div>
              ) : (
                <div className="space-y-3">
                  {closingEvidence.map((ev: any) => (
                    <div key={ev.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <File className="h-8 w-8 text-blue-500" />
                        <div>
                          <p className="font-medium">{ev.name}</p>
                          <p className="text-sm text-gray-500">
                            {ev.uploadedBy?.name} - {format(new Date(ev.createdAt), 'dd MMM yyyy HH:mm', { locale: tr })}
                          </p>
                        </div>
                      </div>
                      {action?.status !== 'TAMAMLANDI' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteEvidence(ev.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Closing Notes */}
              {action?.closingNotes && (
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-green-800 mb-2">Kapanış Notları</h4>
                  <p className="text-green-700">{action.closingNotes}</p>
                  {action.closedBy && action.closingDate && (
                    <p className="text-sm text-green-600 mt-2">
                      {action.closedBy.name} tarafından {format(new Date(action.closingDate), 'dd MMM yyyy HH:mm', { locale: tr })} tarihinde kapatıldı
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* İş Akışı Sekmesi */}
        <TabsContent value="workflow">
          <ActionWorkflow
            actionId={id}
            currentStatus={action.workflowStatus || 'TASLAK'}
            accountableId={action.accountableId}
            onStatusChange={fetchAction}
          />
        </TabsContent>

        {/* Ekler Sekmesi */}
        <TabsContent value="attachments">
          <ActionAttachments actionId={id} />
        </TabsContent>

        {/* Yorumlar Sekmesi */}
        <TabsContent value="comments">
          <ActionComments actionId={id} />
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Tarihçe</CardTitle>
              <CardDescription>Aksiyon değişiklik geçmişi</CardDescription>
            </CardHeader>
            <CardContent>
              {action.histories?.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Henüz tarihçe kaydı yok
                </div>
              ) : (
                <div className="space-y-4">
                  {action.histories?.map((history: any) => (
                    <div key={history.id} className="flex items-start gap-4 p-4 border rounded-lg">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <History className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{history.actionType.replace(/_/g, ' ')}</p>
                          <p className="text-sm text-gray-500">
                            {format(new Date(history.createdAt), 'dd MMM yyyy HH:mm', { locale: tr })}
                          </p>
                        </div>
                        {history.oldValue && history.newValue && (
                          <p className="text-sm text-gray-600 mt-1">
                            {history.oldValue} → {history.newValue}
                          </p>
                        )}
                        {history.comments && (
                          <p className="text-sm text-gray-500 mt-1">{history.comments}</p>
                        )}
                        <p className="text-sm text-gray-400 mt-1">- {history.user?.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Aksiyon Tamamlama Dialogu */}
      <Dialog open={closingDialogOpen} onOpenChange={setClosingDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Aksiyonu Tamamla
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Evidence Status */}
            <div className={`p-4 rounded-lg ${action?.closingEvidenceRequired && closingEvidence.length === 0 ? 'bg-red-50' : 'bg-green-50'}`}>
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className={`h-5 w-5 ${action?.closingEvidenceRequired && closingEvidence.length === 0 ? 'text-red-600' : 'text-green-600'}`} />
                <span className="font-medium">
                  Kapanış Kanıtları {action?.closingEvidenceRequired ? '(Zorunlu)' : '(İsteğe bağlı)'}
                </span>
              </div>
              {closingEvidence.length === 0 ? (
                <p className={`text-sm ${action?.closingEvidenceRequired ? 'text-red-600' : 'text-gray-600'}`}>
                  {action?.closingEvidenceRequired 
                    ? 'Aksiyonu tamamlamak için en az bir kanıt dosyası yüklenmelidir.'
                    : 'Henüz kanıt dosyası yüklenmemiş.'}
                </p>
              ) : (
                <div className="space-y-1">
                  {closingEvidence.map((ev: any) => (
                    <div key={ev.id} className="flex items-center gap-2 text-sm text-green-700">
                      <File className="h-4 w-4" />
                      <span>{ev.name}</span>
                    </div>
                  ))}
                </div>
              )}
              {action?.closingEvidenceRequired && closingEvidence.length === 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => {
                    setClosingDialogOpen(false);
                    // Navigate to closing tab - this will be handled by tabs
                  }}
                >
                  <Upload className="h-4 w-4 mr-2" /> Kanıt Yükle
                </Button>
              )}
            </div>

            {/* Closing Notes */}
            <div>
              <Label>Kapanış Notları</Label>
              <Textarea
                value={closingNotes}
                onChange={(e) => setClosingNotes(e.target.value)}
                placeholder="Aksiyon kapanışı hakkında notlar..."
                rows={4}
              />
            </div>

            {/* Warning for incomplete milestones */}
            {action?.milestoneStats?.pending > 0 && (
              <div className="p-3 bg-yellow-50 rounded-lg flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-sm text-yellow-800 font-medium">Tamamlanmamış Kilometre Taşları</p>
                  <p className="text-sm text-yellow-700">
                    {action.milestoneStats.pending} adet bekleyen kilometre taşı var.
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setClosingDialogOpen(false)}>
                İptal
              </Button>
              <Button 
                className="bg-green-600 hover:bg-green-700"
                onClick={handleCloseAction}
                disabled={action?.closingEvidenceRequired && closingEvidence.length === 0}
              >
                <CheckCircle className="h-4 w-4 mr-2" /> Aksiyonu Tamamla
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
