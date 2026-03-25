'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Users, CheckCircle, Clock, TrendingUp, MessageSquareWarning, AlertTriangle, ClipboardCheck, Target, ClipboardList, Calendar, Search, Package, Wrench, Gauge, Truck, Building2, Star, BarChart3, Activity, PieChart as PieChartIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  PieChart, Pie, Cell, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, 
  RadialBarChart, RadialBar,
  AreaChart, Area
} from 'recharts';

interface DashboardStats {
  totalUsers: number;
  totalDocuments: number;
  pendingApprovals: number;
  publishedDocuments: number;
  documentsByStatus: Array<{ status: string; count: number }>;
  recentDocuments: Array<any>;
  myPendingApprovals: Array<any>;
  myPendingAcknowledgments: Array<any>;
  myPendingReviews: Array<any>;
  // Şikayet istatistikleri
  totalComplaints: number;
  newComplaints: number;
  inProgressComplaints: number;
  resolvedComplaints: number;
  complaintsByStatus: Array<{ status: string; count: number }>;
  complaintsByPriority: Array<{ priority: string; count: number }>;
  recentComplaints: Array<any>;
  urgentComplaints: Array<any>;
  // CAPA istatistikleri
  totalCAPAs: number;
  openCAPAs: number;
  inProgressCAPAs: number;
  closedCAPAs: number;
  capasByStatus: Array<{ status: string; count: number }>;
  capasByType: Array<{ type: string; count: number }>;
  recentCAPAs: Array<any>;
  criticalCAPAs: Array<any>;
  // Denetim istatistikleri
  totalAudits: number;
  plannedAudits: number;
  inProgressAudits: number;
  completedAudits: number;
  auditsByStatus: Array<{ status: string; count: number }>;
  auditsByType: Array<{ type: string; count: number }>;
  totalFindings: number;
  openFindings: number;
  recentAudits: Array<any>;
  majorFindings: Array<any>;
  // Risk istatistikleri
  totalRisks: number;
  criticalRisks: number;
  veryHighRisks: number;
  highRisks: number;
  risksInAction: number;
  risksByStatus: Array<{ status: string; count: number }>;
  risksByLevel: Array<{ level: string; count: number }>;
  recentRisks: Array<any>;
  criticalRisksList: Array<any>;
  // Ekipman istatistikleri
  totalEquipment: number;
  activeEquipment: number;
  maintenancePending: number;
  calibrationPending: number;
  faultyEquipment: number;
  equipmentByStatus: Array<{ status: string; count: number }>;
  recentEquipment: Array<any>;
  pendingEquipment: Array<any>;
  // Tedarikçi istatistikleri
  totalSuppliers: number;
  approvedSuppliers: number;
  pendingSuppliers: number;
  suspendedSuppliers: number;
  evaluationsDue: number;
  recentSuppliers: Array<any>;
  // KPI istatistikleri
  totalKPIs: number;
  activeKPIs: number;
  onTargetKPIs: number;
  warningKPIs: number;
  criticalKPIs: number;
  recentKPIs: Array<any>;
}

const statusLabels: Record<string, string> = {
  TASLAK: 'Taslak',
  ONAY_BEKLIYOR: 'Onay Bekliyor',
  ONAYLANDI: 'Onaylandı',
  YAYINDA: 'Yayında',
  REVIZE_EDILIYOR: 'Revize Ediliyor',
  IPTAL_EDILDI: 'İptal Edildi',
};

const statusColors: Record<string, string> = {
  TASLAK: 'bg-gray-100 text-gray-800',
  ONAY_BEKLIYOR: 'bg-yellow-100 text-yellow-800',
  ONAYLANDI: 'bg-green-100 text-green-800',
  YAYINDA: 'bg-blue-100 text-blue-800',
  REVIZE_EDILIYOR: 'bg-orange-100 text-orange-800',
  IPTAL_EDILDI: 'bg-red-100 text-red-800',
};

const complaintStatusLabels: Record<string, string> = {
  YENI: 'Yeni',
  INCELENIYOR: 'İnceleniyor',
  COZUM_BEKLENIYOR: 'Çözüm Bekleniyor',
  COZULDU: 'Çözüldü',
  KAPATILDI: 'Kapatıldı',
  IPTAL_EDILDI: 'İptal Edildi',
};

const complaintStatusColors: Record<string, string> = {
  YENI: 'bg-blue-100 text-blue-800',
  INCELENIYOR: 'bg-yellow-100 text-yellow-800',
  COZUM_BEKLENIYOR: 'bg-orange-100 text-orange-800',
  COZULDU: 'bg-green-100 text-green-800',
  KAPATILDI: 'bg-gray-100 text-gray-800',
  IPTAL_EDILDI: 'bg-red-100 text-red-800',
};

const priorityLabels: Record<string, string> = {
  DUSUK: 'Düşük',
  ORTA: 'Orta',
  YUKSEK: 'Yüksek',
  ACIL: 'Acil',
};

const priorityColors: Record<string, string> = {
  DUSUK: 'bg-gray-100 text-gray-800',
  ORTA: 'bg-blue-100 text-blue-800',
  YUKSEK: 'bg-orange-100 text-orange-800',
  ACIL: 'bg-red-100 text-red-800',
  KRITIK: 'bg-red-100 text-red-800',
};

const riskLevelLabels: Record<string, string> = {
  DUSUK: 'Düşük',
  ORTA: 'Orta',
  YUKSEK: 'Yüksek',
  COK_YUKSEK: 'Çok Yüksek',
  KRITIK: 'Kritik',
};

const riskLevelColors: Record<string, string> = {
  DUSUK: 'bg-green-100 text-green-800',
  ORTA: 'bg-yellow-100 text-yellow-800',
  YUKSEK: 'bg-orange-100 text-orange-800',
  COK_YUKSEK: 'bg-red-100 text-red-800',
  KRITIK: 'bg-red-200 text-red-900',
};

