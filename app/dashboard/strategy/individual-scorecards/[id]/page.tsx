'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Calculator, Send, CheckCircle, XCircle, User, Target, Award, Lightbulb, Building2, PieChart, Plus, Trash2, Edit, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ResponsiveContainer, RadialBarChart, RadialBar, Legend, PieChart as RechartsPie, Pie, Cell } from 'recharts';

interface ScorecardDetail {
  id: string;
  code: string;
  year: number;
  period?: number;
  periodType: string;
  kpiScore?: number;
  kpiDetails?: any[];
  competencyScore?: number;
  competencyDetails?: any[];
  initiativeScore?: number;
  initiativeDetails?: any[];
  corporateScore?: number;
  departmentScore?: number;
  dimensionScore?: number;
  totalScore?: number;
  scoreLevel?: string;
  status: string;
  rejectionReason?: string;
  notes?: string;
  user: {
    id: string;
    name: string;
    surname?: string;
    email: string;
    department?: { name: string };
    position?: { name: string };
  };
  formula?: {
    name: string;
    kpiWeight: number;
    competencyWeight: number;
    initiativeWeight: number;
    corporateWeight: number;
    departmentWeight: number;
    scale?: { levels: any[] };
  };
  createdBy: { name: string };
  createdAt: string;
  submittedBy?: { name: string };
  submittedAt?: string;
  approvedBy?: { name: string };
  approvedAt?: string;
}

interface PersonnelKPI {
  id: string;
  kpiId: string;
  kpi: { id: string; name: string; targetValue: number; unit: string };
  weight: number;
  targetValue?: number;
  actualValue?: number;
  performance?: number;
  score?: number;
  status: string;
}

interface PersonnelCompetency {
  id: string;
  competencyId: string;
  competency: { id: string; name: string };
  weight: number;
  currentLevel: number;
  targetLevel?: number;
  score?: number;
  status: string;
}

interface PersonnelInitiative {
  id: string;
  initiativeId: string;
  initiative: { id: string; name: string };
  role: string;
  weight: number;
  score?: number;
  performance?: number;
  status: string;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  TASLAK: { label: 'Taslak', color: 'bg-gray-500' },
  HESAPLANDI: { label: 'Hesaplandı', color: 'bg-blue-500' },
  BEKLEMEDE: { label: 'Onay Bekliyor', color: 'bg-yellow-500' },
  ONAYLANDI: { label: 'Onaylandı', color: 'bg-green-500' },
  REDDEDILDI: { label: 'Reddedildi', color: 'bg-red-500' },
};

