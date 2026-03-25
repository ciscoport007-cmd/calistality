'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import {
  Search,
  Filter,
  Play,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Target,
  Calendar,
  User,
  Building2,
  TrendingUp,
  Download,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { exportActionPlan, exportActionsToExcel } from '@/lib/export-utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Action {
  id: string;
  code: string;
  name: string;
  status: string;
  priority: string;
  progress: number;
  startDate: string | null;
  dueDate: string | null;
  budgetPlanned: number | null;
  budgetActual: number | null;
  currency: string;
  goal: {
    code: string;
    name: string;
    objective: {
      code: string;
      name: string;
      period: { code: string; name: string };
      perspective: { name: string };
    };
  } | null;
  subGoal: { code: string; name: string } | null;
  department: { name: string } | null;
  responsible: { name: string; email: string } | null;
  accountable: { name: string; email: string } | null;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  PLANLANDI: { label: 'Planlandı', color: 'bg-gray-100 text-gray-800', icon: Clock },
  DEVAM_EDIYOR: { label: 'Devam Ediyor', color: 'bg-blue-100 text-blue-800', icon: Play },
  BEKLEMEDE: { label: 'Beklemede', color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle },
  TAMAMLANDI: { label: 'Tamamlandı', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  IPTAL: { label: 'İptal', color: 'bg-red-100 text-red-800', icon: XCircle },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  DUSUK: { label: 'Düşük', color: 'bg-gray-100 text-gray-700' },
  ORTA: { label: 'Orta', color: 'bg-blue-100 text-blue-700' },
  YUKSEK: { label: 'Yüksek', color: 'bg-orange-100 text-orange-700' },
  KRITIK: { label: 'Kritik', color: 'bg-red-100 text-red-700' },
};

export default function ActionsPage() {
  const router = useRouter();
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [departments, setDepartments] = useState<any[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState('all');

  useEffect(() => {
    fetchActions();
    fetchDepartments();
  }, []);

  const fetchActions = async () => {
    try {
      const res = await fetch('/api/strategic-actions');
      if (res.ok) {
        const data = await res.json();
        setActions(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      toast.error('Aksiyonlar yüklenemedi');
      setActions([]);
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
      console.error('Departmanlar yüklenemedi');
      setDepartments([]);
    }
  };

  const filteredActions = actions.filter((action) => {
    const matchesSearch =
      action.name.toLowerCase().includes(search.toLowerCase()) ||
      action.code.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || action.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || action.priority === priorityFilter;
    const matchesDepartment = departmentFilter === 'all' || action.department?.name === departmentFilter;
    return matchesSearch && matchesStatus && matchesPriority && matchesDepartment;
  });

  // İstatistikler
  const stats = {
    total: actions.length,
    inProgress: actions.filter((a) => a.status === 'DEVAM_EDIYOR').length,
    completed: actions.filter((a) => a.status === 'TAMAMLANDI').length,
    delayed: actions.filter((a) => {
      if (!a.dueDate) return false;
      return new Date(a.dueDate) < new Date() && a.status !== 'TAMAMLANDI';
    }).length,
  };

  const avgProgress = actions.length > 0
    ? Math.round(actions.reduce((sum, a) => sum + a.progress, 0) / actions.length)
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stratejik Aksiyonlar</h1>
          <p className="text-gray-600 mt-1">Tüm stratejik aksiyonları yönetin</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" disabled={filteredActions.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Dışa Aktar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => {
              const exportData = filteredActions.map(a => ({
                code: a.code,
                name: a.name,
                description: '',
                status: a.status,
                priority: a.priority,
                progress: a.progress,
                startDate: a.startDate || undefined,
                dueDate: a.dueDate || undefined,
                plannedBudget: a.budgetPlanned || undefined,
                actualBudget: a.budgetActual || undefined,
                currency: a.currency,
                department: a.department || undefined,
                responsible: a.responsible || undefined,
                goal: a.goal || undefined,
              }));
              exportActionsToExcel(exportData, 'Aksiyon-Plani');
              toast.success('Excel dosyası indirildi');
            }}>
              <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
              Excel (.xlsx)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              const exportData = filteredActions.map(a => ({
                code: a.code,
                name: a.name,
                description: '',
                status: a.status,
                priority: a.priority,
                progress: a.progress,
                startDate: a.startDate || undefined,
                dueDate: a.dueDate || undefined,
                plannedBudget: a.budgetPlanned || undefined,
                actualBudget: a.budgetActual || undefined,
                currency: a.currency,
                department: a.department || undefined,
                responsible: a.responsible || undefined,
                goal: a.goal || undefined,
              }));
              exportActionPlan(exportData, 'Aksiyon-Plani', 'Stratejik Aksiyon Planı');
              toast.success('PDF dosyası indirildi');
            }}>
              <FileText className="h-4 w-4 mr-2 text-red-600" />
              PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Toplam</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Target className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Devam Eden</p>
                <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
              </div>
              <Play className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tamamlanan</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Geciken</p>
                <p className="text-2xl font-bold text-red-600">{stats.delayed}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Ort. İlerleme</p>
                <p className="text-2xl font-bold text-purple-600">%{avgProgress}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtreler */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Aksiyon ara..."
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
                {Object.entries(statusConfig).map(([key, val]) => (
                  <SelectItem key={key} value={key}>{val.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Öncelik" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Öncelikler</SelectItem>
                {Object.entries(priorityConfig).map(([key, val]) => (
                  <SelectItem key={key} value={key}>{val.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Departman" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Departmanlar</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Aksiyonlar Tablosu */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kod</TableHead>
                <TableHead>Aksiyon</TableHead>
                <TableHead>Hedef</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Öncelik</TableHead>
                <TableHead>İlerleme</TableHead>
                <TableHead>Sorumlu</TableHead>
                <TableHead>Bitiş Tarihi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredActions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    Aksiyon bulunamadı
                  </TableCell>
                </TableRow>
              ) : (
                filteredActions.map((action) => {
                  const status = statusConfig[action.status] || statusConfig.PLANLANDI;
                  const priority = priorityConfig[action.priority] || priorityConfig.ORTA;
                  const StatusIcon = status.icon;
                  const isDelayed = action.dueDate && new Date(action.dueDate) < new Date() && action.status !== 'TAMAMLANDI';

                  return (
                    <TableRow
                      key={action.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => router.push(`/dashboard/strategy/actions/${action.id}`)}
                    >
                      <TableCell className="font-mono text-sm">{action.code}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{action.name}</p>
                          {action.department && (
                            <p className="text-sm text-gray-500 flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {action.department.name}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {action.goal ? (
                          <div className="text-sm">
                            <p className="font-medium">{action.goal.code}</p>
                            <p className="text-gray-500 truncate max-w-[200px]">{action.goal.name}</p>
                          </div>
                        ) : action.subGoal ? (
                          <div className="text-sm">
                            <p className="font-medium">{action.subGoal.code}</p>
                            <p className="text-gray-500 truncate max-w-[200px]">{action.subGoal.name}</p>
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge className={status.color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={priority.color}>{priority.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="w-24">
                          <div className="flex items-center gap-2">
                            <Progress value={action.progress} className="h-2" />
                            <span className="text-sm text-gray-600">%{action.progress}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {action.responsible ? (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span>{action.responsible.name}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {action.dueDate ? (
                          <div className={`flex items-center gap-1 ${isDelayed ? 'text-red-600' : ''}`}>
                            <Calendar className="h-4 w-4" />
                            {format(new Date(action.dueDate), 'dd MMM yyyy', { locale: tr })}
                          </div>
                        ) : '-'}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
