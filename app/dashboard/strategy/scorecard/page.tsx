'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Target,
  TrendingUp,
  CheckCircle,
  Clock,
  AlertTriangle,
  DollarSign,
  BarChart3,
  Users,
  Cog,
  GraduationCap,
  ChevronDown,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { exportToExcel, exportToPDF, ExportColumn } from '@/lib/export-utils';

const perspectiveIcons: Record<string, any> = {
  FIN: DollarSign,
  MUS: Users,
  ISS: Cog,
  OGR: GraduationCap,
};

const statusColors: Record<string, string> = {
  PLANLI: 'bg-gray-100 text-gray-800',
  UYGULAMA: 'bg-blue-100 text-blue-800',
  TAMAMLANDI: 'bg-green-100 text-green-800',
  BEKLIYOR: 'bg-gray-100 text-gray-800',
  ILERLEME: 'bg-blue-100 text-blue-800',
};

export default function ScorecardPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [periods, setPeriods] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [expandedPerspectives, setExpandedPerspectives] = useState<string[]>([]);
  const [expandedObjectives, setExpandedObjectives] = useState<string[]>([]);

  useEffect(() => {
    fetchPeriods();
  }, []);

  useEffect(() => {
    if (selectedPeriod) {
      fetchScorecard();
    }
  }, [selectedPeriod]);

  const fetchPeriods = async () => {
    try {
      const res = await fetch('/api/strategy-periods');
      if (res.ok) {
        const result = await res.json();
        const periodsList = Array.isArray(result.periods) ? result.periods : (Array.isArray(result) ? result : []);
        setPeriods(periodsList);
        
        // Aktif dönemi seç
        const activePeriod = periodsList.find((p: any) => p.status === 'AKTIF');
        if (activePeriod) {
          setSelectedPeriod(activePeriod.id);
        } else if (periodsList.length > 0) {
          setSelectedPeriod(periodsList[0].id);
        } else {
          // Dönem yoksa loading'i kapat
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    } catch (error) {
      toast.error('Dönemler yüklenemedi');
      setLoading(false);
    }
  };

  const fetchScorecard = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/reports/scorecard?periodId=${selectedPeriod}`);
      if (res.ok) {
        const result = await res.json();
        setData(result);
        // Tüm perspektifleri aç
        setExpandedPerspectives(result.perspectives?.map((p: any) => p.id) || []);
      }
    } catch (error) {
      toast.error('Scorecard yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const togglePerspective = (id: string) => {
    setExpandedPerspectives(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const toggleObjective = (id: string) => {
    setExpandedObjectives(prev =>
      prev.includes(id) ? prev.filter(o => o !== id) : [...prev, id]
    );
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Balanced Scorecard</h1>
          <p className="text-gray-600 mt-1">Stratejik performans takibi</p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={!data || !data.perspectives?.length}>
                <Download className="h-4 w-4 mr-2" />
                Dışa Aktar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => {
                if (!data) return;
                const columns: ExportColumn[] = [
                  { key: 'perspective', header: 'Perspektif' },
                  { key: 'objective', header: 'Amaç' },
                  { key: 'goal', header: 'Hedef' },
                  { key: 'progress', header: 'İlerleme (%)' },
                  { key: 'status', header: 'Durum' },
                  { key: 'actionCount', header: 'Aksiyon Sayısı' },
                ];
                const exportData: any[] = [];
                data.perspectives?.forEach((p: any) => {
                  p.objectives?.forEach((o: any) => {
                    o.goals?.forEach((g: any) => {
                      exportData.push({
                        perspective: p.name,
                        objective: `${o.code} - ${o.name}`,
                        goal: `${g.code} - ${g.name}`,
                        progress: g.progress || 0,
                        status: g.status,
                        actionCount: g.actions?.length || 0,
                      });
                    });
                  });
                });
                exportToExcel(exportData, columns, 'Scorecard', 'Balanced Scorecard');
                toast.success('Excel dosyası indirildi');
              }}>
                <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
                Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                if (!data) return;
                const columns: ExportColumn[] = [
                  { key: 'perspective', header: 'Perspektif' },
                  { key: 'objective', header: 'Amaç' },
                  { key: 'goal', header: 'Hedef' },
                  { key: 'progress', header: 'İlerleme (%)' },
                  { key: 'status', header: 'Durum' },
                  { key: 'actionCount', header: 'Aksiyon Sayısı' },
                ];
                const exportData: any[] = [];
                data.perspectives?.forEach((p: any) => {
                  p.objectives?.forEach((o: any) => {
                    o.goals?.forEach((g: any) => {
                      exportData.push({
                        perspective: p.name,
                        objective: `${o.code} - ${o.name}`,
                        goal: `${g.code} - ${g.name}`,
                        progress: g.progress || 0,
                        status: g.status,
                        actionCount: g.actions?.length || 0,
                      });
                    });
                  });
                });
                exportToPDF(exportData, columns, 'Scorecard', 'Balanced Scorecard Raporu');
                toast.success('PDF dosyası indirildi');
              }}>
                <FileText className="h-4 w-4 mr-2 text-red-600" />
                PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Dönem seçiniz" />
            </SelectTrigger>
            <SelectContent>
              {periods.map((period) => (
                <SelectItem key={period.id} value={period.id}>
                  {period.code} - {period.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {data && (
        <>
          {/* Genel İstatistikler */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600">Hedefler</p>
                    <p className="text-xl font-bold">{data.overallStats.totalObjectives}</p>
                  </div>
                  <Target className="h-6 w-6 text-blue-400" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600">Alt Hedefler</p>
                    <p className="text-xl font-bold">{data.overallStats.totalGoals}</p>
                  </div>
                  <BarChart3 className="h-6 w-6 text-purple-400" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600">Aksiyonlar</p>
                    <p className="text-xl font-bold">{data.overallStats.totalActions}</p>
                  </div>
                  <TrendingUp className="h-6 w-6 text-indigo-400" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600">Tamamlanan</p>
                    <p className="text-xl font-bold text-green-600">{data.overallStats.completedActions}</p>
                  </div>
                  <CheckCircle className="h-6 w-6 text-green-400" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600">Geciken</p>
                    <p className="text-xl font-bold text-red-600">{data.overallStats.delayedActions}</p>
                  </div>
                  <AlertTriangle className="h-6 w-6 text-red-400" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600">Ort. İlerleme</p>
                    <p className="text-xl font-bold">%{data.overallStats.avgProgress}</p>
                  </div>
                  <TrendingUp className="h-6 w-6 text-blue-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bütçe Özeti */}
          {data.overallStats.totalBudgetPlanned > 0 && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Bütçe Özeti</h3>
                  <DollarSign className="h-5 w-5 text-green-500" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Planlanan</p>
                    <p className="text-lg font-bold">{data.overallStats.totalBudgetPlanned.toLocaleString()} TRY</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Gerçekleşen</p>
                    <p className="text-lg font-bold">{data.overallStats.totalBudgetActual.toLocaleString()} TRY</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Kullanım</p>
                    <p className="text-lg font-bold">
                      %{Math.round((data.overallStats.totalBudgetActual / data.overallStats.totalBudgetPlanned) * 100)}
                    </p>
                  </div>
                </div>
                <Progress
                  value={(data.overallStats.totalBudgetActual / data.overallStats.totalBudgetPlanned) * 100}
                  className="mt-4"
                />
              </CardContent>
            </Card>
          )}

          {/* Stratejik Amaçlar */}
          <div className="space-y-4">
            {data.perspectives?.map((perspective: any) => {
              const Icon = perspectiveIcons[perspective.code] || Target;
              const isExpanded = expandedPerspectives.includes(perspective.id);

              return (
                <Card key={perspective.id} className="overflow-hidden">
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                    onClick={() => togglePerspective(perspective.id)}
                    style={{ borderLeft: `4px solid ${perspective.color || '#3B82F6'}` }}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${perspective.color}20` }}
                      >
                        <Icon className="h-6 w-6" style={{ color: perspective.color }} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{perspective.name}</h3>
                        <p className="text-sm text-gray-500">
                          {perspective.stats.objectiveCount} Hedef • {perspective.stats.goalCount} Alt Hedef • {perspective.stats.actionCount} Aksiyon
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Ortalama İlerleme</p>
                        <p className="text-xl font-bold">%{perspective.stats.avgProgress}</p>
                      </div>
                      <div className="w-32">
                        <Progress value={perspective.stats.avgProgress} className="h-3" />
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t bg-gray-50 p-4 space-y-4">
                      {(perspective.objectives || []).length === 0 ? (
                        <p className="text-center text-gray-500 py-4">Bu perspektifte henüz hedef yok</p>
                      ) : (
                        (perspective.objectives || []).map((objective: any) => {
                          const isObjExpanded = expandedObjectives.includes(objective.id);

                          return (
                            <div key={objective.id} className="bg-white rounded-lg border">
                              <div
                                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                                onClick={() => toggleObjective(objective.id)}
                              >
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-sm text-gray-500">{objective.code}</span>
                                    <Badge className={statusColors[objective.status] || 'bg-gray-100'}>
                                      {objective.status}
                                    </Badge>
                                  </div>
                                  <h4 className="font-medium mt-1">{objective.name}</h4>
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className="w-24">
                                    <div className="flex items-center justify-between text-sm mb-1">
                                      <span>%{objective.progress || 0}</span>
                                    </div>
                                    <Progress value={objective.progress || 0} className="h-2" />
                                  </div>
                                  {isObjExpanded ? (
                                    <ChevronDown className="h-4 w-4 text-gray-400" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-gray-400" />
                                  )}
                                </div>
                              </div>

                              {isObjExpanded && (objective.goals || []).length > 0 && (
                                <div className="border-t px-4 py-3 space-y-3">
                                  {(objective.goals || []).map((goal: any) => (
                                    <div
                                      key={goal.id}
                                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                                      onClick={() => router.push(`/dashboard/strategy/${data.period.id}`)}
                                    >
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <span className="font-mono text-xs text-gray-500">{goal.code}</span>
                                          <Badge className={`text-xs ${statusColors[goal.status] || 'bg-gray-100'}`}>
                                            {goal.status}
                                          </Badge>
                                        </div>
                                        <p className="text-sm font-medium mt-1">{goal.name}</p>
                                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                          <span>{goal.actionCount} Aksiyon</span>
                                          <span>{goal.completedActionCount} Tamamlandı</span>
                                          {goal.kpis.length > 0 && (
                                            <span>{goal.kpis.length} KPI</span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="w-20">
                                        <div className="text-right text-sm mb-1">%{goal.progress || 0}</div>
                                        <Progress value={goal.progress || 0} className="h-2" />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </>
      )}

      {!data && !loading && (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Scorecard verisi bulunamadı</p>
            <p className="text-sm text-gray-400 mt-1">Lütfen bir strateji dönemi oluşturun veya seçin</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
