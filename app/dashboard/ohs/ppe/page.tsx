'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Shield,
  Search,
  Plus,
  Package,
  Send,
  AlertTriangle,
  User,
  Calendar,
  Download,
  Upload,
  FileText,
  Loader2,
  Building,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/export-utils';

interface PPEItem {
  id: string;
  code: string;
  type: string;
  name: string;
  brand?: string;
  model?: string;
  stockQuantity: number;
  minStockLevel: number;
  unit: string;
  status: string;
  location?: string;
  department?: { id: string; name: string };
  _count: { distributions: number };
}

interface Distribution {
  id: string;
  ppe: { id: string; code: string; name: string; type: string; unit?: string };
  user?: { id: string; name: string; surname?: string };
  recipientName?: string;
  departmentManagerName?: string;
  quantity: number;
  description?: string;
  distributionDate: string;
  returnDate?: string;
  returnQuantity?: number;
  returnReason?: string;
  custodyFormFileName?: string;
  custodyFormCloudPath?: string;
  custodyFormIsPublic?: boolean;
  distributedBy: { id: string; name: string; surname?: string };
  notes?: string;
}

interface Department {
  id: string;
  name: string;
}

interface UserOption {
  id: string;
  name: string;
  surname?: string;
}

const PPE_TYPE_LABELS: Record<string, string> = {
  BARET: 'Baret',
  KORUYUCU_GOZLUK: 'Koruyucu Gözlük',
  KULAK_TIKACI: 'Kulak Tıkacı/Kulaklık',
  TOZ_MASKESI: 'Toz Maskesi',
  GAZ_MASKESI: 'Gaz Maskesi',
  ELDIVEN: 'İş Eldiveni',
  IS_AYAKKABISI: 'İş Ayakkabısı',
  REFLEKTIF_YELEK: 'Reflektif Yelek',
  EMNIYET_KEMERI: 'Emniyet Kemeri',
  KORUYUCU_KIYAFET: 'Koruyucu Kıyafet',
  YUZ_SIPERLIGI: 'Yüz Siperliği',
  DIGER: 'Diğer',
};

const STATUS_LABELS: Record<string, string> = {
  STOKTA: 'Stokta',
  AZALIYOR: 'Stok Azalıyor',
  TUKENDI: 'Tükendi',
};

const STATUS_COLORS: Record<string, string> = {
  STOKTA: 'bg-green-100 text-green-800',
  AZALIYOR: 'bg-yellow-100 text-yellow-800',
  TUKENDI: 'bg-red-100 text-red-800',
};

