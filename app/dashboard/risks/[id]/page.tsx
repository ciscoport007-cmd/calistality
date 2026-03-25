'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft,
  Plus,
  Edit,
  Save,
  AlertTriangle,
  Shield,
  ClipboardCheck,
  History,
  Target,
  TrendingDown,
  CheckCircle,
  Clock,
  User,
  Upload,
  FileText,
  Trash2,
  Download,
  Paperclip,
} from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

const riskTypes = [
  { value: 'STRATEJIK', label: 'Stratejik' },
  { value: 'OPERASYONEL', label: 'Operasyonel' },
  { value: 'FINANSAL', label: 'Finansal' },
  { value: 'UYUM', label: 'Uyum' },
  { value: 'BILGI_GUVENLIGI', label: 'Bilgi Güvenliği' },
  { value: 'IS_SAGLIGI', label: 'İş Sağlığı ve Güvenliği' },
  { value: 'CEVRE', label: 'Çevre' },
];

const riskStatuses = [
  { value: 'TANIMLANDI', label: 'Tanımlandı', color: 'bg-gray-500' },
  { value: 'ANALIZ_EDILIYOR', label: 'Analiz Ediliyor', color: 'bg-blue-500' },
  { value: 'DEGERLENDIRME_BEKLENIYOR', label: 'Değerlendirme Bekleniyor', color: 'bg-yellow-500' },
  { value: 'AKSIYONDA', label: 'Aksiyonda', color: 'bg-orange-500' },
  { value: 'IZLENIYOR', label: 'İzleniyor', color: 'bg-purple-500' },
  { value: 'KABUL_EDILDI', label: 'Kabul Edildi', color: 'bg-cyan-500' },
  { value: 'KAPATILDI', label: 'Kapatıldı', color: 'bg-green-500' },
];

const riskLevels = [
  { value: 'DUSUK', label: 'Düşük', color: 'bg-green-500' },
  { value: 'ORTA', label: 'Orta', color: 'bg-yellow-500' },
  { value: 'YUKSEK', label: 'Yüksek', color: 'bg-orange-500' },
  { value: 'COK_YUKSEK', label: 'Çok Yüksek', color: 'bg-red-500' },
  { value: 'KRITIK', label: 'Kritik', color: 'bg-red-700' },
];

const responseStrategies = [
  { value: 'KABUL', label: 'Kabul Et' },
  { value: 'AZALT', label: 'Azalt' },
  { value: 'TRANSFER', label: 'Transfer Et' },
  { value: 'KACINMA', label: 'Kaçın' },
];

const actionTypes = [
  { value: 'ONLEME', label: 'Önleme' },
  { value: 'AZALTMA', label: 'Azaltma' },
  { value: 'TRANSFER', label: 'Transfer' },
  { value: 'DUZELTICI', label: 'Düzeltici' },
  { value: 'ACIL', label: 'Acil' },
  { value: 'IZLEME', label: 'İzleme' },
];

const actionStatuses = [
  { value: 'PLANLI', label: 'Planlı', color: 'bg-gray-500' },
  { value: 'DEVAM_EDIYOR', label: 'Devam Ediyor', color: 'bg-blue-500' },
  { value: 'TAMAMLANDI', label: 'Tamamlandı', color: 'bg-green-500' },
  { value: 'IPTAL', label: 'İptal', color: 'bg-red-500' },
  { value: 'ERTELENDI', label: 'Ertelendi', color: 'bg-yellow-500' },
];

const priorityLevels = [
  { value: 'DUSUK', label: 'Düşük', color: 'bg-green-500' },
  { value: 'ORTA', label: 'Orta', color: 'bg-yellow-500' },
  { value: 'YUKSEK', label: 'Yüksek', color: 'bg-orange-500' },
  { value: 'ACIL', label: 'Acil', color: 'bg-red-500' },
];

