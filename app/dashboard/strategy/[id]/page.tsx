'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Edit2,
  Target,
  Flag,
  CheckSquare,
  ArrowLeft,
  Users,
  Building2,
  BarChart3,
  AlertTriangle,
  Trash2,
  Link2,
  Download,
  FileSpreadsheet,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { exportStrategyTree, exportStrategyToExcel } from '@/lib/export-utils';
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
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

const statusLabels: Record<string, { label: string; color: string }> = {
  TASLAK: { label: 'Taslak', color: 'bg-gray-500' },
  AKTIF: { label: 'Aktif', color: 'bg-green-500' },
  IZLEMEDE: { label: 'İzlemede', color: 'bg-blue-500' },
  TAMAMLANDI: { label: 'Tamamlandı', color: 'bg-emerald-500' },
  IPTAL: { label: 'İptal', color: 'bg-red-500' },
};

const actionStatusLabels: Record<string, { label: string; color: string }> = {
  PLANLANDI: { label: 'Planlandı', color: 'bg-gray-500' },
  DEVAM_EDIYOR: { label: 'Devam Ediyor', color: 'bg-blue-500' },
  BLOKAJ: { label: 'Blokaj', color: 'bg-red-500' },
  TAMAMLANDI: { label: 'Tamamlandı', color: 'bg-green-500' },
  IPTAL: { label: 'İptal', color: 'bg-gray-400' },
};

const priorityLabels: Record<string, { label: string; color: string }> = {
  DUSUK: { label: 'Düşük', color: 'bg-gray-500' },
  ORTA: { label: 'Orta', color: 'bg-blue-500' },
  YUKSEK: { label: 'Yüksek', color: 'bg-orange-500' },
  KRITIK: { label: 'Kritik', color: 'bg-red-500' },
};

const perspectiveColors: Record<string, string> = {
  FIN: 'border-l-green-500 bg-green-50',
  MUS: 'border-l-blue-500 bg-blue-50',
  SUR: 'border-l-amber-500 bg-amber-50',
  OGR: 'border-l-purple-500 bg-purple-50',
};

