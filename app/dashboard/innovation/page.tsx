'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Lightbulb, Plus, ThumbsUp, ThumbsDown, MessageCircle, Paperclip,
  Search, Filter, ChevronRight, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  YENI: { label: 'Yeni', color: 'bg-blue-100 text-blue-800' },
  DEGERLENDIRME: { label: 'Değerlendirme', color: 'bg-yellow-100 text-yellow-800' },
  ONAYLANDI: { label: 'Onaylandı', color: 'bg-green-100 text-green-800' },
  PROJELESTI: { label: 'Projeye Dönüştü', color: 'bg-purple-100 text-purple-800' },
  REDDEDILDI: { label: 'Reddedildi', color: 'bg-red-100 text-red-800' },
  ARSIV: { label: 'Arşiv', color: 'bg-gray-100 text-gray-800' },
};

const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  MISAFIR_DENEYIMI: { label: 'Misafir Deneyimi', color: 'bg-pink-100 text-pink-800' },
  OPERASYONEL_VERIMLILIK: { label: 'Op. Verimlilik', color: 'bg-orange-100 text-orange-800' },
  SURDURULEBILIRLIK: { label: 'Sürdürülebilirlik', color: 'bg-green-100 text-green-800' },
  TEKNOLOJI: { label: 'Teknoloji', color: 'bg-blue-100 text-blue-800' },
  PERSONEL_REFAHI: { label: 'Personel Refahı', color: 'bg-teal-100 text-teal-800' },
  MALIYET_AZALTMA: { label: 'Maliyet Azaltma', color: 'bg-red-100 text-red-800' },
  GELIR_ARTIRMA: { label: 'Gelir Artırma', color: 'bg-emerald-100 text-emerald-800' },
};

const MATURITY_CONFIG: Record<string, { label: string; color: string }> = {
  HAM_FIKIR: { label: 'Ham Fikir', color: 'bg-slate-100 text-slate-700' },
  KONSEPT: { label: 'Konsept', color: 'bg-indigo-100 text-indigo-700' },
  IS_PLANI: { label: 'İş Planı', color: 'bg-amber-100 text-amber-700' },
  PROJE: { label: 'Proje', color: 'bg-violet-100 text-violet-700' },
};

interface Idea {
  id: string;
  code: string;
  title: string;
  description: string;
  category: string;
  status: string;
  maturity: string;
  isAnonymous: boolean;
  upVotes: number;
  downVotes: number;
  score: number;
  createdBy: { id: string; name: string; surname: string } | null;
  department: { id: string; name: string } | null;
  project: { id: string; code: string; name: string } | null;
  createdAt: string;
  _count: { votes: number; comments: number; attachments: number };
}

interface Department { id: string; name: string; }

