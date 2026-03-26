'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertTriangle,
  Plus,
  Search,
  Filter,
  Shield,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  FileSpreadsheet,
  Grid3X3,
  Settings,
  Tag,
} from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { formatDate, exportRiskHeatmap, exportRisksToExcel } from '@/lib/export-utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const riskTypes = [
  { value: 'STRATEJIK', label: 'Stratejik' },
  { value: 'OPERASYONEL', label: 'Operasyonel' },
  { value: 'FINANSAL', label: 'Finansal' },
  { value: 'UYUM', label: 'Uyum' },
  { value: 'BILGI_GUVENLIGI', label: 'Bilgi Güvenliği' },
  { value: 'IS_SAGLIGI', label: 'İş Sağlığı ve Güvenliği' },
  { value: 'CEVRE', label: 'Çevre' },
];

const riskSources = [
  { value: 'IC', label: 'İç Kaynak' },
  { value: 'DIS', label: 'Dış Kaynak' },
  { value: 'SUREC', label: 'Süreç' },
  { value: 'PROJE', label: 'Proje' },
  { value: 'TEDARIKCI', label: 'Tedarikçi' },
  { value: 'YASAL', label: 'Yasal' },
];

const riskStatuses = [
  { value: 'TANIMLANDI', label: 'Tanımlandı', color: 'bg-gray-500' },
  { value: 'ANALIZ_EDILIYOR', label: 'Analiz Ediliyor', color: 'bg-blue-500' },
  { value: 'DEGERLENDIRME_BEKLENIYOR', label: 'Değerlendirme Bekleniyor', color: 'bg-yellow-500' },
  { value: 'AKSIYONDA', label: 'Aksiyonda', color: 'bg-orange-500' },
  { value: 'IZLENIYOR', label: 'İzleniyor', color: 'bg-purple-500' },
  { value: 'KABUL_EDILDI', label: 'Kabul Edildi', color: 'bg-cyan-500' },
  { value: 'KAPATILDI', label: 'Kapatıldı', color: 'bg-green-500' },
];

const riskLevels = [
  { value: 'DUSUK', label: 'Düşük', color: 'bg-green-500', range: '1-4' },
  { value: 'ORTA', label: 'Orta', color: 'bg-yellow-500', range: '5-9' },
  { value: 'YUKSEK', label: 'Yüksek', color: 'bg-orange-500', range: '10-14' },
  { value: 'COK_YUKSEK', label: 'Çok Yüksek', color: 'bg-red-500', range: '15-19' },
  { value: 'KRITIK', label: 'Kritik', color: 'bg-red-700', range: '20-25' },
];

const responseStrategies = [
  { value: 'KABUL', label: 'Kabul Et' },
  { value: 'AZALT', label: 'Azalt' },
  { value: 'TRANSFER', label: 'Transfer Et' },
  { value: 'KACINMA', label: 'Kaçın' },
];

interface Risk {
  id: string;
  code: string;
  title: string;
  description: string | null;
  type: string;
  source: string | null;
  status: string;
  currentLevel: string | null;
  inherentRiskScore: number | null;
  residualRiskScore: number | null;
  responseStrategy: string | null;
  reviewDate: string | null;
  category: { id: string; name: string; color: string | null } | null;
  department: { id: string; name: string } | null;
  owner: { id: string; name: string; surname: string | null } | null;
  createdBy: { id: string; name: string; surname: string | null };
  _count: { assessments: number; actions: number };
  createdAt: string;
}

