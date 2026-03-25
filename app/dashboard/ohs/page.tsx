'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  HardHat,
  Users,
  AlertTriangle,
  AlertOctagon,
  ShieldAlert,
  Heart,
  Shield,
  Siren,
  ArrowRight,
  FileWarning,
  Eye,
  Calendar,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/export-utils';

interface RecentAccident {
  id: string;
  code: string;
  title: string;
  accidentDate: string;
  status: string;
  department: { name: string };
}

interface RecentNearMiss {
  id: string;
  code: string;
  title: string;
  eventDate: string;
  department: { name: string };
  reporter: { name: string; surname?: string };
}

interface OHSStats {
  subcontractorCount: number;
  accidentCount: number;
  openAccidentCount: number;
  accidentThisMonth: number;
  nearMissCount: number;
  nearMissThisMonth: number;
  riskCount: number;
  highRiskCount: number;
  openActionsCount: number;
  recentAccidents: RecentAccident[];
  recentNearMisses: RecentNearMiss[];
  // Faz 3
  healthRecordCount: number;
  upcomingExams: number;
  vaccinationCount: number;
  ppeItemCount: number;
  lowStockPPE: number;
  emergencyPlanCount: number;
  activePlanCount: number;
  drillCount: number;
}

const ACCIDENT_STATUS_LABELS: Record<string, string> = {
  ACIK: 'Açık',
  ANALIZ: 'Analiz',
  ONLEM_ALIYOR: 'Önlem',
  KAPATILDI: 'Kapatıldı',
};

const ACCIDENT_STATUS_COLORS: Record<string, string> = {
  ACIK: 'bg-red-100 text-red-800',
  ANALIZ: 'bg-yellow-100 text-yellow-800',
  ONLEM_ALIYOR: 'bg-blue-100 text-blue-800',
  KAPATILDI: 'bg-gray-100 text-gray-800',
};

