'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  ArrowLeft,
  Edit,
  Save,
  X,
  Trash2,
  Plus,
  GraduationCap,
  BookOpen,
  Users,
  Clock,
  Award,
  Calendar,
  Target,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

const TRAINING_TYPES = [
  { value: 'ORYANTASYON', label: 'Oryantasyon Eğitimi' },
  { value: 'TEKNIK', label: 'Teknik Eğitim' },
  { value: 'KALITE', label: 'Kalite Eğitimi' },
  { value: 'GUVENLIK', label: 'İş Güvenliği' },
  { value: 'YAZILIM', label: 'Yazılım Eğitimi' },
  { value: 'YONETIM', label: 'Yönetim Becerileri' },
  { value: 'MESLEKI', label: 'Mesleki Gelişim' },
  { value: 'SERTIFIKA', label: 'Sertifika Programı' },
  { value: 'DIGER', label: 'Diğer' },
];

const TRAINING_METHODS = [
  { value: 'SINIF_ICI', label: 'Sınıf İçi Eğitim' },
  { value: 'ONLINE', label: 'Online Eğitim' },
  { value: 'WEBINAR', label: 'Webinar' },
  { value: 'SAHADA', label: 'Sahada Uygulama' },
  { value: 'BIREYSEL', label: 'Bireysel Çalışma' },
  { value: 'KARMA', label: 'Karma Eğitim' },
];

