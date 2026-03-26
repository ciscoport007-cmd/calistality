'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
  User,
  Calendar,
  Building,
  Mail,
  Phone,
  Package,
  ClipboardList,
  FileText,
  CheckCircle,
  Clock,
  AlertTriangle,
  Plus,
  Edit,
  Save,
  Hotel,
  DoorOpen,
  Ticket,
  Building2,
} from 'lucide-react';

interface ComplaintHistory {
  id: string;
  action: string;
  oldValue: string | null;
  newValue: string | null;
  comments: string | null;
  createdAt: string;
  user: { id: string; name: string; surname: string | null };
}

interface ComplaintTask {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  assignee: { id: string; name: string; surname: string | null; email: string };
  createdBy: { id: string; name: string; surname: string | null };
}

interface ComplaintAttachment {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  createdAt: string;
  uploadedBy: { id: string; name: string; surname: string | null };
}

interface Complaint {
  id: string;
  code: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  customerCompany: string | null;
  // Otel spesifik alanlar
  guestName: string | null;
  roomNumber: string | null;
  agency: string | null;
  voucherNumber: string | null;
  relatedDepartment: { id: string; name: string; code: string } | null;
  // Diğer alanlar
  subject: string;
  description: string;
  details: string | null;
  status: string;
  priority: string;
  productName: string | null;
  orderNumber: string | null;
  incidentDate: string | null;
  initialReport: string | null;
  initialReportDate: string | null;
  finalReport: string | null;
  finalReportDate: string | null;
  resolution: string | null;
  resolvedAt: string | null;
  dueDate: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  category: { id: string; name: string; code: string } | null;
  createdBy: { id: string; name: string; surname: string | null; email: string };
  assignedUser: { id: string; name: string; surname: string | null; email: string } | null;
  teamLeader: { id: string; name: string; surname: string | null; email: string } | null;
  assignedTeam: { id: string; name: string } | null;
  histories: ComplaintHistory[];
  tasks: ComplaintTask[];
  attachments: ComplaintAttachment[];
}

interface UserOption {
  id: string;
  name: string;
  surname: string | null;
  email: string;
}

const statusLabels: Record<string, string> = {
  YENI: 'Yeni',
  INCELENIYOR: 'İnceleniyor',
  COZUM_BEKLENIYOR: 'Çözüm Bekleniyor',
  COZULDU: 'Çözüldü',
  KAPATILDI: 'Kapatıldı',
  IPTAL_EDILDI: 'İptal Edildi',
};

const statusColors: Record<string, string> = {
  YENI: 'bg-blue-100 text-blue-800',
  INCELENIYOR: 'bg-yellow-100 text-yellow-800',
  COZUM_BEKLENIYOR: 'bg-orange-100 text-orange-800',
  COZULDU: 'bg-green-100 text-green-800',
  KAPATILDI: 'bg-gray-100 text-gray-800',
  IPTAL_EDILDI: 'bg-red-100 text-red-800',
};

const priorityLabels: Record<string, string> = {
  DUSUK: 'Düşük',
  ORTA: 'Orta',
  YUKSEK: 'Yüksek',
  ACIL: 'Acil',
};

const priorityColors: Record<string, string> = {
  DUSUK: 'bg-gray-100 text-gray-800',
  ORTA: 'bg-blue-100 text-blue-800',
  YUKSEK: 'bg-orange-100 text-orange-800',
  ACIL: 'bg-red-100 text-red-800',
};

const taskStatusLabels: Record<string, string> = {
  ACIK: 'Açık',
  DEVAM_EDIYOR: 'Devam Ediyor',
  TAMAMLANDI: 'Tamamlandı',
  IPTAL: 'İptal',
};

const actionLabels: Record<string, string> = {
  OLUSTURULDU: 'Oluşturuldu',
  ATANDI: 'Atandı',
  DURUM_DEGISTI: 'Durum Değişti',
  RAPOR_EKLENDI: 'Rapor Eklendi',
  YORUM_EKLENDI: 'Yorum Eklendi',
  GOREV_EKLENDI: 'Görev Eklendi',
  DOSYA_EKLENDI: 'Dosya Eklendi',
  KAPATILDI: 'Kapatıldı',
};

