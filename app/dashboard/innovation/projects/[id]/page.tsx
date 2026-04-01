'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Loader2, Plus, Trash2, CheckSquare, Flag, Users2,
  TrendingUp, Calendar, Edit2, Check, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

const PROJECT_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PLANLAMA: { label: 'Planlama', color: 'bg-slate-100 text-slate-700' },
  BASLADI: { label: 'Başladı', color: 'bg-blue-100 text-blue-800' },
  DEVAM_EDIYOR: { label: 'Devam Ediyor', color: 'bg-yellow-100 text-yellow-800' },
  PILOT: { label: 'Pilot', color: 'bg-orange-100 text-orange-800' },
  YAYGINLASTIRMA: { label: 'Yaygınlaştırma', color: 'bg-indigo-100 text-indigo-800' },
  TAMAMLANDI: { label: 'Tamamlandı', color: 'bg-green-100 text-green-800' },
  IPTAL: { label: 'İptal', color: 'bg-red-100 text-red-800' },
};

const TASK_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  YAPILACAK: { label: 'Yapılacak', color: 'bg-slate-100 text-slate-700' },
  DEVAM_EDIYOR: { label: 'Devam Ediyor', color: 'bg-blue-100 text-blue-800' },
  INCELEMEDE: { label: 'İncelemede', color: 'bg-yellow-100 text-yellow-800' },
  TAMAMLANDI: { label: 'Tamamlandı', color: 'bg-green-100 text-green-800' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  DUSUK: { label: 'Düşük', color: 'bg-gray-100 text-gray-600' },
  ORTA: { label: 'Orta', color: 'bg-blue-100 text-blue-700' },
  YUKSEK: { label: 'Yüksek', color: 'bg-orange-100 text-orange-700' },
  ACIL: { label: 'Acil', color: 'bg-red-100 text-red-700' },
};

