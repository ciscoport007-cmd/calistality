'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Thermometer,
  CheckSquare,
  Bug,
  FlaskConical,
  ClipboardList,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';

interface DashboardStats {
  totalEquipment: number;
  activeEquipment: number;
  outOfRangeLast7Days: number;
  totalCCPs: number;
  ccpChecklistsToday: number;
  nonConformantCCPs: number;
  totalPestStations: number;
  pestIssuesLast30Days: number;
  expiredSamples: number;
  activeSamples: number;
  cleaningLogsToday: number;
  incompleteCleanings: number;
}

interface Alert {
  id: string;
  equipment?: { code: string; name: string };
  ccp?: { code: string; name: string; process: string };
  temperature?: number;
  measuredAt?: string;
  checkDate?: string;
  nonConformity?: string;
  measuredBy?: { name: string; surname: string };
  checkedBy?: { name: string; surname: string };
}

interface DashboardData {
  stats: DashboardStats;
  alerts: {
    recentTemperatureLogs: Alert[];
    recentCCPIssues: Alert[];
    expiredSampleCount: number;
  };
}

const modules = [
  {
    title: 'Sıcaklık Takibi',
    description: 'Ekipman sıcaklık ölçümleri ve limit dışı uyarılar',
    href: '/dashboard/haccp/temperature',
    icon: Thermometer,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    title: 'CCP Kontrolleri',
    description: 'Kritik kontrol noktaları ve günlük kontrol listesi',
    href: '/dashboard/haccp/ccp',
    icon: CheckSquare,
    color: 'text-green-600',
    bg: 'bg-green-50',
  },
  {
    title: 'Haşere Kontrol',
    description: 'Pest kontrol istasyonları ve denetim kayıtları',
    href: '/dashboard/haccp/pest',
    icon: Bug,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
  },
  {
    title: 'Gıda Numuneleri',
    description: '72 saatlik numune saklama takibi',
    href: '/dashboard/haccp/food-samples',
    icon: FlaskConical,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
  },
  {
    title: 'Temizlik Kontrol',
    description: 'Alan bazlı temizlik ve hijyen kontrol listeleri',
    href: '/dashboard/haccp/cleaning',
    icon: ClipboardList,
    color: 'text-teal-600',
    bg: 'bg-teal-50',
  },
  {
    title: 'Raporlar & Denetim',
    description: 'Denetçi paneli, PDF export ve analiz raporları',
    href: '/dashboard/haccp/reports',
    icon: TrendingUp,
    color: 'text-red-600',
    bg: 'bg-red-50',
  },
];

const processLabels: Record<string, string> = {
  PISIRME: 'Pişirme',
  SOGUTMA: 'Soğutma',
  SAKLAMA: 'Saklama',
  SERVIS: 'Servis',
  HAZIRLIK: 'Hazırlık',
  TESLIM: 'Teslim Alma',
};

