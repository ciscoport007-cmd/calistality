'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  AlertOctagon,
  ArrowLeft,
  Calendar,
  MapPin,
  Building,
  Users,
  FileText,
  Download,
  Edit,
  Save,
  X,
  GraduationCap,
  Upload,
  CheckCircle2,
  Loader2,
  Briefcase,
  Eye,
  Plus,
  Trash2,
  Phone,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/export-utils';

interface OHSAccident {
  id: string;
  code: string;
  title: string;
  accidentDate: string;
  location: string;
  department: { id: string; name: string; code: string };
  description: string;
  rootCauseAnalysis?: string;
  actionsTaken?: string;
  preventiveMeasures?: string;
  status: string;
  evidenceFileName: string;
  evidenceCloudPath: string;
  trainingStatus?: string;
  trainingDate?: string;
  trainingCertFileName?: string;
  trainingCertFileSize?: number;
  trainingCertCloudPath?: string;
  trainingCertIsPublic?: boolean;
  trainingCompletedAt?: string;
  createdBy: { id: string; name: string; surname?: string; email?: string };
  createdAt: string;
  involvedPersons: Array<{
    id: string;
    user?: { id: string; name: string; surname?: string; email?: string };
    externalName?: string;
    duty?: string;
    position?: string;
    personDepartment?: { id: string; name: string };
    notes?: string;
  }>;
  witnesses: Array<{
    id: string;
    user?: { id: string; name: string; surname?: string; email?: string };
    externalName?: string;
    contactInfo?: string;
    statement?: string;
  }>;
}

const STATUS_LABELS: Record<string, string> = {
  ACIK: 'Açık',
  ANALIZ: 'Kök Neden Analizi',
  ONLEM_ALIYOR: 'Önlem Alınıyor',
  KAPATILDI: 'Kapatıldı',
  TAMAMLANDI: 'Tamamlandı',
};

const STATUS_COLORS: Record<string, string> = {
  ACIK: 'bg-red-100 text-red-800',
  ANALIZ: 'bg-yellow-100 text-yellow-800',
  ONLEM_ALIYOR: 'bg-blue-100 text-blue-800',
  KAPATILDI: 'bg-gray-100 text-gray-800',
  TAMAMLANDI: 'bg-green-100 text-green-800',
};

const POSITION_LABELS: Record<string, string> = {
  CALISAN: 'Çalışan',
  ORTA_DUZEY_YONETICI: 'Orta Düzey Yönetici',
  UST_DUZEY_YONETICI: 'Üst Düzey Yönetici',
};

