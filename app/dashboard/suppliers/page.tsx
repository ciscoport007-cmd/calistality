'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Plus,
  Search,
  Filter,
  ChevronRight,
  Phone,
  Mail,
  MapPin,
  Star,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Users,
  FileText,
  TrendingUp
} from 'lucide-react';
import { ExportButton } from '@/components/ui/export-button';
import { formatDate } from '@/lib/export-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Trash2 } from 'lucide-react';
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
  A: 'bg-green-100 text-green-800',
  B: 'bg-blue-100 text-blue-800',
  C: 'bg-yellow-100 text-yellow-800',
  D: 'bg-red-100 text-red-800'
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

const CERTIFICATES: { key: string; label: string }[] = [
  { key: 'isoQuality', label: 'ISO 9001 (Kalite)' },
  { key: 'isoEnvironment', label: 'ISO 14001 (Çevre)' },
  { key: 'isoSafety', label: 'ISO 45001 (İSG)' },
  { key: 'isoFood', label: 'ISO 22000 (Gıda)' },
  { key: 'haccp', label: 'HACCP' },
  { key: 'tse', label: 'TSE' },
  { key: 'ce', label: 'CE' },
  { key: 'halal', label: 'Helal' },
  { key: 'kosher', label: 'Koşer' },
  { key: 'gmp', label: 'GMP' },
  { key: 'organic', label: 'Organik' }
];

// Yeni talep edilen sertifikalar
const NEW_CERTIFICATES: { key: string; label: string }[] = [
  { key: 'certTarimOrman', label: 'Tarım ve Orman Bak. İşletme Kayıt Belgesi' },
  { key: 'certFSC', label: 'FSC Sertifikası' },
  { key: 'certFairTrade', label: 'Fair Trade Sertifikası' },
  { key: 'certIFS', label: 'IFS' },
  { key: 'certBRC', label: 'BRC' }
];

const ALL_CERTIFICATES = [...CERTIFICATES, ...NEW_CERTIFICATES];

const GRADE_LABELS: Record<string, { label: string; description: string; color: string }> = {
  A: { label: 'A Sınıfı', description: 'As tedarikçiler', color: 'bg-green-500 text-white' },
  B: { label: 'B Sınıfı', description: 'Yedek tedarikçiler', color: 'bg-blue-500 text-white' },
  C: { label: 'C Sınıfı', description: 'Zorunlu kaldıkça', color: 'bg-yellow-500 text-white' }
};

const CONTRACT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  BEKLENIYOR: { label: 'Sözleşme Bekleniyor', color: 'bg-orange-100 text-orange-800' },
  MEVCUT: { label: 'Sözleşme Mevcut', color: 'bg-green-100 text-green-800' },
  YOK: { label: 'Sözleşme Yok', color: 'bg-gray-100 text-gray-600' }
};

