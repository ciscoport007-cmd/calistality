'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import {
  Building2,
  ArrowLeft,
  Phone,
  Mail,
  Globe,
  MapPin,
  Calendar,
  User,
  Star,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  AlertTriangle,
  FileText,
  Clock,
  Award,
  TrendingUp,
  Users,
  History,
  Download,
  Upload,
  ClipboardCheck,
  AlertOctagon,
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

const STATUS_LABELS: Record<string, string> = {
  ADAY: 'Aday',
  DEGERLENDIRMEDE: 'Değerlendirmede',
  ONAYLANDI: 'Onaylandı',
  ASKIYA_ALINDI: 'Askıya Alındı',
  KARA_LISTE: 'Kara Liste',
  PASIF: 'Pasif'
};

const STATUS_COLORS: Record<string, string> = {
  ADAY: 'bg-gray-100 text-gray-800',
  DEGERLENDIRMEDE: 'bg-blue-100 text-blue-800',
  ONAYLANDI: 'bg-green-100 text-green-800',
  ASKIYA_ALINDI: 'bg-yellow-100 text-yellow-800',
  KARA_LISTE: 'bg-red-100 text-red-800',
  PASIF: 'bg-gray-100 text-gray-500'
};

const TYPE_LABELS: Record<string, string> = {
  URUN: 'Ürün',
  HIZMET: 'Hizmet',
  HAMMADDE: 'Hammadde',
  MALZEME: 'Malzeme',
  EKIPMAN: 'Ekipman',
  BAKIM: 'Bakım Hizmeti',
  KALIBRASYON: 'Kalibrasyon',
  DIGER: 'Diğer'
};

const RATING_COLORS: Record<string, string> = {
  A: 'bg-green-500',
  B: 'bg-blue-500',
  C: 'bg-yellow-500',
  D: 'bg-red-500'
};

const EVALUATION_PERIODS: Record<string, string> = {
  AYLIK: 'Aylık',
  UCAYLIK: '3 Aylık',
  ALTIAYLIK: '6 Aylık',
  YILLIK: 'Yıllık'
};

const PURCHASE_FREQUENCIES: Record<string, string> = {
  GUNLUK: 'Günlük',
  HAFTALIK: 'Haftalık',
  IKIAFTALIK: '2 Haftalık',
  AYLIK: 'Aylık',
  UCAYLIK: '3 Aylık',
  ALTIAYLIK: '6 Aylık',
  YILLIK: 'Yıllık',
  PROJE_BAZLI: 'Proje Bazlı',
  IHTIYAC_BAZLI: 'İhtiyaç Bazlı'
};

const DOC_TYPE_LABELS: Record<string, string> = {
  SERTIFIKA: 'Sertifika',
  SOZLESME: 'Sözleşme',
  TEKLIF: 'Teklif',
  KALITE_BELGESI: 'Kalite Belgesi',
  DIGER: 'Diğer'
};

const ACTION_LABELS: Record<string, string> = {
  OLUSTURULDU: 'Oluşturuldu',
  GUNCELLENDI: 'Güncellendi',
  ONAYLANDI: 'Onaylandı',
  ASKIYA_ALINDI: 'Askıya Alındı',
  KARA_LISTEYE_ALINDI: 'Kara Listeye Alındı',
  DEGERLENDIRME_YAPILDI: 'Değerlendirme Yapıldı',
  BELGE_YUKLENDI: 'Belge Yüklendi',
  SILINDI: 'Silindi'
};

