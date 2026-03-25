'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Filter, ClipboardList, AlertTriangle, CheckCircle, Clock, Calendar, Users, FileSearch } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ExportButton } from '@/components/ui/export-button';
import { formatDate } from '@/lib/export-utils';

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

export default function AuditsPage() {
  const router = useRouter();
  const [audits, setAudits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'IC_DENETIM',
    scope: '',
    objectives: '',
    criteria: '',
    auditedDepartmentId: '',
    auditedArea: '',
    leadAuditorId: '',
    departmentId: '',
    plannedStartDate: '',
    plannedEndDate: '',
  });

  const fetchAudits = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
      if (typeFilter && typeFilter !== 'all') params.append('type', typeFilter);

      const res = await fetch(`/api/audits?${params.toString()}`);
      const data = await res.json();
      setAudits(data.audits || []);
    } catch (error) {
      console.error('Denetim listesi hatası:', error);
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
    fetchAudits();
    fetchFormData();
  }, [search, statusFilter, typeFilter]);

  const handleCreate = async () => {
    try {
      const res = await fetch('/api/audits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const newAudit = await res.json();
        setIsCreateOpen(false);
        setFormData({
          title: '',
          description: '',
          type: 'IC_DENETIM',
          scope: '',
          objectives: '',
          criteria: '',
          auditedDepartmentId: '',
          auditedArea: '',
          leadAuditorId: '',
          departmentId: '',
          plannedStartDate: '',
          plannedEndDate: '',
        });
        router.push(`/dashboard/audits/${newAudit.id}`);
      }
    } catch (error) {
      console.error('Denetim oluşturma hatası:', error);
    }
  };

  const stats = {
    total: audits.length,
    planned: audits.filter(a => a.status === 'PLANLI').length,
    inProgress: audits.filter(a => ['HAZIRLANIYOR', 'DEVAM_EDIYOR', 'RAPORLANIYOR'].includes(a.status)).length,
    completed: audits.filter(a => a.status === 'KAPATILDI').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Denetim Yönetimi</h1>
          <p className="text-muted-foreground">Denetim planlama, uygulama ve takip</p>
        </div>
        <div className="flex gap-2">
          <ExportButton
            data={audits.map((a: any) => ({
              code: a.code,
              title: a.title,
              type: typeLabels[a.type] || a.type,
              status: statusLabels[a.status] || a.status,
              department: a.department?.name || '-',
              leadAuditor: a.leadAuditor?.name || '-',
              plannedStartDate: formatDate(a.plannedStartDate),
              plannedEndDate: formatDate(a.plannedEndDate),
            }))}
            columns={[
              { header: 'Kod', key: 'code', width: 15 },
              { header: 'Başlık', key: 'title', width: 25 },
              { header: 'Tür', key: 'type', width: 15 },
              { header: 'Durum', key: 'status', width: 12 },
              { header: 'Departman', key: 'department', width: 15 },
              { header: 'Baş Denetçi', key: 'leadAuditor', width: 15 },
              { header: 'Başlangıç', key: 'plannedStartDate', width: 12 },
              { header: 'Bitiş', key: 'plannedEndDate', width: 12 },
            ]}
            fileName="denetimler"
            title="Denetim Listesi"
          />
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Yeni Denetim
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Yeni Denetim Oluştur</DialogTitle>
                <DialogDescription>Yeni bir denetim planı oluşturun</DialogDescription>
              </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Denetim Başlığı *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Denetim başlığı"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="type">Denetim Türü *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tür seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(typeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.type !== 'DIS_DENETIM' && formData.type !== 'TEDARIKCI_DENETIM' && (
                  <div className="grid gap-2">
                    <Label htmlFor="auditedDepartmentId">Denetlenen Departman</Label>
                    <Select
                      value={formData.auditedDepartmentId || 'none'}
                      onValueChange={(value) => setFormData({ ...formData, auditedDepartmentId: value === 'none' ? '' : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Departman seçin" />
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

              <div className="grid gap-2">
                <Label htmlFor="description">Açıklama</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Denetim hakkında açıklama"
                  rows={3}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="scope">Denetim Kapsamı</Label>
                <Textarea
                  id="scope"
                  value={formData.scope}
                  onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
                  placeholder="Denetim kapsamını belirtin"
                  rows={2}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="objectives">Denetim Hedefleri</Label>
                <Textarea
                  id="objectives"
                  value={formData.objectives}
                  onChange={(e) => setFormData({ ...formData, objectives: e.target.value })}
                  placeholder="Denetim hedeflerini belirtin"
                  rows={2}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="criteria">Denetim Kriterleri</Label>
                <Input
                  id="criteria"
                  value={formData.criteria}
                  onChange={(e) => setFormData({ ...formData, criteria: e.target.value })}
                  placeholder="ISO 9001, ISO 14001, vb."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="leadAuditorId">Baş Denetçi</Label>
                  <Select
                    value={formData.leadAuditorId || 'none'}
                    onValueChange={(value) => setFormData({ ...formData, leadAuditorId: value === 'none' ? '' : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Denetçi seçin" />
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
                  <Label htmlFor="departmentId">Denetimi Yapan Departman</Label>
                  <Select
                    value={formData.departmentId || 'none'}
                    onValueChange={(value) => setFormData({ ...formData, departmentId: value === 'none' ? '' : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Departman seçin" />
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="plannedStartDate">Planlanan Başlangıç</Label>
                  <Input
                    id="plannedStartDate"
                    type="date"
                    value={formData.plannedStartDate}
                    onChange={(e) => setFormData({ ...formData, plannedStartDate: e.target.value })}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="plannedEndDate">Planlanan Bitiş</Label>
                  <Input
                    id="plannedEndDate"
                    type="date"
                    value={formData.plannedEndDate}
                    onChange={(e) => setFormData({ ...formData, plannedEndDate: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                İptal
              </Button>
              <Button onClick={handleCreate} disabled={!formData.title || !formData.type}>
                Oluştur
              </Button>
            </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* İstatistik Kartları */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Denetim</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Planlı</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.planned}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Devam Eden</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.inProgress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tamamlanan</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtreler */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Denetim Listesi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Denetim ara..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={typeFilter || 'all'} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tür" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Türler</SelectItem>
                {Object.entries(typeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter || 'all'} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Durum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Durumlar</SelectItem>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>
          ) : audits.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileSearch className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Henüz denetim kaydı bulunmuyor</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kod</TableHead>
                  <TableHead>Başlık</TableHead>
                  <TableHead>Tür</TableHead>
                  <TableHead>Denetlenen</TableHead>
                  <TableHead>Baş Denetçi</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Bulgular</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {audits.map((audit) => (
                  <TableRow
                    key={audit.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/dashboard/audits/${audit.id}`)}
                  >
                    <TableCell className="font-medium">{audit.code}</TableCell>
                    <TableCell>
                      <div className="max-w-[200px] truncate">{audit.title}</div>
                    </TableCell>
                    <TableCell>
                      <Badge className={typeColors[audit.type] || 'bg-gray-100'}>
                        {typeLabels[audit.type] || audit.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {audit.auditedDepartment?.name || '-'}
                    </TableCell>
                    <TableCell>
                      {audit.leadAuditor ? `${audit.leadAuditor.name} ${audit.leadAuditor.surname || ''}` : '-'}
                    </TableCell>
                    <TableCell>
                      {audit.plannedStartDate
                        ? format(new Date(audit.plannedStartDate), 'dd MMM yyyy', { locale: tr })
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[audit.status] || 'bg-gray-100'}>
                        {statusLabels[audit.status] || audit.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                        {audit._count?.findings || 0}
                      </div>
                    </TableCell>
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
