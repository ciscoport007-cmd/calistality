'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  ShieldAlert,
  AlertTriangle,
  Plus,
  Play,
  CheckCircle2,
  Upload,
  MessageSquare,
  TrendingDown,
  TrendingUp,
  Minus,
  User,
  Calendar,
  FileText,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/export-utils';
import { useSession } from 'next-auth/react';

interface OHSRisk {
  id: string;
  code: string;
  name: string;
  description?: string;
  source: string;
  sourceDetail?: string;
  category: string;
  department: { id: string; name: string; code: string };
  owner: { id: string; name: string; surname?: string; email?: string };
  likelihood: number;
  impact: number;
  riskScore: number;
  riskLevel?: string;
  status: string;
  evidenceFileName?: string;
  evidenceCloudPath?: string;
  evidenceIsPublic?: boolean;
  createdBy: { id: string; name: string; surname?: string };
  createdAt: string;
  actions: OHSAction[];
  assessments: OHSAssessment[];
  comments: OHSComment[];
}

interface OHSAction {
  id: string;
  title: string;
  description?: string;
  actionType: string;
  priority: string;
  startDate?: string;
  dueDate?: string;
  completedAt?: string;
  plannedBudget?: number;
  actualCost?: number;
  status: string;
  completionEvidenceFileName?: string;
  completionEvidenceCloudPath?: string;
  assignee: { id: string; name: string; surname?: string };
  completedBy?: { id: string; name: string; surname?: string };
  createdBy: { id: string; name: string; surname?: string };
  createdAt: string;
}

interface OHSAssessment {
  id: string;
  assessmentType: string;
  likelihood: number;
  impact: number;
  riskScore: number;
  controlEffectiveness?: string;
  findings?: string;
  recommendations?: string;
  trend?: string;
  previousScore?: number;
  createdBy: { id: string; name: string; surname?: string };
  createdAt: string;
}

interface OHSComment {
  id: string;
  content: string;
  author: { id: string; name: string; surname?: string; role?: { name: string } };
  createdAt: string;
}

interface User {
  id: string;
  name: string;
  surname?: string;
}

const SOURCE_LABELS: Record<string, string> = {
  TASERON: 'Taşeron',
  EKIPMAN: 'Ekipman',
  CEVRE: 'Çevre',
  INSAN: 'İnsan Faktörü',
  PROSES: 'Proses',
  KIMYASAL: 'Kimyasal',
  FIZIKSEL: 'Fiziksel',
  BIYOLOJIK: 'Biyolojik',
  ERGONOMIK: 'Ergonomik',
  DIGER: 'Diğer',
};

const STATUS_LABELS: Record<string, string> = {
  ACIK: 'Açık',
  AKSIYON_BEKLIYOR: 'Aksiyon Bekliyor',
  DEGERLENDIRMEDE: 'Değerlendirmede',
  KAPATILDI: 'Kapatıldı',
};

const ACTION_TYPE_LABELS: Record<string, string> = {
  ONLEME: 'Önleme',
  DUZELTME: 'Düzeltme',
  IYILESTIRME: 'İyileştirme',
  KONTROL: 'Kontrol',
  EGITIM: 'Eğitim',
  DIGER: 'Diğer',
};

const ACTION_STATUS_LABELS: Record<string, string> = {
  OLUSTURULDU: 'Oluşturuldu',
  DEVAM_EDIYOR: 'Devam Ediyor',
  TAMAMLANDI: 'Tamamlandı',
  IPTAL: 'İptal',
};

const ACTION_STATUS_COLORS: Record<string, string> = {
  OLUSTURULDU: 'bg-gray-100 text-gray-800',
  DEVAM_EDIYOR: 'bg-blue-100 text-blue-800',
  TAMAMLANDI: 'bg-green-100 text-green-800',
  IPTAL: 'bg-red-100 text-red-800',
};

const PRIORITY_LABELS: Record<string, string> = {
  DUSUK: 'Düşük',
  ORTA: 'Orta',
  YUKSEK: 'Yüksek',
};

const ASSESSMENT_TYPE_LABELS: Record<string, string> = {
  RUTIN: 'Rutin',
  OLAY_SONRASI: 'Olay Sonrası',
  PERIYODIK: 'Periyodik',
};

const CONTROL_LABELS: Record<string, string> = {
  ETKILI: 'Etkili',
  KISMEN_ETKILI: 'Kısmen Etkili',
  ETKISIZ: 'Etkisiz',
};

const TREND_ICONS: Record<string, any> = {
  AZALDI: TrendingDown,
  ARTTI: TrendingUp,
  AYNI_KALDI: Minus,
};

