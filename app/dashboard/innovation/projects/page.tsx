'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  FolderKanban, Plus, Search, Filter, Loader2, ChevronRight,
  Users, Calendar, TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PLANLAMA: { label: 'Planlama', color: 'bg-slate-100 text-slate-700' },
  BASLADI: { label: 'Başladı', color: 'bg-blue-100 text-blue-800' },
  DEVAM_EDIYOR: { label: 'Devam Ediyor', color: 'bg-yellow-100 text-yellow-800' },
  PILOT: { label: 'Pilot', color: 'bg-orange-100 text-orange-800' },
  YAYGINLASTIRMA: { label: 'Yaygınlaştırma', color: 'bg-indigo-100 text-indigo-800' },
  TAMAMLANDI: { label: 'Tamamlandı', color: 'bg-green-100 text-green-800' },
  IPTAL: { label: 'İptal', color: 'bg-red-100 text-red-800' },
};

export default function ProjectsPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [projects, setProjects] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', departmentId: '', managerId: '', estimatedBudget: '', estimatedROI: '', startDate: '', endDate: '' });

  const isAdmin = ['Admin', 'Yönetici'].includes(session?.user?.role ?? '');

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/innovation/projects?${params}`);
      const data = await res.json();
      setProjects(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Projeler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProjects(); }, [search, statusFilter]);

  useEffect(() => {
    fetch('/api/departments').then((r) => r.json()).then((d) => setDepartments(Array.isArray(d) ? d : (d.departments ?? [])));
    fetch('/api/users').then((r) => r.json()).then((d) => setUsers(Array.isArray(d) ? d : (d.users ?? [])));
  }, []);

  const handleCreate = async () => {
    if (!form.name) { toast.error('Proje adı zorunludur'); return; }
    setCreating(true);
    try {
      const res = await fetch('/api/innovation/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, departmentId: form.departmentId || null, managerId: form.managerId || null, estimatedBudget: form.estimatedBudget || null, estimatedROI: form.estimatedROI || null, startDate: form.startDate || null, endDate: form.endDate || null }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      toast.success('Proje oluşturuldu');
      setShowCreate(false);
      setForm({ name: '', description: '', departmentId: '', managerId: '', estimatedBudget: '', estimatedROI: '', startDate: '', endDate: '' });
      fetchProjects();
    } catch (e: any) {
      toast.error(e.message ?? 'Hata oluştu');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">İnovasyon Projeleri</h2>
          <p className="text-muted-foreground">Onaylanan fikirlerden oluşturulan projeler</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" /> Yeni Proje
          </Button>
        )}
      </div>

      {/* Filtreler */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Proje ara..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Durum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Durumlar</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Liste */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FolderKanban className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Henüz proje yok</p>
            <p className="text-muted-foreground">Onaylanan fikirleri projeye dönüştürerek başlayın</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {projects.map((p) => (
            <Card key={p.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push(`/dashboard/innovation/projects/${p.id}`)}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-xs text-muted-foreground font-mono">{p.code}</span>
                      <Badge className={`text-xs ${STATUS_CONFIG[p.status]?.color ?? ''}`}>
                        {STATUS_CONFIG[p.status]?.label ?? p.status}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-base truncate">{p.name}</h3>
                    {p.description && <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">{p.description}</p>}
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                        <span>İlerleme</span>
                        <span>{Math.round(p.progress)}%</span>
                      </div>
                      <Progress value={p.progress} className="h-1.5" />
                    </div>
                    <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-muted-foreground">
                      {p.manager && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {p.manager.name} {p.manager.surname}
                        </span>
                      )}
                      {p.department && <span>• {p.department.name}</span>}
                      {p.endDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {format(new Date(p.endDate), 'dd MMM yyyy', { locale: tr })}
                        </span>
                      )}
                      {p.estimatedBudget && (
                        <span className="flex items-center gap-1">
                          <TrendingUp className="h-3.5 w-3.5" />
                          ₺{Number(p.estimatedBudget).toLocaleString('tr-TR')}
                        </span>
                      )}
                      <span>• {p._count?.tasks ?? 0} görev</span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Yeni Proje Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Yeni Proje Oluştur</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Proje Adı *</Label>
              <Input placeholder="Proje adı" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Açıklama</Label>
              <Textarea placeholder="Proje açıklaması..." rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Departman</Label>
                <Select value={form.departmentId || 'none'} onValueChange={(v) => setForm({ ...form, departmentId: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Seçin" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Seçme</SelectItem>
                    {departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Proje Yöneticisi</Label>
                <Select value={form.managerId || 'none'} onValueChange={(v) => setForm({ ...form, managerId: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Seçin" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Seçme</SelectItem>
                    {users.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.name} {u.surname}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Başlangıç Tarihi</Label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Bitiş Tarihi</Label>
                <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tahmini Bütçe (₺)</Label>
                <Input type="number" placeholder="0" value={form.estimatedBudget} onChange={(e) => setForm({ ...form, estimatedBudget: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Tahmini ROI (%)</Label>
                <Input type="number" placeholder="0" value={form.estimatedROI} onChange={(e) => setForm({ ...form, estimatedROI: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>İptal</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Oluştur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
