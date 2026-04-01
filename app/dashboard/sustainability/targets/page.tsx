'use client';

import { useState, useEffect } from 'react';
import { Target, Plus, CheckCircle2, Clock, AlertCircle, TrendingDown, ChevronDown, ChevronRight, User, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

interface Action {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  assignedTo: { id: string; name: string; surname: string | null } | null;
  createdAt: string;
}

interface SustTarget {
  id: string;
  code: string;
  title: string;
  category: string;
  metricType: string;
  baselineValue: number;
  targetValue: number;
  targetUnit: string;
  reductionPct: number;
  period: string;
  startDate: string;
  endDate: string;
  status: string;
  actions: Action[];
  createdBy: { id: string; name: string; surname: string | null };
  createdAt: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  ENERJI: 'Enerji',
  SU: 'Su',
  ATIK: 'Atık',
  KARBON: 'Karbon',
};

const CATEGORY_COLORS: Record<string, string> = {
  ENERJI: 'bg-yellow-100 text-yellow-800',
  SU: 'bg-blue-100 text-blue-800',
  ATIK: 'bg-green-100 text-green-800',
  KARBON: 'bg-slate-100 text-slate-800',
};

const STATUS_LABELS: Record<string, string> = {
  AKTIF: 'Aktif',
  TAMAMLANDI: 'Tamamlandı',
  IPTAL: 'İptal',
};

const STATUS_COLORS: Record<string, string> = {
  AKTIF: 'bg-blue-100 text-blue-800',
  TAMAMLANDI: 'bg-green-100 text-green-800',
  IPTAL: 'bg-gray-100 text-gray-800',
};

const ACTION_STATUS_LABELS: Record<string, string> = {
  ACIK: 'Açık',
  DEVAM_EDIYOR: 'Devam Ediyor',
  TAMAMLANDI: 'Tamamlandı',
  IPTAL: 'İptal',
};

const ACTION_STATUS_COLORS: Record<string, string> = {
  ACIK: 'bg-yellow-100 text-yellow-800',
  DEVAM_EDIYOR: 'bg-blue-100 text-blue-800',
  TAMAMLANDI: 'bg-green-100 text-green-800',
  IPTAL: 'bg-gray-100 text-gray-800',
};

export default function TargetsPage() {
  const [targets, setTargets] = useState<SustTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTarget, setExpandedTarget] = useState<string | null>(null);
  const [showTargetDialog, setShowTargetDialog] = useState(false);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState('');
  const [users, setUsers] = useState<Array<{ id: string; name: string; surname: string | null }>>([]);

  const [targetForm, setTargetForm] = useState({
    title: '',
    category: 'ENERJI',
    metricType: '',
    baselineValue: '',
    targetValue: '',
    targetUnit: '%',
    reductionPct: '',
    period: 'YILLIK',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0],
  });

  const [actionForm, setActionForm] = useState({
    title: '',
    description: '',
    assignedToId: '',
    dueDate: '',
    priority: 'ORTA',
    notes: '',
  });

  useEffect(() => {
    fetchTargets();
    fetchUsers();
  }, [filterCategory]);

  const fetchTargets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterCategory) params.set('category', filterCategory);
      const res = await fetch(`/api/sustainability/targets?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTargets(data.targets || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users?limit=100');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateTarget = async () => {
    try {
      const res = await fetch('/api/sustainability/targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(targetForm),
      });
      if (res.ok) {
        toast.success('Hedef oluşturuldu');
        setShowTargetDialog(false);
        fetchTargets();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Hata');
      }
    } catch (e) {
      toast.error('Oluşturulamadı');
    }
  };

  const handleCreateAction = async () => {
    if (!selectedTargetId) return;
    try {
      const res = await fetch(`/api/sustainability/targets/${selectedTargetId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(actionForm),
      });
      if (res.ok) {
        toast.success('Aksiyon eklendi');
        setShowActionDialog(false);
        setActionForm({ title: '', description: '', assignedToId: '', dueDate: '', priority: 'ORTA', notes: '' });
        fetchTargets();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Hata');
      }
    } catch (e) {
      toast.error('Eklenemedi');
    }
  };

  const handleDeleteTarget = async (id: string) => {
    if (!confirm('Bu hedefi ve tüm aksiyonlarını silmek istediğinizden emin misiniz?')) return;
    try {
      const res = await fetch(`/api/sustainability/targets/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Hedef silindi');
        fetchTargets();
      }
    } catch (e) {
      toast.error('Silinemedi');
    }
  };

  const getProgressValue = (t: SustTarget) => {
    if (!t.actions?.length) return 0;
    const completed = t.actions.filter(a => a.status === 'TAMAMLANDI').length;
    return (completed / t.actions.length) * 100;
  };

  const activeCount = targets.filter(t => t.status === 'AKTIF').length;
  const completedCount = targets.filter(t => t.status === 'TAMAMLANDI').length;
  const openActions = targets.flatMap(t => t.actions ?? []).filter(a => a.status === 'ACIK' || a.status === 'DEVAM_EDIYOR').length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Target className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Hedef & Aksiyon Yönetimi</h1>
            <p className="text-sm text-gray-500">Sürdürülebilirlik hedefleri ve aksiyon planları</p>
          </div>
        </div>
        <Button size="sm" onClick={() => setShowTargetDialog(true)}>
          <Plus className="w-4 h-4 mr-1" /> Hedef Ekle
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg"><Target className="w-4 h-4 text-blue-600" /></div>
              <div><p className="text-xs text-gray-500">Aktif Hedef</p><p className="text-xl font-bold">{activeCount}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg"><CheckCircle2 className="w-4 h-4 text-green-600" /></div>
              <div><p className="text-xs text-gray-500">Tamamlanan</p><p className="text-xl font-bold">{completedCount}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg"><Clock className="w-4 h-4 text-orange-600" /></div>
              <div><p className="text-xs text-gray-500">Açık Aksiyon</p><p className="text-xl font-bold text-orange-600">{openActions}</p></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {['', 'ENERJI', 'SU', 'ATIK', 'KARBON'].map(cat => (
          <Button
            key={cat}
            variant={filterCategory === cat ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterCategory(cat)}
            className="text-xs"
          >
            {cat === '' ? 'Tümü' : CATEGORY_LABELS[cat]}
          </Button>
        ))}
      </div>

      {/* Target List */}
      {loading ? (
        <div className="animate-pulse space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-200 rounded" />)}
        </div>
      ) : targets.length === 0 ? (
        <Card className="p-12 text-center text-gray-400">
          <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Henüz hedef tanımlanmadı</p>
          <Button variant="link" onClick={() => setShowTargetDialog(true)}>İlk hedefi ekle</Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {targets.map(target => {
            const progress = getProgressValue(target);
            const isExpanded = expandedTarget === target.id;
            const openActs = (target.actions ?? []).filter(a => a.status !== 'TAMAMLANDI' && a.status !== 'IPTAL').length;

            return (
              <Card key={target.id} className={`transition-all ${target.status === 'TAMAMLANDI' ? 'opacity-75' : ''}`}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div
                      className="flex items-start gap-3 flex-1 cursor-pointer"
                      onClick={() => setExpandedTarget(isExpanded ? null : target.id)}
                    >
                      <div className="mt-1">
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs text-gray-400">{target.code}</span>
                          <Badge className={`text-xs ${CATEGORY_COLORS[target.category]}`}>{CATEGORY_LABELS[target.category]}</Badge>
                          <Badge className={`text-xs ${STATUS_COLORS[target.status]}`}>{STATUS_LABELS[target.status]}</Badge>
                          {openActs > 0 && <Badge variant="outline" className="text-xs">{openActs} açık aksiyon</Badge>}
                        </div>
                        <p className="font-semibold text-gray-900 mt-1">{target.title}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span>Hedef: <strong>{target.reductionPct}%</strong> azaltım</span>
                          <span>Baz: {target.baselineValue} → {target.targetValue} {target.targetUnit}</span>
                          <span>Bitiş: {new Date(target.endDate).toLocaleDateString('tr-TR')}</span>
                        </div>
                        {(target.actions?.length ?? 0) > 0 && (
                          <div className="mt-2">
                            <div className="flex items-center gap-2">
                              <Progress value={progress} className="h-1.5 flex-1" />
                              <span className="text-xs text-gray-500">%{progress.toFixed(0)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => { setSelectedTargetId(target.id); setShowActionDialog(true); }}
                      >
                        <Plus className="w-3 h-3 mr-1" />Aksiyon
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => handleDeleteTarget(target.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Expanded: Actions */}
                  {isExpanded && (
                    <div className="mt-4 ml-7 space-y-2">
                      {(target.actions?.length ?? 0) === 0 ? (
                        <p className="text-sm text-gray-400 italic">Henüz aksiyon yok.</p>
                      ) : (
                        (target.actions ?? []).map(action => (
                          <div key={action.id} className={`flex items-start gap-3 p-3 rounded-lg border ${action.status === 'TAMAMLANDI' ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100'}`}>
                            <div className="mt-0.5">
                              {action.status === 'TAMAMLANDI' ? (
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                              ) : (
                                <Clock className="w-4 h-4 text-orange-500" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium">{action.title}</p>
                                <Badge className={`text-xs ${ACTION_STATUS_COLORS[action.status]}`}>
                                  {ACTION_STATUS_LABELS[action.status]}
                                </Badge>
                              </div>
                              {action.description && <p className="text-xs text-gray-500 mt-0.5">{action.description}</p>}
                              <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                                {action.assignedTo && (
                                  <span className="flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    {action.assignedTo.name} {action.assignedTo.surname}
                                  </span>
                                )}
                                {action.dueDate && (
                                  <span>Son: {new Date(action.dueDate).toLocaleDateString('tr-TR')}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Target Dialog */}
      <Dialog open={showTargetDialog} onOpenChange={setShowTargetDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Yeni Sürdürülebilirlik Hedefi</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Hedef Başlığı *</Label>
              <Input value={targetForm.title} onChange={e => setTargetForm({ ...targetForm, title: e.target.value })} placeholder="Ör: Enerji Tüketimini %10 Azalt" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Kategori *</Label>
                <Select value={targetForm.category} onValueChange={v => setTargetForm({ ...targetForm, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Metrik Türü</Label>
                <Input value={targetForm.metricType} onChange={e => setTargetForm({ ...targetForm, metricType: e.target.value })} placeholder="Ör: kWh/oda" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Baz Değer</Label>
                <Input type="number" value={targetForm.baselineValue} onChange={e => setTargetForm({ ...targetForm, baselineValue: e.target.value })} />
              </div>
              <div>
                <Label>Hedef Değer</Label>
                <Input type="number" value={targetForm.targetValue} onChange={e => setTargetForm({ ...targetForm, targetValue: e.target.value })} />
              </div>
              <div>
                <Label>Azaltım (%)</Label>
                <Input type="number" value={targetForm.reductionPct} onChange={e => setTargetForm({ ...targetForm, reductionPct: e.target.value })} placeholder="10" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Başlangıç</Label>
                <Input type="date" value={targetForm.startDate} onChange={e => setTargetForm({ ...targetForm, startDate: e.target.value })} />
              </div>
              <div>
                <Label>Bitiş</Label>
                <Input type="date" value={targetForm.endDate} onChange={e => setTargetForm({ ...targetForm, endDate: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTargetDialog(false)}>İptal</Button>
            <Button onClick={handleCreateTarget} disabled={!targetForm.title || !targetForm.category}>Oluştur</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Dialog */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Aksiyon Ekle</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Aksiyon Başlığı *</Label>
              <Input value={actionForm.title} onChange={e => setActionForm({ ...actionForm, title: e.target.value })} placeholder="Yapılacak iş..." />
            </div>
            <div>
              <Label>Açıklama</Label>
              <Input value={actionForm.description} onChange={e => setActionForm({ ...actionForm, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Sorumlu</Label>
                <Select value={actionForm.assignedToId} onValueChange={v => setActionForm({ ...actionForm, assignedToId: v })}>
                  <SelectTrigger><SelectValue placeholder="Seç" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Atanmamış</SelectItem>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.name} {u.surname}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Öncelik</Label>
                <Select value={actionForm.priority} onValueChange={v => setActionForm({ ...actionForm, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DUSUK">Düşük</SelectItem>
                    <SelectItem value="ORTA">Orta</SelectItem>
                    <SelectItem value="YUKSEK">Yüksek</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Termin</Label>
              <Input type="date" value={actionForm.dueDate} onChange={e => setActionForm({ ...actionForm, dueDate: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActionDialog(false)}>İptal</Button>
            <Button onClick={handleCreateAction} disabled={!actionForm.title}>Ekle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
