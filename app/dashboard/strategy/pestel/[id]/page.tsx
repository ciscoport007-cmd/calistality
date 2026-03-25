'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Landmark,
  DollarSign,
  Users,
  Cpu,
  Leaf,
  Scale,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  Link,
  Download,
  FileSpreadsheet,
  FileText,
  BarChart3,
} from 'lucide-react';
import { toast } from 'sonner';
import { PESTELLinkPanel } from '@/components/strategy/pestel-link-panel';
import { exportPESTELMatrix, exportPESTELToExcel } from '@/lib/export-utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Cell,
} from 'recharts';

interface PESTELFactor {
  id: string;
  category: 'POLITICAL' | 'ECONOMIC' | 'SOCIAL' | 'TECHNOLOGICAL' | 'ENVIRONMENTAL' | 'LEGAL';
  title: string;
  description: string | null;
  impactType: string;
  impactLevel: number;
  probability: number;
  timeframe: string | null;
  actionRequired: boolean;
  actionNotes: string | null;
  priority: number;
  responsibleId: string | null;
  responsible: { id: string; name: string; surname: string | null } | null;
  linkedGoals: any[];
  linkedRisks: any[];
}

interface PESTELStudy {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: string;
  analysisDate: string;
  period: { id: string; code: string; name: string };
  department: { id: string; name: string } | null;
  createdBy: { id: string; name: string; surname: string | null };
  factors: PESTELFactor[];
  categorizedFactors: Record<string, PESTELFactor[]>;
  factorStats: {
    total: number;
    opportunities: number;
    threats: number;
    neutral: number;
    actionRequired: number;
  };
}

