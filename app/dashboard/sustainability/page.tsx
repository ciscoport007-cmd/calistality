'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Zap,
  Droplets,
  Trash2,
  Wind,
  Target,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Leaf,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  Clock,
  Activity,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

interface DashboardStats {
  stats: {
    totalMeters: number;
    activeTargets: number;
    openActions: number;
    unresolvedAlerts: number;
    anomalyCount: number;
  };
  energy: {
    totalKwh: number;
    changePercent: number;
    readingCount: number;
  };
  water: {
    totalM3: number;
    changePercent: number;
    readingCount: number;
  };
  waste: {
    totalKg: number;
    recycledKg: number;
    recyclingRate: number;
    recordCount: number;
  };
  carbon: {
    totalKg: number;
    totalTon: number;
  };
}

const modules = [
  {
    title: 'Enerji Yönetimi',
    description: 'Elektrik, doğalgaz, LPG tüketim takibi',
    href: '/dashboard/sustainability/energy',
    icon: Zap,
    color: 'text-yellow-600',
    bg: 'bg-yellow-50 hover:bg-yellow-100',
    border: 'border-yellow-200',
  },
  {
    title: 'Su Yönetimi',
    description: 'Su tüketimi ve kaçak tespiti',
    href: '/dashboard/sustainability/water',
    icon: Droplets,
    color: 'text-blue-600',
    bg: 'bg-blue-50 hover:bg-blue-100',
    border: 'border-blue-200',
  },
  {
    title: 'Atık Yönetimi',
    description: 'Geri dönüşüm ve atık takibi',
    href: '/dashboard/sustainability/waste',
    icon: Trash2,
    color: 'text-green-600',
    bg: 'bg-green-50 hover:bg-green-100',
    border: 'border-green-200',
  },
  {
    title: 'Karbon Ayak İzi',
    description: 'CO₂ emisyon hesaplama ve raporlama',
    href: '/dashboard/sustainability/carbon',
    icon: Wind,
    color: 'text-slate-600',
    bg: 'bg-slate-50 hover:bg-slate-100',
    border: 'border-slate-200',
  },
  {
    title: 'Hedef & Aksiyon',
    description: 'Sürdürülebilirlik hedefleri ve planlar',
    href: '/dashboard/sustainability/targets',
    icon: Target,
    color: 'text-purple-600',
    bg: 'bg-purple-50 hover:bg-purple-100',
    border: 'border-purple-200',
  },
  {
    title: 'Raporlar',
    description: 'ESG, Turquality, Green Star raporları',
    href: '/dashboard/sustainability/reports',
    icon: BarChart3,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 hover:bg-emerald-100',
    border: 'border-emerald-200',
  },
];

const WASTE_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444'];