export default function SupplierDetailPage() {
  const params = useParams();
  const supplierId = params.id as string;
  const { data: session } = useSession() || {};
  const router = useRouter();
  const [supplier, setSupplier] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');
  
  // Edit mode
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [saving, setSaving] = useState(false);
  
  // Contact dialog
  const [contactOpen, setContactOpen] = useState(false);
  const [contactData, setContactData] = useState({
    name: '',
    title: '',
    department: '',
    phone: '',
    mobile: '',
    email: '',
    isPrimary: false,
    notes: ''
  });
  
  // Supplier Audit (Tedarikçi Denetimi)
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditQuestions, setAuditQuestions] = useState<any[]>([]);
  const [auditAnswers, setAuditAnswers] = useState<Record<string, { answer: string; notes: string }>>({});
  const [auditForm, setAuditForm] = useState({
    auditDate: new Date().toISOString().split('T')[0],
    auditType: 'PERIYODIK',
    auditorId: '',
    notes: '',
    findings: '',
    recommendations: '',
  });
  const [auditFile, setAuditFile] = useState<File | null>(null);
  const [creatingAudit, setCreatingAudit] = useState(false);
  const [supplierAudits, setSupplierAudits] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  // Document upload
  const [docOpen, setDocOpen] = useState(false);
  const [docForm, setDocForm] = useState({
    name: '',
    documentType: 'SERTIFIKA',
    description: '',
    expiryDate: '',
  });
  const [docFile, setDocFile] = useState<File | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [supplierDocuments, setSupplierDocuments] = useState<any[]>([]);

  // Volume (İşlem Hacmi)
  const [volumeData, setVolumeData] = useState<{ totalExpense: number; suppliers: any[] }>({ totalExpense: 0, suppliers: [] });

  // Evaluation dialog
  const [evalOpen, setEvalOpen] = useState(false);
  const [evalData, setEvalData] = useState<{
    periodStart: string;
    periodEnd: string;
    qualityScore: number;
    deliveryScore: number;
    priceScore: number;
    serviceScore: number;
    communicationScore: number;
    competencyScore?: number;
    auditScore?: number;
    totalOrders: number;
    onTimeDeliveries: number;
    qualityIssues: number;
    returns: number;
    strengths: string;
    weaknesses: string;
    improvements: string;
    comments: string;
    recommendation: string;
    actionRequired: boolean;
    actionDescription: string;
  }>({
    periodStart: '',
    periodEnd: '',
    qualityScore: 80,
    deliveryScore: 3,
    priceScore: 3,
    serviceScore: 3,
    communicationScore: 80,
    competencyScore: 3,
    totalOrders: 0,
    onTimeDeliveries: 0,
    qualityIssues: 0,
    returns: 0,
    strengths: '',
    weaknesses: '',
    improvements: '',
    comments: '',
    recommendation: 'DEVAM',
    actionRequired: false,
    actionDescription: ''
  });

  const fetchSupplier = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/suppliers/${supplierId}`);
      const data = await response.json();
      
      if (response.ok) {
        setSupplier(data);
        setEditData(data);
      } else {
        toast.error(data.error || 'Tedarikçi bulunamadı');
        router.push('/dashboard/suppliers');
      }
    } catch (error) {
      console.error('Error fetching supplier:', error);
      toast.error('Tedarikçi yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/supplier-categories');
      const data = await response.json();
      if (response.ok) setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      if (response.ok) setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchAuditQuestions = async () => {
    try {
      const response = await fetch('/api/suppliers/audit-questions');
      const data = await response.json();
      if (response.ok) {
        setAuditQuestions(Array.isArray(data) ? data : []);
        // Cevapları başlat
        const initialAnswers: Record<string, { answer: string; notes: string }> = {};
        (Array.isArray(data) ? data : []).forEach((q: any) => {
          initialAnswers[q.id] = { answer: '', notes: '' };
        });
        setAuditAnswers(initialAnswers);
      }
    } catch (error) {
      console.error('Error fetching audit questions:', error);
    }
  };

  const fetchSupplierAudits = async () => {
    try {
      const response = await fetch(`/api/suppliers/${supplierId}/audits`);
      const data = await response.json();
      if (response.ok) setSupplierAudits(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching supplier audits:', error);
    }
  };

  const fetchSupplierDocuments = async () => {
    try {
      const response = await fetch(`/api/suppliers/${supplierId}/documents`);
      const data = await response.json();
      if (response.ok) setSupplierDocuments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching supplier documents:', error);
    }
  };

  const fetchVolumeData = async () => {
    try {
      const response = await fetch('/api/suppliers/volume');
      const data = await response.json();
      if (response.ok) setVolumeData(data);
    } catch (error) {
      console.error('Error fetching volume data:', error);
    }
  };

  useEffect(() => {
    fetchSupplier();
    fetchCategories();
    fetchUsers();
    fetchAuditQuestions();
    fetchSupplierAudits();
    fetchSupplierDocuments();
    fetchVolumeData();
  }, [supplierId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/suppliers/${supplierId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData)
      });

      if (response.ok) {
        toast.success('Değişiklikler kaydedildi');
        setEditMode(false);
        fetchSupplier();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Kaydetme hatası');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const response = await fetch(`/api/suppliers/${supplierId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        toast.success('Durum güncellendi');
        fetchSupplier();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Durum güncellenemedi');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    }
  };

  // Denetim oluştur
  const handleCreateAudit = async () => {
    if (!auditForm.auditDate || !auditForm.auditType || !auditForm.auditorId) {
      toast.error('Lütfen zorunlu alanları doldurun');
      return;
    }

    // Tüm soruların cevaplanıp cevaplanmadığını kontrol et
    const answeredQuestions = Object.entries(auditAnswers).filter(([, ans]) => ans.answer);
    if (answeredQuestions.length === 0) {
      toast.error('En az bir soruyu cevaplamanız gerekmektedir');
      return;
    }

    try {
      setCreatingAudit(true);

      let evidenceData = {};
      if (auditFile) {
        const presignedResponse = await fetch('/api/upload/presigned', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: auditFile.name,
            contentType: auditFile.type,
            isPublic: false,
          }),
        });

        if (presignedResponse.ok) {
          const { uploadUrl, cloud_storage_path } = await presignedResponse.json();
          await fetch(uploadUrl, { method: 'PUT', body: auditFile });
          evidenceData = {
            evidenceFileName: auditFile.name,
            evidenceFileSize: auditFile.size,
            evidenceCloudPath: cloud_storage_path,
            evidenceIsPublic: false,
          };
        }
      }

      const answers = Object.entries(auditAnswers)
        .filter(([, ans]) => ans.answer)
        .map(([questionId, ans]) => ({
          questionId,
          answer: ans.answer,
          notes: ans.notes || null,
        }));

      const response = await fetch(`/api/suppliers/${supplierId}/audits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...auditForm,
          answers,
          ...evidenceData,
        }),
      });

      if (response.ok) {
        toast.success('Denetim başarıyla oluşturuldu');
        setAuditOpen(false);
        setAuditForm({
          auditDate: new Date().toISOString().split('T')[0],
          auditType: 'PERIYODIK',
          auditorId: '',
          notes: '',
          findings: '',
          recommendations: '',
        });
        setAuditFile(null);
        fetchAuditQuestions();
        fetchSupplierAudits();
        fetchSupplier();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Denetim oluşturulamadı');
      }
    } catch (error) {
      console.error('Audit create error:', error);
      toast.error('Bir hata oluştu');
    } finally {
      setCreatingAudit(false);
    }
  };

  // Belge yükle
  const handleUploadDocument = async () => {
    if (!docForm.name || !docForm.documentType || !docFile) {
      toast.error('Belge adı, türü ve dosya zorunludur');
      return;
    }

    if (docFile.type !== 'application/pdf') {
      toast.error('Yalnızca PDF dosyaları kabul edilmektedir');
      return;
    }

    try {
      setUploadingDoc(true);

      const presignedResponse = await fetch('/api/upload/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: docFile.name,
          contentType: docFile.type,
          isPublic: false,
        }),
      });

      if (!presignedResponse.ok) {
        throw new Error('Presigned URL alınamadı');
      }

      const { uploadUrl, cloud_storage_path } = await presignedResponse.json();
      await fetch(uploadUrl, { method: 'PUT', body: docFile });

      const response = await fetch(`/api/suppliers/${supplierId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...docForm,
          fileName: docFile.name,
          fileSize: docFile.size,
          mimeType: docFile.type,
          cloudStoragePath: cloud_storage_path,
          isPublic: false,
        }),
      });

      if (response.ok) {
        toast.success('Belge başarıyla yüklendi');
        setDocOpen(false);
        setDocForm({ name: '', documentType: 'SERTIFIKA', description: '', expiryDate: '' });
        setDocFile(null);
        fetchSupplierDocuments();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Belge yüklenemedi');
      }
    } catch (error) {
      console.error('Document upload error:', error);
      toast.error('Bir hata oluştu');
    } finally {
      setUploadingDoc(false);
    }
  };

  // Belge sil
  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Bu belgeyi silmek istediğinizden emin misiniz?')) return;

    try {
      const response = await fetch(`/api/suppliers/${supplierId}/documents?documentId=${documentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Belge silindi');
        fetchSupplierDocuments();
      } else {
        toast.error('Belge silinemedi');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    }
  };

  const handleAddContact = async () => {
    if (!contactData.name) {
      toast.error('İletişim kişisi adı zorunludur');
      return;
    }

    try {
      const response = await fetch(`/api/suppliers/${supplierId}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactData)
      });

      if (response.ok) {
        toast.success('İletişim kişisi eklendi');
        setContactOpen(false);
        setContactData({
          name: '',
          title: '',
          department: '',
          phone: '',
          mobile: '',
          email: '',
          isPrimary: false,
          notes: ''
        });
        fetchSupplier();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Eklenemedi');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    }
  };

  const handleAddEvaluation = async () => {
    if (!evalData.periodStart || !evalData.periodEnd) {
      toast.error('Değerlendirme dönemi zorunludur');
      return;
    }

    try {
      const response = await fetch(`/api/suppliers/${supplierId}/evaluations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(evalData)
      });

      if (response.ok) {
        toast.success('Değerlendirme kaydedildi');
        setEvalOpen(false);
        setEvalData({
          periodStart: '',
          periodEnd: '',
          qualityScore: 80,
          deliveryScore: 80,
          priceScore: 80,
          serviceScore: 80,
          communicationScore: 80,
          totalOrders: 0,
          onTimeDeliveries: 0,
          qualityIssues: 0,
          returns: 0,
          strengths: '',
          weaknesses: '',
          improvements: '',
          comments: '',
          recommendation: 'DEVAM',
          actionRequired: false,
          actionDescription: ''
        });
        fetchSupplier();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Kaydedilemedi');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('tr-TR');
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <p>Yükleniyor...</p>
      </div>
    );
  }

  if (!supplier) return null;

  const calculateTotalScore = () => {
    const { qualityScore, deliveryScore, priceScore, serviceScore, communicationScore } = evalData;
    return (qualityScore * 30 + deliveryScore * 25 + priceScore * 20 + serviceScore * 15 + communicationScore * 10) / 100;
  };

  const getRating = (score: number) => {
    if (score >= 85) return 'A';
    if (score >= 70) return 'B';
    if (score >= 50) return 'C';
    return 'D';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/suppliers')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{supplier.name}</h1>
              {supplier.isCritical && (
                <Badge variant="destructive">Kritik</Badge>
              )}
            </div>
            <p className="text-muted-foreground font-mono">{supplier.code}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={STATUS_COLORS[supplier.status]}>
            {STATUS_LABELS[supplier.status]}
          </Badge>
          {supplier.currentRating && (
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${RATING_COLORS[supplier.currentRating]}`}>
              {supplier.currentRating}
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ortalama Puan</p>
                <p className="text-2xl font-bold">
                  {supplier.averageScore ? supplier.averageScore.toFixed(1) : '-'}
                </p>
              </div>
              <Star className="w-8 h-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Değerlendirme</p>
                <p className="text-2xl font-bold">{supplier._count?.evaluations || 0}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">İletişim Kişisi</p>
                <p className="text-2xl font-bold">{supplier._count?.contacts || 0}</p>
              </div>
              <Users className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Belge</p>
                <p className="text-2xl font-bold">{supplier._count?.documents || 0}</p>
              </div>
              <FileText className="w-8 h-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="details">Detaylar</TabsTrigger>
          <TabsTrigger value="scoring">Puanlama & Sınıf</TabsTrigger>
          <TabsTrigger value="expenses">Harcamalar ({supplier.expenses?.length || 0})</TabsTrigger>
          <TabsTrigger value="contacts">İletişim ({supplier.contacts?.length || 0})</TabsTrigger>
          <TabsTrigger value="evaluations">Değerlendirmeler ({supplier.evaluations?.length || 0})</TabsTrigger>
          <TabsTrigger value="audits">Denetimler ({supplier.audits?.length || 0})</TabsTrigger>
          <TabsTrigger value="documents">Belgeler ({supplier.documents?.length || 0})</TabsTrigger>
          <TabsTrigger value="history">Geçmiş</TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Tedarikçi Bilgileri</CardTitle>
              <div className="flex gap-2">
                {editMode ? (
                  <>
                    <Button variant="outline" onClick={() => setEditMode(false)}>İptal</Button>
                    <Button onClick={handleSave} disabled={saving}>
                      {saving ? 'Kaydediliyor...' : 'Kaydet'}
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" onClick={() => setEditMode(true)}>
                    <Edit2 className="w-4 h-4 mr-2" /> Düzenle
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Info */}
              <div>
                <h4 className="font-medium mb-3">Temel Bilgiler</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Tedarikçi Adı</Label>
                    {editMode ? (
                      <Input
                        value={editData.name || ''}
                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                      />
                    ) : (
                      <p className="font-medium">{supplier.name}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Ticaret Unvanı</Label>
                    {editMode ? (
                      <Input
                        value={editData.tradeName || ''}
                        onChange={(e) => setEditData({ ...editData, tradeName: e.target.value })}
                      />
                    ) : (
                      <p className="font-medium">{supplier.tradeName || '-'}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Vergi No</Label>
                    {editMode ? (
                      <Input
                        value={editData.taxNumber || ''}
                        onChange={(e) => setEditData({ ...editData, taxNumber: e.target.value })}
                      />
                    ) : (
                      <p className="font-medium">{supplier.taxNumber || '-'}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Vergi Dairesi</Label>
                    {editMode ? (
                      <Input
                        value={editData.taxOffice || ''}
                        onChange={(e) => setEditData({ ...editData, taxOffice: e.target.value })}
                      />
                    ) : (
                      <p className="font-medium">{supplier.taxOffice || '-'}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Tedarikçi Tipi</Label>
                    {editMode ? (
                      <Select
                        value={editData.supplierType}
                        onValueChange={(value) => setEditData({ ...editData, supplierType: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(TYPE_LABELS).map(([key, label]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="font-medium">{TYPE_LABELS[supplier.supplierType]}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Kategori</Label>
                    {editMode ? (
                      <Select
                        value={editData.categoryId || ''}
                        onValueChange={(value) => setEditData({ ...editData, categoryId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="font-medium">{supplier.category?.name || '-'}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div>
                <h4 className="font-medium mb-3">İletişim Bilgileri</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Telefon</Label>
                    {editMode ? (
                      <Input
                        value={editData.phone || ''}
                        onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                      />
                    ) : (
                      <p className="font-medium flex items-center gap-2">
                        {supplier.phone ? (
                          <><Phone className="w-4 h-4" /> {supplier.phone}</>
                        ) : '-'}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-muted-foreground">E-posta</Label>
                    {editMode ? (
                      <Input
                        value={editData.email || ''}
                        onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                      />
                    ) : (
                      <p className="font-medium flex items-center gap-2">
                        {supplier.email ? (
                          <><Mail className="w-4 h-4" /> {supplier.email}</>
                        ) : '-'}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Website</Label>
                    {editMode ? (
                      <Input
                        value={editData.website || ''}
                        onChange={(e) => setEditData({ ...editData, website: e.target.value })}
                      />
                    ) : (
                      <p className="font-medium flex items-center gap-2">
                        {supplier.website ? (
                          <><Globe className="w-4 h-4" /> {supplier.website}</>
                        ) : '-'}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Şehir</Label>
                    {editMode ? (
                      <Input
                        value={editData.city || ''}
                        onChange={(e) => setEditData({ ...editData, city: e.target.value })}
                      />
                    ) : (
                      <p className="font-medium flex items-center gap-2">
                        {supplier.city ? (
                          <><MapPin className="w-4 h-4" /> {supplier.city}</>
                        ) : '-'}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-4">
                  <Label className="text-muted-foreground">Adres</Label>
                  {editMode ? (
                    <Textarea
                      value={editData.address || ''}
                      onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                      rows={2}
                    />
                  ) : (
                    <p className="font-medium">{supplier.address || '-'}</p>
                  )}
                </div>
              </div>

              {/* Evaluation Settings */}
              <div>
                <h4 className="font-medium mb-3">Değerlendirme Ayarları</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Değerlendirme Periyodu</Label>
                    {editMode ? (
                      <Select
                        value={editData.evaluationPeriod}
                        onValueChange={(value) => setEditData({ ...editData, evaluationPeriod: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(EVALUATION_PERIODS).map(([key, label]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="font-medium">{EVALUATION_PERIODS[supplier.evaluationPeriod]}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Son Değerlendirme</Label>
                    <p className="font-medium">{formatDate(supplier.lastEvaluationDate)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Sonraki Değerlendirme</Label>
                    <p className="font-medium">{formatDate(supplier.nextEvaluationDate)}</p>
                  </div>
                </div>
              </div>

              {/* Certificates */}
              <div>
                <h4 className="font-medium mb-3">Sertifikalar</h4>
                {/* Özel Sertifikalar */}
                <div className="mb-3">
                  <p className="text-sm text-muted-foreground mb-2">Özel Sertifikalar:</p>
                  <div className="flex flex-wrap gap-2">
                    {supplier.certTarimOrman && <Badge className="bg-green-100 text-green-800">Tarım ve Orman Bak. İşletme Kayıt</Badge>}
                    {supplier.certFSC && <Badge className="bg-green-100 text-green-800">FSC</Badge>}
                    {supplier.organic && <Badge className="bg-green-100 text-green-800">Organik Ürün</Badge>}
                    {supplier.certFairTrade && <Badge className="bg-green-100 text-green-800">Fair Trade</Badge>}
                    {supplier.certIFS && <Badge className="bg-green-100 text-green-800">IFS</Badge>}
                    {supplier.certBRC && <Badge className="bg-green-100 text-green-800">BRC</Badge>}
                    {!supplier.certTarimOrman && !supplier.certFSC && !supplier.organic && 
                     !supplier.certFairTrade && !supplier.certIFS && !supplier.certBRC && (
                      <span className="text-muted-foreground text-sm">Özel sertifika yok</span>
                    )}
                  </div>
                </div>
                {/* Diğer Sertifikalar */}
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Diğer Sertifikalar:</p>
                  <div className="flex flex-wrap gap-2">
                    {supplier.isoQuality && <Badge variant="outline">ISO 9001</Badge>}
                    {supplier.isoEnvironment && <Badge variant="outline">ISO 14001</Badge>}
                    {supplier.isoSafety && <Badge variant="outline">ISO 45001</Badge>}
                    {supplier.isoFood && <Badge variant="outline">ISO 22000</Badge>}
                    {supplier.haccp && <Badge variant="outline">HACCP</Badge>}
                    {supplier.tse && <Badge variant="outline">TSE</Badge>}
                    {supplier.ce && <Badge variant="outline">CE</Badge>}
                    {supplier.halal && <Badge variant="outline">Helal</Badge>}
                    {supplier.kosher && <Badge variant="outline">Koşer</Badge>}
                    {supplier.gmp && <Badge variant="outline">GMP</Badge>}
                    {supplier.otherCertificates && <Badge variant="outline">{supplier.otherCertificates}</Badge>}
                  </div>
                </div>
              </div>

              {/* Distance Info */}
              <div>
                <h4 className="font-medium mb-3">Mesafe Bilgileri</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Otele Mesafe:</span>
                    <span className="ml-2">{supplier.distanceToHotel ? `${supplier.distanceToHotel} km` : '-'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Mesafe Notları:</span>
                    <span className="ml-2">{supplier.distanceNotes || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Purchase/Order Info */}
              <div>
                <h4 className="font-medium mb-3">Sipariş ve Alışveriş Bilgileri</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Alışveriş Sıklığı:</span>
                    <span className="ml-2">{PURCHASE_FREQUENCIES[supplier.purchaseFrequency as keyof typeof PURCHASE_FREQUENCIES] || supplier.purchaseFrequency || '-'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Ödeme Vadesi:</span>
                    <span className="ml-2">{supplier.paymentTerms || '-'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Teslim Süresi:</span>
                    <span className="ml-2">{supplier.leadTime ? `${supplier.leadTime} gün` : '-'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Min. Sipariş:</span>
                    <span className="ml-2">{supplier.minimumOrderQuantity || '-'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Teslimat Şartları:</span>
                    <span className="ml-2">{supplier.deliveryTerms || '-'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Toplam Sipariş:</span>
                    <span className="ml-2">{supplier.totalOrders || 0}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Son Sipariş:</span>
                    <span className="ml-2">
                      {supplier.lastOrderDate ? new Date(supplier.lastOrderDate).toLocaleDateString('tr-TR') : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Toplam Tutar:</span>
                    <span className="ml-2">
                      {supplier.totalOrderAmount ? `${supplier.totalOrderAmount.toLocaleString('tr-TR')} ₺` : '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Actions */}
              <div>
                <h4 className="font-medium mb-3">Durum İşlemleri</h4>
                <div className="flex flex-wrap gap-2">
                  {supplier.status !== 'ONAYLANDI' && (
                    <Button size="sm" variant="outline" onClick={() => handleStatusChange('ONAYLANDI')}>
                      <CheckCircle className="w-4 h-4 mr-2" /> Onayla
                    </Button>
                  )}
                  {supplier.status !== 'ASKIYA_ALINDI' && (
                    <Button size="sm" variant="outline" onClick={() => handleStatusChange('ASKIYA_ALINDI')}>
                      <AlertTriangle className="w-4 h-4 mr-2" /> Askıya Al
                    </Button>
                  )}
                  {supplier.status !== 'KARA_LISTE' && (
                    <Button size="sm" variant="destructive" onClick={() => handleStatusChange('KARA_LISTE')}>
                      Kara Listeye Al
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scoring Tab */}
        <TabsContent value="scoring" className="space-y-4">
          {/* Grade Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Tedarikçi Sınıfı ve Puanı</span>
                {supplier.supplierGrade && (
                  <Badge className={
                    supplier.supplierGrade === 'A' ? 'bg-green-500 text-white text-lg px-4 py-1' :
                    supplier.supplierGrade === 'B' ? 'bg-blue-500 text-white text-lg px-4 py-1' :
                    'bg-yellow-500 text-white text-lg px-4 py-1'
                  }>
                    {supplier.supplierGrade} Sınıfı
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Satın Alma Puanı</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {supplier.purchasingTotalScore?.toFixed(1) || '-'}
                  </p>
                  <p className="text-xs text-muted-foreground">/ 100</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Denetim Puanı</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {supplier.auditScore?.toFixed(1) || '-'}
                  </p>
                  <p className="text-xs text-muted-foreground">/ 100</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Genel Puan</p>
                  <p className="text-3xl font-bold text-green-600">
                    {supplier.overallScore?.toFixed(1) || '-'}
                  </p>
                  <p className="text-xs text-muted-foreground">/ 100</p>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">Sınıf Açıklamaları</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-500 text-white">A</Badge>
                    <span>80+ puan - As tedarikçiler</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-blue-500 text-white">B</Badge>
                    <span>60-79 puan - Yedek tedarikçiler</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-yellow-500 text-white">C</Badge>
                    <span>60 altı - Zorunlu kaldıkça</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Purchasing Evaluation Form */}
          <Card>
            <CardHeader>
              <CardTitle>Satın Alma Değerlendirmesi</CardTitle>
              <p className="text-sm text-muted-foreground">Her kriter 1-5 arası puanlanır. Toplam max 20 puan, 100'e normalize edilir.</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div className="space-y-2">
                  <Label>Fiyat (1-5)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="5"
                    value={evalData.priceScore || supplier.purchasingPriceScore || 3}
                    onChange={(e) => setEvalData({ ...evalData, priceScore: parseInt(e.target.value) || 3 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hizmet Performansı (1-5)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="5"
                    value={evalData.serviceScore || supplier.purchasingServiceScore || 3}
                    onChange={(e) => setEvalData({ ...evalData, serviceScore: parseInt(e.target.value) || 3 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sevkiyat (1-5)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="5"
                    value={evalData.deliveryScore || supplier.purchasingDeliveryScore || 3}
                    onChange={(e) => setEvalData({ ...evalData, deliveryScore: parseInt(e.target.value) || 3 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Yeterlilik (1-5)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="5"
                    value={evalData.competencyScore || supplier.purchasingCompetencyScore || 3}
                    onChange={(e) => setEvalData({ ...evalData, competencyScore: parseInt(e.target.value) || 3 })}
                  />
                </div>
              </div>
              <Button onClick={async () => {
                try {
                  const response = await fetch(`/api/suppliers/${supplierId}/purchasing-evaluation`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      priceScore: evalData.priceScore || supplier.purchasingPriceScore || 3,
                      serviceScore: evalData.serviceScore || supplier.purchasingServiceScore || 3,
                      deliveryScore: evalData.deliveryScore || supplier.purchasingDeliveryScore || 3,
                      competencyScore: evalData.competencyScore || supplier.purchasingCompetencyScore || 3
                    })
                  });
                  if (response.ok) {
                    toast.success('Satın alma değerlendirmesi kaydedildi');
                    fetchSupplier();
                  } else {
                    const error = await response.json();
                    toast.error(error.error || 'Kaydetme hatası');
                  }
                } catch (error) {
                  toast.error('Bir hata oluştu');
                }
              }}>
                Satın Alma Değerlendirmesini Kaydet
              </Button>
              {supplier.purchasingEvaluationDate && (
                <p className="text-sm text-muted-foreground mt-2">
                  Son değerlendirme: {new Date(supplier.purchasingEvaluationDate).toLocaleDateString('tr-TR')}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Audit Evaluation */}
          <Card>
            <CardHeader>
              <CardTitle>Denetim Değerlendirmesi</CardTitle>
              <p className="text-sm text-muted-foreground">20 soru, her soru 5 puan, toplam max 100 puan.</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Denetim Puanı (0-100)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={evalData.auditScore !== undefined ? evalData.auditScore : supplier.auditScore || ''}
                    onChange={(e) => setEvalData({ ...evalData, auditScore: parseFloat(e.target.value) || 0 })}
                    placeholder="0-100 arası puan girin"
                  />
                </div>
                <Button onClick={async () => {
                  const score = evalData.auditScore !== undefined ? evalData.auditScore : supplier.auditScore;
                  if (score === undefined || score === null) {
                    toast.error('Lütfen denetim puanı girin');
                    return;
                  }
                  try {
                    const response = await fetch(`/api/suppliers/${supplierId}/audit-evaluation`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ auditScore: score })
                    });
                    if (response.ok) {
                      toast.success('Denetim değerlendirmesi kaydedildi');
                      fetchSupplier();
                    } else {
                      const error = await response.json();
                      toast.error(error.error || 'Kaydetme hatası');
                    }
                  } catch (error) {
                    toast.error('Bir hata oluştu');
                  }
                }}>
                  Denetim Değerlendirmesini Kaydet
                </Button>
                {supplier.auditEvaluationDate && (
                  <p className="text-sm text-muted-foreground">
                    Son değerlendirme: {new Date(supplier.auditEvaluationDate).toLocaleDateString('tr-TR')}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Contract Status */}
          <Card>
            <CardHeader>
              <CardTitle>Sözleşme Durumu</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Badge className={
                  supplier.contractStatus === 'MEVCUT' ? 'bg-green-100 text-green-800' :
                  supplier.contractStatus === 'BEKLENIYOR' ? 'bg-orange-100 text-orange-800' :
                  'bg-gray-100 text-gray-600'
                }>
                  {supplier.contractStatus === 'MEVCUT' ? 'Sözleşme Mevcut' :
                   supplier.contractStatus === 'BEKLENIYOR' ? 'Sözleşme Bekleniyor' : 'Sözleşme Yok'}
                </Badge>
                {supplier.contractUploadDate && (
                  <span className="text-sm text-muted-foreground">
                    Yüklenme: {new Date(supplier.contractUploadDate).toLocaleDateString('tr-TR')}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Sözleşme yüklemek için Belgeler sekmesini kullanın.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses">
          <div className="space-y-6">
            {/* İşlem Hacmi Yüzde Payı */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  İşlem Hacmi Payı
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const currentSupplierVolume = volumeData.suppliers.find(s => s.id === supplierId);
                  const percentage = currentSupplierVolume?.percentage || 0;
                  
                  return (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-3xl font-bold text-blue-600">%{percentage.toFixed(1)}</p>
                          <p className="text-sm text-muted-foreground">Toplam işlem hacmi içindeki pay</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold">
                            {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(currentSupplierVolume?.amount || 0)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            / {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(volumeData.totalExpense)}
                          </p>
                        </div>
                      </div>
                      <Progress value={percentage} className="h-3" />
                      
                      {/* Diğer tedarikçilerle karşılaştırma */}
                      {volumeData.suppliers.length > 0 && (
                        <div className="mt-4 border-t pt-4">
                          <h4 className="text-sm font-medium mb-3">Tüm Tedarikçiler İşlem Hacmi</h4>
                          <div className="space-y-2">
                            {volumeData.suppliers.slice(0, 10).map((s: any, idx: number) => (
                              <div key={s.id} className={`flex items-center justify-between p-2 rounded ${s.id === supplierId ? 'bg-blue-50 border border-blue-200' : 'bg-muted/30'}`}>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium w-6">{idx + 1}.</span>
                                  <span className={`text-sm ${s.id === supplierId ? 'font-bold' : ''}`}>{s.name}</span>
                                  {s.id === supplierId && <Badge className="bg-blue-100 text-blue-800 text-xs">Bu Tedarikçi</Badge>}
                                </div>
                                <span className="font-medium text-sm">%{s.percentage.toFixed(1)}</span>
                              </div>
                            ))}
                            {volumeData.suppliers.length > 10 && (
                              <p className="text-sm text-muted-foreground text-center">
                                ve {volumeData.suppliers.length - 10} tedarikçi daha...
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Harcama Detayları */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Harcama Detayları</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Toplam: <span className="font-bold">
                      {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(supplier.totalExpense || supplier.totalOrderAmount || 0)}
                    </span>
                  </p>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-2" /> Harcama Ekle
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Yeni Harcama Ekle</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Tarih *</Label>
                        <Input
                          type="date"
                          id="expense-date"
                          defaultValue={new Date().toISOString().split('T')[0]}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Tutar (TRY) *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          id="expense-amount"
                          placeholder="0.00"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Fatura No</Label>
                        <Input
                          id="expense-invoice"
                          placeholder="Fatura numarası"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Açıklama</Label>
                        <Textarea
                          id="expense-description"
                          placeholder="Harcama açıklaması"
                          rows={2}
                        />
                      </div>
                      <Button onClick={async () => {
                        const dateEl = document.getElementById('expense-date') as HTMLInputElement;
                        const amountEl = document.getElementById('expense-amount') as HTMLInputElement;
                        const invoiceEl = document.getElementById('expense-invoice') as HTMLInputElement;
                        const descEl = document.getElementById('expense-description') as HTMLTextAreaElement;
                        
                        if (!dateEl.value || !amountEl.value) {
                          toast.error('Tarih ve tutar zorunludur');
                          return;
                        }
                        
                        try {
                          const response = await fetch(`/api/suppliers/${supplierId}/expenses`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              date: dateEl.value,
                              amount: amountEl.value,
                              invoiceNo: invoiceEl.value,
                              description: descEl.value
                            })
                          });
                          if (response.ok) {
                            toast.success('Harcama eklendi');
                            fetchSupplier();
                            fetchVolumeData();
                            // Reset form
                            amountEl.value = '';
                            invoiceEl.value = '';
                            descEl.value = '';
                          } else {
                            const error = await response.json();
                            toast.error(error.error || 'Ekleme hatası');
                          }
                        } catch (error) {
                          toast.error('Bir hata oluştu');
                        }
                      }} className="w-full">
                        Harcama Ekle
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {supplier.expenses?.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Henüz harcama kaydı yok</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tarih</TableHead>
                        <TableHead>Fatura No</TableHead>
                        <TableHead>Açıklama</TableHead>
                        <TableHead className="text-right">Tutar</TableHead>
                        <TableHead>Ekleyen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {supplier.expenses?.map((expense: any) => (
                        <TableRow key={expense.id}>
                          <TableCell>{new Date(expense.date).toLocaleDateString('tr-TR')}</TableCell>
                          <TableCell>{expense.invoiceNo || '-'}</TableCell>
                          <TableCell>{expense.description || '-'}</TableCell>
                          <TableCell className="text-right font-medium">
                            {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: expense.currency || 'TRY' }).format(expense.amount)}
                          </TableCell>
                          <TableCell>
                            {expense.createdBy?.name} {expense.createdBy?.surname}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Contacts Tab */}
        <TabsContent value="contacts">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>İletişim Kişileri</CardTitle>
              <Dialog open={contactOpen} onOpenChange={setContactOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-2" /> Yeni Kişi
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Yeni İletişim Kişisi</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Ad Soyad *</Label>
                        <Input
                          value={contactData.name}
                          onChange={(e) => setContactData({ ...contactData, name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Ünvan</Label>
                        <Input
                          value={contactData.title}
                          onChange={(e) => setContactData({ ...contactData, title: e.target.value })}
                          placeholder="Örn: Satış Müdürü"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Telefon</Label>
                        <Input
                          value={contactData.phone}
                          onChange={(e) => setContactData({ ...contactData, phone: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Cep Telefonu</Label>
                        <Input
                          value={contactData.mobile}
                          onChange={(e) => setContactData({ ...contactData, mobile: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>E-posta</Label>
                      <Input
                        type="email"
                        value={contactData.email}
                        onChange={(e) => setContactData({ ...contactData, email: e.target.value })}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="isPrimary"
                        checked={contactData.isPrimary}
                        onCheckedChange={(checked) => setContactData({ ...contactData, isPrimary: !!checked })}
                      />
                      <Label htmlFor="isPrimary" className="font-normal">Birincil İletişim Kişisi</Label>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setContactOpen(false)}>İptal</Button>
                      <Button onClick={handleAddContact}>Ekle</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {supplier.contacts?.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">İletişim kişisi bulunmuyor</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ad Soyad</TableHead>
                      <TableHead>Ünvan</TableHead>
                      <TableHead>Telefon</TableHead>
                      <TableHead>E-posta</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supplier.contacts?.map((contact: any) => (
                      <TableRow key={contact.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {contact.name}
                            {contact.isPrimary && <Badge variant="secondary">Birincil</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>{contact.title || '-'}</TableCell>
                        <TableCell>{contact.phone || contact.mobile || '-'}</TableCell>
                        <TableCell>{contact.email || '-'}</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Evaluations Tab */}
        <TabsContent value="evaluations">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Değerlendirmeler</CardTitle>
              <Dialog open={evalOpen} onOpenChange={setEvalOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-2" /> Yeni Değerlendirme
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Yeni Tedarikçi Değerlendirmesi</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Dönem Başlangıç *</Label>
                        <Input
                          type="date"
                          value={evalData.periodStart}
                          onChange={(e) => setEvalData({ ...evalData, periodStart: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Dönem Bitiş *</Label>
                        <Input
                          type="date"
                          value={evalData.periodEnd}
                          onChange={(e) => setEvalData({ ...evalData, periodEnd: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-medium">Puanlama (0-100)</h4>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <Label>Kalite (%30)</Label>
                          <span className="font-medium">{evalData.qualityScore}</span>
                        </div>
                        <Input
                          type="range"
                          min="0"
                          max="100"
                          value={evalData.qualityScore}
                          onChange={(e) => setEvalData({ ...evalData, qualityScore: Number(e.target.value) })}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <Label>Teslimat (%25)</Label>
                          <span className="font-medium">{evalData.deliveryScore}</span>
                        </div>
                        <Input
                          type="range"
                          min="0"
                          max="100"
                          value={evalData.deliveryScore}
                          onChange={(e) => setEvalData({ ...evalData, deliveryScore: Number(e.target.value) })}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <Label>Fiyat (%20)</Label>
                          <span className="font-medium">{evalData.priceScore}</span>
                        </div>
                        <Input
                          type="range"
                          min="0"
                          max="100"
                          value={evalData.priceScore}
                          onChange={(e) => setEvalData({ ...evalData, priceScore: Number(e.target.value) })}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <Label>Hizmet (%15)</Label>
                          <span className="font-medium">{evalData.serviceScore}</span>
                        </div>
                        <Input
                          type="range"
                          min="0"
                          max="100"
                          value={evalData.serviceScore}
                          onChange={(e) => setEvalData({ ...evalData, serviceScore: Number(e.target.value) })}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <Label>İletişim (%10)</Label>
                          <span className="font-medium">{evalData.communicationScore}</span>
                        </div>
                        <Input
                          type="range"
                          min="0"
                          max="100"
                          value={evalData.communicationScore}
                          onChange={(e) => setEvalData({ ...evalData, communicationScore: Number(e.target.value) })}
                        />
                      </div>

                      <div className="p-4 bg-muted rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Toplam Puan:</span>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold">{calculateTotalScore().toFixed(1)}</span>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${RATING_COLORS[getRating(calculateTotalScore())]}`}>
                              {getRating(calculateTotalScore())}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Güçlü Yönler</Label>
                      <Textarea
                        value={evalData.strengths}
                        onChange={(e) => setEvalData({ ...evalData, strengths: e.target.value })}
                        rows={2}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Zayıf Yönler</Label>
                      <Textarea
                        value={evalData.weaknesses}
                        onChange={(e) => setEvalData({ ...evalData, weaknesses: e.target.value })}
                        rows={2}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>İyileştirme Önerileri</Label>
                      <Textarea
                        value={evalData.improvements}
                        onChange={(e) => setEvalData({ ...evalData, improvements: e.target.value })}
                        rows={2}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Öneri</Label>
                      <Select
                        value={evalData.recommendation}
                        onValueChange={(value) => setEvalData({ ...evalData, recommendation: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DEVAM">Devam Et</SelectItem>
                          <SelectItem value="GELISTIR">Geliştir</SelectItem>
                          <SelectItem value="ASKIYA_AL">Askıya Al</SelectItem>
                          <SelectItem value="SONLANDIR">Sonlandır</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setEvalOpen(false)}>İptal</Button>
                      <Button onClick={handleAddEvaluation}>Kaydet</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {supplier.evaluations?.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Değerlendirme bulunmuyor</p>
              ) : (
                <div className="space-y-4">
                  {supplier.evaluations?.map((evaluation: any) => (
                    <Card key={evaluation.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <p className="font-mono text-sm text-muted-foreground">{evaluation.code}</p>
                            <p className="font-medium">
                              {formatDate(evaluation.periodStart)} - {formatDate(evaluation.periodEnd)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold">{evaluation.totalScore.toFixed(1)}</span>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${RATING_COLORS[evaluation.rating]}`}>
                              {evaluation.rating}
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-5 gap-2 mb-4">
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Kalite</p>
                            <Progress value={evaluation.qualityScore} className="h-2 mt-1" />
                            <p className="text-sm font-medium">{evaluation.qualityScore}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Teslimat</p>
                            <Progress value={evaluation.deliveryScore} className="h-2 mt-1" />
                            <p className="text-sm font-medium">{evaluation.deliveryScore}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Fiyat</p>
                            <Progress value={evaluation.priceScore} className="h-2 mt-1" />
                            <p className="text-sm font-medium">{evaluation.priceScore}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Hizmet</p>
                            <Progress value={evaluation.serviceScore} className="h-2 mt-1" />
                            <p className="text-sm font-medium">{evaluation.serviceScore}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">İletişim</p>
                            <Progress value={evaluation.communicationScore} className="h-2 mt-1" />
                            <p className="text-sm font-medium">{evaluation.communicationScore}</p>
                          </div>
                        </div>
                        
                        <div className="text-sm text-muted-foreground">
                          Değerlendiren: {evaluation.evaluatedBy?.name} {evaluation.evaluatedBy?.surname} • {formatDate(evaluation.evaluationDate)}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audits Tab - Inline Denetim */}
        <TabsContent value="audits">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5" />
                Tedarikçi Denetimleri
              </CardTitle>
              <Dialog open={auditOpen} onOpenChange={setAuditOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Yeni Denetim Oluştur
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Tedarikçi Denetimi</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6 py-4">
                    {/* Adım 1: Denetim Bilgileri */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-lg border-b pb-2">1. Denetim Bilgileri</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Denetim Tarihi *</Label>
                          <Input
                            type="date"
                            value={auditForm.auditDate}
                            onChange={(e) => setAuditForm({ ...auditForm, auditDate: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Denetçi *</Label>
                          <Select
                            value={auditForm.auditorId}
                            onValueChange={(value) => setAuditForm({ ...auditForm, auditorId: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Denetçi seçin" />
                            </SelectTrigger>
                            <SelectContent>
                              {users.map((user) => (
                                <SelectItem key={user.id} value={user.id}>
                                  {user.name} {user.surname}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Denetim Türü *</Label>
                          <Select
                            value={auditForm.auditType}
                            onValueChange={(value) => setAuditForm({ ...auditForm, auditType: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ON_YETERLILIK">Ön Yeterlilik</SelectItem>
                              <SelectItem value="PERIYODIK">Periyodik</SelectItem>
                              <SelectItem value="ANI">Ani</SelectItem>
                              <SelectItem value="BELGE_DENETIM">Belge Denetimi</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Açıklama / Not</Label>
                          <Input
                            value={auditForm.notes}
                            onChange={(e) => setAuditForm({ ...auditForm, notes: e.target.value })}
                            placeholder="Opsiyonel"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Adım 2: Checklist */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-lg border-b pb-2">2. Denetim Checklist</h4>
                      <p className="text-sm text-muted-foreground">Her soru için Evet / Hayır / Uygulanamaz seçeneğini işaretleyin</p>
                      <div className="space-y-3 max-h-[400px] overflow-y-auto border rounded-lg p-4">
                        {auditQuestions.map((question, index) => (
                          <div key={question.id} className="p-3 border rounded-lg bg-muted/30">
                            <div className="flex items-start gap-4">
                              <span className="font-medium text-sm w-6">{index + 1}.</span>
                              <div className="flex-1">
                                <p className="font-medium text-sm mb-2">{question.question}</p>
                                <div className="flex flex-wrap gap-4 mb-2">
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="radio"
                                      name={`answer-${question.id}`}
                                      checked={auditAnswers[question.id]?.answer === 'EVET'}
                                      onChange={() => setAuditAnswers({
                                        ...auditAnswers,
                                        [question.id]: { ...auditAnswers[question.id], answer: 'EVET' }
                                      })}
                                      className="w-4 h-4 text-green-600"
                                    />
                                    <span className="text-sm text-green-700">Evet (+5 puan)</span>
                                  </label>
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="radio"
                                      name={`answer-${question.id}`}
                                      checked={auditAnswers[question.id]?.answer === 'HAYIR'}
                                      onChange={() => setAuditAnswers({
                                        ...auditAnswers,
                                        [question.id]: { ...auditAnswers[question.id], answer: 'HAYIR' }
                                      })}
                                      className="w-4 h-4 text-red-600"
                                    />
                                    <span className="text-sm text-red-700">Hayır (0 puan)</span>
                                  </label>
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="radio"
                                      name={`answer-${question.id}`}
                                      checked={auditAnswers[question.id]?.answer === 'UYGULANAMAZ'}
                                      onChange={() => setAuditAnswers({
                                        ...auditAnswers,
                                        [question.id]: { ...auditAnswers[question.id], answer: 'UYGULANAMAZ' }
                                      })}
                                      className="w-4 h-4 text-gray-600"
                                    />
                                    <span className="text-sm text-gray-600">Uygulanamaz</span>
                                  </label>
                                </div>
                                <Input
                                  placeholder="Not ekle (opsiyonel)"
                                  className="text-sm h-8"
                                  value={auditAnswers[question.id]?.notes || ''}
                                  onChange={(e) => setAuditAnswers({
                                    ...auditAnswers,
                                    [question.id]: { ...auditAnswers[question.id], notes: e.target.value }
                                  })}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Adım 3: Puanlama Özeti */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-lg border-b pb-2">3. Puanlama & Sonuç</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <Card>
                          <CardContent className="pt-4 text-center">
                            <div className="text-2xl font-bold text-green-600">
                              {Object.values(auditAnswers).filter(a => a.answer === 'EVET').length * 5}
                            </div>
                            <p className="text-sm text-muted-foreground">Toplam Puan</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-4 text-center">
                            <div className="text-2xl font-bold text-blue-600">
                              {Object.values(auditAnswers).filter(a => a.answer === 'EVET' || a.answer === 'HAYIR').length * 5}
                            </div>
                            <p className="text-sm text-muted-foreground">Maksimum Puan</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-4 text-center">
                            <div className="text-2xl font-bold">
                              {(() => {
                                const totalYes = Object.values(auditAnswers).filter(a => a.answer === 'EVET').length * 5;
                                const maxPossible = Object.values(auditAnswers).filter(a => a.answer === 'EVET' || a.answer === 'HAYIR').length * 5;
                                return maxPossible > 0 ? ((totalYes / maxPossible) * 100).toFixed(1) : '0';
                              })()}%
                            </div>
                            <p className="text-sm text-muted-foreground">Yüzde</p>
                          </CardContent>
                        </Card>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Genel Bulgular</Label>
                          <Textarea
                            value={auditForm.findings}
                            onChange={(e) => setAuditForm({ ...auditForm, findings: e.target.value })}
                            placeholder="Denetimde tespit edilen bulgular..."
                            rows={3}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Öneriler</Label>
                          <Textarea
                            value={auditForm.recommendations}
                            onChange={(e) => setAuditForm({ ...auditForm, recommendations: e.target.value })}
                            placeholder="İyileştirme önerileri..."
                            rows={3}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Kanıt Dokümanı (Opsiyonel)</Label>
                        <Input
                          type="file"
                          accept=".pdf,image/*"
                          onChange={(e) => setAuditFile(e.target.files?.[0] || null)}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t">
                      <Button variant="outline" onClick={() => setAuditOpen(false)}>İptal</Button>
                      <Button onClick={handleCreateAudit} disabled={creatingAudit}>
                        {creatingAudit ? 'Kaydediliyor...' : 'Denetimi Kaydet'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {supplierAudits.length === 0 ? (
                <div className="text-center py-8">
                  <ClipboardCheck className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Bu tedarikçi için henüz denetim yapılmamış</p>
                  <p className="text-sm text-muted-foreground mt-1">Yeni bir denetim başlatmak için yukarıdaki butonu kullanın</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Audit Summary Stats */}
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    <Card>
                      <CardContent className="pt-4 text-center">
                        <div className="text-2xl font-bold text-blue-600">{supplierAudits.length}</div>
                        <p className="text-sm text-muted-foreground">Toplam Denetim</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {supplierAudits.filter((a: any) => (a.percentage || 0) >= 70).length}
                        </div>
                        <p className="text-sm text-muted-foreground">Başarılı (%70+)</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 text-center">
                        <div className="text-2xl font-bold text-yellow-600">
                          {supplierAudits.filter((a: any) => (a.percentage || 0) >= 50 && (a.percentage || 0) < 70).length}
                        </div>
                        <p className="text-sm text-muted-foreground">Orta (%50-70)</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 text-center">
                        <div className="text-2xl font-bold">
                          {supplierAudits.length > 0 
                            ? supplierAudits[0].percentage?.toFixed(0) + '%'
                            : '-'}
                        </div>
                        <p className="text-sm text-muted-foreground">Son Puan</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Audits Table */}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kod</TableHead>
                        <TableHead>Tarih</TableHead>
                        <TableHead>Denetçi</TableHead>
                        <TableHead>Tür</TableHead>
                        <TableHead>Puan</TableHead>
                        <TableHead>Soru Sayısı</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {supplierAudits.map((audit: any) => (
                        <TableRow key={audit.id}>
                          <TableCell className="font-mono text-sm">{audit.code}</TableCell>
                          <TableCell>{formatDate(audit.auditDate)}</TableCell>
                          <TableCell>
                            {audit.auditor?.name} {audit.auditor?.surname}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {audit.auditType === 'ON_YETERLILIK' ? 'Ön Yeterlilik' :
                               audit.auditType === 'PERIYODIK' ? 'Periyodik' :
                               audit.auditType === 'ANI' ? 'Ani' :
                               audit.auditType === 'BELGE_DENETIM' ? 'Belge Denetimi' : audit.auditType}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={
                              (audit.percentage || 0) >= 85 ? 'bg-green-100 text-green-800' :
                              (audit.percentage || 0) >= 70 ? 'bg-blue-100 text-blue-800' :
                              (audit.percentage || 0) >= 50 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }>
                              {audit.percentage?.toFixed(0) || 0}%
                            </Badge>
                          </TableCell>
                          <TableCell>{audit.answers?.length || 0}</TableCell>
                          <TableCell>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>Denetim Detayı - {audit.code}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div><strong>Tarih:</strong> {formatDate(audit.auditDate)}</div>
                                    <div><strong>Denetçi:</strong> {audit.auditor?.name} {audit.auditor?.surname}</div>
                                    <div><strong>Tür:</strong> {audit.auditType}</div>
                                    <div><strong>Puan:</strong> {audit.percentage?.toFixed(1)}%</div>
                                  </div>
                                  {audit.notes && (
                                    <div><strong>Notlar:</strong> {audit.notes}</div>
                                  )}
                                  {audit.findings && (
                                    <div><strong>Bulgular:</strong> {audit.findings}</div>
                                  )}
                                  {audit.recommendations && (
                                    <div><strong>Öneriler:</strong> {audit.recommendations}</div>
                                  )}
                                  <div className="border-t pt-4">
                                    <h4 className="font-semibold mb-2">Cevaplar</h4>
                                    <div className="space-y-2">
                                      {audit.answers?.map((ans: any, idx: number) => (
                                        <div key={ans.id} className="flex items-start gap-2 p-2 bg-muted/30 rounded">
                                          <span className="text-sm font-medium">{idx + 1}.</span>
                                          <div className="flex-1">
                                            <p className="text-sm">{ans.question?.question}</p>
                                            <Badge className={
                                              ans.answer === 'EVET' ? 'bg-green-100 text-green-800' :
                                              ans.answer === 'HAYIR' ? 'bg-red-100 text-red-800' :
                                              'bg-gray-100 text-gray-800'
                                            }>
                                              {ans.answer === 'EVET' ? 'Evet' :
                                               ans.answer === 'HAYIR' ? 'Hayır' : 'Uygulanamaz'}
                                            </Badge>
                                            {ans.notes && <p className="text-xs text-muted-foreground mt-1">{ans.notes}</p>}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab - Belge Yükleme */}
        <TabsContent value="documents">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Belgeler
              </CardTitle>
              <Dialog open={docOpen} onOpenChange={setDocOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Belge Ekle
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Yeni Belge Yükle</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Belge Adı *</Label>
                      <Input
                        value={docForm.name}
                        onChange={(e) => setDocForm({ ...docForm, name: e.target.value })}
                        placeholder="Belge adı"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Belge Türü *</Label>
                      <Select
                        value={docForm.documentType}
                        onValueChange={(value) => setDocForm({ ...docForm, documentType: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SOZLESME">Sözleşme</SelectItem>
                          <SelectItem value="SERTIFIKA">Sertifika</SelectItem>
                          <SelectItem value="VERGI_LEVHASI">Vergi Levhası</SelectItem>
                          <SelectItem value="KAPASITE_RAPORU">Kapasite Raporu</SelectItem>
                          <SelectItem value="TEKLIF">Teklif</SelectItem>
                          <SelectItem value="KALITE_BELGESI">Kalite Belgesi</SelectItem>
                          <SelectItem value="DIGER">Diğer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Geçerlilik Tarihi</Label>
                      <Input
                        type="date"
                        value={docForm.expiryDate}
                        onChange={(e) => setDocForm({ ...docForm, expiryDate: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">Süresi olan belgeler için (30 gün kala uyarı gönderilir)</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Dosya (Yalnızca PDF) *</Label>
                      <Input
                        type="file"
                        accept="application/pdf"
                        onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Açıklama</Label>
                      <Textarea
                        value={docForm.description}
                        onChange={(e) => setDocForm({ ...docForm, description: e.target.value })}
                        placeholder="Opsiyonel"
                        rows={2}
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" onClick={() => setDocOpen(false)}>İptal</Button>
                      <Button onClick={handleUploadDocument} disabled={uploadingDoc}>
                        {uploadingDoc ? 'Yükleniyor...' : 'Belgeyi Yükle'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {supplierDocuments.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Belge bulunmuyor</p>
                  <p className="text-sm text-muted-foreground mt-1">Belge eklemek için yukarıdaki butonu kullanın</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Belge Adı</TableHead>
                      <TableHead>Tip</TableHead>
                      <TableHead>Yükleyen</TableHead>
                      <TableHead>Yükleme Tarihi</TableHead>
                      <TableHead>Geçerlilik Tarihi</TableHead>
                      <TableHead>İşlem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supplierDocuments.map((doc: any) => {
                      const isExpired = doc.expiryDate && new Date(doc.expiryDate) < new Date();
                      const isExpiringSoon = doc.expiryDate && !isExpired && 
                        new Date(doc.expiryDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                      
                      return (
                        <TableRow key={doc.id} className={isExpired ? 'bg-red-50' : isExpiringSoon ? 'bg-yellow-50' : ''}>
                          <TableCell className="font-medium">{doc.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {doc.documentType === 'SOZLESME' ? 'Sözleşme' :
                               doc.documentType === 'SERTIFIKA' ? 'Sertifika' :
                               doc.documentType === 'VERGI_LEVHASI' ? 'Vergi Levhası' :
                               doc.documentType === 'KAPASITE_RAPORU' ? 'Kapasite Raporu' :
                               doc.documentType === 'TEKLIF' ? 'Teklif' :
                               doc.documentType === 'KALITE_BELGESI' ? 'Kalite Belgesi' :
                               'Diğer'}
                            </Badge>
                          </TableCell>
                          <TableCell>{doc.uploadedBy?.name} {doc.uploadedBy?.surname}</TableCell>
                          <TableCell>{formatDate(doc.createdAt)}</TableCell>
                          <TableCell>
                            {doc.expiryDate ? (
                              <span className={isExpired ? 'text-red-600 font-medium' : isExpiringSoon ? 'text-yellow-600' : ''}>
                                {formatDate(doc.expiryDate)}
                                {isExpired && ' (Süresi dolmuş)'}
                                {isExpiringSoon && ' (Yaklaşıyor)'}
                              </span>
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {doc.downloadUrl && (
                                <Button variant="ghost" size="sm" asChild>
                                  <a href={doc.downloadUrl} target="_blank" rel="noopener noreferrer">
                                    <Download className="w-4 h-4" />
                                  </a>
                                </Button>
                              )}
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleDeleteDocument(doc.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Geçmiş</CardTitle>
            </CardHeader>
            <CardContent>
              {supplier.history?.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Geçmiş kaydı bulunmuyor</p>
              ) : (
                <div className="space-y-4">
                  {supplier.history?.map((item: any) => (
                    <div key={item.id} className="flex items-start gap-4 pb-4 border-b last:border-0">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <History className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{ACTION_LABELS[item.action] || item.action}</p>
                        {item.comments && (
                          <p className="text-sm text-muted-foreground">{item.comments}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {item.user?.name} {item.user?.surname} • {new Date(item.createdAt).toLocaleString('tr-TR')}
                        </p>
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
