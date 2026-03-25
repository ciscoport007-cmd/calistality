'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
import { toast } from 'sonner';
import {
  Plus,
  Search,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Filter,
  Upload,
  X,
  Paperclip,
} from 'lucide-react';
import { ExportButton } from '@/components/ui/export-button';
import { formatDate } from '@/lib/export-utils';

interface Category {
  id: string;
  name: string;
  code: string;
}

interface Complaint {
  id: string;
  code: string;
  customerName: string;
  customerEmail: string | null;
  customerCompany: string | null;
  subject: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
  dueDate: string | null;
  category: Category | null;
  createdBy: { id: string; name: string; surname: string | null };
  assignedUser: { id: string; name: string; surname: string | null } | null;
  _count: { tasks: number; attachments: number };
}

const statusLabels: Record<string, string> = {
  YENI: 'Yeni',
  INCELENIYOR: 'İnceleniyor',
  COZUM_BEKLENIYOR: 'Çözüm Bekleniyor',
  COZULDU: 'Çözüldü',
  KAPATILDI: 'Kapatıldı',
  IPTAL_EDILDI: 'İptal Edildi',
};

const statusColors: Record<string, string> = {
  YENI: 'bg-blue-100 text-blue-800',
  INCELENIYOR: 'bg-yellow-100 text-yellow-800',
  COZUM_BEKLENIYOR: 'bg-orange-100 text-orange-800',
  COZULDU: 'bg-green-100 text-green-800',
  KAPATILDI: 'bg-gray-100 text-gray-800',
  IPTAL_EDILDI: 'bg-red-100 text-red-800',
};

const priorityLabels: Record<string, string> = {
  DUSUK: 'Düşük',
  ORTA: 'Orta',
  YUKSEK: 'Yüksek',
  ACIL: 'Acil',
};

const priorityColors: Record<string, string> = {
  DUSUK: 'bg-gray-100 text-gray-800',
  ORTA: 'bg-blue-100 text-blue-800',
  YUKSEK: 'bg-orange-100 text-orange-800',
  ACIL: 'bg-red-100 text-red-800',
};

