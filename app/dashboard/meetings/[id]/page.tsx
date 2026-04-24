'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  Video,
  Lock,
  Pencil,
  Trash2,
  Plus,
  FileText,
  CheckCircle,
  XCircle,
  HelpCircle,
  Upload,
  Download,
  Eye,
  Send,
  Repeat,
  ListTodo,
  Target,
  UserPlus,
  StickyNote,
} from 'lucide-react';
import { generatePresignedUploadUrl } from '@/lib/storage';

interface Meeting {
  id: string;
  code: string;
  title: string;
  description: string | null;
  type: string;
  date: string;
  startTime: string;
  endTime: string;
  room: { id: string; name: string; location: string } | null;
  onlineLink: string | null;
  isOnline: boolean;
  isPrivate: boolean;
  status: string;
  isRecurring: boolean;
  recurrenceType: string | null;
  agenda: string | null;
  notes: string | null;
  department: { id: string; name: string } | null;
  createdBy: { id: string; name: string; surname: string; email: string };
  parentMeeting: { id: string; code: string; title: string } | null;
  childMeetings: Array<{ id: string; code: string; title: string; date: string; status: string }>;
  participants: Array<{
    id: string;
    status: string;
    responseNote: string | null;
    attended: boolean | null;
    user: {
      id: string;
      name: string;
      surname: string;
      email: string;
      department: { id: string; name: string } | null;
      position: { id: string; name: string } | null;
    };
  }>;
  externalParticipants: Array<{
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    company: string | null;
    title: string | null;
    status: string;
    attended: boolean | null;
  }>;
  actions: Array<{
    id: string;
    type: string | null;
    title: string;
    description: string | null;
    status: string;
    progress: number;
    dueDate: string;
    completedAt: string | null;
    completionNote: string | null;
    inPool: boolean;
    assignee: { id: string; name: string; surname: string; email: string };
    createdBy: { id: string; name: string; surname: string };
    followers: Array<{ user: { id: string; name: string; surname: string } }>;
  }>;
  documents: Array<{
    id: string;
    name: string;
    description: string | null;
    fileName: string;
    fileSize: number | null;
    cloud_storage_path: string;
    uploadedBy: { id: string; name: string; surname: string };
    createdAt: string;
    url?: string;
  }>;
  poolItems: Array<{
    id: string;
    title: string | null;
    description: string | null;
    status: string;
    action: any;
  }>;
}

interface MeetingDecision {
  id: string;
  decision: string;
  assignee: { id: string; name: string; surname: string; email: string } | null;
  createdBy: { id: string; name: string; surname: string };
  dueDate: string | null;
  status: string;
  createdAt: string;
}

interface User {
  id: string;
  name: string;
  surname: string;
  email: string;
}

const statusColors: Record<string, string> = {
  PLANLANMIS: 'bg-blue-100 text-blue-800',
  DEVAM_EDIYOR: 'bg-green-100 text-green-800',
  TAMAMLANDI: 'bg-gray-100 text-gray-800',
  IPTAL: 'bg-red-100 text-red-800',
  ERTELENDI: 'bg-yellow-100 text-yellow-800',
};

const statusLabels: Record<string, string> = {
  PLANLANMIS: 'Planlandı',
  DEVAM_EDIYOR: 'Devam Ediyor',
  TAMAMLANDI: 'Tamamlandı',
  IPTAL: 'İptal',
  ERTELENDI: 'Ertelendi',
};

const participantStatusColors: Record<string, string> = {
  DAVET_EDILDI: 'bg-gray-100 text-gray-800',
  ONAYLADI: 'bg-green-100 text-green-800',
  REDDETTI: 'bg-red-100 text-red-800',
  BELKI: 'bg-yellow-100 text-yellow-800',
};

const participantStatusLabels: Record<string, string> = {
  DAVET_EDILDI: 'Davet Edildi',
  ONAYLADI: 'Katılacak',
  REDDETTI: 'Katılamayacak',
  BELKI: 'Belki',
};

const actionStatusColors: Record<string, string> = {
  BEKLEMEDE: 'bg-gray-100 text-gray-800',
  DEVAM_EDIYOR: 'bg-blue-100 text-blue-800',
  TAMAMLANDI: 'bg-green-100 text-green-800',
  IPTAL: 'bg-red-100 text-red-800',
  ERTELENDI: 'bg-yellow-100 text-yellow-800',
};

const actionStatusLabels: Record<string, string> = {
  BEKLEMEDE: 'Beklemede',
  DEVAM_EDIYOR: 'Devam Ediyor',
  TAMAMLANDI: 'Tamamlandı',
  IPTAL: 'İptal',
  ERTELENDI: 'Ertelendi',
};

