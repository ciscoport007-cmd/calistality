'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Building2,
  Users,
  User,
  Target,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertTriangle,
  BarChart3,
  Gauge,
  Activity,
  Award,
  ArrowUp,
  ArrowDown,
  Minus,
  RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'sonner';

interface Period {
  id: string;
  name: string;
  status: string;
  startDate: string;
  endDate: string;
}

interface PerspectiveScore {
  id: string;
  code: string;
  name: string;
  color: string;
  sortOrder: number;
  score: number;
  metrics: {
    totalObjectives: number;
    completedObjectives: number;
    avgObjectiveProgress: number;
    totalGoals: number;
    completedGoals: number;
    goalCompletionRate: number;
    totalActions: number;
    completedActions: number;
    actionCompletionRate: number;
    totalKPIs: number;
    kpisOnTarget: number;
    kpiAchievementRate: number;
  };
}

interface OrgScorecard {
  period: Period;
  overallScore: number;
  perspectives: PerspectiveScore[];
  totals: {
    totalObjectives: number;
    completedObjectives: number;
    totalGoals: number;
    completedGoals: number;
    totalActions: number;
    completedActions: number;
    totalKPIs: number;
    kpisOnTarget: number;
    objectiveCompletionRate: number;
    goalCompletionRate: number;
    actionCompletionRate: number;
    kpiAchievementRate: number;
  };
}

interface DeptScorecard {
  department: { id: string; name: string; code: string };
  period: Period;
  overallScore: number;
  metrics: {
    objectives: { total: number; completed: number; avgProgress: number };
    goals: { total: number; completed: number; completionRate: number };
    actions: {
      total: number;
      completed: number;
      inProgress: number;
      delayed: number;
      completionRate: number;
    };
    kpis: {
      total: number;
      onTarget: number;
      warning: number;
      critical: number;
      achievementRate: number;
    };
  };
  objectives: any[];
  actions: any[];
}

interface IndividualScorecard {
  user: {
    id: string;
    name: string;
    email: string;
    department: { id: string; name: string } | null;
    position: string | null;
  };
  period: Period;
  overallScore: number;
  metrics: {
    objectives: { total: number; completed: number; avgProgress: number };
    goals: { total: number; completed: number; avgProgress: number };
    subGoals: { total: number; completed: number };
    actions: {
      responsible: number;
      accountable: number;
      completed: number;
      inProgress: number;
      delayed: number;
      avgCompletion: number;
    };
    kpis: { total: number; onTarget: number; warning: number; critical: number };
  };
  objectives: any[];
  goals: any[];
  actions: any[];
  kpis: any[];
}

