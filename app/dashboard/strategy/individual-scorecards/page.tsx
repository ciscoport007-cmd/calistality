'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Plus, User, Calendar, Calculator, CheckCircle, XCircle, Clock, Eye, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface Scorecard {
  id: string;
  code: string;
  year: number;
  period?: number;
  periodType: string;
  kpiScore?: number;
  competencyScore?: number;
  initiativeScore?: number;
  corporateScore?: number;
  departmentScore?: number;
  dimensionScore?: number;
  totalScore?: number;
  scoreLevel?: string;
  status: string;
  user: {
    id: string;
    name: string;
    email: string;
    department?: { name: string };
    position?: { name: string };
  };
  formula?: { name: string };
  createdAt: string;
  approvedBy?: { name: string };
  approvedAt?: string;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  TASLAK: { label: 'Taslak', color: 'bg-gray-500' },
  HESAPLANDI: { label: 'Hesaplandı', color: 'bg-blue-500' },
  BEKLEMEDE: { label: 'Onay Bekliyor', color: 'bg-yellow-500' },
  ONAYLANDI: { label: 'Onaylandı', color: 'bg-green-500' },
  REDDEDILDI: { label: 'Reddedildi', color: 'bg-red-500' },
};

export default function IndividualScorecardsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [scorecards, setScorecards] = useState<Scorecard[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [formulas, setFormulas] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Filtreler
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const [formData, setFormData] = useState({
    userId: '',
    year: new Date().getFullYear(),
    periodType: 'YILLIK',
    period: null as number | null,
    formulaId: '',
  });

  const fetchData = async () => {
    try {
      const params = new URLSearchParams();
      if (filterYear && filterYear !== 'all') params.append('year', filterYear);
      if (filterDepartment && filterDepartment !== 'all') params.append('departmentId', filterDepartment);
      if (filterStatus && filterStatus !== 'all') params.append('status', filterStatus);

      const [scorecardsRes, usersRes, formulasRes, deptsRes] = await Promise.all([
        fetch(`/api/individual-scorecards?${params}`),
        fetch('/api/users'),
        fetch('/api/scorecard-formulas?isActive=true'),
        fetch('/api/departments'),
      ]);

      const scorecardsData = await scorecardsRes.json();
      const usersData = await usersRes.json();
      const formulasData = await formulasRes.json();
      const deptsData = await deptsRes.json();

      setScorecards(Array.isArray(scorecardsData) ? scorecardsData : []);
      // Users API returns { users: [...] } - extract the users array
      const usersList = usersData?.users || usersData;
      setUsers(Array.isArray(usersList) ? usersList : []);
      setFormulas(Array.isArray(formulasData) ? formulasData : []);
      const deptList = deptsData.departments || deptsData;
      setDepartments(Array.isArray(deptList) ? deptList : []);
    } catch (error) {
      toast.error('Veriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterYear, filterDepartment, filterStatus]);

  const handleCreate = async () => {
    if (!formData.userId || !formData.year) {
      toast.error('Personel ve yıl seçimi gereklidir');
      return;
    }

    try {
      const res = await fetch('/api/individual-scorecards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          formulaId: formData.formulaId || null,
        }),
      });

      if (res.ok) {
        toast.success('Bireysel karne oluşturuldu');
        setDialogOpen(false);
        setFormData({
          userId: '',
          year: new Date().getFullYear(),
          periodType: 'YILLIK',
          period: null,
          formulaId: '',
        });
        fetchData();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Bir hata oluştu');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    }
  };

  const handleCalculate = async (id: string) => {
    try {
      const res = await fetch(`/api/individual-scorecards/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'calculate' }),
      });

      if (res.ok) {
        toast.success('Karne hesaplandı');
        fetchData();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Hesaplama hatası');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    }
  };

  const getScoreColor = (score?: number) => {
    if (!score) return 'text-gray-500';
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Bireysel Performans Karneleri</h1>
          <p className="text-muted-foreground">Personel bazlı 3 boyutlu performans değerlendirmesi</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Yeni Karne
        </Button>
      </div>

      {/* Filtreler */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-4">
            <div className="w-40">
              <Label>Yıl</Label>
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Yıllar</SelectItem>
                  {[2024, 2025, 2026].map((y) => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-48">
              <Label>Departman</Label>
              <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Departmanlar</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-40">
              <Label>Durum</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Durumlar</SelectItem>
                  {Object.entries(statusLabels).map(([key, val]) => (
                    <SelectItem key={key} value={key}>{val.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Özet Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{scorecards.length}</div>
            <p className="text-sm text-muted-foreground">Toplam Karne</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-500">
              {scorecards.filter(s => s.status === 'ONAYLANDI').length}
            </div>
            <p className="text-sm text-muted-foreground">Onaylı</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-500">
              {scorecards.filter(s => s.status === 'BEKLEMEDE').length}
            </div>
            <p className="text-sm text-muted-foreground">Onay Bekliyor</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">
              {scorecards.length > 0 
                ? (scorecards.filter(s => s.totalScore).reduce((sum, s) => sum + (s.totalScore || 0), 0) / scorecards.filter(s => s.totalScore).length || 0).toFixed(1)
                : '0'
              }
            </div>
            <p className="text-sm text-muted-foreground">Ortalama Puan</p>
          </CardContent>
        </Card>
      </div>

      {/* Karne Listesi */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Personel</TableHead>
              <TableHead>Dönem</TableHead>
              <TableHead className="text-center">KPI</TableHead>
              <TableHead className="text-center">Yetkinlik</TableHead>
              <TableHead className="text-center">İnisiyatif</TableHead>
              <TableHead className="text-center">Toplam</TableHead>
              <TableHead className="text-center">Seviye</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {scorecards.map((sc) => (
              <TableRow key={sc.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{sc.user.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {sc.user.department?.name} - {sc.user.position?.name}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div>{sc.year}</div>
                  <div className="text-sm text-muted-foreground">
                    {sc.periodType === 'YILLIK' ? 'Yıllık' : 
                     sc.periodType === 'CEYREKLIK' ? `${sc.period}. Çeyrek` :
                     sc.periodType === 'YARIYILLIK' ? `${sc.period}. Yarıyıl` : sc.periodType}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <span className={getScoreColor(sc.kpiScore)}>
                    {sc.kpiScore?.toFixed(1) || '-'}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <span className={getScoreColor(sc.competencyScore)}>
                    {sc.competencyScore?.toFixed(1) || '-'}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <span className={getScoreColor(sc.initiativeScore)}>
                    {sc.initiativeScore?.toFixed(1) || '-'}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <span className={`font-bold ${getScoreColor(sc.totalScore)}`}>
                    {sc.totalScore?.toFixed(1) || '-'}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  {sc.scoreLevel && (
                    <Badge variant="outline">{sc.scoreLevel}</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Badge className={statusLabels[sc.status]?.color || 'bg-gray-500'}>
                    {statusLabels[sc.status]?.label || sc.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => router.push(`/dashboard/strategy/individual-scorecards/${sc.id}`)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {(sc.status === 'TASLAK' || sc.status === 'REDDEDILDI') && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCalculate(sc.id)}
                        title="Hesapla"
                      >
                        <Calculator className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {scorecards.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  Henüz bireysel karne oluşturulmamış
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Yeni Karne Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Bireysel Karne</DialogTitle>
            <DialogDescription>
              Personel için performans karnesi oluşturun
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Personel *</Label>
              <Select
                value={formData.userId || 'none'}
                onValueChange={(v) => setFormData({ ...formData, userId: v === 'none' ? '' : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Personel seçiniz" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Personel seçiniz</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} - {u.department?.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Yıl *</Label>
                <Select
                  value={formData.year.toString()}
                  onValueChange={(v) => setFormData({ ...formData, year: parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2024, 2025, 2026].map((y) => (
                      <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Dönem Tipi</Label>
                <Select
                  value={formData.periodType}
                  onValueChange={(v) => setFormData({ ...formData, periodType: v, period: null })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="YILLIK">Yıllık</SelectItem>
                    <SelectItem value="YARIYILLIK">Yarıyıllık</SelectItem>
                    <SelectItem value="CEYREKLIK">Çeyreklik</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.periodType !== 'YILLIK' && (
              <div>
                <Label>Dönem</Label>
                <Select
                  value={formData.period?.toString() || 'none'}
                  onValueChange={(v) => setFormData({ ...formData, period: v === 'none' ? null : parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Dönem seçiniz" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Dönem seçiniz</SelectItem>
                    {formData.periodType === 'CEYREKLIK' 
                      ? [1, 2, 3, 4].map((p) => (
                          <SelectItem key={p} value={p.toString()}>{p}. Çeyrek</SelectItem>
                        ))
                      : [1, 2].map((p) => (
                          <SelectItem key={p} value={p.toString()}>{p}. Yarıyıl</SelectItem>
                        ))
                    }
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Hesaplama Formülü</Label>
              <Select
                value={formData.formulaId || 'none'}
                onValueChange={(v) => setFormData({ ...formData, formulaId: v === 'none' ? '' : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Varsayılan formül kullanılacak" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Varsayılan formül</SelectItem>
                  {formulas.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name} {f.isDefault && '(★)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>İptal</Button>
            <Button onClick={handleCreate}>Oluştur</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