export default function RisksPage() {
  const router = useRouter();
  const [risks, setRisks] = useState<Risk[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });
  const [stats, setStats] = useState({
    total: 0,
    kritik: 0,
    cokYuksek: 0,
    yuksek: 0,
    aksiyonda: 0,
  });

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: '',
    source: '',
    categoryId: '',
    departmentId: '',
    ownerId: '',
    existingControls: '',
    responseStrategy: '',
    inherentProbability: '',
    inherentImpact: '',
    reviewDate: '',
    notes: '',
  });

  // Kategori yönetimi state
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    code: '',
    description: '',
    color: '#3b82f6',
  });
  const [creatingCategory, setCreatingCategory] = useState(false);

  // Departman seçildiğinde filtrelenmiş kullanıcılar
  const filteredUsers = formData.departmentId
    ? users.filter((u: any) => u.department?.id === formData.departmentId || u.departmentId === formData.departmentId)
    : users;

  useEffect(() => {
    fetchRisks();
    fetchCategories();
    fetchDepartments();
    fetchUsers();
  }, [search, statusFilter, typeFilter, levelFilter, departmentFilter, pagination.page]);

  const fetchRisks = async () => {
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: '10',
      });
      if (search) params.append('search', search);
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
      if (typeFilter && typeFilter !== 'all') params.append('type', typeFilter);
      if (levelFilter && levelFilter !== 'all') params.append('level', levelFilter);
      if (departmentFilter && departmentFilter !== 'all') params.append('departmentId', departmentFilter);

      const res = await fetch(`/api/risks?${params}`);
      const data = await res.json();
      setRisks(data.risks || []);
      setPagination(data.pagination || { page: 1, total: 0, totalPages: 0 });

      // İstatistikleri hesapla
      const allRes = await fetch('/api/risks?limit=1000');
      const allData = await allRes.json();
      const allRisks = allData.risks || [];
      setStats({
        total: allRisks.length,
        kritik: allRisks.filter((r: Risk) => r.currentLevel === 'KRITIK').length,
        cokYuksek: allRisks.filter((r: Risk) => r.currentLevel === 'COK_YUKSEK').length,
        yuksek: allRisks.filter((r: Risk) => r.currentLevel === 'YUKSEK').length,
        aksiyonda: allRisks.filter((r: Risk) => r.status === 'AKSIYONDA').length,
      });
    } catch (error) {
      console.error('Risk listesi hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/risk-categories');
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Kategori listesi hatası:', error);
      setCategories([]);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/departments');
      const data = await res.json();
      // API returns { departments: [...] }
      const deptList = data.departments || data;
      setDepartments(Array.isArray(deptList) ? deptList : []);
    } catch (error) {
      console.error('Departman listesi hatası:', error);
      setDepartments([]);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users?forReviewers=true');
      const data = await res.json();
      const users = data.users || data;
      setUsers(Array.isArray(users) ? users : []);
    } catch (error) {
      console.error('Kullanıcı listesi hatası:', error);
      setUsers([]);
    }
  };

  const handleCreate = async () => {
    try {
      const res = await fetch('/api/risks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setIsCreateOpen(false);
        setFormData({
          title: '',
          description: '',
          type: '',
          source: '',
          categoryId: '',
          departmentId: '',
          ownerId: '',
          existingControls: '',
          responseStrategy: '',
          inherentProbability: '',
          inherentImpact: '',
          reviewDate: '',
          notes: '',
        });
        fetchRisks();
      }
    } catch (error) {
      console.error('Risk oluşturma hatası:', error);
    }
  };

  const handleCreateCategory = async () => {
    if (!categoryForm.name || !categoryForm.code) return;
    setCreatingCategory(true);
    try {
      const res = await fetch('/api/risk-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryForm),
      });

      if (res.ok) {
        setCategoryForm({ name: '', code: '', description: '', color: '#3b82f6' });
        setIsCategoryOpen(false);
        fetchCategories();
      } else {
        const data = await res.json();
        alert(data.error || 'Kategori oluşturulamadı');
      }
    } catch (error) {
      console.error('Kategori oluşturma hatası:', error);
    } finally {
      setCreatingCategory(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const s = riskStatuses.find((st) => st.value === status);
    return s ? (
      <Badge className={`${s.color} text-white`}>{s.label}</Badge>
    ) : (
      <Badge variant="secondary">{status}</Badge>
    );
  };

  const getLevelBadge = (level: string | null) => {
    if (!level) return <Badge variant="outline">Belirsiz</Badge>;
    const l = riskLevels.find((lv) => lv.value === level);
    return l ? (
      <Badge className={`${l.color} text-white`}>{l.label}</Badge>
    ) : (
      <Badge variant="outline">{level}</Badge>
    );
  };

  const getTypeLabel = (type: string) => {
    const t = riskTypes.find((ty) => ty.value === type);
    return t?.label || type;
  };

  const calculateScore = () => {
    const p = parseInt(formData.inherentProbability) || 0;
    const i = parseInt(formData.inherentImpact) || 0;
    return p * i;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Risk Değerlendirmesi</h1>
          <p className="text-muted-foreground">Risk analizi, değerlendirme ve aksiyon takibi</p>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={risks.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                Dışa Aktar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => {
                const exportData = risks.map((r: any) => ({
                  code: r.code,
                  title: r.title,
                  description: r.description,
                  category: r.category,
                  probability: r.probability,
                  impact: r.impact,
                  riskScore: r.riskScore,
                  status: r.status,
                  department: r.department,
                  owner: r.owner,
                  mitigationPlan: r.responseStrategy,
                }));
                exportRisksToExcel(exportData, 'Risk-Envanteri');
              }}>
                <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
                Excel - Risk Listesi
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                const exportData = risks.map((r: any) => ({
                  code: r.code,
                  title: r.title,
                  category: r.category,
                  probability: r.probability,
                  impact: r.impact,
                  riskScore: r.riskScore,
                  status: r.status,
                  department: r.department,
                  owner: r.owner,
                }));
                exportRiskHeatmap(exportData, 'Risk-Heatmap', 'Risk Heatmap Raporu');
              }}>
                <Grid3X3 className="h-4 w-4 mr-2 text-red-600" />
                PDF - Risk Heatmap
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Kategori Yönetimi Dialogu */}
          <Dialog open={isCategoryOpen} onOpenChange={setIsCategoryOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Tag className="w-4 h-4 mr-2" />
                Kategoriler
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Risk Kategorileri</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="border rounded-lg p-4 space-y-3">
                  <h4 className="font-medium">Yeni Kategori Ekle</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Kategori Adı *</Label>
                      <Input
                        value={categoryForm.name}
                        onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                        placeholder="Örn: Operasyonel Riskler"
                      />
                    </div>
                    <div>
                      <Label>Kategori Kodu *</Label>
                      <Input
                        value={categoryForm.code}
                        onChange={(e) => setCategoryForm({ ...categoryForm, code: e.target.value })}
                        placeholder="Örn: OPR"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Açıklama</Label>
                      <Input
                        value={categoryForm.description}
                        onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                        placeholder="Kategori açıklaması"
                      />
                    </div>
                    <div>
                      <Label>Renk</Label>
                      <Input
                        type="color"
                        value={categoryForm.color}
                        onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                        className="h-10 w-full"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button 
                        onClick={handleCreateCategory} 
                        disabled={!categoryForm.name || !categoryForm.code || creatingCategory}
                        className="w-full"
                      >
                        {creatingCategory ? 'Ekleniyor...' : 'Ekle'}
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Mevcut Kategoriler ({categories.length})</h4>
                  <div className="border rounded-lg max-h-48 overflow-y-auto">
                    {categories.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">Henüz kategori eklenmemiş</p>
                    ) : (
                      <div className="divide-y">
                        {categories.map((cat: any) => (
                          <div key={cat.id} className="p-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: cat.color || '#3b82f6' }}
                              />
                              <span className="font-medium">{cat.name}</span>
                              <span className="text-muted-foreground text-sm">({cat.code})</span>
                            </div>
                            <Badge variant="outline">{cat._count?.risks || 0} risk</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Yeni Risk
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Yeni Risk Kaydı</DialogTitle>
              </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Risk Başlığı *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Risk başlığını girin"
                  />
                </div>
                <div>
                  <Label>Risk Tipi *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(v) => setFormData({ ...formData, type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {riskTypes.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Risk Kaynağı</Label>
                  <Select
                    value={formData.source}
                    onValueChange={(v) => setFormData({ ...formData, source: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {riskSources.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Kategori</Label>
                  <Select
                    value={formData.categoryId}
                    onValueChange={(v) => setFormData({ ...formData, categoryId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Departman</Label>
                  <Select
                    value={formData.departmentId}
                    onValueChange={(v) => {
                      // Departman değiştiğinde owner'ı sıfırla
                      setFormData({ ...formData, departmentId: v, ownerId: '' });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Risk Sahibi {formData.departmentId && <span className="text-muted-foreground text-xs">({filteredUsers.length} kişi)</span>}</Label>
                  <Select
                    value={formData.ownerId}
                    onValueChange={(v) => setFormData({ ...formData, ownerId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={formData.departmentId ? 'Departmandaki personeli seçin' : 'Önce departman seçin'} />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredUsers.length === 0 ? (
                        <SelectItem value="no-user" disabled>
                          {formData.departmentId ? 'Bu departmanda kullanıcı yok' : 'Kullanıcı bulunamadı'}
                        </SelectItem>
                      ) : (
                        filteredUsers.map((u: any) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name} {u.surname} {u.department?.name ? `(${u.department.name})` : ''}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Yanıt Stratejisi</Label>
                  <Select
                    value={formData.responseStrategy}
                    onValueChange={(v) => setFormData({ ...formData, responseStrategy: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {responseStrategies.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label>Açıklama</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Risk açıklaması"
                    rows={3}
                  />
                </div>
                <div className="col-span-2">
                  <Label>Mevcut Kontroller</Label>
                  <Textarea
                    value={formData.existingControls}
                    onChange={(e) => setFormData({ ...formData, existingControls: e.target.value })}
                    placeholder="Mevcut kontrol önlemlerini açıklayın"
                    rows={2}
                  />
                </div>
                <div>
                  <Label>Doğal Olasılık (1-5)</Label>
                  <Select
                    value={formData.inherentProbability}
                    onValueChange={(v) => setFormData({ ...formData, inherentProbability: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - Çok Düşük</SelectItem>
                      <SelectItem value="2">2 - Düşük</SelectItem>
                      <SelectItem value="3">3 - Orta</SelectItem>
                      <SelectItem value="4">4 - Yüksek</SelectItem>
                      <SelectItem value="5">5 - Çok Yüksek</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Doğal Etki (1-5)</Label>
                  <Select
                    value={formData.inherentImpact}
                    onValueChange={(v) => setFormData({ ...formData, inherentImpact: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - Önemsiz</SelectItem>
                      <SelectItem value="2">2 - Küçük</SelectItem>
                      <SelectItem value="3">3 - Orta</SelectItem>
                      <SelectItem value="4">4 - Büyük</SelectItem>
                      <SelectItem value="5">5 - Felaket</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.inherentProbability && formData.inherentImpact && (
                  <div className="col-span-2">
                    <div className="p-3 bg-muted rounded-lg">
                      <span className="font-medium">Hesaplanan Risk Skoru: </span>
                      <span className="font-bold text-lg">{calculateScore()}</span>
                      <span className="text-muted-foreground ml-2">
                        ({calculateScore() <= 4 ? 'Düşük' : calculateScore() <= 9 ? 'Orta' : calculateScore() <= 14 ? 'Yüksek' : calculateScore() <= 19 ? 'Çok Yüksek' : 'Kritik'})
                      </span>
                    </div>
                  </div>
                )}
                <div>
                  <Label>Gözden Geçirme Tarihi</Label>
                  <Input
                    type="date"
                    value={formData.reviewDate}
                    onChange={(e) => setFormData({ ...formData, reviewDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  İptal
                </Button>
                <Button onClick={handleCreate} disabled={!formData.title || !formData.type}>
                  Oluştur
                </Button>
              </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Toplam Risk</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Shield className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Kritik Risk</p>
                <p className="text-2xl font-bold text-red-600">{stats.kritik}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Çok Yüksek</p>
                <p className="text-2xl font-bold text-orange-600">{stats.cokYuksek}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Yüksek</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.yuksek}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Aksiyonda</p>
                <p className="text-2xl font-bold text-purple-600">{stats.aksiyonda}</p>
              </div>
              <Clock className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtreler */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Risk ara..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Durum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Durumlar</SelectItem>
                {riskStatuses.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tip" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Tipler</SelectItem>
                {riskTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Seviye" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Seviyeler</SelectItem>
                {riskLevels.map((l) => (
                  <SelectItem key={l.value} value={l.value}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Departman" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Departmanlar</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(search || (statusFilter && statusFilter !== 'all') || (typeFilter && typeFilter !== 'all') || (levelFilter && levelFilter !== 'all') || (departmentFilter && departmentFilter !== 'all')) && (
              <Button
                variant="ghost"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('');
                  setTypeFilter('');
                  setLevelFilter('');
                  setDepartmentFilter('');
                }}
              >
                Filtreleri Temizle
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Risk Tablosu */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kod</TableHead>
                <TableHead>Başlık</TableHead>
                <TableHead>Tip</TableHead>
                <TableHead>Departman</TableHead>
                <TableHead>Seviye</TableHead>
                <TableHead>Skor</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Sahip</TableHead>
                <TableHead>Aksiyon</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    Yükleniyor...
                  </TableCell>
                </TableRow>
              ) : risks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    Risk bulunamadı
                  </TableCell>
                </TableRow>
              ) : (
                risks.map((risk) => (
                  <TableRow
                    key={risk.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/dashboard/risks/${risk.id}`)}
                  >
                    <TableCell className="font-mono text-sm">{risk.code}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{risk.title}</p>
                        {risk.category && (
                          <p className="text-xs text-muted-foreground">{risk.category.name}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getTypeLabel(risk.type)}</TableCell>
                    <TableCell>
                      {risk.department ? (
                        <Badge variant="outline">{risk.department.name}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{getLevelBadge(risk.currentLevel)}</TableCell>
                    <TableCell>
                      <span className="font-mono">
                        {risk.residualRiskScore || risk.inherentRiskScore || '-'}
                      </span>
                    </TableCell>
                    <TableCell>{getStatusBadge(risk.status)}</TableCell>
                    <TableCell>
                      {risk.owner ? `${risk.owner.name} ${risk.owner.surname || ''}` : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{risk._count.actions}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        Detay
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Sayfalama */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            disabled={pagination.page <= 1}
            onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
          >
            Önceki
          </Button>
          <span className="flex items-center px-4">
            {pagination.page} / {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
          >
            Sonraki
          </Button>
        </div>
      )}
    </div>
  );
}