export default function StrategyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [period, setPeriod] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any[]>([]);
  const [risks, setRisks] = useState<any[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('tree');

  // Dialog states
  const [objectiveDialogOpen, setObjectiveDialogOpen] = useState(false);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [subGoalDialogOpen, setSubGoalDialogOpen] = useState(false);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [linkKPIDialogOpen, setLinkKPIDialogOpen] = useState(false);
  const [linkRiskDialogOpen, setLinkRiskDialogOpen] = useState(false);
  const [linkSubGoalRiskDialogOpen, setLinkSubGoalRiskDialogOpen] = useState(false);
  const [linkActionRiskDialogOpen, setLinkActionRiskDialogOpen] = useState(false);
  const [linkSubGoalKPIDialogOpen, setLinkSubGoalKPIDialogOpen] = useState(false);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [missionVisionDialogOpen, setMissionVisionDialogOpen] = useState(false);

  // Form states
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string | null>(null);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [selectedSubGoalId, setSelectedSubGoalId] = useState<string | null>(null);
  const [selectedPerspectiveId, setSelectedPerspectiveId] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({});

  // Departman dağılımı
  const [deptDistribution, setDeptDistribution] = useState<any>({ distribution: [], summary: {} });
  const [deptDistLoading, setDeptDistLoading] = useState(false);
  
  // Period status değişikliği
  const [statusChanging, setStatusChanging] = useState(false);
  
  // İlerleme yeniden hesaplama
  const [recalculating, setRecalculating] = useState(false);

  // Multi-select department dropdown
  const [deptDropdownOpen, setDeptDropdownOpen] = useState(false);
  const deptDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (deptDropdownRef.current && !deptDropdownRef.current.contains(event.target as Node)) {
        setDeptDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDepartmentSelection = (deptId: string) => {
    const current: string[] = formData.departmentIds || [];
    const updated = current.includes(deptId)
      ? current.filter((id: string) => id !== deptId)
      : [...current, deptId];
    setFormData({ ...formData, departmentIds: updated });
  };

  const getDepartmentNames = (deptIds: string[] | undefined) => {
    if (!deptIds || deptIds.length === 0) return '';
    return deptIds
      .map((id: string) => departments.find((d: any) => d.id === id)?.name)
      .filter(Boolean)
      .join(', ');
  };

  const parseDepartmentIds = (item: any): string[] => {
    if (item.departmentIds) {
      try {
        const parsed = typeof item.departmentIds === 'string' ? JSON.parse(item.departmentIds) : item.departmentIds;
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    if (item.departmentId) return [item.departmentId];
    if (item.department?.id) return [item.department.id];
    return [];
  };
  
  // Hedef ilerleme dialog
  const [progressDialogOpen, setProgressDialogOpen] = useState(false);
  const [progressGoalId, setProgressGoalId] = useState<string | null>(null);
  const [progressGoalType, setProgressGoalType] = useState<'goal' | 'subgoal'>('goal');
  const [progressEntries, setProgressEntries] = useState<any[]>([]);
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressValue, setProgressValue] = useState('');
  const [progressNote, setProgressNote] = useState('');
  const [currentGoalData, setCurrentGoalData] = useState<any>(null);
  const [savingProgress, setSavingProgress] = useState(false);

  useEffect(() => {
    fetchPeriod();
    fetchDepartments();
    fetchUsers();
    fetchKPIs();
    fetchRisks();
  }, [params.id]);

  // Departman dağılımı sekmesi açıldığında veri çek
  useEffect(() => {
    if (activeTab === 'distribution' && params.id) {
      fetchDeptDistribution();
    }
  }, [activeTab, params.id]);

  const fetchPeriod = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/strategy-periods/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setPeriod(data);
        // Auto expand first level
        const expanded = new Set<string>();
        data.objectives?.forEach((o: any) => expanded.add(`obj-${o.id}`));
        setExpandedNodes(expanded);
      }
    } catch (error) {
      console.error('Error fetching period:', error);
      toast.error('Dönem yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/departments');
      if (res.ok) {
        const data = await res.json();
        const deptList = data.departments || data;
      setDepartments(Array.isArray(deptList) ? deptList : []);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
      setDepartments([]);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        const users = data.users || data;
        setUsers(Array.isArray(users) ? users : []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    }
  };

  const fetchKPIs = async () => {
    try {
      // forGoalLinking=true: Hedef bağlama için tüm KPI'ları getir (departman filtresi yok, tüm statüler)
      const res = await fetch('/api/kpis?forGoalLinking=true');
      if (res.ok) {
        const data = await res.json();
        setKpis(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching KPIs:', error);
      setKpis([]);
    }
  };

  const fetchRisks = async () => {
    try {
      const res = await fetch('/api/risks');
      if (res.ok) {
        const data = await res.json();
        const risks = data.risks || data;
        setRisks(Array.isArray(risks) ? risks : []);
      }
    } catch (error) {
      console.error('Error fetching risks:', error);
      setRisks([]);
    }
  };

  const fetchDeptDistribution = async () => {
    try {
      setDeptDistLoading(true);
      const res = await fetch(`/api/strategy-periods/${params.id}/department-distribution`);
      if (res.ok) {
        const data = await res.json();
        setDeptDistribution(data);
      }
    } catch (error) {
      console.error('Error fetching department distribution:', error);
    } finally {
      setDeptDistLoading(false);
    }
  };

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  // Dönem durumunu değiştir
  const handlePeriodStatusChange = async (newStatus: string) => {
    try {
      setStatusChanging(true);
      const res = await fetch(`/api/strategy-periods/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setPeriod({ ...period, status: data.status });
        toast.success(`Dönem durumu "${statusLabels[newStatus]?.label || newStatus}" olarak güncellendi`);
      } else {
        toast.error('Durum güncellenemedi');
      }
    } catch (error) {
      console.error('Error updating period status:', error);
      toast.error('Durum güncellenirken hata oluştu');
    } finally {
      setStatusChanging(false);
    }
  };

  // İlerleme yeniden hesaplama
  const handleRecalculateProgress = async () => {
    try {
      setRecalculating(true);
      const res = await fetch(`/api/strategy-periods/${params.id}/recalculate-progress`, {
        method: 'POST',
      });
      
      if (res.ok) {
        toast.success('Tüm hedef ilerlemeleri yeniden hesaplandı');
        // Verileri yeniden yükle
        await fetchPeriod();
      } else {
        toast.error('İlerleme hesaplanamadı');
      }
    } catch (error) {
      console.error('Error recalculating progress:', error);
      toast.error('İlerleme hesaplanırken hata oluştu');
    } finally {
      setRecalculating(false);
    }
  };

  // Hedef ilerleme dialogını aç
  const openProgressDialog = async (goalId: string, goalType: 'goal' | 'subgoal', goalData: any) => {
    setProgressGoalId(goalId);
    setProgressGoalType(goalType);
    setCurrentGoalData(goalData);
    setProgressValue('');
    setProgressNote('');
    setProgressDialogOpen(true);
    
    // İlerleme geçmişini yükle
    setProgressLoading(true);
    try {
      const endpoint = goalType === 'goal' 
        ? `/api/goals/${goalId}/progress`
        : `/api/sub-goals/${goalId}/progress`;
      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        setProgressEntries(data.entries || []);
        setCurrentGoalData({
          ...goalData,
          ...data.goal,
          ...data.subGoal,
        });
      }
    } catch (error) {
      console.error('Error fetching progress entries:', error);
      toast.error('İlerleme geçmişi yüklenemedi');
    } finally {
      setProgressLoading(false);
    }
  };

  // Yeni ilerleme girdisi kaydet
  const saveProgressEntry = async () => {
    if (!progressGoalId || !progressValue) {
      toast.error('Değer giriniz');
      return;
    }

    setSavingProgress(true);
    try {
      const endpoint = progressGoalType === 'goal'
        ? `/api/goals/${progressGoalId}/progress`
        : `/api/sub-goals/${progressGoalId}/progress`;
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          value: parseFloat(progressValue),
          note: progressNote,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success('İlerleme kaydedildi');
        // Listeyi güncelle
        setProgressEntries([data.entry, ...progressEntries]);
        // Current value güncelle
        setCurrentGoalData({
          ...currentGoalData,
          currentValue: data.goal?.currentValue || data.subGoal?.currentValue,
          progress: data.goal?.progress || data.subGoal?.progress,
        });
        // Formu temizle
        setProgressValue('');
        setProgressNote('');
        // Ana listeyi de güncelle
        fetchPeriod();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Hata oluştu');
      }
    } catch (error) {
      console.error('Error saving progress:', error);
      toast.error('İlerleme kaydedilirken hata oluştu');
    } finally {
      setSavingProgress(false);
    }
  };

  // Handlers
  const handleCreateObjective = async () => {
    try {
      const res = await fetch('/api/objectives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          periodId: params.id,
          perspectiveId: selectedPerspectiveId,
        }),
      });

      if (res.ok) {
        toast.success('Stratejik amaç oluşturuldu');
        setObjectiveDialogOpen(false);
        setFormData({});
        fetchPeriod();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Hata oluştu');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    }
  };

  const handleCreateGoal = async () => {
    try {
      const res = await fetch(`/api/objectives/${selectedObjectiveId}/goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success('Hedef oluşturuldu');
        setGoalDialogOpen(false);
        setFormData({});
        fetchPeriod();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Hata oluştu');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    }
  };

  const handleCreateSubGoal = async () => {
    try {
      const res = await fetch(`/api/goals/${selectedGoalId}/sub-goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success('Alt hedef oluşturuldu');
        setSubGoalDialogOpen(false);
        setFormData({});
        fetchPeriod();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Hata oluştu');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    }
  };

  const handleCreateAction = async () => {
    try {
      const endpoint = selectedSubGoalId
        ? `/api/sub-goals/${selectedSubGoalId}/actions`
        : `/api/goals/${selectedGoalId}/actions`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success('Aksiyon oluşturuldu');
        setActionDialogOpen(false);
        setFormData({});
        fetchPeriod();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Hata oluştu');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    }
  };

  const handleLinkKPI = async () => {
    try {
      const res = await fetch(`/api/goals/${selectedGoalId}/kpis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kpiId: formData.kpiId }),
      });

      if (res.ok) {
        toast.success('KPI bağlandı');
        setLinkKPIDialogOpen(false);
        setFormData({});
        fetchPeriod();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Hata oluştu');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    }
  };

  const handleLinkRisk = async () => {
    try {
      const res = await fetch(`/api/goals/${selectedGoalId}/risks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ riskId: formData.riskId }),
      });

      if (res.ok) {
        toast.success('Risk bağlandı');
        setLinkRiskDialogOpen(false);
        setFormData({});
        fetchPeriod();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Hata oluştu');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    }
  };

  // Alt hedefe KPI bağla
  const handleLinkSubGoalKPI = async () => {
    try {
      const res = await fetch(`/api/sub-goals/${selectedSubGoalId}/kpis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kpiId: formData.kpiId }),
      });

      if (res.ok) {
        toast.success('KPI alt hedefe bağlandı');
        setLinkSubGoalKPIDialogOpen(false);
        setFormData({});
        fetchPeriod();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Hata oluştu');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    }
  };

  const handleLinkSubGoalRisk = async () => {
    try {
      const res = await fetch(`/api/sub-goals/${selectedSubGoalId}/risks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ riskId: formData.riskId }),
      });

      if (res.ok) {
        toast.success('Risk alt hedefe bağlandı');
        setLinkSubGoalRiskDialogOpen(false);
        setFormData({});
        fetchPeriod();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Hata oluştu');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    }
  };

  const handleLinkActionRisk = async () => {
    try {
      const res = await fetch(`/api/strategic-actions/${selectedActionId}/risks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ riskId: formData.riskId }),
      });

      if (res.ok) {
        toast.success('Risk aksiyona bağlandı');
        setLinkActionRiskDialogOpen(false);
        setFormData({});
        fetchPeriod();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Hata oluştu');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    }
  };

  const handleUpdateMissionVision = async () => {
    try {
      const res = await fetch(`/api/strategy-periods/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success('Misyon/Vizyon güncellendi');
        setMissionVisionDialogOpen(false);
        setFormData({});
        fetchPeriod();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Hata oluştu');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    }
  };

  // Render tree node
  const renderAction = (action: any) => (
    <div
      key={action.id}
      className="ml-16 py-2 px-3 border-l-2 border-green-300 hover:bg-gray-50 rounded-r"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-4 w-4 text-green-600" />
          <span className="text-sm font-medium">{action.name}</span>
          <Badge className={`${actionStatusLabels[action.status]?.color} text-white text-xs`}>
            {actionStatusLabels[action.status]?.label}
          </Badge>
          <Badge className={`${priorityLabels[action.priority]?.color} text-white text-xs`}>
            {priorityLabels[action.priority]?.label}
          </Badge>
          {action.risks?.length > 0 && (
            <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
              {action.risks.length} Risk
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {action.responsible && (
            <span className="text-xs text-muted-foreground">
              {action.responsible.name}
            </span>
          )}
          {action.dueDate && (
            <span className="text-xs text-muted-foreground">
              {format(new Date(action.dueDate), 'dd.MM.yyyy')}
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedActionId(action.id);
              setFormData({});
              setLinkActionRiskDialogOpen(true);
            }}
          >
            <AlertTriangle className="h-3 w-3 mr-1" />
            Risk
          </Button>
          <Progress value={action.progress || 0} className="w-20 h-2" />
          <span className="text-xs text-muted-foreground">{action.progress || 0}%</span>
        </div>
      </div>
    </div>
  );

  const renderSubGoal = (subGoal: any, goalId: string) => {
    const nodeId = `subgoal-${subGoal.id}`;
    const isExpanded = expandedNodes.has(nodeId);
    const hasActions = subGoal.actions?.length > 0;

    return (
      <div key={subGoal.id} className="ml-8">
        <div
          className="flex items-center gap-2 py-2 px-3 hover:bg-gray-50 rounded cursor-pointer border-l-2 border-blue-300"
          onClick={() => hasActions && toggleNode(nodeId)}
        >
          {hasActions && (
            isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
          )}
          {!hasActions && <div className="w-4" />}
          <Flag className="h-4 w-4 text-blue-500" />
          <span className="font-medium text-sm">{subGoal.name}</span>
          <Badge variant="outline" className="text-xs">{subGoal.code}</Badge>
          <Badge className={`${statusLabels[subGoal.status]?.color} text-white text-xs`}>
            {statusLabels[subGoal.status]?.label}
          </Badge>
          {subGoal.targetValue != null && (
            <Badge 
              variant="outline" 
              className="text-xs bg-blue-50 text-blue-700 border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                openProgressDialog(subGoal.id, 'subgoal', subGoal);
              }}
            >
              Hedef: {subGoal.currentValue ?? 0}/{subGoal.targetValue} {subGoal.unit || ''} ({Math.round((subGoal.currentValue ?? 0) / subGoal.targetValue * 100)}%)
            </Badge>
          )}
          <div className="flex items-center gap-1">
            <Progress value={subGoal.progress || 0} className="w-16 h-2" />
            <span className="text-xs text-muted-foreground">{subGoal.progress || 0}%</span>
          </div>
          {subGoal.kpis?.length > 0 && (
            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
              {subGoal.kpis.length} KPI
            </Badge>
          )}
          {subGoal.risks?.length > 0 && (
            <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
              {subGoal.risks.length} Risk
            </Badge>
          )}
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedSubGoalId(subGoal.id);
              setFormData({ linkedKpiIds: subGoal.kpis?.map((k: any) => k.kpiId) || [] });
              setLinkSubGoalKPIDialogOpen(true);
            }}
          >
            <Target className="h-3 w-3 mr-1" />
            KPI
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedSubGoalId(subGoal.id);
              setFormData({});
              setLinkSubGoalRiskDialogOpen(true);
            }}
          >
            <AlertTriangle className="h-3 w-3 mr-1" />
            Risk
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedSubGoalId(subGoal.id);
              setSelectedGoalId(goalId);
              setFormData({});
              setActionDialogOpen(true);
            }}
          >
            <Plus className="h-3 w-3 mr-1" />
            Aksiyon
          </Button>
        </div>
        {isExpanded && subGoal.actions?.map((action: any) => renderAction(action))}
      </div>
    );
  };

  const renderGoal = (goal: any, objectiveId: string) => {
    const nodeId = `goal-${goal.id}`;
    const isExpanded = expandedNodes.has(nodeId);
    const hasChildren = (goal.subGoals?.length > 0) || (goal.actions?.length > 0);

    return (
      <div key={goal.id}>
        <div
          className="flex items-center gap-2 py-2 px-3 ml-4 hover:bg-gray-50 rounded cursor-pointer border-l-2 border-purple-300"
          onClick={() => hasChildren && toggleNode(nodeId)}
        >
          {hasChildren && (
            isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
          )}
          {!hasChildren && <div className="w-4" />}
          <Flag className="h-4 w-4 text-purple-500" />
          <span className="font-medium">{goal.name}</span>
          <Badge variant="outline" className="text-xs">{goal.code}</Badge>
          <Badge className={`${statusLabels[goal.status]?.color} text-white text-xs`}>
            {statusLabels[goal.status]?.label}
          </Badge>
          {goal.targetValue != null && (
            <Badge 
              variant="outline" 
              className="text-xs bg-purple-50 text-purple-700 border-purple-200 cursor-pointer hover:bg-purple-100 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                openProgressDialog(goal.id, 'goal', goal);
              }}
            >
              Hedef: {goal.currentValue ?? 0}/{goal.targetValue} {goal.unit || ''} ({Math.round((goal.currentValue ?? 0) / goal.targetValue * 100)}%)
            </Badge>
          )}
          <div className="flex items-center gap-1">
            <Progress value={goal.progress || 0} className="w-16 h-2" />
            <span className="text-xs text-muted-foreground">{goal.progress || 0}%</span>
          </div>
          {goal.kpis?.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              <BarChart3 className="h-3 w-3 mr-1" />
              {goal.kpis.length} KPI
            </Badge>
          )}
          {goal.risks?.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {goal.risks.length} Risk
            </Badge>
          )}
          <div className="flex-1" />
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedGoalId(goal.id);
                setFormData({});
                setSubGoalDialogOpen(true);
              }}
            >
              <Plus className="h-3 w-3 mr-1" />
              Alt Hedef
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedGoalId(goal.id);
                setSelectedSubGoalId(null);
                setFormData({});
                setActionDialogOpen(true);
              }}
            >
              <Plus className="h-3 w-3 mr-1" />
              Aksiyon
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedGoalId(goal.id);
                // Zaten bağlı KPI'ları sakla
                const linkedKpiIds = goal.kpis?.map((k: any) => k.kpiId || k.kpi?.id) || [];
                setFormData({ linkedKpiIds });
                setLinkKPIDialogOpen(true);
              }}
            >
              <BarChart3 className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedGoalId(goal.id);
                setFormData({});
                setLinkRiskDialogOpen(true);
              }}
            >
              <AlertTriangle className="h-3 w-3" />
            </Button>
          </div>
        </div>
        {isExpanded && (
          <>
            {goal.subGoals?.map((sg: any) => renderSubGoal(sg, goal.id))}
            {goal.actions?.filter((a: any) => !a.subGoalId).map((action: any) => renderAction(action))}
          </>
        )}
      </div>
    );
  };

  const renderObjective = (objective: any) => {
    const nodeId = `obj-${objective.id}`;
    const isExpanded = expandedNodes.has(nodeId);
    const hasGoals = objective.goals?.length > 0;
    const perspectiveClass = perspectiveColors[objective.perspective?.code] || 'border-l-gray-300 bg-gray-50';

    return (
      <Card key={objective.id} className={`border-l-4 ${perspectiveClass}`}>
        <div
          className="flex items-center gap-2 p-4 cursor-pointer"
          onClick={() => hasGoals && toggleNode(nodeId)}
        >
          {hasGoals && (
            isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />
          )}
          {!hasGoals && <div className="w-5" />}
          <Target className="h-5 w-5 text-indigo-600" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{objective.name}</span>
              <Badge variant="outline">{objective.code}</Badge>
              {objective.perspective && (
                <Badge style={{ backgroundColor: objective.perspective.color }} className="text-white">
                  {objective.perspective.name}
                </Badge>
              )}
              <Badge className={`${statusLabels[objective.status]?.color} text-white`}>
                {statusLabels[objective.status]?.label}
              </Badge>
            </div>
            {objective.description && (
              <p className="text-sm text-muted-foreground mt-1">{objective.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {objective.owner && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                {objective.owner.name}
              </div>
            )}
            {(() => {
              const dIds = parseDepartmentIds(objective);
              const names = getDepartmentNames(dIds);
              return names ? (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  {names}
                </div>
              ) : null;
            })()}
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedObjectiveId(objective.id);
                setFormData({});
                setGoalDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Hedef Ekle
            </Button>
          </div>
        </div>
        {isExpanded && hasGoals && (
          <CardContent className="pt-0 pb-4">
            {(objective.goals || []).map((goal: any) => renderGoal(goal, objective.id))}
          </CardContent>
        )}
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!period) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Dönem bulunamadı</p>
        <Button className="mt-4" onClick={() => router.back()}>
          Geri Dön
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{period.name}</h1>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Badge 
                    className={`${statusLabels[period.status]?.color} text-white cursor-pointer hover:opacity-80`}
                    title="Durumu değiştirmek için tıklayın"
                  >
                    {statusChanging ? 'Değiştiriliyor...' : statusLabels[period.status]?.label}
                  </Badge>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem 
                    onClick={() => handlePeriodStatusChange('TASLAK')}
                    disabled={period.status === 'TASLAK'}
                  >
                    <div className="w-3 h-3 rounded-full bg-gray-500 mr-2" />
                    Taslak
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handlePeriodStatusChange('AKTIF')}
                    disabled={period.status === 'AKTIF'}
                  >
                    <div className="w-3 h-3 rounded-full bg-green-500 mr-2" />
                    Aktif
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handlePeriodStatusChange('KAPALI')}
                    disabled={period.status === 'KAPALI'}
                  >
                    <div className="w-3 h-3 rounded-full bg-red-500 mr-2" />
                    Kapalı
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <p className="text-muted-foreground">
              {format(new Date(period.startDate), 'dd MMM yyyy', { locale: tr })} -{' '}
              {format(new Date(period.endDate), 'dd MMM yyyy', { locale: tr })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleRecalculateProgress}
            disabled={recalculating}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${recalculating ? 'animate-spin' : ''}`} />
            {recalculating ? 'Hesaplanıyor...' : 'İlerleme Hesapla'}
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/strategy/map/${params.id}`)}
          >
            <Target className="h-4 w-4 mr-2" />
            Strateji Haritası
          </Button>
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
                name: period.name,
                objectives: (period.objectives || []).map((obj: any) => ({
                  code: obj.code,
                  name: obj.name,
                  perspective: obj.perspective,
                  goals: (obj.goals || []).map((g: any) => ({
                    code: g.code,
                    name: g.name,
                    targetValue: g.targetValue,
                    currentValue: g.currentValue,
                    subGoals: g.subGoals || [],
                  })),
                })),
              };
              exportStrategyToExcel(exportData, `Strateji-${period.code}`);
              toast.success('Excel dosyası indirildi');
            }}>
              <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
              Excel (.xlsx)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              const exportData = {
                name: period.name,
                startDate: period.startDate,
                endDate: period.endDate,
                mission: period.mission,
                vision: period.vision,
                objectives: (period.objectives || []).map((obj: any) => ({
                  code: obj.code,
                  name: obj.name,
                  perspective: obj.perspective,
                  goals: (obj.goals || []).map((g: any) => ({
                    code: g.code,
                    name: g.name,
                    targetValue: g.targetValue,
                    currentValue: g.currentValue,
                    subGoals: (g.subGoals || []).map((s: any) => ({
                      code: s.code,
                      name: s.name,
                      actions: s.actions || [],
                    })),
                    actions: g.actions || [],
                  })),
                })),
              };
              exportStrategyTree(exportData, `Strateji-${period.code}`);
              toast.success('PDF dosyası indirildi');
            }}>
              <FileText className="h-4 w-4 mr-2 text-red-600" />
              PDF (Strateji Haritası)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </div>

      {/* Misyon & Vizyon */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-blue-600">MİSYON</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setFormData({
                    missionContent: period.mission?.content || '',
                    visionContent: period.vision?.content || '',
                    visionTargetYear: period.vision?.targetYear || '',
                  });
                  setMissionVisionDialogOpen(true);
                }}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              {period.mission?.content || 'Misyon tanımlanmamış'}
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-purple-600">
                VİZYON {period.vision?.targetYear && `(${period.vision.targetYear})`}
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setFormData({
                    missionContent: period.mission?.content || '',
                    visionContent: period.vision?.content || '',
                    visionTargetYear: period.vision?.targetYear || '',
                  });
                  setMissionVisionDialogOpen(true);
                }}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              {period.vision?.content || 'Vizyon tanımlanmamış'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Stratejik Amaçlar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Stratejik Amaçlar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {period.perspectives?.map((p: any) => (
              <Badge
                key={p.id}
                style={{ backgroundColor: p.color }}
                className="text-white px-3 py-1 cursor-pointer hover:opacity-80"
                onClick={() => {
                  setSelectedPerspectiveId(p.id);
                  setFormData({});
                  setObjectiveDialogOpen(true);
                }}
              >
                {p.name}
                <Plus className="h-3 w-3 ml-1" />
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="tree">Ağaç Görünümü</TabsTrigger>
          <TabsTrigger value="map">Strateji Haritası</TabsTrigger>
          <TabsTrigger value="distribution">Departman Dağılımı</TabsTrigger>
        </TabsList>

        <TabsContent value="tree" className="space-y-4">
          {period.objectives?.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64">
                <Target className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Henüz stratejik amaç tanımlanmamış</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Bir Stratejik amaçine tıklayarak amaç ekleyebilirsiniz
                </p>
              </CardContent>
            </Card>
          ) : (
            period.objectives?.map((obj: any) => renderObjective(obj))
          )}
        </TabsContent>

        <TabsContent value="map">
          <Card>
            <CardHeader>
              <CardTitle>Strateji Haritası (BSC)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {period.perspectives?.map((perspective: any) => {
                  const perspectiveObjectives = period.objectives?.filter(
                    (o: any) => o.perspectiveId === perspective.id
                  );
                  return (
                    <div key={perspective.id}>
                      <div
                        className="flex items-center gap-2 p-3 rounded-lg mb-3"
                        style={{ backgroundColor: `${perspective.color}20` }}
                      >
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: perspective.color }}
                        />
                        <h3 className="font-semibold">{perspective.name}</h3>
                        <span className="text-sm text-muted-foreground">
                          ({perspectiveObjectives?.length || 0} amaç)
                        </span>
                      </div>
                      {perspectiveObjectives?.length > 0 ? (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 pl-5">
                          {perspectiveObjectives.map((obj: any) => (
                            <Card
                              key={obj.id}
                              className="border-l-4"
                              style={{ borderLeftColor: perspective.color }}
                            >
                              <CardContent className="p-3">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <p className="font-medium text-sm">{obj.name}</p>
                                    <p className="text-xs text-muted-foreground">{obj.code}</p>
                                  </div>
                                  <Badge
                                    className={`${statusLabels[obj.status]?.color} text-white text-xs`}
                                  >
                                    {statusLabels[obj.status]?.label}
                                  </Badge>
                                </div>
                                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                                  <Flag className="h-3 w-3" />
                                  {obj.goals?.length || 0} hedef
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground pl-5">
                          Bu perspektifte henüz amaç yok
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution">
          {deptDistLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-muted-foreground">Yükleniyor...</div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Özet Kartlar */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-indigo-600">
                      {deptDistribution.summary?.totalObjectives || 0}
                    </div>
                    <p className="text-sm text-muted-foreground">Toplam Amaç</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Progress value={deptDistribution.summary?.avgObjectiveProgress || 0} className="h-2" />
                      <span className="text-xs text-muted-foreground">
                        {deptDistribution.summary?.avgObjectiveProgress || 0}%
                      </span>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-purple-600">
                      {deptDistribution.summary?.totalGoals || 0}
                    </div>
                    <p className="text-sm text-muted-foreground">Toplam Hedef</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Progress value={deptDistribution.summary?.avgGoalProgress || 0} className="h-2" />
                      <span className="text-xs text-muted-foreground">
                        {deptDistribution.summary?.avgGoalProgress || 0}%
                      </span>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-blue-600">
                      {deptDistribution.summary?.totalSubGoals || 0}
                    </div>
                    <p className="text-sm text-muted-foreground">Toplam Alt Hedef</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-green-600">
                      {deptDistribution.summary?.totalActions || 0}
                    </div>
                    <p className="text-sm text-muted-foreground">Toplam Aksiyon</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Progress value={deptDistribution.summary?.avgActionProgress || 0} className="h-2" />
                      <span className="text-xs text-muted-foreground">
                        {deptDistribution.summary?.avgActionProgress || 0}%
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Grafikler */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Pasta Grafik - Toplam Dağılım */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Departman Bazlı Toplam Dağılım</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={deptDistribution.distribution?.filter((d: any) => d.total > 0) || []}
                            dataKey="total"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          >
                            {(deptDistribution.distribution || []).map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Bar Grafik - Detaylı Dağılım */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Kategori Bazlı Dağılım</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={deptDistribution.distribution?.filter((d: any) => d.total > 0) || []}
                          layout="vertical"
                          margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="objectives" name="Amaç" fill="#6366F1" stackId="a" />
                          <Bar dataKey="goals" name="Hedef" fill="#8B5CF6" stackId="a" />
                          <Bar dataKey="subGoals" name="Alt Hedef" fill="#3B82F6" stackId="a" />
                          <Bar dataKey="actions" name="Aksiyon" fill="#10B981" stackId="a" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Detay Tablosu */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Departman Detay Tablosu
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Departman</TableHead>
                        <TableHead className="text-center">Amaç</TableHead>
                        <TableHead className="text-center">Hedef</TableHead>
                        <TableHead className="text-center">Alt Hedef</TableHead>
                        <TableHead className="text-center">Aksiyon</TableHead>
                        <TableHead className="text-center">Toplam</TableHead>
                        <TableHead className="text-center">Amaç İlerleme</TableHead>
                        <TableHead className="text-center">Hedef İlerleme</TableHead>
                        <TableHead className="text-center">Aksiyon İlerleme</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deptDistribution.distribution?.map((dept: any, index: number) => (
                        <TableRow key={dept.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                              />
                              {dept.name}
                              {dept.code !== '-' && (
                                <Badge variant="outline" className="text-xs">
                                  {dept.code}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="bg-indigo-100 text-indigo-700">
                              {dept.objectives}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                              {dept.goals}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                              {dept.subGoals}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="bg-green-100 text-green-700">
                              {dept.actions}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center font-semibold">{dept.total}</TableCell>
                          <TableCell className="text-center">
                            {dept.objectives > 0 ? (
                              <div className="flex items-center justify-center gap-2">
                                <Progress value={dept.objectiveProgress} className="w-16 h-2" />
                                <span className="text-xs">{dept.objectiveProgress}%</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {dept.goals > 0 ? (
                              <div className="flex items-center justify-center gap-2">
                                <Progress value={dept.goalProgress} className="w-16 h-2" />
                                <span className="text-xs">{dept.goalProgress}%</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {dept.actions > 0 ? (
                              <div className="flex items-center justify-center gap-2">
                                <Progress value={dept.actionProgress} className="w-16 h-2" />
                                <span className="text-xs">{dept.actionProgress}%</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!deptDistribution.distribution || deptDistribution.distribution.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                            Henüz stratejik öğe tanımlanmamış
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Aktif Departman Sayısı */}
              <Card className="bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Stratejik Plan Kapsamındaki Departmanlar</p>
                      <div className="text-3xl font-bold text-indigo-600">
                        {deptDistribution.summary?.departmentCount || 0}
                      </div>
                    </div>
                    <Building2 className="h-12 w-12 text-indigo-300" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {/* Objective Dialog */}
      <Dialog open={objectiveDialogOpen} onOpenChange={setObjectiveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Stratejik Amaç</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Amaç Adı *</Label>
              <Input
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Stratejik amaç adı..."
              />
            </div>
            <div>
              <Label>Açıklama</Label>
              <Textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Açıklama..."
              />
            </div>
            <div>
              <Label>Departman(lar)</Label>
              <div className="relative" ref={deptDropdownRef}>
                <div
                  className="flex min-h-[40px] w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm cursor-pointer"
                  onClick={() => setDeptDropdownOpen(!deptDropdownOpen)}
                >
                  <div className="flex flex-wrap gap-1 flex-1">
                    {(formData.departmentIds || []).length === 0 ? (
                      <span className="text-muted-foreground">Departman seçiniz...</span>
                    ) : (
                      (formData.departmentIds || []).map((id: string) => {
                        const dept = departments.find((d: any) => d.id === id);
                        return dept ? (
                          <Badge key={id} variant="secondary" className="text-xs">
                            {dept.name}
                            <button type="button" className="ml-1 hover:text-destructive" onClick={(e) => { e.stopPropagation(); toggleDepartmentSelection(id); }}>×</button>
                          </Badge>
                        ) : null;
                      })
                    )}
                  </div>
                  <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                </div>
                {deptDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {departments.map((dept: any) => (
                      <div key={dept.id} className="flex items-center gap-2 px-3 py-2 hover:bg-accent cursor-pointer" onClick={() => toggleDepartmentSelection(dept.id)}>
                        <Checkbox checked={(formData.departmentIds || []).includes(dept.id)} onCheckedChange={() => toggleDepartmentSelection(dept.id)} />
                        <span className="text-sm">{dept.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div>
              <Label>Sorumlu Kişi</Label>
              <Select
                value={formData.ownerId || ''}
                onValueChange={(v) => setFormData({ ...formData, ownerId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seçiniz" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setObjectiveDialogOpen(false)}>
                İptal
              </Button>
              <Button onClick={handleCreateObjective}>Oluştur</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Goal Dialog */}
      <Dialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Hedef</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Hedef Adı *</Label>
              <Input
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Hedef adı..."
              />
            </div>
            <div>
              <Label>Açıklama</Label>
              <Textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div>
              <Label>Departman(lar)</Label>
              <div className="relative" ref={deptDropdownRef}>
                <div
                  className="flex min-h-[40px] w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm cursor-pointer"
                  onClick={() => setDeptDropdownOpen(!deptDropdownOpen)}
                >
                  <div className="flex flex-wrap gap-1 flex-1">
                    {(formData.departmentIds || []).length === 0 ? (
                      <span className="text-muted-foreground">Departman seçiniz...</span>
                    ) : (
                      (formData.departmentIds || []).map((id: string) => {
                        const dept = departments.find((d: any) => d.id === id);
                        return dept ? (
                          <Badge key={id} variant="secondary" className="text-xs">
                            {dept.name}
                            <button type="button" className="ml-1 hover:text-destructive" onClick={(e) => { e.stopPropagation(); toggleDepartmentSelection(id); }}>×</button>
                          </Badge>
                        ) : null;
                      })
                    )}
                  </div>
                  <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                </div>
                {deptDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {departments.map((dept: any) => (
                      <div key={dept.id} className="flex items-center gap-2 px-3 py-2 hover:bg-accent cursor-pointer" onClick={() => toggleDepartmentSelection(dept.id)}>
                        <Checkbox checked={(formData.departmentIds || []).includes(dept.id)} onCheckedChange={() => toggleDepartmentSelection(dept.id)} />
                        <span className="text-sm">{dept.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div>
              <Label>Sorumlu Kişi</Label>
              <Select
                value={formData.ownerId || ''}
                onValueChange={(v) => setFormData({ ...formData, ownerId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seçiniz" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Hedef Değer</Label>
                <Input
                  type="number"
                  value={formData.targetValue || ''}
                  onChange={(e) => setFormData({ ...formData, targetValue: e.target.value })}
                />
              </div>
              <div>
                <Label>Birim</Label>
                <Input
                  value={formData.unit || ''}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="%, adet, TL..."
                />
              </div>
              <div>
                <Label>Ağırlık</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.weight || '1'}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Başlangıç</Label>
                <Input
                  type="date"
                  value={formData.startDate || ''}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div>
                <Label>Bitiş</Label>
                <Input
                  type="date"
                  value={formData.endDate || ''}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setGoalDialogOpen(false)}>
                İptal
              </Button>
              <Button onClick={handleCreateGoal}>Oluştur</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* SubGoal Dialog */}
      <Dialog open={subGoalDialogOpen} onOpenChange={setSubGoalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Alt Hedef</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Alt Hedef Adı *</Label>
              <Input
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Alt hedef adı..."
              />
            </div>
            <div>
              <Label>Açıklama</Label>
              <Textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div>
              <Label>Departman(lar)</Label>
              <div className="relative" ref={deptDropdownRef}>
                <div
                  className="flex min-h-[40px] w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm cursor-pointer"
                  onClick={() => setDeptDropdownOpen(!deptDropdownOpen)}
                >
                  <div className="flex flex-wrap gap-1 flex-1">
                    {(formData.departmentIds || []).length === 0 ? (
                      <span className="text-muted-foreground">Departman seçiniz...</span>
                    ) : (
                      (formData.departmentIds || []).map((id: string) => {
                        const dept = departments.find((d: any) => d.id === id);
                        return dept ? (
                          <Badge key={id} variant="secondary" className="text-xs">
                            {dept.name}
                            <button type="button" className="ml-1 hover:text-destructive" onClick={(e) => { e.stopPropagation(); toggleDepartmentSelection(id); }}>×</button>
                          </Badge>
                        ) : null;
                      })
                    )}
                  </div>
                  <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                </div>
                {deptDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {departments.map((dept: any) => (
                      <div key={dept.id} className="flex items-center gap-2 px-3 py-2 hover:bg-accent cursor-pointer" onClick={() => toggleDepartmentSelection(dept.id)}>
                        <Checkbox checked={(formData.departmentIds || []).includes(dept.id)} onCheckedChange={() => toggleDepartmentSelection(dept.id)} />
                        <span className="text-sm">{dept.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div>
              <Label>Sorumlu Kişi</Label>
              <Select
                value={formData.ownerId || ''}
                onValueChange={(v) => setFormData({ ...formData, ownerId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seçiniz" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Hedef Değer</Label>
                <Input
                  type="number"
                  value={formData.targetValue || ''}
                  onChange={(e) => setFormData({ ...formData, targetValue: e.target.value })}
                  placeholder="Sayısal hedef"
                />
              </div>
              <div>
                <Label>Birim</Label>
                <Input
                  value={formData.unit || ''}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="%, adet, TL..."
                />
              </div>
              <div>
                <Label>Ağırlık</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.weight || '1'}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Başlangıç</Label>
                <Input
                  type="date"
                  value={formData.startDate || ''}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div>
                <Label>Bitiş</Label>
                <Input
                  type="date"
                  value={formData.endDate || ''}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSubGoalDialogOpen(false)}>
                İptal
              </Button>
              <Button onClick={handleCreateSubGoal}>Oluştur</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Yeni Aksiyon</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div>
              <Label>Aksiyon Adı *</Label>
              <Input
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Açıklama</Label>
              <Textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Öncelik</Label>
                <Select
                  value={formData.priority || 'ORTA'}
                  onValueChange={(v) => setFormData({ ...formData, priority: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DUSUK">Düşük</SelectItem>
                    <SelectItem value="ORTA">Orta</SelectItem>
                    <SelectItem value="YUKSEK">Yüksek</SelectItem>
                    <SelectItem value="KRITIK">Kritik</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Departman(lar)</Label>
                <div className="relative" ref={deptDropdownRef}>
                  <div
                    className="flex min-h-[40px] w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm cursor-pointer"
                    onClick={() => setDeptDropdownOpen(!deptDropdownOpen)}
                  >
                    <div className="flex flex-wrap gap-1 flex-1">
                      {(formData.departmentIds || []).length === 0 ? (
                        <span className="text-muted-foreground">Departman seçiniz...</span>
                      ) : (
                        (formData.departmentIds || []).map((id: string) => {
                          const dept = departments.find((d: any) => d.id === id);
                          return dept ? (
                            <Badge key={id} variant="secondary" className="text-xs">
                              {dept.name}
                              <button type="button" className="ml-1 hover:text-destructive" onClick={(e) => { e.stopPropagation(); toggleDepartmentSelection(id); }}>×</button>
                            </Badge>
                          ) : null;
                        })
                      )}
                    </div>
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                  </div>
                  {deptDropdownOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {departments.map((dept: any) => (
                        <div key={dept.id} className="flex items-center gap-2 px-3 py-2 hover:bg-accent cursor-pointer" onClick={() => toggleDepartmentSelection(dept.id)}>
                          <Checkbox checked={(formData.departmentIds || []).includes(dept.id)} onCheckedChange={() => toggleDepartmentSelection(dept.id)} />
                          <span className="text-sm">{dept.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Sorumlu (R)</Label>
                <Select
                  value={formData.responsibleId || ''}
                  onValueChange={(v) => setFormData({ ...formData, responsibleId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seçiniz" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Onaylayan (A)</Label>
                <Select
                  value={formData.accountableId || ''}
                  onValueChange={(v) => setFormData({ ...formData, accountableId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seçiniz" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Başlangıç</Label>
                <Input
                  type="date"
                  value={formData.startDate || ''}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div>
                <Label>Bitiş</Label>
                <Input
                  type="date"
                  value={formData.endDate || ''}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
              <div>
                <Label>Termin</Label>
                <Input
                  type="date"
                  value={formData.dueDate || ''}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Planlı Bütçe</Label>
                <Input
                  type="number"
                  value={formData.budgetPlanned || ''}
                  onChange={(e) => setFormData({ ...formData, budgetPlanned: e.target.value })}
                  placeholder="Aksiyonun gerektirdiği maliyet"
                />
              </div>
              <div>
                <Label>Beklenen Kazanç / Tasarruf</Label>
                <Input
                  type="number"
                  value={formData.expectedGain || ''}
                  onChange={(e) => setFormData({ ...formData, expectedGain: e.target.value })}
                  placeholder="Elde edilecek kazanç/tasarruf"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Para Birimi</Label>
                <Select
                  value={formData.currency || 'TRY'}
                  onValueChange={(v) => setFormData({ ...formData, currency: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRY">TRY</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Bütçe Tipi</Label>
                <Select
                  value={formData.budgetType || ''}
                  onValueChange={(v) => setFormData({ ...formData, budgetType: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seçiniz" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CAPEX">CAPEX</SelectItem>
                    <SelectItem value="OPEX">OPEX</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                {(formData.budgetPlanned || formData.expectedGain) && (
                  <div className="text-sm">
                    <span className="text-gray-500">Net Fayda: </span>
                    <span className={`font-medium ${((parseFloat(formData.expectedGain) || 0) - (parseFloat(formData.budgetPlanned) || 0)) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {((parseFloat(formData.expectedGain) || 0) - (parseFloat(formData.budgetPlanned) || 0)).toLocaleString()} {formData.currency || 'TRY'}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setActionDialogOpen(false)}>
                İptal
              </Button>
              <Button onClick={handleCreateAction}>Oluştur</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Link KPI Dialog */}
      <Dialog open={linkKPIDialogOpen} onOpenChange={setLinkKPIDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>KPI Bağla</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>KPI Seçiniz</Label>
              <Select
                value={formData.kpiId || ''}
                onValueChange={(v) => setFormData({ ...formData, kpiId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="KPI seçiniz" />
                </SelectTrigger>
                <SelectContent>
                  {kpis
                    .filter((kpi) => !(formData.linkedKpiIds || []).includes(kpi.id))
                    .map((kpi) => (
                      <SelectItem key={kpi.id} value={kpi.id}>
                        {kpi.code} - {kpi.name} {kpi.department ? `(${kpi.department.name})` : ''}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {(formData.linkedKpiIds || []).length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Bu hedefe zaten bağlı {formData.linkedKpiIds.length} KPI var (listede gösterilmiyor)
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setLinkKPIDialogOpen(false)}>
                İptal
              </Button>
              <Button onClick={handleLinkKPI} disabled={!formData.kpiId}>Bağla</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Link KPI Dialog (SubGoal) */}
      <Dialog open={linkSubGoalKPIDialogOpen} onOpenChange={setLinkSubGoalKPIDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alt Hedefe KPI Bağla</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>KPI Seçiniz</Label>
              <Select
                value={formData.kpiId || ''}
                onValueChange={(v) => setFormData({ ...formData, kpiId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="KPI seçiniz" />
                </SelectTrigger>
                <SelectContent>
                  {kpis
                    .filter((kpi) => !(formData.linkedKpiIds || []).includes(kpi.id))
                    .map((kpi) => (
                      <SelectItem key={kpi.id} value={kpi.id}>
                        {kpi.code} - {kpi.name} {kpi.department ? `(${kpi.department.name})` : ''}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {(formData.linkedKpiIds || []).length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Bu alt hedefe zaten bağlı {formData.linkedKpiIds.length} KPI var (listede gösterilmiyor)
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setLinkSubGoalKPIDialogOpen(false)}>
                İptal
              </Button>
              <Button onClick={handleLinkSubGoalKPI} disabled={!formData.kpiId}>Bağla</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Link Risk Dialog (Goal) */}
      <Dialog open={linkRiskDialogOpen} onOpenChange={setLinkRiskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hedefe Risk Bağla</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Risk Seçiniz</Label>
              <Select
                value={formData.riskId || ''}
                onValueChange={(v) => setFormData({ ...formData, riskId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Risk seçiniz" />
                </SelectTrigger>
                <SelectContent>
                  {risks.map((risk) => (
                    <SelectItem key={risk.id} value={risk.id}>
                      {risk.code} - {risk.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setLinkRiskDialogOpen(false)}>
                İptal
              </Button>
              <Button onClick={handleLinkRisk}>Bağla</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Link Risk Dialog (Sub-Goal) */}
      <Dialog open={linkSubGoalRiskDialogOpen} onOpenChange={setLinkSubGoalRiskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alt Hedefe Risk Bağla</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Risk Seçiniz</Label>
              <Select
                value={formData.riskId || ''}
                onValueChange={(v) => setFormData({ ...formData, riskId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Risk seçiniz" />
                </SelectTrigger>
                <SelectContent>
                  {risks.map((risk) => (
                    <SelectItem key={risk.id} value={risk.id}>
                      {risk.code} - {risk.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setLinkSubGoalRiskDialogOpen(false)}>
                İptal
              </Button>
              <Button onClick={handleLinkSubGoalRisk}>Bağla</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Link Risk Dialog (Action) */}
      <Dialog open={linkActionRiskDialogOpen} onOpenChange={setLinkActionRiskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aksiyona Risk Bağla</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Risk Seçiniz</Label>
              <Select
                value={formData.riskId || ''}
                onValueChange={(v) => setFormData({ ...formData, riskId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Risk seçiniz" />
                </SelectTrigger>
                <SelectContent>
                  {risks.map((risk) => (
                    <SelectItem key={risk.id} value={risk.id}>
                      {risk.code} - {risk.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setLinkActionRiskDialogOpen(false)}>
                İptal
              </Button>
              <Button onClick={handleLinkActionRisk}>Bağla</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mission/Vision Dialog */}
      <Dialog open={missionVisionDialogOpen} onOpenChange={setMissionVisionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Misyon & Vizyon Düzenle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Misyon</Label>
              <Textarea
                value={formData.missionContent || ''}
                onChange={(e) => setFormData({ ...formData, missionContent: e.target.value })}
                rows={4}
              />
            </div>
            <div>
              <Label>Vizyon</Label>
              <Textarea
                value={formData.visionContent || ''}
                onChange={(e) => setFormData({ ...formData, visionContent: e.target.value })}
                rows={4}
              />
            </div>
            <div>
              <Label>Vizyon Hedef Yılı</Label>
              <Input
                type="number"
                value={formData.visionTargetYear || ''}
                onChange={(e) => setFormData({ ...formData, visionTargetYear: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setMissionVisionDialogOpen(false)}>
                İptal
              </Button>
              <Button onClick={handleUpdateMissionVision}>Kaydet</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hedef İlerleme Dialog */}
      <Dialog open={progressDialogOpen} onOpenChange={setProgressDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Hedef İlerleme Takibi</DialogTitle>
          </DialogHeader>
          
          {currentGoalData && (
            <div className="space-y-4">
              {/* Hedef Bilgileri */}
              <Card className="bg-gray-50">
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Hedef</p>
                      <p className="font-medium">{currentGoalData.name}</p>
                      <Badge variant="outline" className="mt-1">{currentGoalData.code}</Badge>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">İlerleme</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {currentGoalData.currentValue ?? 0} / {currentGoalData.targetValue} {currentGoalData.unit || ''}
                      </p>
                      <div className="flex items-center justify-end gap-2 mt-1">
                        <Progress 
                          value={currentGoalData.targetValue ? Math.round((currentGoalData.currentValue ?? 0) / currentGoalData.targetValue * 100) : 0} 
                          className="w-24 h-2" 
                        />
                        <span className="text-sm font-medium">
                          {currentGoalData.targetValue ? Math.round((currentGoalData.currentValue ?? 0) / currentGoalData.targetValue * 100) : 0}%
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Yeni Değer Girişi */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Yeni Değer Ekle</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <Label>Değer ({currentGoalData.unit || ''})</Label>
                      <Input
                        type="number"
                        value={progressValue}
                        onChange={(e) => setProgressValue(e.target.value)}
                        placeholder="Ör: 50000"
                      />
                    </div>
                    <div className="flex-1">
                      <Label>Açıklama (Opsiyonel)</Label>
                      <Input
                        value={progressNote}
                        onChange={(e) => setProgressNote(e.target.value)}
                        placeholder="Açıklama ekleyin..."
                      />
                    </div>
                    <div className="flex items-end">
                      <Button 
                        onClick={saveProgressEntry} 
                        disabled={savingProgress || !progressValue}
                      >
                        {savingProgress ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Kaydediliyor...
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-2" />
                            Ekle
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* İlerleme Geçmişi */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">İlerleme Geçmişi</CardTitle>
                </CardHeader>
                <CardContent>
                  {progressLoading ? (
                    <div className="flex justify-center py-4">
                      <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : progressEntries.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      Henüz ilerleme kaydı yok
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tarih</TableHead>
                          <TableHead>Kullanıcı</TableHead>
                          <TableHead className="text-right">Eklenen Değer</TableHead>
                          <TableHead className="text-right">Toplam</TableHead>
                          <TableHead>Açıklama</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {progressEntries.map((entry: any) => (
                          <TableRow key={entry.id}>
                            <TableCell className="text-sm">
                              {format(new Date(entry.createdAt), 'dd MMM yyyy HH:mm', { locale: tr })}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-xs font-medium text-purple-700">
                                  {entry.createdBy?.name?.[0]}{entry.createdBy?.surname?.[0]}
                                </div>
                                <span className="text-sm">{entry.createdBy?.name} {entry.createdBy?.surname}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-medium text-green-600">
                              +{entry.value.toLocaleString('tr-TR')} {currentGoalData.unit || ''}
                            </TableCell>
                            <TableCell className="text-right text-sm text-muted-foreground">
                              {((entry.previousValue || 0) + entry.value).toLocaleString('tr-TR')} {currentGoalData.unit || ''}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {entry.note || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setProgressDialogOpen(false)}>
                  Kapat
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}