const TREND_COLORS: Record<string, string> = {
  AZALDI: 'text-green-600',
  ARTTI: 'text-red-600',
  AYNI_KALDI: 'text-gray-600',
};

export default function OHSRiskDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession() || {};
  const [risk, setRisk] = useState<OHSRisk | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialogs
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [assessmentDialogOpen, setAssessmentDialogOpen] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<OHSAction | null>(null);
  
  // Forms
  const [actionForm, setActionForm] = useState({
    title: '',
    description: '',
    actionType: '',
    priority: 'ORTA',
    startDate: '',
    dueDate: '',
    assigneeId: '',
    plannedBudget: '',
  });

  const [assessmentForm, setAssessmentForm] = useState({
    assessmentType: '',
    likelihood: '',
    impact: '',
    controlEffectiveness: '',
    findings: '',
    recommendations: '',
  });

  const [commentText, setCommentText] = useState('');
  const [completionFile, setCompletionFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchRisk();
      fetchUsers();
    }
  }, [params.id]);

  const fetchRisk = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/ohs/risks/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setRisk(data);
      } else {
        toast.error('Risk bulunamadı');
        router.push('/dashboard/ohs/risks');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Users fetch error:', error);
    }
  };

  const handleCreateAction = async () => {
    if (!actionForm.title || !actionForm.actionType || !actionForm.assigneeId) {
      toast.error('Lütfen zorunlu alanları doldurun');
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`/api/ohs/risks/${params.id}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(actionForm),
      });

      if (response.ok) {
        toast.success('Aksiyon oluşturuldu');
        setActionDialogOpen(false);
        setActionForm({
          title: '',
          description: '',
          actionType: '',
          priority: 'ORTA',
          startDate: '',
          dueDate: '',
          assigneeId: '',
          plannedBudget: '',
        });
        fetchRisk();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Aksiyon oluşturulamadı');
      }
    } catch (error) {
      console.error('Create action error:', error);
      toast.error('Bir hata oluştu');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartAction = async (action: OHSAction) => {
    try {
      const response = await fetch(`/api/ohs/risks/${params.id}/actions/${action.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'DEVAM_EDIYOR' }),
      });

      if (response.ok) {
        toast.success('Aksiyon başlatıldı');
        fetchRisk();
      } else {
        toast.error('Aksiyon başlatılamadı');
      }
    } catch (error) {
      console.error('Start action error:', error);
      toast.error('Bir hata oluştu');
    }
  };

  const handleCompleteAction = async () => {
    if (!selectedAction || !completionFile) {
      toast.error('Kanıt dokümanı zorunludur');
      return;
    }

    try {
      setSubmitting(true);

      // Dosyayı yükle
      const presignedResponse = await fetch('/api/upload/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: completionFile.name,
          contentType: completionFile.type,
          isPublic: false,
        }),
      });

      if (!presignedResponse.ok) throw new Error('Dosya URL alınamadı');

      const { uploadUrl, cloud_storage_path } = await presignedResponse.json();

      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: completionFile,
        headers: { 'Content-Type': completionFile.type },
      });

      if (!uploadResponse.ok) throw new Error('Dosya yüklenemedi');

      // Aksiyonu tamamla
      const response = await fetch(`/api/ohs/risks/${params.id}/actions/${selectedAction.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'TAMAMLANDI',
          completionEvidenceFileName: completionFile.name,
          completionEvidenceFileSize: completionFile.size,
          completionEvidenceFileType: completionFile.type,
          completionEvidenceCloudPath: cloud_storage_path,
          completionEvidenceIsPublic: false,
        }),
      });

      if (response.ok) {
        toast.success('Aksiyon tamamlandı');
        setCompleteDialogOpen(false);
        setSelectedAction(null);
        setCompletionFile(null);
        fetchRisk();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Aksiyon tamamlanamadı');
      }
    } catch (error) {
      console.error('Complete action error:', error);
      toast.error('Bir hata oluştu');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateAssessment = async () => {
    if (!assessmentForm.assessmentType || !assessmentForm.likelihood || !assessmentForm.impact) {
      toast.error('Lütfen zorunlu alanları doldurun');
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`/api/ohs/risks/${params.id}/assessments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...assessmentForm,
          likelihood: parseInt(assessmentForm.likelihood),
          impact: parseInt(assessmentForm.impact),
        }),
      });

      if (response.ok) {
        toast.success('Değerlendirme eklendi');
        setAssessmentDialogOpen(false);
        setAssessmentForm({
          assessmentType: '',
          likelihood: '',
          impact: '',
          controlEffectiveness: '',
          findings: '',
          recommendations: '',
        });
        fetchRisk();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Değerlendirme eklenemedi');
      }
    } catch (error) {
      console.error('Create assessment error:', error);
      toast.error('Bir hata oluştu');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) {
      toast.error('Yorum boş olamaz');
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`/api/ohs/risks/${params.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentText }),
      });

      if (response.ok) {
        toast.success('Yorum eklendi');
        setCommentText('');
        fetchRisk();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Yorum eklenemedi');
      }
    } catch (error) {
      console.error('Add comment error:', error);
      toast.error('Bir hata oluştu');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadEvidence = async () => {
    if (!risk?.evidenceCloudPath) return;

    try {
      const response = await fetch('/api/upload/url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cloud_storage_path: risk.evidenceCloudPath,
          isPublic: risk.evidenceIsPublic,
          fileName: risk.evidenceFileName,
        }),
      });

      if (response.ok) {
        const { url } = await response.json();
        window.open(url, '_blank');
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Dosya indirilemedi');
    }
  };

  const getRiskScoreColor = (score: number) => {
    if (score >= 20) return 'text-white bg-red-600';
    if (score >= 15) return 'text-red-700 bg-red-100';
    if (score >= 10) return 'text-orange-700 bg-orange-100';
    if (score >= 5) return 'text-yellow-700 bg-yellow-100';
    return 'text-green-700 bg-green-100';
  };

  if (loading) {
    return <div className="p-6 text-center">Yükleniyor...</div>;
  }

  if (!risk) {
    return <div className="p-6 text-center">Risk bulunamadı</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-purple-600" />
            <h1 className="text-2xl font-bold">{risk.code}</h1>
            <Badge className={getRiskScoreColor(risk.riskScore)}>
              Puan: {risk.riskScore}
            </Badge>
          </div>
          <p className="text-lg text-muted-foreground">{risk.name}</p>
        </div>
      </div>

      {/* Özet Kartlar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className={`text-4xl font-bold ${getRiskScoreColor(risk.riskScore)} inline-block px-4 py-2 rounded-lg`}>
                {risk.riskScore}
              </div>
              <p className="text-sm text-muted-foreground mt-2">Risk Puanı</p>
              <p className="text-xs">Olasılık: {risk.likelihood} × Etki: {risk.impact}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Risk Kaynağı</p>
              <Badge variant="outline">{SOURCE_LABELS[risk.source]}</Badge>
              {risk.sourceDetail && (
                <p className="text-sm">{risk.sourceDetail}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Departman</p>
              <p className="font-medium">{risk.department?.name}</p>
              <p className="text-sm text-muted-foreground">Sorumlu: {risk.owner?.name} {risk.owner?.surname}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Durum</p>
              <Badge className={risk.status === 'KAPATILDI' ? 'bg-gray-100 text-gray-800' : 'bg-blue-100 text-blue-800'}>
                {STATUS_LABELS[risk.status]}
              </Badge>
              {risk.evidenceFileName && (
                <Button variant="link" size="sm" className="p-0" onClick={handleDownloadEvidence}>
                  <Download className="w-3 h-3 mr-1" />
                  Kanıt Dokümanı
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Açıklama */}
      {risk.description && (
        <Card>
          <CardHeader>
            <CardTitle>Açıklama</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{risk.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Sekmeler */}
      <Tabs defaultValue="actions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="actions">Aksiyonlar ({risk.actions.length})</TabsTrigger>
          <TabsTrigger value="assessments">Değerlendirmeler ({risk.assessments.length})</TabsTrigger>
          <TabsTrigger value="comments">Yorumlar ({risk.comments.length})</TabsTrigger>
        </TabsList>

        {/* Aksiyonlar */}
        <TabsContent value="actions">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Risk Aksiyonları</CardTitle>
                <CardDescription>Riski azaltmak için alınan önlemler</CardDescription>
              </div>
              <Button onClick={() => setActionDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Yeni Aksiyon
              </Button>
            </CardHeader>
            <CardContent>
              {risk.actions.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Henüz aksiyon eklenmemiş</p>
              ) : (
                <div className="space-y-4">
                  {risk.actions.map((action) => (
                    <Card key={action.id} className="border">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{action.title}</h4>
                              <Badge variant="outline">
                                {ACTION_TYPE_LABELS[action.actionType]}
                              </Badge>
                              <Badge className={ACTION_STATUS_COLORS[action.status]}>
                                {ACTION_STATUS_LABELS[action.status]}
                              </Badge>
                            </div>
                            {action.description && <p className="text-sm text-muted-foreground">{action.description}</p>}
                            <div className="flex items-center gap-4 text-sm">
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {action.assignee.name} {action.assignee.surname}
                              </span>
                              {action.dueDate && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  Bitiş: {formatDate(action.dueDate)}
                                </span>
                              )}
                              {action.plannedBudget !== undefined && action.plannedBudget > 0 && (
                                <span>Bütçe: {action.plannedBudget} TL</span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {action.status === 'OLUSTURULDU' && (
                              <Button size="sm" variant="outline" onClick={() => handleStartAction(action)}>
                                <Play className="w-4 h-4 mr-1" />
                                Başlat
                              </Button>
                            )}
                            {action.status === 'DEVAM_EDIYOR' && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedAction(action);
                                  setCompleteDialogOpen(true);
                                }}
                              >
                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                Tamamla
                              </Button>
                            )}
                            {action.status === 'TAMAMLANDI' && action.completionEvidenceFileName && (
                              <Badge variant="outline" className="text-green-600">
                                <FileText className="w-3 h-3 mr-1" />
                                Kanıt Mevcut
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Değerlendirmeler */}
        <TabsContent value="assessments">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Risk Değerlendirmeleri</CardTitle>
                <CardDescription>Periyodik risk analiz kayıtları</CardDescription>
              </div>
              <Button onClick={() => setAssessmentDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Yeni Değerlendirme
              </Button>
            </CardHeader>
            <CardContent>
              {risk.assessments.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Henüz değerlendirme yapılmamış</p>
              ) : (
                <div className="space-y-4">
                  {risk.assessments.map((assessment) => {
                    const TrendIcon = assessment.trend ? TREND_ICONS[assessment.trend] : null;
                    return (
                      <Card key={assessment.id} className="border">
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">
                                  {ASSESSMENT_TYPE_LABELS[assessment.assessmentType]}
                                </Badge>
                                <span className={`font-bold ${getRiskScoreColor(assessment.riskScore)} px-2 py-1 rounded`}>
                                  Puan: {assessment.riskScore}
                                </span>
                                {assessment.trend && TrendIcon && (
                                  <span className={`flex items-center gap-1 ${TREND_COLORS[assessment.trend]}`}>
                                    <TrendIcon className="w-4 h-4" />
                                    {assessment.trend === 'AZALDI' ? 'Risk Azaldı' : assessment.trend === 'ARTTI' ? 'Risk Arttı' : 'Aynı Kaldı'}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm">Olasılık: {assessment.likelihood} | Etki: {assessment.impact}</p>
                              {assessment.controlEffectiveness && (
                                <p className="text-sm">Kontrol Etkinliği: {CONTROL_LABELS[assessment.controlEffectiveness]}</p>
                              )}
                              {assessment.findings && <p className="text-sm"><strong>Bulgular:</strong> {assessment.findings}</p>}
                              {assessment.recommendations && <p className="text-sm"><strong>Öneriler:</strong> {assessment.recommendations}</p>}
                              <p className="text-xs text-muted-foreground">
                                {assessment.createdBy.name} {assessment.createdBy.surname} - {formatDate(assessment.createdAt)}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Yorumlar */}
        <TabsContent value="comments">
          <Card>
            <CardHeader>
              <CardTitle>Yorumlar / Tartışma</CardTitle>
              <CardDescription>Yetkili kullanıcılar yorum ekleyebilir</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Yorum Ekleme */}
              <div className="flex gap-2">
                <Textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Yorumunuzu yazın..."
                  rows={2}
                  className="flex-1"
                />
                <Button onClick={handleAddComment} disabled={submitting}>
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Gönder
                </Button>
              </div>

              {/* Yorum Listesi */}
              {risk.comments.length === 0 ? (
                <p className="text-center py-4 text-muted-foreground">Henüz yorum yapılmamış</p>
              ) : (
                <div className="space-y-3">
                  {risk.comments.map((comment) => (
                    <div key={comment.id} className="p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">
                          {comment.author.name} {comment.author.surname}
                        </span>
                        {comment.author.role && (
                          <Badge variant="outline" className="text-xs">
                            {comment.author.role.name}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatDate(comment.createdAt)}
                        </span>
                      </div>
                      <p>{comment.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Aksiyon Oluşturma Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Aksiyon</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Aksiyon Başlığı *</Label>
              <Input
                value={actionForm.title}
                onChange={(e) => setActionForm({ ...actionForm, title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Aksiyon Tipi *</Label>
                <Select value={actionForm.actionType} onValueChange={(v) => setActionForm({ ...actionForm, actionType: v })}>
                  <SelectTrigger><SelectValue placeholder="Seçin" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACTION_TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Öncelik</Label>
                <Select value={actionForm.priority} onValueChange={(v) => setActionForm({ ...actionForm, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Başlangıç Tarihi</Label>
                <Input type="date" value={actionForm.startDate} onChange={(e) => setActionForm({ ...actionForm, startDate: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Bitiş Tarihi</Label>
                <Input type="date" value={actionForm.dueDate} onChange={(e) => setActionForm({ ...actionForm, dueDate: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Sorumlu *</Label>
              <Select value={actionForm.assigneeId} onValueChange={(v) => setActionForm({ ...actionForm, assigneeId: v })}>
                <SelectTrigger><SelectValue placeholder="Seçin" /></SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>{user.name} {user.surname}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Planlı Bütçe (TL)</Label>
              <Input type="number" value={actionForm.plannedBudget} onChange={(e) => setActionForm({ ...actionForm, plannedBudget: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Açıklama</Label>
              <Textarea value={actionForm.description} onChange={(e) => setActionForm({ ...actionForm, description: e.target.value })} rows={2} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setActionDialogOpen(false)}>İptal</Button>
              <Button onClick={handleCreateAction} disabled={submitting}>{submitting ? 'Kaydediliyor...' : 'Oluştur'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Aksiyon Tamamlama Dialog */}
      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aksiyonu Tamamla</DialogTitle>
            <DialogDescription>Tamamlama için kanıt dokümanı yükleyin</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="font-medium">{selectedAction?.title}</p>
            <div className="space-y-2">
              <Label>Kanıt Dokümanı * (Fotoğraf veya PDF)</Label>
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setCompletionFile(e.target.files?.[0] || null)}
              />
              {completionFile && (
                <p className="text-sm text-muted-foreground">Seçili: {completionFile.name}</p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCompleteDialogOpen(false)}>İptal</Button>
              <Button onClick={handleCompleteAction} disabled={submitting}>
                {submitting ? 'Tamamlanıyor...' : 'Onayla ve Tamamla'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Değerlendirme Dialog */}
      <Dialog open={assessmentDialogOpen} onOpenChange={setAssessmentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Değerlendirme</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Değerlendirme Tipi *</Label>
              <Select value={assessmentForm.assessmentType} onValueChange={(v) => setAssessmentForm({ ...assessmentForm, assessmentType: v })}>
                <SelectTrigger><SelectValue placeholder="Seçin" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ASSESSMENT_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Olasılık (1-5) *</Label>
                <Select value={assessmentForm.likelihood} onValueChange={(v) => setAssessmentForm({ ...assessmentForm, likelihood: v })}>
                  <SelectTrigger><SelectValue placeholder="Seçin" /></SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5].map(n => <SelectItem key={n} value={n.toString()}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Etki (1-5) *</Label>
                <Select value={assessmentForm.impact} onValueChange={(v) => setAssessmentForm({ ...assessmentForm, impact: v })}>
                  <SelectTrigger><SelectValue placeholder="Seçin" /></SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5].map(n => <SelectItem key={n} value={n.toString()}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {assessmentForm.likelihood && assessmentForm.impact && (
              <div className="p-3 bg-muted rounded-lg text-center">
                <span className="text-sm">Hesaplanan Puan: </span>
                <span className={`font-bold px-2 py-1 rounded ${getRiskScoreColor(parseInt(assessmentForm.likelihood) * parseInt(assessmentForm.impact))}`}>
                  {parseInt(assessmentForm.likelihood) * parseInt(assessmentForm.impact)}
                </span>
              </div>
            )}
            <div className="space-y-2">
              <Label>Kontrol Etkinliği</Label>
              <Select value={assessmentForm.controlEffectiveness} onValueChange={(v) => setAssessmentForm({ ...assessmentForm, controlEffectiveness: v })}>
                <SelectTrigger><SelectValue placeholder="Seçin" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CONTROL_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Bulgular</Label>
              <Textarea value={assessmentForm.findings} onChange={(e) => setAssessmentForm({ ...assessmentForm, findings: e.target.value })} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Öneriler</Label>
              <Textarea value={assessmentForm.recommendations} onChange={(e) => setAssessmentForm({ ...assessmentForm, recommendations: e.target.value })} rows={2} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAssessmentDialogOpen(false)}>İptal</Button>
              <Button onClick={handleCreateAssessment} disabled={submitting}>{submitting ? 'Kaydediliyor...' : 'Kaydet'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