export default function OHSPage() {
  const router = useRouter();
  const [stats, setStats] = useState<OHSStats>({
    subcontractorCount: 0,
    accidentCount: 0,
    openAccidentCount: 0,
    accidentThisMonth: 0,
    nearMissCount: 0,
    nearMissThisMonth: 0,
    riskCount: 0,
    highRiskCount: 0,
    openActionsCount: 0,
    recentAccidents: [],
    recentNearMisses: [],
    // Faz 3
    healthRecordCount: 0,
    upcomingExams: 0,
    vaccinationCount: 0,
    ppeItemCount: 0,
    lowStockPPE: 0,
    emergencyPlanCount: 0,
    activePlanCount: 0,
    drillCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/ohs/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Stats fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const modules = [
    {
      title: 'Taşeron Firmalar',
      description: 'Taşeron firma belge ve sertifika takibi',
      icon: Users,
      href: '/dashboard/ohs/subcontractors',
      stat: stats.subcontractorCount,
      statLabel: 'Kayıtlı Taşeron',
      color: 'bg-orange-500',
    },
    {
      title: 'İş Kazaları',
      description: 'İş kazası kayıtları ve analiz',
      icon: AlertOctagon,
      href: '/dashboard/ohs/accidents',
      stat: stats.accidentCount,
      statLabel: 'Kayıtlı Kaza',
      color: 'bg-red-500',
    },
    {
      title: 'Ramak Kala',
      description: 'Ramak kala olay bildirimleri',
      icon: AlertTriangle,
      href: '/dashboard/ohs/near-misses',
      stat: stats.nearMissCount,
      statLabel: 'Ramak Kala',
      color: 'bg-yellow-500',
    },
    {
      title: 'Risk Değerlendirme',
      description: 'İş güvenliği risk analizi ve aksiyon takibi',
      icon: ShieldAlert,
      href: '/dashboard/ohs/risks',
      stat: stats.riskCount,
      statLabel: 'Aktif Risk',
      color: 'bg-purple-500',
      badge: stats.highRiskCount > 0 ? `${stats.highRiskCount} Yüksek Risk` : undefined,
      badgeColor: 'bg-red-100 text-red-700',
    },
    {
      title: 'Sağlık Gözetimi',
      description: 'Personel sağlık muayeneleri ve aşı takibi',
      icon: Heart,
      href: '/dashboard/ohs/health',
      stat: stats.healthRecordCount,
      statLabel: 'Muayene Kaydı',
      color: 'bg-pink-500',
      badge: stats.upcomingExams > 0 ? `${stats.upcomingExams} Yaklaşan` : undefined,
      badgeColor: 'bg-orange-100 text-orange-700',
    },
    {
      title: 'KKD Takibi',
      description: 'Kişisel koruyucu donanım dağıtım ve takibi',
      icon: Shield,
      href: '/dashboard/ohs/ppe',
      stat: stats.ppeItemCount,
      statLabel: 'KKD Türü',
      color: 'bg-blue-500',
      badge: stats.lowStockPPE > 0 ? `${stats.lowStockPPE} Düşük Stok` : undefined,
      badgeColor: 'bg-red-100 text-red-700',
    },
    {
      title: 'Acil Durum Yönetimi',
      description: 'Acil durum planları ve tatbikat kayıtları',
      icon: Siren,
      href: '/dashboard/ohs/emergency',
      stat: stats.emergencyPlanCount,
      statLabel: 'Plan',
      color: 'bg-cyan-500',
      badge: stats.drillCount > 0 ? `${stats.drillCount} Tatbikat` : undefined,
      badgeColor: 'bg-purple-100 text-purple-700',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <HardHat className="w-7 h-7 text-yellow-600" />
            İş Sağlığı ve Güvenliği
          </h1>
          <p className="text-muted-foreground">
            İSG süreçlerini yönetin, risk değerlendirmelerini takip edin
          </p>
        </div>
      </div>

      {/* Özet Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taşeron Firmalar</p>
                <p className="text-2xl font-bold">{stats.subcontractorCount}</p>
              </div>
              <Users className="w-8 h-8 text-orange-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Aktif Riskler</p>
                <p className="text-2xl font-bold">{stats.riskCount}</p>
                {stats.highRiskCount > 0 && (
                  <Badge variant="destructive" className="mt-1">
                    {stats.highRiskCount} Yüksek Risk
                  </Badge>
                )}
              </div>
              <ShieldAlert className="w-8 h-8 text-purple-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">İş Kazaları</p>
                <p className="text-2xl font-bold">{stats.accidentCount}</p>
              </div>
              <AlertOctagon className="w-8 h-8 text-red-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Açık Aksiyonlar</p>
                <p className="text-2xl font-bold">{stats.openActionsCount}</p>
              </div>
              <FileWarning className="w-8 h-8 text-yellow-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modül Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map((module) => (
          <Card
            key={module.href}
            className="transition-all hover:shadow-md cursor-pointer"
            onClick={() => router.push(module.href)}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className={`p-3 rounded-lg ${module.color}`}>
                  <module.icon className="w-6 h-6 text-white" />
                </div>
                {module.badge && (
                  <Badge className={module.badgeColor}>{module.badge}</Badge>
                )}
              </div>
              <CardTitle className="mt-4">{module.title}</CardTitle>
              <CardDescription>{module.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{module.stat}</p>
                  <p className="text-sm text-muted-foreground">{module.statLabel}</p>
                </div>
                <Button variant="ghost" size="icon">
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Son Kayıtlar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Son İş Kazaları */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertOctagon className="w-5 h-5 text-red-500" />
              Son İş Kazaları
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/ohs/accidents')}>
              Tümünü Gör
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kod</TableHead>
                  <TableHead>Başlık</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recentAccidents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                      Kayıt bulunamadı
                    </TableCell>
                  </TableRow>
                ) : (
                  stats.recentAccidents.map((accident) => (
                    <TableRow key={accident.id}>
                      <TableCell className="font-mono text-sm">{accident.code}</TableCell>
                      <TableCell className="font-medium max-w-[150px] truncate">
                        {accident.title}
                      </TableCell>
                      <TableCell className="text-sm">{formatDate(accident.accidentDate)}</TableCell>
                      <TableCell>
                        <Badge className={ACCIDENT_STATUS_COLORS[accident.status] || ''} variant="secondary">
                          {ACCIDENT_STATUS_LABELS[accident.status] || accident.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/dashboard/ohs/accidents/${accident.id}`);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Son Ramak Kala */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Son Ramak Kala Bildirimleri
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/ohs/near-misses')}>
              Tümünü Gör
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kod</TableHead>
                  <TableHead>Başlık</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Bildiren</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recentNearMisses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                      Kayıt bulunamadı
                    </TableCell>
                  </TableRow>
                ) : (
                  stats.recentNearMisses.map((nm) => (
                    <TableRow key={nm.id}>
                      <TableCell className="font-mono text-sm">{nm.code}</TableCell>
                      <TableCell className="font-medium max-w-[150px] truncate">
                        {nm.title}
                      </TableCell>
                      <TableCell className="text-sm">{formatDate(nm.eventDate)}</TableCell>
                      <TableCell className="text-sm">
                        {nm.reporter?.name} {nm.reporter?.surname}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/dashboard/ohs/near-misses/${nm.id}`);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Bu Ay Özet */}
      {(stats.accidentThisMonth > 0 || stats.nearMissThisMonth > 0) && (
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              Bu Ay Özeti
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-8">
              <div>
                <span className="text-muted-foreground">İş Kazası:</span>
                <span className="ml-2 font-bold text-red-600">{stats.accidentThisMonth}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Ramak Kala:</span>
                <span className="ml-2 font-bold text-yellow-600">{stats.nearMissThisMonth}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