export default function SuppliersPage() {
  const { data: session } = useSession() || {};
  const isAdmin = session?.user?.role === 'Admin';
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [certificateFilters, setCertificateFilters] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('');
  const [showCertFilters, setShowCertFilters] = useState(false);
  
  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    tradeName: '',
    taxNumber: '',
    taxOffice: '',
    supplierType: 'URUN',
    categoryId: '',
    phone: '',
    email: '',
    website: '',
    address: '',
    city: '',
    productsServices: '',
    evaluationPeriod: 'YILLIK',
    // Sertifikalar
    isoQuality: false,
    isoEnvironment: false,
    isoSafety: false,
    isoFood: false,
    haccp: false,
    tse: false,
    ce: false,
    halal: false,
    kosher: false,
    gmp: false,
    organic: false,
    // Yeni sertifikalar
    certTarimOrman: false,
    certFSC: false,
    certFairTrade: false,
    certIFS: false,
    certBRC: false,
    otherCertificates: '',
    // Mesafe
    distanceToHotel: '',
    distanceNotes: '',
    // Sipariş Takibi
    purchaseFrequency: '',
    paymentTerms: '',
    leadTime: '',
    minimumOrderQuantity: '',
    deliveryTerms: '',
    isCritical: false,
    isSubcontractor: false,
    notes: ''
  });
  
  // Stats
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    suspended: 0,
    blacklisted: 0
  });

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', pagination.page.toString());
      params.set('limit', pagination.limit.toString());
      if (search) params.set('search', search);
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
      if (categoryFilter && categoryFilter !== 'all') params.set('categoryId', categoryFilter);
      if (typeFilter && typeFilter !== 'all') params.set('supplierType', typeFilter);
      if (ratingFilter && ratingFilter !== 'all') params.set('rating', ratingFilter);
      if (gradeFilter && gradeFilter !== 'all') params.set('grade', gradeFilter);
      if (certificateFilters.length > 0) params.set('certificates', certificateFilters.join(','));
      if (sortBy && sortBy !== 'default') {
        params.set('sortBy', sortBy);
        params.set('sortOrder', 'desc');
      }

      const response = await fetch(`/api/suppliers?${params.toString()}`);
      const data = await response.json();
      
      if (response.ok) {
        setSuppliers(data.suppliers);
        setPagination(prev => ({ ...prev, ...data.pagination }));
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      toast.error('Tedarikçiler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/supplier-categories');
      const data = await response.json();
      if (response.ok) {
        setCategories(data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchStats = async () => {
    try {
      // Calculate stats from all suppliers
      const response = await fetch('/api/suppliers?limit=1000');
      const data = await response.json();
      if (response.ok) {
        const allSuppliers = data.suppliers;
        setStats({
          total: allSuppliers.length,
          approved: allSuppliers.filter((s: any) => s.status === 'ONAYLANDI').length,
          pending: allSuppliers.filter((s: any) => ['ADAY', 'DEGERLENDIRMEDE'].includes(s.status)).length,
          suspended: allSuppliers.filter((s: any) => s.status === 'ASKIYA_ALINDI').length,
          blacklisted: allSuppliers.filter((s: any) => s.status === 'KARA_LISTE').length
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchStats();
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [pagination.page, search, statusFilter, categoryFilter, typeFilter, ratingFilter, gradeFilter, certificateFilters, sortBy]);

  const handleCreate = async () => {
    if (!formData.name) {
      toast.error('Tedarikçi adı zorunludur');
      return;
    }
    if (!formData.categoryId) {
      toast.error('Kategori seçimi zorunludur');
      return;
    }

    setCreating(true);
    try {
      const response = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success('Tedarikçi oluşturuldu');
        setCreateOpen(false);
        setFormData({
          name: '',
          tradeName: '',
          taxNumber: '',
          taxOffice: '',
          supplierType: 'URUN',
          categoryId: '',
          phone: '',
          email: '',
          website: '',
          address: '',
          city: '',
          productsServices: '',
          evaluationPeriod: 'YILLIK',
          isoQuality: false,
          isoEnvironment: false,
          isoSafety: false,
          isoFood: false,
          haccp: false,
          tse: false,
          ce: false,
          halal: false,
          kosher: false,
          gmp: false,
          organic: false,
          certTarimOrman: false,
          certFSC: false,
          certFairTrade: false,
          certIFS: false,
          certBRC: false,
          otherCertificates: '',
          distanceToHotel: '',
          distanceNotes: '',
          purchaseFrequency: '',
          paymentTerms: '',
          leadTime: '',
          minimumOrderQuantity: '',
          deliveryTerms: '',
          isCritical: false,
          isSubcontractor: false,
          notes: ''
        });
        fetchSuppliers();
        fetchStats();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Bir hata oluştu');
      }
    } catch (error) {
      console.error('Error creating supplier:', error);
      toast.error('Tedarikçi oluşturulamadı');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/suppliers/${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success(`"${deleteTarget.name}" tedarikçisi silindi.`);
        setDeleteTarget(null);
        fetchSuppliers();
        fetchStats();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Silinemedi.');
      }
    } catch {
      toast.error('Bir hata oluştu.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tedarikçi Yönetimi</h1>
          <p className="text-muted-foreground">Tedarikçi değerlendirme ve performans takibi</p>
        </div>
        <div className="flex gap-2">
          <ExportButton
            data={suppliers.map((s: any) => ({
              code: s.code,
              name: s.name,
              tradeName: s.tradeName || '-',
              status: STATUS_LABELS[s.status] || s.status,
              category: s.category?.name || '-',
              rating: s.rating || '-',
              contactPerson: s.contactPerson || '-',
              email: s.email || '-',
              phone: s.phone || '-',
              city: s.city || '-',
              country: s.country || '-',
              taxNumber: s.taxNumber || '-',
            }))}
            columns={[
              { header: 'Kod', key: 'code', width: 15 },
              { header: 'Ad', key: 'name', width: 20 },
              { header: 'Ticaret Unvanı', key: 'tradeName', width: 20 },
              { header: 'Durum', key: 'status', width: 12 },
              { header: 'Kategori', key: 'category', width: 12 },
              { header: 'Puan', key: 'rating', width: 8 },
              { header: 'İletişim', key: 'contactPerson', width: 15 },
              { header: 'E-posta', key: 'email', width: 20 },
              { header: 'Telefon', key: 'phone', width: 15 },
              { header: 'Şehir', key: 'city', width: 12 },
            ]}
            fileName="tedarikci-listesi"
            title="Tedarikçi Listesi"
          />
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Yeni Tedarikçi
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Yeni Tedarikçi Ekle</DialogTitle>
              </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tedarikçi Adı *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Tedarikçi adı"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ticaret Unvanı</Label>
                  <Input
                    value={formData.tradeName}
                    onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })}
                    placeholder="Ticaret unvanı"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Vergi No</Label>
                  <Input
                    value={formData.taxNumber}
                    onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
                    placeholder="Vergi numarası"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Vergi Dairesi</Label>
                  <Input
                    value={formData.taxOffice}
                    onChange={(e) => setFormData({ ...formData, taxOffice: e.target.value })}
                    placeholder="Vergi dairesi"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tedarikçi Tipi</Label>
                  <Select
                    value={formData.supplierType}
                    onValueChange={(value) => setFormData({ ...formData, supplierType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tip seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TYPE_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Kategori *</Label>
                  <Select
                    value={formData.categoryId}
                    onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                  >
                    <SelectTrigger className={!formData.categoryId ? 'border-orange-300' : ''}>
                      <SelectValue placeholder="Kategori seçin (zorunlu)" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Telefon</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Telefon numarası"
                  />
                </div>
                <div className="space-y-2">
                  <Label>E-posta</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="E-posta adresi"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Website</Label>
                  <Input
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="www.example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Şehir</Label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Şehir"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Adres</Label>
                <Textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Açık adres"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Ürün/Hizmetler</Label>
                <Textarea
                  value={formData.productsServices}
                  onChange={(e) => setFormData({ ...formData, productsServices: e.target.value })}
                  placeholder="Sağladığı ürün ve hizmetler"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Değerlendirme Periyodu</Label>
                <Select
                  value={formData.evaluationPeriod}
                  onValueChange={(value) => setFormData({ ...formData, evaluationPeriod: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Periyot seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(EVALUATION_PERIODS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sertifikalar */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Özel Sertifikalar (Yeni)</Label>
                <div className="grid grid-cols-2 gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  {NEW_CERTIFICATES.map((cert) => (
                    <div key={cert.key} className="flex items-center space-x-2">
                      <Checkbox
                        id={cert.key}
                        checked={(formData as any)[cert.key]}
                        onCheckedChange={(checked) => setFormData({ ...formData, [cert.key]: !!checked })}
                      />
                      <Label htmlFor={cert.key} className="font-normal text-sm">{cert.label}</Label>
                    </div>
                  ))}
                </div>
                
                <Label className="text-sm font-medium">Diğer Sertifikalar</Label>
                <div className="grid grid-cols-3 gap-3">
                  {CERTIFICATES.map((cert) => (
                    <div key={cert.key} className="flex items-center space-x-2">
                      <Checkbox
                        id={cert.key}
                        checked={(formData as any)[cert.key]}
                        onCheckedChange={(checked) => setFormData({ ...formData, [cert.key]: !!checked })}
                      />
                      <Label htmlFor={cert.key} className="font-normal text-sm">{cert.label}</Label>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <Label>Diğer Sertifikalar (Metin)</Label>
                  <Input
                    value={formData.otherCertificates}
                    onChange={(e) => setFormData({ ...formData, otherCertificates: e.target.value })}
                    placeholder="Diğer sertifikalar (virgülle ayırın)"
                  />
                </div>
              </div>

              {/* Mesafe Bilgileri */}
              <div className="space-y-4 pt-2 border-t">
                <Label className="text-sm font-medium">Mesafe Bilgileri</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Otele Mesafe (km)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.distanceToHotel}
                      onChange={(e) => setFormData({ ...formData, distanceToHotel: e.target.value })}
                      placeholder="Örn: 15.5"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Mesafe Notları</Label>
                    <Input
                      value={formData.distanceNotes}
                      onChange={(e) => setFormData({ ...formData, distanceNotes: e.target.value })}
                      placeholder="Örn: Şehir içi, Organize Sanayi"
                    />
                  </div>
                </div>
              </div>

              {/* Sipariş ve Alışveriş Takibi */}
              <div className="space-y-4 pt-2 border-t">
                <Label className="text-sm font-medium">Sipariş ve Alışveriş Bilgileri</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Alışveriş Sıklığı</Label>
                    <Select
                      value={formData.purchaseFrequency || 'none'}
                      onValueChange={(value) => setFormData({ ...formData, purchaseFrequency: value === 'none' ? '' : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sıklık seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Belirlenmedi</SelectItem>
                        {Object.entries(PURCHASE_FREQUENCIES).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Ödeme Vadesi</Label>
                    <Input
                      value={formData.paymentTerms}
                      onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                      placeholder="Örn: 30 gün, Peşin"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Teslim Süresi (Gün)</Label>
                    <Input
                      type="number"
                      value={formData.leadTime}
                      onChange={(e) => setFormData({ ...formData, leadTime: e.target.value })}
                      placeholder="Ortalama teslim süresi"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Minimum Sipariş Miktarı</Label>
                    <Input
                      value={formData.minimumOrderQuantity}
                      onChange={(e) => setFormData({ ...formData, minimumOrderQuantity: e.target.value })}
                      placeholder="Örn: 100 adet, 500 kg"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Teslimat Şartları</Label>
                  <Input
                    value={formData.deliveryTerms}
                    onChange={(e) => setFormData({ ...formData, deliveryTerms: e.target.value })}
                    placeholder="Örn: Fabrika Teslim, Kapıda Teslim, FOB"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isCritical"
                    checked={formData.isCritical}
                    onCheckedChange={(checked) => setFormData({ ...formData, isCritical: !!checked })}
                  />
                  <Label htmlFor="isCritical" className="font-normal">Kritik Tedarikçi</Label>
                </div>
                
                <div className="flex items-center space-x-2 bg-orange-50 px-3 py-2 rounded-md border border-orange-200">
                  <Checkbox
                    id="isSubcontractor"
                    checked={formData.isSubcontractor}
                    onCheckedChange={(checked) => setFormData({ ...formData, isSubcontractor: !!checked })}
                  />
                  <Label htmlFor="isSubcontractor" className="font-normal text-orange-800">
                    Taşeron Firma (İSG Modülüne Ekle)
                  </Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notlar</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Ek notlar"
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setCreateOpen(false)}>İptal</Button>
                <Button onClick={handleCreate} disabled={creating}>
                  {creating ? 'Oluşturuluyor...' : 'Oluştur'}
                </Button>
              </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Toplam</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Building2 className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Onaylı</p>
                <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Bekleyen</p>
                <p className="text-2xl font-bold text-blue-600">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Askıda</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.suspended}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Kara Liste</p>
                <p className="text-2xl font-bold text-red-600">{stats.blacklisted}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Ara (kod, ad, vergi no, şehir)"
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Durum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Durumlar</SelectItem>
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Kategoriler</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Tip" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Tipler</SelectItem>
                {Object.entries(TYPE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={gradeFilter} onValueChange={setGradeFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Sınıf" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Sınıflar</SelectItem>
                <SelectItem value="A">A Sınıfı (As)</SelectItem>
                <SelectItem value="B">B Sınıfı (Yedek)</SelectItem>
                <SelectItem value="C">C Sınıfı (Zorunlu)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sırala" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Varsayılan</SelectItem>
                <SelectItem value="totalExpenses">En Yüksek İşlem Hacmi</SelectItem>
                <SelectItem value="overallScore">En Yüksek Puan</SelectItem>
                <SelectItem value="name">İsme Göre</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant={showCertFilters ? "secondary" : "outline"} 
              size="sm"
              onClick={() => setShowCertFilters(!showCertFilters)}
            >
              <Filter className="w-4 h-4 mr-1" />
              Sertifikalar
              {certificateFilters.length > 0 && (
                <Badge variant="secondary" className="ml-1">{certificateFilters.length}</Badge>
              )}
            </Button>
          </div>
          
          {/* Sertifika Filtreleri */}
          {showCertFilters && (
            <div className="border-t pt-4">
              <Label className="text-sm font-medium mb-2 block">Sertifikalara Göre Filtrele</Label>
              <div className="grid grid-cols-4 gap-2">
                {NEW_CERTIFICATES.map((cert) => (
                  <div key={cert.key} className="flex items-center space-x-2">
                    <Checkbox
                      id={`filter-${cert.key}`}
                      checked={certificateFilters.includes(cert.key)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setCertificateFilters([...certificateFilters, cert.key]);
                        } else {
                          setCertificateFilters(certificateFilters.filter(c => c !== cert.key));
                        }
                      }}
                    />
                    <Label htmlFor={`filter-${cert.key}`} className="font-normal text-sm">{cert.label}</Label>
                  </div>
                ))}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="filter-organic"
                    checked={certificateFilters.includes('organic')}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setCertificateFilters([...certificateFilters, 'organic']);
                      } else {
                        setCertificateFilters(certificateFilters.filter(c => c !== 'organic'));
                      }
                    }}
                  />
                  <Label htmlFor="filter-organic" className="font-normal text-sm">Organik Ürün Sertifikası</Label>
                </div>
              </div>
              {certificateFilters.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => setCertificateFilters([])}
                >
                  Filtreleri Temizle
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kod</TableHead>
                <TableHead>Tedarikçi</TableHead>
                <TableHead>Tip</TableHead>
                <TableHead>Şehir</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Sınıf</TableHead>
                <TableHead>Genel Puan</TableHead>
                <TableHead className="text-right">İşlem Hacmi</TableHead>
                <TableHead className="text-center">Sözleşme</TableHead>
                <TableHead></TableHead>
                {isAdmin && <TableHead className="w-10"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    Yükleniyor...
                  </TableCell>
                </TableRow>
              ) : suppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    Tedarikçi bulunamadı
                  </TableCell>
                </TableRow>
              ) : (
                suppliers.map((supplier) => (
                  <TableRow
                    key={supplier.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/dashboard/suppliers/${supplier.id}`)}
                  >
                    <TableCell className="font-mono text-sm">{supplier.code}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="font-medium">{supplier.name}</p>
                          {supplier.category && (
                            <p className="text-xs text-muted-foreground">{supplier.category.name}</p>
                          )}
                        </div>
                        {supplier.isCritical && (
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        )}
                        {supplier.isSubcontractor && (
                          <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-300">
                            Taşeron
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{TYPE_LABELS[supplier.supplierType] || supplier.supplierType}</TableCell>
                    <TableCell>{supplier.city || '-'}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[supplier.status]}>
                        {STATUS_LABELS[supplier.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {supplier.supplierGrade ? (
                        <Badge className={GRADE_LABELS[supplier.supplierGrade]?.color || 'bg-gray-100'}>
                          {supplier.supplierGrade}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {supplier.overallScore !== null && supplier.overallScore !== undefined ? (
                        <span className="font-medium">{supplier.overallScore.toFixed(1)}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {supplier.totalExpense > 0 ? (
                        <span className="font-medium">
                          {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(supplier.totalExpense)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {supplier.contractStatus && CONTRACT_STATUS_LABELS[supplier.contractStatus] ? (
                        <Badge className={CONTRACT_STATUS_LABELS[supplier.contractStatus].color}>
                          {supplier.contractStatus === 'MEVCUT' ? '✓' : supplier.contractStatus === 'BEKLENIYOR' ? '⏳' : '-'}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget({ id: supplier.id, name: supplier.name });
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Toplam {pagination.total} tedarikçi
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
            >
              Önceki
            </Button>
            <span className="text-sm">
              {pagination.page} / {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
            >
              Sonraki
            </Button>
          </div>
        </div>
      )}
    </div>

      {/* Tedarikçi Silme Onay Dialog'u */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              Tedarikçiyi Sil
            </DialogTitle>
            <DialogDescription>
              <span className="font-semibold text-gray-900">&quot;{deleteTarget?.name}&quot;</span> tedarikçisini silmek istediğinizden emin misiniz?
              <br />
              <span className="text-red-500 text-sm mt-1 block">Bu işlem geri alınamaz. Tedarikçiye ait tüm kayıtlar pasife alınacaktır.</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Vazgeç
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Siliniyor...' : 'Evet, Sil'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