const capaStatusLabels: Record<string, string> = {
  TASLAK: 'Taslak',
  ACIK: 'Açık',
  KOK_NEDEN_ANALIZI: 'Kök Neden Analizi',
  AKSIYON_PLANLAMA: 'Aksiyon Planlama',
  UYGULAMA: 'Uygulama',
  DOGRULAMA: 'Doğrulama',
  KAPATILDI: 'Kapatıldı',
  IPTAL_EDILDI: 'İptal Edildi',
};

const capaStatusColors: Record<string, string> = {
  TASLAK: 'bg-gray-100 text-gray-800',
  ACIK: 'bg-blue-100 text-blue-800',
  KOK_NEDEN_ANALIZI: 'bg-purple-100 text-purple-800',
  AKSIYON_PLANLAMA: 'bg-yellow-100 text-yellow-800',
  UYGULAMA: 'bg-orange-100 text-orange-800',
  DOGRULAMA: 'bg-cyan-100 text-cyan-800',
  KAPATILDI: 'bg-green-100 text-green-800',
  IPTAL_EDILDI: 'bg-red-100 text-red-800',
};

const capaTypeLabels: Record<string, string> = {
  DUZELTICI: 'Düzeltici',
  ONLEYICI: 'Önleyici',
  IYILESTIRME: 'İyileştirme',
};

const capaTypeColors: Record<string, string> = {
  DUZELTICI: 'bg-red-100 text-red-800',
  ONLEYICI: 'bg-blue-100 text-blue-800',
  IYILESTIRME: 'bg-green-100 text-green-800',
};

const auditStatusLabels: Record<string, string> = {
  PLANLI: 'Planlı',
  HAZIRLANIYOR: 'Hazırlanıyor',
  DEVAM_EDIYOR: 'Devam Ediyor',
  RAPORLANIYOR: 'Raporlanıyor',
  KAPATILDI: 'Kapatıldı',
  IPTAL_EDILDI: 'İptal Edildi',
  ERTELENDI: 'Ertelendi',
};

const auditStatusColors: Record<string, string> = {
  PLANLI: 'bg-blue-100 text-blue-800',
  HAZIRLANIYOR: 'bg-purple-100 text-purple-800',
  DEVAM_EDIYOR: 'bg-yellow-100 text-yellow-800',
  RAPORLANIYOR: 'bg-orange-100 text-orange-800',
  KAPATILDI: 'bg-green-100 text-green-800',
  IPTAL_EDILDI: 'bg-red-100 text-red-800',
  ERTELENDI: 'bg-gray-100 text-gray-800',
};

const auditTypeLabels: Record<string, string> = {
  IC_DENETIM: 'İç Denetim',
  DIS_DENETIM: 'Dış Denetim',
  TEDARIKCI_DENETIM: 'Tedarikçi Denetimi',
  SUREC_DENETIM: 'Süreç Denetimi',
  SISTEM_DENETIM: 'Sistem Denetimi',
};

const auditTypeColors: Record<string, string> = {
  IC_DENETIM: 'bg-indigo-100 text-indigo-800',
  DIS_DENETIM: 'bg-teal-100 text-teal-800',
  TEDARIKCI_DENETIM: 'bg-amber-100 text-amber-800',
  SUREC_DENETIM: 'bg-cyan-100 text-cyan-800',
  SISTEM_DENETIM: 'bg-violet-100 text-violet-800',
};

const equipmentStatusLabels: Record<string, string> = {
  AKTIF: 'Aktif',
  BAKIM_BEKLIYOR: 'Bakım Bekliyor',
  BAKIMDA: 'Bakımda',
  KALIBRASYON_BEKLIYOR: 'Kalibrasyon Bekliyor',
  KALIBRASYONDA: 'Kalibrasyonda',
  ARIZALI: 'Arızalı',
  DEVRE_DISI: 'Devre Dışı',
  HURDA: 'Hurda',
};

const equipmentStatusColors: Record<string, string> = {
  AKTIF: 'bg-green-100 text-green-800',
  BAKIM_BEKLIYOR: 'bg-yellow-100 text-yellow-800',
  BAKIMDA: 'bg-blue-100 text-blue-800',
  KALIBRASYON_BEKLIYOR: 'bg-orange-100 text-orange-800',
  KALIBRASYONDA: 'bg-purple-100 text-purple-800',
  ARIZALI: 'bg-red-100 text-red-800',
  DEVRE_DISI: 'bg-gray-100 text-gray-800',
  HURDA: 'bg-gray-200 text-gray-600',
};

const findingSeverityLabels: Record<string, string> = {
  MAJOR: 'Major',
  MINOR: 'Minor',
  GOZLEM: 'Gözlem',
  IYILESTIRME: 'İyileştirme',
  OLUMLU: 'Olumlu',
};

const findingSeverityColors: Record<string, string> = {
  MAJOR: 'bg-red-100 text-red-800',
  MINOR: 'bg-orange-100 text-orange-800',
  GOZLEM: 'bg-yellow-100 text-yellow-800',
  IYILESTIRME: 'bg-blue-100 text-blue-800',
  OLUMLU: 'bg-green-100 text-green-800',
};

