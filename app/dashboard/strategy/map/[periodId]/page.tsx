'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft,
  Target,
  TrendingUp,
  Users,
  BookOpen,
  DollarSign,
  Cog,
  Eye,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Download,
  RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'sonner';

interface ObjectiveNode {
  id: string;
  code: string;
  name: string;
  status: string;
  progress: number;
  riskLevel: string | null;
  perspectiveId: string;
  perspectiveCode: string;
  perspectiveName: string;
  perspectiveColor: string;
  owner: string | null;
  department: string | null;
  goalsCount: number;
  weight: number;
}

interface PerspectiveLayer {
  id: string;
  code: string;
  name: string;
  color: string;
  sortOrder: number;
  objectives: ObjectiveNode[];
  avgProgress: number;
  objectivesCount: number;
}

interface StrategyMapData {
  period: {
    id: string;
    name: string;
    status: string;
    startDate: string;
    endDate: string;
    mission: string | null;
    vision: string | null;
  };
  perspectives: PerspectiveLayer[];
  nodes: ObjectiveNode[];
  links: Array<{ sourceId: string; targetId: string; type: string }>;
  statistics: {
    totalObjectives: number;
    avgProgress: number;
    completedObjectives: number;
    atRiskObjectives: number;
  };
}

const perspectiveIcons: Record<string, any> = {
  FIN: DollarSign,
  MUS: Users,
  SUR: Cog,
  OGR: BookOpen,
};

const statusColors: Record<string, string> = {
  TASLAK: 'bg-gray-400',
  PLANLI: 'bg-blue-400',
  DEVAM_EDIYOR: 'bg-yellow-400',
  TAMAMLANDI: 'bg-green-500',
  IPTAL: 'bg-red-400',
};

const statusLabels: Record<string, string> = {
  TASLAK: 'Taslak',
  PLANLI: 'Planlı',
  DEVAM_EDIYOR: 'Devam Ediyor',
  TAMAMLANDI: 'Tamamlandı',
  IPTAL: 'İptal',
};

