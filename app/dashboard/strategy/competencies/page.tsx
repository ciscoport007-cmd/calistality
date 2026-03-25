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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Plus, Edit, Trash2, Award, Tag, Layers } from 'lucide-react';
import { toast } from 'sonner';

interface Category {
  id: string;
  code: string;
  name: string;
  description?: string;
  color?: string;
  _count: { competencies: number };
  competencies: Competency[];
}

interface Competency {
  id: string;
  code: string;
  name: string;
  description?: string;
  maxLevel: number;
  levelDefinitions?: any[];
  category: { name: string; color?: string };
  positionRequirements: any[];
  isActive: boolean;
  _count?: { evaluations: number };
}

export default function CompetenciesPage() {
  const { data: session } = useSession();
  const [categories, setCategories] = useState<Category[]>([]);
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('competencies');
  
  // Dialogs
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [competencyDialogOpen, setCompetencyDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingCompetency, setEditingCompetency] = useState<Competency | null>(null);

  const [categoryForm, setCategoryForm] = useState({ name: '', description: '', color: '#3B82F6' });
  const [competencyForm, setCompetencyForm] = useState({
    name: '',
    description: '',
    categoryId: '',
    maxLevel: 5,
    levelDefinitions: [
      { level: 1, name: 'Başlangıç', description: 'Temel düzeyde bilgi' },
      { level: 2, name: 'Gelişmekte', description: 'Rehberlik altında uygulama' },
      { level: 3, name: 'Yetkin', description: 'Bağımsız uygulama' },
      { level: 4, name: 'İleri', description: 'Başkalarına rehberlik' },
      { level: 5, name: 'Uzman', description: 'Stratejik liderlik' },
    ],
  });

  const fetchData = async () => {
    try {
      const [catRes, compRes, posRes] = await Promise.all([
        fetch('/api/competency-categories'),
        fetch('/api/competencies'),
        fetch('/api/positions'),
      ]);

      const catData = await catRes.json();
      const compData = await compRes.json();
      const posData = await posRes.json();

      setCategories(Array.isArray(catData) ? catData : []);
      setCompetencies(Array.isArray(compData) ? compData : []);
      setPositions(Array.isArray(posData) ? posData : []);
    } catch (error) {
      toast.error('Veriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCategorySubmit = async () => {
    if (!categoryForm.name) {
      toast.error('Kategori adı gereklidir');
      return;
    }

    try {
      const url = editingCategory ? `/api/competency-categories/${editingCategory.id}` : '/api/competency-categories';
      const method = editingCategory ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryForm),
      });

      if (res.ok) {
        toast.success(editingCategory ? 'Kategori güncellendi' : 'Kategori oluşturuldu');
        setCategoryDialogOpen(false);
        resetCategoryForm();
        fetchData();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Bir hata oluştu');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    }
  };

  const handleCompetencySubmit = async () => {
    if (!competencyForm.name || !competencyForm.categoryId) {
      toast.error('Yetkinlik adı ve kategori gereklidir');
      return;
    }

    try {
      const url = editingCompetency ? `/api/competencies/${editingCompetency.id}` : '/api/competencies';
      const method = editingCompetency ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(competencyForm),
      });

      if (res.ok) {
        toast.success(editingCompetency ? 'Yetkinlik güncellendi' : 'Yetkinlik oluşturuldu');
        setCompetencyDialogOpen(false);
        resetCompetencyForm();
        fetchData();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Bir hata oluştu');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    }
  };

  const resetCategoryForm = () => {
    setCategoryForm({ name: '', description: '', color: '#3B82F6' });
    setEditingCategory(null);
  };

  const resetCompetencyForm = () => {
    setCompetencyForm({
      name: '',
      description: '',
      categoryId: '',
      maxLevel: 5,
      levelDefinitions: [
        { level: 1, name: 'Başlangıç', description: 'Temel düzeyde bilgi' },
        { level: 2, name: 'Gelişmekte', description: 'Rehberlik altında uygulama' },
        { level: 3, name: 'Yetkin', description: 'Bağımsız uygulama' },
        { level: 4, name: 'İleri', description: 'Başkalarına rehberlik' },
        { level: 5, name: 'Uzman', description: 'Stratejik liderlik' },
      ],
    });
    setEditingCompetency(null);
  };

  const editCategory = (cat: Category) => {
    setEditingCategory(cat);
    setCategoryForm({ name: cat.name, description: cat.description || '', color: cat.color || '#3B82F6' });
    setCategoryDialogOpen(true);
  };

  const editCompetency = (comp: Competency) => {
    setEditingCompetency(comp);
    setCompetencyForm({
      name: comp.name,
      description: comp.description || '',
      categoryId: categories.find(c => c.name === comp.category.name)?.id || '',
      maxLevel: comp.maxLevel,
      levelDefinitions: (comp.levelDefinitions as any[]) || [],
    });
    setCompetencyDialogOpen(true);
  };

  const handleDelete = async (type: 'category' | 'competency', id: string) => {
    if (!confirm('Bu kaydı deaktif etmek istediğinizden emin misiniz?')) return;

    const url = type === 'category' ? `/api/competency-categories/${id}` : `/api/competencies/${id}`;
    try {
      const res = await fetch(url, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Kayıt deaktif edildi');
        fetchData();
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    }
  };

  const updateLevelDefinition = (index: number, field: string, value: string) => {
    const newLevels = [...competencyForm.levelDefinitions];
    newLevels[index] = { ...newLevels[index], [field]: value };
    setCompetencyForm({ ...competencyForm, levelDefinitions: newLevels });
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Yetkinlik Yönetimi</h1>
          <p className="text-muted-foreground">Kurumsal yetkinlikleri ve kategorilerini yönetin</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="competencies">
              <Award className="h-4 w-4 mr-2" /> Yetkinlikler
            </TabsTrigger>
            <TabsTrigger value="categories">
              <Tag className="h-4 w-4 mr-2" /> Kategoriler
            </TabsTrigger>
          </TabsList>

          {activeTab === 'categories' ? (
            <Button onClick={() => { resetCategoryForm(); setCategoryDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> Yeni Kategori
            </Button>
          ) : (
            <Button onClick={() => { resetCompetencyForm(); setCompetencyDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> Yeni Yetkinlik
            </Button>
          )}
        </div>

        <TabsContent value="categories">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((cat) => (
              <Card key={cat.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: cat.color || '#3B82F6' }}
                      />
                      <CardTitle className="text-lg">{cat.name}</CardTitle>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => editCategory(cat)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete('category', cat.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription>{cat.code}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-2">{cat.description}</p>
                  <Badge variant="outline">{cat._count.competencies} yetkinlik</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="competencies">
          <Accordion type="multiple" className="space-y-2">
            {categories.map((cat) => (
              <AccordionItem key={cat.id} value={cat.id}>
                <AccordionTrigger>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: cat.color || '#3B82F6' }}
                    />
                    <span className="font-medium">{cat.name}</span>
                    <Badge variant="secondary">{cat._count.competencies}</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kod</TableHead>
                        <TableHead>Yetkinlik Adı</TableHead>
                        <TableHead>Seviye Sayısı</TableHead>
                        <TableHead>Değerlendirme</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {competencies
                        .filter((c) => c.category.name === cat.name)
                        .map((comp) => (
                          <TableRow key={comp.id} className={!comp.isActive ? 'opacity-50' : ''}>
                            <TableCell>{comp.code}</TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{comp.name}</div>
                                <div className="text-sm text-muted-foreground">{comp.description}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{comp.maxLevel} seviye</Badge>
                            </TableCell>
                            <TableCell>{comp._count?.evaluations || 0} değerlendirme</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" onClick={() => editCompetency(comp)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete('competency', comp.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </TabsContent>
      </Tabs>

      {/* Kategori Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Kategori Düzenle' : 'Yeni Kategori'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Kategori Adı *</Label>
              <Input
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                placeholder="Teknik Yetkinlikler"
              />
            </div>
            <div>
              <Label>Açıklama</Label>
              <Textarea
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                placeholder="Kategori açıklaması..."
              />
            </div>
            <div>
              <Label>Renk</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={categoryForm.color}
                  onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                  className="w-12 h-10 rounded cursor-pointer"
                />
                <Input value={categoryForm.color} readOnly className="flex-1" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>İptal</Button>
            <Button onClick={handleCategorySubmit}>{editingCategory ? 'Güncelle' : 'Oluştur'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Yetkinlik Dialog */}
      <Dialog open={competencyDialogOpen} onOpenChange={setCompetencyDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCompetency ? 'Yetkinlik Düzenle' : 'Yeni Yetkinlik'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Yetkinlik Adı *</Label>
                <Input
                  value={competencyForm.name}
                  onChange={(e) => setCompetencyForm({ ...competencyForm, name: e.target.value })}
                  placeholder="Problem Çözme"
                />
              </div>
              <div>
                <Label>Kategori *</Label>
                <Select
                  value={competencyForm.categoryId || 'none'}
                  onValueChange={(v) => setCompetencyForm({ ...competencyForm, categoryId: v === 'none' ? '' : v })}
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
                value={competencyForm.description}
                onChange={(e) => setCompetencyForm({ ...competencyForm, description: e.target.value })}
                placeholder="Yetkinlik açıklaması..."
              />
            </div>

            <div>
              <Label>Seviye Tanımları</Label>
              <div className="space-y-2 mt-2">
                {competencyForm.levelDefinitions.map((level, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Badge variant="outline" className="w-8">{level.level}</Badge>
                    <Input
                      value={level.name}
                      onChange={(e) => updateLevelDefinition(index, 'name', e.target.value)}
                      placeholder="Seviye adı"
                      className="w-32"
                    />
                    <Input
                      value={level.description}
                      onChange={(e) => updateLevelDefinition(index, 'description', e.target.value)}
                      placeholder="Açıklama"
                      className="flex-1"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompetencyDialogOpen(false)}>İptal</Button>
            <Button onClick={handleCompetencySubmit}>{editingCompetency ? 'Güncelle' : 'Oluştur'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