const COLORS = ['#22C55E', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function ScorecardDetailPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const [scorecard, setScorecard] = useState<ScorecardDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // KPI State
  const [personnelKPIs, setPersonnelKPIs] = useState<PersonnelKPI[]>([]);
  const [allKPIs, setAllKPIs] = useState<any[]>([]);
  const [kpiDialogOpen, setKpiDialogOpen] = useState(false);
  const [editKpiDialogOpen, setEditKpiDialogOpen] = useState(false);
  const [selectedKpi, setSelectedKpi] = useState<PersonnelKPI | null>(null);
  const [kpiForm, setKpiForm] = useState({ kpiId: '', weight: '1', targetValue: '' });

  // Competency State
  const [personnelCompetencies, setPersonnelCompetencies] = useState<PersonnelCompetency[]>([]);
  const [allCompetencies, setAllCompetencies] = useState<any[]>([]);
  const [competencyDialogOpen, setCompetencyDialogOpen] = useState(false);
  const [editCompDialogOpen, setEditCompDialogOpen] = useState(false);
  const [selectedComp, setSelectedComp] = useState<PersonnelCompetency | null>(null);
  const [compForm, setCompForm] = useState({ competencyId: '', weight: '1', currentLevel: '3', targetLevel: '4' });

  // Initiative State
  const [personnelInitiatives, setPersonnelInitiatives] = useState<PersonnelInitiative[]>([]);
  const [allInitiatives, setAllInitiatives] = useState<any[]>([]);
  const [initiativeDialogOpen, setInitiativeDialogOpen] = useState(false);
  const [editInitDialogOpen, setEditInitDialogOpen] = useState(false);
  const [selectedInit, setSelectedInit] = useState<PersonnelInitiative | null>(null);
  const [initForm, setInitForm] = useState({ initiativeId: '', role: 'UYE', weight: '1' });

  const fetchScorecard = async () => {
    try {
      const res = await fetch(`/api/individual-scorecards/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setScorecard(data);
        if (data.userId) {
          fetchPersonnelKPIs(data.userId, data.year);
          fetchPersonnelCompetencies(data.userId, data.year);
          fetchPersonnelInitiatives(data.userId);
        }
      } else {
        toast.error('Karne bulunamadı');
        router.push('/dashboard/strategy/individual-scorecards');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const fetchPersonnelKPIs = async (userId: string, year: number) => {
    try {
      const res = await fetch(`/api/personnel-kpis?userId=${userId}&year=${year}`);
      if (res.ok) {
        const data = await res.json();
        setPersonnelKPIs(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('PersonnelKPIs fetch error:', error);
    }
  };

  const fetchPersonnelCompetencies = async (userId: string, year: number) => {
    try {
      const res = await fetch(`/api/personnel-competencies?userId=${userId}&year=${year}`);
      if (res.ok) {
        const data = await res.json();
        setPersonnelCompetencies(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('PersonnelCompetencies fetch error:', error);
    }
  };

  const fetchPersonnelInitiatives = async (userId: string) => {
    try {
      const res = await fetch(`/api/personnel-initiatives?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setPersonnelInitiatives(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('PersonnelInitiatives fetch error:', error);
    }
  };

  const fetchAllKPIs = async () => {
    try {
      const res = await fetch('/api/kpis?status=AKTIF');
      if (res.ok) {
        const data = await res.json();
        setAllKPIs(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('KPIs fetch error:', error);
    }
  };

  const fetchAllCompetencies = async () => {
    try {
      const res = await fetch('/api/competencies?status=AKTIF');
      if (res.ok) {
        const data = await res.json();
        setAllCompetencies(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Competencies fetch error:', error);
    }
  };

  const fetchAllInitiatives = async () => {
    try {
      const res = await fetch('/api/initiatives?status=AKTIF');
      if (res.ok) {
        const data = await res.json();
        setAllInitiatives(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Initiatives fetch error:', error);
    }
  };

  useEffect(() => {
    if (params.id) {
      fetchScorecard();
      fetchAllKPIs();
      fetchAllCompetencies();
      fetchAllInitiatives();
    }
  }, [params.id]);

  const handleAction = async (action: string) => {
    try {
      const res = await fetch(`/api/individual-scorecards/${params.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (res.ok) {
        const actionLabels: Record<string, string> = {
          calculate: 'Karne hesaplandı',
          submit: 'Karne onaya gönderildi',
          approve: 'Karne onaylandı',
          reject: 'Karne reddedildi',
        };
        toast.success(actionLabels[action] || 'İşlem başarılı');
        fetchScorecard();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Bir hata oluştu');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    }
  };

  // KPI Handlers
  const handleAddKPI = async () => {
    if (!kpiForm.kpiId || !scorecard) return;
    try {
      const res = await fetch('/api/personnel-kpis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kpiId: kpiForm.kpiId,
          userId: scorecard.user.id,
          year: scorecard.year,
          weight: parseFloat(kpiForm.weight) || 1,
          targetValue: kpiForm.targetValue ? parseFloat(kpiForm.targetValue) : null,
        }),
      });
      if (res.ok) {
        toast.success('KPI atandı');
        setKpiDialogOpen(false);
        setKpiForm({ kpiId: '', weight: '1', targetValue: '' });
        fetchPersonnelKPIs(scorecard.user.id, scorecard.year);
      } else {
        const err = await res.json();
        toast.error(err.error || 'KPI atanamadı');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    }
  };

  const handleUpdateKPI = async () => {
    if (!selectedKpi) return;
    try {
      const res = await fetch(`/api/personnel-kpis/${selectedKpi.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weight: parseFloat(kpiForm.weight) || 1,
          targetValue: kpiForm.targetValue ? parseFloat(kpiForm.targetValue) : null,
        }),
      });
      if (res.ok) {
        toast.success('KPI güncellendi');
        setEditKpiDialogOpen(false);
        setSelectedKpi(null);
        if (scorecard) fetchPersonnelKPIs(scorecard.user.id, scorecard.year);
      } else {
        toast.error('KPI güncellenemedi');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    }
  };

  const handleDeleteKPI = async (id: string) => {
    if (!confirm('Bu KPI atamasını silmek istediğinize emin misiniz?')) return;
    try {
      const res = await fetch(`/api/personnel-kpis/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('KPI ataması silindi');
        if (scorecard) fetchPersonnelKPIs(scorecard.user.id, scorecard.year);
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    }
  };

  // Competency Handlers
  const handleAddCompetency = async () => {
    if (!compForm.competencyId || !scorecard) return;
    try {
      const res = await fetch('/api/personnel-competencies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          competencyId: compForm.competencyId,
          userId: scorecard.user.id,
          year: scorecard.year,
          weight: parseFloat(compForm.weight) || 1,
          currentLevel: parseInt(compForm.currentLevel) || 3,
          targetLevel: parseInt(compForm.targetLevel) || 4,
        }),
      });
      if (res.ok) {
        toast.success('Yetkinlik atandı');
        setCompetencyDialogOpen(false);
        setCompForm({ competencyId: '', weight: '1', currentLevel: '3', targetLevel: '4' });
        fetchPersonnelCompetencies(scorecard.user.id, scorecard.year);
      } else {
        const err = await res.json();
        toast.error(err.error || 'Yetkinlik atanamadı');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    }
  };

  const handleUpdateCompetency = async () => {
    if (!selectedComp) return;
    try {
      const res = await fetch(`/api/personnel-competencies/${selectedComp.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weight: parseFloat(compForm.weight) || 1,
          currentLevel: parseInt(compForm.currentLevel) || 3,
          targetLevel: parseInt(compForm.targetLevel) || 4,
        }),
      });
      if (res.ok) {
        toast.success('Yetkinlik güncellendi');
        setEditCompDialogOpen(false);
        setSelectedComp(null);
        if (scorecard) fetchPersonnelCompetencies(scorecard.user.id, scorecard.year);
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    }
  };

  const handleDeleteCompetency = async (id: string) => {
    if (!confirm('Bu yetkinlik atamasını silmek istediğinize emin misiniz?')) return;
    try {
      const res = await fetch(`/api/personnel-competencies/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Yetkinlik ataması silindi');
        if (scorecard) fetchPersonnelCompetencies(scorecard.user.id, scorecard.year);
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    }
  };

  // Initiative Handlers
  const handleAddInitiative = async () => {
    if (!initForm.initiativeId || !scorecard) return;
    try {
      const res = await fetch('/api/personnel-initiatives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initiativeId: initForm.initiativeId,
          userId: scorecard.user.id,
          role: initForm.role,
          weight: parseFloat(initForm.weight) || 1,
        }),
      });
      if (res.ok) {
        toast.success('Proje atandı');
        setInitiativeDialogOpen(false);
        setInitForm({ initiativeId: '', role: 'UYE', weight: '1' });
        fetchPersonnelInitiatives(scorecard.user.id);
      } else {
        const err = await res.json();
        toast.error(err.error || 'Proje atanamadı');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    }
  };

  const handleUpdateInitiative = async () => {
    if (!selectedInit) return;
    try {
      const res = await fetch(`/api/personnel-initiatives/${selectedInit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: initForm.role,
          weight: parseFloat(initForm.weight) || 1,
        }),
      });
      if (res.ok) {
        toast.success('Proje güncellendi');
        setEditInitDialogOpen(false);
        setSelectedInit(null);
        if (scorecard) fetchPersonnelInitiatives(scorecard.user.id);
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    }
  };

  const handleDeleteInitiative = async (id: string) => {
    if (!confirm('Bu proje atamasını silmek istediğinize emin misiniz?')) return;
    try {
      const res = await fetch(`/api/personnel-initiatives/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Proje ataması silindi');
        if (scorecard) fetchPersonnelInitiatives(scorecard.user.id);
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    }
  };

  const getScoreColor = (score?: number) => {
    if (!score) return 'text-gray-400';
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const openEditKpiDialog = (pk: PersonnelKPI) => {
    setSelectedKpi(pk);
    setKpiForm({
      kpiId: pk.kpiId,
      weight: pk.weight?.toString() || '1',
      targetValue: pk.targetValue?.toString() || '',
    });
    setEditKpiDialogOpen(true);
  };

  const openEditCompDialog = (pc: PersonnelCompetency) => {
    setSelectedComp(pc);
    setCompForm({
      competencyId: pc.competencyId,
      weight: pc.weight?.toString() || '1',
      currentLevel: pc.currentLevel?.toString() || '3',
      targetLevel: pc.targetLevel?.toString() || '4',
    });
    setEditCompDialogOpen(true);
  };

  const openEditInitDialog = (pi: PersonnelInitiative) => {
    setSelectedInit(pi);
    setInitForm({
      initiativeId: pi.initiativeId,
      role: pi.role || 'UYE',
      weight: pi.weight?.toString() || '1',
    });
    setEditInitDialogOpen(true);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Yükleniyor...</div>;
  }

  if (!scorecard) {
    return null;
  }

  const canEdit = scorecard.status !== 'ONAYLANDI';
  const canCalculate = scorecard.status !== 'ONAYLANDI' && scorecard.status !== 'BEKLEMEDE';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Geri
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Bireysel Karne</h1>
            <p className="text-muted-foreground">{scorecard.code}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={statusLabels[scorecard.status]?.color || 'bg-gray-500'}>
            {statusLabels[scorecard.status]?.label || scorecard.status}
          </Badge>
          {canCalculate && (
            <Button onClick={() => handleAction('calculate')}>
              <RefreshCw className="h-4 w-4 mr-2" /> {scorecard.status === 'HESAPLANDI' ? 'Tekrar Hesapla' : 'Hesapla'}
            </Button>
          )}
          {scorecard.status === 'HESAPLANDI' && (
            <Button onClick={() => handleAction('submit')}>
              <Send className="h-4 w-4 mr-2" /> Onaya Gönder
            </Button>
          )}
          {scorecard.status === 'BEKLEMEDE' && (
            <>
              <Button variant="outline" onClick={() => handleAction('reject')}>
                <XCircle className="h-4 w-4 mr-2" /> Reddet
              </Button>
              <Button onClick={() => handleAction('approve')}>
                <CheckCircle className="h-4 w-4 mr-2" /> Onayla
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Personel Bilgisi ve Özet */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="h-4 w-4" /> Personel Bilgileri
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <p className="font-medium">{scorecard.user.name} {scorecard.user.surname}</p>
                <p className="text-sm text-muted-foreground">{scorecard.user.email}</p>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline">{scorecard.user.department?.name}</Badge>
                <Badge variant="secondary">{scorecard.user.position?.name}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Dönem</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{scorecard.year}</div>
            <p className="text-muted-foreground">
              {scorecard.periodType === 'YILLIK' ? 'Yıllık Değerlendirme' : 
               scorecard.periodType === 'CEYREKLIK' ? `${scorecard.period}. Çeyrek` :
               scorecard.periodType === 'YARIYILLIK' ? `${scorecard.period}. Yarıyıl` : scorecard.periodType}
            </p>
            {scorecard.formula && (
              <p className="text-xs text-muted-foreground mt-2">Formül: {scorecard.formula.name}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Toplam Puan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-4xl font-bold ${getScoreColor(scorecard.totalScore)}`}>
              {scorecard.totalScore?.toFixed(1) || '-'}
            </div>
            {scorecard.scoreLevel && (
              <Badge variant="outline" className="mt-2">{scorecard.scoreLevel}</Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Red Nedeni */}
      {scorecard.status === 'REDDEDILDI' && scorecard.rejectionReason && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <p className="text-red-700">
              <strong>Red Nedeni:</strong> {scorecard.rejectionReason}
            </p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="dimensions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dimensions">3 Boyutlu Performans</TabsTrigger>
          <TabsTrigger value="kpi">KPI Atamaları ({personnelKPIs.length})</TabsTrigger>
          <TabsTrigger value="competency">Yetkinlik Atamaları ({personnelCompetencies.length})</TabsTrigger>
          <TabsTrigger value="initiative">Proje Atamaları ({personnelInitiatives.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="dimensions">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" /> 3 Boyutlu Performans
                </CardTitle>
                <CardDescription>
                  {scorecard.formula && `KPI %${scorecard.formula.kpiWeight} + Yetkinlik %${scorecard.formula.competencyWeight} + Proje %${scorecard.formula.initiativeWeight}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-blue-500" /> KPI Puanı
                      </span>
                      <span className={`font-bold ${getScoreColor(scorecard.kpiScore)}`}>
                        {scorecard.kpiScore?.toFixed(1) || '-'}
                      </span>
                    </div>
                    <Progress value={scorecard.kpiScore || 0} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="flex items-center gap-2">
                        <Award className="h-4 w-4 text-green-500" /> Yetkinlik Puanı
                      </span>
                      <span className={`font-bold ${getScoreColor(scorecard.competencyScore)}`}>
                        {scorecard.competencyScore?.toFixed(1) || '-'}
                      </span>
                    </div>
                    <Progress value={scorecard.competencyScore || 0} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-yellow-500" /> Proje Puanı
                      </span>
                      <span className={`font-bold ${getScoreColor(scorecard.initiativeScore)}`}>
                        {scorecard.initiativeScore?.toFixed(1) || '-'}
                      </span>
                    </div>
                    <Progress value={scorecard.initiativeScore || 0} className="h-2" />
                  </div>
                  <hr />
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="font-medium">Boyut Puanı (Ağırlıklı)</span>
                      <span className={`font-bold ${getScoreColor(scorecard.dimensionScore)}`}>
                        {scorecard.dimensionScore?.toFixed(1) || '-'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" /> Organizasyonel Etki
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span>Kurum Karnesi</span>
                      <span className="font-bold">{scorecard.corporateScore?.toFixed(1) || '-'}</span>
                    </div>
                    <Progress value={scorecard.corporateScore || 0} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span>Departman Karnesi</span>
                      <span className="font-bold">{scorecard.departmentScore?.toFixed(1) || '-'}</span>
                    </div>
                    <Progress value={scorecard.departmentScore || 0} className="h-2" />
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t text-center">
                  <p className="text-sm text-muted-foreground">NİHAİ TOPLAM PUAN</p>
                  <div className={`text-5xl font-bold ${getScoreColor(scorecard.totalScore)}`}>
                    {scorecard.totalScore?.toFixed(1) || '-'}
                  </div>
                  {scorecard.scoreLevel && <Badge className="mt-2" variant="outline">{scorecard.scoreLevel}</Badge>}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* KPI Tab */}
        <TabsContent value="kpi">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>KPI Atamaları</CardTitle>
                <CardDescription>Personele atanan KPI'lar ve performansları</CardDescription>
              </div>
              {canEdit && (
                <Button onClick={() => setKpiDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" /> KPI Ata
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {personnelKPIs.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>KPI</TableHead>
                      <TableHead className="text-right">Ağırlık</TableHead>
                      <TableHead className="text-right">Hedef</TableHead>
                      <TableHead className="text-right">Gerçekleşen</TableHead>
                      <TableHead className="text-right">Performans (%)</TableHead>
                      <TableHead className="text-right">Puan</TableHead>
                      <TableHead>Durum</TableHead>
                      {canEdit && <TableHead className="text-right">İşlemler</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {personnelKPIs.map((pk) => (
                      <TableRow key={pk.id}>
                        <TableCell>{pk.kpi?.name}</TableCell>
                        <TableCell className="text-right">{pk.weight}</TableCell>
                        <TableCell className="text-right">{pk.targetValue || pk.kpi?.targetValue || '-'}</TableCell>
                        <TableCell className="text-right">{pk.actualValue?.toFixed(2) || '-'}</TableCell>
                        <TableCell className="text-right">{pk.performance?.toFixed(1) || '-'}</TableCell>
                        <TableCell className="text-right font-bold">{pk.score?.toFixed(1) || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={pk.status === 'AKTIF' ? 'default' : 'secondary'}>
                            {pk.status === 'AKTIF' ? 'Aktif' : pk.status === 'IPTAL' ? 'İptal' : pk.status}
                          </Badge>
                        </TableCell>
                        {canEdit && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => openEditKpiDialog(pk)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteKPI(pk.id)}>
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center py-8 text-muted-foreground">Henüz KPI atanmamış. Yukarıdaki "KPI Ata" butonu ile KPI ekleyin.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Competency Tab */}
        <TabsContent value="competency">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Yetkinlik Atamaları</CardTitle>
                <CardDescription>Personel yetkinlik değerlendirmeleri</CardDescription>
              </div>
              {canEdit && (
                <Button onClick={() => setCompetencyDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" /> Yetkinlik Ata
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {personnelCompetencies.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Yetkinlik</TableHead>
                      <TableHead className="text-right">Ağırlık</TableHead>
                      <TableHead className="text-right">Mevcut Seviye</TableHead>
                      <TableHead className="text-right">Hedef Seviye</TableHead>
                      <TableHead className="text-right">Puan</TableHead>
                      <TableHead>Durum</TableHead>
                      {canEdit && <TableHead className="text-right">İşlemler</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {personnelCompetencies.map((pc) => (
                      <TableRow key={pc.id}>
                        <TableCell>{pc.competency?.name}</TableCell>
                        <TableCell className="text-right">{pc.weight}</TableCell>
                        <TableCell className="text-right">{pc.currentLevel}</TableCell>
                        <TableCell className="text-right">{pc.targetLevel || '-'}</TableCell>
                        <TableCell className="text-right font-bold">{pc.score?.toFixed(1) || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={pc.status === 'ONAYLANDI' ? 'default' : 'secondary'}>
                            {pc.status === 'ONAYLANDI' ? 'Onaylı' : pc.status === 'TASLAK' ? 'Taslak' : pc.status}
                          </Badge>
                        </TableCell>
                        {canEdit && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => openEditCompDialog(pc)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteCompetency(pc.id)}>
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center py-8 text-muted-foreground">Henüz yetkinlik atanmamış. Yukarıdaki "Yetkinlik Ata" butonu ile yetkinlik ekleyin.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Initiative Tab */}
        <TabsContent value="initiative">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Proje Atamaları</CardTitle>
                <CardDescription>Personelin dahil olduğu projeler ve puanları</CardDescription>
              </div>
              {canEdit && (
                <Button onClick={() => setInitiativeDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" /> Proje Ata
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {personnelInitiatives.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Proje</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead className="text-right">Ağırlık</TableHead>
                      <TableHead className="text-right">Performans (%)</TableHead>
                      <TableHead className="text-right">Puan</TableHead>
                      <TableHead>Durum</TableHead>
                      {canEdit && <TableHead className="text-right">İşlemler</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {personnelInitiatives.map((pi) => (
                      <TableRow key={pi.id}>
                        <TableCell>{pi.initiative?.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {pi.role === 'LIDER' ? 'Lider' : pi.role === 'UYE' ? 'Üye' : 'Destekçi'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{pi.weight}</TableCell>
                        <TableCell className="text-right">{pi.performance?.toFixed(1) || '-'}</TableCell>
                        <TableCell className="text-right font-bold">{pi.score?.toFixed(1) || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={pi.status === 'TAMAMLANDI' ? 'default' : 'secondary'}>
                            {pi.status === 'TAMAMLANDI' ? 'Tamamlandı' : pi.status === 'DEVAM_EDIYOR' ? 'Devam Ediyor' : pi.status}
                          </Badge>
                        </TableCell>
                        {canEdit && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => openEditInitDialog(pi)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteInitiative(pi.id)}>
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center py-8 text-muted-foreground">Henüz proje atanmamış. Yukarıdaki "Proje Ata" butonu ile proje ekleyin.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* KPI Ata Dialog */}
      <Dialog open={kpiDialogOpen} onOpenChange={setKpiDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>KPI Ata</DialogTitle>
            <DialogDescription>Personele KPI atayın</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>KPI *</Label>
              <Select value={kpiForm.kpiId || 'none'} onValueChange={(v) => setKpiForm({ ...kpiForm, kpiId: v === 'none' ? '' : v })}>
                <SelectTrigger>
                  <SelectValue placeholder="KPI seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">KPI seçin</SelectItem>
                  {allKPIs.filter(k => !personnelKPIs.some(pk => pk.kpiId === k.id)).map((k) => (
                    <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Ağırlık</Label>
                <Input type="number" step="0.1" value={kpiForm.weight} onChange={(e) => setKpiForm({ ...kpiForm, weight: e.target.value })} />
              </div>
              <div>
                <Label>Özel Hedef (opsiyonel)</Label>
                <Input type="number" step="0.01" value={kpiForm.targetValue} onChange={(e) => setKpiForm({ ...kpiForm, targetValue: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setKpiDialogOpen(false)}>İptal</Button>
            <Button onClick={handleAddKPI}>Ata</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* KPI Düzenle Dialog */}
      <Dialog open={editKpiDialogOpen} onOpenChange={setEditKpiDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>KPI Düzenle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>KPI</Label>
              <Input disabled value={selectedKpi?.kpi?.name || ''} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Ağırlık</Label>
                <Input type="number" step="0.1" value={kpiForm.weight} onChange={(e) => setKpiForm({ ...kpiForm, weight: e.target.value })} />
              </div>
              <div>
                <Label>Özel Hedef</Label>
                <Input type="number" step="0.01" value={kpiForm.targetValue} onChange={(e) => setKpiForm({ ...kpiForm, targetValue: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditKpiDialogOpen(false)}>İptal</Button>
            <Button onClick={handleUpdateKPI}>Güncelle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Yetkinlik Ata Dialog */}
      <Dialog open={competencyDialogOpen} onOpenChange={setCompetencyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yetkinlik Ata</DialogTitle>
            <DialogDescription>Personele yetkinlik atayın</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Yetkinlik *</Label>
              <Select value={compForm.competencyId || 'none'} onValueChange={(v) => setCompForm({ ...compForm, competencyId: v === 'none' ? '' : v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Yetkinlik seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Yetkinlik seçin</SelectItem>
                  {allCompetencies.filter(c => !personnelCompetencies.some(pc => pc.competencyId === c.id)).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Ağırlık</Label>
                <Input type="number" step="0.1" value={compForm.weight} onChange={(e) => setCompForm({ ...compForm, weight: e.target.value })} />
              </div>
              <div>
                <Label>Mevcut Seviye</Label>
                <Select value={compForm.currentLevel} onValueChange={(v) => setCompForm({ ...compForm, currentLevel: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map(l => <SelectItem key={l} value={l.toString()}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Hedef Seviye</Label>
                <Select value={compForm.targetLevel} onValueChange={(v) => setCompForm({ ...compForm, targetLevel: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map(l => <SelectItem key={l} value={l.toString()}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompetencyDialogOpen(false)}>İptal</Button>
            <Button onClick={handleAddCompetency}>Ata</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Yetkinlik Düzenle Dialog */}
      <Dialog open={editCompDialogOpen} onOpenChange={setEditCompDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yetkinlik Düzenle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Yetkinlik</Label>
              <Input disabled value={selectedComp?.competency?.name || ''} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Ağırlık</Label>
                <Input type="number" step="0.1" value={compForm.weight} onChange={(e) => setCompForm({ ...compForm, weight: e.target.value })} />
              </div>
              <div>
                <Label>Mevcut Seviye</Label>
                <Select value={compForm.currentLevel} onValueChange={(v) => setCompForm({ ...compForm, currentLevel: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map(l => <SelectItem key={l} value={l.toString()}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Hedef Seviye</Label>
                <Select value={compForm.targetLevel} onValueChange={(v) => setCompForm({ ...compForm, targetLevel: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map(l => <SelectItem key={l} value={l.toString()}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCompDialogOpen(false)}>İptal</Button>
            <Button onClick={handleUpdateCompetency}>Güncelle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Proje Ata Dialog */}
      <Dialog open={initiativeDialogOpen} onOpenChange={setInitiativeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Proje Ata</DialogTitle>
            <DialogDescription>Personele proje atayın</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Proje *</Label>
              <Select value={initForm.initiativeId || 'none'} onValueChange={(v) => setInitForm({ ...initForm, initiativeId: v === 'none' ? '' : v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Proje seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Proje seçin</SelectItem>
                  {allInitiatives.filter(i => !personnelInitiatives.some(pi => pi.initiativeId === i.id)).map((i) => (
                    <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Rol</Label>
                <Select value={initForm.role} onValueChange={(v) => setInitForm({ ...initForm, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LIDER">Lider</SelectItem>
                    <SelectItem value="UYE">Üye</SelectItem>
                    <SelectItem value="DESTEKCI">Destekçi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Ağırlık</Label>
                <Input type="number" step="0.1" value={initForm.weight} onChange={(e) => setInitForm({ ...initForm, weight: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInitiativeDialogOpen(false)}>İptal</Button>
            <Button onClick={handleAddInitiative}>Ata</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Proje Düzenle Dialog */}
      <Dialog open={editInitDialogOpen} onOpenChange={setEditInitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Proje Düzenle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Proje</Label>
              <Input disabled value={selectedInit?.initiative?.name || ''} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Rol</Label>
                <Select value={initForm.role} onValueChange={(v) => setInitForm({ ...initForm, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LIDER">Lider</SelectItem>
                    <SelectItem value="UYE">Üye</SelectItem>
                    <SelectItem value="DESTEKCI">Destekçi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Ağırlık</Label>
                <Input type="number" step="0.1" value={initForm.weight} onChange={(e) => setInitForm({ ...initForm, weight: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditInitDialogOpen(false)}>İptal</Button>
            <Button onClick={handleUpdateInitiative}>Güncelle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
