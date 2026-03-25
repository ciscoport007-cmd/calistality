'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
  Search,
  Filter,
  Clock,
  User,
  Activity,
  ChevronLeft,
  ChevronRight,
  Eye,
  ArrowRight,
  Shield,
  FileText,
  AlertCircle,
  Settings,
  Package,
  Users,
  ClipboardList,
  Target,
  Briefcase,
  BarChart3,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
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
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';

interface AuditLog {
  id: string;
  userId: string | null;
  user: {
    id: string;
    name: string;
    surname: string | null;
    email: string;
    department: { name: string } | null;
  } | null;
  action: string;
  module: string;
  entityType: string | null;
  entityId: string | null;
  oldValues: Record<string, any> | null;
  newValues: Record<string, any> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const actionLabels: Record<string, { label: string; color: string }> = {
  CREATE: { label: 'Oluşturma', color: 'bg-green-100 text-green-800' },
  UPDATE: { label: 'Güncelleme', color: 'bg-blue-100 text-blue-800' },
  DELETE: { label: 'Silme', color: 'bg-red-100 text-red-800' },
  VIEW: { label: 'Görüntüleme', color: 'bg-gray-100 text-gray-800' },
  APPROVE: { label: 'Onay', color: 'bg-emerald-100 text-emerald-800' },
  REJECT: { label: 'Red', color: 'bg-orange-100 text-orange-800' },
  STATUS_CHANGE: { label: 'Durum Değişikliği', color: 'bg-purple-100 text-purple-800' },
  LOGIN: { label: 'Giriş', color: 'bg-cyan-100 text-cyan-800' },
  LOGOUT: { label: 'Çıkış', color: 'bg-slate-100 text-slate-800' },
};

const moduleLabels: Record<string, { label: string; icon: any }> = {
  USERS: { label: 'Kullanıcılar', icon: Users },
  ROLES: { label: 'Roller', icon: Shield },
  DEPARTMENTS: { label: 'Departmanlar', icon: Briefcase },
  DOCUMENTS: { label: 'Dokümanlar', icon: FileText },
  COMPLAINTS: { label: 'Şikayetler', icon: AlertCircle },
  CAPAS: { label: 'CAPA/DÖF', icon: ClipboardList },
  AUDITS: { label: 'Denetimler', icon: ClipboardList },
  RISKS: { label: 'Riskler', icon: AlertCircle },
  EQUIPMENT: { label: 'Ekipmanlar', icon: Package },
  SUPPLIERS: { label: 'Tedarikçiler', icon: Briefcase },
  TRAININGS: { label: 'Eğitimler', icon: Users },
  KPIS: { label: 'KPI\'lar', icon: BarChart3 },
  STRATEGY: { label: 'Strateji', icon: Target },
  SWOT: { label: 'SWOT', icon: Target },
  PESTEL: { label: 'PESTEL', icon: Target },
  AUTH: { label: 'Kimlik Doğrulama', icon: Shield },
};

export default function AuditLogsPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [users, setUsers] = useState<any[]>([]);

