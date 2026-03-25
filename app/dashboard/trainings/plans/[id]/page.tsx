'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ArrowLeft,
  Edit,
  Save,
  X,
  Trash2,
  Plus,
  UserPlus,
  Calendar,
  Clock,
  MapPin,
  Video,
  Users,
  CheckCircle,
  XCircle,
  Award,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

const STATUS_OPTIONS = [
  { value: 'TASLAK', label: 'Taslak' },
  { value: 'PLANLANDI', label: 'Planlandı' },
  { value: 'DEVAM_EDIYOR', label: 'Devam Ediyor' },
  { value: 'TAMAMLANDI', label: 'Tamamlandı' },
  { value: 'IPTAL', label: 'İptal' },
  { value: 'ERTELENDI', label: 'Ertelendi' },
];

const RECORD_STATUS_OPTIONS = [
  { value: 'KAYITLI', label: 'Kayıtlı' },
  { value: 'KATILDI', label: 'Katıldı' },
  { value: 'BASARILI', label: 'Başarılı' },
  { value: 'BASARISIZ', label: 'Başarısız' },
  { value: 'DEVAMSIZ', label: 'Devamsız' },
  { value: 'IPTAL', label: 'İptal' },
];

export default function TrainingPlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [users, setUsers] = useState<any[]>([]);
  const [addParticipantOpen, setAddParticipantOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [editingRecord, setEditingRecord] = useState<any>(null);

  useEffect(() => {
    fetchPlan();
    fetchUsers();
  }, [id]);

  const fetchPlan = async () => {
    try {
      const res = await fetch(`/api/training-plans/${id}`);
      if (!res.ok) throw new Error('Plan bulunamadı');
      const data = await res.json();
      setPlan(data);
      setFormData(data);
    } catch (error) {
      toast.error('Plan yüklenemedi');
      router.push('/dashboard/trainings/plans');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      setUsers([]);
    }
  };

  const handleSave = async () => {
    try {
      const res = await fetch(`/api/training-plans/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          status: formData.status,
          plannedDate: formData.plannedDate,
          actualDate: formData.actualDate,
          startTime: formData.startTime,
          endTime: formData.endTime,
          location: formData.location,
          isOnline: formData.isOnline,
          onlineLink: formData.onlineLink,
          notes: formData.notes,
        }),
      });

      if (!res.ok) throw new Error('Güncelleme hatası');

      toast.success('Plan güncellendi');
      setEditMode(false);
      fetchPlan();
    } catch (error) {
      toast.error('Plan güncellenemedi');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Bu planı silmek istediğinize emin misiniz?')) return;

    try {
      const res = await fetch(`/api/training-plans/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Silme hatası');

      toast.success('Plan silindi');
      router.push('/dashboard/trainings/plans');
    } catch (error) {
      toast.error('Plan silinemedi');
    }
  };

  const handleAddParticipants = async () => {
    if (selectedUsers.length === 0) {
      toast.error('En az bir katılımcı seçin');
      return;
    }

    try {
      const res = await fetch(`/api/training-plans/${id}/records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantIds: selectedUsers }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Ekleme hatası');
      }

      toast.success('Katılımcılar eklendi');
      setAddParticipantOpen(false);
      setSelectedUsers([]);
      fetchPlan();
    } catch (error: any) {
      toast.error(error.message || 'Katılımcılar eklenemedi');
    }
  };

  const handleUpdateRecord = async () => {
    if (!editingRecord) return;

    try {
      const res = await fetch(`/api/training-plans/${id}/records/${editingRecord.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingRecord),
      });

      if (!res.ok) throw new Error('Güncelleme hatası');

      toast.success('Kayıt güncellendi');
      setEditingRecord(null);
      fetchPlan();
    } catch (error) {
      toast.error('Kayıt güncellenemedi');
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (!confirm('Bu katılımcıyı silmek istediğinize emin misiniz?')) return;

    try {
      const res = await fetch(`/api/training-plans/${id}/records/${recordId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Silme hatası');

      toast.success('Katılımcı silindi');
      fetchPlan();
    } catch (error) {
      toast.error('Katılımcı silinemedi');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = STATUS_OPTIONS.find((s) => s.value === status);
    return (
      <Badge
        variant={
          status === 'TAMAMLANDI'
            ? 'default'
            : status === 'DEVAM_EDIYOR'
            ? 'secondary'
            : status === 'IPTAL'
            ? 'destructive'
            : 'outline'
        }
      >
        {statusConfig?.label || status}
      </Badge>
    );
  };

  const getRecordStatusBadge = (status: string) => {
    const config = RECORD_STATUS_OPTIONS.find((s) => s.value === status);
    return (
      <Badge
        variant={
          status === 'BASARILI'
            ? 'default'
            : status === 'BASARISIZ' || status === 'DEVAMSIZ'
            ? 'destructive'
            : status === 'KATILDI'
            ? 'secondary'
            : 'outline'
        }
      >
        {config?.label || status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Yükleniyor...</div>
      </div>
    );
  }

  if (!plan) return null;

  const existingParticipantIds = new Set(plan.records?.map((r: any) => r.participantId) || []);
  const availableUsers = users.filter((u) => !existingParticipantIds.has(u.id));

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/dashboard/trainings/plans')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{plan.title}</h1>
              {getStatusBadge(plan.status)}
            </div>
            <p className="text-muted-foreground">
              <span className="font-mono">{plan.code}</span> - {plan.training?.name}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {editMode ? (
            <>
              <Button variant="outline" onClick={() => setEditMode(false)}>
                <X className="mr-2 h-4 w-4" />
                İptal
              </Button>
              <Button onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" />
                Kaydet
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setEditMode(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Düzenle
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                Sil
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Özet Kartları */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tarih</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">
              {format(new Date(plan.plannedDate), 'dd MMM yyyy', { locale: tr })}
            </div>
            {plan.startTime && (
              <div className="text-sm text-muted-foreground">
                {plan.startTime}
                {plan.endTime && ` - ${plan.endTime}`}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Katılımcı</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">
              {plan.stats?.totalParticipants || 0}
              {plan.maxParticipants && `/${plan.maxParticipants}`}
            </div>
            <div className="text-sm text-muted-foreground">
              {plan.stats?.attended || 0} katıldı
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Başarı Oranı</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold text-green-600">
              {plan.stats?.passed || 0} Başarılı
            </div>
            <div className="text-sm text-muted-foreground">
              {plan.stats?.failed || 0} Başarısız
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Konum</CardTitle>
            {plan.isOnline ? (
              <Video className="h-4 w-4 text-blue-500" />
            ) : (
              <MapPin className="h-4 w-4 text-muted-foreground" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">
              {plan.isOnline ? 'Online' : plan.location || 'Belirtilmemiş'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sekmeler */}
      <Tabs defaultValue="participants" className="space-y-4">
        <TabsList>
          <TabsTrigger value="participants">Katılımcılar</TabsTrigger>
          <TabsTrigger value="details">Detaylar</TabsTrigger>
        </TabsList>

        {/* Katılımcılar */}
        <TabsContent value="participants">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Katılımcılar</CardTitle>
                <CardDescription>Eğitime kayıtlı kişiler</CardDescription>
              </div>
              <Button onClick={() => setAddParticipantOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Katılımcı Ekle
              </Button>
            </CardHeader>
            <CardContent>
              {plan.records?.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Katılımcı</TableHead>
                      <TableHead>Departman/Pozisyon</TableHead>
                      <TableHead>Durum</TableHead>
                      <TableHead>Sınav Puanı</TableHead>
                      <TableHead>Memnuniyet</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plan.records.map((record: any) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          <div className="font-medium">
                            {record.participant?.name} {record.participant?.surname || ''}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {record.participant?.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>{record.participant?.department?.name || '-'}</div>
                          <div className="text-sm text-muted-foreground">
                            {record.participant?.position?.name || '-'}
                          </div>
                        </TableCell>
                        <TableCell>{getRecordStatusBadge(record.status)}</TableCell>
                        <TableCell>
                          {record.examScore !== null ? (
                            <div className="flex items-center gap-1">
                              <span
                                className={
                                  record.isPassed ? 'text-green-600' : 'text-red-600'
                                }
                              >
                                {Number(record.examScore).toFixed(0)}
                              </span>
                              {record.isPassed ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                            </div>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          {record.satisfactionScore ? (
                            <div className="flex items-center gap-1">
                              {'⭐'.repeat(record.satisfactionScore)}
                            </div>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingRecord(record)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteRecord(record.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Henüz katılımcı eklenmemiş
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Detaylar */}
        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Plan Detayları</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {editMode ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label>Başlık</Label>
                    <Input
                      value={formData.title || ''}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Durum</Label>
                    <Select
                      value={formData.status || ''}
                      onValueChange={(v) => setFormData({ ...formData, status: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Planlı Tarih</Label>
                    <Input
                      type="date"
                      value={
                        formData.plannedDate
                          ? format(new Date(formData.plannedDate), 'yyyy-MM-dd')
                          : ''
                      }
                      onChange={(e) => setFormData({ ...formData, plannedDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Gerçekleşen Tarih</Label>
                    <Input
                      type="date"
                      value={
                        formData.actualDate
                          ? format(new Date(formData.actualDate), 'yyyy-MM-dd')
                          : ''
                      }
                      onChange={(e) => setFormData({ ...formData, actualDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Başlangıç Saati</Label>
                    <Input
                      type="time"
                      value={formData.startTime || ''}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Bitiş Saati</Label>
                    <Input
                      type="time"
                      value={formData.endTime || ''}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Açıklama</Label>
                    <Textarea
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Notlar</Label>
                    <Textarea
                      value={formData.notes || ''}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                    />
                  </div>
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <Label className="text-muted-foreground">Eğitim</Label>
                    <p className="mt-1 font-medium">
                      {plan.training?.code} - {plan.training?.name}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Eğitmen</Label>
                    <p className="mt-1">
                      {plan.instructor
                        ? `${plan.instructor.name} ${plan.instructor.surname || ''}`
                        : plan.externalInstructor || '-'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Departman</Label>
                    <p className="mt-1">{plan.department?.name || 'Belirtilmemiş'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Maliyet</Label>
                    <p className="mt-1">
                      {plan.cost
                        ? `${Number(plan.cost).toLocaleString('tr-TR')} ${plan.currency}`
                        : '-'}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-muted-foreground">Açıklama</Label>
                    <p className="mt-1">{plan.description || '-'}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-muted-foreground">Notlar</Label>
                    <p className="mt-1">{plan.notes || '-'}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Katılımcı Ekleme Dialog */}
      <Dialog open={addParticipantOpen} onOpenChange={setAddParticipantOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Katılımcı Ekle</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="max-h-[400px] overflow-y-auto space-y-2">
              {availableUsers.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  Eklenebilecek kullanıcı kalmadı
                </p>
              ) : (
                availableUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center space-x-3 p-2 rounded hover:bg-muted"
                  >
                    <Checkbox
                      id={user.id}
                      checked={selectedUsers.includes(user.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedUsers([...selectedUsers, user.id]);
                        } else {
                          setSelectedUsers(selectedUsers.filter((id) => id !== user.id));
                        }
                      }}
                    />
                    <label htmlFor={user.id} className="flex-1 cursor-pointer">
                      <div className="font-medium">
                        {user.name} {user.surname || ''}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {user.department?.name || '-'} / {user.position?.name || '-'}
                      </div>
                    </label>
                  </div>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddParticipantOpen(false)}>
              İptal
            </Button>
            <Button onClick={handleAddParticipants} disabled={selectedUsers.length === 0}>
              {selectedUsers.length} Kişi Ekle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Kayıt Düzenleme Dialog */}
      <Dialog open={!!editingRecord} onOpenChange={() => setEditingRecord(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Katılımcı Kaydı Düzenle</DialogTitle>
          </DialogHeader>
          {editingRecord && (
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-muted-foreground">Katılımcı</Label>
                <p className="font-medium">
                  {editingRecord.participant?.name} {editingRecord.participant?.surname || ''}
                </p>
              </div>
              <div>
                <Label>Durum</Label>
                <Select
                  value={editingRecord.status}
                  onValueChange={(v) => setEditingRecord({ ...editingRecord, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RECORD_STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="attended"
                  checked={editingRecord.attended}
                  onCheckedChange={(checked) =>
                    setEditingRecord({ ...editingRecord, attended: checked as boolean })
                  }
                />
                <Label htmlFor="attended">Katıldı</Label>
              </div>
              {plan.training?.hasExam && (
                <>
                  <div>
                    <Label>Sınav Puanı</Label>
                    <Input
                      type="number"
                      value={editingRecord.examScore || ''}
                      onChange={(e) =>
                        setEditingRecord({
                          ...editingRecord,
                          examScore: e.target.value ? parseFloat(e.target.value) : null,
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isPassed"
                      checked={editingRecord.isPassed === true}
                      onCheckedChange={(checked) =>
                        setEditingRecord({ ...editingRecord, isPassed: checked as boolean })
                      }
                    />
                    <Label htmlFor="isPassed">Başarılı</Label>
                  </div>
                </>
              )}
              <div>
                <Label>Memnuniyet (1-5)</Label>
                <Select
                  value={String(editingRecord.satisfactionScore || '')}
                  onValueChange={(v) =>
                    setEditingRecord({
                      ...editingRecord,
                      satisfactionScore: v ? parseInt(v) : null,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Belirtilmemiş</SelectItem>
                    <SelectItem value="1">1 - Çok Kötü</SelectItem>
                    <SelectItem value="2">2 - Kötü</SelectItem>
                    <SelectItem value="3">3 - Orta</SelectItem>
                    <SelectItem value="4">4 - İyi</SelectItem>
                    <SelectItem value="5">5 - Çok İyi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Geri Bildirim</Label>
                <Textarea
                  value={editingRecord.feedback || ''}
                  onChange={(e) =>
                    setEditingRecord({ ...editingRecord, feedback: e.target.value })
                  }
                  rows={2}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRecord(null)}>
              İptal
            </Button>
            <Button onClick={handleUpdateRecord}>Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