const categoryConfig: Record<string, { label: string; icon: any; color: string; bgColor: string; borderColor: string }> = {
  POLITICAL: { label: 'Politik', icon: Landmark, color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-300' },
  ECONOMIC: { label: 'Ekonomik', icon: DollarSign, color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-300' },
  SOCIAL: { label: 'Sosyal', icon: Users, color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-300' },
  TECHNOLOGICAL: { label: 'Teknolojik', icon: Cpu, color: 'text-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-300' },
  ENVIRONMENTAL: { label: 'Çevresel', icon: Leaf, color: 'text-emerald-600', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-300' },
  LEGAL: { label: 'Yasal', icon: Scale, color: 'text-orange-600', bgColor: 'bg-orange-50', borderColor: 'border-orange-300' },
};

const impactTypeConfig: Record<string, { label: string; icon: any; color: string }> = {
  FIRSAT: { label: 'Fırsat', icon: TrendingUp, color: 'text-green-600' },
  TEHDIT: { label: 'Tehdit', icon: TrendingDown, color: 'text-red-600' },
  NOTR: { label: 'Nötr', icon: Minus, color: 'text-gray-600' },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  TASLAK: { label: 'Taslak', color: 'bg-gray-100 text-gray-800' },
  AKTIF: { label: 'Aktif', color: 'bg-blue-100 text-blue-800' },
  TAMAMLANDI: { label: 'Tamamlandı', color: 'bg-green-100 text-green-800' },
  ARSIV: { label: 'Arşiv', color: 'bg-yellow-100 text-yellow-800' },
};

export default function PESTELDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [study, setStudy] = useState<PESTELStudy | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('categories');
  
  // Factor dialog state
  const [isFactorDialogOpen, setIsFactorDialogOpen] = useState(false);
  const [editingFactor, setEditingFactor] = useState<PESTELFactor | null>(null);
  const [factorForm, setFactorForm] = useState({
    category: 'POLITICAL' as string,
    title: '',
    description: '',
    impactType: 'NOTR',
    impactLevel: 3,
    probability: 3,
    timeframe: '',
    actionRequired: false,
    actionNotes: '',
    responsibleId: '',
  });
  const [savingFactor, setSavingFactor] = useState(false);
  const [users, setUsers] = useState<any[]>([]);

  // Link panel state
  const [selectedFactorForLink, setSelectedFactorForLink] = useState<PESTELFactor | null>(null);

  useEffect(() => {
    if (id) {
      fetchStudy();
      fetchUsers();
    }
  }, [id]);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : data.users || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchStudy = async () => {
    try {
      const res = await fetch(`/api/pestel-studies/${id}`);
      if (res.ok) {
        const data = await res.json();
        setStudy(data);
      } else {
        toast.error('Çalışma bulunamadı');
        router.push('/dashboard/strategy/pestel');
      }
    } catch (error) {
      console.error('Error fetching study:', error);
      toast.error('Veri yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFactor = async () => {
    if (!factorForm.title) {
      toast.error('Başlık gerekli');
      return;
    }

    setSavingFactor(true);
    try {
      if (editingFactor) {
        const res = await fetch(`/api/pestel-studies/${id}/factors`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ factorId: editingFactor.id, ...factorForm }),
        });
        if (res.ok) {
          toast.success('Faktör güncellendi');
        }
      } else {
        const res = await fetch(`/api/pestel-studies/${id}/factors`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(factorForm),
        });
        if (res.ok) {
          toast.success('Faktör eklendi');
        }
      }
      setIsFactorDialogOpen(false);
      setEditingFactor(null);
      resetFactorForm();
      fetchStudy();
    } catch (error) {
      console.error('Error saving factor:', error);
      toast.error('Kaydetme hatası');
    } finally {
      setSavingFactor(false);
    }
  };

  const handleDeleteFactor = async (factorId: string) => {
    if (!confirm('Faktörü silmek istediğinize emin misiniz?')) return;

    try {
      const res = await fetch(`/api/pestel-studies/${id}/factors?factorId=${factorId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success('Faktör silindi');
        fetchStudy();
      }
    } catch (error) {
      console.error('Error deleting factor:', error);
      toast.error('Silme hatası');
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/pestel-studies/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        toast.success('Durum güncellendi');
        fetchStudy();
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Güncelleme hatası');
    }
  };

  const resetFactorForm = () => {
    setFactorForm({
      category: 'POLITICAL',
      title: '',
      description: '',
      impactType: 'NOTR',
      impactLevel: 3,
      probability: 3,
      timeframe: '',
      actionRequired: false,
      actionNotes: '',
      responsibleId: '',
    });
  };

  const openAddFactorDialog = (category: string) => {
    setEditingFactor(null);
    resetFactorForm();
    setFactorForm(prev => ({ ...prev, category }));
    setIsFactorDialogOpen(true);
  };

  const openEditFactorDialog = (factor: PESTELFactor) => {
    setEditingFactor(factor);
    setFactorForm({
      category: factor.category,
      title: factor.title,
      description: factor.description || '',
      impactType: factor.impactType,
      impactLevel: factor.impactLevel,
      probability: factor.probability,
      timeframe: factor.timeframe || '',
      actionRequired: factor.actionRequired,
      actionNotes: factor.actionNotes || '',
      responsibleId: factor.responsibleId || '',
    });
    setIsFactorDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!study) return null;

  const config = statusConfig[study.status] || statusConfig.TASLAK;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/strategy/pestel')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{study.name}</h1>
              <Badge className={config.color}>{config.label}</Badge>
            </div>
            <p className="text-muted-foreground">
              {study.code} • {study.period.name}
              {study.department && ` • ${study.department.name}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Dışa Aktar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => {
                const exportData = {
                  code: study.code,
                  title: study.name,
                  period: study.period,
                  department: study.department || undefined,
                  factors: (study.factors || []).map(f => ({
                    category: f.category,
                    title: f.title,
                    description: f.description || undefined,
                    impactType: f.impactType,
                    impactLevel: f.impactLevel,
                    probability: f.probability,
                    timeframe: f.timeframe || undefined,
                  })),
                };
                exportPESTELToExcel(exportData, `PESTEL-${study.code}`);
                toast.success('Excel dosyası indirildi');
              }}>
                <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
                Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                const exportData = {
                  code: study.code,
                  title: study.name,
                  period: study.period,
                  department: study.department || undefined,
                  factors: (study.factors || []).map(f => ({
                    category: f.category,
                    title: f.title,
                    description: f.description || undefined,
                    impactType: f.impactType,
                    impactLevel: f.impactLevel,
                    probability: f.probability,
                    timeframe: f.timeframe || undefined,
                  })),
                };
                exportPESTELMatrix(exportData, `PESTEL-${study.code}`);
                toast.success('PDF dosyası indirildi');
              }}>
                <FileText className="h-4 w-4 mr-2 text-red-600" />
                PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Select value={study.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TASLAK">Taslak</SelectItem>
              <SelectItem value="AKTIF">Aktif</SelectItem>
              <SelectItem value="TAMAMLANDI">Tamamlandı</SelectItem>
              <SelectItem value="ARSIV">Arşiv</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{study.factorStats.total}</p>
              <p className="text-sm text-muted-foreground">Toplam Faktör</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{study.factorStats.opportunities}</p>
              <p className="text-sm text-muted-foreground">Fırsat</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{study.factorStats.threats}</p>
              <p className="text-sm text-muted-foreground">Tehdit</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-600">{study.factorStats.neutral}</p>
              <p className="text-sm text-muted-foreground">Nötr</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">{study.factorStats.actionRequired}</p>
              <p className="text-sm text-muted-foreground">Aksiyon Gerekli</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="categories">Kategoriler</TabsTrigger>
          <TabsTrigger value="matrix">Etki Matrisi</TabsTrigger>
          <TabsTrigger value="chart">
            <BarChart3 className="h-4 w-4 mr-1" />
            Grafik
          </TabsTrigger>
          <TabsTrigger value="details">Detaylar</TabsTrigger>
        </TabsList>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(categoryConfig).map(([key, catConfig]) => {
              const CatIcon = catConfig.icon;
              const factors = study.categorizedFactors[key] || [];
              return (
                <Card key={key} className={`border-t-4 ${catConfig.borderColor}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CatIcon className={`h-5 w-5 ${catConfig.color}`} />
                        <CardTitle className={catConfig.color}>{catConfig.label}</CardTitle>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => openAddFactorDialog(key)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <CardDescription>{factors.length} faktör</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
                    {factors.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Henüz faktör eklenmemiş</p>
                    ) : (
                      factors.map((factor) => {
                        const impactConfig = impactTypeConfig[factor.impactType] || impactTypeConfig.NOTR;
                        const ImpactIcon = impactConfig.icon;
                        return (
                          <div key={factor.id} className={`p-3 ${catConfig.bgColor} rounded-lg group`}>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">{factor.title}</p>
                                  <ImpactIcon className={`h-4 w-4 ${impactConfig.color}`} />
                                </div>
                                {factor.description && (
                                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{factor.description}</p>
                                )}
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                  <Badge variant="outline" className="text-xs">Etki: {factor.impactLevel}/5</Badge>
                                  <Badge variant="outline" className="text-xs">Olasılık: {factor.probability}/5</Badge>
                                  {factor.actionRequired && (
                                    <Badge className="bg-orange-100 text-orange-800 text-xs">
                                      <AlertCircle className="h-3 w-3 mr-1" />
                                      Aksiyon
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setSelectedFactorForLink(factor)} title="Bağlantı Ekle">
                                  <Link className="h-3 w-3" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditFactorDialog(factor)}>
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDeleteFactor(factor.id)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Impact Matrix Tab */}
        <TabsContent value="matrix">
          <Card>
            <CardHeader>
              <CardTitle>Etki-Olasılık Matrisi</CardTitle>
              <CardDescription>Faktörlerin etki ve olasılık değerlendirmesi</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <div className="min-w-[600px]">
                  {/* Matrix Grid */}
                  <div className="relative">
                    <div className="absolute -left-8 top-1/2 -translate-y-1/2 -rotate-90 text-sm text-muted-foreground whitespace-nowrap">
                      Etki →
                    </div>
                    <div className="grid grid-cols-5 gap-1">
                      {[5, 4, 3, 2, 1].map((impact) => (
                        [1, 2, 3, 4, 5].map((prob) => {
                          const cellFactors = (study.factors || []).filter(
                            f => f.impactLevel === impact && f.probability === prob
                          );
                          const bgColor = impact * prob >= 15 ? 'bg-red-100' :
                            impact * prob >= 8 ? 'bg-yellow-100' : 'bg-green-100';
                          return (
                            <div
                              key={`${impact}-${prob}`}
                              className={`${bgColor} p-2 min-h-[80px] rounded border text-xs`}
                            >
                              {cellFactors.map(f => {
                                const cat = categoryConfig[f.category];
                                const CatIcon = cat?.icon;
                                return (
                                  <div key={f.id} className="flex items-center gap-1 mb-1 p-1 bg-white rounded shadow-sm">
                                    {CatIcon && <CatIcon className={`h-3 w-3 ${cat.color}`} />}
                                    <span className="truncate">{f.title}</span>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })
                      ))}
                    </div>
                    <div className="text-center mt-2 text-sm text-muted-foreground">
                      Olasılık →
                    </div>
                  </div>
                  <div className="flex justify-center gap-4 mt-4">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-green-100 rounded"></div>
                      <span className="text-sm">Düşük Risk</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-yellow-100 rounded"></div>
                      <span className="text-sm">Orta Risk</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-red-100 rounded"></div>
                      <span className="text-sm">Yüksek Risk</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Chart Tab */}
        <TabsContent value="chart" className="space-y-6">
          {/* PESTEL Radar Chart */}
          <Card>
            <CardHeader>
              <CardTitle>PESTEL Radar Grafiği</CardTitle>
              <CardDescription>Faktörlerin etki düzeyi ve olasılık dağılımı</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={(() => {
                    const categories = ['POLITICAL', 'ECONOMIC', 'SOCIAL', 'TECHNOLOGICAL', 'ENVIRONMENTAL', 'LEGAL'];
                    return categories.map(cat => {
                      const factors = study.categorizedFactors[cat] || [];
                      const avgImpact = factors.length > 0 
                        ? factors.reduce((sum, f) => sum + f.impactLevel, 0) / factors.length 
                        : 0;
                      const avgProbability = factors.length > 0 
                        ? factors.reduce((sum, f) => sum + f.probability, 0) / factors.length 
                        : 0;
                      return {
                        category: categoryConfig[cat]?.label || cat,
                        'Etki Düzeyi': avgImpact,
                        'Olasılık': avgProbability,
                        'Faktör Sayısı': factors.length,
                      };
                    });
                  })()}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="category" />
                    <PolarRadiusAxis angle={30} domain={[0, 5]} />
                    <Radar name="Etki Düzeyi" dataKey="Etki Düzeyi" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.5} />
                    <Radar name="Olasılık" dataKey="Olasılık" stroke="#10B981" fill="#10B981" fillOpacity={0.3} />
                    <Legend />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Impact Distribution Bar Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Kategori Bazlı Faktör Dağılımı</CardTitle>
                <CardDescription>Her kategorideki fırsat ve tehdit sayıları</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={(() => {
                      const categories = ['POLITICAL', 'ECONOMIC', 'SOCIAL', 'TECHNOLOGICAL', 'ENVIRONMENTAL', 'LEGAL'];
                      return categories.map(cat => {
                        const factors = study.categorizedFactors[cat] || [];
                        return {
                          name: categoryConfig[cat]?.label || cat,
                          'Fırsat': factors.filter(f => f.impactType === 'FIRSAT').length,
                          'Tehdit': factors.filter(f => f.impactType === 'TEHDIT').length,
                          'Nötr': factors.filter(f => f.impactType === 'NOTR').length,
                        };
                      });
                    })()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" height={60} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Fırsat" fill="#10B981" />
                      <Bar dataKey="Tehdit" fill="#EF4444" />
                      <Bar dataKey="Nötr" fill="#6B7280" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Etki x Olasılık Skoru</CardTitle>
                <CardDescription>Faktörlerin öncelik sıralaması</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={(() => {
                        const allFactors = study.factors
                          .map(f => ({
                            name: f.title.length > 20 ? f.title.slice(0, 20) + '...' : f.title,
                            skor: f.impactLevel * f.probability,
                            type: f.impactType,
                            category: categoryConfig[f.category]?.label || f.category,
                          }))
                          .sort((a, b) => b.skor - a.skor)
                          .slice(0, 8);
                        return allFactors;
                      })()}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 25]} />
                      <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
                      <Tooltip 
                        formatter={(value, name, props) => [
                          `${value} (${props.payload.category})`,
                          'Skor'
                        ]}
                      />
                      <Bar dataKey="skor" name="Etki x Olasılık">
                        {(() => {
                          const allFactors = study.factors
                            .map(f => ({
                              skor: f.impactLevel * f.probability,
                              type: f.impactType,
                            }))
                            .sort((a, b) => b.skor - a.skor)
                            .slice(0, 8);
                          return allFactors.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.type === 'FIRSAT' ? '#10B981' : entry.type === 'TEHDIT' ? '#EF4444' : '#6B7280'} 
                            />
                          ));
                        })()}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600">{study.factorStats.opportunities}</p>
                  <p className="text-sm text-muted-foreground">Fırsat</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-red-600">{study.factorStats.threats}</p>
                  <p className="text-sm text-muted-foreground">Tehdit</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-gray-600">{study.factorStats.neutral}</p>
                  <p className="text-sm text-muted-foreground">Nötr</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-orange-600">{study.factorStats.actionRequired}</p>
                  <p className="text-sm text-muted-foreground">Aksiyon Gerekli</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Çalışma Bilgileri</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Kod</Label>
                  <p className="font-medium">{study.code}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Ad</Label>
                  <p className="font-medium">{study.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Strateji Dönemi</Label>
                  <p className="font-medium">{study.period.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Departman</Label>
                  <p className="font-medium">{study.department?.name || 'Tüm Organizasyon'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Analiz Tarihi</Label>
                  <p className="font-medium">{new Date(study.analysisDate).toLocaleDateString('tr-TR')}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Oluşturan</Label>
                  <p className="font-medium">{study.createdBy.name} {study.createdBy.surname}</p>
                </div>
              </div>
              {study.description && (
                <div>
                  <Label className="text-muted-foreground">Açıklama</Label>
                  <p className="mt-1">{study.description}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Factor Dialog */}
      <Dialog open={isFactorDialogOpen} onOpenChange={setIsFactorDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingFactor ? 'Faktör Düzenle' : 'Yeni Faktör Ekle'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4 max-h-[70vh] overflow-y-auto">
            {!editingFactor && (
              <div>
                <Label>Kategori</Label>
                <Select value={factorForm.category} onValueChange={(v) => setFactorForm({ ...factorForm, category: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="POLITICAL">Politik</SelectItem>
                    <SelectItem value="ECONOMIC">Ekonomik</SelectItem>
                    <SelectItem value="SOCIAL">Sosyal</SelectItem>
                    <SelectItem value="TECHNOLOGICAL">Teknolojik</SelectItem>
                    <SelectItem value="ENVIRONMENTAL">Çevresel</SelectItem>
                    <SelectItem value="LEGAL">Yasal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Başlık *</Label>
              <Input
                value={factorForm.title}
                onChange={(e) => setFactorForm({ ...factorForm, title: e.target.value })}
                placeholder="Faktör başlığı"
              />
            </div>
            <div>
              <Label>Açıklama</Label>
              <Textarea
                value={factorForm.description}
                onChange={(e) => setFactorForm({ ...factorForm, description: e.target.value })}
                placeholder="Detaylı açıklama"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Etki Tipi</Label>
                <Select value={factorForm.impactType} onValueChange={(v) => setFactorForm({ ...factorForm, impactType: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FIRSAT">Fırsat</SelectItem>
                    <SelectItem value="TEHDIT">Tehdit</SelectItem>
                    <SelectItem value="NOTR">Nötr</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Zaman Dilimi</Label>
                <Select
                  value={factorForm.timeframe || 'none'}
                  onValueChange={(v) => setFactorForm({ ...factorForm, timeframe: v === 'none' ? '' : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Belirtilmemiş</SelectItem>
                    <SelectItem value="KISA_VADE">Kısa Vade (0-1 yıl)</SelectItem>
                    <SelectItem value="ORTA_VADE">Orta Vade (1-3 yıl)</SelectItem>
                    <SelectItem value="UZUN_VADE">Uzun Vade (3+ yıl)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Etki Düzeyi (1-5)</Label>
                <Select value={String(factorForm.impactLevel)} onValueChange={(v) => setFactorForm({ ...factorForm, impactLevel: parseInt(v) })}>
                  <SelectTrigger>
                    <SelectValue />
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
                <Label>Olasılık (1-5)</Label>
                <Select value={String(factorForm.probability)} onValueChange={(v) => setFactorForm({ ...factorForm, probability: parseInt(v) })}>
                  <SelectTrigger>
                    <SelectValue />
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
            </div>
            <div>
              <Label>Sorumlu</Label>
              <Select
                value={factorForm.responsibleId || '__none__'}
                onValueChange={(v) => setFactorForm({ ...factorForm, responsibleId: v === '__none__' ? '' : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sorumlu seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Seçilmedi</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} {user.surname || ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="actionRequired"
                checked={factorForm.actionRequired}
                onCheckedChange={(checked) => setFactorForm({ ...factorForm, actionRequired: !!checked })}
              />
              <Label htmlFor="actionRequired">Aksiyon Gerekli</Label>
            </div>
            {factorForm.actionRequired && (
              <div>
                <Label>Aksiyon Notları</Label>
                <Textarea
                  value={factorForm.actionNotes}
                  onChange={(e) => setFactorForm({ ...factorForm, actionNotes: e.target.value })}
                  placeholder="Yapılması gereken aksiyonlar"
                  rows={2}
                />
              </div>
            )}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsFactorDialogOpen(false)}>İptal</Button>
              <Button onClick={handleSaveFactor} disabled={savingFactor}>
                {savingFactor ? 'Kaydediliyor...' : 'Kaydet'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Link Panel Dialog */}
      <Dialog open={!!selectedFactorForLink} onOpenChange={(open) => !open && setSelectedFactorForLink(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link className="h-5 w-5" />
              Hedef, Risk ve Aksiyon Bağlantıları
            </DialogTitle>
          </DialogHeader>
          {selectedFactorForLink && (
            <PESTELLinkPanel
              studyId={id}
              factor={selectedFactorForLink}
              onClose={() => setSelectedFactorForLink(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
