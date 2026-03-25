'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Plus, Edit, Trash2, Lightbulb, Users, Calendar, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface Initiative {
  id: string;
  code: string;
  name: string;
  description?: string;
  status: string;
  startDate: string;
  endDate: string;
  maxScore: number;
  category: { id: string; name: string; color?: string };
  department?: { name: string };
  assignments: {
    id: string;
    role: string;
    weight: number;
    score?: number;
    performance?: number;
    user: { id: string; name: string; email: string };
  }[];
  createdBy: { name: string };
}

interface Category {
  id: string;
  code: string;
  name: string;
  color?: string;
  _count: { initiatives: number };
}

const statusLabels: Record<string, { label: string; color: string }> = {
  TASLAK: { label: 'Taslak', color: 'bg-gray-500' },
  AKTIF: { label: 'Aktif', color: 'bg-blue-500' },
  TAMAMLANDI: { label: 'Tamamlandı', color: 'bg-green-500' },
  IPTAL: { label: 'İptal', color: 'bg-red-500' },
};

const roleLabels: Record<string, string> = {
  LIDER: 'Lider',
  UYE: 'Üye',
  DESTEKCI: 'Destekci',
};

export default function InitiativesPage() {
  const { data: session } = useSession();
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('initiatives');

  // Dialogs
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [initiativeDialogOpen, setInitiativeDialogOpen] = useState(false);
  const [editingInitiative, setEditingInitiative] = useState<Initiative | null>(null);

  const [categoryForm, setCategoryForm] = useState({ name: '', description: '', color: '#F59E0B' });
  const [initiativeForm, setInitiativeForm] = useState({
    name: '',
    description: '',
    categoryId: '',
    departmentId: '',
    startDate: '',
    endDate: '',
    maxScore: 100,
    assignments: [] as { userId: string; role: string; weight: number }[],
  });

  // Filtreler
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');

  const fetchData = async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus && filterStatus !== 'all') params.append('status', filterStatus);
      if (filterCategory && filterCategory !== 'all') params.append('categoryId', filterCategory);

      const [initRes, catRes, deptRes, usersRes] = await Promise.all([
        fetch(`/api/initiatives?${params}`),
        fetch('/api/initiative-categories'),
        fetch('/api/departments'),
        fetch('/api/users'),
      ]);

      const initData = await initRes.json();
      const catData = await catRes.json();
      const deptData = await deptRes.json();
      const usersData = await usersRes.json();

      setInitiatives(Array.isArray(initData) ? initData : []);
      setCategories(Array.isArray(catData) ? catData : []);
      const deptList = deptData.departments || deptData;
      setDepartments(Array.isArray(deptList) ? deptList : []);
      setUsers(Array.isArray(usersData) ? usersData : []);
    } catch (error) {
      toast.error('Veriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterStatus, filterCategory]);

  const handleCategorySubmit = async () => {
    if (!categoryForm.name) {
      toast.error('Kategori adı gereklidir');
      return;
    }

    try {
      const res = await fetch('/api/initiative-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryForm),
      });

      if (res.ok) {
        toast.success('Kategori oluşturuldu');
        setCategoryDialogOpen(false);
        setCategoryForm({ name: '', description: '', color: '#F59E0B' });
        fetchData();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Bir hata oluştu');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    }
  };

  const handleInitiativeSubmit = async () => {
    if (!initiativeForm.name || !initiativeForm.categoryId || !initiativeForm.startDate || !initiativeForm.endDate) {
      toast.error('İnisiyatif adı, kategori ve tarihler gereklidir');
      return;
    }

    try {
      const url = editingInitiative ? `/api/initiatives/${editingInitiative.id}` : '/api/initiatives';
      const method = editingInitiative ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...initiativeForm,
          departmentId: initiativeForm.departmentId || null,
        }),
      });

      if (res.ok) {
        toast.success(editingInitiative ? 'İnisiyatif güncellendi' : 'İnisiyatif oluşturuldu');
        setInitiativeDialogOpen(false);
        resetInitiativeForm();
        fetchData();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Bir hata oluştu');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    }
  };

  const resetInitiativeForm = () => {
    setInitiativeForm({
      name: '',
      description: '',
      categoryId: '',
      departmentId: '',
      startDate: '',
      endDate: '',
      maxScore: 100,
      assignments: [],
    });
    setEditingInitiative(null);
  };

  const editInitiative = (init: Initiative) => {
    setEditingInitiative(init);
    setInitiativeForm({
      name: init.name,
      description: init.description || '',
      categoryId: init.category.id,
      departmentId: init.department ? departments.find(d => d.name === init.department?.name)?.id || '' : '',
      startDate: init.startDate.split('T')[0],
      endDate: init.endDate.split('T')[0],
      maxScore: init.maxScore,
      assignments: init.assignments.map(a => ({ userId: a.user.id, role: a.role, weight: a.weight })),
    });
    setInitiativeDialogOpen(true);
  };

  const addAssignment = () => {
    setInitiativeForm({
      ...initiativeForm,
      assignments: [...initiativeForm.assignments, { userId: '', role: 'UYE', weight: 1.0 }],
    });
  };

  const updateAssignment = (index: number, field: string, value: any) => {
    const newAssignments = [...initiativeForm.assignments];
    newAssignments[index] = { ...newAssignments[index], [field]: value };
    setInitiativeForm({ ...initiativeForm, assignments: newAssignments });
  };

  const removeAssignment = (index: number) => {
    setInitiativeForm({
      ...initiativeForm,
      assignments: initiativeForm.assignments.filter((_, i) => i !== index),
    });
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">İnisiyatif Yönetimi</h1>
          <p className="text-muted-foreground">Proje ve görevleri yönetin, performans değerlendirmesi yapın</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="initiatives">
              <Lightbulb className="h-4 w-4 mr-2" /> İnisiyatifler
            </TabsTrigger>
            <TabsTrigger value="categories">
              <Lightbulb className="h-4 w-4 mr-2" /> Kategoriler
            </TabsTrigger>
          </TabsList>

          {activeTab === 'categories' ? (
            <Button onClick={() => setCategoryDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Yeni Kategori
            </Button>
          ) : (
            <Button onClick={() => { resetInitiativeForm(); setInitiativeDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> Yeni İnisiyatif
            </Button>
          )}
        </div>

        <TabsContent value="categories">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {categories.map((cat) => (
              <Card key={cat.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cat.color || '#F59E0B' }} />
                    <CardTitle className="text-lg">{cat.name}</CardTitle>
                  </div>
                  <CardDescription>{cat.code}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge variant="outline">{cat._count.initiatives} inisiyatif</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="initiatives" className="space-y-4">
          {/* Filtreler */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex gap-4">
                <div className="w-40">
                  <Label>Durum</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tüm Durumlar</SelectItem>
                      {Object.entries(statusLabels).map(([key, val]) => (
                        <SelectItem key={key} value={key}>{val.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-48">
                  <Label>Kategori</Label>
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tüm Kategoriler</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* İnisiyatif Listesi */}
          <div className="grid gap-4">
            {initiatives.map((init) => (
              <Card key={init.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {init.name}
                        <Badge className={statusLabels[init.status]?.color || 'bg-gray-500'}>
                          {statusLabels[init.status]?.label || init.status}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="flex items-center gap-4 mt-1">
                        <span>{init.code}</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(init.startDate), 'dd MMM yyyy', { locale: tr })} - {format(new Date(init.endDate), 'dd MMM yyyy', { locale: tr })}
                        </span>
                        <Badge variant="outline" style={{ borderColor: init.category.color }}>
                          {init.category.name}
                        </Badge>
                      </CardDescription>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => editInitiative(init)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {init.description && <p className="text-sm text-muted-foreground mb-4">{init.description}</p>}
                  
                  {init.assignments.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2 flex items-center gap-1">
                        <Users className="h-4 w-4" /> Ekip ({init.assignments.length} kişi)
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {init.assignments.map((a) => (
                          <div key={a.id} className="flex items-center gap-2 bg-muted rounded-lg px-3 py-1">
                            <span className="text-sm">{a.user.name}</span>
                            <Badge variant="secondary" className="text-xs">{roleLabels[a.role] || a.role}</Badge>
                            {a.score !== undefined && a.score !== null && (
                              <Badge variant="outline" className="text-xs">{a.score} puan</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {initiatives.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Henüz inisiyatif oluşturulmamış
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Kategori Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni İnisiyatif Kategorisi</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Kategori Adı *</Label>
              <Input
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                placeholder="Proje, Özel Görev, İyileştirme..."
              />
            </div>
            <div>
              <Label>Açıklama</Label>
              <Textarea
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
              />
            </div>
            <div>
              <Label>Renk</Label>
              <input
                type="color"
                value={categoryForm.color}
                onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                className="w-12 h-10 rounded cursor-pointer"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>İptal</Button>
            <Button onClick={handleCategorySubmit}>Oluştur</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* İnisiyatif Dialog */}
      <Dialog open={initiativeDialogOpen} onOpenChange={setInitiativeDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingInitiative ? 'İnisiyatif Düzenle' : 'Yeni İnisiyatif'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>İnisiyatif Adı *</Label>
                <Input
                  value={initiativeForm.name}
                  onChange={(e) => setInitiativeForm({ ...initiativeForm, name: e.target.value })}
                  placeholder="Dijital Dönüşüm Projesi"
                />
              </div>
              <div>
                <Label>Kategori *</Label>
                <Select
                  value={initiativeForm.categoryId || 'none'}
                  onValueChange={(v) => setInitiativeForm({ ...initiativeForm, categoryId: v === 'none' ? '' : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Kategori seçiniz" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Kategori seçiniz</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Açıklama</Label>
              <Textarea
                value={initiativeForm.description}
                onChange={(e) => setInitiativeForm({ ...initiativeForm, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Başlangıç Tarihi *</Label>
                <Input
                  type="date"
                  value={initiativeForm.startDate}
                  onChange={(e) => setInitiativeForm({ ...initiativeForm, startDate: e.target.value })}
                />
              </div>
              <div>
                <Label>Bitiş Tarihi *</Label>
                <Input
                  type="date"
                  value={initiativeForm.endDate}
                  onChange={(e) => setInitiativeForm({ ...initiativeForm, endDate: e.target.value })}
                />
              </div>
              <div>
                <Label>Maks Puan</Label>
                <Input
                  type="number"
                  value={initiativeForm.maxScore}
                  onChange={(e) => setInitiativeForm({ ...initiativeForm, maxScore: Number(e.target.value) })}
                />
              </div>
            </div>

            <div>
              <Label>Departman</Label>
              <Select
                value={initiativeForm.departmentId || 'none'}
                onValueChange={(v) => setInitiativeForm({ ...initiativeForm, departmentId: v === 'none' ? '' : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tüm departmanlar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tüm departmanlar</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Ekip Üyeleri</Label>
                <Button variant="outline" size="sm" onClick={addAssignment}>
                  <Plus className="h-4 w-4 mr-1" /> Üye Ekle
                </Button>
              </div>
              {initiativeForm.assignments.map((a, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <Select
                    value={a.userId || 'none'}
                    onValueChange={(v) => updateAssignment(index, 'userId', v === 'none' ? '' : v)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Personel seçiniz" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Personel seçiniz</SelectItem>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={a.role}
                    onValueChange={(v) => updateAssignment(index, 'role', v)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LIDER">Lider</SelectItem>
                      <SelectItem value="UYE">Üye</SelectItem>
                      <SelectItem value="DESTEKCI">Destekci</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    step="0.1"
                    value={a.weight}
                    onChange={(e) => updateAssignment(index, 'weight', Number(e.target.value))}
                    className="w-20"
                    placeholder="Ağ."
                  />
                  <Button variant="ghost" size="icon" onClick={() => removeAssignment(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInitiativeDialogOpen(false)}>İptal</Button>
            <Button onClick={handleInitiativeSubmit}>{editingInitiative ? 'Güncelle' : 'Oluştur'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