export default function HACCPDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/haccp/dashboard')
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const stats = data?.stats;
  const alerts = data?.alerts;

  return (
    <div className="p-6 space-y-6">
      {/* Başlık */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">HACCP & Gıda Güvenliği</h1>
        <p className="text-gray-500 mt-1">HACCP standartlarına uygun mutfak operasyonları takip ve yönetim sistemi</p>
      </div>

      {/* Uyarılar */}
      {((alerts?.recentTemperatureLogs.length ?? 0) > 0 ||
        (alerts?.recentCCPIssues.length ?? 0) > 0 ||
        (alerts?.expiredSampleCount ?? 0) > 0) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2 text-red-700 font-semibold">
            <AlertTriangle className="h-5 w-5" />
            <span>Aktif Uyarılar</span>
          </div>
          {(alerts?.recentTemperatureLogs.length ?? 0) > 0 && (
            <p className="text-sm text-red-600">
              • {alerts!.recentTemperatureLogs.length} adet limit dışı sıcaklık kaydı düzeltici faaliyet bekliyor
            </p>
          )}
          {(alerts?.recentCCPIssues.length ?? 0) > 0 && (
            <p className="text-sm text-red-600">
              • {alerts!.recentCCPIssues.length} adet uygunsuz CCP kontrolü onay bekliyor
            </p>
          )}
          {(alerts?.expiredSampleCount ?? 0) > 0 && (
            <p className="text-sm text-red-600">
              • {alerts!.expiredSampleCount} adet gıda numunesinin süresi dolmuş, imha edilmesi gerekiyor
            </p>
          )}
        </div>
      )}

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Thermometer className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Ekipman</p>
                <p className="text-2xl font-bold">{stats?.activeEquipment ?? 0}</p>
                <p className="text-xs text-gray-400">/ {stats?.totalEquipment ?? 0} toplam</p>
              </div>
            </div>
            {(stats?.outOfRangeLast7Days ?? 0) > 0 && (
              <Badge variant="destructive" className="mt-2 text-xs">
                {stats!.outOfRangeLast7Days} limit dışı (7 gün)
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckSquare className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">CCP Noktası</p>
                <p className="text-2xl font-bold">{stats?.totalCCPs ?? 0}</p>
                <p className="text-xs text-gray-400">{stats?.ccpChecklistsToday ?? 0} kontrol bugün</p>
              </div>
            </div>
            {(stats?.nonConformantCCPs ?? 0) > 0 && (
              <Badge variant="destructive" className="mt-2 text-xs">
                {stats!.nonConformantCCPs} uygunsuz (7 gün)
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Bug className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Haşere İstasyon</p>
                <p className="text-2xl font-bold">{stats?.totalPestStations ?? 0}</p>
                <p className="text-xs text-gray-400">aktif istasyon</p>
              </div>
            </div>
            {(stats?.pestIssuesLast30Days ?? 0) > 0 && (
              <Badge variant="destructive" className="mt-2 text-xs">
                {stats!.pestIssuesLast30Days} aktivite (30 gün)
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FlaskConical className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Gıda Numunesi</p>
                <p className="text-2xl font-bold">{stats?.activeSamples ?? 0}</p>
                <p className="text-xs text-gray-400">aktif numune</p>
              </div>
            </div>
            {(stats?.expiredSamples ?? 0) > 0 && (
              <Badge variant="destructive" className="mt-2 text-xs">
                {stats!.expiredSamples} süresi dolmuş
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-teal-100 rounded-lg">
                <ClipboardList className="h-5 w-5 text-teal-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Temizlik Kontrolü</p>
                <p className="text-2xl font-bold">{stats?.cleaningLogsToday ?? 0}</p>
                <p className="text-xs text-gray-400">bugün tamamlanan</p>
              </div>
            </div>
            {(stats?.incompleteCleanings ?? 0) > 0 && (
              <Badge variant="outline" className="mt-2 text-xs border-yellow-400 text-yellow-700">
                {stats!.incompleteCleanings} eksik (7 gün)
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Uyum Durumu</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats &&
                  stats.outOfRangeLast7Days === 0 &&
                  stats.nonConformantCCPs === 0 &&
                  stats.expiredSamples === 0
                    ? '%100'
                    : 'İnceleniyor'}
                </p>
                <p className="text-xs text-gray-400">HACCP uyumu</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modül Kartları */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Modüller</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((mod) => {
            const Icon = mod.icon;
            return (
              <Link key={mod.href} href={mod.href}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${mod.bg} shrink-0`}>
                      <Icon className={`h-6 w-6 ${mod.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">{mod.title}</p>
                      <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{mod.description}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400 shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Bekleyen Aksiyon Tabloları */}
      {(alerts?.recentTemperatureLogs.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Thermometer className="h-4 w-4 text-red-500" />
              Düzeltici Faaliyet Gerektiren Sıcaklık Kayıtları
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts!.recentTemperatureLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                  <div>
                    <span className="font-medium text-sm">{log.equipment?.name}</span>
                    <span className="text-xs text-gray-500 ml-2">({log.equipment?.code})</span>
                    <p className="text-xs text-red-600 mt-0.5">
                      {log.temperature}°C — {log.measuredAt ? new Date(log.measuredAt).toLocaleString('tr-TR') : ''}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <Link href="/dashboard/haccp/temperature">Görüntüle</Link>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {(alerts?.recentCCPIssues.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-red-500" />
              Onay Bekleyen Uygunsuz CCP Kontrolleri
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts!.recentCCPIssues.map((issue) => (
                <div key={issue.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                  <div>
                    <span className="font-medium text-sm">{issue.ccp?.name}</span>
                    <Badge variant="outline" className="ml-2 text-xs">
                      {processLabels[issue.ccp?.process ?? ''] ?? issue.ccp?.process}
                    </Badge>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {issue.checkDate ? new Date(issue.checkDate).toLocaleDateString('tr-TR') : ''}
                      {issue.nonConformity && ` — ${issue.nonConformity}`}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <Link href="/dashboard/haccp/ccp">Görüntüle</Link>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
