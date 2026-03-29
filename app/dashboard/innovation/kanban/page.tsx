'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, Search, Filter, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

const COLUMNS = [
  { key: 'YAPILACAK', label: 'Yapılacak', color: 'border-t-slate-400', headerBg: 'bg-slate-50' },
  { key: 'DEVAM_EDIYOR', label: 'Devam Ediyor', color: 'border-t-blue-500', headerBg: 'bg-blue-50' },
  { key: 'INCELEMEDE', label: 'İncelemede', color: 'border-t-yellow-500', headerBg: 'bg-yellow-50' },
  { key: 'TAMAMLANDI', label: 'Tamamlandı', color: 'border-t-green-500', headerBg: 'bg-green-50' },
];

const PRIORITY_COLORS: Record<string, string> = {
  DUSUK: 'border-l-gray-400',
  ORTA: 'border-l-blue-500',
  YUKSEK: 'border-l-orange-500',
  ACIL: 'border-l-red-600',
};

const PRIORITY_LABELS: Record<string, string> = {
  DUSUK: 'Düşük',
  ORTA: 'Orta',
  YUKSEK: 'Yüksek',
  ACIL: 'Acil',
};

const PRIORITY_BADGE: Record<string, string> = {
  DUSUK: 'bg-gray-100 text-gray-600',
  ORTA: 'bg-blue-100 text-blue-700',
  YUKSEK: 'bg-orange-100 text-orange-700',
  ACIL: 'bg-red-100 text-red-700',
};

export default function KanbanPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [projectFilter, setProjectFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [search, setSearch] = useState('');

  const [draggedTask, setDraggedTask] = useState<any>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const fetchAllTasks = async () => {
    setLoading(true);
    try {
      const projectList = await fetch('/api/innovation/projects').then((r) => r.json());
      const list = Array.isArray(projectList) ? projectList : [];
      setProjects(list);

      // Tüm projelerin görevlerini topla
      const allTasks: any[] = [];
      await Promise.all(
        list.map(async (proj: any) => {
          try {
            const res = await fetch(`/api/innovation/projects/${proj.id}/tasks`);
            const data = await res.json();
            if (Array.isArray(data)) {
              data.forEach((t) => allTasks.push({ ...t, projectName: proj.name, projectCode: proj.code, projectId: proj.id }));
            }
          } catch { /* sessiz */ }
        })
      );
      setTasks(allTasks);
    } catch {
      toast.error('Görevler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAllTasks(); }, []);

  useEffect(() => {
    fetch('/api/users').then((r) => r.json()).then((d) => setUsers(Array.isArray(d) ? d : (d.users ?? [])));
  }, []);

  const handleStatusChange = async (task: any, newStatus: string) => {
    if (task.status === newStatus) return;

    // Optimistik güncelleme
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: newStatus } : t));

    try {
      const res = await fetch(`/api/innovation/projects/${task.projectId}/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
    } catch {
      // Geri al
      setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: task.status } : t));
      toast.error('Görev güncellenemedi');
    }
  };

  // Drag & Drop handlers (native HTML5)
  const handleDragStart = (e: React.DragEvent, task: any) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, columnKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnKey);
  };

  const handleDrop = (e: React.DragEvent, columnKey: string) => {
    e.preventDefault();
    setDragOverColumn(null);
    if (draggedTask && draggedTask.status !== columnKey) {
      handleStatusChange(draggedTask, columnKey);
    }
    setDraggedTask(null);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOverColumn(null);
  };

  const filteredTasks = tasks.filter((t) => {
    if (projectFilter && t.projectId !== projectFilter) return false;
    if (assigneeFilter && t.assigneeId !== assigneeFilter) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const tasksByColumn = (colKey: string) => filteredTasks.filter((t) => t.status === colKey);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Kanban Panosu</h2>
          <p className="text-muted-foreground">Proje görevlerini sürükle-bırak ile yönetin</p>
        </div>
        <Button variant="outline" onClick={() => router.push('/dashboard/innovation/projects')}>
          Tüm Projeler
        </Button>
      </div>

      {/* Filtreler */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Görev ara..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={projectFilter || 'all'} onValueChange={(v) => setProjectFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Proje" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Projeler</SelectItem>
            {projects.map((p: any) => (
              <SelectItem key={p.id} value={p.id}>{p.code} — {p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={assigneeFilter || 'all'} onValueChange={(v) => setAssigneeFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sorumlu" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Sorumlular</SelectItem>
            {users.map((u: any) => (
              <SelectItem key={u.id} value={u.id}>{u.name} {u.surname}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Kanban Board */}
      {tasks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Henüz görev yok</p>
            <p className="text-muted-foreground">Projelere görev ekleyerek başlayın</p>
            <Button className="mt-4" onClick={() => router.push('/dashboard/innovation/projects')}>
              Projelere Git
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          {COLUMNS.map((col) => {
            const colTasks = tasksByColumn(col.key);
            const isDragTarget = dragOverColumn === col.key;

            return (
              <div
                key={col.key}
                className={`rounded-lg border-t-4 ${col.color} bg-muted/30 min-h-[200px] transition-colors ${isDragTarget ? 'bg-muted/60 ring-2 ring-primary/30' : ''}`}
                onDragOver={(e) => handleDragOver(e, col.key)}
                onDrop={(e) => handleDrop(e, col.key)}
                onDragLeave={() => setDragOverColumn(null)}
              >
                {/* Sütun başlığı */}
                <div className={`${col.headerBg} rounded-t-md px-3 py-2 border-b flex items-center justify-between`}>
                  <span className="text-sm font-semibold">{col.label}</span>
                  <Badge variant="secondary" className="text-xs">{colTasks.length}</Badge>
                </div>

                {/* Görev kartları */}
                <div className="p-2 space-y-2">
                  {colTasks.length === 0 && (
                    <div className={`text-center text-xs text-muted-foreground py-6 border-2 border-dashed rounded-md ${isDragTarget ? 'border-primary/40' : 'border-muted-foreground/20'}`}>
                      {isDragTarget ? 'Bırak' : 'Boş'}
                    </div>
                  )}
                  {colTasks.map((task) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task)}
                      onDragEnd={handleDragEnd}
                      className={`bg-white rounded-md border border-l-4 ${PRIORITY_COLORS[task.priority] ?? 'border-l-gray-300'} p-3 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${draggedTask?.id === task.id ? 'opacity-50' : ''}`}
                    >
                      {/* Proje adı */}
                      <p
                        className="text-xs text-muted-foreground font-medium truncate cursor-pointer hover:text-primary mb-1"
                        onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/innovation/projects/${task.projectId}`); }}
                      >
                        {task.projectCode}
                      </p>

                      {/* Görev başlığı */}
                      <p className="text-sm font-medium leading-tight">{task.title}</p>

                      {/* Alt bilgiler */}
                      <div className="flex items-center justify-between mt-2">
                        <Badge className={`text-xs ${PRIORITY_BADGE[task.priority] ?? ''}`}>
                          {PRIORITY_LABELS[task.priority] ?? task.priority}
                        </Badge>
                        {task.assignee && (
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold" title={`${task.assignee.name} ${task.assignee.surname}`}>
                            {task.assignee.name[0]}
                          </div>
                        )}
                      </div>

                      {task.dueDate && (
                        <p className="text-xs text-muted-foreground mt-1.5">
                          📅 {format(new Date(task.dueDate), 'dd MMM', { locale: tr })}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