export default function TrainingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [training, setTraining] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [positions, setPositions] = useState<any[]>([]);
  const [requirementDialogOpen, setRequirementDialogOpen] = useState(false);
  const [requirementForm, setRequirementForm] = useState({
    positionId: '',
    isMandatory: true,
    priority: 1,
    dueWithinDays: null as number | null,
    notes: '',
  });

  useEffect(() => {
    fetchTraining();
    fetchPositions();
  }, [id]);

  const fetchTraining = async () => {
    try {
      const res = await fetch(`/api/trainings/${id}`);
      if (!res.ok) throw new Error('Eğitim bulunamadı');
      const data = await res.json();
      setTraining(data);
      setFormData(data);
    } catch (error) {
      toast.error('Eğitim yüklenemedi');
      router.push('/dashboard/trainings');
    } finally {
      setLoading(false);
    }
  };

  const fetchPositions = async () => {
    try {
      const res = await fetch('/api/positions');
      const data = await res.json();
      setPositions(Array.isArray(data) ? data : []);
    } catch (error) {
      setPositions([]);
    }
  };

  const handleSave = async () => {
    try {
      const res = await fetch(`/api/trainings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error('Güncelleme hatası');

      toast.success('Eğitim güncellendi');
      setEditMode(false);
      fetchTraining();
    } catch (error) {
      toast.error('Eğitim güncellenemedi');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Bu eğitimi silmek istediğinize emin misiniz?')) return;

    try {
      const res = await fetch(`/api/trainings/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Silme hatası');

      toast.success('Eğitim silindi');
      router.push('/dashboard/trainings');
    } catch (error) {
      toast.error('Eğitim silinemedi');
    }
  };

  const handleAddRequirement = async () => {
    if (!requirementForm.positionId) {
      toast.error('Pozisyon seçiniz');
      return;
    }

    try {
      const res = await fetch('/api/training-requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trainingId: id,
          ...requirementForm,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Ekleme hatası');
      }

      toast.success('Gereksinim eklendi');
      setRequirementDialogOpen(false);
      setRequirementForm({
        positionId: '',
        isMandatory: true,
        priority: 1,
        dueWithinDays: null,
        notes: '',
      });
      fetchTraining();
    } catch (error: any) {
      toast.error(error.message || 'Gereksinim eklenemedi');
    }
  };

  const handleDeleteRequirement = async (reqId: string) => {
    if (!confirm('Bu gereksinimi silmek istediğinize emin misiniz?')) return;

    try {
      const res = await fetch(`/api/training-requirements?id=${reqId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Silme hatası');

      toast.success('Gereksinim silindi');
      fetchTraining();
    } catch (error) {
      toast.error('Gereksinim silinemedi');
    }
  };

  const getTypeLabel = (type: string) => {
    return TRAINING_TYPES.find((t) => t.value === type)?.label || type;
  };

  const getMethodLabel = (method: string) => {
    return TRAINING_METHODS.find((m) => m.value === method)?.label || method;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Yükleniyor...</div>
      </div>
    );
  }

  if (!training) return null;

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/trainings')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{training.name}</h1>
              <Badge variant={training.isActive ? 'default' : 'secondary'}>
                {training.isActive ? 'Aktif' : 'Pasif'}
              </Badge>
            </div>
            <p className="text-muted-foreground font-mono">{training.code}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {editMode ? (
            <>
              <Button variant="outline" onClick={() => setEditMode(false)}>
                <X className="mr-2 h-4 w-4" />
                İptal
              </Button>
              <Button onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" />
                Kaydet
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setEditMode(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Düzenle
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                Sil
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Özet Kartları */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Eğitim Türü</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">{getTypeLabel(training.type)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Süre</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">
              {training.durationMinutes >= 60
                ? `${Math.floor(training.durationMinutes / 60)} saat ${training.durationMinutes % 60 > 0 ? `${training.durationMinutes % 60} dk` : ''}`
                : `${training.durationMinutes} dk`}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Eğitim Planları</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">{training._count?.plans || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Gereksinimler</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">{training._count?.requirements || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Sekmeler */}
      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">Detaylar</TabsTrigger>
          <TabsTrigger value="plans">Eğitim Planları</TabsTrigger>
          <TabsTrigger value="requirements">Gereksinimler</TabsTrigger>
        </TabsList>

        {/* Detaylar */}
        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Eğitim Bilgileri</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {editMode ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label>Eğitim Adı</Label>
                    <Input
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Tür</Label>
                    <Select
                      value={formData.type || ''}
                      onValueChange={(v) => setFormData({ ...formData, type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TRAINING_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Yöntem</Label>
                    <Select
                      value={formData.method || ''}
                      onValueChange={(v) => setFormData({ ...formData, method: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TRAINING_METHODS.map((method) => (
                          <SelectItem key={method.value} value={method.value}>
                            {method.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Süre (dakika)</Label>
                    <Input
                      type="number"
                      value={formData.durationMinutes || 60}
                      onChange={(e) =>
                        setFormData({ ...formData, durationMinutes: parseInt(e.target.value) || 60 })
                      }
                    />
                  </div>
                  <div>
                    <Label>Durum</Label>
                    <Select
                      value={formData.isActive ? 'true' : 'false'}
                      onValueChange={(v) => setFormData({ ...formData, isActive: v === 'true' })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Aktif</SelectItem>
                        <SelectItem value="false">Pasif</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Açıklama</Label>
                    <Textarea
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Eğitim Hedefleri</Label>
                    <Textarea
                      value={formData.objectives || ''}
                      onChange={(e) => setFormData({ ...formData, objectives: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Eğitim İçeriği</Label>
                    <Textarea
                      value={formData.content || ''}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-4">
                    <h4 className="font-medium">Özellikler</h4>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="hasCertificate"
                          checked={formData.hasCertificate}
                          onCheckedChange={(checked) =>
                            setFormData({ ...formData, hasCertificate: checked as boolean })
                          }
                        />
                        <Label htmlFor="hasCertificate">Sertifika Verilecek</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="hasExam"
                          checked={formData.hasExam}
                          onCheckedChange={(checked) =>
                            setFormData({ ...formData, hasExam: checked as boolean })
                          }
                        />
                        <Label htmlFor="hasExam">Sınav Yapılacak</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="isRecurring"
                          checked={formData.isRecurring}
                          onCheckedChange={(checked) =>
                            setFormData({ ...formData, isRecurring: checked as boolean })
                          }
                        />
                        <Label htmlFor="isRecurring">Periyodik Tekrar</Label>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <Label className="text-muted-foreground">Açıklama</Label>
                    <p className="mt-1">{training.description || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Yöntem</Label>
                    <p className="mt-1">{getMethodLabel(training.method)}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-muted-foreground">Eğitim Hedefleri</Label>
                    <p className="mt-1 whitespace-pre-wrap">{training.objectives || '-'}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-muted-foreground">Eğitim İçeriği</Label>
                    <p className="mt-1 whitespace-pre-wrap">{training.content || '-'}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-muted-foreground">Özellikler</Label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {training.hasCertificate && (
                        <Badge variant="secondary">
                          <Award className="mr-1 h-3 w-3" />
                          Sertifika
                          {training.certificateValidityMonths &&
                            ` (${training.certificateValidityMonths} ay geçerli)`}
                        </Badge>
                      )}
                      {training.hasExam && (
                        <Badge variant="secondary">
                          Sınav
                          {training.passingScore && ` (Geçme: ${training.passingScore})`}
                        </Badge>
                      )}
                      {training.isRecurring && (
                        <Badge variant="secondary">
                          <Clock className="mr-1 h-3 w-3" />
                          Periyodik
                          {training.recurringMonths && ` (${training.recurringMonths} ayda bir)`}
                        </Badge>
                      )}
                      {!training.hasCertificate && !training.hasExam && !training.isRecurring && (
                        <span className="text-muted-foreground">Ek özellik yok</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Eğitim Planları */}
        <TabsContent value="plans">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Eğitim Planları</CardTitle>
                <CardDescription>Bu eğitim için oluşturulan planlar</CardDescription>
              </div>
              <Button onClick={() => router.push('/dashboard/trainings/plans')}>
                <Plus className="mr-2 h-4 w-4" />
                Yeni Plan
              </Button>
            </CardHeader>
            <CardContent>
              {training.plans?.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kod</TableHead>
                      <TableHead>Başlık</TableHead>
                      <TableHead>Tarih</TableHead>
                      <TableHead>Eğitmen</TableHead>
                      <TableHead>Katılımcı</TableHead>
                      <TableHead>Durum</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {training.plans.map((plan: any) => (
                      <TableRow
                        key={plan.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => router.push(`/dashboard/trainings/plans/${plan.id}`)}
                      >
                        <TableCell className="font-mono text-sm">{plan.code}</TableCell>
                        <TableCell>{plan.title}</TableCell>
                        <TableCell>
                          {format(new Date(plan.plannedDate), 'dd MMM yyyy', { locale: tr })}
                        </TableCell>
                        <TableCell>
                          {plan.instructor
                            ? `${plan.instructor.name} ${plan.instructor.surname || ''}`
                            : plan.externalInstructor || '-'}
                        </TableCell>
                        <TableCell>{plan._count?.records || 0}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              plan.status === 'TAMAMLANDI'
                                ? 'default'
                                : plan.status === 'DEVAM_EDIYOR'
                                ? 'secondary'
                                : plan.status === 'IPTAL'
                                ? 'destructive'
                                : 'outline'
                            }
                          >
                            {plan.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Henüz eğitim planı oluşturulmamış
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gereksinimler */}
        <TabsContent value="requirements">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Eğitim Gereksinimleri</CardTitle>
                <CardDescription>Pozisyonlara göre eğitim gereksinimleri</CardDescription>
              </div>
              <Button onClick={() => setRequirementDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Gereksinim Ekle
              </Button>
            </CardHeader>
            <CardContent>
              {training.requirements?.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pozisyon</TableHead>
                      <TableHead>Zorunluluk</TableHead>
                      <TableHead>Öncelik</TableHead>
                      <TableHead>Süre</TableHead>
                      <TableHead>Not</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {training.requirements.map((req: any) => (
                      <TableRow key={req.id}>
                        <TableCell>
                          <div className="font-medium">{req.position?.name}</div>
                          <div className="text-sm text-muted-foreground">{req.position?.code}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={req.isMandatory ? 'destructive' : 'secondary'}>
                            {req.isMandatory ? 'Zorunlu' : 'Opsiyonel'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              req.priority === 1
                                ? 'destructive'
                                : req.priority === 2
                                ? 'secondary'
                                : 'outline'
                            }
                          >
                            {req.priority === 1 ? 'Yüksek' : req.priority === 2 ? 'Orta' : 'Düşük'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {req.dueWithinDays ? `${req.dueWithinDays} gün içinde` : '-'}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{req.notes || '-'}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteRequirement(req.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Henüz gereksinim tanımlanmamış
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Gereksinim Ekleme Dialog */}
      <Dialog open={requirementDialogOpen} onOpenChange={setRequirementDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eğitim Gereksinimi Ekle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Pozisyon *</Label>
              <Select
                value={requirementForm.positionId}
                onValueChange={(v) => setRequirementForm({ ...requirementForm, positionId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pozisyon seçin" />
                </SelectTrigger>
                <SelectContent>
                  {positions
                    .filter(
                      (p) => !training.requirements?.some((r: any) => r.positionId === p.id)
                    )
                    .map((position) => (
                      <SelectItem key={position.id} value={position.id}>
                        {position.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="reqMandatory"
                checked={requirementForm.isMandatory}
                onCheckedChange={(checked) =>
                  setRequirementForm({ ...requirementForm, isMandatory: checked as boolean })
                }
              />
              <Label htmlFor="reqMandatory">Zorunlu Eğitim</Label>
            </div>
            <div>
              <Label>Öncelik</Label>
              <Select
                value={String(requirementForm.priority)}
                onValueChange={(v) =>
                  setRequirementForm({ ...requirementForm, priority: parseInt(v) })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Yüksek</SelectItem>
                  <SelectItem value="2">Orta</SelectItem>
                  <SelectItem value="3">Düşük</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>İşe Başladıktan Sonra (gün)</Label>
              <Input
                type="number"
                value={requirementForm.dueWithinDays || ''}
                onChange={(e) =>
                  setRequirementForm({
                    ...requirementForm,
                    dueWithinDays: e.target.value ? parseInt(e.target.value) : null,
                  })
                }
                placeholder="Ör: 30"
              />
            </div>
            <div>
              <Label>Not</Label>
              <Textarea
                value={requirementForm.notes}
                onChange={(e) => setRequirementForm({ ...requirementForm, notes: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequirementDialogOpen(false)}>
              İptal
            </Button>
            <Button onClick={handleAddRequirement}>Ekle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