  // Filters
  const [filters, setFilters] = useState({
    module: '',
    action: '',
    userId: '',
    startDate: '',
    endDate: '',
    search: '',
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      // Check if user is admin
      if (session?.user?.role !== 'Admin' && session?.user?.role !== 'Yönetici' && session?.user?.role !== 'admin') {
        toast.error('Bu sayfaya erişim yetkiniz yok');
        router.push('/dashboard');
        return;
      }
      fetchLogs();
      fetchUsers();
    }
  }, [status, session]);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(Array.isArray(data.users) ? data.users : []);
      }
    } catch (error) {
      console.error('Users fetch error:', error);
    }
  };

  const fetchLogs = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '50');
      
      if (filters.module) params.set('module', filters.module);
      if (filters.action) params.set('action', filters.action);
      if (filters.userId) params.set('userId', filters.userId);
      if (filters.startDate) params.set('startDate', filters.startDate);
      if (filters.endDate) params.set('endDate', filters.endDate);
      if (filters.search) params.set('search', filters.search);

      const res = await fetch(`/api/audits-log?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setPagination(data.pagination);
      } else if (res.status === 403) {
        toast.error('Bu sayfaya erişim yetkiniz yok');
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Logs fetch error:', error);
      toast.error('Loglar yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    fetchLogs(1);
  };

  const handleClearFilters = () => {
    setFilters({
      module: '',
      action: '',
      userId: '',
      startDate: '',
      endDate: '',
      search: '',
    });
    fetchLogs(1);
  };

  const renderChanges = (oldValues: Record<string, any> | null, newValues: Record<string, any> | null) => {
    if (!oldValues && !newValues) return null;

    const allKeys = new Set([
      ...Object.keys(oldValues || {}),
      ...Object.keys(newValues || {}),
    ]);

    return (
      <div className="space-y-2">
        {Array.from(allKeys).map((key) => {
          const oldVal = oldValues?.[key];
          const newVal = newValues?.[key];
          
          return (
            <div key={key} className="flex items-start gap-2 text-sm">
              <span className="font-medium min-w-[120px] text-muted-foreground">{key}:</span>
              <div className="flex items-center gap-2">
                {oldVal !== undefined && (
                  <span className="px-2 py-0.5 bg-red-50 text-red-700 rounded line-through">
                    {typeof oldVal === 'object' ? JSON.stringify(oldVal) : String(oldVal)}
                  </span>
                )}
                {oldVal !== undefined && newVal !== undefined && (
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                )}
                {newVal !== undefined && (
                  <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded">
                    {typeof newVal === 'object' ? JSON.stringify(newVal) : String(newVal)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Denetim Geçmişi</h1>
          <p className="text-muted-foreground">Sistem genelinde yapılan tüm işlemlerin kaydı</p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          <Activity className="h-5 w-5 mr-2" />
          {pagination.total} Kayıt
        </Badge>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtreler
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <Label className="text-xs">Modül</Label>
              <Select value={filters.module || 'all'} onValueChange={(v) => setFilters({ ...filters, module: v === 'all' ? '' : v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Tümü" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  {Object.entries(moduleLabels).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">İşlem</Label>
              <Select value={filters.action || 'all'} onValueChange={(v) => setFilters({ ...filters, action: v === 'all' ? '' : v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Tümü" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  {Object.entries(actionLabels).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Kullanıcı</Label>
              <Select value={filters.userId || 'all'} onValueChange={(v) => setFilters({ ...filters, userId: v === 'all' ? '' : v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Tümü" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} {user.surname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Başlangıç Tarihi</Label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs">Bitiş Tarihi</Label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs">Arama</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Ara..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pl-8"
                />
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={handleFilter}>Filtrele</Button>
            <Button variant="outline" onClick={handleClearFilters}>Temizle</Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarih/Saat</TableHead>
                <TableHead>Kullanıcı</TableHead>
                <TableHead>İşlem</TableHead>
                <TableHead>Modül</TableHead>
                <TableHead>Kayıt Tipi</TableHead>
                <TableHead>Kayıt ID</TableHead>
                <TableHead className="text-right">Detay</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Kayıt bulunamadı
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => {
                  const actionConfig = actionLabels[log.action] || { label: log.action, color: 'bg-gray-100 text-gray-800' };
                  const moduleConfig = moduleLabels[log.module] || { label: log.module, icon: Settings };
                  const ModuleIcon = moduleConfig.icon;

                  return (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">
                              {format(new Date(log.createdAt), 'dd MMM yyyy', { locale: tr })}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(log.createdAt), 'HH:mm:ss')}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.user ? (
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">
                                {log.user.name} {log.user.surname}
                              </p>
                              <p className="text-xs text-muted-foreground">{log.user.email}</p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Sistem</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={actionConfig.color}>{actionConfig.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <ModuleIcon className="h-4 w-4 text-muted-foreground" />
                          <span>{moduleConfig.label}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{log.entityType || '-'}</span>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {log.entityId ? log.entityId.substring(0, 8) + '...' : '-'}
                        </code>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLog(log)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Toplam {pagination.total} kayıttan {(pagination.page - 1) * pagination.limit + 1} -{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} gösteriliyor
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchLogs(pagination.page - 1)}
              disabled={pagination.page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Sayfa {pagination.page} / {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchLogs(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Denetim Kaydı Detayı
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-6">
              {/* Meta Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Tarih/Saat</Label>
                  <p className="font-medium">
                    {format(new Date(selectedLog.createdAt), 'dd MMMM yyyy HH:mm:ss', { locale: tr })}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Kullanıcı</Label>
                  <p className="font-medium">
                    {selectedLog.user ? `${selectedLog.user.name} ${selectedLog.user.surname}` : 'Sistem'}
                  </p>
                  {selectedLog.user && (
                    <p className="text-sm text-muted-foreground">{selectedLog.user.email}</p>
                  )}
                </div>
                <div>
                  <Label className="text-muted-foreground">İşlem</Label>
                  <Badge className={actionLabels[selectedLog.action]?.color || 'bg-gray-100'}>
                    {actionLabels[selectedLog.action]?.label || selectedLog.action}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">Modül</Label>
                  <p className="font-medium">
                    {moduleLabels[selectedLog.module]?.label || selectedLog.module}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Kayıt Tipi</Label>
                  <p className="font-medium">{selectedLog.entityType || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Kayıt ID</Label>
                  <code className="text-sm bg-muted px-2 py-1 rounded block mt-1">
                    {selectedLog.entityId || '-'}
                  </code>
                </div>
              </div>

              {/* Changes */}
              {(selectedLog.oldValues || selectedLog.newValues) && (
                <div>
                  <Label className="text-muted-foreground mb-2 block">Değişiklikler</Label>
                  <Card>
                    <CardContent className="pt-4">
                      {renderChanges(selectedLog.oldValues, selectedLog.newValues)}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Technical Info */}
              <div className="border-t pt-4">
                <Label className="text-muted-foreground mb-2 block">Teknik Bilgiler</Label>
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">IP Adresi: </span>
                    <code className="bg-muted px-2 py-0.5 rounded">{selectedLog.ipAddress || 'Bilinmiyor'}</code>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tarayıcı: </span>
                    <span className="text-xs">{selectedLog.userAgent || 'Bilinmiyor'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