export default function ComplaintDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [reportType, setReportType] = useState<'initial' | 'final' | 'resolution'>('initial');
  const [reportContent, setReportContent] = useState('');

  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    assigneeId: '',
    priority: 'ORTA',
    dueDate: '',
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (id) {
      fetchComplaint();
      fetchUsers();
    }
  }, [id]);

  const fetchComplaint = async () => {
    try {
      const res = await fetch(`/api/complaints/${id}`);
      if (res.ok) {
        const data = await res.json();
        setComplaint(data);
      } else {
        toast.error('Şikayet bulunamadı');
        router.push('/dashboard/complaints');
      }
    } catch (error) {
      console.error('Şikayet alınırken hata:', error);
      toast.error('Şikayet yüklenemedi');
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
      console.error('Kullanıcılar alınırken hata:', error);
    }
  };

  const updateStatus = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/complaints/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        toast.success('Durum güncellendi');
        fetchComplaint();
      } else {
        toast.error('Durum güncellenemedi');
      }
    } catch (error) {
      console.error('Durum güncelleme hatası:', error);
      toast.error('Bir hata oluştu');
    }
  };

  const assignUser = async (userId: string, type: 'assignedUserId' | 'teamLeaderId') => {
    try {
      const res = await fetch(`/api/complaints/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [type]: userId }),
      });

      if (res.ok) {
        toast.success('Atama yapıldı');
        fetchComplaint();
      } else {
        toast.error('Atama yapılamadı');
      }
    } catch (error) {
      console.error('Atama hatası:', error);
      toast.error('Bir hata oluştu');
    }
  };

  const submitReport = async () => {
    if (!reportContent.trim()) {
      toast.error('Rapor içeriği boş olamaz');
      return;
    }

    const fieldMap = {
      initial: 'initialReport',
      final: 'finalReport',
      resolution: 'resolution',
    };

    try {
      const res = await fetch(`/api/complaints/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [fieldMap[reportType]]: reportContent }),
      });

      if (res.ok) {
        toast.success('Rapor kaydedildi');
        setIsReportDialogOpen(false);
        setReportContent('');
        fetchComplaint();
      } else {
        toast.error('Rapor kaydedilemedi');
      }
    } catch (error) {
      console.error('Rapor kaydetme hatası:', error);
      toast.error('Bir hata oluştu');
    }
  };

  const createTask = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!taskForm.title || !taskForm.assigneeId) {
      toast.error('Görev başlığı ve atanan kişi zorunludur');
      return;
    }

    try {
      const res = await fetch(`/api/complaints/${id}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskForm),
      });

      if (res.ok) {
        toast.success('Görev oluşturuldu');
        setIsTaskDialogOpen(false);
        setTaskForm({
          title: '',
          description: '',
          assigneeId: '',
          priority: 'ORTA',
          dueDate: '',
        });
        fetchComplaint();
      } else {
        toast.error('Görev oluşturulamadı');
      }
    } catch (error) {
      console.error('Görev oluşturma hatası:', error);
      toast.error('Bir hata oluştu');
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/complaints/${id}/tasks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, status: newStatus }),
      });

      if (res.ok) {
        toast.success('Görev durumu güncellendi');
        fetchComplaint();
      } else {
        toast.error('Görev durumu güncellenemedi');
      }
    } catch (error) {
      console.error('Görev güncelleme hatası:', error);
      toast.error('Bir hata oluştu');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!complaint) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/dashboard/complaints')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Geri
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{complaint.code}</h1>
              <Badge className={statusColors[complaint.status]}>
                {statusLabels[complaint.status]}
              </Badge>
              <Badge className={priorityColors[complaint.priority]}>
                {priorityLabels[complaint.priority]}
              </Badge>
            </div>
            <p className="text-muted-foreground">{complaint.subject}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Select value={complaint.status} onValueChange={updateStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(statusLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="details">
            <TabsList>
              <TabsTrigger value="details">Detaylar</TabsTrigger>
              <TabsTrigger value="tasks">Görevler ({complaint.tasks.length})</TabsTrigger>
              <TabsTrigger value="reports">Raporlar</TabsTrigger>
              <TabsTrigger value="history">Geçmiş ({complaint.histories.length})</TabsTrigger>
              <TabsTrigger value="files">Dosyalar ({complaint.attachments.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Şikayet Bilgileri</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-muted-foreground">Açıklama</Label>
                    <p className="mt-1">{complaint.description}</p>
                  </div>
                  {complaint.details && (
                    <div>
                      <Label className="text-muted-foreground">Detaylar</Label>
                      <p className="mt-1">{complaint.details}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    {complaint.productName && (
                      <div>
                        <Label className="text-muted-foreground">Ürün</Label>
                        <p className="mt-1 flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          {complaint.productName}
                        </p>
                      </div>
                    )}
                    {complaint.orderNumber && (
                      <div>
                        <Label className="text-muted-foreground">Sipariş No</Label>
                        <p className="mt-1 flex items-center gap-2">
                          <ClipboardList className="h-4 w-4" />
                          {complaint.orderNumber}
                        </p>
                      </div>
                    )}
                    {complaint.incidentDate && (
                      <div>
                        <Label className="text-muted-foreground">Olay Tarihi</Label>
                        <p className="mt-1 flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {formatDate(complaint.incidentDate)}
                        </p>
                      </div>
                    )}
                    {complaint.category && (
                      <div>
                        <Label className="text-muted-foreground">Kategori</Label>
                        <p className="mt-1">{complaint.category.name}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Otel Bilgileri */}
              {(complaint.guestName || complaint.roomNumber || complaint.agency || complaint.voucherNumber || complaint.relatedDepartment) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Hotel className="h-5 w-5" />
                      Otel Bilgileri
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      {complaint.guestName && (
                        <div>
                          <Label className="text-muted-foreground">Misafir Adı</Label>
                          <p className="mt-1 flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {complaint.guestName}
                          </p>
                        </div>
                      )}
                      {complaint.roomNumber && (
                        <div>
                          <Label className="text-muted-foreground">Oda Numarası</Label>
                          <p className="mt-1 flex items-center gap-2">
                            <DoorOpen className="h-4 w-4" />
                            {complaint.roomNumber}
                          </p>
                        </div>
                      )}
                      {complaint.agency && (
                        <div>
                          <Label className="text-muted-foreground">Acenta</Label>
                          <p className="mt-1 flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            {complaint.agency}
                          </p>
                        </div>
                      )}
                      {complaint.voucherNumber && (
                        <div>
                          <Label className="text-muted-foreground">Voucher No</Label>
                          <p className="mt-1 flex items-center gap-2">
                            <Ticket className="h-4 w-4" />
                            {complaint.voucherNumber}
                          </p>
                        </div>
                      )}
                      {complaint.relatedDepartment && (
                        <div className="col-span-2">
                          <Label className="text-muted-foreground">İlgili Departman</Label>
                          <p className="mt-1 flex items-center gap-2">
                            <Building className="h-4 w-4" />
                            {complaint.relatedDepartment.name}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="tasks" className="space-y-4 mt-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">Görevler</h3>
                <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Yeni Görev
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Yeni Görev Oluştur</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={createTask} className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="taskTitle">Başlık *</Label>
                        <Input
                          id="taskTitle"
                          value={taskForm.title}
                          onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="taskDesc">Açıklama</Label>
                        <Textarea
                          id="taskDesc"
                          value={taskForm.description}
                          onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="taskAssignee">Atanan Kişi *</Label>
                        <Select
                          value={taskForm.assigneeId}
                          onValueChange={(value) => setTaskForm({ ...taskForm, assigneeId: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Kişi seçin" />
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
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="taskPriority">Öncelik</Label>
                          <Select
                            value={taskForm.priority}
                            onValueChange={(value) => setTaskForm({ ...taskForm, priority: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="DUSUK">Düşük</SelectItem>
                              <SelectItem value="ORTA">Orta</SelectItem>
                              <SelectItem value="YUKSEK">Yüksek</SelectItem>
                              <SelectItem value="ACIL">Acil</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="taskDueDate">Termin</Label>
                          <Input
                            id="taskDueDate"
                            type="date"
                            value={taskForm.dueDate}
                            onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => setIsTaskDialogOpen(false)}>
                          İptal
                        </Button>
                        <Button type="submit">Oluştur</Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              {complaint.tasks.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Henüz görev eklenmemiş
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Görev</TableHead>
                          <TableHead>Atanan</TableHead>
                          <TableHead>Durum</TableHead>
                          <TableHead>Öncelik</TableHead>
                          <TableHead>Termin</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {complaint.tasks.map((task) => (
                          <TableRow key={task.id}>
                            <TableCell>
                              <div className="font-medium">{task.title}</div>
                              {task.description && (
                                <div className="text-sm text-muted-foreground">{task.description}</div>
                              )}
                            </TableCell>
                            <TableCell>
                              {task.assignee.name} {task.assignee.surname}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{taskStatusLabels[task.status]}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={priorityColors[task.priority]}>
                                {priorityLabels[task.priority]}
                              </Badge>
                            </TableCell>
                            <TableCell>{task.dueDate ? formatDate(task.dueDate) : '-'}</TableCell>
                            <TableCell>
                              {task.status !== 'TAMAMLANDI' && task.status !== 'IPTAL' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => updateTaskStatus(task.id, 'TAMAMLANDI')}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="reports" className="space-y-4 mt-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">Raporlar</h3>
                <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <FileText className="h-4 w-4 mr-2" />
                      Rapor Ekle
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Rapor Ekle</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label>Rapor Türü</Label>
                        <Select value={reportType} onValueChange={(v: 'initial' | 'final' | 'resolution') => setReportType(v)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="initial">İlk İnceleme Raporu</SelectItem>
                            <SelectItem value="final">Nihai Rapor</SelectItem>
                            <SelectItem value="resolution">Çözüm</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Rapor İçeriği</Label>
                        <Textarea
                          rows={6}
                          value={reportContent}
                          onChange={(e) => setReportContent(e.target.value)}
                          placeholder="Rapor içeriğini yazın..."
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsReportDialogOpen(false)}>
                          İptal
                        </Button>
                        <Button onClick={submitReport}>
                          <Save className="h-4 w-4 mr-2" />
                          Kaydet
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">İlk İnceleme Raporu</CardTitle>
                    {complaint.initialReportDate && (
                      <CardDescription>{formatDate(complaint.initialReportDate)}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    {complaint.initialReport ? (
                      <p className="whitespace-pre-wrap">{complaint.initialReport}</p>
                    ) : (
                      <p className="text-muted-foreground">Henüz eklenmemiş</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Nihai Rapor</CardTitle>
                    {complaint.finalReportDate && (
                      <CardDescription>{formatDate(complaint.finalReportDate)}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    {complaint.finalReport ? (
                      <p className="whitespace-pre-wrap">{complaint.finalReport}</p>
                    ) : (
                      <p className="text-muted-foreground">Henüz eklenmemiş</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Çözüm</CardTitle>
                    {complaint.resolvedAt && (
                      <CardDescription>{formatDate(complaint.resolvedAt)}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    {complaint.resolution ? (
                      <p className="whitespace-pre-wrap">{complaint.resolution}</p>
                    ) : (
                      <p className="text-muted-foreground">Henüz eklenmemiş</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tarih</TableHead>
                        <TableHead>Kullanıcı</TableHead>
                        <TableHead>İşlem</TableHead>
                        <TableHead>Detay</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {complaint.histories.map((history) => (
                        <TableRow key={history.id}>
                          <TableCell className="whitespace-nowrap">
                            {formatDate(history.createdAt)}
                          </TableCell>
                          <TableCell>
                            {history.user.name} {history.user.surname}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {actionLabels[history.action] || history.action}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {history.oldValue && history.newValue ? (
                              <span>
                                {statusLabels[history.oldValue] || history.oldValue} →{' '}
                                {statusLabels[history.newValue] || history.newValue}
                              </span>
                            ) : (
                              history.comments || history.newValue || '-'
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="files" className="mt-4">
              {complaint.attachments.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Henüz dosya eklenmemiş
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Dosya Adı</TableHead>
                          <TableHead>Boyut</TableHead>
                          <TableHead>Yükleyen</TableHead>
                          <TableHead>Tarih</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {complaint.attachments.map((file) => (
                          <TableRow key={file.id}>
                            <TableCell className="font-medium">{file.fileName}</TableCell>
                            <TableCell>{formatFileSize(file.fileSize)}</TableCell>
                            <TableCell>
                              {file.uploadedBy.name} {file.uploadedBy.surname}
                            </TableCell>
                            <TableCell>{formatDate(file.createdAt)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Müşteri Bilgileri */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Müşteri Bilgileri</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{complaint.customerName}</span>
              </div>
              {complaint.customerCompany && (
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span>{complaint.customerCompany}</span>
                </div>
              )}
              {complaint.customerEmail && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{complaint.customerEmail}</span>
                </div>
              )}
              {complaint.customerPhone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{complaint.customerPhone}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Atama */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Atama</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Sorumlu</Label>
                <Select
                  value={complaint.assignedUser?.id || '__none__'}
                  onValueChange={(value) => assignUser(value === '__none__' ? '' : value, 'assignedUserId')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Kişi seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Seçilmedi</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} {user.surname}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ekip Lideri</Label>
                <Select
                  value={complaint.teamLeader?.id || '__none__'}
                  onValueChange={(value) => assignUser(value === '__none__' ? '' : value, 'teamLeaderId')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Kişi seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Seçilmedi</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} {user.surname}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Tarihler */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tarihler</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Oluşturulma</span>
                <span>{formatDate(complaint.createdAt)}</span>
              </div>
              {complaint.dueDate && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Termin</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {formatDate(complaint.dueDate)}
                  </span>
                </div>
              )}
              {complaint.closedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Kapatılma</span>
                  <span>{formatDate(complaint.closedAt)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Oluşturan */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Oluşturan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>
                  {complaint.createdBy.name} {complaint.createdBy.surname}
                </span>
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {complaint.createdBy.email}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