export default function ScorecardsPage() {
  const { data: session } = useSession() || {};
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('organization');
  const [loading, setLoading] = useState(true);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [departments, setDepartments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  // Scorecard data
  const [orgScorecard, setOrgScorecard] = useState<OrgScorecard | null>(null);
  const [deptScorecard, setDeptScorecard] = useState<DeptScorecard | null>(null);
  const [individualScorecard, setIndividualScorecard] =
    useState<IndividualScorecard | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (activeTab === 'organization' && selectedPeriodId) {
      fetchOrgScorecard();
    } else if (activeTab === 'department' && selectedDeptId) {
      fetchDeptScorecard();
    } else if (activeTab === 'individual' && selectedUserId) {
      fetchIndividualScorecard();
    }
  }, [activeTab, selectedPeriodId, selectedDeptId, selectedUserId]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      // Fetch periods
      const periodsRes = await fetch('/api/strategy-periods');
      const periodsData = await periodsRes.json();
      const periodsList = Array.isArray(periodsData) ? periodsData : [];
      setPeriods(periodsList);

      // Set active period as default
      const activePeriod = periodsList.find((p: any) => p.status === 'AKTIF');
      if (activePeriod) {
        setSelectedPeriodId(activePeriod.id);
      } else if (periodsList.length > 0) {
        setSelectedPeriodId(periodsList[0].id);
      }

      // Fetch departments
      const deptsRes = await fetch('/api/departments');
      const deptsData = await deptsRes.json();
      const deptList = deptsData.departments || deptsData;
      setDepartments(Array.isArray(deptList) ? deptList : []);

      // Fetch users
      const usersRes = await fetch('/api/users');
      const usersData = await usersRes.json();
      setUsers(Array.isArray(usersData) ? usersData : []);

      // Set current user as default for individual scorecard
      if (session?.user?.id) {
        setSelectedUserId(session.user.id);
      }
    } catch (error) {
      console.error('Error fetching initial data:', error);
      toast.error('Veriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrgScorecard = async () => {
    try {
      const res = await fetch(
        `/api/scorecards/organization?periodId=${selectedPeriodId}`
      );
      const data = await res.json();
      if (data.success) {
        setOrgScorecard(data.data);
      }
    } catch (error) {
      console.error('Error fetching org scorecard:', error);
    }
  };

  const fetchDeptScorecard = async () => {
    if (!selectedDeptId) return;
    try {
      const res = await fetch(
        `/api/scorecards/department/${selectedDeptId}?periodId=${selectedPeriodId}`
      );
      const data = await res.json();
      if (data.success) {
        setDeptScorecard(data.data);
      }
    } catch (error) {
      console.error('Error fetching dept scorecard:', error);
    }
  };

  const fetchIndividualScorecard = async () => {
    if (!selectedUserId) return;
    try {
      const res = await fetch(
        `/api/scorecards/individual/${selectedUserId}?periodId=${selectedPeriodId}`
      );
      const data = await res.json();
      if (data.success) {
        setIndividualScorecard(data.data);
      }
    } catch (error) {
      console.error('Error fetching individual scorecard:', error);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    if (score >= 40) return 'bg-orange-100';
    return 'bg-red-100';
  };

  const getProgressColor = (value: number) => {
    if (value >= 80) return 'bg-green-500';
    if (value >= 60) return 'bg-yellow-500';
    if (value >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const ScoreGauge = ({ score, size = 'large' }: { score: number; size?: 'large' | 'small' }) => {
    const sizeClasses = size === 'large' ? 'w-32 h-32' : 'w-20 h-20';
    const fontSize = size === 'large' ? 'text-3xl' : 'text-lg';
    const circumference = size === 'large' ? 301.59 : 188.5;
    const strokeWidth = size === 'large' ? 8 : 6;
    const radius = size === 'large' ? 48 : 30;
    const center = size === 'large' ? 64 : 40;
    const viewBox = size === 'large' ? '0 0 128 128' : '0 0 80 80';
    
    const progress = (score / 100) * circumference;

    return (
      <div className={`relative ${sizeClasses}`}>
        <svg className="w-full h-full -rotate-90" viewBox={viewBox}>
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : score >= 40 ? '#f97316' : '#ef4444'}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-bold ${fontSize} ${getScoreColor(score)}`}>
            {score}
          </span>
        </div>
      </div>
    );
  };

  const MetricCard = ({
    title,
    value,
    total,
    icon: Icon,
    color,
  }: {
    title: string;
    value: number;
    total?: number;
    icon: any;
    color: string;
  }) => (
    <div className={`p-4 rounded-lg ${color} bg-opacity-10`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-5 w-5 ${color.replace('bg-', 'text-')}`} />
        <span className="text-sm font-medium text-gray-600">{title}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold">{value}</span>
        {total !== undefined && (
          <span className="text-sm text-gray-500">/ {total}</span>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Performans Karneleri</h1>
          <p className="text-gray-600">Kurum, departman ve bireysel performans takibi</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Dönem Seçin" />
            </SelectTrigger>
            <SelectContent>
              {periods.map((period) => (
                <SelectItem key={period.id} value={period.id}>
                  {period.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => {
            if (activeTab === 'organization') fetchOrgScorecard();
            else if (activeTab === 'department') fetchDeptScorecard();
            else fetchIndividualScorecard();
          }}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="organization" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Kurum Karnesi
          </TabsTrigger>
          <TabsTrigger value="department" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Departman Karnesi
          </TabsTrigger>
          <TabsTrigger value="individual" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Bireysel Karne
          </TabsTrigger>
        </TabsList>

        {/* Organization Scorecard */}
        <TabsContent value="organization" className="space-y-6">
          {orgScorecard ? (
            <>
              {/* Overall Score */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row items-center gap-8">
                    <ScoreGauge score={orgScorecard.overallScore} />
                    <div className="flex-1 space-y-4">
                      <div>
                        <h2 className="text-xl font-semibold">Genel Kurum Performansı</h2>
                        <p className="text-gray-600">
                          {orgScorecard.period.name} (
                          {format(new Date(orgScorecard.period.startDate), 'dd MMM yyyy', { locale: tr })} -
                          {format(new Date(orgScorecard.period.endDate), 'dd MMM yyyy', { locale: tr })})
                        </p>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">
                            {orgScorecard.totals.objectiveCompletionRate}%
                          </div>
                          <div className="text-xs text-gray-600">Amaç Tamamlanma</div>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">
                            {orgScorecard.totals.goalCompletionRate}%
                          </div>
                          <div className="text-xs text-gray-600">Hedef Tamamlanma</div>
                        </div>
                        <div className="text-center p-3 bg-purple-50 rounded-lg">
                          <div className="text-2xl font-bold text-purple-600">
                            {orgScorecard.totals.actionCompletionRate}%
                          </div>
                          <div className="text-xs text-gray-600">Eylem Tamamlanma</div>
                        </div>
                        <div className="text-center p-3 bg-orange-50 rounded-lg">
                          <div className="text-2xl font-bold text-orange-600">
                            {orgScorecard.totals.kpiAchievementRate}%
                          </div>
                          <div className="text-xs text-gray-600">KPI Başarı</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Perspective Scores */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {orgScorecard.perspectives.map((perspective) => (
                  <Card key={perspective.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium">
                          {perspective.name}
                        </CardTitle>
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: perspective.color }}
                        />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between mb-4">
                        <ScoreGauge score={perspective.score} size="small" />
                        <div className="text-right text-sm">
                          <div className="text-gray-600">Amaç</div>
                          <div className="font-semibold">
                            {perspective.metrics.completedObjectives}/
                            {perspective.metrics.totalObjectives}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Hedefler</span>
                          <span className="font-medium">
                            {perspective.metrics.completedGoals}/{perspective.metrics.totalGoals}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Eylemler</span>
                          <span className="font-medium">
                            {perspective.metrics.completedActions}/{perspective.metrics.totalActions}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">KPI Hedefte</span>
                          <span className="font-medium">
                            {perspective.metrics.kpisOnTarget}/{perspective.metrics.totalKPIs}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Totals Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Genel Özet</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <MetricCard
                      title="Toplam Amaç"
                      value={orgScorecard.totals.completedObjectives}
                      total={orgScorecard.totals.totalObjectives}
                      icon={Target}
                      color="bg-blue-500"
                    />
                    <MetricCard
                      title="Toplam Hedef"
                      value={orgScorecard.totals.completedGoals}
                      total={orgScorecard.totals.totalGoals}
                      icon={TrendingUp}
                      color="bg-green-500"
                    />
                    <MetricCard
                      title="Toplam Eylem"
                      value={orgScorecard.totals.completedActions}
                      total={orgScorecard.totals.totalActions}
                      icon={CheckCircle2}
                      color="bg-purple-500"
                    />
                    <MetricCard
                      title="KPI Hedefte"
                      value={orgScorecard.totals.kpisOnTarget}
                      total={orgScorecard.totals.totalKPIs}
                      icon={Activity}
                      color="bg-orange-500"
                    />
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aktif strateji dönemi bulunamadı</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Department Scorecard */}
        <TabsContent value="department" className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Select value={selectedDeptId} onValueChange={setSelectedDeptId}>
                  <SelectTrigger className="w-[300px]">
                    <SelectValue placeholder="Departman Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {deptScorecard ? (
            <>
              {/* Department Score */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row items-center gap-8">
                    <ScoreGauge score={deptScorecard.overallScore} />
                    <div className="flex-1 space-y-4">
                      <div>
                        <h2 className="text-xl font-semibold">
                          {deptScorecard.department.name} Performansı
                        </h2>
                        <p className="text-gray-600">
                          {deptScorecard.period.name}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">
                            {deptScorecard.metrics.objectives.avgProgress}%
                          </div>
                          <div className="text-xs text-gray-600">Amaç İlerleme</div>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">
                            {deptScorecard.metrics.goals.completionRate}%
                          </div>
                          <div className="text-xs text-gray-600">Hedef Tamamlanma</div>
                        </div>
                        <div className="text-center p-3 bg-purple-50 rounded-lg">
                          <div className="text-2xl font-bold text-purple-600">
                            {deptScorecard.metrics.actions.completionRate}%
                          </div>
                          <div className="text-xs text-gray-600">Eylem Tamamlanma</div>
                        </div>
                        <div className="text-center p-3 bg-orange-50 rounded-lg">
                          <div className="text-2xl font-bold text-orange-600">
                            {deptScorecard.metrics.kpis.achievementRate}%
                          </div>
                          <div className="text-xs text-gray-600">KPI Başarı</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Department Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Actions Status */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Eylem Durumu</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          Tamamlanan
                        </span>
                        <span className="font-semibold">
                          {deptScorecard.metrics.actions.completed}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-blue-500" />
                          Devam Eden
                        </span>
                        <span className="font-semibold">
                          {deptScorecard.metrics.actions.inProgress}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                          Geciken
                        </span>
                        <span className="font-semibold text-red-600">
                          {deptScorecard.metrics.actions.delayed}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* KPI Status */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">KPI Durumu</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <ArrowUp className="h-4 w-4 text-green-500" />
                          Hedefte
                        </span>
                        <span className="font-semibold text-green-600">
                          {deptScorecard.metrics.kpis.onTarget}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Minus className="h-4 w-4 text-yellow-500" />
                          Uyarı
                        </span>
                        <span className="font-semibold text-yellow-600">
                          {deptScorecard.metrics.kpis.warning}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <ArrowDown className="h-4 w-4 text-red-500" />
                          Kritik
                        </span>
                        <span className="font-semibold text-red-600">
                          {deptScorecard.metrics.kpis.critical}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Actions */}
              {deptScorecard.actions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Son Eylemler</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {deptScorecard.actions.map((action: any) => (
                        <div
                          key={action.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div>
                            <div className="font-medium">{action.code}</div>
                            <div className="text-sm text-gray-600">{action.name}</div>
                          </div>
                          <div className="text-right">
                            <Badge
                              variant={
                                action.status === 'KAPANDI'
                                  ? 'default'
                                  : action.status === 'DEVAM_EDIYOR'
                                  ? 'secondary'
                                  : 'outline'
                              }
                            >
                              {action.completionRate}%
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : selectedDeptId ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin" />
                <p>Yükleniyor...</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Lütfen bir departman seçin</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Individual Scorecard */}
        <TabsContent value="individual" className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger className="w-[300px]">
                    <SelectValue placeholder="Kullanıcı Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} {user.surname || ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {individualScorecard ? (
            <>
              {/* Individual Score */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row items-center gap-8">
                    <ScoreGauge score={individualScorecard.overallScore} />
                    <div className="flex-1 space-y-4">
                      <div>
                        <h2 className="text-xl font-semibold">
                          {individualScorecard.user.name}
                        </h2>
                        <p className="text-gray-600">
                          {individualScorecard.user.position}
                          {individualScorecard.user.department &&
                            ` - ${individualScorecard.user.department.name}`}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">
                            {individualScorecard.metrics.objectives.avgProgress}%
                          </div>
                          <div className="text-xs text-gray-600">Amaç İlerleme</div>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">
                            {individualScorecard.metrics.goals.avgProgress}%
                          </div>
                          <div className="text-xs text-gray-600">Hedef İlerleme</div>
                        </div>
                        <div className="text-center p-3 bg-purple-50 rounded-lg">
                          <div className="text-2xl font-bold text-purple-600">
                            {individualScorecard.metrics.actions.avgCompletion}%
                          </div>
                          <div className="text-xs text-gray-600">Eylem Tamamlanma</div>
                        </div>
                        <div className="text-center p-3 bg-orange-50 rounded-lg">
                          <div className="text-2xl font-bold text-orange-600">
                            {individualScorecard.metrics.actions.responsible}
                          </div>
                          <div className="text-xs text-gray-600">Sorumlu Eylem</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Individual Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Owned Items */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Sahip Olunan</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span>Amaçlar</span>
                        <span className="font-semibold">
                          {individualScorecard.metrics.objectives.completed}/
                          {individualScorecard.metrics.objectives.total}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Hedefler</span>
                        <span className="font-semibold">
                          {individualScorecard.metrics.goals.completed}/
                          {individualScorecard.metrics.goals.total}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Alt Hedefler</span>
                        <span className="font-semibold">
                          {individualScorecard.metrics.subGoals.completed}/
                          {individualScorecard.metrics.subGoals.total}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Eylemler</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          Tamamlanan
                        </span>
                        <span className="font-semibold">
                          {individualScorecard.metrics.actions.completed}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-blue-500" />
                          Devam Eden
                        </span>
                        <span className="font-semibold">
                          {individualScorecard.metrics.actions.inProgress}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                          Geciken
                        </span>
                        <span className="font-semibold text-red-600">
                          {individualScorecard.metrics.actions.delayed}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* KPIs */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">KPI'lar</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <ArrowUp className="h-4 w-4 text-green-500" />
                          Hedefte
                        </span>
                        <span className="font-semibold text-green-600">
                          {individualScorecard.metrics.kpis.onTarget}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Minus className="h-4 w-4 text-yellow-500" />
                          Uyarı
                        </span>
                        <span className="font-semibold text-yellow-600">
                          {individualScorecard.metrics.kpis.warning}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <ArrowDown className="h-4 w-4 text-red-500" />
                          Kritik
                        </span>
                        <span className="font-semibold text-red-600">
                          {individualScorecard.metrics.kpis.critical}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Actions */}
              {individualScorecard.actions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Sorumlu Olduğum Eylemler</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {individualScorecard.actions.map((action: any) => (
                        <div
                          key={action.id}
                          className={`flex items-center justify-between p-3 rounded-lg ${
                            action.isDelayed ? 'bg-red-50' : 'bg-gray-50'
                          }`}
                        >
                          <div>
                            <div className="font-medium">{action.code}</div>
                            <div className="text-sm text-gray-600">{action.name}</div>
                          </div>
                          <div className="text-right">
                            <Badge
                              variant={
                                action.status === 'KAPANDI'
                                  ? 'default'
                                  : action.isDelayed
                                  ? 'destructive'
                                  : 'secondary'
                              }
                            >
                              {action.completionRate}%
                            </Badge>
                            {action.plannedEndDate && (
                              <div className="text-xs text-gray-500 mt-1">
                                {format(new Date(action.plannedEndDate), 'dd MMM', { locale: tr })}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : selectedUserId ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin" />
                <p>Yükleniyor...</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Lütfen bir kullanıcı seçin</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