export default function SustainabilityPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/sustainability')
      .then(r => r.json())
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const formatNumber = (n: number, decimals = 0) =>
    n.toLocaleString('tr-TR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

  const changeIcon = (pct: number) =>
    pct > 0 ? (
      <TrendingUp className="w-4 h-4 text-red-500" />
    ) : (
      <TrendingDown className="w-4 h-4 text-green-500" />
    );

  const changeColor = (pct: number) => (pct > 0 ? 'text-red-600' : 'text-green-600');

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-64" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const wasteData = stats
    ? [
        { name: 'Geri Dönüştürülen', value: stats.waste.recycledKg },
        { name: 'Diğer Atık', value: stats.waste.totalKg - stats.waste.recycledKg },
      ]
    : [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 rounded-lg">
            <Leaf className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Enerji & Çevre Yönetimi</h1>
            <p className="text-gray-500 text-sm">Sürdürülebilirlik · ESG · Turquality · Green Star</p>
          </div>
        </div>
        <div className="flex gap-2">
          {stats && stats.stats.unresolvedAlerts > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="border-red-200 text-red-700 hover:bg-red-50"
              onClick={() => router.push('/dashboard/sustainability/energy')}
            >
              <AlertTriangle className="w-4 h-4 mr-1" />
              {stats.stats.unresolvedAlerts} Uyarı
            </Button>
          )}
          <Button size="sm" onClick={() => router.push('/dashboard/sustainability/reports')}>
            <BarChart3 className="w-4 h-4 mr-1" />
            Raporlar
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-yellow-200 bg-gradient-to-br from-yellow-50 to-white">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Enerji (Bu Ay)</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatNumber(stats?.energy.totalKwh || 0)} <span className="text-sm font-normal text-gray-500">kWh</span>
                </p>
                {stats && (
                  <div className={`flex items-center gap-1 mt-1 text-sm ${changeColor(stats.energy.changePercent)}`}>
                    {changeIcon(stats.energy.changePercent)}
                    <span>{Math.abs(stats.energy.changePercent).toFixed(1)}% geçen aya göre</span>
                  </div>
                )}
              </div>
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Zap className="w-5 h-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Su (Bu Ay)</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatNumber(stats?.water.totalM3 || 0)} <span className="text-sm font-normal text-gray-500">m³</span>
                </p>
                {stats && (
                  <div className={`flex items-center gap-1 mt-1 text-sm ${changeColor(stats.water.changePercent)}`}>
                    {changeIcon(stats.water.changePercent)}
                    <span>{Math.abs(stats.water.changePercent).toFixed(1)}% geçen aya göre</span>
                  </div>
                )}
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <Droplets className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Atık (Bu Ay)</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatNumber(stats?.waste.totalKg || 0)} <span className="text-sm font-normal text-gray-500">kg</span>
                </p>
                <div className="flex items-center gap-1 mt-1 text-sm text-green-600">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>%{formatNumber(stats?.waste.recyclingRate || 0, 1)} geri dönüşüm</span>
                </div>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <Trash2 className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-gradient-to-br from-slate-50 to-white">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Karbon (Bu Ay)</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatNumber(stats?.carbon.totalTon || 0, 2)} <span className="text-sm font-normal text-gray-500">ton CO₂</span>
                </p>
                <div className="flex items-center gap-1 mt-1 text-sm text-slate-600">
                  <Activity className="w-4 h-4" />
                  <span>{formatNumber(stats?.carbon.totalKg || 0, 0)} kg toplam</span>
                </div>
              </div>
              <div className="p-2 bg-slate-100 rounded-lg">
                <Wind className="w-5 h-5 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Target className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Aktif Hedef</p>
                <p className="text-xl font-bold">{stats?.stats.activeTargets || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Açık Aksiyon</p>
                <p className="text-xl font-bold">{stats?.stats.openActions || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Aktif Uyarı</p>
                <p className="text-xl font-bold text-red-600">{stats?.stats.unresolvedAlerts || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Waste Pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Atık Kompozisyonu</CardTitle>
            <CardDescription>Bu ay geri dönüşüm oranı</CardDescription>
          </CardHeader>
          <CardContent>
            {wasteData.length > 0 && wasteData[0].value + wasteData[1].value > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={wasteData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {wasteData.map((_, index) => (
                      <Cell key={index} fill={WASTE_COLORS[index % WASTE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => `${v.toFixed(1)} kg`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[180px] flex items-center justify-center text-gray-400 text-sm">
                Veri yok
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary Info */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Sürdürülebilirlik Özeti</CardTitle>
            <CardDescription>Bu ayki performans göstergesi</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm font-medium">Enerji Tüketimi</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold">{formatNumber(stats?.energy.totalKwh || 0)} kWh</span>
                  <span className="text-xs text-gray-500 ml-2">{stats?.energy.readingCount || 0} okuma</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium">Su Tüketimi</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold">{formatNumber(stats?.water.totalM3 || 0)} m³</span>
                  <span className="text-xs text-gray-500 ml-2">{stats?.water.readingCount || 0} okuma</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium">Atık Yönetimi</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold">{formatNumber(stats?.waste.totalKg || 0)} kg</span>
                  <span className="text-xs text-gray-500 ml-2">%{formatNumber(stats?.waste.recyclingRate || 0, 1)} geri dönüşüm</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Wind className="w-4 h-4 text-slate-600" />
                  <span className="text-sm font-medium">Karbon Emisyonu</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold">{formatNumber(stats?.carbon.totalTon || 0, 2)} ton CO₂</span>
                  <span className="text-xs text-gray-500 ml-2">bu ay</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Module Navigation Cards */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Modüller</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {modules.map((mod) => (
            <Card
              key={mod.href}
              className={`cursor-pointer border transition-colors ${mod.bg} ${mod.border}`}
              onClick={() => router.push(mod.href)}
            >
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-white shadow-sm`}>
                      <mod.icon className={`w-5 h-5 ${mod.color}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{mod.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{mod.description}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
