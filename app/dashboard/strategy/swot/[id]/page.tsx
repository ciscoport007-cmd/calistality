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
  DialogTrigger,
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
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  FileText,
  Clock,
  ThumbsUp,
  ThumbsDown,
  Target,
  AlertTriangle,
  Lightbulb,
  Shield,
  Link,
  X,
  Download,
  FileSpreadsheet,
} from 'lucide-react';
import { toast } from 'sonner';
import { SWOTLinkPanel } from '@/components/strategy/swot-link-panel';
import { exportSWOTMatrix, exportSWOTToExcel } from '@/lib/export-utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface SWOTItem {
  id: string;
  type: 'STRENGTH' | 'WEAKNESS' | 'OPPORTUNITY' | 'THREAT';
  title: string;
  description: string | null;
  impact: number;
  priority: number;
  responsibleId: string | null;
  responsible: { id: string; name: string; surname: string | null } | null;
  processName: string | null;
  subProcessName: string | null;
  startDate: string | null;
  endDate: string | null;
  actionNote: string | null;
}

interface SWOTStrategy {
  id: string;
  type: 'SO' | 'WO' | 'ST' | 'WT';
  title: string;
  description: string | null;
  strength: SWOTItem | null;
  weakness: SWOTItem | null;
  opportunity: SWOTItem | null;
  threat: SWOTItem | null;
  goal: { id: string; code: string; name: string } | null;
}

interface SWOTStudy {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: string;
  analysisDate: string;
  period: { id: string; code: string; name: string };
  department: { id: string; name: string } | null;
  createdBy: { id: string; name: string; surname: string | null };
  items: SWOTItem[];
  strategies: SWOTStrategy[];
  categorizedItems: {
    strengths: SWOTItem[];
    weaknesses: SWOTItem[];
    opportunities: SWOTItem[];
    threats: SWOTItem[];
  };
  categorizedStrategies: {
    SO: SWOTStrategy[];
    WO: SWOTStrategy[];
    ST: SWOTStrategy[];
    WT: SWOTStrategy[];
  };
}

const itemTypeConfig = {
  STRENGTH: { label: 'Güçlü Yön', color: 'bg-green-500', bgColor: 'bg-green-50', textColor: 'text-green-700', icon: ThumbsUp },
  WEAKNESS: { label: 'Zayıf Yön', color: 'bg-red-500', bgColor: 'bg-red-50', textColor: 'text-red-700', icon: ThumbsDown },
  OPPORTUNITY: { label: 'Fırsat', color: 'bg-blue-500', bgColor: 'bg-blue-50', textColor: 'text-blue-700', icon: Lightbulb },
  THREAT: { label: 'Tehdit', color: 'bg-orange-500', bgColor: 'bg-orange-50', textColor: 'text-orange-700', icon: AlertTriangle },
};

const strategyTypeConfig = {
  SO: { label: 'Güçlü-Fırsat (SO)', desc: 'Güçlü yönleri kullanarak fırsatlardan yararlan', color: 'bg-emerald-100 border-emerald-300' },
  WO: { label: 'Zayıf-Fırsat (WO)', desc: 'Zayıflıkları gidererek fırsatlardan yararlan', color: 'bg-sky-100 border-sky-300' },
  ST: { label: 'Güçlü-Tehdit (ST)', desc: 'Güçlü yönleri kullanarak tehditleri azalt', color: 'bg-amber-100 border-amber-300' },
  WT: { label: 'Zayıf-Tehdit (WT)', desc: 'Zayıflıkları ve tehditleri minimize et', color: 'bg-rose-100 border-rose-300' },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  TASLAK: { label: 'Taslak', color: 'bg-gray-100 text-gray-800' },
  AKTIF: { label: 'Aktif', color: 'bg-blue-100 text-blue-800' },
  TAMAMLANDI: { label: 'Tamamlandı', color: 'bg-green-100 text-green-800' },
  ARSIV: { label: 'Arşiv', color: 'bg-yellow-100 text-yellow-800' },
};