export default function DashboardPage() {
  const { data: session } = useSession() || {};
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/dashboard/stats');
      if (response?.ok) {
        const data = await response?.json?.();
        setStats(data?.stats);
      }
    } catch (error) {
      console.error('Stats fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Ana Sayfa</h1>
        <p className="text-gray-500 mt-2">
          Hoş geldiniz, {session?.user?.name || 'Kullanıcı'}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link href="/dashboard/documents">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-blue-100">Toplam Doküman</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">{stats?.totalDocuments ?? 0}</div>
                <FileText className="w-8 h-8 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/documents?filter=published">
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-green-100">Yayında</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">{stats?.publishedDocuments ?? 0}</div>
                <CheckCircle className="w-8 h-8 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/documents?filter=pending_approval">
          <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white shadow-lg cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-yellow-100">Bekleyen Onaylar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">{stats?.pendingApprovals ?? 0}</div>
                <Clock className="w-8 h-8 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/users">
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-purple-100">Toplam Kullanıcı</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">{stats?.totalUsers ?? 0}</div>
                <Users className="w-8 h-8 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Özet Grafikler */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Modül Özeti - Radial Chart */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-blue-600" />
              Modül Özeti
            </CardTitle>
            <CardDescription>Tüm modüllerin kayıt sayıları</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <RadialBarChart 
                cx="50%" 
                cy="50%" 
                innerRadius="20%" 
                outerRadius="90%" 
                data={[
                  { name: 'Doküman', value: stats?.totalDocuments ?? 0, fill: '#3b82f6' },
                  { name: 'Şikayet', value: stats?.totalComplaints ?? 0, fill: '#f43f5e' },
                  { name: 'CAPA', value: stats?.totalCAPAs ?? 0, fill: '#f59e0b' },
                  { name: 'Denetim', value: stats?.totalAudits ?? 0, fill: '#64748b' },
                  { name: 'Risk', value: stats?.totalRisks ?? 0, fill: '#ef4444' },
                  { name: 'Ekipman', value: stats?.totalEquipment ?? 0, fill: '#22c55e' },
                  { name: 'Tedarikçi', value: stats?.totalSuppliers ?? 0, fill: '#8b5cf6' },
                  { name: 'KPI', value: stats?.totalKPIs ?? 0, fill: '#06b6d4' },
                ]}
                startAngle={180}
                endAngle={0}
              >
                <RadialBar dataKey="value" cornerRadius={5} />
                <Legend iconSize={10} layout="vertical" verticalAlign="middle" align="right" />
                <Tooltip />
              </RadialBarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Risk Dağılımı - Pie Chart */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Risk Dağılımı
            </CardTitle>
            <CardDescription>Seviyeye göre risk dağılımı</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Kritik', value: stats?.criticalRisks ?? 0, fill: '#dc2626' },
                    { name: 'Çok Yüksek', value: stats?.veryHighRisks ?? 0, fill: '#ea580c' },
                    { name: 'Yüksek', value: stats?.highRisks ?? 0, fill: '#f59e0b' },
                    { name: 'Orta/Düşük', value: Math.max(0, (stats?.totalRisks ?? 0) - (stats?.criticalRisks ?? 0) - (stats?.veryHighRisks ?? 0) - (stats?.highRisks ?? 0)), fill: '#22c55e' },
                  ].filter(d => d.value > 0)}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* KPI Performansı - Pie Chart */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-green-600" />
              KPI Performansı
            </CardTitle>
            <CardDescription>Hedefe göre KPI durumu</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Hedefte', value: stats?.onTargetKPIs ?? 0, fill: '#22c55e' },
                    { name: 'Uyarı', value: stats?.warningKPIs ?? 0, fill: '#f59e0b' },
                    { name: 'Kritik', value: stats?.criticalKPIs ?? 0, fill: '#ef4444' },
                  ].filter(d => d.value > 0)}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Durum Karşılaştırma Grafikleri */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Şikayet ve CAPA Durumu - Bar Chart */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-amber-600" />
              Şikayet & CAPA Durumu
            </CardTitle>
            <CardDescription>Duruma göre kayıt dağılımı</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={[
                  { 
                    name: 'Yeni/Açık', 
                    Şikayet: stats?.newComplaints ?? 0, 
                    CAPA: stats?.openCAPAs ?? 0 
                  },
                  { 
                    name: 'İşlemde', 
                    Şikayet: stats?.inProgressComplaints ?? 0, 
                    CAPA: stats?.inProgressCAPAs ?? 0 
                  },
                  { 
                    name: 'Tamamlanan', 
                    Şikayet: stats?.resolvedComplaints ?? 0, 
                    CAPA: stats?.closedCAPAs ?? 0 
                  },
                ]}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Şikayet" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="CAPA" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Ekipman Durumu - Bar Chart */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-green-600" />
              Ekipman Durumu
            </CardTitle>
            <CardDescription>Ekipman durum dağılımı</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={[
                  { name: 'Aktif', value: stats?.activeEquipment ?? 0, fill: '#22c55e' },
                  { name: 'Bakım Bekliyor', value: stats?.maintenancePending ?? 0, fill: '#f59e0b' },
                  { name: 'Kalibrasyon', value: stats?.calibrationPending ?? 0, fill: '#8b5cf6' },
                  { name: 'Arızalı', value: stats?.faultyEquipment ?? 0, fill: '#ef4444' },
                ]}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" name="Ekipman" radius={[4, 4, 0, 0]}>
                  {[
                    { name: 'Aktif', value: stats?.activeEquipment ?? 0, fill: '#22c55e' },
                    { name: 'Bakım Bekliyor', value: stats?.maintenancePending ?? 0, fill: '#f59e0b' },
                    { name: 'Kalibrasyon', value: stats?.calibrationPending ?? 0, fill: '#8b5cf6' },
                    { name: 'Arızalı', value: stats?.faultyEquipment ?? 0, fill: '#ef4444' },
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Şikayet Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link href="/dashboard/complaints">
          <Card className="bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-lg cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-rose-100">Toplam Şikayet</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">{stats?.totalComplaints ?? 0}</div>
                <MessageSquareWarning className="w-8 h-8 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/complaints">
          <Card className="bg-gradient-to-br from-sky-500 to-sky-600 text-white shadow-lg cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-sky-100">Yeni Şikayetler</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">{stats?.newComplaints ?? 0}</div>
                <AlertTriangle className="w-8 h-8 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/complaints">
          <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-amber-100">İncelenen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">{stats?.inProgressComplaints ?? 0}</div>
                <Clock className="w-8 h-8 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/complaints">
          <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-emerald-100">Çözülen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">{stats?.resolvedComplaints ?? 0}</div>
                <CheckCircle className="w-8 h-8 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Documents & Pending Approvals */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Documents */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Son Dokümanlar</CardTitle>
            <CardDescription>En son oluşturulan dokümanlar</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(stats?.recentDocuments ?? [])?.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Henüz doküman bulunmuyor</p>
              ) : (
                (stats?.recentDocuments ?? [])?.map?.((doc) => (
                  <div key={doc?.id} className="flex items-start justify-between pb-4 border-b last:border-0">
                    <div className="flex-1">
                      <Link
                        href={`/dashboard/documents/${doc?.id}`}
                        className="font-medium text-gray-900 hover:text-blue-600"
                      >
                        {doc?.title}
                      </Link>
                      <p className="text-sm text-gray-500 mt-1">
                        {doc?.code} - {doc?.createdBy?.name} {doc?.createdBy?.surname}
                      </p>
                    </div>
                    <Badge className={statusColors?.[doc?.status] || 'bg-gray-100 text-gray-800'}>
                      {statusLabels?.[doc?.status] || doc?.status}
                    </Badge>
                  </div>
                )) ?? null
              )}
            </div>
          </CardContent>
        </Card>

        {/* My Pending Approvals */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Bekleyen Onaylarım</CardTitle>
            <CardDescription>Onayınızı bekleyen dokümanlar</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(stats?.myPendingApprovals ?? [])?.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Bekleyen onay bulunmuyor</p>
              ) : (
                (stats?.myPendingApprovals ?? [])?.map?.((approval) => (
                  <div key={approval?.id} className="pb-4 border-b last:border-0">
                    <Link
                      href={`/dashboard/documents/${approval?.document?.id}`}
                      className="font-medium text-gray-900 hover:text-blue-600"
                    >
                      {approval?.document?.title}
                    </Link>
                    <p className="text-sm text-gray-500 mt-1">
                      {approval?.document?.code} - {approval?.document?.createdBy?.name}{' '}
                      {approval?.document?.createdBy?.surname}
                    </p>
                    <Button size="sm" className="mt-2" asChild>
                      <Link href={`/dashboard/documents/${approval?.document?.id}`}>
                        Onayla / Reddet
                      </Link>
                    </Button>
                  </div>
                )) ?? null
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Kullanıcıya Özel Doküman Görevleri */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Onay Bekleyen Dokümanlar */}
        <Card className="shadow-lg border-l-4 border-l-orange-500">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <ClipboardCheck className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Onay Bekleyen</CardTitle>
                  <CardDescription>Onayınızı bekleyen dokümanlar</CardDescription>
                </div>
              </div>
              <Link href="/dashboard/documents?filter=pending_approval">
                <div className="text-4xl font-bold text-orange-600 hover:text-orange-700 cursor-pointer transition-colors">
                  {stats?.myPendingApprovals?.length ?? 0}
                </div>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {(stats?.myPendingApprovals ?? [])?.length > 0 && (
              <div className="space-y-2 mt-2 max-h-32 overflow-y-auto">
                {(stats?.myPendingApprovals ?? [])?.slice(0, 3)?.map?.((item) => (
                  <Link
                    key={item?.id}
                    href={`/dashboard/documents/${item?.document?.id}`}
                    className="block text-sm text-gray-600 hover:text-orange-600 truncate"
                  >
                    • {item?.document?.title}
                  </Link>
                ))}
              </div>
            )}
            <Button variant="outline" size="sm" className="w-full mt-4" asChild>
              <Link href="/dashboard/documents?filter=pending_approval">
                Tümünü Gör
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Okunması Gereken Dokümanlar */}
        <Card className="shadow-lg border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Okunması Gereken</CardTitle>
                  <CardDescription>Okumanız gereken dokümanlar</CardDescription>
                </div>
              </div>
              <Link href="/dashboard/documents?filter=needs_reading">
                <div className="text-4xl font-bold text-blue-600 hover:text-blue-700 cursor-pointer transition-colors">
                  {stats?.myPendingAcknowledgments?.length ?? 0}
                </div>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {(stats?.myPendingAcknowledgments ?? [])?.length > 0 && (
              <div className="space-y-2 mt-2 max-h-32 overflow-y-auto">
                {(stats?.myPendingAcknowledgments ?? [])?.slice(0, 3)?.map?.((item) => (
                  <Link
                    key={item?.id}
                    href={`/dashboard/documents/${item?.document?.id}`}
                    className="block text-sm text-gray-600 hover:text-blue-600 truncate"
                  >
                    • {item?.document?.title}
                  </Link>
                ))}
              </div>
            )}
            <Button variant="outline" size="sm" className="w-full mt-4" asChild>
              <Link href="/dashboard/documents?filter=needs_reading">
                Tümünü Gör
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Görüş Bekleyen Dokümanlar */}
        <Card className="shadow-lg border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <MessageSquareWarning className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Görüş Bekleyen</CardTitle>
                  <CardDescription>Görüşünüzü bekleyen dokümanlar</CardDescription>
                </div>
              </div>
              <Link href="/dashboard/documents?filter=needs_feedback">
                <div className="text-4xl font-bold text-purple-600 hover:text-purple-700 cursor-pointer transition-colors">
                  {stats?.myPendingReviews?.length ?? 0}
                </div>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {(stats?.myPendingReviews ?? [])?.length > 0 && (
              <div className="space-y-2 mt-2 max-h-32 overflow-y-auto">
                {(stats?.myPendingReviews ?? [])?.slice(0, 3)?.map?.((item) => (
                  <Link
                    key={item?.id}
                    href={`/dashboard/documents/${item?.document?.id}`}
                    className="block text-sm text-gray-600 hover:text-purple-600 truncate"
                  >
                    • {item?.document?.title}
                  </Link>
                ))}
              </div>
            )}
            <Button variant="outline" size="sm" className="w-full mt-4" asChild>
              <Link href="/dashboard/documents?filter=needs_feedback">
                Tümünü Gör
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Document Status Distribution */}
      {(stats?.documentsByStatus ?? [])?.length > 0 && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Doküman Durum Dağılımı</CardTitle>
            <CardDescription>Dokümanların durumlara göre dağılımı</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {(stats?.documentsByStatus ?? [])?.map?.((item) => (
                <div key={item?.status} className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{item?.count ?? 0}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    {statusLabels?.[item?.status] || item?.status}
                  </div>
                </div>
              )) ?? null}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Complaints & Urgent Complaints */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Son Şikayetler */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Son Şikayetler</CardTitle>
            <CardDescription>En son oluşturulan müşteri şikayetleri</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(stats?.recentComplaints ?? [])?.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Henüz şikayet bulunmuyor</p>
              ) : (
                (stats?.recentComplaints ?? [])?.map?.((complaint) => (
                  <div key={complaint?.id} className="flex items-start justify-between pb-4 border-b last:border-0">
                    <div className="flex-1">
                      <Link
                        href={`/dashboard/complaints/${complaint?.id}`}
                        className="font-medium text-gray-900 hover:text-blue-600"
                      >
                        {complaint?.subject}
                      </Link>
                      <p className="text-sm text-gray-500 mt-1">
                        {complaint?.code} - {complaint?.customerName}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge className={complaintStatusColors?.[complaint?.status] || 'bg-gray-100 text-gray-800'}>
                        {complaintStatusLabels?.[complaint?.status] || complaint?.status}
                      </Badge>
                      <Badge className={priorityColors?.[complaint?.priority] || 'bg-gray-100 text-gray-800'}>
                        {priorityLabels?.[complaint?.priority] || complaint?.priority}
                      </Badge>
                    </div>
                  </div>
                )) ?? null
              )}
              {(stats?.recentComplaints ?? [])?.length > 0 && (
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/dashboard/complaints">Tüm Şikayetler</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Acil Şikayetler */}
        <Card className="shadow-lg border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Acil Şikayetler
            </CardTitle>
            <CardDescription>Acil öncelikli açık şikayetler</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(stats?.urgentComplaints ?? [])?.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Acil şikayet bulunmuyor</p>
              ) : (
                (stats?.urgentComplaints ?? [])?.map?.((complaint) => (
                  <div key={complaint?.id} className="pb-4 border-b last:border-0">
                    <Link
                      href={`/dashboard/complaints/${complaint?.id}`}
                      className="font-medium text-gray-900 hover:text-blue-600"
                    >
                      {complaint?.subject}
                    </Link>
                    <p className="text-sm text-gray-500 mt-1">
                      {complaint?.code} - {complaint?.customerName}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={complaintStatusColors?.[complaint?.status] || 'bg-gray-100 text-gray-800'}>
                        {complaintStatusLabels?.[complaint?.status] || complaint?.status}
                      </Badge>
                      {complaint?.assignedUser && (
                        <span className="text-sm text-gray-500">
                          → {complaint?.assignedUser?.name} {complaint?.assignedUser?.surname}
                        </span>
                      )}
                    </div>
                  </div>
                )) ?? null
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CAPA Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Toplam CAPA', value: stats?.totalCAPAs ?? 0, icon: <ClipboardCheck className="w-8 h-8 opacity-80" />, from: 'from-indigo-500', to: 'to-indigo-600', text: 'text-indigo-100' },
          { label: 'Açık CAPA', value: stats?.openCAPAs ?? 0, icon: <Target className="w-8 h-8 opacity-80" />, from: 'from-cyan-500', to: 'to-cyan-600', text: 'text-cyan-100' },
          { label: 'Devam Eden', value: stats?.inProgressCAPAs ?? 0, icon: <Clock className="w-8 h-8 opacity-80" />, from: 'from-orange-500', to: 'to-orange-600', text: 'text-orange-100' },
          { label: 'Kapatılan', value: stats?.closedCAPAs ?? 0, icon: <CheckCircle className="w-8 h-8 opacity-80" />, from: 'from-teal-500', to: 'to-teal-600', text: 'text-teal-100' },
        ].map((item) => (
          <Link key={item.label} href="/dashboard/capas">
            <Card className={`bg-gradient-to-br ${item.from} ${item.to} text-white shadow-lg cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all`}>
              <CardHeader className="pb-3">
                <CardTitle className={`text-sm font-medium ${item.text}`}>{item.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-bold">{item.value}</div>
                  {item.icon}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent CAPAs & Critical CAPAs */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Son CAPA'lar */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Son CAPA Kayıtları</CardTitle>
            <CardDescription>En son oluşturulan düzeltici/önleyici faaliyetler</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(stats?.recentCAPAs ?? [])?.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Henüz CAPA kaydı bulunmuyor</p>
              ) : (
                (stats?.recentCAPAs ?? [])?.map?.((capa) => (
                  <div key={capa?.id} className="flex items-start justify-between pb-4 border-b last:border-0">
                    <div className="flex-1">
                      <Link
                        href={`/dashboard/capas/${capa?.id}`}
                        className="font-medium text-gray-900 hover:text-blue-600"
                      >
                        {capa?.title}
                      </Link>
                      <p className="text-sm text-gray-500 mt-1">
                        {capa?.code} - {capa?.department?.name || 'Departman belirtilmedi'}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge className={capaTypeColors?.[capa?.type] || 'bg-gray-100 text-gray-800'}>
                        {capaTypeLabels?.[capa?.type] || capa?.type}
                      </Badge>
                      <Badge className={capaStatusColors?.[capa?.status] || 'bg-gray-100 text-gray-800'}>
                        {capaStatusLabels?.[capa?.status] || capa?.status}
                      </Badge>
                    </div>
                  </div>
                )) ?? null
              )}
              {(stats?.recentCAPAs ?? [])?.length > 0 && (
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/dashboard/capas">Tüm CAPA Kayıtları</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Kritik CAPA'lar */}
        <Card className="shadow-lg border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Kritik CAPA Kayıtları
            </CardTitle>
            <CardDescription>Kritik öncelikli açık CAPA kayıtları</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(stats?.criticalCAPAs ?? [])?.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Kritik CAPA kaydı bulunmuyor</p>
              ) : (
                (stats?.criticalCAPAs ?? [])?.map?.((capa) => (
                  <div key={capa?.id} className="pb-4 border-b last:border-0">
                    <Link
                      href={`/dashboard/capas/${capa?.id}`}
                      className="font-medium text-gray-900 hover:text-blue-600"
                    >
                      {capa?.title}
                    </Link>
                    <p className="text-sm text-gray-500 mt-1">
                      {capa?.code}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={capaStatusColors?.[capa?.status] || 'bg-gray-100 text-gray-800'}>
                        {capaStatusLabels?.[capa?.status] || capa?.status}
                      </Badge>
                      {capa?.responsibleUser && (
                        <span className="text-sm text-gray-500">
                          → {capa?.responsibleUser?.name} {capa?.responsibleUser?.surname}
                        </span>
                      )}
                    </div>
                  </div>
                )) ?? null
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Audit Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Toplam Denetim', value: stats?.totalAudits ?? 0, icon: <ClipboardList className="w-8 h-8 opacity-80" />, from: 'from-slate-500', to: 'to-slate-600', text: 'text-slate-100' },
          { label: 'Planlı', value: stats?.plannedAudits ?? 0, icon: <Calendar className="w-8 h-8 opacity-80" />, from: 'from-blue-500', to: 'to-blue-600', text: 'text-blue-100' },
          { label: 'Devam Eden', value: stats?.inProgressAudits ?? 0, icon: <Search className="w-8 h-8 opacity-80" />, from: 'from-yellow-500', to: 'to-yellow-600', text: 'text-yellow-100' },
          { label: 'Tamamlanan', value: stats?.completedAudits ?? 0, icon: <CheckCircle className="w-8 h-8 opacity-80" />, from: 'from-green-500', to: 'to-green-600', text: 'text-green-100' },
        ].map((item) => (
          <Link key={item.label} href="/dashboard/audits">
            <Card className={`bg-gradient-to-br ${item.from} ${item.to} text-white shadow-lg cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all`}>
              <CardHeader className="pb-3">
                <CardTitle className={`text-sm font-medium ${item.text}`}>{item.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-bold">{item.value}</div>
                  {item.icon}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent Audits & Major Findings */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Son Denetimler */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Son Denetimler</CardTitle>
            <CardDescription>En son oluşturulan denetim kayıtları</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(stats?.recentAudits ?? [])?.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Henüz denetim kaydı bulunmuyor</p>
              ) : (
                (stats?.recentAudits ?? [])?.map?.((audit) => (
                  <div key={audit?.id} className="flex items-start justify-between pb-4 border-b last:border-0">
                    <div className="flex-1">
                      <Link
                        href={`/dashboard/audits/${audit?.id}`}
                        className="font-medium text-gray-900 hover:text-blue-600"
                      >
                        {audit?.title}
                      </Link>
                      <p className="text-sm text-gray-500 mt-1">
                        {audit?.code} - {audit?.auditedDepartment?.name || 'Departman belirtilmedi'}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge className={auditTypeColors?.[audit?.type] || 'bg-gray-100 text-gray-800'}>
                        {auditTypeLabels?.[audit?.type] || audit?.type}
                      </Badge>
                      <Badge className={auditStatusColors?.[audit?.status] || 'bg-gray-100 text-gray-800'}>
                        {auditStatusLabels?.[audit?.status] || audit?.status}
                      </Badge>
                    </div>
                  </div>
                )) ?? null
              )}
              {(stats?.recentAudits ?? [])?.length > 0 && (
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/dashboard/audits">Tüm Denetimler</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Major Bulgular */}
        <Card className="shadow-lg border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Major Bulgular
            </CardTitle>
            <CardDescription>Açık major denetim bulguları</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(stats?.majorFindings ?? [])?.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Major bulgu bulunmuyor</p>
              ) : (
                (stats?.majorFindings ?? [])?.map?.((finding) => (
                  <div key={finding?.id} className="pb-4 border-b last:border-0">
                    <Link
                      href={`/dashboard/audits/${finding?.audit?.id}`}
                      className="font-medium text-gray-900 hover:text-blue-600"
                    >
                      {finding?.title}
                    </Link>
                    <p className="text-sm text-gray-500 mt-1">
                      {finding?.code} - {finding?.audit?.code}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={findingSeverityColors?.[finding?.severity] || 'bg-gray-100 text-gray-800'}>
                        {findingSeverityLabels?.[finding?.severity] || finding?.severity}
                      </Badge>
                      {finding?.assignee && (
                        <span className="text-sm text-gray-500">
                          → {finding?.assignee?.name} {finding?.assignee?.surname}
                        </span>
                      )}
                    </div>
                  </div>
                )) ?? null
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk Değerlendirmesi */}
      <div className="flex items-center justify-between mt-8">
        <h2 className="text-xl font-semibold text-gray-900">Risk Değerlendirmesi</h2>
        <Button variant="outline" asChild>
          <Link href="/dashboard/risks">Tümünü Gör</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Toplam Risk', value: stats?.totalRisks ?? 0, icon: <AlertTriangle className="w-8 h-8 opacity-80" />, from: 'from-slate-500', to: 'to-slate-600', text: 'text-slate-100' },
          { label: 'Kritik Risk', value: stats?.criticalRisks ?? 0, icon: <AlertTriangle className="w-8 h-8 opacity-80" />, from: 'from-red-600', to: 'to-red-700', text: 'text-red-100' },
          { label: 'Çok Yüksek', value: stats?.veryHighRisks ?? 0, icon: <TrendingUp className="w-8 h-8 opacity-80" />, from: 'from-orange-500', to: 'to-orange-600', text: 'text-orange-100' },
          { label: 'Yüksek', value: stats?.highRisks ?? 0, icon: <Target className="w-8 h-8 opacity-80" />, from: 'from-yellow-500', to: 'to-yellow-600', text: 'text-yellow-100' },
          { label: 'Aksiyonda', value: stats?.risksInAction ?? 0, icon: <Clock className="w-8 h-8 opacity-80" />, from: 'from-purple-500', to: 'to-purple-600', text: 'text-purple-100' },
        ].map((item) => (
          <Link key={item.label} href="/dashboard/risks">
            <Card className={`bg-gradient-to-br ${item.from} ${item.to} text-white shadow-lg cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all`}>
              <CardHeader className="pb-3">
                <CardTitle className={`text-sm font-medium ${item.text}`}>{item.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-bold">{item.value}</div>
                  {item.icon}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Son Riskler & Kritik Riskler */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Son Riskler */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Son Riskler</CardTitle>
            <CardDescription>En son tanımlanan risk kayıtları</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(stats?.recentRisks ?? [])?.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Henüz risk kaydı bulunmuyor</p>
              ) : (
                (stats?.recentRisks ?? [])?.map?.((risk) => (
                  <div key={risk?.id} className="flex items-start justify-between pb-4 border-b last:border-0">
                    <div className="flex-1">
                      <Link
                        href={`/dashboard/risks/${risk?.id}`}
                        className="font-medium text-gray-900 hover:text-blue-600"
                      >
                        {risk?.title}
                      </Link>
                      <p className="text-sm text-gray-500 mt-1">
                        {risk?.code} - {risk?.department?.name || 'Departman belirtilmedi'}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge className={riskLevelColors?.[risk?.currentLevel] || 'bg-gray-100 text-gray-800'}>
                        {riskLevelLabels?.[risk?.currentLevel] || risk?.currentLevel || 'Belirsiz'}
                      </Badge>
                      {risk?.residualRiskScore && (
                        <span className="text-sm font-mono text-gray-500">Skor: {risk?.residualRiskScore}</span>
                      )}
                    </div>
                  </div>
                )) ?? null
              )}
              {(stats?.recentRisks ?? [])?.length > 0 && (
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/dashboard/risks">Tüm Riskler</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Kritik Riskler */}
        <Card className="shadow-lg border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Kritik Riskler
            </CardTitle>
            <CardDescription>Kritik ve çok yüksek seviyeli aktif riskler</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(stats?.criticalRisksList ?? [])?.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Kritik risk bulunmuyor</p>
              ) : (
                (stats?.criticalRisksList ?? [])?.map?.((risk) => (
                  <div key={risk?.id} className="pb-4 border-b last:border-0">
                    <Link
                      href={`/dashboard/risks/${risk?.id}`}
                      className="font-medium text-gray-900 hover:text-blue-600"
                    >
                      {risk?.title}
                    </Link>
                    <p className="text-sm text-gray-500 mt-1">
                      {risk?.code} - {risk?.department?.name || ''}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={riskLevelColors?.[risk?.currentLevel] || 'bg-gray-100 text-gray-800'}>
                        {riskLevelLabels?.[risk?.currentLevel] || risk?.currentLevel}
                      </Badge>
                      {risk?.owner && (
                        <span className="text-sm text-gray-500">
                          → {risk?.owner?.name} {risk?.owner?.surname}
                        </span>
                      )}
                    </div>
                  </div>
                )) ?? null
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ekipman Yönetimi */}
      <div className="flex items-center justify-between mt-8">
        <h2 className="text-xl font-semibold text-gray-900">Ekipman Yönetimi</h2>
        <Button variant="outline" asChild>
          <Link href="/dashboard/equipment">Tümünü Gör</Link>
        </Button>
      </div>

      {/* Ekipman İstatistik Kartları */}
      <div className="grid grid-cols-5 gap-4 mt-4">
        {[
          { label: 'Toplam Ekipman', value: stats?.totalEquipment ?? 0, icon: <Package className="h-8 w-8 text-blue-500" />, bg: 'from-blue-50 to-blue-100', textColor: 'text-blue-600', valueColor: 'text-blue-800' },
          { label: 'Aktif', value: stats?.activeEquipment ?? 0, icon: <CheckCircle className="h-8 w-8 text-green-500" />, bg: 'from-green-50 to-green-100', textColor: 'text-green-600', valueColor: 'text-green-800' },
          { label: 'Bakım Bekliyor', value: stats?.maintenancePending ?? 0, icon: <Wrench className="h-8 w-8 text-yellow-500" />, bg: 'from-yellow-50 to-yellow-100', textColor: 'text-yellow-600', valueColor: 'text-yellow-800' },
          { label: 'Kalibrasyon Bekliyor', value: stats?.calibrationPending ?? 0, icon: <Gauge className="h-8 w-8 text-orange-500" />, bg: 'from-orange-50 to-orange-100', textColor: 'text-orange-600', valueColor: 'text-orange-800' },
          { label: 'Arızalı', value: stats?.faultyEquipment ?? 0, icon: <AlertTriangle className="h-8 w-8 text-red-500" />, bg: 'from-red-50 to-red-100', textColor: 'text-red-600', valueColor: 'text-red-800' },
        ].map((item) => (
          <Link key={item.label} href="/dashboard/equipment">
            <Card className={`bg-gradient-to-br ${item.bg} cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm ${item.textColor}`}>{item.label}</p>
                    <p className={`text-2xl font-bold ${item.valueColor}`}>{item.value}</p>
                  </div>
                  {item.icon}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Ekipman Widget'ları */}
      <div className="grid grid-cols-2 gap-6 mt-4">
        {/* Son Ekipmanlar */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              Son Ekipmanlar
            </CardTitle>
            <CardDescription>Son eklenen ekipman kayıtları</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(stats?.recentEquipment ?? [])?.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Ekipman kaydı bulunamadı</p>
              ) : (
                (stats?.recentEquipment ?? [])?.map?.((eq) => (
                  <div key={eq?.id} className="flex items-center justify-between pb-4 border-b last:border-0">
                    <div>
                      <Link
                        href={`/dashboard/equipment/${eq?.id}`}
                        className="font-medium text-gray-900 hover:text-blue-600"
                      >
                        {eq?.name}
                      </Link>
                      <p className="text-sm text-gray-500 mt-1">
                        {eq?.code} - {eq?.department?.name || 'Departman belirtilmedi'}
                      </p>
                    </div>
                    <Badge className={equipmentStatusColors?.[eq?.status] || 'bg-gray-100 text-gray-800'}>
                      {equipmentStatusLabels?.[eq?.status] || eq?.status || 'Belirsiz'}
                    </Badge>
                  </div>
                )) ?? null
              )}
              {(stats?.recentEquipment ?? [])?.length > 0 && (
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/dashboard/equipment">Tüm Ekipmanlar</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Dikkat Gerektiren Ekipmanlar */}
        <Card className="shadow-lg border-yellow-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-600">
              <Wrench className="w-5 h-5" />
              Dikkat Gerektiren Ekipmanlar
            </CardTitle>
            <CardDescription>Bakım, kalibrasyon bekleyen veya arızalı ekipmanlar</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(stats?.pendingEquipment ?? [])?.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Dikkat gerektiren ekipman bulunmuyor</p>
              ) : (
                (stats?.pendingEquipment ?? [])?.map?.((eq) => (
                  <div key={eq?.id} className="pb-4 border-b last:border-0">
                    <Link
                      href={`/dashboard/equipment/${eq?.id}`}
                      className="font-medium text-gray-900 hover:text-blue-600"
                    >
                      {eq?.name}
                    </Link>
                    <p className="text-sm text-gray-500 mt-1">
                      {eq?.code} - {eq?.category?.name || ''}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={equipmentStatusColors?.[eq?.status] || 'bg-gray-100 text-gray-800'}>
                        {equipmentStatusLabels?.[eq?.status] || eq?.status}
                      </Badge>
                      {eq?.owner && (
                        <span className="text-sm text-gray-500">
                          → {eq?.owner?.name} {eq?.owner?.surname}
                        </span>
                      )}
                    </div>
                  </div>
                )) ?? null
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tedarikçi Yönetimi */}
      <div className="space-y-4 pt-4">
        <h2 className="text-xl font-semibold text-gray-900">Tedarikçi Yönetimi</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[
            { label: 'Toplam Tedarikçi', value: stats?.totalSuppliers ?? 0, color: 'blue', Icon: Truck },
            { label: 'Onaylı', value: stats?.approvedSuppliers ?? 0, color: 'green', Icon: CheckCircle },
            { label: 'Bekleyen', value: stats?.pendingSuppliers ?? 0, color: 'yellow', Icon: Clock },
            { label: 'Askıda', value: stats?.suspendedSuppliers ?? 0, color: 'orange', Icon: AlertTriangle },
            { label: 'Değ. Bekleyen', value: stats?.evaluationsDue ?? 0, color: 'purple', Icon: Star },
          ].map((item) => (
            <Link key={item.label} href="/dashboard/suppliers">
              <Card className="cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{item.label}</p>
                      <p className={`text-2xl font-bold text-${item.color}-800`}>{item.value}</p>
                    </div>
                    <item.Icon className={`h-8 w-8 text-${item.color}-500`} />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Son Tedarikçiler */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Son Tedarikçiler</CardTitle>
            <Link href="/dashboard/suppliers">
              <Button variant="ghost" size="sm">Tümünü Gör</Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(stats?.recentSuppliers ?? [])?.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Tedarikçi bulunamadı</p>
              ) : (
                (stats?.recentSuppliers ?? [])?.map?.((supplier: any) => (
                  <div key={supplier?.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{supplier?.name}</p>
                        <p className="text-xs text-muted-foreground">{supplier?.code}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={
                        supplier?.status === 'ONAYLANDI' ? 'bg-green-100 text-green-800' :
                        supplier?.status === 'ADAY' ? 'bg-gray-100 text-gray-800' :
                        supplier?.status === 'DEGERLENDIRMEDE' ? 'bg-blue-100 text-blue-800' :
                        supplier?.status === 'ASKIYA_ALINDI' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }>
                        {supplier?.status === 'ONAYLANDI' ? 'Onaylı' :
                         supplier?.status === 'ADAY' ? 'Aday' :
                         supplier?.status === 'DEGERLENDIRMEDE' ? 'Değerlendirmede' :
                         supplier?.status === 'ASKIYA_ALINDI' ? 'Askıda' : supplier?.status}
                      </Badge>
                      {supplier?.currentRating && (
                        <Badge className={
                          supplier?.currentRating === 'A' ? 'bg-green-500 text-white' :
                          supplier?.currentRating === 'B' ? 'bg-blue-500 text-white' :
                          supplier?.currentRating === 'C' ? 'bg-yellow-500 text-white' :
                          'bg-red-500 text-white'
                        }>
                          {supplier?.currentRating}
                        </Badge>
                      )}
                    </div>
                  </div>
                )) ?? null
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
