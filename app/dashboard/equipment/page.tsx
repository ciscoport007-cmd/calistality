'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Plus, Package, AlertTriangle, Wrench, Gauge, ChevronLeft, ChevronRight, Building2, Filter, Calendar, ImageIcon, X } from 'lucide-react';
import { ExportButton } from '@/components/ui/export-button';
import { formatDate } from '@/lib/export-utils';
import { toast } from 'sonner';

const statusLabels: Record<string, string> = {
  AKTIF: 'Aktif',
  BAKIM_BEKLIYOR: 'Bakım Bekliyor',
  BAKIMDA: 'Bakımda',
  KALIBRASYON_BEKLIYOR: 'Kalibrasyon Bekliyor',
  KALIBRASYONDA: 'Kalibrasyonda',
  ARIZALI: 'Arızalı',
  DEVRE_DISI: 'Devre Dışı',
  HURDA: 'Hurda',
};

const statusColors: Record<string, string> = {
  AKTIF: 'bg-green-100 text-green-800',
  BAKIM_BEKLIYOR: 'bg-yellow-100 text-yellow-800',
  BAKIMDA: 'bg-blue-100 text-blue-800',
  KALIBRASYON_BEKLIYOR: 'bg-orange-100 text-orange-800',
  KALIBRASYONDA: 'bg-purple-100 text-purple-800',
  ARIZALI: 'bg-red-100 text-red-800',
  DEVRE_DISI: 'bg-gray-100 text-gray-800',
  HURDA: 'bg-gray-200 text-gray-600',
};

const conditionLabels: Record<string, string> = {
  MUKEMMEL: 'Mükemmel',
  IYI: 'İyi',
  ORTA: 'Orta',
  KOTU: 'Kötü',
  KULLANIM_DISI: 'Kullanım Dışı',
};

const adminRoles = ['Admin', 'Yönetici', 'admin', 'Strateji Ofisi'];