export default function OHSPPEPage() {
  const [ppeItems, setPPEItems] = useState<PPEItem[]>([]);
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('stock');
  
  // Dialog states
  const [ppeDialogOpen, setPPEDialogOpen] = useState(false);
  const [distributionDialogOpen, setDistributionDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  
  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // PPE Form
  const [ppeForm, setPPEForm] = useState({
    type: '',
    name: '',
    brand: '',
    model: '',
    stockQuantity: '0',
    minStockLevel: '10',
    unit: 'Adet',
    location: '',
    departmentId: '',
  });
  
  // Distribution Form - now uses recipientName instead of userId
  const [distributionForm, setDistributionForm] = useState({
    ppeId: '',
    recipientName: '',
    departmentManagerName: '',
    departmentManagerId: '',
    quantity: '1',
    description: '',
    notes: '',
  });

  // PDF download/upload loading
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null);
  const [uploadingCustody, setUploadingCustody] = useState<string | null>(null);

  useEffect(() => {
    fetchPPEItems();
    fetchDistributions();
    fetchDepartments();
    fetchUsers();
  }, [search, typeFilter, statusFilter]);

  const fetchPPEItems = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (typeFilter && typeFilter !== 'all') params.set('type', typeFilter);
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);

      const response = await fetch(`/api/ohs/ppe/stock?${params}`);
      if (response.ok) {
        const data = await response.json();
        setPPEItems(Array.isArray(data) ? data : []);
      } else {
        setPPEItems([]);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      setPPEItems([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDistributions = async () => {
    try {
      const response = await fetch('/api/ohs/ppe/distributions');
      if (response.ok) {
        const data = await response.json();
        setDistributions(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/departments');
      if (response.ok) {
        const data = await response.json();
        const depts = data.departments || data;
        setDepartments(Array.isArray(depts) ? depts : []);
      }
    } catch (error) {
      console.error('Departments fetch error:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users?forReviewers=true');
      if (response.ok) {
        const data = await response.json();
        const list = data.users || data;
        setUsers(Array.isArray(list) ? list : []);
      }
    } catch (error) {
      console.error('Users fetch error:', error);
    }
  };

  const handleCreatePPE = async () => {
    if (!ppeForm.type || !ppeForm.name) {
      toast.error('Lütfen zorunlu alanları doldurun');
      return;
    }

    try {
      setCreating(true);
      const response = await fetch('/api/ohs/ppe/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...ppeForm,
          stockQuantity: parseInt(ppeForm.stockQuantity),
          minStockLevel: parseInt(ppeForm.minStockLevel),
          departmentId: ppeForm.departmentId || undefined,
        }),
      });

      if (response.ok) {
        toast.success('KKD eklendi');
        setPPEDialogOpen(false);
        setPPEForm({
          type: '', name: '', brand: '', model: '',
          stockQuantity: '0', minStockLevel: '10', unit: 'Adet', location: '', departmentId: '',
        });
        fetchPPEItems();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Eklenemedi');
      }
    } catch (error) {
      console.error('Create error:', error);
      toast.error('Hata oluştu');
    } finally {
      setCreating(false);
    }
  };

  const handleDistribute = async () => {
    if (!distributionForm.ppeId || !distributionForm.recipientName || !distributionForm.quantity) {
      toast.error('Lütfen zorunlu alanları doldurun (KKD, Teslim Alan, Miktar)');
      return;
    }

    try {
      setCreating(true);
      const response = await fetch('/api/ohs/ppe/distributions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...distributionForm,
          quantity: parseInt(distributionForm.quantity),
        }),
      });

      if (response.ok) {
        toast.success('KKD dağıtıldı. Zimmet formu oluşturuluyor...');
        setDistributionDialogOpen(false);
        setDistributionForm({
          ppeId: '', recipientName: '', departmentManagerName: '',
          departmentManagerId: '', quantity: '1', description: '', notes: '',
        });
        fetchPPEItems();
        // Delay to let PDF generate
        setTimeout(() => fetchDistributions(), 3000);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Dağıtılamadı');
      }
    } catch (error) {
      console.error('Distribute error:', error);
      toast.error('Hata oluştu');
    } finally {
      setCreating(false);
    }
  };

  const handleDownloadCustodyPdf = async (dist: Distribution) => {
    if (!dist.custodyFormCloudPath) {
      toast.error('Zimmet formu henüz oluşturulmamış');
      return;
    }

    try {
      setDownloadingPdf(dist.id);
      const response = await fetch('/api/upload/url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cloud_storage_path: dist.custodyFormCloudPath,
          isPublic: dist.custodyFormIsPublic ?? false,
          fileName: dist.custodyFormFileName,
        }),
      });

      if (response.ok) {
        const { url } = await response.json();
        const a = document.createElement('a');
        a.href = url;
        a.download = dist.custodyFormFileName || 'zimmet-formu.pdf';
        a.click();
      } else {
        toast.error('İndirme başarısız');
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('İndirme sırasında hata');
    } finally {
      setDownloadingPdf(null);
    }
  };

  const handleUploadCustodyForm = async (distId: string, file: File) => {
    try {
      setUploadingCustody(distId);

      const presignedRes = await fetch('/api/upload/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType: file.type || 'application/octet-stream', isPublic: false }),
      });
      if (!presignedRes.ok) throw new Error('Yükleme URL\'si alınamadı');

      const { uploadUrl, cloud_storage_path } = await presignedRes.json();

      const uploadRes = await fetch(uploadUrl, { method: 'PUT', body: file });
      if (!uploadRes.ok) throw new Error('Dosya yüklenemedi');

      const updateRes = await fetch(`/api/ohs/ppe/distributions/${distId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          custodyFormFileName: file.name,
          custodyFormFileSize: file.size,
          custodyFormCloudPath: cloud_storage_path,
          custodyFormIsPublic: false,
        }),
      });
      if (!updateRes.ok) throw new Error('Kayıt güncellenemedi');

      toast.success('Zimmet formu yüklendi');
      fetchDistributions();
    } catch (error) {
      console.error('Custody upload error:', error);
      toast.error('Zimmet formu yüklenemedi');
    } finally {
      setUploadingCustody(null);
    }
  };

  const getRecipientDisplay = (dist: Distribution) => {
    if (dist.recipientName) return dist.recipientName;
    if (dist.user) return `${dist.user.name} ${dist.user.surname || ''}`.trim();
    return '-';
  };

  // Düşük stok uyarısı
  const lowStockItems = ppeItems.filter(item => item.status !== 'STOKTA');

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-7 h-7 text-blue-600" />
            KKD Takibi
          </h1>
          <p className="text-muted-foreground">
            Kişisel koruyucu donanım stok ve dağıtım yönetimi
          </p>
        </div>
      </div>

      {/* Düşük Stok Uyarısı */}
      {lowStockItems.length > 0 && (
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <span className="font-medium">
                {lowStockItems.length} üründe stok uyarısı var
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="stock" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Stok Yönetimi
          </TabsTrigger>
          <TabsTrigger value="distributions" className="flex items-center gap-2">
            <Send className="w-4 h-4" />
            Dağıtım Kayıtları
          </TabsTrigger>
        </TabsList>

        {/* Stok Yönetimi */}
        <TabsContent value="stock" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-4">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Ara..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Tür" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  {Object.entries(PPE_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Durum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  {Object.entries(STATUS_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setDistributionDialogOpen(true)}>
                <Send className="w-4 h-4 mr-2" />
                Dağıt
              </Button>
              <Button onClick={() => setPPEDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Yeni KKD
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kod</TableHead>
                    <TableHead>Tür</TableHead>
                    <TableHead>Ad</TableHead>
                    <TableHead>Marka/Model</TableHead>
                    <TableHead>Departman</TableHead>
                    <TableHead>Stok</TableHead>
                    <TableHead>Min. Seviye</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Konum</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        Yükleniyor...
                      </TableCell>
                    </TableRow>
                  ) : ppeItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        Kayıt bulunamadı
                      </TableCell>
                    </TableRow>
                  ) : (
                    ppeItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-sm">{item.code}</TableCell>
                        <TableCell>{PPE_TYPE_LABELS[item.type] || item.type}</TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {item.brand}{item.model ? ` / ${item.model}` : ''}
                        </TableCell>
                        <TableCell>
                          {item.department ? (
                            <div className="flex items-center gap-1">
                              <Building className="w-3 h-3 text-muted-foreground" />
                              <span className="text-sm">{item.department.name}</span>
                            </div>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          <span className={item.stockQuantity <= item.minStockLevel ? 'text-red-600 font-bold' : ''}>
                            {item.stockQuantity} {item.unit}
                          </span>
                        </TableCell>
                        <TableCell>{item.minStockLevel} {item.unit}</TableCell>
                        <TableCell>
                          <Badge className={STATUS_COLORS[item.status]}>
                            {STATUS_LABELS[item.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>{item.location || '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dağıtım Kayıtları */}
        <TabsContent value="distributions" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>KKD</TableHead>
                    <TableHead>Teslim Alan</TableHead>
                    <TableHead>Dept. Müdürü</TableHead>
                    <TableHead>Miktar</TableHead>
                    <TableHead>Dağıtım Tarihi</TableHead>
                    <TableHead>Dağıtan</TableHead>
                    <TableHead>İade</TableHead>
                    <TableHead>Zimmet Formu</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {distributions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Kayıt bulunamadı
                      </TableCell>
                    </TableRow>
                  ) : (
                    distributions.map((dist) => (
                      <TableRow key={dist.id}>
                        <TableCell>
                          <div>
                            <span className="font-mono text-sm">{dist.ppe.code}</span>
                            <span className="ml-2 text-muted-foreground">{dist.ppe.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            {getRecipientDisplay(dist)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {dist.departmentManagerName || '-'}
                          </span>
                        </TableCell>
                        <TableCell>{dist.quantity}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            {formatDate(dist.distributionDate)}
                          </div>
                        </TableCell>
                        <TableCell>{dist.distributedBy?.name} {dist.distributedBy?.surname}</TableCell>
                        <TableCell>
                          {dist.returnDate ? (
                            <Badge variant="outline">
                              {dist.returnQuantity} adet iade
                            </Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {/* Yükle butonu */}
                            <input
                              type="file"
                              id={`custody-upload-${dist.id}`}
                              className="hidden"
                              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleUploadCustodyForm(dist.id, file);
                                e.target.value = '';
                              }}
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              title="Zimmet formu yükle"
                              disabled={uploadingCustody === dist.id}
                              onClick={() => document.getElementById(`custody-upload-${dist.id}`)?.click()}
                            >
                              {uploadingCustody === dist.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Upload className="w-4 h-4" />
                              )}
                            </Button>
                            {/* Varsa indir butonu */}
                            {dist.custodyFormCloudPath && (
                              <Button
                                size="sm"
                                variant="ghost"
                                title="Zimmet formunu indir"
                                onClick={() => handleDownloadCustodyPdf(dist)}
                                disabled={downloadingPdf === dist.id}
                              >
                                {downloadingPdf === dist.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Download className="w-4 h-4" />
                                )}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Yeni KKD Dialog */}
      <Dialog open={ppeDialogOpen} onOpenChange={setPPEDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Yeni KKD Ekle</DialogTitle>
            <DialogDescription>Kişisel koruyucu donanım bilgilerini girin</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>KKD Türü *</Label>
                <Select value={ppeForm.type} onValueChange={(v) => setPPEForm({ ...ppeForm, type: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PPE_TYPE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Teslim Edilen Departman</Label>
                <Select value={ppeForm.departmentId} onValueChange={(v) => setPPEForm({ ...ppeForm, departmentId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Departman seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>KKD Adı *</Label>
              <Input value={ppeForm.name} onChange={(e) => setPPEForm({ ...ppeForm, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Marka</Label>
                <Input value={ppeForm.brand} onChange={(e) => setPPEForm({ ...ppeForm, brand: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Model</Label>
                <Input value={ppeForm.model} onChange={(e) => setPPEForm({ ...ppeForm, model: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Stok Miktarı</Label>
                <Input type="number" min="0" value={ppeForm.stockQuantity} onChange={(e) => setPPEForm({ ...ppeForm, stockQuantity: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Min. Seviye</Label>
                <Input type="number" min="0" value={ppeForm.minStockLevel} onChange={(e) => setPPEForm({ ...ppeForm, minStockLevel: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Birim</Label>
                <Select value={ppeForm.unit} onValueChange={(v) => setPPEForm({ ...ppeForm, unit: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Adet">Adet</SelectItem>
                    <SelectItem value="Çift">Çift</SelectItem>
                    <SelectItem value="Kutu">Kutu</SelectItem>
                    <SelectItem value="Paket">Paket</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Depo Konumu</Label>
              <Input value={ppeForm.location} onChange={(e) => setPPEForm({ ...ppeForm, location: e.target.value })} placeholder="Örn: Depo A, Raf 3" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPPEDialogOpen(false)}>İptal</Button>
            <Button onClick={handleCreatePPE} disabled={creating}>
              {creating ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dağıtım Dialog */}
      <Dialog open={distributionDialogOpen} onOpenChange={setDistributionDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>KKD Dağıt</DialogTitle>
            <DialogDescription>Personele KKD teslim edin. Teslim sonrası otomatik zimmet formu oluşturulur.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>KKD *</Label>
              <Select value={distributionForm.ppeId} onValueChange={(v) => setDistributionForm({ ...distributionForm, ppeId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Seçin" />
                </SelectTrigger>
                <SelectContent>
                  {ppeItems.filter(item => item.stockQuantity > 0).map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} ({item.stockQuantity} {item.unit} stokta)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Teslim Alan Kişi *</Label>
              <Input
                value={distributionForm.recipientName}
                onChange={(e) => setDistributionForm({ ...distributionForm, recipientName: e.target.value })}
                placeholder="İsim Soyisim girin"
              />
            </div>
            <div className="space-y-2">
              <Label>Departman Müdürü</Label>
              <Select
                value={distributionForm.departmentManagerId}
                onValueChange={(v) => {
                  const selected = users.find((u) => u.id === v);
                  const fullName = selected ? `${selected.name} ${selected.surname || ''}`.trim() : '';
                  setDistributionForm({ ...distributionForm, departmentManagerId: v, departmentManagerName: fullName });
                }}
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
            <div className="space-y-2">
              <Label>Miktar *</Label>
              <Input
                type="number"
                min="1"
                value={distributionForm.quantity}
                onChange={(e) => setDistributionForm({ ...distributionForm, quantity: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Açıklama</Label>
              <Textarea
                value={distributionForm.description}
                onChange={(e) => setDistributionForm({ ...distributionForm, description: e.target.value })}
                placeholder="Dağıtım açıklaması"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Not</Label>
              <Input
                value={distributionForm.notes}
                onChange={(e) => setDistributionForm({ ...distributionForm, notes: e.target.value })}
                placeholder="Ek not"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDistributionDialogOpen(false)}>İptal</Button>
            <Button onClick={handleDistribute} disabled={creating}>
              {creating ? 'Dağıtılıyor...' : 'Dağıt'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