const assessmentTypes = [
  { value: 'ILKSEL', label: 'İlksel Değerlendirme' },
  { value: 'PERIYODIK', label: 'Periyodik Değerlendirme' },
  { value: 'OLAY_SONRASI', label: 'Olay Sonrası Değerlendirme' },
  { value: 'PROJE_BASLANGICI', label: 'Proje Başlangıcı' },
];

export default function RiskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [risk, setRisk] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [users, setUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  
  const [isAssessmentOpen, setIsAssessmentOpen] = useState(false);
  const [assessmentForm, setAssessmentForm] = useState({
    assessmentType: 'PERIYODIK',
    probability: '',
    probabilityJustification: '',
    impact: '',
    impactJustification: '',
    financialImpact: '',
    operationalImpact: '',
    controlsAssessment: '',
    controlsEffectiveness: '',
    findings: '',
    recommendations: '',
  });

  const [isActionOpen, setIsActionOpen] = useState(false);
  const [actionForm, setActionForm] = useState({
    title: '',
    description: '',
    actionType: '',
    priority: 'ORTA',
    plannedStartDate: '',
    plannedEndDate: '',
    assigneeId: '',
    budgetPlanned: '',
    budgetType: '',
    currency: 'TRY',
    expectedGain: '',
    resources: '',
    expectedProbabilityReduction: '',
    expectedImpactReduction: '',
  });

  // Kanıt dosyaları state
  const [attachments, setAttachments] = useState<any[]>([]);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const evidenceFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchRisk();
    fetchUsers();
    fetchDepartments();
    fetchCategories();
    fetchAttachments();
  }, [params.id]);

  const fetchAttachments = async () => {
    try {
      const res = await fetch(`/api/risks/${params.id}/attachments`);
      if (res.ok) {
        const data = await res.json();
        setAttachments(data);
      }
    } catch (error) {
      console.error('Attachments fetch error:', error);
    }
  };

  const handleEvidenceUpload = async (files: FileList) => {
    setUploadingEvidence(true);
    try {
      for (const file of Array.from(files)) {
        // Get presigned URL
        const presignedRes = await fetch('/api/upload/presigned', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            contentType: file.type,
            isPublic: false,
          }),
        });
        if (!presignedRes.ok) continue;
        const { uploadUrl, cloud_storage_path } = await presignedRes.json();

        // Upload to S3
        const uploadRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file,
        });
        if (!uploadRes.ok) continue;

        // Save attachment
        await fetch(`/api/risks/${params.id}/attachments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
            cloud_storage_path,
            isPublic: false,
          }),
        });
      }
      fetchAttachments();
    } catch (error) {
      console.error('Evidence upload error:', error);
    } finally {
      setUploadingEvidence(false);
    }
  };

  const deleteAttachment = async (attachmentId: string) => {
    if (!confirm('Dosyayı silmek istediğinize emin misiniz?')) return;
    try {
      await fetch(`/api/risks/${params.id}/attachments?attachmentId=${attachmentId}`, {
        method: 'DELETE',
      });
      fetchAttachments();
    } catch (error) {
      console.error('Attachment delete error:', error);
    }
  };

  const fetchRisk = async () => {
    try {
      const res = await fetch(`/api/risks/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setRisk(data);
        setEditData(data);
      }
    } catch (error) {
      console.error('Risk detay hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setUsers(data.users || data || []);
    } catch (error) {
      console.error('Kullanıcı listesi hatası:', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/departments');
      const data = await res.json();
      const deptList = data.departments || data;
      setDepartments(Array.isArray(deptList) ? deptList : []);
    } catch (error) {
      console.error('Departman listesi hatası:', error);
      setDepartments([]);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/risk-categories');
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Kategori listesi hatası:', error);
      setCategories([]);
    }
  };

  const handleSave = async () => {
    try {
      const res = await fetch(`/api/risks/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      });
      if (res.ok) {
        setIsEditing(false);
        fetchRisk();
      }
    } catch (error) {
      console.error('Güncelleme hatası:', error);
    }
  };

  const handleCreateAssessment = async () => {
    try {
      const res = await fetch(`/api/risks/${params.id}/assessments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assessmentForm),
      });
      if (res.ok) {
        setIsAssessmentOpen(false);
        setAssessmentForm({
          assessmentType: 'PERIYODIK',
          probability: '',
          probabilityJustification: '',
          impact: '',
          impactJustification: '',
          financialImpact: '',
          operationalImpact: '',
          controlsAssessment: '',
          controlsEffectiveness: '',
          findings: '',
          recommendations: '',
        });
        fetchRisk();
      }
    } catch (error) {
      console.error('Değerlendirme oluşturma hatası:', error);
    }
  };

  const handleCreateAction = async () => {
    try {
      const res = await fetch(`/api/risks/${params.id}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(actionForm),
      });
      if (res.ok) {
        setIsActionOpen(false);
        setActionForm({
          title: '',
          description: '',
          actionType: '',
          priority: 'ORTA',
          plannedStartDate: '',
          plannedEndDate: '',
          assigneeId: '',
          budgetPlanned: '',
          budgetType: '',
          currency: 'TRY',
          expectedGain: '',
          resources: '',
          expectedProbabilityReduction: '',
          expectedImpactReduction: '',
        });
        fetchRisk();
      }
    } catch (error) {
      console.error('Aksiyon oluşturma hatası:', error);
    }
  };

  const handleUpdateAction = async (actionId: string, updates: any) => {
    try {
      const res = await fetch(`/api/risks/${params.id}/actions?actionId=${actionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        fetchRisk();
      }
    } catch (error) {
      console.error('Aksiyon güncelleme hatası:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const s = riskStatuses.find((st) => st.value === status);
    return s ? (
      <Badge className={`${s.color} text-white`}>{s.label}</Badge>
    ) : (
      <Badge variant="secondary">{status}</Badge>
    );
  };

  const getLevelBadge = (level: string | null) => {
    if (!level) return <Badge variant="outline">Belirsiz</Badge>;
    const l = riskLevels.find((lv) => lv.value === level);
    return l ? (
      <Badge className={`${l.color} text-white`}>{l.label}</Badge>
    ) : (
      <Badge variant="outline">{level}</Badge>
    );
  };

  const getActionStatusBadge = (status: string) => {
    const s = actionStatuses.find((st) => st.value === status);
    return s ? (
      <Badge className={`${s.color} text-white`}>{s.label}</Badge>
    ) : (
      <Badge variant="secondary">{status}</Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const p = priorityLevels.find((pr) => pr.value === priority);
    return p ? (
      <Badge className={`${p.color} text-white`}>{p.label}</Badge>
    ) : (
      <Badge variant="secondary">{priority}</Badge>
    );
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <p>Yükleniyor...</p>
      </div>
    );
  }

  if (!risk) {
    return (
      <div className="p-6">
        <p>Risk bulunamadı</p>
        <Button onClick={() => router.push('/dashboard/risks')}>Geri Dön</Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => router.push('/dashboard/risks')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Geri
          </Button>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold">{risk.code}</h1>
              {getLevelBadge(risk.currentLevel)}
              {getStatusBadge(risk.status)}
            </div>
            <p className="text-lg text-muted-foreground">{risk.title}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                İptal
              </Button>
              <Button onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                Kaydet
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>
              <Edit className="w-4 h-4 mr-2" />
              Düzenle
            </Button>
          )}
        </div>
      </div>

      {/* Risk Matris Özet */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Doğal Risk Skoru</p>
                <p className="text-2xl font-bold">{risk.inherentRiskScore || '-'}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Kalıntı Risk Skoru</p>
                <p className="text-2xl font-bold">{risk.residualRiskScore || '-'}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Değerlendirme</p>
                <p className="text-2xl font-bold">{risk.assessments?.length || 0}</p>
              </div>
              <ClipboardCheck className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Aksiyon</p>
                <p className="text-2xl font-bold">{risk.actions?.length || 0}</p>
              </div>
              <Target className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Detaylar</TabsTrigger>
          <TabsTrigger value="matrix">Risk Matrisi</TabsTrigger>
          <TabsTrigger value="assessments">Değerlendirmeler ({risk.assessments?.length || 0})</TabsTrigger>
          <TabsTrigger value="actions">Aksiyonlar ({risk.actions?.length || 0})</TabsTrigger>
          <TabsTrigger value="history">Geçmiş ({risk.history?.length || 0})</TabsTrigger>
          <TabsTrigger value="evidence">Kanıtlar ({attachments.length})</TabsTrigger>
        </TabsList>

        {/* Detaylar */}
        <TabsContent value="details">
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label>Risk Tipi</Label>
                    {isEditing ? (
                      <Select
                        value={editData.type}
                        onValueChange={(v) => setEditData({ ...editData, type: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {riskTypes.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-lg">
                        {riskTypes.find((t) => t.value === risk.type)?.label || risk.type}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>Durum</Label>
                    {isEditing ? (
                      <Select
                        value={editData.status}
                        onValueChange={(v) => setEditData({ ...editData, status: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {riskStatuses.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      getStatusBadge(risk.status)
                    )}
                  </div>
                  <div>
                    <Label>Kategori</Label>
                    {isEditing ? (
                      <Select
                        value={editData.categoryId || ''}
                        onValueChange={(v) => setEditData({ ...editData, categoryId: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-lg">{risk.category?.name || '-'}</p>
                    )}
                  </div>
                  <div>
                    <Label>Departman</Label>
                    {isEditing ? (
                      <Select
                        value={editData.departmentId || ''}
                        onValueChange={(v) => setEditData({ ...editData, departmentId: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map((d) => (
                            <SelectItem key={d.id} value={d.id}>
                              {d.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-lg">{risk.department?.name || '-'}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label>Risk Sahibi</Label>
                    {isEditing ? (
                      <Select
                        value={editData.ownerId || ''}
                        onValueChange={(v) => setEditData({ ...editData, ownerId: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.name} {u.surname}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-lg">
                        {risk.owner ? `${risk.owner.name} ${risk.owner.surname || ''}` : '-'}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>Yanıt Stratejisi</Label>
                    {isEditing ? (
                      <Select
                        value={editData.responseStrategy || ''}
                        onValueChange={(v) => setEditData({ ...editData, responseStrategy: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {responseStrategies.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-lg">
                        {responseStrategies.find((s) => s.value === risk.responseStrategy)?.label || '-'}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>Gözden Geçirme Tarihi</Label>
                    {isEditing ? (
                      <Input
                        type="date"
                        value={editData.reviewDate ? format(new Date(editData.reviewDate), 'yyyy-MM-dd') : ''}
                        onChange={(e) => setEditData({ ...editData, reviewDate: e.target.value })}
                      />
                    ) : (
                      <p className="text-lg">
                        {risk.reviewDate
                          ? format(new Date(risk.reviewDate), 'dd MMMM yyyy', { locale: tr })
                          : '-'}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>Oluşturulma Tarihi</Label>
                    <p className="text-lg">
                      {format(new Date(risk.createdAt), 'dd MMMM yyyy HH:mm', { locale: tr })}
                    </p>
                  </div>
                </div>
                <div className="col-span-2">
                  <Label>Açıklama</Label>
                  {isEditing ? (
                    <Textarea
                      value={editData.description || ''}
                      onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                      rows={3}
                    />
                  ) : (
                    <p className="text-lg whitespace-pre-wrap">{risk.description || '-'}</p>
                  )}
                </div>
                <div className="col-span-2">
                  <Label>Mevcut Kontroller</Label>
                  {isEditing ? (
                    <Textarea
                      value={editData.existingControls || ''}
                      onChange={(e) => setEditData({ ...editData, existingControls: e.target.value })}
                      rows={3}
                    />
                  ) : (
                    <p className="text-lg whitespace-pre-wrap">{risk.existingControls || '-'}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Risk Matrisi */}
        <TabsContent value="matrix">
          <Card>
            <CardHeader>
              <CardTitle>Risk Değerlendirme Matrisi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-4">Doğal Risk (Kontrol Öncesi)</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span>Olasılık:</span>
                      <span className="font-bold">{risk.inherentProbability || '-'} / 5</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Etki:</span>
                      <span className="font-bold">{risk.inherentImpact || '-'} / 5</span>
                    </div>
                    <div className="flex items-center justify-between border-t pt-2">
                      <span>Risk Skoru:</span>
                      <span className="font-bold text-xl">{risk.inherentRiskScore || '-'}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-4">Kalıntı Risk (Kontrol Sonrası)</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span>Olasılık:</span>
                      <span className="font-bold">{risk.residualProbability || '-'} / 5</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Etki:</span>
                      <span className="font-bold">{risk.residualImpact || '-'} / 5</span>
                    </div>
                    <div className="flex items-center justify-between border-t pt-2">
                      <span>Risk Skoru:</span>
                      <span className="font-bold text-xl">{risk.residualRiskScore || '-'}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* 5x5 Risk Matrisi Görseli */}
              <div className="mt-8">
                <h4 className="font-semibold mb-4">5x5 Risk Matrisi</h4>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="border p-2 bg-muted"></th>
                        <th className="border p-2 bg-muted text-center">1<br/><span className="text-xs">Önemsiz</span></th>
                        <th className="border p-2 bg-muted text-center">2<br/><span className="text-xs">Küçük</span></th>
                        <th className="border p-2 bg-muted text-center">3<br/><span className="text-xs">Orta</span></th>
                        <th className="border p-2 bg-muted text-center">4<br/><span className="text-xs">Büyük</span></th>
                        <th className="border p-2 bg-muted text-center">5<br/><span className="text-xs">Felaket</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {[5, 4, 3, 2, 1].map((p) => (
                        <tr key={p}>
                          <td className="border p-2 bg-muted text-center font-semibold">
                            {p}<br/>
                            <span className="text-xs">
                              {p === 5 ? 'Çok Yüksek' : p === 4 ? 'Yüksek' : p === 3 ? 'Orta' : p === 2 ? 'Düşük' : 'Çok Düşük'}
                            </span>
                          </td>
                          {[1, 2, 3, 4, 5].map((i) => {
                            const score = p * i;
                            const bgColor = score <= 4 ? 'bg-green-200' : score <= 9 ? 'bg-yellow-200' : score <= 14 ? 'bg-orange-200' : score <= 19 ? 'bg-red-200' : 'bg-red-400';
                            const isInherent = risk.inherentProbability === p && risk.inherentImpact === i;
                            const isResidual = risk.residualProbability === p && risk.residualImpact === i;
                            return (
                              <td key={i} className={`border p-2 text-center ${bgColor} relative`}>
                                <span className="font-semibold">{score}</span>
                                {isInherent && (
                                  <div className="absolute top-1 right-1 w-3 h-3 bg-red-600 rounded-full" title="Doğal Risk"></div>
                                )}
                                {isResidual && (
                                  <div className="absolute bottom-1 right-1 w-3 h-3 bg-green-600 rounded-full" title="Kalıntı Risk"></div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center space-x-4 mt-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-600 rounded-full"></div>
                    <span>Doğal Risk</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                    <span>Kalıntı Risk</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Değerlendirmeler */}
        <TabsContent value="assessments">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Risk Değerlendirmeleri</CardTitle>
              <Dialog open={isAssessmentOpen} onOpenChange={setIsAssessmentOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Yeni Değerlendirme
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Yeni Risk Değerlendirmesi</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Değerlendirme Tipi</Label>
                        <Select
                          value={assessmentForm.assessmentType}
                          onValueChange={(v) => setAssessmentForm({ ...assessmentForm, assessmentType: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {assessmentTypes.map((t) => (
                              <SelectItem key={t.value} value={t.value}>
                                {t.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div></div>
                      <div>
                        <Label>Olasılık (1-5) *</Label>
                        <Select
                          value={assessmentForm.probability}
                          onValueChange={(v) => setAssessmentForm({ ...assessmentForm, probability: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seçin" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 - Çok Düşük</SelectItem>
                            <SelectItem value="2">2 - Düşük</SelectItem>
                            <SelectItem value="3">3 - Orta</SelectItem>
                            <SelectItem value="4">4 - Yüksek</SelectItem>
                            <SelectItem value="5">5 - Çok Yüksek</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Etki (1-5) *</Label>
                        <Select
                          value={assessmentForm.impact}
                          onValueChange={(v) => setAssessmentForm({ ...assessmentForm, impact: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seçin" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 - Önemsiz</SelectItem>
                            <SelectItem value="2">2 - Küçük</SelectItem>
                            <SelectItem value="3">3 - Orta</SelectItem>
                            <SelectItem value="4">4 - Büyük</SelectItem>
                            <SelectItem value="5">5 - Felaket</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {assessmentForm.probability && assessmentForm.impact && (
                        <div className="col-span-2">
                          <div className="p-3 bg-muted rounded-lg">
                            <span className="font-medium">Hesaplanan Risk Skoru: </span>
                            <span className="font-bold text-lg">
                              {parseInt(assessmentForm.probability) * parseInt(assessmentForm.impact)}
                            </span>
                          </div>
                        </div>
                      )}
                      <div className="col-span-2">
                        <Label>Olasılık Gerekçesi</Label>
                        <Textarea
                          value={assessmentForm.probabilityJustification}
                          onChange={(e) => setAssessmentForm({ ...assessmentForm, probabilityJustification: e.target.value })}
                          rows={2}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Etki Gerekçesi</Label>
                        <Textarea
                          value={assessmentForm.impactJustification}
                          onChange={(e) => setAssessmentForm({ ...assessmentForm, impactJustification: e.target.value })}
                          rows={2}
                        />
                      </div>
                      <div>
                        <Label>Kontrol Etkinliği</Label>
                        <Select
                          value={assessmentForm.controlsEffectiveness}
                          onValueChange={(v) => setAssessmentForm({ ...assessmentForm, controlsEffectiveness: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seçin" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ETKISIZ">Etkisiz</SelectItem>
                            <SelectItem value="KISMI">Kısmi</SelectItem>
                            <SelectItem value="ETKILI">Etkili</SelectItem>
                            <SelectItem value="COK_ETKILI">Çok Etkili</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div></div>
                      <div className="col-span-2">
                        <Label>Bulgular</Label>
                        <Textarea
                          value={assessmentForm.findings}
                          onChange={(e) => setAssessmentForm({ ...assessmentForm, findings: e.target.value })}
                          rows={2}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Öneriler</Label>
                        <Textarea
                          value={assessmentForm.recommendations}
                          onChange={(e) => setAssessmentForm({ ...assessmentForm, recommendations: e.target.value })}
                          rows={2}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setIsAssessmentOpen(false)}>
                        İptal
                      </Button>
                      <Button
                        onClick={handleCreateAssessment}
                        disabled={!assessmentForm.probability || !assessmentForm.impact}
                      >
                        Oluştur
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {risk.assessments?.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Henüz değerlendirme yapılmamış</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tarih</TableHead>
                      <TableHead>Tip</TableHead>
                      <TableHead>Olasılık</TableHead>
                      <TableHead>Etki</TableHead>
                      <TableHead>Skor</TableHead>
                      <TableHead>Seviye</TableHead>
                      <TableHead>Değerlendiren</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {risk.assessments?.map((a: any) => (
                      <TableRow key={a.id}>
                        <TableCell>
                          {format(new Date(a.assessmentDate), 'dd.MM.yyyy', { locale: tr })}
                        </TableCell>
                        <TableCell>
                          {assessmentTypes.find((t) => t.value === a.assessmentType)?.label || a.assessmentType}
                        </TableCell>
                        <TableCell>{a.probability}/5</TableCell>
                        <TableCell>{a.impact}/5</TableCell>
                        <TableCell className="font-bold">{a.riskScore}</TableCell>
                        <TableCell>{getLevelBadge(a.riskLevel)}</TableCell>
                        <TableCell>
                          {a.assessedBy?.name} {a.assessedBy?.surname}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aksiyonlar */}
        <TabsContent value="actions">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Risk Aksiyonları</CardTitle>
              <Dialog open={isActionOpen} onOpenChange={setIsActionOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Yeni Aksiyon
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Yeni Risk Aksiyonu</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <Label>Aksiyon Başlığı *</Label>
                        <Input
                          value={actionForm.title}
                          onChange={(e) => setActionForm({ ...actionForm, title: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Aksiyon Tipi *</Label>
                        <Select
                          value={actionForm.actionType}
                          onValueChange={(v) => setActionForm({ ...actionForm, actionType: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seçin" />
                          </SelectTrigger>
                          <SelectContent>
                            {actionTypes.map((t) => (
                              <SelectItem key={t.value} value={t.value}>
                                {t.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Öncelik</Label>
                        <Select
                          value={actionForm.priority}
                          onValueChange={(v) => setActionForm({ ...actionForm, priority: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {priorityLevels.map((p) => (
                              <SelectItem key={p.value} value={p.value}>
                                {p.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Planlanan Başlangıç</Label>
                        <Input
                          type="date"
                          value={actionForm.plannedStartDate}
                          onChange={(e) => setActionForm({ ...actionForm, plannedStartDate: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Planlanan Bitiş</Label>
                        <Input
                          type="date"
                          value={actionForm.plannedEndDate}
                          onChange={(e) => setActionForm({ ...actionForm, plannedEndDate: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Sorumlu</Label>
                        <Select
                          value={actionForm.assigneeId}
                          onValueChange={(v) => setActionForm({ ...actionForm, assigneeId: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seçin" />
                          </SelectTrigger>
                          <SelectContent>
                            {users.map((u) => (
                              <SelectItem key={u.id} value={u.id}>
                                {u.name} {u.surname}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Planlanan Bütçe</Label>
                        <Input
                          type="number"
                          value={actionForm.budgetPlanned}
                          onChange={(e) => setActionForm({ ...actionForm, budgetPlanned: e.target.value })}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <Label>Bütçe Tipi</Label>
                        <Select
                          value={actionForm.budgetType}
                          onValueChange={(v) => setActionForm({ ...actionForm, budgetType: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seçiniz" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CAPEX">CAPEX (Yatırım)</SelectItem>
                            <SelectItem value="OPEX">OPEX (İşletme)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Para Birimi</Label>
                        <Select
                          value={actionForm.currency}
                          onValueChange={(v) => setActionForm({ ...actionForm, currency: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seçiniz" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="TRY">TRY (₺)</SelectItem>
                            <SelectItem value="USD">USD ($)</SelectItem>
                            <SelectItem value="EUR">EUR (€)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Beklenen Kazanç/Tasarruf</Label>
                        <Input
                          type="number"
                          value={actionForm.expectedGain}
                          onChange={(e) => setActionForm({ ...actionForm, expectedGain: e.target.value })}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Açıklama</Label>
                        <Textarea
                          value={actionForm.description}
                          onChange={(e) => setActionForm({ ...actionForm, description: e.target.value })}
                          rows={3}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setIsActionOpen(false)}>
                        İptal
                      </Button>
                      <Button
                        onClick={handleCreateAction}
                        disabled={!actionForm.title || !actionForm.actionType}
                      >
                        Oluştur
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {risk.actions?.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Henüz aksiyon tanımlanmamış</p>
              ) : (
                <div className="space-y-4">
                  {risk.actions?.map((action: any) => (
                    <Card key={action.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <span className="font-mono text-sm text-muted-foreground">{action.code}</span>
                              {getActionStatusBadge(action.status)}
                              {getPriorityBadge(action.priority)}
                            </div>
                            <h4 className="font-semibold">{action.title}</h4>
                            <p className="text-sm text-muted-foreground">{action.description}</p>
                            <div className="flex items-center space-x-4 text-sm">
                              {action.assignee && (
                                <div className="flex items-center space-x-1">
                                  <User className="w-4 h-4" />
                                  <span>{action.assignee.name} {action.assignee.surname}</span>
                                </div>
                              )}
                              {action.plannedEndDate && (
                                <div className="flex items-center space-x-1">
                                  <Clock className="w-4 h-4" />
                                  <span>Hedef: {format(new Date(action.plannedEndDate), 'dd.MM.yyyy', { locale: tr })}</span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center space-x-2">
                              <Progress value={action.progress} className="w-32" />
                              <span className="text-sm">%{action.progress}</span>
                            </div>
                            {/* Manuel İlerleme Takibi */}
                            <div className="flex items-center gap-1 mt-1">
                              <span className="text-xs text-muted-foreground mr-1">İlerleme:</span>
                              {[0, 25, 50, 75, 100].map((step) => (
                                <Button
                                  key={step}
                                  size="sm"
                                  variant={action.progress === step ? 'default' : 'outline'}
                                  className="h-6 px-2 text-xs"
                                  onClick={() => handleUpdateAction(action.id, {
                                    progress: step,
                                    ...(step === 100 ? { status: 'TAMAMLANDI' } : {}),
                                    ...(step > 0 && step < 100 && action.status === 'PLANLI' ? { status: 'DEVAM_EDIYOR', actualStartDate: new Date().toISOString() } : {}),
                                  })}
                                >
                                  %{step}
                                </Button>
                              ))}
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            {action.status === 'PLANLI' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUpdateAction(action.id, { status: 'DEVAM_EDIYOR', actualStartDate: new Date().toISOString() })}
                              >
                                Başlat
                              </Button>
                            )}
                            {action.status === 'DEVAM_EDIYOR' && (
                              <Button
                                size="sm"
                                onClick={() => handleUpdateAction(action.id, { status: 'TAMAMLANDI', progress: 100 })}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Tamamla
                              </Button>
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

        {/* Geçmiş */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Risk Geçmişi</CardTitle>
            </CardHeader>
            <CardContent>
              {risk.history?.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Geçmiş kaydı bulunmuyor</p>
              ) : (
                <div className="space-y-4">
                  {risk.history?.map((h: any) => (
                    <div key={h.id} className="flex items-start space-x-4 p-3 border rounded-lg">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <History className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{h.user?.name} {h.user?.surname}</span>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(h.createdAt), 'dd.MM.yyyy HH:mm', { locale: tr })}
                          </span>
                        </div>
                        <p className="text-sm">
                          <Badge variant="outline" className="mr-2">{h.action}</Badge>
                          {h.comments}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Kanıtlar */}
        <TabsContent value="evidence">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Kanıt Dosyaları</CardTitle>
              <div>
                <input
                  ref={evidenceFileRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleEvidenceUpload(e.target.files);
                      e.target.value = '';
                    }
                  }}
                />
                <Button
                  size="sm"
                  onClick={() => evidenceFileRef.current?.click()}
                  disabled={uploadingEvidence}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploadingEvidence ? 'Yükleniyor...' : 'Dosya Ekle'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {attachments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Henüz kanıt dosyası eklenmemiş</p>
              ) : (
                <div className="space-y-2">
                  {attachments.map((att: any) => (
                    <div key={att.id} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center gap-3">
                        <Paperclip className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{att.fileName}</p>
                          <p className="text-xs text-muted-foreground">
                            {att.uploadedBy?.name} {att.uploadedBy?.surname} • {att.fileSize ? `${(att.fileSize / 1024).toFixed(1)} KB` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {att.url && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={att.url} target="_blank" download>
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => deleteAttachment(att.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
