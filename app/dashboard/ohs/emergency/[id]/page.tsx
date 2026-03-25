'use client';

import { useEffect, useState } from 'react';
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
  Siren,
  ArrowLeft,
  Calendar,
  FileText,
  Download,
  Edit,
  Save,
  X,
  MapPin,
  Phone,
  Users,
  ClipboardCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/export-utils';

interface EmergencyPlan {
  id: string;
  code: string;
  type: string;
  title: string;
  description: string;
  procedures: string;
  evacuationRoutes?: string;
  assemblyPoints?: string;
  responsiblePersons?: string;
  emergencyContacts?: string;
  documentFileName?: string;
  documentCloudPath?: string;
  status: string;
  version: string;
  validFrom?: string;
  validUntil?: string;
  createdBy: { id: string; name: string; surname?: string };
  createdAt: string;
  drills: Array<{
    id: string;
    code: string;
    title: string;
    drillDate: string;
    duration?: number;
    participantCount?: number;
    result?: string;
    createdBy: { id: string; name: string; surname?: string };
  }>;
}

const EMERGENCY_TYPE_LABELS: Record<string, string> = {
  YANGIN: 'Yangın',
  DEPREM: 'Deprem',
  TAHLIYE: 'Tahliye',
  KIMYASAL_SIZINTI: 'Kimyasal Sızıntı',
  ELEKTRIK_KESINTISI: 'Elektrik Kesintisi',
  SU_BASKINI: 'Su Baskını',
  DOGAL_AFET: 'Doğal Afet',
  SAGLIK_ACIL: 'Sağlık Acil Durumu',
  GUVENLIK: 'Güvenlik Acil Durumu',
  DIGER: 'Diğer',
};

const PLAN_STATUS_LABELS: Record<string, string> = {
  TASLAK: 'Taslak',
  AKTIF: 'Aktif',
  GUNCELLENIYOR: 'Güncelleniyor',
  ARSIV: 'Arşiv',
};

const PLAN_STATUS_COLORS: Record<string, string> = {
  TASLAK: 'bg-gray-100 text-gray-800',
  AKTIF: 'bg-green-100 text-green-800',
  GUNCELLENIYOR: 'bg-yellow-100 text-yellow-800',
  ARSIV: 'bg-slate-100 text-slate-800',
};

const DRILL_RESULT_LABELS: Record<string, string> = {
  BASARILI: 'Başarılı',
  KISMEN_BASARILI: 'Kısmen Başarılı',
  BASARISIZ: 'Başarısız',
};

const DRILL_RESULT_COLORS: Record<string, string> = {
  BASARILI: 'bg-green-100 text-green-800',
  KISMEN_BASARILI: 'bg-yellow-100 text-yellow-800',
  BASARISIZ: 'bg-red-100 text-red-800',
};

