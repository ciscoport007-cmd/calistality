'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Calendar,
  Plus,
  Search,
  Filter,
  BookOpen,
  Users,
  Clock,
  MapPin,
  Video,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

const STATUS_OPTIONS = [
  { value: 'TASLAK', label: 'Taslak', color: 'secondary' },
  { value: 'PLANLANDI', label: 'Planlandı', color: 'outline' },
  { value: 'DEVAM_EDIYOR', label: 'Devam Ediyor', color: 'default' },
  { value: 'TAMAMLANDI', label: 'Tamamlandı', color: 'success' },
  { value: 'IPTAL', label: 'İptal', color: 'destructive' },
  { value: 'ERTELENDI', label: 'Ertelendi', color: 'warning' },
];

export default function TrainingPlansPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<any[]>([]);
  const [trainings, setTrainings] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTraining, setFilterTraining] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    trainingId: '',
    title: '',
    description: '',
    plannedDate: '',
    startTime: '',
    endTime: '',
    location: '',
    isOnline: false,
    onlineLink: '',
    instructorId: '',
    externalInstructor: '',
    departmentId: '',
    maxParticipants: null as number | null,
    cost: null as number | null,
    currency: 'TRY',
    notes: '',
  });

  useEffect(() => {
    fetchPlans();
    fetchTrainings();
    fetchDepartments();
    fetchUsers();
  }, [filterStatus, filterTraining, filterDepartment]);

  const fetchPlans = async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus && filterStatus !== 'all') params.set('status', filterStatus);
      if (filterTraining && filterTraining !== 'all') params.set('trainingId', filterTraining);
      if (filterDepartment && filterDepartment !== 'all') params.set('departmentId', filterDepartment);

      const res = await fetch(`/api/training-plans?${params}`);
      const data = await res.json();
      setPlans(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching plans:', error);
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrainings = async () => {
    try {
      const res = await fetch('/api/trainings?isActive=true');
      const data = await res.json();
      setTrainings(Array.isArray(data) ? data : []);
    } catch (error) {
      setTrainings([]);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/departments');
      const data = await res.json();
      const deptList = data.departments || data;
      setDepartments(Array.isArray(deptList) ? deptList : []);
    } catch (error) {
      setDepartments([]);
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

  const handleCreate = async () => {
    if (!formData.trainingId || !formData.title || !formData.plannedDate) {
      toast.error('Eğitim, başlık ve tarih zorunludur');
      return;
    }

    try {
      // Convert "none" values to empty strings for API
      const submitData = {
        ...formData,
        departmentId: formData.departmentId === 'none' ? '' : formData.departmentId,
        instructorId: formData.instructorId === 'none' ? '' : formData.instructorId,
      };
      const res = await fetch('/api/training-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      if (!res.ok) throw new Error('Oluşturma hatası');

      toast.success('Eğitim planı oluşturuldu');
      setCreateDialogOpen(false);
      setFormData({
        trainingId: '',
        title: '',
        description: '',
        plannedDate: '',
        startTime: '',
        endTime: '',
        location: '',
        isOnline: false,
        onlineLink: '',
        instructorId: '',
        externalInstructor: '',
        departmentId: '',
        maxParticipants: null,
        cost: null,
        currency: 'TRY',
        notes: '',
      });
      fetchPlans();
    } catch (error) {
      toast.error('Eğitim planı oluşturulamadı');
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

  const stats = {
    total: plans.length,
    planned: plans.filter((p) => p.status === 'PLANLANDI').length,
    inProgress: plans.filter((p) => p.status === 'DEVAM_EDIYOR').length,
    completed: plans.filter((p) => p.status === 'TAMAMLANDI').length,
  };

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/trainings')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Eğitim Planları</h1>
            <p className="text-muted-foreground">Planlanmış ve gerçekleşen eğitimler</p>
          </div>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Yeni Plan
        </Button>
      </div>

      {/* İstatistikler */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Toplam Plan</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Planlandı</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.planned}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Devam Ediyor</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.inProgress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tamamlandı</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtreler */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Durum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Durumlar</SelectItem>
                {STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterTraining} onValueChange={setFilterTraining}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Eğitim" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Eğitimler</SelectItem>
                {trainings.map((training) => (
                  <SelectItem key={training.id} value={training.id}>
                    {training.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Departman" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Departmanlar</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tablo */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kod</TableHead>
                <TableHead>Eğitim / Başlık</TableHead>
                <TableHead>Tarih / Saat</TableHead>
                <TableHead>Konum</TableHead>
                <TableHead>Eğitmen</TableHead>
                <TableHead>Katılımcı</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Yükleniyor...
                  </TableCell>
                </TableRow>
              ) : plans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Eğitim planı bulunamadı
                  </TableCell>
                </TableRow>
              ) : (
                plans.map((plan) => (
                  <TableRow
                    key={plan.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/dashboard/trainings/plans/${plan.id}`)}
                  >
                    <TableCell className="font-mono text-sm">{plan.code}</TableCell>
                    <TableCell>
                      <div className="font-medium">{plan.training?.name}</div>
                      <div className="text-sm text-muted-foreground">{plan.title}</div>
                    </TableCell>
                    <TableCell>
                      <div>{format(new Date(plan.plannedDate), 'dd MMM yyyy', { locale: tr })}</div>
                      {plan.startTime && (
                        <div className="text-sm text-muted-foreground">
                          {plan.startTime}
                          {plan.endTime && ` - ${plan.endTime}`}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {plan.isOnline ? (
                        <div className="flex items-center gap-1">
                          <Video className="h-4 w-4 text-blue-500" />
                          <span>Online</span>
                        </div>
                      ) : plan.location ? (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="truncate max-w-[150px]">{plan.location}</span>
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {plan.instructor
                        ? `${plan.instructor.name} ${plan.instructor.surname || ''}`
                        : plan.externalInstructor || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        {plan._count?.records || 0}
                        {plan.maxParticipants && `/${plan.maxParticipants}`}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(plan.status)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Plan Oluşturma Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Yeni Eğitim Planı</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Eğitim *</Label>
                <Select
                  value={formData.trainingId}
                  onValueChange={(v) => setFormData({ ...formData, trainingId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Eğitim seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {trainings.map((training) => (
                      <SelectItem key={training.id} value={training.id}>
                        {training.code} - {training.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label>Oturum Başlığı *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ör: 2026 Yılı 1. Dönem Eğitimi"
                />
              </div>
              <div>
                <Label>Tarih *</Label>
                <Input
                  type="date"
                  value={formData.plannedDate}
                  onChange={(e) => setFormData({ ...formData, plannedDate: e.target.value })}
                />
              </div>
              <div>
                <Label>Departman</Label>
                <Select
                  value={formData.departmentId}
                  onValueChange={(v) => setFormData({ ...formData, departmentId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Departman seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Belirtilmemiş</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Başlangıç Saati</Label>
                <Input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                />
              </div>
              <div>
                <Label>Bitiş Saati</Label>
                <Input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                />
              </div>
            </div>

            <div className="border-t pt-4 space-y-4">
              <h4 className="font-medium">Konum</h4>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isOnline"
                  checked={formData.isOnline}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isOnline: checked as boolean })
                  }
                />
                <Label htmlFor="isOnline">Online Eğitim</Label>
              </div>
              {formData.isOnline ? (
                <div>
                  <Label>Online Link</Label>
                  <Input
                    value={formData.onlineLink}
                    onChange={(e) => setFormData({ ...formData, onlineLink: e.target.value })}
                    placeholder="https://meet.google.com/..."
                  />
                </div>
              ) : (
                <div>
                  <Label>Konum</Label>
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Ör: Toplantı Odası A"
                  />
                </div>
              )}
            </div>

            <div className="border-t pt-4 space-y-4">
              <h4 className="font-medium">Eğitmen</h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>İç Eğitmen</Label>
                  <Select
                    value={formData.instructorId}
                    onValueChange={(v) => setFormData({ ...formData, instructorId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Belirtilmemiş</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name} {user.surname || ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Dış Eğitmen</Label>
                  <Input
                    value={formData.externalInstructor}
                    onChange={(e) =>
                      setFormData({ ...formData, externalInstructor: e.target.value })
                    }
                    placeholder="Dış eğitmen adı"
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-4 space-y-4">
              <h4 className="font-medium">Diğer</h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Maksimum Katılımcı</Label>
                  <Input
                    type="number"
                    value={formData.maxParticipants || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maxParticipants: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Maliyet</Label>
                  <Input
                    type="number"
                    value={formData.cost || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        cost: e.target.value ? parseFloat(e.target.value) : null,
                      })
                    }
                  />
                </div>
              </div>
              <div>
                <Label>Açıklama</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              İptal
            </Button>
            <Button onClick={handleCreate}>Oluştur</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