export default function StrategyMapPage() {
  const params = useParams();
  const router = useRouter();
  const periodId = params.periodId as string;

  const [data, setData] = useState<StrategyMapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedObjective, setSelectedObjective] = useState<ObjectiveNode | null>(null);
  const [expandedPerspectives, setExpandedPerspectives] = useState<Set<string>>(new Set());
  const [showConnections, setShowConnections] = useState(true);

  useEffect(() => {
    fetchStrategyMap();
  }, [periodId]);

  const fetchStrategyMap = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/strategy-map/${periodId}`);
      const result = await res.json();
      if (result.success) {
        setData(result.data);
        // Expand all perspectives by default
        setExpandedPerspectives(new Set(result.data.perspectives.map((p: any) => p.id)));
      } else {
        toast.error(result.error || 'Veri yüklenemedi');
      }
    } catch (error) {
      console.error('Error fetching strategy map:', error);
      toast.error('Strateji haritası yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const togglePerspective = (perspectiveId: string) => {
    setExpandedPerspectives((prev) => {
      const next = new Set(prev);
      if (next.has(perspectiveId)) {
        next.delete(perspectiveId);
      } else {
        next.add(perspectiveId);
      }
      return next;
    });
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 60) return 'bg-yellow-500';
    if (progress >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getRiskBadge = (riskLevel: string | null) => {
    if (!riskLevel) return null;
    const colors: Record<string, string> = {
      DUSUK: 'bg-green-100 text-green-700',
      ORTA: 'bg-yellow-100 text-yellow-700',
      YUKSEK: 'bg-orange-100 text-orange-700',
      COK_YUKSEK: 'bg-red-100 text-red-700',
    };
    return (
      <Badge className={colors[riskLevel] || 'bg-gray-100'}>
        {riskLevel.replace('_', ' ')}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <Target className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <p className="text-gray-500">Strateji haritası bulunamadı</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Geri Dön
        </Button>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">BSC Strateji Haritası</h1>
              <p className="text-gray-600">
                {data.period.name} (
                {format(new Date(data.period.startDate), 'yyyy', { locale: tr })} -
                {format(new Date(data.period.endDate), 'yyyy', { locale: tr })})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConnections(!showConnections)}
            >
              <Eye className="h-4 w-4 mr-2" />
              {showConnections ? 'Bağlantıları Gizle' : 'Bağlantıları Göster'}
            </Button>
            <Button variant="outline" size="sm" onClick={fetchStrategyMap}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Mission & Vision */}
        {(data.period.mission || data.period.vision) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.period.mission && (
              <Card className="bg-blue-50 border-blue-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-blue-700">
                    MİSYON
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-blue-900">{data.period.mission}</p>
                </CardContent>
              </Card>
            )}
            {data.period.vision && (
              <Card className="bg-purple-50 border-purple-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-purple-700">
                    VİZYON
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-purple-900">{data.period.vision}</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Statistics Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Target className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{data.statistics.totalObjectives}</div>
                  <div className="text-xs text-gray-600">Toplam Amaç</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{data.statistics.avgProgress}%</div>
                  <div className="text-xs text-gray-600">Ortalama İlerleme</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{data.statistics.completedObjectives}</div>
                  <div className="text-xs text-gray-600">Tamamlanan</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{data.statistics.atRiskObjectives}</div>
                  <div className="text-xs text-gray-600">Risk Altında</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Strategy Map - Perspectives */}
        <div className="relative">
          {/* Connection Lines (SVG overlay) */}
          {showConnections && data.perspectives.length > 1 && (
            <div className="absolute inset-0 pointer-events-none z-0">
              <svg className="w-full h-full" style={{ minHeight: '800px' }}>
                <defs>
                  <marker
                    id="arrowhead"
                    markerWidth="10"
                    markerHeight="7"
                    refX="9"
                    refY="3.5"
                    orient="auto"
                  >
                    <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
                  </marker>
                </defs>
              </svg>
            </div>
          )}

          {/* Perspective Layers */}
          <div className="space-y-4 relative z-10">
            {data.perspectives.map((perspective, pIndex) => {
              const Icon = perspectiveIcons[perspective.code] || Target;
              const isExpanded = expandedPerspectives.has(perspective.id);

              return (
                <Card
                  key={perspective.id}
                  className="overflow-hidden"
                  style={{ borderLeftWidth: '4px', borderLeftColor: perspective.color }}
                >
                  <CardHeader
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => togglePerspective(perspective.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="p-2 rounded-lg"
                          style={{ backgroundColor: `${perspective.color}20` }}
                        >
                          <Icon
                            className="h-5 w-5"
                            style={{ color: perspective.color }}
                          />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{perspective.name}</CardTitle>
                          <p className="text-sm text-gray-600">
                            {perspective.objectivesCount} amaç • Ortalama %{perspective.avgProgress}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-32">
                          <div className="flex justify-between text-xs mb-1">
                            <span>İlerleme</span>
                            <span>{perspective.avgProgress}%</span>
                          </div>
                          <Progress
                            value={perspective.avgProgress}
                            className="h-2"
                          />
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="pt-0">
                      {perspective.objectives.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {perspective.objectives.map((objective) => (
                            <Tooltip key={objective.id}>
                              <TooltipTrigger asChild>
                                <div
                                  className="p-4 rounded-lg border bg-white hover:shadow-md transition-all cursor-pointer"
                                  onClick={() => setSelectedObjective(objective)}
                                >
                                  <div className="flex items-start justify-between mb-2">
                                    <Badge variant="outline" className="text-xs">
                                      {objective.code}
                                    </Badge>
                                    <div
                                      className={`w-3 h-3 rounded-full ${statusColors[objective.status] || 'bg-gray-400'}`}
                                    />
                                  </div>
                                  <h4 className="font-medium text-sm mb-2 line-clamp-2">
                                    {objective.name}
                                  </h4>
                                  <div className="space-y-2">
                                    <div>
                                      <div className="flex justify-between text-xs mb-1">
                                        <span className="text-gray-500">İlerleme</span>
                                        <span className="font-medium">{objective.progress}%</span>
                                      </div>
                                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                                        <div
                                          className={`h-1.5 rounded-full ${getProgressColor(objective.progress)}`}
                                          style={{ width: `${objective.progress}%` }}
                                        />
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-gray-500">
                                      <span>{objective.goalsCount} hedef</span>
                                      {objective.riskLevel && (
                                        <span
                                          className={`px-1.5 py-0.5 rounded text-xs ${
                                            objective.riskLevel === 'YUKSEK' ||
                                            objective.riskLevel === 'COK_YUKSEK'
                                              ? 'bg-red-100 text-red-700'
                                              : 'bg-yellow-100 text-yellow-700'
                                          }`}
                                        >
                                          {objective.riskLevel}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs">
                                <div className="space-y-1">
                                  <p className="font-medium">{objective.name}</p>
                                  {objective.owner && (
                                    <p className="text-xs">Sahip: {objective.owner}</p>
                                  )}
                                  {objective.department && (
                                    <p className="text-xs">Departman: {objective.department}</p>
                                  )}
                                  <p className="text-xs">Durum: {statusLabels[objective.status]}</p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Bu perspektifte henüz amaç tanımlanmamış</p>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>

          {/* Flow Indicator */}
          {showConnections && data.perspectives.length > 1 && (
            <div className="flex justify-center my-4">
              <div className="flex flex-col items-center text-gray-400 text-sm">
                <ChevronUp className="h-4 w-4" />
                <span>Neden-Sonuç Akışı</span>
                <ChevronUp className="h-4 w-4" />
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap items-center gap-6 text-sm">
              <span className="font-medium text-gray-700">Durum:</span>
              {Object.entries(statusLabels).map(([key, label]) => (
                <div key={key} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${statusColors[key]}`} />
                  <span className="text-gray-600">{label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Objective Detail Dialog */}
        <Dialog
          open={!!selectedObjective}
          onOpenChange={() => setSelectedObjective(null)}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Badge variant="outline">{selectedObjective?.code}</Badge>
                {selectedObjective?.name}
              </DialogTitle>
            </DialogHeader>
            {selectedObjective && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500">Perspektif</label>
                    <p className="font-medium">{selectedObjective.perspectiveName}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Durum</label>
                    <p className="font-medium">
                      <Badge className={statusColors[selectedObjective.status]}>
                        {statusLabels[selectedObjective.status]}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Sorumlu Kişi</label>
                    <p className="font-medium">{selectedObjective.owner || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Departman</label>
                    <p className="font-medium">{selectedObjective.department || '-'}</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-500 mb-2 block">İlerleme</label>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{selectedObjective.progress}%</span>
                    </div>
                    <Progress value={selectedObjective.progress} className="h-3" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500">Hedef Sayısı</label>
                    <p className="text-2xl font-bold">{selectedObjective.goalsCount}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Ağırlık</label>
                    <p className="text-2xl font-bold">{selectedObjective.weight}</p>
                  </div>
                </div>

                {selectedObjective.riskLevel && (
                  <div>
                    <label className="text-sm text-gray-500">Risk Seviyesi</label>
                    <p>{getRiskBadge(selectedObjective.riskLevel)}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button
                    className="flex-1"
                    onClick={() => {
                      router.push(`/dashboard/strategy/${periodId}`);
                    }}
                  >
                    Detaylara Git
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedObjective(null)}>
                    Kapat
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