export default function AccidentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [accident, setAccident] = useState<OHSAccident | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState({
    status: '',
    rootCauseAnalysis: '',
    actionsTaken: '',
    preventiveMeasures: '',
  });

  // Training state
  const [trainingStatus, setTrainingStatus] = useState<string>('');
  const [trainingUploading, setTrainingUploading] = useState(false);
  const [trainingSaving, setTrainingSaving] = useState(false);
  const trainingFileRef = useRef<HTMLInputElement>(null);

  // Tanıklar state
  const [users, setUsers] = useState<Array<{ id: string; name: string; surname?: string }>>([]);
  const [witnessDialogOpen, setWitnessDialogOpen] = useState(false);
  const [witnessForm, setWitnessForm] = useState({
    type: 'system' as 'system' | 'external',
    userId: '',
    externalName: '',
    contactInfo: '',
    statement: '',
  });
  const [witnessSubmitting, setWitnessSubmitting] = useState(false);

  useEffect(() => {
    fetchAccident();
    fetchUsers();
  }, [params.id]);

  const fetchAccident = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/ohs/accidents/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setAccident(data);
        setEditData({
          status: data.status,
          rootCauseAnalysis: data.rootCauseAnalysis || '',
          actionsTaken: data.actionsTaken || '',
          preventiveMeasures: data.preventiveMeasures || '',
        });
        setTrainingStatus(data.trainingStatus || '');
      } else {
        toast.error('Kaza kaydı bulunamadı');
        router.push('/dashboard/ohs/accidents');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Kaza kaydı yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.users || [];
        setUsers(list);
      }
    } catch (error) {
      console.error('Users fetch error:', error);
    }
  };

  const handleAddWitness = async () => {
    if (witnessForm.type === 'system' && !witnessForm.userId) {
      toast.error('Lütfen kullanıcı seçin');
      return;
    }
    if (witnessForm.type === 'external' && !witnessForm.externalName.trim()) {
      toast.error('Lütfen tanık adını girin');
      return;
    }
    try {
      setWitnessSubmitting(true);
      const res = await fetch(`/api/ohs/accidents/${params.id}/witnesses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: witnessForm.type === 'system' ? witnessForm.userId : null,
          externalName: witnessForm.type === 'external' ? witnessForm.externalName : null,
          contactInfo: witnessForm.contactInfo || null,
          statement: witnessForm.statement || null,
        }),
      });
      if (res.ok) {
        toast.success('Tanık eklendi');
        setWitnessDialogOpen(false);
        setWitnessForm({ type: 'system', userId: '', externalName: '', contactInfo: '', statement: '' });
        fetchAccident();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Tanık eklenemedi');
      }
    } catch (error) {
      toast.error('Hata oluştu');
    } finally {
      setWitnessSubmitting(false);
    }
  };

  const handleDeleteWitness = async (witnessId: string) => {
    try {
      const res = await fetch(`/api/ohs/accidents/${params.id}/witnesses?witnessId=${witnessId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success('Tanık silindi');
        fetchAccident();
      } else {
        toast.error('Tanık silinemedi');
      }
    } catch (error) {
      toast.error('Hata oluştu');
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch(`/api/ohs/accidents/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      });

      if (response.ok) {
        const updated = await response.json();
        setAccident(updated);
        setEditing(false);
        toast.success('Kaza kaydı güncellendi');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Güncelleme başarısız');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Güncelleme sırasında hata');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadEvidence = async () => {
    try {
      const response = await fetch('/api/upload/url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cloud_storage_path: accident?.evidenceCloudPath,
          isPublic: false,
          fileName: accident?.evidenceFileName,
        }),
      });

      if (response.ok) {
        const { url } = await response.json();
        const a = document.createElement('a');
        a.href = url;
        a.download = accident?.evidenceFileName || 'evidence';
        a.click();
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('İndirme başarısız');
    }
  };

  const handleTrainingStatusChange = async (newStatus: string) => {
    try {
      setTrainingSaving(true);
      setTrainingStatus(newStatus);

      const payload: Record<string, unknown> = {
        trainingStatus: newStatus,
      };

      if (newStatus === 'EGITIM_ALMADI') {
        payload.trainingDate = null;
        payload.trainingCertFileName = null;
        payload.trainingCertFileSize = null;
        payload.trainingCertCloudPath = null;
        payload.trainingCertIsPublic = false;
        payload.trainingCompletedAt = null;
      }

      const response = await fetch(`/api/ohs/accidents/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const updated = await response.json();
        setAccident(updated);
        toast.success('Eğitim durumu güncellendi');
      } else {
        toast.error('Eğitim durumu güncellenemedi');
        setTrainingStatus(accident?.trainingStatus || '');
      }
    } catch (error) {
      console.error('Training status error:', error);
      toast.error('Hata oluştu');
      setTrainingStatus(accident?.trainingStatus || '');
    } finally {
      setTrainingSaving(false);
    }
  };

  const handleTrainingCertUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setTrainingUploading(true);

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

      if (!presignedRes.ok) {
        throw new Error('Presigned URL alınamadı');
      }

      const { uploadUrl, cloud_storage_path } = await presignedRes.json();

      // Check signed headers for Content-Disposition
      const urlObj = new URL(uploadUrl);
      const signedHeaders = urlObj.searchParams.get('X-Amz-SignedHeaders') || '';
      const headers: Record<string, string> = { 'Content-Type': file.type };
      if (signedHeaders.includes('content-disposition')) {
        headers['Content-Disposition'] = 'attachment';
      }

      // Upload to S3
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers,
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error('Dosya yüklenemedi');
      }

      // Update accident with cert info
      const patchRes = await fetch(`/api/ohs/accidents/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trainingCertFileName: file.name,
          trainingCertFileSize: file.size,
          trainingCertCloudPath: cloud_storage_path,
          trainingCertIsPublic: false,
          trainingDate: new Date().toISOString(),
          trainingCompletedAt: new Date().toISOString(),
        }),
      });

      if (patchRes.ok) {
        const updated = await patchRes.json();
        setAccident(updated);
        toast.success('Eğitim sertifikası yüklendi');
      } else {
        toast.error('Sertifika kaydı güncellenemedi');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Sertifika yüklenirken hata oluştu');
    } finally {
      setTrainingUploading(false);
      if (trainingFileRef.current) trainingFileRef.current.value = '';
    }
  };

  const handleDownloadTrainingCert = async () => {
    if (!accident?.trainingCertCloudPath) return;
    try {
      const response = await fetch('/api/upload/url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cloud_storage_path: accident.trainingCertCloudPath,
          isPublic: accident.trainingCertIsPublic ?? false,
          fileName: accident.trainingCertFileName,
        }),
      });

      if (response.ok) {
        const { url } = await response.json();
        const a = document.createElement('a');
        a.href = url;
        a.download = accident.trainingCertFileName || 'sertifika';
        a.click();
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('İndirme başarısız');
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Yükleniyor...</p>
      </div>
    );
  }

  if (!accident) {
    return null;
  }

  const trainingCompleted = !!accident.trainingCompletedAt;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/dashboard/ohs/accidents')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Geri
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <AlertOctagon className="w-7 h-7 text-red-600" />
              {accident.code}
            </h1>
            <p className="text-muted-foreground">{accident.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={STATUS_COLORS[accident.status]}>
            {STATUS_LABELS[accident.status]}
          </Badge>
          {!editing ? (
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Edit className="w-4 h-4 mr-2" />
              Düzenle
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setEditing(false)}>
                <X className="w-4 h-4 mr-2" />
                İptal
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sol Kolon - Detaylar */}
        <div className="lg:col-span-2 space-y-6">
          {/* Kaza Bilgileri */}
          <Card>
            <CardHeader>
              <CardTitle>Kaza Bilgileri</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Tarih:</span>
                  <span className="font-medium">{formatDate(accident.accidentDate)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Konum:</span>
                  <span className="font-medium">{accident.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Departman:</span>
                  <span className="font-medium">{accident.department?.name}</span>
                </div>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Açıklama</Label>
                <p className="mt-1">{accident.description}</p>
              </div>
            </CardContent>
          </Card>

          {/* Durum Güncelleme */}
          {editing && (
            <Card>
              <CardHeader>
                <CardTitle>Durum Güncelle</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Durum</Label>
                  <Select
                    value={editData.status}
                    onValueChange={(v) => setEditData({ ...editData, status: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Analiz ve Önlemler */}
          <Card>
            <CardHeader>
              <CardTitle>Analiz ve Önlemler</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Kök Neden Analizi</Label>
                {editing ? (
                  <Textarea
                    value={editData.rootCauseAnalysis}
                    onChange={(e) => setEditData({ ...editData, rootCauseAnalysis: e.target.value })}
                    rows={3}
                  />
                ) : (
                  <p className="text-sm bg-muted p-3 rounded-lg">
                    {accident.rootCauseAnalysis || 'Henüz girilmedi'}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Alınan Önlemler</Label>
                {editing ? (
                  <Textarea
                    value={editData.actionsTaken}
                    onChange={(e) => setEditData({ ...editData, actionsTaken: e.target.value })}
                    rows={3}
                  />
                ) : (
                  <p className="text-sm bg-muted p-3 rounded-lg">
                    {accident.actionsTaken || 'Henüz girilmedi'}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Önleyici Tedbirler</Label>
                {editing ? (
                  <Textarea
                    value={editData.preventiveMeasures}
                    onChange={(e) => setEditData({ ...editData, preventiveMeasures: e.target.value })}
                    rows={3}
                  />
                ) : (
                  <p className="text-sm bg-muted p-3 rounded-lg">
                    {accident.preventiveMeasures || 'Henüz girilmedi'}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Eğitim Durumu */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5" />
                Eğitim Durumu
                {trainingCompleted && (
                  <Badge className="bg-green-100 text-green-800 ml-2">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Tamamlandı
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Label>Eğitim Durumu</Label>
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant={trainingStatus === 'EGITIM_ALDI' ? 'default' : 'outline'}
                    size="sm"
                    disabled={trainingSaving}
                    onClick={() => handleTrainingStatusChange('EGITIM_ALDI')}
                    className={trainingStatus === 'EGITIM_ALDI' ? 'bg-green-600 hover:bg-green-700' : ''}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Eğitim Aldı
                  </Button>
                  <Button
                    type="button"
                    variant={trainingStatus === 'EGITIM_ALMADI' ? 'default' : 'outline'}
                    size="sm"
                    disabled={trainingSaving}
                    onClick={() => handleTrainingStatusChange('EGITIM_ALMADI')}
                    className={trainingStatus === 'EGITIM_ALMADI' ? 'bg-red-600 hover:bg-red-700' : ''}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Eğitim Almadı
                  </Button>
                </div>
              </div>

              {trainingStatus === 'EGITIM_ALDI' && (
                <div className="space-y-3 border-t pt-4">
                  <Label>Eğitim Sertifikası</Label>
                  {accident.trainingCertFileName ? (
                    <div className="flex items-center gap-3 bg-muted p-3 rounded-lg">
                      <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{accident.trainingCertFileName}</p>
                        {accident.trainingDate && (
                          <p className="text-xs text-muted-foreground">Yükleme: {formatDate(accident.trainingDate)}</p>
                        )}
                      </div>
                      <Button size="sm" variant="outline" onClick={handleDownloadTrainingCert}>
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed rounded-lg p-6 text-center">
                      <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground mb-3">Eğitim sertifikasını yükleyin</p>
                      <input
                        ref={trainingFileRef}
                        type="file"
                        className="hidden"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={handleTrainingCertUpload}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={trainingUploading}
                        onClick={() => trainingFileRef.current?.click()}
                      >
                        {trainingUploading ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Yükleniyor...</>
                        ) : (
                          <><Upload className="w-4 h-4 mr-2" />Dosya Seç</>
                        )}
                      </Button>
                    </div>
                  )}

                  {/* Replace certificate if already uploaded */}
                  {accident.trainingCertFileName && (
                    <div>
                      <input
                        ref={trainingFileRef}
                        type="file"
                        className="hidden"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={handleTrainingCertUpload}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={trainingUploading}
                        onClick={() => trainingFileRef.current?.click()}
                      >
                        {trainingUploading ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Değiştiriliyor...</>
                        ) : (
                          <><Upload className="w-4 h-4 mr-2" />Sertifikayı Değiştir</>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sağ Kolon - Yan Bilgiler */}
        <div className="space-y-6">
          {/* Kanıt Dokümanı */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Kanıt Dokümanı
              </CardTitle>
            </CardHeader>
            <CardContent>
              {accident.evidenceFileName ? (
                <div className="flex items-center justify-between">
                  <span className="text-sm truncate flex-1">{accident.evidenceFileName}</span>
                  <Button size="sm" variant="outline" onClick={handleDownloadEvidence}>
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Dosya yüklenmemiş</p>
              )}
            </CardContent>
          </Card>

          {/* Karışan Personel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Kazaya Karışanlar ({accident.involvedPersons?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {accident.involvedPersons?.length === 0 ? (
                <p className="text-sm text-muted-foreground">Kayıt yok</p>
              ) : (
                <div className="space-y-3">
                  {accident.involvedPersons?.map((person) => (
                    <div key={person.id} className="border rounded-lg p-3 space-y-1">
                      <p className="font-medium">
                        {person.externalName || (person.user ? `${person.user.name} ${person.user.surname || ''}` : 'Bilinmiyor')}
                      </p>
                      {person.duty && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Briefcase className="w-3 h-3" />
                          <span>Görev: {person.duty}</span>
                        </div>
                      )}
                      {person.position && (
                        <p className="text-sm text-muted-foreground">
                          Pozisyon: {POSITION_LABELS[person.position] || person.position}
                        </p>
                      )}
                      {person.personDepartment && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Building className="w-3 h-3" />
                          <span>{person.personDepartment.name}</span>
                        </div>
                      )}
                      {person.notes && (
                        <p className="text-sm text-muted-foreground mt-1">{person.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tanıklar */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Tanıklar ({accident.witnesses?.length || 0})
                </CardTitle>
                <Button size="sm" variant="outline" onClick={() => setWitnessDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-1" />
                  Tanık Ekle
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!accident.witnesses?.length ? (
                <p className="text-sm text-muted-foreground">Tanık kaydı yok</p>
              ) : (
                <div className="space-y-3">
                  {accident.witnesses.map((w) => (
                    <div key={w.id} className="border rounded-lg p-3 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm">
                          {w.externalName || (w.user ? `${w.user.name} ${w.user.surname || ''}` : '-')}
                          {!w.externalName && w.user && (
                            <Badge variant="outline" className="ml-2 text-xs">Sistem Kullanıcısı</Badge>
                          )}
                        </p>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:text-red-700 h-6 w-6 p-0 flex-shrink-0"
                          onClick={() => handleDeleteWitness(w.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      {w.contactInfo && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="w-3 h-3" />
                          <span>{w.contactInfo}</span>
                        </div>
                      )}
                      {w.statement && (
                        <p className="text-xs text-muted-foreground bg-muted rounded p-2 mt-1">
                          {w.statement}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Meta Bilgiler */}
          <Card>
            <CardHeader>
              <CardTitle>Kayıt Bilgileri</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Oluşturan:</span>
                <span>{accident.createdBy?.name} {accident.createdBy?.surname}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tarih:</span>
                <span>{formatDate(accident.createdAt)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tanık Ekleme Dialog */}
      <Dialog open={witnessDialogOpen} onOpenChange={setWitnessDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tanık Ekle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Tip seçimi */}
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={witnessForm.type === 'system' ? 'default' : 'outline'}
                onClick={() => setWitnessForm({ ...witnessForm, type: 'system', externalName: '' })}
              >
                Sistemdeki Kullanıcı
              </Button>
              <Button
                type="button"
                size="sm"
                variant={witnessForm.type === 'external' ? 'default' : 'outline'}
                onClick={() => setWitnessForm({ ...witnessForm, type: 'external', userId: '' })}
              >
                Harici Kişi
              </Button>
            </div>

            {witnessForm.type === 'system' ? (
              <div className="space-y-1">
                <Label>Kullanıcı <span className="text-red-500">*</span></Label>
                <Select
                  value={witnessForm.userId}
                  onValueChange={(v) => setWitnessForm({ ...witnessForm, userId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Kullanıcı seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} {u.surname || ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-1">
                <Label>Ad Soyad <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="Tanık adı soyadı"
                  value={witnessForm.externalName}
                  onChange={(e) => setWitnessForm({ ...witnessForm, externalName: e.target.value })}
                />
              </div>
            )}

            <div className="space-y-1">
              <Label>İletişim Bilgisi</Label>
              <Input
                placeholder="Telefon veya e-posta"
                value={witnessForm.contactInfo}
                onChange={(e) => setWitnessForm({ ...witnessForm, contactInfo: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <Label>Tanık İfadesi</Label>
              <Textarea
                placeholder="Tanığın olayı nasıl gördüğünü açıklayın..."
                value={witnessForm.statement}
                onChange={(e) => setWitnessForm({ ...witnessForm, statement: e.target.value })}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWitnessDialogOpen(false)}>
              İptal
            </Button>
            <Button onClick={handleAddWitness} disabled={witnessSubmitting}>
              {witnessSubmitting ? 'Ekleniyor...' : 'Ekle'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