export default function ComplaintsPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  const [departments, setDepartments] = useState<{id: string; name: string; code: string}[]>([]);
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState<string[]>([]);
  const [deptDropdownOpen, setDeptDropdownOpen] = useState(false);
  const deptDropdownRef = useRef<HTMLDivElement>(null);

  // Kanıt dosyaları
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    customerCompany: '',
    // Otel spesifik alanlar
    guestName: '',
    roomNumber: '',
    agency: '',
    voucherNumber: '',
    // Diğer alanlar
    subject: '',
    description: '',
    details: '',
    categoryId: '',
    priority: 'ORTA',
    productName: '',
    incidentDate: '',
    incidentTime: '',
    incidentLocation: '',
    dueDate: '',
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    fetchComplaints();
    fetchCategories();
    fetchDepartments();
  }, [filterStatus, filterPriority, filterCategory, searchTerm]);

  // Dropdown dışına tıklanınca kapat
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (deptDropdownRef.current && !deptDropdownRef.current.contains(event.target as Node)) {
        setDeptDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchComplaints = async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);
      if (filterPriority) params.append('priority', filterPriority);
      if (filterCategory) params.append('categoryId', filterCategory);
      if (searchTerm) params.append('search', searchTerm);

      const res = await fetch(`/api/complaints?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setComplaints(data);
      }
    } catch (error) {
      console.error('Şikayetler alınırken hata:', error);
      toast.error('Şikayetler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/complaint-categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Kategoriler alınırken hata:', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/departments');
      if (res.ok) {
        const data = await res.json();
        const deptList = data.departments || data;
        setDepartments(Array.isArray(deptList) ? deptList : []);
      }
    } catch (error) {
      console.error('Departmanlar alınırken hata:', error);
    }
  };

  const toggleDepartment = (deptId: string) => {
    setSelectedDepartmentIds(prev =>
      prev.includes(deptId) ? prev.filter(id => id !== deptId) : [...prev, deptId]
    );
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setAttachmentFiles(prev => [...prev, ...newFiles]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setAttachmentFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadAttachments = async (complaintId: string) => {
    for (const file of attachmentFiles) {
      try {
        // Presigned URL al
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

        // S3'e yükle
        const uploadHeaders: Record<string, string> = { 'Content-Type': file.type };
        if (uploadUrl.includes('content-disposition')) {
          uploadHeaders['Content-Disposition'] = 'attachment';
        }
        await fetch(uploadUrl, { method: 'PUT', headers: uploadHeaders, body: file });

        // DB'ye kaydet
        await fetch(`/api/complaints/${complaintId}/attachments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            cloudStoragePath: cloud_storage_path,
            isPublic: false,
            description: 'Şikayet oluşturma sırasında eklenen kanıt',
          }),
        });
      } catch (err) {
        console.error('Dosya yükleme hatası:', err);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customerName || !formData.subject || !formData.description) {
      toast.error('Misafir adı, konu ve açıklama zorunludur');
      return;
    }

    try {
      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          relatedDepartmentIds: selectedDepartmentIds,
        }),
      });

      if (res.ok) {
        const complaint = await res.json();
        
        // Kanıt dosyalarını yükle
        if (attachmentFiles.length > 0) {
          await uploadAttachments(complaint.id);
        }

        toast.success('Şikayet başarıyla oluşturuldu');
        setIsDialogOpen(false);
        setFormData({
          customerName: '',
          customerEmail: '',
          customerPhone: '',
          customerCompany: '',
          guestName: '',
          roomNumber: '',
          agency: '',
          voucherNumber: '',
          subject: '',
          description: '',
          details: '',
          categoryId: '',
          priority: 'ORTA',
          productName: '',
          incidentDate: '',
          incidentTime: '',
          incidentLocation: '',
          dueDate: '',
        });
        setSelectedDepartmentIds([]);
        setAttachmentFiles([]);
        fetchComplaints();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Şikayet oluşturulamadı');
      }
    } catch (error) {
      console.error('Şikayet oluşturma hatası:', error);
      toast.error('Şikayet oluşturulurken hata oluştu');
    }
  };

  const formatDateLocal = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getStatusIcon = (s: string) => {
    switch (s) {
      case 'YENI':
        return <AlertCircle className="h-4 w-4" />;
      case 'INCELENIYOR':
      case 'COZUM_BEKLENIYOR':
        return <Clock className="h-4 w-4" />;
      case 'COZULDU':
      case 'KAPATILDI':
        return <CheckCircle className="h-4 w-4" />;
      case 'IPTAL_EDILDI':
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Misafir Şikayetleri</h1>
          <p className="text-muted-foreground mt-1">
            Misafir şikayetlerini yönetin ve takip edin
          </p>
        </div>
        <div className="flex gap-2">
          <ExportButton
            data={complaints.map((c: any) => ({
              code: c.code,
              customerName: c.customerName,
              subject: c.subject,
              status: statusLabels[c.status] || c.status,
              priority: priorityLabels[c.priority] || c.priority,
              category: c.category?.name || '-',
              assignedTo: c.assignedUser ? `${c.assignedUser.name} ${c.assignedUser.surname || ''}` : '-',
              createdAt: formatDateLocal(c.createdAt),
            }))}
            columns={[
              { header: 'Kod', key: 'code', width: 15 },
              { header: 'Misafir', key: 'customerName', width: 20 },
              { header: 'Konu', key: 'subject', width: 30 },
              { header: 'Durum', key: 'status', width: 15 },
              { header: 'Öncelik', key: 'priority', width: 12 },
              { header: 'Kategori', key: 'category', width: 15 },
              { header: 'Sorumlu', key: 'assignedTo', width: 15 },
              { header: 'Tarih', key: 'createdAt', width: 12 },
            ]}
            fileName="misafir-sikayetleri"
            title="Misafir Şikayetleri"
          />
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Yeni Şikayet
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Yeni Şikayet Oluştur</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              {/* Misafir Bilgileri */}
              <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
                <h4 className="font-medium text-sm text-muted-foreground">Misafir Bilgileri</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customerName">Misafir Adı *</Label>
                    <Input
                      id="customerName"
                      value={formData.customerName}
                      onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                      placeholder="Misafir adı soyadı"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="roomNumber">Oda Numarası</Label>
                    <Input
                      id="roomNumber"
                      value={formData.roomNumber}
                      onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                      placeholder="Örn: 101"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customerPhone">Telefon</Label>
                    <Input
                      id="customerPhone"
                      value={formData.customerPhone}
                      onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customerCompany">Şirket</Label>
                    <Input
                      id="customerCompany"
                      value={formData.customerCompany}
                      onChange={(e) => setFormData({ ...formData, customerCompany: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customerEmail">E-posta</Label>
                    <Input
                      id="customerEmail"
                      type="email"
                      value={formData.customerEmail}
                      onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="agency">Acenta</Label>
                    <Input
                      id="agency"
                      value={formData.agency}
                      onChange={(e) => setFormData({ ...formData, agency: e.target.value })}
                      placeholder="Rezervasyon acentası"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="voucherNumber">Voucher No</Label>
                    <Input
                      id="voucherNumber"
                      value={formData.voucherNumber}
                      onChange={(e) => setFormData({ ...formData, voucherNumber: e.target.value })}
                      placeholder="Voucher numarası"
                    />
                  </div>
                </div>
              </div>

              {/* Şikayet Detayları */}
              <div className="space-y-2">
                <Label htmlFor="subject">Konu *</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Açıklama *</Label>
                <Textarea
                  id="description"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="details">Detaylar</Label>
                <Textarea
                  id="details"
                  rows={3}
                  value={formData.details}
                  onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                  placeholder={"(Olayın nasıl gerçekleştiğini tüm detaylarıyla tutanak tutar gibi açıklayınız.\nÖrn: Saat 14:30'da misafir odaya girdiğinde...)"}
                />
              </div>

              {/* Olay Bilgileri */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="incidentLocation">Olay Yeri</Label>
                  <Input
                    id="incidentLocation"
                    value={formData.incidentLocation}
                    onChange={(e) => setFormData({ ...formData, incidentLocation: e.target.value })}
                    placeholder="Örn: Restoran, Lobi, Oda"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="incidentDate">Olay Tarihi</Label>
                  <Input
                    id="incidentDate"
                    type="date"
                    value={formData.incidentDate}
                    onChange={(e) => setFormData({ ...formData, incidentDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="incidentTime">Olay Saati</Label>
                  <Input
                    id="incidentTime"
                    type="time"
                    value={formData.incidentTime}
                    onChange={(e) => setFormData({ ...formData, incidentTime: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="categoryId">Kategori</Label>
                  <Select
                    value={formData.categoryId}
                    onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Kategori seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">Öncelik</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => setFormData({ ...formData, priority: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DUSUK">Düşük</SelectItem>
                      <SelectItem value="ORTA">Orta</SelectItem>
                      <SelectItem value="YUKSEK">Yüksek</SelectItem>
                      <SelectItem value="ACIL">Acil</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* İlgili Departmanlar - Multi-select */}
              <div className="space-y-2">
                <Label>İlgili Departmanlar</Label>
                <div ref={deptDropdownRef} className="relative">
                  <div
                    className="flex flex-wrap gap-1 min-h-[40px] p-2 border rounded-md cursor-pointer bg-background"
                    onClick={() => setDeptDropdownOpen(!deptDropdownOpen)}
                  >
                    {selectedDepartmentIds.length === 0 ? (
                      <span className="text-muted-foreground text-sm">Departman seçin...</span>
                    ) : (
                      selectedDepartmentIds.map(id => {
                        const dept = departments.find(d => d.id === id);
                        return dept ? (
                          <Badge key={id} variant="secondary" className="text-xs flex items-center gap-1">
                            {dept.name}
                            <X
                              className="h-3 w-3 cursor-pointer"
                              onClick={(e) => { e.stopPropagation(); toggleDepartment(id); }}
                            />
                          </Badge>
                        ) : null;
                      })
                    )}
                  </div>
                  {deptDropdownOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {departments.map((dept) => (
                        <div
                          key={dept.id}
                          className="flex items-center gap-2 px-3 py-2 hover:bg-accent cursor-pointer"
                          onClick={() => toggleDepartment(dept.id)}
                        >
                          <Checkbox
                            checked={selectedDepartmentIds.includes(dept.id)}
                            onCheckedChange={() => toggleDepartment(dept.id)}
                          />
                          <span className="text-sm">{dept.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="productName">Ürün Adı</Label>
                  <Input
                    id="productName"
                    value={formData.productName}
                    onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Termin Tarihi</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  />
                </div>
              </div>

              {/* Kanıt Ekle */}
              <div className="border rounded-lg p-4 space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
                  <Paperclip className="h-4 w-4" />
                  Kanıt Ekle
                </h4>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Dosya Seç
                  </Button>
                  <span className="text-xs text-muted-foreground ml-2">Fotoğraf, PDF, Office dosyaları</span>
                </div>
                {attachmentFiles.length > 0 && (
                  <div className="space-y-1">
                    {attachmentFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-muted/50 rounded px-3 py-1.5 text-sm">
                        <span className="truncate max-w-[300px]">{file.name} ({(file.size / 1024).toFixed(0)} KB)</span>
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeFile(idx)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  İptal
                </Button>
                <Button type="submit">
                  Oluştur
                </Button>
              </div>
            </form>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtreler
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Ara (kod, misafir, konu)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Durum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Durumlar</SelectItem>
                {Object.entries(statusLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger>
                <SelectValue placeholder="Öncelik" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Öncelikler</SelectItem>
                {Object.entries(priorityLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Kategoriler</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Complaints Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kod</TableHead>
                <TableHead>Misafir</TableHead>
                <TableHead>Konu</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Öncelik</TableHead>
                <TableHead>Atanan</TableHead>
                <TableHead>Tarih</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {complaints.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    Şikayet bulunamadı
                  </TableCell>
                </TableRow>
              ) : (
                complaints.map((complaint) => (
                  <TableRow key={complaint.id}>
                    <TableCell className="font-mono font-medium">
                      {complaint.code}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{complaint.customerName}</div>
                        {complaint.customerCompany && (
                          <div className="text-sm text-muted-foreground">
                            {complaint.customerCompany}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[200px] truncate" title={complaint.subject}>
                        {complaint.subject}
                      </div>
                    </TableCell>
                    <TableCell>
                      {complaint.category?.name || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${statusColors[complaint.status]} flex items-center gap-1 w-fit`}>
                        {getStatusIcon(complaint.status)}
                        {statusLabels[complaint.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={priorityColors[complaint.priority]}>
                        {priorityLabels[complaint.priority]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {complaint.assignedUser ? (
                        <span>
                          {complaint.assignedUser.name} {complaint.assignedUser.surname}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Atanmadı</span>
                      )}
                    </TableCell>
                    <TableCell>{formatDateLocal(complaint.createdAt)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/dashboard/complaints/${complaint.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