export default function MeetingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession() || {};
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});
  
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionForm, setActionForm] = useState({
    type: '',
    title: '',
    description: '',
    assigneeId: '',
    dueDate: format(new Date(), 'yyyy-MM-dd'),
    followers: [] as string[],
  });

  const [participantDialogOpen, setParticipantDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [externalParticipantForm, setExternalParticipantForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    title: '',
  });

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState('');
  const [uploading, setUploading] = useState(false);

  // Multi-select participant state
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // Kararlar state
  const [decisions, setDecisions] = useState<MeetingDecision[]>([]);
  const [decisionDialogOpen, setDecisionDialogOpen] = useState(false);
  const [decisionForm, setDecisionForm] = useState({
    decision: '',
    assigneeId: '',
    dueDate: '',
  });

  // Notlar state
  const [meetingNotes, setMeetingNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  // Aksiyon tamamlama dialog state
  const [completionDialogOpen, setCompletionDialogOpen] = useState(false);
  const [pendingCompletionActionId, setPendingCompletionActionId] = useState<string | null>(null);
  const [completionNote, setCompletionNote] = useState('');

  useEffect(() => {
    if (params.id) {
      fetchMeeting();
      fetchUsers();
      fetchDecisions();
    }
  }, [params.id]);

  const fetchMeeting = async () => {
    try {
      const res = await fetch(`/api/meetings/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setMeeting(data);
        setMeetingNotes(data.notes || '');
        setEditData({
          title: data.title,
          description: data.description || '',
          status: data.status,
          notes: data.notes || '',
          agenda: data.agenda || '',
        });
      } else {
        toast.error('Toplantı bulunamadı');
        router.push('/dashboard/meetings');
      }
    } catch (error) {
      console.error('Meeting fetch error:', error);
      toast.error('Hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : data.users || []);
      }
    } catch (error) {
      console.error('Users fetch error:', error);
    }
  };

  const handleSave = async () => {
    try {
      const res = await fetch(`/api/meetings/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      });

      if (res.ok) {
        toast.success('Toplantı güncellendi');
        setEditing(false);
        fetchMeeting();
      } else {
        toast.error('Güncelleme başarısız');
      }
    } catch (error) {
      toast.error('Hata oluştu');
    }
  };

  const updateParticipantStatus = async (participantId: string, status: string, external: boolean = false) => {
    try {
      const res = await fetch(`/api/meetings/${params.id}/participants`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId, status, external }),
      });

      if (res.ok) {
        toast.success('Durum güncellendi');
        fetchMeeting();
      }
    } catch (error) {
      toast.error('Hata oluştu');
    }
  };

  const addParticipant = async () => {
    if (!selectedUserId && !externalParticipantForm.name) {
      toast.error('Katılımcı seçin veya bilgileri girin');
      return;
    }

    try {
      const body = selectedUserId
        ? { userId: selectedUserId }
        : { external: true, ...externalParticipantForm };

      const res = await fetch(`/api/meetings/${params.id}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success('Katılımcı eklendi');
        setParticipantDialogOpen(false);
        setSelectedUserId('');
        setExternalParticipantForm({ name: '', email: '', phone: '', company: '', title: '' });
        fetchMeeting();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Hata oluştu');
      }
    } catch (error) {
      toast.error('Hata oluştu');
    }
  };

  const removeParticipant = async (participantId: string, external: boolean = false) => {
    if (!confirm('Katılımcıyı kaldırmak istediğinize emin misiniz?')) return;

    try {
      const res = await fetch(
        `/api/meetings/${params.id}/participants?participantId=${participantId}&external=${external}`,
        { method: 'DELETE' }
      );

      if (res.ok) {
        toast.success('Katılımcı kaldırıldı');
        fetchMeeting();
      }
    } catch (error) {
      toast.error('Hata oluştu');
    }
  };

  const createAction = async () => {
    if (!actionForm.title || !actionForm.assigneeId || !actionForm.dueDate) {
      toast.error('Başlık, sorumlu ve bitiş tarihi zorunludur');
      return;
    }

    try {
      const res = await fetch(`/api/meetings/${params.id}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(actionForm),
      });

      if (res.ok) {
        toast.success('Aksiyon oluşturuldu');
        setActionDialogOpen(false);
        setActionForm({
          type: '',
          title: '',
          description: '',
          assigneeId: '',
          dueDate: format(new Date(), 'yyyy-MM-dd'),
          followers: [],
        });
        fetchMeeting();
      }
    } catch (error) {
      toast.error('Hata oluştu');
    }
  };

  const updateActionStatus = async (actionId: string, status: string) => {
    if (status === 'TAMAMLANDI') {
      setPendingCompletionActionId(actionId);
      setCompletionNote('');
      setCompletionDialogOpen(true);
      return;
    }
    try {
      const res = await fetch(`/api/meetings/${params.id}/actions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionId, status }),
      });

      if (res.ok) {
        toast.success('Aksiyon güncellendi');
        fetchMeeting();
      }
    } catch (error) {
      toast.error('Hata oluştu');
    }
  };

  const confirmActionCompletion = async () => {
    if (!completionNote.trim()) {
      toast.error('Lütfen tamamlama açıklaması yazınız');
      return;
    }
    try {
      const res = await fetch(`/api/meetings/${params.id}/actions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionId: pendingCompletionActionId,
          status: 'TAMAMLANDI',
          completionNote: completionNote.trim(),
        }),
      });

      if (res.ok) {
        toast.success('Aksiyon tamamlandı');
        setCompletionDialogOpen(false);
        setPendingCompletionActionId(null);
        setCompletionNote('');
        fetchMeeting();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Hata oluştu');
      }
    } catch (error) {
      toast.error('Hata oluştu');
    }
  };

  const addToPool = async (actionId: string) => {
    try {
      const res = await fetch(`/api/meetings/${params.id}/actions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionId, inPool: true }),
      });

      if (res.ok) {
        toast.success('Aksiyon toplantı havuzuna eklendi');
        fetchMeeting();
      }
    } catch (error) {
      toast.error('Hata oluştu');
    }
  };

  const handleFileUpload = async () => {
    if (!uploadFile || !uploadName) {
      toast.error('Dosya ve adı zorunludur');
      return;
    }

    setUploading(true);
    try {
      // Presigned URL al
      const presignedRes = await fetch('/api/upload/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: uploadFile.name,
          contentType: uploadFile.type,
          isPublic: false,
        }),
      });

      if (!presignedRes.ok) throw new Error('Presigned URL alınamadı');
      const { uploadUrl, cloud_storage_path } = await presignedRes.json();

      // S3'e yükle
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': uploadFile.type },
        body: uploadFile,
      });

      if (!uploadRes.ok) throw new Error('Dosya yüklenemedi');

      // Dökümanı kaydet
      const docRes = await fetch(`/api/meetings/${params.id}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: uploadName,
          fileName: uploadFile.name,
          fileSize: uploadFile.size,
          mimeType: uploadFile.type,
          cloud_storage_path,
          isPublic: false,
        }),
      });

      if (docRes.ok) {
        toast.success('Döküman yüklendi');
        setUploadDialogOpen(false);
        setUploadFile(null);
        setUploadName('');
        fetchMeeting();
      }
    } catch (error) {
      toast.error('Dosya yüklenirken hata oluştu');
    } finally {
      setUploading(false);
    }
  };

  const deleteDocument = async (documentId: string) => {
    if (!confirm('Dökümanı silmek istediğinize emin misiniz?')) return;

    try {
      const res = await fetch(
        `/api/meetings/${params.id}/documents?documentId=${documentId}`,
        { method: 'DELETE' }
      );

      if (res.ok) {
        toast.success('Döküman silindi');
        fetchMeeting();
      }
    } catch (error) {
      toast.error('Hata oluştu');
    }
  };

  // Fetch decisions
  const fetchDecisions = async () => {
    try {
      const res = await fetch(`/api/meetings/${params.id}/decisions`);
      if (res.ok) {
        const data = await res.json();
        setDecisions(data);
      }
    } catch (error) {
      console.error('Decisions fetch error:', error);
    }
  };

  // Multi-select participant add
  const addMultipleParticipants = async () => {
    if (selectedUserIds.length === 0) {
      toast.error('En az bir katılımcı seçin');
      return;
    }

    try {
      let successCount = 0;
      for (const userId of selectedUserIds) {
        const res = await fetch(`/api/meetings/${params.id}/participants`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        });
        if (res.ok) successCount++;
      }
      toast.success(`${successCount} katılımcı eklendi`);
      setParticipantDialogOpen(false);
      setSelectedUserIds([]);
      fetchMeeting();
    } catch (error) {
      toast.error('Hata oluştu');
    }
  };

  // Create decision
  const createDecision = async () => {
    if (!decisionForm.decision) {
      toast.error('Karar metni zorunludur');
      return;
    }

    try {
      const res = await fetch(`/api/meetings/${params.id}/decisions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(decisionForm),
      });

      if (res.ok) {
        toast.success('Karar eklendi');
        setDecisionDialogOpen(false);
        setDecisionForm({ decision: '', assigneeId: '', dueDate: '' });
        fetchDecisions();
      }
    } catch (error) {
      toast.error('Hata oluştu');
    }
  };

  // Update decision status
  const updateDecisionStatus = async (decisionId: string, status: string) => {
    try {
      const res = await fetch(`/api/meetings/${params.id}/decisions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decisionId, status }),
      });

      if (res.ok) {
        toast.success('Karar durumu güncellendi');
        fetchDecisions();
      }
    } catch (error) {
      toast.error('Hata oluştu');
    }
  };

  // Delete decision
  const deleteDecision = async (decisionId: string) => {
    if (!confirm('Kararı silmek istediğinize emin misiniz?')) return;
    try {
      const res = await fetch(
        `/api/meetings/${params.id}/decisions?decisionId=${decisionId}`,
        { method: 'DELETE' }
      );
      if (res.ok) {
        toast.success('Karar silindi');
        fetchDecisions();
      }
    } catch (error) {
      toast.error('Hata oluştu');
    }
  };

  // Save notes
  const saveNotes = async () => {
    setSavingNotes(true);
    try {
      const res = await fetch(`/api/meetings/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: meetingNotes }),
      });

      if (res.ok) {
        toast.success('Notlar kaydedildi');
        fetchMeeting();
      } else {
        toast.error('Notlar kaydedilemedi');
      }
    } catch (error) {
      toast.error('Hata oluştu');
    } finally {
      setSavingNotes(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Yükleniyor...</div>;
  }

  if (!meeting) {
    return <div className="text-center">Toplantı bulunamadı</div>;
  }

  const isCreator = meeting.createdBy.id === session?.user?.id;
  const isParticipant = meeting.participants.some(p => p.user.id === session?.user?.id);
  const myParticipation = meeting.participants.find(p => p.user.id === session?.user?.id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push('/dashboard/meetings')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold">{meeting.title}</h2>
              {meeting.isPrivate && <Lock className="h-5 w-5 text-muted-foreground" />}
              {meeting.isRecurring && <Repeat className="h-5 w-5 text-blue-500" />}
            </div>
            <p className="text-muted-foreground">{meeting.code}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={statusColors[meeting.status]}>
            {statusLabels[meeting.status]}
          </Badge>
          {isCreator && (
            <>
              <Button variant="outline" onClick={() => setEditing(!editing)}>
                <Pencil className="mr-2 h-4 w-4" />
                {editing ? 'Vazgeç' : 'Düzenle'}
              </Button>
              {editing && (
                <Button onClick={handleSave}>Kaydet</Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* My Participation Status */}
      {myParticipation && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Katılım Durumunuz</p>
                <p className="text-sm text-muted-foreground">
                  Mevcut durum: {participantStatusLabels[myParticipation.status]}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={myParticipation.status === 'ONAYLADI' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateParticipantStatus(myParticipation.id, 'ONAYLADI')}
                >
                  <CheckCircle className="mr-1 h-4 w-4" />
                  Katılacağım
                </Button>
                <Button
                  variant={myParticipation.status === 'BELKI' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateParticipantStatus(myParticipation.id, 'BELKI')}
                >
                  <HelpCircle className="mr-1 h-4 w-4" />
                  Belki
                </Button>
                <Button
                  variant={myParticipation.status === 'REDDETTI' ? 'destructive' : 'outline'}
                  size="sm"
                  onClick={() => updateParticipantStatus(myParticipation.id, 'REDDETTI')}
                >
                  <XCircle className="mr-1 h-4 w-4" />
                  Katılamayacağım
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Sol Kolon - Detaylar */}
        <div className="col-span-2 space-y-6">
          <Tabs defaultValue="details">
            <TabsList>
              <TabsTrigger value="details">Detaylar</TabsTrigger>
              <TabsTrigger value="participants">
                Katılımcılar ({meeting.participants.length + meeting.externalParticipants.length})
              </TabsTrigger>
              <TabsTrigger value="actions">
                Aksiyonlar ({meeting.actions.length})
              </TabsTrigger>
              <TabsTrigger value="documents">
                Dökümanlar ({meeting.documents.length})
              </TabsTrigger>
              <TabsTrigger value="decisions">
                Kararlar ({decisions.filter(d => d.status === 'DEVAM_EDIYOR').length})
              </TabsTrigger>
              <TabsTrigger value="notes">
                Notlar
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Toplantı Bilgileri</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {editing ? (
                    <>
                      <div>
                        <Label>Başlık</Label>
                        <Input
                          value={editData.title}
                          onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Durum</Label>
                        <Select
                          value={editData.status}
                          onValueChange={(v) => setEditData({ ...editData, status: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PLANLANMIS">Planlandı</SelectItem>
                            <SelectItem value="DEVAM_EDIYOR">Devam Ediyor</SelectItem>
                            <SelectItem value="TAMAMLANDI">Tamamlandı</SelectItem>
                            <SelectItem value="IPTAL">İptal</SelectItem>
                            <SelectItem value="ERTELENDI">Ertelendi</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Gündem</Label>
                        <Textarea
                          value={editData.agenda}
                          onChange={(e) => setEditData({ ...editData, agenda: e.target.value })}
                          rows={4}
                        />
                      </div>
                      <div>
                        <Label>Toplantı Notları / Tutanak</Label>
                        <Textarea
                          value={editData.notes}
                          onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                          rows={6}
                          placeholder="Toplantı sırasında alınan notlar..."
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{format(parseISO(meeting.date), 'd MMMM yyyy, EEEE', { locale: tr })}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {format(parseISO(meeting.startTime), 'HH:mm')} - {format(parseISO(meeting.endTime), 'HH:mm')}
                          </span>
                        </div>
                        {meeting.room && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span>{meeting.room.name} {meeting.room.location && `(${meeting.room.location})`}</span>
                          </div>
                        )}
                        {meeting.isOnline && meeting.onlineLink && (
                          <div className="flex items-center gap-2">
                            <Video className="h-4 w-4 text-muted-foreground" />
                            <a href={meeting.onlineLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline cursor-pointer">
                              Online Toplantı Linki
                            </a>
                          </div>
                        )}
                      </div>

                      {meeting.agenda && (
                        <div>
                          <h4 className="font-medium mb-2">Gündem</h4>
                          <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded">{meeting.agenda}</p>
                        </div>
                      )}

                      {meeting.description && (
                        <div>
                          <h4 className="font-medium mb-2">Açıklama</h4>
                          <p className="text-sm text-muted-foreground">{meeting.description}</p>
                        </div>
                      )}

                      {meeting.notes && (
                        <div>
                          <h4 className="font-medium mb-2">Toplantı Notları / Tutanak</h4>
                          <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded">{meeting.notes}</p>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Periyodik toplantılar */}
              {meeting.childMeetings.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Repeat className="h-5 w-5" />
                      Periyodik Toplantılar
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {meeting.childMeetings.map((child) => (
                        <div
                          key={child.id}
                          className="flex items-center justify-between p-2 border rounded hover:bg-muted cursor-pointer"
                          onClick={() => router.push(`/dashboard/meetings/${child.id}`)}
                        >
                          <div>
                            <span className="font-medium">{format(parseISO(child.date), 'd MMM yyyy', { locale: tr })}</span>
                            <span className="text-muted-foreground ml-2">{child.code}</span>
                          </div>
                          <Badge className={statusColors[child.status]}>
                            {statusLabels[child.status]}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="participants" className="mt-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Katılımcılar</CardTitle>
                  {isCreator && (
                    <Button size="sm" onClick={() => setParticipantDialogOpen(true)}>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Katılımcı Ekle
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ad Soyad</TableHead>
                        <TableHead>Departman/Firma</TableHead>
                        <TableHead>Durum</TableHead>
                        <TableHead>Katıldı mı?</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {meeting.participants.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{p.user.name} {p.user.surname}</p>
                              <p className="text-sm text-muted-foreground">{p.user.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {p.user.department?.name}
                            {p.user.position && <span className="text-muted-foreground"> - {p.user.position.name}</span>}
                          </TableCell>
                          <TableCell>
                            <Badge className={participantStatusColors[p.status]}>
                              {participantStatusLabels[p.status]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {p.attended === true && <CheckCircle className="h-5 w-5 text-green-500" />}
                            {p.attended === false && <XCircle className="h-5 w-5 text-red-500" />}
                          </TableCell>
                          <TableCell>
                            {isCreator && p.user.id !== session?.user?.id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeParticipant(p.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {meeting.externalParticipants.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{p.name}</p>
                              <p className="text-sm text-muted-foreground">{p.email || p.phone}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {p.company}
                            {p.title && <span className="text-muted-foreground"> - {p.title}</span>}
                          </TableCell>
                          <TableCell>
                            <Badge className={participantStatusColors[p.status]}>
                              {participantStatusLabels[p.status]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {p.attended === true && <CheckCircle className="h-5 w-5 text-green-500" />}
                            {p.attended === false && <XCircle className="h-5 w-5 text-red-500" />}
                          </TableCell>
                          <TableCell>
                            {isCreator && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeParticipant(p.id, true)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="actions" className="mt-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Aksiyonlar / Görevler</CardTitle>
                  <Button size="sm" onClick={() => setActionDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Aksiyon Ekle
                  </Button>
                </CardHeader>
                <CardContent>
                  {meeting.actions.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Henüz aksiyon bulunmuyor
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {meeting.actions.map((action) => (
                        <div key={action.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{action.title}</h4>
                                <Badge className={actionStatusColors[action.status]}>
                                  {actionStatusLabels[action.status]}
                                </Badge>
                                {action.inPool && (
                                  <Badge variant="outline">Havuzda</Badge>
                                )}
                              </div>
                              {action.description && (
                                <p className="text-sm text-muted-foreground mt-1">{action.description}</p>
                              )}
                              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                <span>
                                  Sorumlu: {action.assignee.name} {action.assignee.surname}
                                </span>
                                <span>
                                  Bitiş: {format(parseISO(action.dueDate), 'd MMM yyyy', { locale: tr })}
                                </span>
                                {action.followers.length > 0 && (
                                  <span>
                                    Takipçiler: {action.followers.map(f => f.user.name).join(', ')}
                                  </span>
                                )}
                              </div>
                              {action.completionNote && (
                                <div className="mt-2 flex items-start gap-1.5 text-sm bg-green-50 border border-green-200 rounded px-3 py-2">
                                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                  <div>
                                    <span className="font-medium text-green-700">Tamamlama Notu: </span>
                                    <span className="text-green-800">{action.completionNote}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {action.status !== 'TAMAMLANDI' && !action.inPool && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => addToPool(action.id)}
                                  title="Havuza Ekle"
                                >
                                  <Target className="h-4 w-4" />
                                </Button>
                              )}
                              <Select
                                value={action.status}
                                onValueChange={(v) => updateActionStatus(action.id, v)}
                              >
                                <SelectTrigger className="w-[130px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="BEKLEMEDE">Beklemede</SelectItem>
                                  <SelectItem value="DEVAM_EDIYOR">Devam Ediyor</SelectItem>
                                  <SelectItem value="TAMAMLANDI">Tamamlandı</SelectItem>
                                  <SelectItem value="IPTAL">İptal</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          {/* Progress bar */}
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span>İlerleme</span>
                              <span>%{action.progress}</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 transition-all"
                                style={{ width: `${action.progress}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents" className="mt-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Dökümanlar</CardTitle>
                  <Button size="sm" onClick={() => setUploadDialogOpen(true)}>
                    <Upload className="mr-2 h-4 w-4" />
                    Döküman Yükle
                  </Button>
                </CardHeader>
                <CardContent>
                  {meeting.documents.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Henüz döküman yüklenmemiş
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {meeting.documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-3 border rounded">
                          <div className="flex items-center gap-3">
                            <FileText className="h-8 w-8 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{doc.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {doc.fileName} • {doc.uploadedBy.name} {doc.uploadedBy.surname} • {format(parseISO(doc.createdAt), 'd MMM yyyy', { locale: tr })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {doc.url && (
                              <Button variant="outline" size="sm" asChild>
                                <a href={doc.url} target="_blank" download>
                                  <Download className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                            {isCreator && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteDocument(doc.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Kararlar Tab */}
            <TabsContent value="decisions" className="mt-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Kararlar</CardTitle>
                  <Button size="sm" onClick={() => setDecisionDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Karar Ekle
                  </Button>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="devam_ediyor">
                    <TabsList className="mb-4">
                      <TabsTrigger value="devam_ediyor">
                        Devam Ediyor ({decisions.filter(d => d.status === 'DEVAM_EDIYOR').length})
                      </TabsTrigger>
                      <TabsTrigger value="beklemede">
                        Beklemede ({decisions.filter(d => d.status === 'BEKLEMEDE').length})
                      </TabsTrigger>
                      <TabsTrigger value="tamamlananlar">
                        Tamamlananlar ({decisions.filter(d => d.status === 'TAMAMLANDI' || d.status === 'IPTAL').length})
                      </TabsTrigger>
                    </TabsList>

                    {(['devam_ediyor', 'beklemede', 'tamamlananlar'] as const).map((tab) => {
                      const filtered = decisions.filter(d => {
                        if (tab === 'devam_ediyor') return d.status === 'DEVAM_EDIYOR';
                        if (tab === 'beklemede') return d.status === 'BEKLEMEDE';
                        return d.status === 'TAMAMLANDI' || d.status === 'IPTAL';
                      });
                      return (
                        <TabsContent key={tab} value={tab}>
                          {filtered.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">
                              Bu kategoride karar bulunmuyor
                            </p>
                          ) : (
                            <div className="space-y-4">
                              {filtered.map((d) => (
                                <div key={d.id} className="border rounded-lg p-4">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <p className="font-medium">{d.decision}</p>
                                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                        {d.assignee && (
                                          <span>Sorumlu: {d.assignee.name} {d.assignee.surname}</span>
                                        )}
                                        {d.dueDate && (
                                          <span>Bitiş: {format(parseISO(d.dueDate), 'd MMM yyyy', { locale: tr })}</span>
                                        )}
                                        <span>Ekleyen: {d.createdBy.name} {d.createdBy.surname}</span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Select
                                        value={d.status}
                                        onValueChange={(v) => updateDecisionStatus(d.id, v)}
                                      >
                                        <SelectTrigger className="w-[140px]">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="BEKLEMEDE">Beklemede</SelectItem>
                                          <SelectItem value="DEVAM_EDIYOR">Devam Ediyor</SelectItem>
                                          <SelectItem value="TAMAMLANDI">Tamamlandı</SelectItem>
                                          <SelectItem value="IPTAL">İptal</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      {isCreator && (
                                        <Button variant="ghost" size="sm" onClick={() => deleteDecision(d.id)}>
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </TabsContent>
                      );
                    })}
                  </Tabs>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notlar Tab */}
            <TabsContent value="notes" className="mt-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Toplantı Notları / Tutanak</CardTitle>
                  <Button size="sm" onClick={saveNotes} disabled={savingNotes}>
                    {savingNotes ? 'Kaydediliyor...' : 'Kaydet'}
                  </Button>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={meetingNotes}
                    onChange={(e) => setMeetingNotes(e.target.value)}
                    rows={12}
                    placeholder="Toplantı sırasında alınan notlar, kararlar ve tutanaklar buraya yazılabilir..."
                    className="min-h-[300px]"
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sağ Kolon - Özet */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Özet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Oluşturan</p>
                <p className="font-medium">{meeting.createdBy.name} {meeting.createdBy.surname}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tür</p>
                <p className="font-medium">
                  {meeting.type === 'STANDART' && 'Standart'}
                  {meeting.type === 'PERIYODIK' && 'Periyodik'}
                  {meeting.type === 'AKSIYON_BAZLI' && 'Aksiyon Bazlı'}
                  {meeting.type === 'ACIL' && 'Acil'}
                  {meeting.type === 'KOMITE' && 'Komite'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Katılımcı</p>
                <p className="font-medium">
                  {meeting.participants.length + meeting.externalParticipants.length} kişi
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Onaylayan</p>
                <p className="font-medium text-green-600">
                  {meeting.participants.filter(p => p.status === 'ONAYLADI').length} kişi
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Açık Aksiyon</p>
                <p className="font-medium">
                  {meeting.actions.filter(a => a.status !== 'TAMAMLANDI' && a.status !== 'IPTAL').length}
                </p>
              </div>
            </CardContent>
          </Card>

          {meeting.poolItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Havuzdan Konular</CardTitle>
                <CardDescription>
                  Bu toplantıya eklenen havuz konuları
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {meeting.poolItems.map((item) => (
                    <div key={item.id} className="p-2 bg-muted rounded text-sm">
                      {item.action ? item.action.title : item.title}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Aksiyon Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Aksiyon / Görev</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Başlık *</Label>
              <Input
                value={actionForm.title}
                onChange={(e) => setActionForm({ ...actionForm, title: e.target.value })}
              />
            </div>
            <div>
              <Label>Tip</Label>
              <Input
                value={actionForm.type}
                onChange={(e) => setActionForm({ ...actionForm, type: e.target.value })}
                placeholder="Örn: Araştırma, Rapor, Sunum..."
              />
            </div>
            <div>
              <Label>Açıklama</Label>
              <Textarea
                value={actionForm.description}
                onChange={(e) => setActionForm({ ...actionForm, description: e.target.value })}
              />
            </div>
            <div>
              <Label>Sorumlu *</Label>
              <Select
                value={actionForm.assigneeId}
                onValueChange={(v) => setActionForm({ ...actionForm, assigneeId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seçin" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} {user.surname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Bitiş Tarihi *</Label>
              <Input
                type="date"
                value={actionForm.dueDate}
                onChange={(e) => setActionForm({ ...actionForm, dueDate: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>
              İptal
            </Button>
            <Button onClick={createAction}>Oluştur</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Katılımcı Dialog - Multi-select */}
      <Dialog open={participantDialogOpen} onOpenChange={setParticipantDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Katılımcı Ekle</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="internal">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="internal">Kurum İçi</TabsTrigger>
              <TabsTrigger value="external">Kurum Dışı</TabsTrigger>
            </TabsList>
            <TabsContent value="internal" className="space-y-4 mt-4">
              <div>
                <Label>Kullanıcıları Seçin (Çoklu Seçim)</Label>
                {selectedUserIds.length > 0 && (
                  <p className="text-sm text-muted-foreground mb-2">{selectedUserIds.length} kişi seçildi</p>
                )}
                <div className="max-h-[300px] overflow-y-auto border rounded-md p-2 space-y-1">
                  {users
                    .filter(u => !meeting.participants.some(p => p.user.id === u.id))
                    .map((user) => (
                      <label
                        key={user.id}
                        className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedUserIds.includes(user.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUserIds(prev => [...prev, user.id]);
                            } else {
                              setSelectedUserIds(prev => prev.filter(id => id !== user.id));
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm">
                          {user.name} {user.surname} <span className="text-muted-foreground">({user.email})</span>
                        </span>
                      </label>
                    ))}
                </div>
              </div>
            </TabsContent>
            <TabsContent value="external" className="space-y-4 mt-4">
              <div>
                <Label>Ad Soyad *</Label>
                <Input
                  value={externalParticipantForm.name}
                  onChange={(e) => setExternalParticipantForm({ ...externalParticipantForm, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>E-posta</Label>
                  <Input
                    value={externalParticipantForm.email}
                    onChange={(e) => setExternalParticipantForm({ ...externalParticipantForm, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Telefon</Label>
                  <Input
                    value={externalParticipantForm.phone}
                    onChange={(e) => setExternalParticipantForm({ ...externalParticipantForm, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Firma</Label>
                  <Input
                    value={externalParticipantForm.company}
                    onChange={(e) => setExternalParticipantForm({ ...externalParticipantForm, company: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Unvan</Label>
                  <Input
                    value={externalParticipantForm.title}
                    onChange={(e) => setExternalParticipantForm({ ...externalParticipantForm, title: e.target.value })}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setParticipantDialogOpen(false); setSelectedUserIds([]); }}>
              İptal
            </Button>
            <Button onClick={() => {
              if (selectedUserIds.length > 0) {
                addMultipleParticipants();
              } else {
                addParticipant();
              }
            }}>Ekle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Karar Ekleme Dialog */}
      <Dialog open={decisionDialogOpen} onOpenChange={setDecisionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Karar</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Karar Metni *</Label>
              <Textarea
                value={decisionForm.decision}
                onChange={(e) => setDecisionForm({ ...decisionForm, decision: e.target.value })}
                rows={3}
                placeholder="Alınan kararı yazın..."
              />
            </div>
            <div>
              <Label>Sorumlu Kişi</Label>
              <Select
                value={decisionForm.assigneeId}
                onValueChange={(v) => setDecisionForm({ ...decisionForm, assigneeId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seçin (opsiyonel)" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} {user.surname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Bitiş Tarihi</Label>
              <Input
                type="date"
                value={decisionForm.dueDate}
                onChange={(e) => setDecisionForm({ ...decisionForm, dueDate: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDecisionDialogOpen(false)}>
              İptal
            </Button>
            <Button onClick={createDecision}>Oluştur</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Döküman Yükleme Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Döküman Yükle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Döküman Adı *</Label>
              <Input
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                placeholder="Örn: Toplantı Sunumu"
              />
            </div>
            <div>
              <Label>Dosya *</Label>
              <Input
                type="file"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
              İptal
            </Button>
            <Button onClick={handleFileUpload} disabled={uploading}>
              {uploading ? 'Yükleniyor...' : 'Yükle'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Aksiyon Tamamlama Dialog */}
      <Dialog open={completionDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setCompletionDialogOpen(false);
          setPendingCompletionActionId(null);
          setCompletionNote('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aksiyon Tamamlama Açıklaması</DialogTitle>
            <DialogDescription>
              Aksiyonu tamamlarken ne yaptığınızı, nasıl çözdüğünüzü detaylı olarak açıklayınız. Bu alan zorunludur.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="completionNote">
              Tamamlama Açıklaması <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="completionNote"
              placeholder="Bu aksiyonu nasıl tamamladığınızı detaylı olarak açıklayınız..."
              value={completionNote}
              onChange={(e) => setCompletionNote(e.target.value)}
              rows={5}
              className={!completionNote.trim() ? 'border-red-300' : ''}
            />
            {!completionNote.trim() && (
              <p className="text-xs text-red-500">Bu alan zorunludur</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setCompletionDialogOpen(false);
              setPendingCompletionActionId(null);
              setCompletionNote('');
            }}>
              İptal
            </Button>
            <Button onClick={confirmActionCompletion} disabled={!completionNote.trim()}>
              Tamamlandı Olarak İşaretle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
