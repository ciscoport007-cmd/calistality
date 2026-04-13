'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Filter, FileText, AlertTriangle, CheckCircle, Clock, RefreshCw, Calendar, Trash2, Bell } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ExportButton } from '@/components/ui/export-button';
import { formatDate } from '@/lib/export-utils';

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

export default function CAPAsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'Admin';
  const [capas, setCAPAs] = useState<any[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [responsibleUserFilter, setResponsibleUserFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dueDateStart, setDueDateStart] = useState('');
  const [dueDateEnd, setDueDateEnd] = useState('');
  const [reminderSending, setReminderSending] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'DUZELTICI',
    source: 'DIGER',
    priority: 'ORTA',
    complaintId: '',
    sourceReference: '',
    sourceDetails: '',
    responsibleUserIds: [] as string[],
    teamId: '',
    departmentId: '',
    dueDate: '',
  });

  const fetchCAPAs = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (typeFilter) params.append('type', typeFilter);
      if (sourceFilter) params.append('source', sourceFilter);
      if (priorityFilter) params.append('priority', priorityFilter);
      if (departmentFilter) params.append('departmentId', departmentFilter);
      if (responsibleUserFilter) params.append('responsibleUserId', responsibleUserFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (dueDateStart) params.append('dueDateStart', dueDateStart);
      if (dueDateEnd) params.append('dueDateEnd', dueDateEnd);

      const res = await fetch(`/api/capas?${params.toString()}`);
      const data = await res.json();
      setCAPAs(data.capas || []);
    } catch (error) {
      console.error('CAPA listesi hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFormData = async () => {
    try {
      const [usersRes, deptsRes, groupsRes, complaintsRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/departments'),
        fetch('/api/groups'),
        fetch('/api/complaints'),
      ]);
      const [usersData, deptsData, groupsData, complaintsData] = await Promise.all([
        usersRes.json(),
        deptsRes.json(),
        groupsRes.json(),
        complaintsRes.json(),
      ]);
      setUsers(Array.isArray(usersData.users) ? usersData.users : Array.isArray(usersData) ? usersData : []);
      const deptList = deptsData.departments || deptsData;
      setDepartments(Array.isArray(deptList) ? deptList : []);
      setGroups(Array.isArray(groupsData.groups) ? groupsData.groups : Array.isArray(groupsData) ? groupsData : []);
      setComplaints(Array.isArray(complaintsData) ? complaintsData : Array.isArray(complaintsData.complaints) ? complaintsData.complaints : []);
    } catch (error) {
      console.error('Form verisi hatası:', error);
    }
  };

  useEffect(() => {
    fetchCAPAs();
    fetchFormData();
  }, [search, statusFilter, typeFilter, sourceFilter, priorityFilter, departmentFilter, responsibleUserFilter, startDate, endDate, dueDateStart, dueDateEnd]);

  const handleCreate = async () => {
    try {
      const res = await fetch('/api/capas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const newCapa = await res.json();
        setIsCreateOpen(false);
        setFormData({
          title: '',
          description: '',
          type: 'DUZELTICI',
          source: 'DIGER',
          priority: 'ORTA',
          complaintId: '',
          sourceReference: '',
          sourceDetails: '',
          responsibleUserIds: [],
          teamId: '',
          departmentId: '',
          dueDate: '',
        });
        router.push(`/dashboard/capas/${newCapa.id}`);
      }
    } catch (error) {
      console.error('CAPA oluşturma hatası:', error);
    }
  };

  const handleSendReminders = async () => {
    setReminderSending(true);
    try {
      const res = await fetch('/api/cron/capa-reminders');
      const data = await res.json();
      alert(data.message || 'Bildirimler gönderildi.');
    } catch {
      alert('Bildirim gönderilemedi.');
    } finally {
      setReminderSending(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, capaId: string, capaCode: string) => {
    e.stopPropagation();
    if (!confirm(`"${capaCode}" kodlu CAPA kaydını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`)) return;
    setDeletingId(capaId);
    try {
      const res = await fetch(`/api/capas/${capaId}`, { method: 'DELETE' });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error((errData as { error?: string }).error ?? 'Silinemedi');
      }
      setCAPAs((prev) => prev.filter((c: any) => c.id !== capaId));
    } catch (error) {
      console.error('CAPA silme hatası:', error);
      alert(error instanceof Error ? error.message : 'Silinemedi');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Düzeltici ve Önleyici Faaliyetler (CAPA)</h1>
          <p className="text-sm text-gray-500 mt-1">Düzeltici, önleyici ve iyileştirme faaliyetlerini yönetin</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Button variant="outline" onClick={handleSendReminders} disabled={reminderSending}>
              <Bell className="h-4 w-4 mr-2" />
              {reminderSending ? 'Gönderiliyor...' : 'Termin Hatırlat'}
            </Button>
          )}
          <ExportButton
            data={capas.map((c: any) => ({
              code: c.code,
              title: c.title,
              type: typeLabels[c.type] || c.type,
              status: statusLabels[c.status] || c.status,
              priority: priorityLabels[c.priority] || c.priority,
              department: c.department?.name || '-',
              teamLeader: c.teamLeader?.name || '-',
              openedBy: c.openedBy?.name || '-',
              openedAt: formatDate(c.openedAt),
              dueDate: formatDate(c.dueDate),
            }))}
            columns={[
              { header: 'Kod', key: 'code', width: 15 },
              { header: 'Başlık', key: 'title', width: 25 },
              { header: 'Tür', key: 'type', width: 12 },
              { header: 'Durum', key: 'status', width: 15 },
              { header: 'Öncelik', key: 'priority', width: 10 },
              { header: 'Departman', key: 'department', width: 15 },
              { header: 'Ekip Lideri', key: 'teamLeader', width: 15 },
              { header: 'Açan', key: 'openedBy', width: 15 },
              { header: 'Açılış', key: 'openedAt', width: 12 },
              { header: 'Termin', key: 'dueDate', width: 12 },
            ]}
            fileName="capa-listesi"
            title="CAPA Kayıtları"
          />
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Yeni CAPA
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Yeni CAPA Oluştur</DialogTitle>
                <DialogDescription>Düzeltici veya önleyici faaliyet kaydı oluşturun</DialogDescription>
              </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tür *</Label>
                  <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(typeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Kaynak *</Label>
                  <Select value={formData.source} onValueChange={(v) => setFormData({ ...formData, source: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(sourceLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Başlık *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="CAPA başlığı"
                />
              </div>
              <div className="space-y-2">
                <Label>Açıklama *</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Uygunsuzluk veya potansiyel uygunsuzluğun açıklaması"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Öncelik</Label>
                  <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(priorityLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Hedef Tarih</Label>
                  <Input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  />
                </div>
              </div>
              {formData.source === 'SIKAYET' && (
                <div className="space-y-2">
                  <Label>İlgili Şikayet</Label>
                  <Select value={formData.complaintId} onValueChange={(v) => setFormData({ ...formData, complaintId: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Şikayet seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {complaints.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.code} - {c.subject}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Kaynak Referansı</Label>
                  <Input
                    value={formData.sourceReference}
                    onChange={(e) => setFormData({ ...formData, sourceReference: e.target.value })}
                    placeholder="Denetim no, risk kodu vb."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Departman</Label>
                  <Select value={formData.departmentId} onValueChange={(v) => setFormData({ ...formData, departmentId: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Departman seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((d: any) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Sorumlu Kişi(ler) <span className="text-gray-400 font-normal">(max 3)</span></Label>
                  <div className="border rounded-md p-2 space-y-1 max-h-40 overflow-y-auto bg-white">
                    {users.map((u: any) => {
                      const selected = formData.responsibleUserIds.includes(u.id);
                      const disabled = !selected && formData.responsibleUserIds.length >= 3;
                      return (
                        <label key={u.id} className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer text-sm ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-50'}`}>
                          <input
                            type="checkbox"
                            checked={selected}
                            disabled={disabled}
                            onChange={() => {
                              const ids = formData.responsibleUserIds;
                              setFormData({
                                ...formData,
                                responsibleUserIds: selected ? ids.filter((id) => id !== u.id) : [...ids, u.id],
                              });
                            }}
                            className="rounded"
                          />
                          {u.name} {u.surname}
                          {u.department?.name && <span className="text-gray-400 text-xs">· {u.department.name}</span>}
                        </label>
                      );
                    })}
                  </div>
                  {formData.responsibleUserIds.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {formData.responsibleUserIds.map((id) => {
                        const u = users.find((x: any) => x.id === id);
                        return u ? (
                          <span key={id} className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
                            {u.name} {u.surname}
                            <button type="button" onClick={() => setFormData({ ...formData, responsibleUserIds: formData.responsibleUserIds.filter((x) => x !== id) })} className="hover:text-blue-600">×</button>
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Ekip</Label>
                  <Select value={formData.teamId} onValueChange={(v) => setFormData({ ...formData, teamId: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Ekip seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {groups.map((g: any) => (
                        <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Kaynak Detayları</Label>
                <Textarea
                  value={formData.sourceDetails}
                  onChange={(e) => setFormData({ ...formData, sourceDetails: e.target.value })}
                  placeholder="Kaynağa ilişkin ek bilgiler"
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Vazgeç</Button>
              <Button onClick={handleCreate} disabled={!formData.title || !formData.description}>Oluştur</Button>
            </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filtreler */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Kod veya başlık ara..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Durum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Durumlar</SelectItem>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter || 'all'} onValueChange={(v) => setTypeFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Tür" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Türler</SelectItem>
                {Object.entries(typeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sourceFilter || 'all'} onValueChange={(v) => setSourceFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Kaynak" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Kaynaklar</SelectItem>
                {Object.entries(sourceLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter || 'all'} onValueChange={(v) => setPriorityFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Öncelik" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Öncelikler</SelectItem>
                {Object.entries(priorityLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={departmentFilter || 'all'} onValueChange={(v) => setDepartmentFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Departman" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Departmanlar</SelectItem>
                {departments.map((d: any) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-4 mt-4 items-center">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-500">Açılış:</span>
            </div>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-[150px]"
            />
            <span className="text-gray-400">–</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-[150px]"
            />
          </div>
          <div className="flex flex-wrap gap-4 mt-3 items-center">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-400" />
              <span className="text-sm text-gray-500">Termin:</span>
            </div>
            <Input
              type="date"
              value={dueDateStart}
              onChange={(e) => setDueDateStart(e.target.value)}
              className="w-[150px]"
            />
            <span className="text-gray-400">–</span>
            <Input
              type="date"
              value={dueDateEnd}
              onChange={(e) => setDueDateEnd(e.target.value)}
              className="w-[150px]"
            />
            <Select value={responsibleUserFilter || 'all'} onValueChange={(v) => setResponsibleUserFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sorumlu Kişi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Sorumlular</SelectItem>
                {users.map((u: any) => (
                  <SelectItem key={u.id} value={u.id}>{u.name} {u.surname}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => {
              setSearch('');
              setStatusFilter('');
              setTypeFilter('');
              setSourceFilter('');
              setPriorityFilter('');
              setDepartmentFilter('');
              setResponsibleUserFilter('');
              setStartDate('');
              setEndDate('');
              setDueDateStart('');
              setDueDateEnd('');
            }}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Temizle
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* CAPA Listesi */}
      <Card>
        <CardHeader>
          <CardTitle>CAPA Kayıtları</CardTitle>
          <CardDescription>{capas.length} kayıt bulundu</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Yükleniyor...</div>
          ) : capas.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Kayıt bulunamadı</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kod</TableHead>
                  <TableHead>Başlık</TableHead>
                  <TableHead>Tür</TableHead>
                  <TableHead>Kaynak</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Öncelik</TableHead>
                  <TableHead>Sorumlu</TableHead>
                  <TableHead>Açılış</TableHead>
                  <TableHead>Termin</TableHead>
                  {isAdmin && <TableHead className="text-right">İşlem</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {capas.map((capa: any) => (
                  <TableRow
                    key={capa.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => router.push(`/dashboard/capas/${capa.id}`)}
                  >
                    <TableCell className="font-medium">{capa.code}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{capa.title}</TableCell>
                    <TableCell>
                      <Badge className={typeColors[capa.type]}>{typeLabels[capa.type]}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">{sourceLabels[capa.source]}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[capa.status]}>{statusLabels[capa.status]}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={priorityColors[capa.priority]}>{priorityLabels[capa.priority]}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {[capa.responsibleUser, capa.responsibleUser2, capa.responsibleUser3]
                        .filter(Boolean)
                        .map((u: any) => `${u.name} ${u.surname || ''}`.trim())
                        .join(', ') || '-'}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {format(new Date(capa.createdAt), 'dd MMM yyyy', { locale: tr })}
                    </TableCell>
                    <TableCell className="text-sm">
                      {capa.dueDate ? (() => {
                        const due = new Date(capa.dueDate);
                        const now = new Date();
                        const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                        const isClosed = capa.status === 'KAPATILDI' || capa.status === 'IPTAL_EDILDI';
                        const colorClass = isClosed
                          ? 'text-gray-400'
                          : diffDays < 0
                          ? 'text-red-600 font-semibold'
                          : diffDays <= 3
                          ? 'text-red-500 font-medium'
                          : diffDays <= 7
                          ? 'text-orange-500 font-medium'
                          : 'text-gray-600';
                        return (
                          <span className={colorClass}>
                            {format(due, 'dd MMM yyyy', { locale: tr })}
                            {!isClosed && diffDays < 0 && <span className="ml-1 text-xs">(Geçti)</span>}
                            {!isClosed && diffDays >= 0 && diffDays <= 7 && <span className="ml-1 text-xs">({diffDays}g)</span>}
                          </span>
                        );
                      })() : <span className="text-gray-300">—</span>}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={(e) => handleDelete(e, capa.id, capa.code)}
                          disabled={deletingId === capa.id}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
