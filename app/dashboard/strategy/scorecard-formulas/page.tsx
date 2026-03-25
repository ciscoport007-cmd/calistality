'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Slider } from '@/components/ui/slider';
import { Plus, Edit, Trash2, Star, Calculator, PieChart } from 'lucide-react';
import { toast } from 'sonner';

interface Formula {
  id: string;
  code: string;
  name: string;
  description?: string;
  kpiWeight: number;
  competencyWeight: number;
  initiativeWeight: number;
  corporateWeight: number;
  departmentWeight: number;
  scale?: { name: string; levels: any[] };
  department?: { name: string };
  position?: { name: string };
  isDefault: boolean;
  isActive: boolean;
  createdBy: { name: string };
  _count: { scorecards: number };
}

export default function ScorecardFormulasPage() {
  const { data: session } = useSession();
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [scales, setScales] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFormula, setEditingFormula] = useState<Formula | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    kpiWeight: 50,
    competencyWeight: 30,
    initiativeWeight: 20,
    corporateWeight: 20,
    departmentWeight: 80,
    scaleId: '',
    departmentId: '',
    positionId: '',
    year: new Date().getFullYear(),
    isDefault: false,
  });

  const fetchData = async () => {
    try {
      const [formulasRes, scalesRes, deptsRes, posRes] = await Promise.all([
        fetch('/api/scorecard-formulas'),
        fetch('/api/score-scales?isActive=true'),
        fetch('/api/departments'),
        fetch('/api/positions'),
      ]);

      const formulasData = await formulasRes.json();
      const scalesData = await scalesRes.json();
      const deptsData = await deptsRes.json();
      const posData = await posRes.json();

      setFormulas(Array.isArray(formulasData) ? formulasData : []);
      setScales(Array.isArray(scalesData) ? scalesData : []);
      const deptList = deptsData.departments || deptsData;
      setDepartments(Array.isArray(deptList) ? deptList : []);
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

  const handleSubmit = async () => {
    if (!formData.name) {
      toast.error('Formül adı gereklidir');
      return;
    }

    const dimensionTotal = formData.kpiWeight + formData.competencyWeight + formData.initiativeWeight;
    if (dimensionTotal !== 100) {
      toast.error('Boyut ağırlıkları toplamı 100 olmalıdır');
      return;
    }

    const karneTotal = formData.corporateWeight + formData.departmentWeight;
    if (karneTotal !== 100) {
      toast.error('Karne ağırlıkları toplamı 100 olmalıdır');
      return;
    }

    try {
      const url = editingFormula ? `/api/scorecard-formulas/${editingFormula.id}` : '/api/scorecard-formulas';
      const method = editingFormula ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          scaleId: formData.scaleId || null,
          departmentId: formData.departmentId || null,
          positionId: formData.positionId || null,
        }),
      });

      if (res.ok) {
        toast.success(editingFormula ? 'Formül güncellendi' : 'Formül oluşturuldu');
        setDialogOpen(false);
        resetForm();
        fetchData();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Bir hata oluştu');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      kpiWeight: 50,
      competencyWeight: 30,
      initiativeWeight: 20,
      corporateWeight: 20,
      departmentWeight: 80,
      scaleId: '',
      departmentId: '',
      positionId: '',
      year: new Date().getFullYear(),
      isDefault: false,
    });
    setEditingFormula(null);
  };

  const handleEdit = (formula: Formula) => {
    setEditingFormula(formula);
    setFormData({
      name: formula.name,
      description: formula.description || '',
      kpiWeight: formula.kpiWeight,
      competencyWeight: formula.competencyWeight,
      initiativeWeight: formula.initiativeWeight,
      corporateWeight: formula.corporateWeight,
      departmentWeight: formula.departmentWeight,
      scaleId: formula.scale?.name ? scales.find(s => s.name === formula.scale?.name)?.id || '' : '',
      departmentId: formula.department ? departments.find(d => d.name === formula.department?.name)?.id || '' : '',
      positionId: formula.position ? positions.find(p => p.name === formula.position?.name)?.id || '' : '',
      year: new Date().getFullYear(),
      isDefault: formula.isDefault,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu formülü deaktif etmek istediğinizden emin misiniz?')) return;

    try {
      const res = await fetch(`/api/scorecard-formulas/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Formül deaktif edildi');
        fetchData();
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Karne Formülleri</h1>
          <p className="text-muted-foreground">3 boyutlu performans hesaplama formüllerini yönetin</p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Yeni Formül
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {formulas.map((formula) => (
          <Card key={formula.id} className={!formula.isActive ? 'opacity-50' : ''}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    {formula.name}
                    {formula.isDefault && (
                      <Badge variant="secondary">
                        <Star className="h-3 w-3 mr-1" /> Varsayılan
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>{formula.code}</CardDescription>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(formula)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(formula.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">{formula.description}</p>
              
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">3 Boyutlu Ağırlıklar</p>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="flex-1 justify-center">
                      KPI %{formula.kpiWeight}
                    </Badge>
                    <Badge variant="outline" className="flex-1 justify-center">
                      Yetkinlik %{formula.competencyWeight}
                    </Badge>
                    <Badge variant="outline" className="flex-1 justify-center">
                      İnisiyatif %{formula.initiativeWeight}
                    </Badge>
                  </div>
                </div>
                
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Karne Ağırlıkları</p>
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="flex-1 justify-center">
                      Kurum %{formula.corporateWeight}
                    </Badge>
                    <Badge variant="secondary" className="flex-1 justify-center">
                      Departman %{formula.departmentWeight}
                    </Badge>
                  </div>
                </div>

                <div className="flex gap-4 text-sm text-muted-foreground">
                  {formula.scale && <span>Skala: {formula.scale.name}</span>}
                  {formula.department && <span>Dept: {formula.department.name}</span>}
                  {formula.position && <span>Pozisyon: {formula.position.name}</span>}
                </div>

                <div className="text-xs text-muted-foreground">
                  {formula._count.scorecards} karnede kullanılıyor
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingFormula ? 'Formül Düzenle' : 'Yeni Karne Formülü'}</DialogTitle>
            <DialogDescription>
              3 boyutlu performans hesaplama formülü tanımlayın
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Formül Adı *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Standart Performans Formülü"
                />
              </div>
              <div>
                <Label>Puan Skalası</Label>
                <Select
                  value={formData.scaleId || 'none'}
                  onValueChange={(v) => setFormData({ ...formData, scaleId: v === 'none' ? '' : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seçiniz" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Seçiniz</SelectItem>
                    {scales.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Açıklama</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Formül açıklaması..."
              />
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <PieChart className="h-4 w-4" /> 3 Boyutlu Ağırlıklar (Toplam: 100%)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <Label>KPI Ağırlığı</Label>
                    <span className="font-medium">%{formData.kpiWeight}</span>
                  </div>
                  <Slider
                    value={[formData.kpiWeight]}
                    onValueChange={([v]) => setFormData({ ...formData, kpiWeight: v })}
                    max={100}
                    step={5}
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <Label>Yetkinlik Ağırlığı</Label>
                    <span className="font-medium">%{formData.competencyWeight}</span>
                  </div>
                  <Slider
                    value={[formData.competencyWeight]}
                    onValueChange={([v]) => setFormData({ ...formData, competencyWeight: v })}
                    max={100}
                    step={5}
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <Label>İnisiyatif Ağırlığı</Label>
                    <span className="font-medium">%{formData.initiativeWeight}</span>
                  </div>
                  <Slider
                    value={[formData.initiativeWeight]}
                    onValueChange={([v]) => setFormData({ ...formData, initiativeWeight: v })}
                    max={100}
                    step={5}
                  />
                </div>
                <div className="text-center text-sm">
                  Toplam: %{formData.kpiWeight + formData.competencyWeight + formData.initiativeWeight}
                  {formData.kpiWeight + formData.competencyWeight + formData.initiativeWeight !== 100 && (
                    <span className="text-red-500 ml-2">(100 olmalı!)</span>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Karne Ağırlıkları (Toplam: 100%)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <Label>Kurum Karnesi Ağırlığı</Label>
                    <span className="font-medium">%{formData.corporateWeight}</span>
                  </div>
                  <Slider
                    value={[formData.corporateWeight]}
                    onValueChange={([v]) => setFormData({ ...formData, corporateWeight: v, departmentWeight: 100 - v })}
                    max={100}
                    step={5}
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <Label>Departman Karnesi Ağırlığı</Label>
                    <span className="font-medium">%{formData.departmentWeight}</span>
                  </div>
                  <Slider
                    value={[formData.departmentWeight]}
                    onValueChange={([v]) => setFormData({ ...formData, departmentWeight: v, corporateWeight: 100 - v })}
                    max={100}
                    step={5}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Departman (opsiyonel)</Label>
                <Select
                  value={formData.departmentId || 'none'}
                  onValueChange={(v) => setFormData({ ...formData, departmentId: v === 'none' ? '' : v })}
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
                <Label>Pozisyon (opsiyonel)</Label>
                <Select
                  value={formData.positionId || 'none'}
                  onValueChange={(v) => setFormData({ ...formData, positionId: v === 'none' ? '' : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tüm pozisyonlar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tüm pozisyonlar</SelectItem>
                    {positions.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.isDefault}
                onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked })}
              />
              <Label>Varsayılan Formül</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>İptal</Button>
            <Button onClick={handleSubmit}>{editingFormula ? 'Güncelle' : 'Oluştur'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