export default function SWOTDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [study, setStudy] = useState<SWOTStudy | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('matrix');
  
  // Item dialog state
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SWOTItem | null>(null);
  const [itemForm, setItemForm] = useState({ 
    type: 'STRENGTH' as string, 
    title: '', 
    description: '', 
    impact: 3,
    responsibleId: '',
    processName: '',
    subProcessName: '',
    startDate: '',
    endDate: '',
    actionNote: '',
  });
  const [savingItem, setSavingItem] = useState(false);
  const [users, setUsers] = useState<any[]>([]);

  // Strategy dialog state
  const [isStrategyDialogOpen, setIsStrategyDialogOpen] = useState(false);
  const [strategyForm, setStrategyForm] = useState({
    type: 'SO' as string,
    title: '',
    description: '',
    strengthId: '',
    weaknessId: '',
    opportunityId: '',
    threatId: '',
    goalId: '',
  });
  const [savingStrategy, setSavingStrategy] = useState(false);
  const [goals, setGoals] = useState<any[]>([]);

  // Link panel state
  const [selectedItemForLink, setSelectedItemForLink] = useState<SWOTItem | null>(null);

  useEffect(() => {
    if (id) {
      fetchStudy();
      fetchGoals();
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

  const fetchGoals = async () => {
    try {
      const res = await fetch('/api/goals');
      if (res.ok) {
        const data = await res.json();
        setGoals(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching goals:', error);
    }
  };

  const fetchStudy = async () => {
    try {
      const res = await fetch(`/api/swot-studies/${id}`);
      if (res.ok) {
        const data = await res.json();
        setStudy(data);
      } else {
        toast.error('Çalışma bulunamadı');
        router.push('/dashboard/strategy/swot');
      }
    } catch (error) {
      console.error('Error fetching study:', error);
      toast.error('Veri yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveItem = async () => {
    if (!itemForm.title) {
      toast.error('Başlık gerekli');
      return;
    }

    setSavingItem(true);
    try {
      if (editingItem) {
        const res = await fetch(`/api/swot-studies/${id}/items`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemId: editingItem.id, ...itemForm }),
        });
        if (res.ok) {
          toast.success('Öğe güncellendi');
        }
      } else {
        const res = await fetch(`/api/swot-studies/${id}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(itemForm),
        });
        if (res.ok) {
          toast.success('Öğe eklendi');
        }
      }
      setIsItemDialogOpen(false);
      setEditingItem(null);
      setItemForm({ 
        type: 'STRENGTH', 
        title: '', 
        description: '', 
        impact: 3,
        responsibleId: '',
        processName: '',
        subProcessName: '',
        startDate: '',
        endDate: '',
        actionNote: '',
      });
      fetchStudy();
    } catch (error) {
      console.error('Error saving item:', error);
      toast.error('Kaydetme hatası');
    } finally {
      setSavingItem(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Öğeyi silmek istediğinize emin misiniz?')) return;

    try {
      const res = await fetch(`/api/swot-studies/${id}/items?itemId=${itemId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success('Öğe silindi');
        fetchStudy();
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Silme hatası');
    }
  };

  const handleSaveStrategy = async () => {
    if (!strategyForm.title) {
      toast.error('Başlık gerekli');
      return;
    }

    setSavingStrategy(true);
    try {
      const res = await fetch(`/api/swot-studies/${id}/strategies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...strategyForm,
          strengthId: strategyForm.strengthId || null,
          weaknessId: strategyForm.weaknessId || null,
          opportunityId: strategyForm.opportunityId || null,
          threatId: strategyForm.threatId || null,
          goalId: strategyForm.goalId || null,
        }),
      });
      if (res.ok) {
        toast.success('Strateji eklendi');
        setIsStrategyDialogOpen(false);
        setStrategyForm({ type: 'SO', title: '', description: '', strengthId: '', weaknessId: '', opportunityId: '', threatId: '', goalId: '' });
        fetchStudy();
      }
    } catch (error) {
      console.error('Error saving strategy:', error);
      toast.error('Kaydetme hatası');
    } finally {
      setSavingStrategy(false);
    }
  };

  const handleDeleteStrategy = async (strategyId: string) => {
    if (!confirm('Stratejiyi silmek istediğinize emin misiniz?')) return;

    try {
      const res = await fetch(`/api/swot-studies/${id}/strategies?strategyId=${strategyId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success('Strateji silindi');
        fetchStudy();
      }
    } catch (error) {
      console.error('Error deleting strategy:', error);
      toast.error('Silme hatası');
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/swot-studies/${id}`, {
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

  const openAddItemDialog = (type: string) => {
    setEditingItem(null);
    setItemForm({ 
      type, 
      title: '', 
      description: '', 
      impact: 3,
      responsibleId: '',
      processName: '',
      subProcessName: '',
      startDate: '',
      endDate: '',
      actionNote: '',
    });
    setIsItemDialogOpen(true);
  };

  const openEditItemDialog = (item: SWOTItem) => {
    setEditingItem(item);
    setItemForm({ 
      type: item.type, 
      title: item.title, 
      description: item.description || '', 
      impact: item.impact,
      responsibleId: item.responsibleId || '',
      processName: item.processName || '',
      subProcessName: item.subProcessName || '',
      startDate: item.startDate ? item.startDate.split('T')[0] : '',
      endDate: item.endDate ? item.endDate.split('T')[0] : '',
      actionNote: item.actionNote || '',
    });
    setIsItemDialogOpen(true);
  };

  const openAddStrategyDialog = (type: string) => {
    setStrategyForm({ type, title: '', description: '', strengthId: '', weaknessId: '', opportunityId: '', threatId: '', goalId: '' });
    setIsStrategyDialogOpen(true);
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
          <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/strategy/swot')}>
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
                  items: (study.items || []).map(i => ({
                    type: i.type,
                    title: i.title,
                    description: i.description || undefined,
                    impactLevel: i.impact,
                    priority: i.priority,
                  })),
                };
                exportSWOTToExcel(exportData, `SWOT-${study.code}`);
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
                  items: (study.items || []).map(i => ({
                    type: i.type,
                    title: i.title,
                    description: i.description || undefined,
                    impactLevel: i.impact,
                    priority: i.priority,
                  })),
                };
                exportSWOTMatrix(exportData, `SWOT-${study.code}`);
                toast.success('PDF dosyası indirildi');
              }}>
                <FileText className="h-4 w-4 mr-2 text-red-600" />
                PDF (Matris)
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="matrix">SWOT Matrisi</TabsTrigger>
          <TabsTrigger value="tows">TOWS Stratejileri</TabsTrigger>
          <TabsTrigger value="details">Detaylar</TabsTrigger>
        </TabsList>

        {/* SWOT Matrix Tab */}
        <TabsContent value="matrix" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Strengths */}
            <Card className="border-t-4 border-t-green-500">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ThumbsUp className="h-5 w-5 text-green-600" />
                    <CardTitle className="text-green-700">Güçlü Yönler (S)</CardTitle>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => openAddItemDialog('STRENGTH')}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <CardDescription>İç faktörler - Olumlu</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {study.categorizedItems.strengths.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Henüz öğe eklenmemiş</p>
                ) : (
                  study.categorizedItems.strengths.map((item) => (
                    <div key={item.id} className="flex items-start justify-between p-3 bg-green-50 rounded-lg group">
                      <div className="flex-1">
                        <p className="font-medium text-green-800">{item.title}</p>
                        {item.description && <p className="text-sm text-green-600 mt-1">{item.description}</p>}
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">Etki: {item.impact}/5</Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setSelectedItemForLink(item)} title="Bağlantı Ekle">
                          <Link className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditItemDialog(item)}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDeleteItem(item.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Weaknesses */}
            <Card className="border-t-4 border-t-red-500">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ThumbsDown className="h-5 w-5 text-red-600" />
                    <CardTitle className="text-red-700">Zayıf Yönler (W)</CardTitle>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => openAddItemDialog('WEAKNESS')}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <CardDescription>İç faktörler - Olumsuz</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {study.categorizedItems.weaknesses.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Henüz öğe eklenmemiş</p>
                ) : (
                  study.categorizedItems.weaknesses.map((item) => (
                    <div key={item.id} className="flex items-start justify-between p-3 bg-red-50 rounded-lg group">
                      <div className="flex-1">
                        <p className="font-medium text-red-800">{item.title}</p>
                        {item.description && <p className="text-sm text-red-600 mt-1">{item.description}</p>}
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">Etki: {item.impact}/5</Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setSelectedItemForLink(item)} title="Bağlantı Ekle">
                          <Link className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditItemDialog(item)}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDeleteItem(item.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Opportunities */}
            <Card className="border-t-4 border-t-blue-500">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-blue-600" />
                    <CardTitle className="text-blue-700">Fırsatlar (O)</CardTitle>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => openAddItemDialog('OPPORTUNITY')}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <CardDescription>Dış faktörler - Olumlu</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {study.categorizedItems.opportunities.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Henüz öğe eklenmemiş</p>
                ) : (
                  study.categorizedItems.opportunities.map((item) => (
                    <div key={item.id} className="flex items-start justify-between p-3 bg-blue-50 rounded-lg group">
                      <div className="flex-1">
                        <p className="font-medium text-blue-800">{item.title}</p>
                        {item.description && <p className="text-sm text-blue-600 mt-1">{item.description}</p>}
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">Etki: {item.impact}/5</Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setSelectedItemForLink(item)} title="Bağlantı Ekle">
                          <Link className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditItemDialog(item)}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDeleteItem(item.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Threats */}
            <Card className="border-t-4 border-t-orange-500">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                    <CardTitle className="text-orange-700">Tehditler (T)</CardTitle>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => openAddItemDialog('THREAT')}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <CardDescription>Dış faktörler - Olumsuz</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {study.categorizedItems.threats.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Henüz öğe eklenmemiş</p>
                ) : (
                  study.categorizedItems.threats.map((item) => (
                    <div key={item.id} className="flex items-start justify-between p-3 bg-orange-50 rounded-lg group">
                      <div className="flex-1">
                        <p className="font-medium text-orange-800">{item.title}</p>
                        {item.description && <p className="text-sm text-orange-600 mt-1">{item.description}</p>}
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">Etki: {item.impact}/5</Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setSelectedItemForLink(item)} title="Bağlantı Ekle">
                          <Link className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditItemDialog(item)}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDeleteItem(item.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TOWS Strategies Tab */}
        <TabsContent value="tows" className="space-y-6">
          {/* Görsel TOWS Matrisi */}
          <Card>
            <CardHeader>
              <CardTitle>TOWS Stratejik Analiz Matrisi</CardTitle>
              <CardDescription>İç ve dış faktörlerin kesişiminden doğan stratejiler</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="border p-3 bg-gray-100 w-32"></th>
                      <th className="border p-3 bg-blue-50 text-blue-700 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Lightbulb className="h-4 w-4" />
                          <span>Fırsatlar (O)</span>
                        </div>
                        <span className="text-xs font-normal text-muted-foreground">{study.categorizedItems.opportunities.length} öğe</span>
                      </th>
                      <th className="border p-3 bg-orange-50 text-orange-700 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
                          <span>Tehditler (T)</span>
                        </div>
                        <span className="text-xs font-normal text-muted-foreground">{study.categorizedItems.threats.length} öğe</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border p-3 bg-green-50 text-green-700 font-medium text-center align-middle">
                        <div className="flex items-center justify-center gap-2">
                          <ThumbsUp className="h-4 w-4" />
                          <span>Güçlü Yönler (S)</span>
                        </div>
                        <span className="text-xs font-normal text-muted-foreground">{study.categorizedItems.strengths.length} öğe</span>
                      </td>
                      <td className="border p-3 bg-emerald-50 align-top min-w-[250px]">
                        <div className="font-medium text-emerald-700 mb-2 text-sm">SO Stratejileri</div>
                        <p className="text-xs text-muted-foreground mb-2">Güçlü yönleri kullanarak fırsatlardan yararlan</p>
                        {study.categorizedStrategies.SO.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic">Strateji yok</p>
                        ) : (
                          <ul className="space-y-1">
                            {study.categorizedStrategies.SO.map(s => (
                              <li key={s.id} className="text-xs bg-white p-1.5 rounded border">• {s.title}</li>
                            ))}
                          </ul>
                        )}
                      </td>
                      <td className="border p-3 bg-amber-50 align-top min-w-[250px]">
                        <div className="font-medium text-amber-700 mb-2 text-sm">ST Stratejileri</div>
                        <p className="text-xs text-muted-foreground mb-2">Güçlü yönleri kullanarak tehditleri azalt</p>
                        {study.categorizedStrategies.ST.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic">Strateji yok</p>
                        ) : (
                          <ul className="space-y-1">
                            {study.categorizedStrategies.ST.map(s => (
                              <li key={s.id} className="text-xs bg-white p-1.5 rounded border">• {s.title}</li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="border p-3 bg-red-50 text-red-700 font-medium text-center align-middle">
                        <div className="flex items-center justify-center gap-2">
                          <ThumbsDown className="h-4 w-4" />
                          <span>Zayıf Yönler (W)</span>
                        </div>
                        <span className="text-xs font-normal text-muted-foreground">{study.categorizedItems.weaknesses.length} öğe</span>
                      </td>
                      <td className="border p-3 bg-sky-50 align-top min-w-[250px]">
                        <div className="font-medium text-sky-700 mb-2 text-sm">WO Stratejileri</div>
                        <p className="text-xs text-muted-foreground mb-2">Zayıflıkları gidererek fırsatlardan yararlan</p>
                        {study.categorizedStrategies.WO.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic">Strateji yok</p>
                        ) : (
                          <ul className="space-y-1">
                            {study.categorizedStrategies.WO.map(s => (
                              <li key={s.id} className="text-xs bg-white p-1.5 rounded border">• {s.title}</li>
                            ))}
                          </ul>
                        )}
                      </td>
                      <td className="border p-3 bg-rose-50 align-top min-w-[250px]">
                        <div className="font-medium text-rose-700 mb-2 text-sm">WT Stratejileri</div>
                        <p className="text-xs text-muted-foreground mb-2">Zayıflıkları ve tehditleri minimize et</p>
                        {study.categorizedStrategies.WT.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic">Strateji yok</p>
                        ) : (
                          <ul className="space-y-1">
                            {study.categorizedStrategies.WT.map(s => (
                              <li key={s.id} className="text-xs bg-white p-1.5 rounded border">• {s.title}</li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Strateji Detayları */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(['SO', 'WO', 'ST', 'WT'] as const).map((type) => {
              const stratConfig = strategyTypeConfig[type];
              const strategies = study.categorizedStrategies[type];
              return (
                <Card key={type} className={`border-2 ${stratConfig.color}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{stratConfig.label}</CardTitle>
                        <CardDescription>{stratConfig.desc}</CardDescription>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => openAddStrategyDialog(type)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {strategies.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Henüz strateji eklenmemiş</p>
                    ) : (
                      strategies.map((strategy) => (
                        <div key={strategy.id} className="p-3 bg-white rounded-lg border group">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium">{strategy.title}</p>
                              {strategy.description && (
                                <p className="text-sm text-muted-foreground mt-1">{strategy.description}</p>
                              )}
                              {/* İlişkili SWOT öğeleri */}
                              <div className="flex flex-wrap gap-1 mt-2">
                                {strategy.strength && (
                                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                    <ThumbsUp className="h-2.5 w-2.5 mr-1" />
                                    {strategy.strength.title}
                                  </Badge>
                                )}
                                {strategy.weakness && (
                                  <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                                    <ThumbsDown className="h-2.5 w-2.5 mr-1" />
                                    {strategy.weakness.title}
                                  </Badge>
                                )}
                                {strategy.opportunity && (
                                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                    <Lightbulb className="h-2.5 w-2.5 mr-1" />
                                    {strategy.opportunity.title}
                                  </Badge>
                                )}
                                {strategy.threat && (
                                  <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                                    <AlertTriangle className="h-2.5 w-2.5 mr-1" />
                                    {strategy.threat.title}
                                  </Badge>
                                )}
                              </div>
                              {/* Stratejik hedef bağlantısı */}
                              {strategy.goal && (
                                <div className="flex items-center gap-1 mt-2 pt-2 border-t">
                                  <Target className="h-3 w-3 text-primary" />
                                  <span className="text-xs text-primary font-medium">{strategy.goal.code}: {strategy.goal.name}</span>
                                </div>
                              )}
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100"
                              onClick={() => handleDeleteStrategy(strategy.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              );
            })}
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

      {/* Item Dialog */}
      <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Öğe Düzenle' : 'Yeni Öğe Ekle'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {!editingItem && (
              <div>
                <Label>Tip</Label>
                <Select value={itemForm.type} onValueChange={(v) => setItemForm({ ...itemForm, type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STRENGTH">Güçlü Yön</SelectItem>
                    <SelectItem value="WEAKNESS">Zayıf Yön</SelectItem>
                    <SelectItem value="OPPORTUNITY">Fırsat</SelectItem>
                    <SelectItem value="THREAT">Tehdit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Başlık *</Label>
              <Input
                value={itemForm.title}
                onChange={(e) => setItemForm({ ...itemForm, title: e.target.value })}
                placeholder="Öğe başlığı"
              />
            </div>
            <div>
              <Label>Açıklama</Label>
              <Textarea
                value={itemForm.description}
                onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                placeholder="Detaylı açıklama"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Etki Düzeyi (1-5)</Label>
                <Select value={String(itemForm.impact)} onValueChange={(v) => setItemForm({ ...itemForm, impact: parseInt(v) })}>
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
                <Label>Sorumlu</Label>
                <Select 
                  value={itemForm.responsibleId || "none"} 
                  onValueChange={(v) => setItemForm({ ...itemForm, responsibleId: v === "none" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sorumlu seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Seçilmedi</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} {user.surname || ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="border-t pt-4 mt-4">
              <h4 className="font-medium mb-3">Süreç İlişkilendirme</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Ana Süreç</Label>
                  <Input
                    value={itemForm.processName}
                    onChange={(e) => setItemForm({ ...itemForm, processName: e.target.value })}
                    placeholder="Örn: Müşteri Hizmetleri"
                  />
                </div>
                <div>
                  <Label>Alt Süreç</Label>
                  <Input
                    value={itemForm.subProcessName}
                    onChange={(e) => setItemForm({ ...itemForm, subProcessName: e.target.value })}
                    placeholder="Örn: Şikayet Yönetimi"
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-4 mt-4">
              <h4 className="font-medium mb-3">Tarih Aralığı</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Başlangıç Tarihi</Label>
                  <Input
                    type="date"
                    value={itemForm.startDate}
                    onChange={(e) => setItemForm({ ...itemForm, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Bitiş Tarihi</Label>
                  <Input
                    type="date"
                    value={itemForm.endDate}
                    onChange={(e) => setItemForm({ ...itemForm, endDate: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div>
              <Label>Aksiyon Notu</Label>
              <Textarea
                value={itemForm.actionNote}
                onChange={(e) => setItemForm({ ...itemForm, actionNote: e.target.value })}
                placeholder="Bu madde için alınacak aksiyonlar veya iyileştirme notları..."
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsItemDialogOpen(false)}>İptal</Button>
              <Button onClick={handleSaveItem} disabled={savingItem}>
                {savingItem ? 'Kaydediliyor...' : 'Kaydet'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Strategy Dialog */}
      <Dialog open={isStrategyDialogOpen} onOpenChange={setIsStrategyDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Yeni Strateji Ekle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>Strateji Tipi</Label>
              <Select value={strategyForm.type} onValueChange={(v) => setStrategyForm({ ...strategyForm, type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SO">SO - Güçlü-Fırsat</SelectItem>
                  <SelectItem value="WO">WO - Zayıf-Fırsat</SelectItem>
                  <SelectItem value="ST">ST - Güçlü-Tehdit</SelectItem>
                  <SelectItem value="WT">WT - Zayıf-Tehdit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Strateji Başlığı *</Label>
              <Input
                value={strategyForm.title}
                onChange={(e) => setStrategyForm({ ...strategyForm, title: e.target.value })}
                placeholder="Strateji önerisi"
              />
            </div>
            <div>
              <Label>Açıklama</Label>
              <Textarea
                value={strategyForm.description}
                onChange={(e) => setStrategyForm({ ...strategyForm, description: e.target.value })}
                placeholder="Detaylı açıklama"
                rows={3}
              />
            </div>
            {(strategyForm.type === 'SO' || strategyForm.type === 'ST') && (
              <div>
                <Label>İlgili Güçlü Yön</Label>
                <Select value={strategyForm.strengthId} onValueChange={(v) => setStrategyForm({ ...strategyForm, strengthId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seçin (opsiyonel)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Seçilmedi</SelectItem>
                    {study.categorizedItems.strengths.map((item) => (
                      <SelectItem key={item.id} value={item.id}>{item.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {(strategyForm.type === 'WO' || strategyForm.type === 'WT') && (
              <div>
                <Label>İlgili Zayıf Yön</Label>
                <Select value={strategyForm.weaknessId} onValueChange={(v) => setStrategyForm({ ...strategyForm, weaknessId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seçin (opsiyonel)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Seçilmedi</SelectItem>
                    {study.categorizedItems.weaknesses.map((item) => (
                      <SelectItem key={item.id} value={item.id}>{item.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {(strategyForm.type === 'SO' || strategyForm.type === 'WO') && (
              <div>
                <Label>İlgili Fırsat</Label>
                <Select value={strategyForm.opportunityId} onValueChange={(v) => setStrategyForm({ ...strategyForm, opportunityId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seçin (opsiyonel)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Seçilmedi</SelectItem>
                    {study.categorizedItems.opportunities.map((item) => (
                      <SelectItem key={item.id} value={item.id}>{item.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {(strategyForm.type === 'ST' || strategyForm.type === 'WT') && (
              <div>
                <Label>İlgili Tehdit</Label>
                <Select value={strategyForm.threatId} onValueChange={(v) => setStrategyForm({ ...strategyForm, threatId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seçin (opsiyonel)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Seçilmedi</SelectItem>
                    {study.categorizedItems.threats.map((item) => (
                      <SelectItem key={item.id} value={item.id}>{item.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Stratejik Hedef Bağlantısı</Label>
              <Select value={strategyForm.goalId} onValueChange={(v) => setStrategyForm({ ...strategyForm, goalId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Seçin (opsiyonel)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Seçilmedi</SelectItem>
                  {goals.map((goal) => (
                    <SelectItem key={goal.id} value={goal.id}>{goal.code}: {goal.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Bu stratejiyi bir stratejik hedefle ilişkilendirin</p>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsStrategyDialogOpen(false)}>İptal</Button>
              <Button onClick={handleSaveStrategy} disabled={savingStrategy}>
                {savingStrategy ? 'Kaydediliyor...' : 'Kaydet'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Link Panel Dialog */}
      <Dialog open={!!selectedItemForLink} onOpenChange={(open) => !open && setSelectedItemForLink(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link className="h-5 w-5" />
              Hedef ve Aksiyon Bağlantıları
            </DialogTitle>
          </DialogHeader>
          {selectedItemForLink && (
            <SWOTLinkPanel
              studyId={id}
              item={selectedItemForLink}
              onClose={() => setSelectedItemForLink(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