export default function EquipmentPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = adminRoles.some(r => r.toLowerCase() === (session?.user?.role || '').toLowerCase());
  const [equipment, setEquipment] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    maintenancePending: 0,
    calibrationPending: 0,
    faulty: 0,
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    categoryId: '',
    departmentId: '',
    location: '',
    serialNumber: '',
    model: '',
    manufacturer: '',
    maintenanceFrequency: '',
    requiresCalibration: false,
    calibrationFrequency: '',
    lastCalibrationDate: '',
    ownerId: '',
  });

  const fetchEquipment = async () => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '10',
        ...(search && { search }),
        ...(statusFilter && statusFilter !== 'all' && { status: statusFilter }),
        ...(categoryFilter && categoryFilter !== 'all' && { categoryId: categoryFilter }),
        ...(departmentFilter && departmentFilter !== 'all' && { departmentId: departmentFilter }),
      });

      const res = await fetch(`/api/equipment?${params}`);
      const data = await res.json();
      setEquipment(data.equipment || []);
      setTotalPages(data.pagination?.totalPages || 1);

      // İstatistikleri hesapla
      const allRes = await fetch('/api/equipment?pageSize=1000');
      const allData = await allRes.json();
      const allEquip = allData.equipment || [];
      setStats({
        total: allEquip.length,
        active: allEquip.filter((e: any) => e.status === 'AKTIF').length,
        maintenancePending: allEquip.filter((e: any) => e.status === 'BAKIM_BEKLIYOR' || e.status === 'BAKIMDA').length,
        calibrationPending: allEquip.filter((e: any) => e.status === 'KALIBRASYON_BEKLIYOR' || e.status === 'KALIBRASYONDA').length,
        faulty: allEquip.filter((e: any) => e.status === 'ARIZALI').length,
      });
    } catch (error) {
      console.error('Error fetching equipment:', error);
      toast.error('Ekipmanlar yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/equipment-categories');
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/departments');
      if (res?.ok) {
        const data = await res?.json?.();
        setDepartments(data?.departments ?? []);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
      setDepartments([]);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      const users = data.users || data;
      setUsers(Array.isArray(users) ? users : []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    }
  };

  useEffect(() => {
    fetchEquipment();
    fetchCategories();
    fetchDepartments();
    fetchUsers();
  }, [page, search, statusFilter, categoryFilter, departmentFilter]);

  const uploadPhoto = async (file: File): Promise<string | null> => {
    try {
      const presignedRes = await fetch('/api/upload/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType: file.type, isPublic: true }),
      });
      if (!presignedRes.ok) return null;
      const { uploadUrl, cloud_storage_path } = await presignedRes.json();
      const uploadRes = await fetch(uploadUrl, { method: 'PUT', body: file });
      if (!uploadRes.ok) return null;
      return cloud_storage_path;
    } catch {
      return null;
    }
  };

  const handleCreate = async () => {
    if (!formData.name) {
      toast.error('Ekipman adı gereklidir');
      return;
    }

    try {
      let imageUrl: string | null = null;
      if (photoFile) {
        imageUrl = await uploadPhoto(photoFile);
        if (!imageUrl) {
          toast.error('Fotoğraf yüklenemedi');
          return;
        }
      }

      const res = await fetch('/api/equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          maintenanceFrequency: formData.maintenanceFrequency ? parseInt(formData.maintenanceFrequency) : null,
          calibrationFrequency: formData.calibrationFrequency ? parseInt(formData.calibrationFrequency) : null,
          lastCalibrationDate: formData.lastCalibrationDate || null,
          imageUrl,
        }),
      });

      if (res.ok) {
        toast.success('Ekipman oluşturuldu');
        setDialogOpen(false);
        setPhotoFile(null);
        setPhotoPreview(null);
        setFormData({
          name: '',
          description: '',
          categoryId: '',
          departmentId: '',
          location: '',
          serialNumber: '',
          model: '',
          manufacturer: '',
          maintenanceFrequency: '',
          requiresCalibration: false,
          calibrationFrequency: '',
          lastCalibrationDate: '',
          ownerId: '',
        });
        fetchEquipment();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Ekipman oluşturulamadı');
      }
    } catch (error) {
      console.error('Error creating equipment:', error);
      toast.error('Ekipman oluşturulurken hata oluştu');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Ekipman Yönetimi</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => router.push('/dashboard/equipment/calendar')}
            className="border-orange-300 text-orange-600 hover:bg-orange-50"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Kalibrasyon Takvimi
          </Button>
          <ExportButton
            data={equipment.map((e: any) => ({
              code: e.code,
              name: e.name,
              status: statusLabels[e.status] || e.status,
              category: e.category?.name || '-',
              department: e.department?.name || '-',
              location: e.location || '-',
              serialNumber: e.serialNumber || '-',
              manufacturer: e.manufacturer || '-',
              model: e.model || '-',
              purchaseDate: formatDate(e.purchaseDate),
              nextMaintenanceDate: formatDate(e.nextMaintenanceDate),
              nextCalibrationDate: formatDate(e.nextCalibrationDate),
            }))}
            columns={[
              { header: 'Kod', key: 'code', width: 15 },
              { header: 'Ad', key: 'name', width: 20 },
              { header: 'Durum', key: 'status', width: 12 },
              { header: 'Kategori', key: 'category', width: 12 },
              { header: 'Departman', key: 'department', width: 15 },
              { header: 'Konum', key: 'location', width: 15 },
              { header: 'Seri No', key: 'serialNumber', width: 15 },
              { header: 'Üretici', key: 'manufacturer', width: 12 },
              { header: 'Model', key: 'model', width: 12 },
              { header: 'Bakım Tarihi', key: 'nextMaintenanceDate', width: 12 },
              { header: 'Kalibrasyon', key: 'nextCalibrationDate', width: 12 },
            ]}
            fileName="ekipman-listesi"
            title="Ekipman Listesi"
          />
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Yeni Ekipman
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Yeni Ekipman Oluştur</DialogTitle>
              </DialogHeader>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="col-span-2">
                <Label>Ekipman Adı *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ekipman adını girin"
                />
              </div>
              <div className="col-span-2">
                <Label>Açıklama</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ekipman açıklaması"
                  rows={2}
                />
              </div>
              <div className="col-span-2">
                <Label>Fotoğraf</Label>
                {photoPreview ? (
                  <div className="relative mt-1 inline-block">
                    <img src={photoPreview} alt="Önizleme" className="h-32 w-auto rounded border object-cover" />
                    <button
                      type="button"
                      onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label className="mt-1 flex items-center gap-2 cursor-pointer border border-dashed border-gray-300 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <ImageIcon className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-500">Fotoğraf seçmek için tıklayın (JPG, PNG)</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setPhotoFile(file);
                          setPhotoPreview(URL.createObjectURL(file));
                        }
                      }}
                    />
                  </label>
                )}
              </div>
              <div>
                <Label>Kategori</Label>
                <Select value={formData.categoryId} onValueChange={(v) => setFormData({ ...formData, categoryId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Kategori seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Departman</Label>
                <Select value={formData.departmentId} onValueChange={(v) => setFormData({ ...formData, departmentId: v })}>
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
              <div>
                <Label>Konum</Label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Konum"
                />
              </div>
              <div>
                <Label>Seri No</Label>
                <Input
                  value={formData.serialNumber}
                  onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                  placeholder="Seri numarası"
                />
              </div>
              <div>
                <Label>Model</Label>
                <Input
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="Model"
                />
              </div>
              <div>
                <Label>Üretici</Label>
                <Input
                  value={formData.manufacturer}
                  onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                  placeholder="Üretici firma"
                />
              </div>
              <div>
                <Label>Bakım Periyodu (Gün)</Label>
                <Input
                  type="number"
                  value={formData.maintenanceFrequency}
                  onChange={(e) => setFormData({ ...formData, maintenanceFrequency: e.target.value })}
                  placeholder="Örn: 90"
                />
              </div>
              <div>
                <Label>Sorumlu</Label>
                <Select value={formData.ownerId} onValueChange={(v) => setFormData({ ...formData, ownerId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sorumlu seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>{user.name} {user.surname}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="requiresCalibration"
                  checked={formData.requiresCalibration}
                  onChange={(e) => setFormData({ ...formData, requiresCalibration: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="requiresCalibration">Kalibrasyon Gerekli</Label>
              </div>
              {formData.requiresCalibration && (
                <>
                  <div>
                    <Label>Kalibrasyon Periyodu (Gün)</Label>
                    <Input
                      type="number"
                      value={formData.calibrationFrequency}
                      onChange={(e) => setFormData({ ...formData, calibrationFrequency: e.target.value })}
                      placeholder="Örn: 365"
                    />
                  </div>
                  <div>
                    <Label>Son Kalibrasyon Tarihi</Label>
                    <Input
                      type="date"
                      value={formData.lastCalibrationDate}
                      onChange={(e) => setFormData({ ...formData, lastCalibrationDate: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Bir sonraki kalibrasyon tarihi bu tarihe göre hesaplanır</p>
                  </div>
                </>
              )}
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Vazgeç</Button>
              <Button onClick={handleCreate}>Oluştur</Button>
            </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">Toplam Ekipman</p>
                <p className="text-2xl font-bold text-blue-800">{stats.total}</p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">Aktif</p>
                <p className="text-2xl font-bold text-green-800">{stats.active}</p>
              </div>
              <Building2 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-600">Bakım Bekliyor</p>
                <p className="text-2xl font-bold text-yellow-800">{stats.maintenancePending}</p>
              </div>
              <Wrench className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600">Kalibrasyon Bekliyor</p>
                <p className="text-2xl font-bold text-orange-800">{stats.calibrationPending}</p>
              </div>
              <Gauge className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-red-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600">Arızalı</p>
                <p className="text-2xl font-bold text-red-800">{stats.faulty}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtreler */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Kod, ad veya seri no ile ara..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Tüm Durumlar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Durumlar</SelectItem>
                {Object.entries(statusLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1); }}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Tüm Kategoriler" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Kategoriler</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isAdmin && (
              <Select value={departmentFilter} onValueChange={(v) => { setDepartmentFilter(v); setPage(1); }}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Tüm Departmanlar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Departmanlar</SelectItem>
                  {departments.map((dep) => (
                    <SelectItem key={dep.id} value={dep.id}>{dep.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Ekipman Tablosu */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kod</TableHead>
                <TableHead>Ad</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Konum</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Durumu</TableHead>
                <TableHead>Bakım</TableHead>
                <TableHead>Kalibrasyon</TableHead>
                <TableHead>Sorumlu</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    Yükleniyor...
                  </TableCell>
                </TableRow>
              ) : equipment.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                    Ekipman bulunamadı
                  </TableCell>
                </TableRow>
              ) : (
                equipment.map((eq) => (
                  <TableRow
                    key={eq.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => router.push(`/dashboard/equipment/${eq.id}`)}
                  >
                    <TableCell className="font-mono text-sm">{eq.code}</TableCell>
                    <TableCell className="font-medium">{eq.name}</TableCell>
                    <TableCell>
                      {eq.category && (
                        <Badge variant="outline" style={{ borderColor: eq.category.color, color: eq.category.color }}>
                          {eq.category.name}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{eq.location || '-'}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[eq.status]}>
                        {statusLabels[eq.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>{conditionLabels[eq.condition] || eq.condition}</TableCell>
                    <TableCell>{eq._count?.maintenances || 0}</TableCell>
                    <TableCell>{eq._count?.calibrations || 0}</TableCell>
                    <TableCell>{eq.owner ? `${eq.owner.name} ${eq.owner.surname || ''}` : '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Sayfalama */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-gray-600">
            Sayfa {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
