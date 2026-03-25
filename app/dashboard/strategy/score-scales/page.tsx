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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Plus, Edit, Trash2, Star, Gauge, Palette } from 'lucide-react';
import { toast } from 'sonner';

interface ScoreLevel {
  id?: string;
  name: string;
  score: number;
  minPerformance: number;
  maxPerformance: number;
  color: string;
  description?: string;
}

interface ScoreScale {
  id: string;
  code: string;
  name: string;
  description?: string;
  minScore: number;
  maxScore: number;
  isDefault: boolean;
  isActive: boolean;
  levels: ScoreLevel[];
  createdBy: { name: string };
  createdAt: string;
}

const defaultLevels: ScoreLevel[] = [
  { name: 'Çok İyi', score: 100, minPerformance: 90, maxPerformance: 100, color: '#22C55E' },
  { name: 'İyi', score: 80, minPerformance: 70, maxPerformance: 89.99, color: '#84CC16' },
  { name: 'Orta', score: 70, minPerformance: 50, maxPerformance: 69.99, color: '#EAB308' },
  { name: 'Kötü', score: 50, minPerformance: 30, maxPerformance: 49.99, color: '#F97316' },
  { name: 'Çok Kötü', score: 40, minPerformance: 0, maxPerformance: 29.99, color: '#EF4444' },
];

export default function ScoreScalesPage() {
  const { data: session } = useSession();
  const [scales, setScales] = useState<ScoreScale[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingScale, setEditingScale] = useState<ScoreScale | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    minScore: 0,
    maxScore: 100,
    isDefault: false,
    levels: defaultLevels,
  });

  const fetchScales = async () => {
    try {
      const res = await fetch('/api/score-scales');
      const data = await res.json();
      setScales(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('Skalalar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScales();
  }, []);

  const handleSubmit = async () => {
    if (!formData.name) {
      toast.error('Skala adı gereklidir');
      return;
    }

    try {
      const url = editingScale ? `/api/score-scales/${editingScale.id}` : '/api/score-scales';
      const method = editingScale ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success(editingScale ? 'Skala güncellendi' : 'Skala oluşturuldu');
        setDialogOpen(false);
        resetForm();
        fetchScales();
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
      minScore: 0,
      maxScore: 100,
      isDefault: false,
      levels: defaultLevels,
    });
    setEditingScale(null);
  };

  const handleEdit = (scale: ScoreScale) => {
    setEditingScale(scale);
    setFormData({
      name: scale.name,
      description: scale.description || '',
      minScore: scale.minScore,
      maxScore: scale.maxScore,
      isDefault: scale.isDefault,
      levels: scale.levels.length > 0 ? scale.levels : defaultLevels,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu skalayı deaktif etmek istediğinizden emin misiniz?')) return;

    try {
      const res = await fetch(`/api/score-scales/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Skala deaktif edildi');
        fetchScales();
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    }
  };

  const updateLevel = (index: number, field: keyof ScoreLevel, value: any) => {
    const newLevels = [...formData.levels];
    newLevels[index] = { ...newLevels[index], [field]: value };
    setFormData({ ...formData, levels: newLevels });
  };

  const addLevel = () => {
    setFormData({
      ...formData,
      levels: [...formData.levels, { name: '', score: 0, minPerformance: 0, maxPerformance: 0, color: '#3B82F6' }],
    });
  };

  const removeLevel = (index: number) => {
    const newLevels = formData.levels.filter((_, i) => i !== index);
    setFormData({ ...formData, levels: newLevels });
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Puan Skalaları</h1>
          <p className="text-muted-foreground">Performans değerlendirme skalalarını yönetin</p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Yeni Skala
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {scales.map((scale) => (
          <Card key={scale.id} className={!scale.isActive ? 'opacity-50' : ''}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Gauge className="h-5 w-5" />
                    {scale.name}
                    {scale.isDefault && (
                      <Badge variant="secondary">
                        <Star className="h-3 w-3 mr-1" /> Varsayılan
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>{scale.code}</CardDescription>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(scale)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(scale.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">{scale.description}</p>
              <div className="space-y-1">
                {scale.levels.map((level, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: level.color }}
                    />
                    <span className="flex-1">{level.name}</span>
                    <span className="font-medium">{level.score} puan</span>
                    <span className="text-muted-foreground text-xs">
                      ({level.minPerformance}-{level.maxPerformance}%)
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingScale ? 'Skala Düzenle' : 'Yeni Puan Skalası'}</DialogTitle>
            <DialogDescription>
              Performans değerlendirme skalası oluşturun
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Skala Adı *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="5'li Performans Skalası"
                />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label>Min Puan</Label>
                  <Input
                    type="number"
                    value={formData.minScore}
                    onChange={(e) => setFormData({ ...formData, minScore: Number(e.target.value) })}
                  />
                </div>
                <div className="flex-1">
                  <Label>Max Puan</Label>
                  <Input
                    type="number"
                    value={formData.maxScore}
                    onChange={(e) => setFormData({ ...formData, maxScore: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>

            <div>
              <Label>Açıklama</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Skala açıklaması..."
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.isDefault}
                onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked })}
              />
              <Label>Varsayılan Skala</Label>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Puan Seviyeleri</Label>
                <Button variant="outline" size="sm" onClick={addLevel}>
                  <Plus className="h-4 w-4 mr-1" /> Seviye Ekle
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Seviye Adı</TableHead>
                    <TableHead>Puan</TableHead>
                    <TableHead>Min %</TableHead>
                    <TableHead>Max %</TableHead>
                    <TableHead>Renk</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {formData.levels.map((level, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Input
                          value={level.name}
                          onChange={(e) => updateLevel(index, 'name', e.target.value)}
                          placeholder="Seviye adı"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={level.score}
                          onChange={(e) => updateLevel(index, 'score', Number(e.target.value))}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={level.minPerformance}
                          onChange={(e) => updateLevel(index, 'minPerformance', Number(e.target.value))}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={level.maxPerformance}
                          onChange={(e) => updateLevel(index, 'maxPerformance', Number(e.target.value))}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <input
                          type="color"
                          value={level.color}
                          onChange={(e) => updateLevel(index, 'color', e.target.value)}
                          className="w-10 h-8 rounded cursor-pointer"
                        />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => removeLevel(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>İptal</Button>
            <Button onClick={handleSubmit}>{editingScale ? 'Güncelle' : 'Oluştur'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
