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
import { Label } from '@/components/ui/label';
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Building,
  User,
  FileText,
  Download,
  Edit,
  Save,
  X,
  Lightbulb,
  CheckCircle2,
  Undo2,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/export-utils';

interface OHSNearMiss {
  id: string;
  code: string;
  title: string;
  eventDate: string;
  department: { id: string; name: string; code: string };
  description: string;
  reporter?: { id: string; name: string; surname?: string; email?: string };
  reporterName?: string;
  potentialConsequence?: string;
  responsibleName?: string;
  suggestedMeasure?: string;
  responsibleNote?: string;
  evidenceFileName?: string;
  evidenceCloudPath?: string;
  status: string;
  completedAt?: string;
  createdBy: { id: string; name: string; surname?: string; email?: string };
  createdAt: string;
}

const STATUS_LABELS: Record<string, string> = {
  ACIK: 'Açık',
  TAMAMLANDI: 'Tamamlandı',
};

const STATUS_COLORS: Record<string, string> = {
  ACIK: 'bg-yellow-100 text-yellow-800',
  TAMAMLANDI: 'bg-green-100 text-green-800',
};

export default function NearMissDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [nearMiss, setNearMiss] = useState<OHSNearMiss | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusChanging, setStatusChanging] = useState(false);
  const [editData, setEditData] = useState({
    suggestedMeasure: '',
    responsibleNote: '',
  });

  useEffect(() => {
    fetchNearMiss();
  }, [params.id]);

  const fetchNearMiss = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/ohs/near-misses/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setNearMiss(data);
        setEditData({
          suggestedMeasure: data.suggestedMeasure || '',
          responsibleNote: data.responsibleNote || '',
        });
      } else {
        toast.error('Ramak kala kaydı bulunamadı');
        router.push('/dashboard/ohs/near-misses');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Ramak kala kaydı yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch(`/api/ohs/near-misses/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      });

      if (response.ok) {
        const updated = await response.json();
        setNearMiss(updated);
        setEditing(false);
        toast.success('Ramak kala kaydı güncellendi');
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
    if (!nearMiss?.evidenceCloudPath) return;

    try {
      const response = await fetch('/api/upload/url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cloud_storage_path: nearMiss.evidenceCloudPath,
          isPublic: false,
          fileName: nearMiss.evidenceFileName,
        }),
      });

      if (response.ok) {
        const { url } = await response.json();
        const a = document.createElement('a');
        a.href = url;
        a.download = nearMiss.evidenceFileName || 'evidence';
        a.click();
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('İndirme başarısız');
    }
  };

  const handleStatusToggle = async () => {
    if (!nearMiss) return;
    const newStatus = nearMiss.status === 'TAMAMLANDI' ? 'ACIK' : 'TAMAMLANDI';
    try {
      setStatusChanging(true);
      const response = await fetch(`/api/ohs/near-misses/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          ...(newStatus === 'TAMAMLANDI' ? { completedAt: new Date().toISOString() } : {}),
        }),
      });
      if (response.ok) {
        const updated = await response.json();
        setNearMiss(updated);
        toast.success(newStatus === 'TAMAMLANDI' ? 'Kayıt tamamlandı olarak işaretlendi' : 'Kayıt tekrar açıldı');
      } else {
        toast.error('Durum güncellenemedi');
      }
    } catch (error) {
      console.error('Status toggle error:', error);
      toast.error('Hata oluştu');
    } finally {
      setStatusChanging(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Yükleniyor...</p>
      </div>
    );
  }

  if (!nearMiss) {
    return null;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/dashboard/ohs/near-misses')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Geri
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <AlertTriangle className="w-7 h-7 text-yellow-600" />
              {nearMiss.code}
            </h1>
            <p className="text-muted-foreground">{nearMiss.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={STATUS_COLORS[nearMiss.status] || 'bg-yellow-100 text-yellow-800'}>
            {STATUS_LABELS[nearMiss.status] || nearMiss.status}
          </Badge>
          {nearMiss.status !== 'TAMAMLANDI' ? (
            <Button
              variant="outline"
              className="border-green-500 text-green-700 hover:bg-green-50"
              onClick={handleStatusToggle}
              disabled={statusChanging}
            >
              {statusChanging ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />İşleniyor...</>
              ) : (
                <><CheckCircle2 className="w-4 h-4 mr-2" />Tamamlandı</>
              )}
            </Button>
          ) : (
            <Button
              variant="outline"
              className="border-yellow-500 text-yellow-700 hover:bg-yellow-50"
              onClick={handleStatusToggle}
              disabled={statusChanging}
            >
              {statusChanging ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />İşleniyor...</>
              ) : (
                <><Undo2 className="w-4 h-4 mr-2" />Tekrar Aç</>
              )}
            </Button>
          )}
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
          {/* Olay Bilgileri */}
          <Card>
            <CardHeader>
              <CardTitle>Olay Bilgileri</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Olay Tarihi:</span>
                  <span className="font-medium">{formatDate(nearMiss.eventDate)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Departman:</span>
                  <span className="font-medium">{nearMiss.department?.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Bildiren:</span>
                  <span className="font-medium">
                    {nearMiss.reporterName || (nearMiss.reporter ? `${nearMiss.reporter.name} ${nearMiss.reporter.surname || ''}`.trim() : '-')}
                  </span>
                </div>
                {nearMiss.responsibleName && (
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Sorumlu:</span>
                    <span className="font-medium">{nearMiss.responsibleName}</span>
                  </div>
                )}
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Ne Olabilirdi?</Label>
                <p className="mt-1 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                  {nearMiss.description}
                </p>
              </div>
              {nearMiss.potentialConsequence && (
                <div>
                  <Label className="text-sm text-muted-foreground">Olası Sonuç</Label>
                  <p className="mt-1 bg-muted p-3 rounded-lg">
                    {nearMiss.potentialConsequence}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Önlem ve Notlar */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-yellow-600" />
                Önlem ve Notlar
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Önerilen Önlem</Label>
                {editing ? (
                  <Textarea
                    value={editData.suggestedMeasure}
                    onChange={(e) => setEditData({ ...editData, suggestedMeasure: e.target.value })}
                    placeholder="Bu tehlikeyi önlemek için ne yapılabilir?"
                    rows={3}
                  />
                ) : (
                  <p className="text-sm bg-muted p-3 rounded-lg">
                    {nearMiss.suggestedMeasure || 'Henüz girilmedi'}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Sorumlu Notu</Label>
                {editing ? (
                  <Textarea
                    value={editData.responsibleNote}
                    onChange={(e) => setEditData({ ...editData, responsibleNote: e.target.value })}
                    placeholder="Ek notlar"
                    rows={3}
                  />
                ) : (
                  <p className="text-sm bg-muted p-3 rounded-lg">
                    {nearMiss.responsibleNote || 'Henüz girilmedi'}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sağ Kolon - Yan Bilgiler */}
        <div className="space-y-6">
          {/* Kanıt Dokümanı */}
          {nearMiss.evidenceFileName && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Kanıt Dokümanı
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm truncate flex-1">{nearMiss.evidenceFileName}</span>
                  <Button size="sm" variant="outline" onClick={handleDownloadEvidence}>
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Meta Bilgiler */}
          <Card>
            <CardHeader>
              <CardTitle>Kayıt Bilgileri</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Oluşturan:</span>
                <span>{nearMiss.createdBy?.name} {nearMiss.createdBy?.surname}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Kayıt Tarihi:</span>
                <span>{formatDate(nearMiss.createdAt)}</span>
              </div>
              {nearMiss.completedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tamamlanma:</span>
                  <span className="text-green-700 font-medium">{formatDate(nearMiss.completedAt)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