export default function InnovationPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    isAnonymous: false,
    departmentId: '',
    maturity: 'HAM_FIKIR',
    costSavingEstimate: '',
    revenueEstimate: '',
    guestSatisfactionImpact: '',
    employeeSatisfactionImpact: '',
  });

  const fetchIdeas = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (categoryFilter) params.set('category', categoryFilter);
      params.set('sort', sortBy);

      const res = await fetch(`/api/innovation/ideas?${params}`);
      const data = await res.json();
      setIdeas(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Fikirler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/departments');
      const data = await res.json();
      setDepartments(Array.isArray(data) ? data : (data.departments ?? []));
    } catch { /* sessiz */ }
  };

  useEffect(() => { fetchIdeas(); }, [search, statusFilter, categoryFilter, sortBy]);
  useEffect(() => { fetchDepartments(); }, []);

  const resetForm = () => setForm({
    title: '', description: '', category: '', isAnonymous: false,
    departmentId: '', maturity: 'HAM_FIKIR', costSavingEstimate: '',
    revenueEstimate: '', guestSatisfactionImpact: '', employeeSatisfactionImpact: '',
  });

  const handleCreate = async () => {
    if (!form.title || !form.description || !form.category) {
      toast.error('Başlık, açıklama ve kategori zorunludur');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/innovation/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          departmentId: form.departmentId || null,
          costSavingEstimate: form.costSavingEstimate || null,
          revenueEstimate: form.revenueEstimate || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      toast.success('Fikriniz başarıyla gönderildi');
      setShowCreateDialog(false);
      resetForm();
      fetchIdeas();
    } catch (err: any) {
      toast.error(err.message ?? 'Bir hata oluştu');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Fikir Kumbarası</h2>
          <p className="text-muted-foreground">Tüm inovasyon fikirlerini görüntüleyin ve yeni fikir gönderin</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" /> Yeni Fikir
        </Button>
      </div>

      {/* Filtreler */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Fikir ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[160px]">
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
            <Select value={categoryFilter || 'all'} onValueChange={(v) => setCategoryFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Kategoriler</SelectItem>
                {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Sırala" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt">En Yeni</SelectItem>
                <SelectItem value="score">En Çok Oy</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Liste */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : ideas.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Lightbulb className="h-12 w-12 text-yellow-400 mb-4" />
            <p className="text-lg font-medium">Henüz fikir yok</p>
            <p className="text-muted-foreground mb-4">İlk fikri sen gönder!</p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" /> Fikir Gönder
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {ideas.map((idea) => (
            <Card
              key={idea.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => router.push(`/dashboard/innovation/${idea.id}`)}
            >
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-xs text-muted-foreground font-mono">{idea.code}</span>
                      <Badge className={`text-xs ${STATUS_CONFIG[idea.status]?.color ?? ''}`}>
                        {STATUS_CONFIG[idea.status]?.label ?? idea.status}
                      </Badge>
                      <Badge className={`text-xs ${CATEGORY_CONFIG[idea.category]?.color ?? ''}`}>
                        {CATEGORY_CONFIG[idea.category]?.label ?? idea.category}
                      </Badge>
                      <Badge className={`text-xs ${MATURITY_CONFIG[idea.maturity]?.color ?? ''}`}>
                        {MATURITY_CONFIG[idea.maturity]?.label ?? idea.maturity}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-base truncate">{idea.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{idea.description}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span>{idea.isAnonymous ? 'Anonim' : idea.createdBy ? `${idea.createdBy.name} ${idea.createdBy.surname}` : '-'}</span>
                      {idea.department && <span>• {idea.department.name}</span>}
                      <span>• {format(new Date(idea.createdAt), 'dd MMM yyyy', { locale: tr })}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center gap-1 text-sm">
                        <ThumbsUp className="h-3.5 w-3.5 text-green-600" />
                        <span className="font-medium text-green-700">{idea.upVotes}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm">
                        <ThumbsDown className="h-3.5 w-3.5 text-red-500" />
                        <span className="font-medium text-red-600">{idea.downVotes}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MessageCircle className="h-3.5 w-3.5" />
                        <span>{idea._count.comments}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Paperclip className="h-3.5 w-3.5" />
                        <span>{idea._count.attachments}</span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Fikir Oluşturma Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => { setShowCreateDialog(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Yeni Fikir Gönder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Başlık *</Label>
              <Input
                placeholder="Fikrinizin başlığı"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Açıklama *</Label>
              <Textarea
                placeholder="Fikrinizi detaylı açıklayın..."
                rows={4}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Kategori *</Label>
                <Select value={form.category || 'none'} onValueChange={(v) => setForm({ ...form, category: v === 'none' ? '' : v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" disabled>Seçin</SelectItem>
                    {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Olgunluk</Label>
                <Select value={form.maturity} onValueChange={(v) => setForm({ ...form, maturity: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(MATURITY_CONFIG).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Departman</Label>
              <Select value={form.departmentId || 'none'} onValueChange={(v) => setForm({ ...form, departmentId: v === 'none' ? '' : v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Departman seçin (opsiyonel)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Departman seçme</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tahmini Tasarruf (₺)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={form.costSavingEstimate}
                  onChange={(e) => setForm({ ...form, costSavingEstimate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Tahmini Gelir Artışı (₺)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={form.revenueEstimate}
                  onChange={(e) => setForm({ ...form, revenueEstimate: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Misafir Memnuniyeti Etkisi</Label>
              <Input
                placeholder="Misafir deneyimine katkısı..."
                value={form.guestSatisfactionImpact}
                onChange={(e) => setForm({ ...form, guestSatisfactionImpact: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="anonymous"
                checked={form.isAnonymous}
                onCheckedChange={(v) => setForm({ ...form, isAnonymous: v === true })}
              />
              <Label htmlFor="anonymous" className="cursor-pointer">Anonim olarak gönder</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreateDialog(false); resetForm(); }}>İptal</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Gönder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