export default function EmergencyPlanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [plan, setPlan] = useState<EmergencyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState({
    status: '',
    procedures: '',
    evacuationRoutes: '',
    assemblyPoints: '',
    responsiblePersons: '',
    emergencyContacts: '',
  });

  useEffect(() => {
    fetchPlan();
  }, [params.id]);

  const fetchPlan = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/ohs/emergency/plans/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setPlan(data);
        setEditData({
          status: data.status,
          procedures: data.procedures || '',
          evacuationRoutes: data.evacuationRoutes || '',
          assemblyPoints: data.assemblyPoints || '',
          responsiblePersons: data.responsiblePersons || '',
          emergencyContacts: data.emergencyContacts || '',
        });
      } else {
        toast.error('Plan bulunamadı');
        router.push('/dashboard/ohs/emergency');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Plan yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch(`/api/ohs/emergency/plans/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      });

      if (response.ok) {
        const updated = await response.json();
        setPlan({ ...plan, ...updated });
        setEditing(false);
        toast.success('Plan güncellendi');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Güncelleme başarısız');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadDocument = async () => {
    if (!plan?.documentCloudPath) return;

    try {
      const response = await fetch('/api/upload/url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cloud_storage_path: plan.documentCloudPath,
          isPublic: false,
          fileName: plan.documentFileName,
        }),
      });

      if (response.ok) {
        const { url } = await response.json();
        const a = document.createElement('a');
        a.href = url;
        a.download = plan.documentFileName || 'document';
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

  if (!plan) {
    return null;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/dashboard/ohs/emergency')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Geri
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Siren className="w-7 h-7 text-cyan-600" />
              {plan.code}
            </h1>
            <p className="text-muted-foreground">{plan.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={PLAN_STATUS_COLORS[plan.status]}>
            {PLAN_STATUS_LABELS[plan.status]}
          </Badge>
          <Badge variant="outline">v{plan.version}</Badge>
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
          {/* Plan Bilgileri */}
          <Card>
            <CardHeader>
              <CardTitle>Plan Bilgileri</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">Acil Durum Türü</span>
                  <p className="font-medium">{EMERGENCY_TYPE_LABELS[plan.type]}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Geçerlilik</span>
                  <p className="font-medium">
                    {plan.validFrom ? formatDate(plan.validFrom) : '-'}
                    {plan.validUntil ? ` - ${formatDate(plan.validUntil)}` : ''}
                  </p>
                </div>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Açıklama</Label>
                <p className="mt-1">{plan.description}</p>
              </div>
            </CardContent>
          </Card>

          {/* Durum Güncelleme */}
          {editing && (
            <Card>
              <CardHeader>
                <CardTitle>Durum Güncelle</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={editData.status} onValueChange={(v) => setEditData({ ...editData, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PLAN_STATUS_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          {/* Prosedürler */}
          <Card>
            <CardHeader>
              <CardTitle>Acil Durum Prosedürleri</CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <Textarea
                  value={editData.procedures}
                  onChange={(e) => setEditData({ ...editData, procedures: e.target.value })}
                  rows={6}
                />
              ) : (
                <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg">
                  {plan.procedures}
                </pre>
              )}
            </CardContent>
          </Card>

          {/* Tahliye ve Toplanma */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Tahliye ve Toplanma Bilgileri
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tahliye Güzergahları</Label>
                {editing ? (
                  <Textarea
                    value={editData.evacuationRoutes}
                    onChange={(e) => setEditData({ ...editData, evacuationRoutes: e.target.value })}
                    rows={3}
                  />
                ) : (
                  <p className="text-sm bg-muted p-3 rounded-lg">
                    {plan.evacuationRoutes || 'Belirtilmemiş'}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Toplanma Noktaları</Label>
                {editing ? (
                  <Textarea
                    value={editData.assemblyPoints}
                    onChange={(e) => setEditData({ ...editData, assemblyPoints: e.target.value })}
                    rows={3}
                  />
                ) : (
                  <p className="text-sm bg-muted p-3 rounded-lg">
                    {plan.assemblyPoints || 'Belirtilmemiş'}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tatbikatlar */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5" />
                Tatbikatlar ({plan.drills?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {plan.drills?.length === 0 ? (
                <p className="text-sm text-muted-foreground">Henüz tatbikat yapılmamış</p>
              ) : (
                <div className="space-y-3">
                  {plan.drills?.map((drill) => (
                    <div key={drill.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{drill.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(drill.drillDate)}
                            {drill.duration && ` • ${drill.duration} dk`}
                            {drill.participantCount && ` • ${drill.participantCount} katılımcı`}
                          </p>
                        </div>
                        {drill.result && (
                          <Badge className={DRILL_RESULT_COLORS[drill.result]}>
                            {DRILL_RESULT_LABELS[drill.result]}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sağ Kolon */}
        <div className="space-y-6">
          {/* Doküman */}
          {plan.documentFileName && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Plan Dokümanı
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm truncate flex-1">{plan.documentFileName}</span>
                  <Button size="sm" variant="outline" onClick={handleDownloadDocument}>
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sorumlular */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Sorumlu Kişiler
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <Textarea
                  value={editData.responsiblePersons}
                  onChange={(e) => setEditData({ ...editData, responsiblePersons: e.target.value })}
                  rows={4}
                />
              ) : (
                <p className="text-sm whitespace-pre-wrap">
                  {plan.responsiblePersons || 'Belirtilmemiş'}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Acil İletişim */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Acil İletişim
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <Textarea
                  value={editData.emergencyContacts}
                  onChange={(e) => setEditData({ ...editData, emergencyContacts: e.target.value })}
                  rows={4}
                />
              ) : (
                <p className="text-sm whitespace-pre-wrap">
                  {plan.emergencyContacts || 'Belirtilmemiş'}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Meta */}
          <Card>
            <CardHeader>
              <CardTitle>Kayıt Bilgileri</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Oluşturan:</span>
                <span>{plan.createdBy?.name} {plan.createdBy?.surname}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tarih:</span>
                <span>{formatDate(plan.createdAt)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