const MILESTONE_STATUS: Record<string, { label: string; color: string }> = {
  BEKLIYOR: { label: 'Bekliyor', color: 'bg-slate-100 text-slate-600' },
  DEVAM_EDIYOR: { label: 'Devam Ediyor', color: 'bg-blue-100 text-blue-700' },
  TAMAMLANDI: { label: 'Tamamlandı', color: 'bg-green-100 text-green-700' },
  GECIKTI: { label: 'Gecikti', color: 'bg-red-100 text-red-700' },
};

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { data: session } = useSession();
  const router = useRouter();

  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);

  // Görev dialog
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', priority: 'ORTA', assigneeId: '', dueDate: '' });
  const [creatingTask, setCreatingTask] = useState(false);

  // Milestone dialog
  const [showMilestoneDialog, setShowMilestoneDialog] = useState(false);
  const [milestoneForm, setMilestoneForm] = useState({ title: '', description: '', dueDate: '' });
  const [creatingMilestone, setCreatingMilestone] = useState(false);

  // Paydaş dialog
  const [showStakeholderDialog, setShowStakeholderDialog] = useState(false);
  const [stakeholderForm, setStakeholderForm] = useState({ userId: '', role: '' });
  const [creatingStakeholder, setCreatingStakeholder] = useState(false);

  // İlerleme güncelleme
  const [progress, setProgress] = useState(0);
  const [updatingProgress, setUpdatingProgress] = useState(false);

  const isAdmin = ['Admin', 'Yönetici'].includes(session?.user?.role ?? '');

  const fetchProject = async () => {
    try {
      const res = await fetch(`/api/innovation/projects/${id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setProject(data);
      setProgress(data.progress ?? 0);
    } catch {
      toast.error('Proje yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProject(); }, [id]);
  useEffect(() => {
    fetch('/api/users').then((r) => r.json()).then((d) => setUsers(Array.isArray(d) ? d : (d.users ?? [])));
  }, []);

  const handleStatusChange = async (status: string) => {
    try {
      const res = await fetch(`/api/innovation/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      setProject((p: any) => ({ ...p, status }));
      toast.success('Durum güncellendi');
    } catch {
      toast.error('Durum güncellenemedi');
    }
  };

  const handleProgressUpdate = async () => {
    setUpdatingProgress(true);
    try {
      const res = await fetch(`/api/innovation/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progress }),
      });
      if (!res.ok) throw new Error();
      setProject((p: any) => ({ ...p, progress }));
      toast.success('İlerleme güncellendi');
    } catch {
      toast.error('İlerleme güncellenemedi');
    } finally {
      setUpdatingProgress(false);
    }
  };

  const handleCreateTask = async () => {
    if (!taskForm.title) { toast.error('Görev başlığı zorunludur'); return; }
    setCreatingTask(true);
    try {
      const res = await fetch(`/api/innovation/projects/${id}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...taskForm, assigneeId: taskForm.assigneeId || null, dueDate: taskForm.dueDate || null }),
      });
      if (!res.ok) throw new Error();
      const task = await res.json();
      setProject((p: any) => ({ ...p, tasks: [...(p.tasks ?? []), task] }));
      setShowTaskDialog(false);
      setTaskForm({ title: '', description: '', priority: 'ORTA', assigneeId: '', dueDate: '' });
      toast.success('Görev eklendi');
    } catch {
      toast.error('Görev eklenemedi');
    } finally {
      setCreatingTask(false);
    }
  };

  const handleTaskStatusChange = async (taskId: string, status: string) => {
    try {
      const res = await fetch(`/api/innovation/projects/${id}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setProject((p: any) => ({ ...p, tasks: p.tasks.map((t: any) => t.id === taskId ? updated : t) }));
    } catch {
      toast.error('Görev güncellenemedi');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await fetch(`/api/innovation/projects/${id}/tasks/${taskId}`, { method: 'DELETE' });
      setProject((p: any) => ({ ...p, tasks: p.tasks.filter((t: any) => t.id !== taskId) }));
      toast.success('Görev silindi');
    } catch {
      toast.error('Görev silinemedi');
    }
  };

  const handleCreateMilestone = async () => {
    if (!milestoneForm.title) { toast.error('Başlık zorunludur'); return; }
    setCreatingMilestone(true);
    try {
      const res = await fetch(`/api/innovation/projects/${id}/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...milestoneForm, dueDate: milestoneForm.dueDate || null }),
      });
      if (!res.ok) throw new Error();
      const m = await res.json();
      setProject((p: any) => ({ ...p, milestones: [...(p.milestones ?? []), m] }));
      setShowMilestoneDialog(false);
      setMilestoneForm({ title: '', description: '', dueDate: '' });
      toast.success('Kilometre taşı eklendi');
    } catch {
      toast.error('Kilometre taşı eklenemedi');
    } finally {
      setCreatingMilestone(false);
    }
  };

  const handleMilestoneStatus = async (milestoneId: string, status: string) => {
    try {
      const res = await fetch(`/api/innovation/projects/${id}/milestones?milestoneId=${milestoneId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setProject((p: any) => ({ ...p, milestones: p.milestones.map((m: any) => m.id === milestoneId ? updated : m) }));
    } catch {
      toast.error('Güncelleme başarısız');
    }
  };

  const handleCreateStakeholder = async () => {
    if (!stakeholderForm.userId || !stakeholderForm.role) { toast.error('Kullanıcı ve rol zorunludur'); return; }
    setCreatingStakeholder(true);
    try {
      const res = await fetch(`/api/innovation/projects/${id}/stakeholders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stakeholderForm),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      const s = await res.json();
      setProject((p: any) => ({ ...p, stakeholders: [...(p.stakeholders ?? []), s] }));
      setShowStakeholderDialog(false);
      setStakeholderForm({ userId: '', role: '' });
      toast.success('Paydaş eklendi');
    } catch (e: any) {
      toast.error(e.message ?? 'Hata oluştu');
    } finally {
      setCreatingStakeholder(false);
    }
  };

  const handleRemoveStakeholder = async (stakeholderId: string) => {
    try {
      await fetch(`/api/innovation/projects/${id}/stakeholders?stakeholderId=${stakeholderId}`, { method: 'DELETE' });
      setProject((p: any) => ({ ...p, stakeholders: p.stakeholders.filter((s: any) => s.id !== stakeholderId) }));
      toast.success('Paydaş çıkarıldı');
    } catch {
      toast.error('İşlem başarısız');
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }
  if (!project) return null;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Üst Bar */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground font-mono">{project.code}</span>
              <Badge className={`text-xs ${PROJECT_STATUS_CONFIG[project.status]?.color ?? ''}`}>
                {PROJECT_STATUS_CONFIG[project.status]?.label ?? project.status}
              </Badge>
            </div>
            <h2 className="text-xl font-bold mt-0.5">{project.name}</h2>
          </div>
        </div>
        {isAdmin && (
          <Select value={project.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PROJECT_STATUS_CONFIG).map(([key, cfg]) => (
                <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* İlerleme */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="font-medium">Genel İlerleme</span>
                <span className="font-bold">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-3" />
            </div>
            {isAdmin && (
              <div className="flex items-center gap-2 shrink-0">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={progress}
                  onChange={(e) => setProgress(Math.min(100, Math.max(0, Number(e.target.value))))}
                  className="w-20 text-center"
                />
                <Button size="sm" onClick={handleProgressUpdate} disabled={updatingProgress}>
                  {updatingProgress ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Genel Bilgiler</TabsTrigger>
          <TabsTrigger value="tasks">Görevler ({project.tasks?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="milestones">Kilometre Taşları ({project.milestones?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="budget">Bütçe & ROI</TabsTrigger>
          <TabsTrigger value="stakeholders">Paydaşlar ({project.stakeholders?.length ?? 0})</TabsTrigger>
        </TabsList>

        {/* Genel Bilgiler */}
        <TabsContent value="overview">
          <Card>
            <CardContent className="pt-6 space-y-4">
              {project.description && (
                <div>
                  <Label className="text-xs text-muted-foreground">Açıklama</Label>
                  <p className="mt-1 text-sm">{project.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <Label className="text-xs text-muted-foreground">Yönetici</Label>
                  <p className="mt-1">{project.manager ? `${project.manager.name} ${project.manager.surname}` : '-'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Departman</Label>
                  <p className="mt-1">{project.department?.name ?? '-'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Stratejik Hedef</Label>
                  <p className="mt-1">{project.strategicGoal?.name ?? '-'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Başlangıç Tarihi</Label>
                  <p className="mt-1">{project.startDate ? format(new Date(project.startDate), 'dd MMM yyyy', { locale: tr }) : '-'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Hedef Bitiş Tarihi</Label>
                  <p className="mt-1">{project.endDate ? format(new Date(project.endDate), 'dd MMM yyyy', { locale: tr }) : '-'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Kaynak Fikir</Label>
                  {project.idea ? (
                    <Button variant="link" className="p-0 h-auto text-sm mt-1" onClick={() => router.push(`/dashboard/innovation/${project.idea.id}`)}>
                      {project.idea.code}
                    </Button>
                  ) : <p className="mt-1">-</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Görevler */}
        <TabsContent value="tasks">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Görevler</CardTitle>
              <Button size="sm" onClick={() => setShowTaskDialog(true)}>
                <Plus className="h-4 w-4 mr-1" /> Görev Ekle
              </Button>
            </CardHeader>
            <CardContent>
              {(project.tasks ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Henüz görev yok</p>
              ) : (
                <div className="space-y-2">
                  {project.tasks.map((t: any) => (
                    <div key={t.id} className="flex items-center justify-between gap-3 p-3 border rounded-lg hover:bg-muted/50">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex flex-col gap-1">
                          <Badge className={`text-xs ${PRIORITY_CONFIG[t.priority]?.color ?? ''}`}>
                            {PRIORITY_CONFIG[t.priority]?.label ?? t.priority}
                          </Badge>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{t.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {t.assignee ? `${t.assignee.name} ${t.assignee.surname}` : 'Atanmamış'}
                            {t.dueDate && ` • ${format(new Date(t.dueDate), 'dd MMM', { locale: tr })}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Select value={t.status} onValueChange={(v) => handleTaskStatusChange(t.id, v)}>
                          <SelectTrigger className="h-7 text-xs w-[130px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(TASK_STATUS_CONFIG).map(([key, cfg]) => (
                              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteTask(t.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Kilometre Taşları */}
        <TabsContent value="milestones">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Kilometre Taşları</CardTitle>
              <Button size="sm" onClick={() => setShowMilestoneDialog(true)}>
                <Plus className="h-4 w-4 mr-1" /> Ekle
              </Button>
            </CardHeader>
            <CardContent>
              {(project.milestones ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Henüz kilometre taşı yok</p>
              ) : (
                <div className="space-y-2">
                  {project.milestones.map((m: any) => (
                    <div key={m.id} className="flex items-center justify-between gap-3 p-3 border rounded-lg">
                      <div>
                        <p className="text-sm font-medium">{m.title}</p>
                        {m.dueDate && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(m.dueDate), 'dd MMM yyyy', { locale: tr })}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`text-xs ${MILESTONE_STATUS[m.status]?.color ?? ''}`}>
                          {MILESTONE_STATUS[m.status]?.label ?? m.status}
                        </Badge>
                        {m.status !== 'TAMAMLANDI' && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={() => handleMilestoneStatus(m.id, 'TAMAMLANDI')}>
                            <Check className="h-3.5 w-3.5" />
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

        {/* Bütçe & ROI */}
        <TabsContent value="budget">
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Tahmini Bütçe</Label>
                  <p className="text-2xl font-bold">{project.estimatedBudget ? `₺${Number(project.estimatedBudget).toLocaleString('tr-TR')}` : '-'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Gerçekleşen Bütçe</Label>
                  <p className="text-2xl font-bold">{project.actualBudget ? `₺${Number(project.actualBudget).toLocaleString('tr-TR')}` : '-'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Tahmini ROI</Label>
                  <p className="text-2xl font-bold text-green-600">{project.estimatedROI ? `%${project.estimatedROI}` : '-'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Gerçekleşen ROI</Label>
                  <p className="text-2xl font-bold text-green-700">{project.actualROI ? `%${project.actualROI}` : '-'}</p>
                </div>
                {project.roiNote && (
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">ROI Notu</Label>
                    <p className="text-sm mt-1">{project.roiNote}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Paydaşlar */}
        <TabsContent value="stakeholders">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Paydaşlar</CardTitle>
              {isAdmin && (
                <Button size="sm" onClick={() => setShowStakeholderDialog(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Paydaş Ekle
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {(project.stakeholders ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Henüz paydaş yok</p>
              ) : (
                <div className="space-y-2">
                  {project.stakeholders.map((s: any) => (
                    <div key={s.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">
                          {s.user?.name?.[0] ?? '?'}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{s.user?.name} {s.user?.surname}</p>
                          <p className="text-xs text-muted-foreground">{s.role}</p>
                        </div>
                      </div>
                      {isAdmin && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleRemoveStakeholder(s.id)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Görev Dialog */}
      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Görev Ekle</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Başlık *</Label>
              <Input value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Açıklama</Label>
              <Textarea rows={2} value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Öncelik</Label>
                <Select value={taskForm.priority} onValueChange={(v) => setTaskForm({ ...taskForm, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Bitiş Tarihi</Label>
                <Input type="date" value={taskForm.dueDate} onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Sorumlu</Label>
              <Select value={taskForm.assigneeId || 'none'} onValueChange={(v) => setTaskForm({ ...taskForm, assigneeId: v === 'none' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="Seçin" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Seçme</SelectItem>
                  {users.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.name} {u.surname}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTaskDialog(false)}>İptal</Button>
            <Button onClick={handleCreateTask} disabled={creatingTask}>
              {creatingTask && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Ekle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Milestone Dialog */}
      <Dialog open={showMilestoneDialog} onOpenChange={setShowMilestoneDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Kilometre Taşı Ekle</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Başlık *</Label>
              <Input value={milestoneForm.title} onChange={(e) => setMilestoneForm({ ...milestoneForm, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Açıklama</Label>
              <Textarea rows={2} value={milestoneForm.description} onChange={(e) => setMilestoneForm({ ...milestoneForm, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Hedef Tarih</Label>
              <Input type="date" value={milestoneForm.dueDate} onChange={(e) => setMilestoneForm({ ...milestoneForm, dueDate: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMilestoneDialog(false)}>İptal</Button>
            <Button onClick={handleCreateMilestone} disabled={creatingMilestone}>
              {creatingMilestone && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Ekle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Paydaş Dialog */}
      <Dialog open={showStakeholderDialog} onOpenChange={setShowStakeholderDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Paydaş Ekle</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Kullanıcı *</Label>
              <Select value={stakeholderForm.userId || 'none'} onValueChange={(v) => setStakeholderForm({ ...stakeholderForm, userId: v === 'none' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="Seçin" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Seçin</SelectItem>
                  {users.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.name} {u.surname}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Rol *</Label>
              <Input placeholder="Sponsor, Teknik Lider, Danışman..." value={stakeholderForm.role} onChange={(e) => setStakeholderForm({ ...stakeholderForm, role: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStakeholderDialog(false)}>İptal</Button>
            <Button onClick={handleCreateStakeholder} disabled={creatingStakeholder}>
              {creatingStakeholder && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Ekle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
