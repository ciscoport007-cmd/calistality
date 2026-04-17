'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Package, Wrench, Gauge, History, Edit2, Save, X, Plus, Play, CheckCircle, Calendar, FastForward, FileText, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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

const maintenanceTypeLabels: Record<string, string> = {
  PERIYODIK: 'Periyodik',
  ARIZALI: 'Arıza',
  ONLEYICI: 'Önleyici',
  DUZELTUCU: 'Düzeltücü',
  REVIZYON: 'Revizyon',
};

const maintenanceStatusLabels: Record<string, string> = {
  PLANLI: 'Planlı',
  DEVAM_EDIYOR: 'Devam Ediyor',
  TAMAMLANDI: 'Tamamlandı',
  IPTAL: 'İptal',
  ERTELENDI: 'Ertelendi',
};

const calibrationTypeLabels: Record<string, string> = {
  IC_KALIBRASYON: 'İç Kalibrasyon',
  DIS_KALIBRASYON: 'Dış Kalibrasyon',
  DOGRULAMA: 'Doğrulama',
};

const calibrationStatusLabels: Record<string, string> = {
  PLANLI: 'Planlı',
  DEVAM_EDIYOR: 'Devam Ediyor',
  TAMAMLANDI: 'Tamamlandı',
  BASARISIZ: 'Başarısız',
  IPTAL: 'İptal',
};

const actionLabels: Record<string, string> = {
  OLUSTURULDU: 'Oluşturuldu',
  GUNCELLENDI: 'Güncellendi',
  BAKIM_PLANLANDI: 'Bakım Planlandı',
  BAKIM_TAMAMLANDI: 'Bakım Tamamlandı',
  KALIBRASYON_YAPILDI: 'Kalibrasyon Yapıldı',
  DURUM_DEGISTI: 'Durum Değişti',
  DEVRE_DISI_BIRAKILDI: 'Devre Dışı Bırakıldı',
  AKTIF_EDILDI: 'Aktif Edildi',
};

export default function EquipmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [equipment, setEquipment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [categories, setCategories] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = useState(false);
  const [calibrationDialogOpen, setCalibrationDialogOpen] = useState(false);
  const [maintenanceForm, setMaintenanceForm] = useState({
    maintenanceType: '',
    title: '',
    description: '',
    priority: 'ORTA',
    plannedDate: '',
    technicianId: '',
    performedByType: 'INTERNAL' as 'INTERNAL' | 'EXTERNAL',
    externalCompany: '',
  });
  const [calibrationForm, setCalibrationForm] = useState({
    calibrationType: '',
    title: '',
    description: '',
    referenceStandard: '',
    plannedDate: '',
    calibratorId: '',
    externalProvider: '',
    certificateNumber: '',
    performedByType: 'INTERNAL' as 'INTERNAL' | 'EXTERNAL',
  });
  const [photoUploading, setPhotoUploading] = useState(false);
  const [earlyCalibrationDialogOpen, setEarlyCalibrationDialogOpen] = useState(false);
  const [completeCalibrationDialogOpen, setCompleteCalibrationDialogOpen] = useState(false);
  const [selectedCalibration, setSelectedCalibration] = useState<any>(null);
  const [calibrationCompleteForm, setCalibrationCompleteForm] = useState({
    calibrationDate: '',
    certificateNumber: '',
    validUntilDate: '',
    result: '',
    isAccepted: true,
    rejectionReason: '',
    nextCalibrationDate: '',
  });

  const fetchEquipment = async () => {
    try {
      const res = await fetch(`/api/equipment/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setEquipment(data);
        setEditData(data);
      } else {
        toast.error('Ekipman bulunamadı');
        router.push('/dashboard/equipment');
      }
    } catch (error) {
      console.error('Error fetching equipment:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMasterData = async () => {
    try {
      const [catRes, deptRes, userRes] = await Promise.all([
        fetch('/api/equipment-categories'),
        fetch('/api/departments'),
        fetch('/api/users'),
      ]);
      setCategories(await catRes.json() || []);
      if (deptRes?.ok) {
        const deptData = await deptRes?.json?.();
        setDepartments(deptData?.departments ?? []);
      }
      if (userRes?.ok) {
        const userData = await userRes?.json?.();
        setUsers(userData?.users ?? []);
      }
    } catch (error) {
      console.error('Error fetching master data:', error);
    }
  };

  useEffect(() => {
    fetchEquipment();
    fetchMasterData();
  }, [params.id]);

  const handleSave = async () => {
    try {
      const res = await fetch(`/api/equipment/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      });

      if (res.ok) {
        toast.success('Ekipman güncellendi');
        setEditing(false);
        fetchEquipment();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Güncelleme başarısız');
      }
    } catch (error) {
      toast.error('Güncelleme sırasında hata oluştu');
    }
  };

  const handlePhotoUpload = async (file: File) => {
    setPhotoUploading(true);
    try {
      const presignedRes = await fetch('/api/upload/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType: file.type, isPublic: true }),
      });
      if (!presignedRes.ok) throw new Error('Presigned URL alınamadı');
      const { uploadUrl, cloud_storage_path } = await presignedRes.json();
      const uploadRes = await fetch(uploadUrl, { method: 'PUT', body: file });
      if (!uploadRes.ok) throw new Error('Dosya yüklenemedi');

      const patchRes = await fetch(`/api/equipment/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: cloud_storage_path }),
      });
      if (!patchRes.ok) throw new Error('Kayıt güncellenemedi');

      toast.success('Fotoğraf güncellendi');
      fetchEquipment();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Fotoğraf yüklenemedi');
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleCreateMaintenance = async () => {
    if (!maintenanceForm.title || !maintenanceForm.maintenanceType) {
      toast.error('Başlık ve bakım tipi gereklidir');
      return;
    }

    try {
      const res = await fetch(`/api/equipment/${params.id}/maintenance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(maintenanceForm),
      });

      if (res.ok) {
        toast.success('Bakım kaydı oluşturuldu');
        setMaintenanceDialogOpen(false);
        setMaintenanceForm({
          maintenanceType: '',
          title: '',
          description: '',
          priority: 'ORTA',
          plannedDate: '',
          technicianId: '',
          performedByType: 'INTERNAL',
          externalCompany: '',
        });
        fetchEquipment();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Bakım oluşturulamadı');
      }
    } catch (error) {
      toast.error('Hata oluştu');
    }
  };

  const handleUpdateMaintenance = async (maintenanceId: string, status: string) => {
    try {
      const res = await fetch(`/api/equipment/${params.id}/maintenance`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maintenanceId, status }),
      });

      if (res.ok) {
        toast.success('Bakım güncellendi');
        fetchEquipment();
      } else {
        toast.error('Güncelleme başarısız');
      }
    } catch (error) {
      toast.error('Hata oluştu');
    }
  };

  const handleCreateCalibration = async () => {
    if (!calibrationForm.title || !calibrationForm.calibrationType) {
      toast.error('Başlık ve kalibrasyon tipi gereklidir');
      return;
    }

    try {
      const res = await fetch(`/api/equipment/${params.id}/calibration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(calibrationForm),
      });

      if (res.ok) {
        toast.success('Kalibrasyon kaydı oluşturuldu');
        setCalibrationDialogOpen(false);
        setCalibrationForm({
          calibrationType: '',
          title: '',
          description: '',
          referenceStandard: '',
          plannedDate: '',
          calibratorId: '',
          externalProvider: '',
          certificateNumber: '',
          performedByType: 'INTERNAL',
        });
        fetchEquipment();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Kalibrasyon oluşturulamadı');
      }
    } catch (error) {
      toast.error('Hata oluştu');
    }
  };

  const handleEarlyCalibration = async () => {
    if (!calibrationForm.title || !calibrationForm.calibrationType) {
      toast.error('Başlık ve kalibrasyon tipi gereklidir');
      return;
    }

    try {
      const res = await fetch(`/api/equipment/${params.id}/calibration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...calibrationForm,
          isEarlyCalibration: true,
        }),
      });

      if (res.ok) {
        toast.success('Erken kalibrasyon kaydı oluşturuldu');
        setEarlyCalibrationDialogOpen(false);
        setCalibrationForm({
          calibrationType: '',
          title: '',
          description: '',
          referenceStandard: '',
          plannedDate: '',
          calibratorId: '',
          externalProvider: '',
          certificateNumber: '',
          performedByType: 'INTERNAL',
        });
        fetchEquipment();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Erken kalibrasyon oluşturulamadı');
      }
    } catch (error) {
      toast.error('Hata oluştu');
    }
  };

  const handleCompleteCalibration = async () => {
    if (!selectedCalibration) return;

    try {
      const res = await fetch(`/api/equipment/${params.id}/calibration`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calibrationId: selectedCalibration.id,
          status: 'TAMAMLANDI',
          ...calibrationCompleteForm,
          isAccepted: calibrationCompleteForm.isAccepted,
        }),
      });

      if (res.ok) {
        toast.success('Kalibrasyon tamamlandı');
        setCompleteCalibrationDialogOpen(false);
        setSelectedCalibration(null);
        setCalibrationCompleteForm({
          calibrationDate: '',
          certificateNumber: '',
          validUntilDate: '',
          result: '',
          isAccepted: true,
          rejectionReason: '',
          nextCalibrationDate: '',
        });
        fetchEquipment();
      } else {
        toast.error('Güncelleme başarısız');
      }
    } catch (error) {
      toast.error('Hata oluştu');
    }
  };

  const openCompleteDialog = (calibration: any) => {
    setSelectedCalibration(calibration);
    // Varsayılan sonraki kalibrasyon tarihini hesapla
    const nextDate = new Date();
    if (equipment?.calibrationFrequency) {
      nextDate.setDate(nextDate.getDate() + equipment.calibrationFrequency);
    } else {
      nextDate.setFullYear(nextDate.getFullYear() + 1);
    }
    setCalibrationCompleteForm({
      calibrationDate: new Date().toISOString().split('T')[0],
      certificateNumber: '',
      validUntilDate: nextDate.toISOString().split('T')[0],
      result: 'UYGUN',
      isAccepted: true,
      rejectionReason: '',
      nextCalibrationDate: nextDate.toISOString().split('T')[0],
    });
    setCompleteCalibrationDialogOpen(true);
  };

  const handleUpdateCalibration = async (calibrationId: string, status: string, isAccepted?: boolean) => {
    try {
      const res = await fetch(`/api/equipment/${params.id}/calibration`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calibrationId, status, isAccepted }),
      });

      if (res.ok) {
        toast.success('Kalibrasyon güncellendi');
        fetchEquipment();
      } else {
        toast.error('Güncelleme başarısız');
      }
    } catch (error) {
      toast.error('Hata oluştu');
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('tr-TR');
  };

  if (loading) {
    return <div className="p-6">Yükleniyor...</div>;
  }

  if (!equipment) {
    return <div className="p-6">Ekipman bulunamadı</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Üst Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => router.push('/dashboard/equipment')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Geri
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{equipment.name}</h1>
            <p className="text-sm text-gray-500 font-mono">{equipment.code}</p>
          </div>
        </div>
        <Badge className={statusColors[equipment.status]}>
          {statusLabels[equipment.status]}
        </Badge>
      </div>

      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details" className="flex items-center">
            <Package className="h-4 w-4 mr-2" />Detaylar
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="flex items-center">
            <Wrench className="h-4 w-4 mr-2" />Bakım ({equipment.maintenances?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="calibration" className="flex items-center">
            <Gauge className="h-4 w-4 mr-2" />Kalibrasyon ({equipment.calibrations?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center">
            <History className="h-4 w-4 mr-2" />Tarihçe
          </TabsTrigger>
        </TabsList>

        {/* Detaylar */}
        <TabsContent value="details">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Ekipman Bilgileri</CardTitle>
              {editing ? (
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={() => { setEditing(false); setEditData(equipment); }}>
                    <X className="h-4 w-4 mr-1" /> İptal
                  </Button>
                  <Button size="sm" onClick={handleSave}>
                    <Save className="h-4 w-4 mr-1" /> Kaydet
                  </Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                  <Edit2 className="h-4 w-4 mr-1" /> Düzenle
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {/* Fotoğraf */}
              <div className="mb-6 flex items-start gap-4">
                <div className="flex-shrink-0">
                  {equipment.imageUrl ? (
                    <img
                      src={`/${equipment.imageUrl.replace('public/', '')}`}
                      alt={equipment.name}
                      className="h-40 w-40 rounded-lg border object-cover shadow-sm"
                    />
                  ) : (
                    <div className="h-40 w-40 rounded-lg border bg-gray-50 flex flex-col items-center justify-center gap-2 text-gray-400">
                      <ImageIcon className="w-10 h-10" />
                      <span className="text-xs">Fotoğraf yok</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2 justify-end mt-auto">
                  <label className={`cursor-pointer inline-flex items-center gap-2 px-3 py-2 text-sm border rounded-md hover:bg-gray-50 transition-colors ${photoUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                    <ImageIcon className="w-4 h-4" />
                    {photoUploading ? 'Yükleniyor...' : equipment.imageUrl ? 'Fotoğrafı Değiştir' : 'Fotoğraf Ekle'}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      disabled={photoUploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handlePhotoUpload(file);
                      }}
                    />
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label className="text-gray-500">Ad</Label>
                  {editing ? (
                    <Input value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} />
                  ) : (
                    <p className="font-medium">{equipment.name}</p>
                  )}
                </div>
                <div>
                  <Label className="text-gray-500">Kategori</Label>
                  {editing ? (
                    <Select value={editData.categoryId || ''} onValueChange={(v) => setEditData({ ...editData, categoryId: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Kategori seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="font-medium">{equipment.category?.name || '-'}</p>
                  )}
                </div>
                <div>
                  <Label className="text-gray-500">Departman</Label>
                  {editing ? (
                    <Select value={editData.departmentId || ''} onValueChange={(v) => setEditData({ ...editData, departmentId: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Departman seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="font-medium">{equipment.department?.name || '-'}</p>
                  )}
                </div>
                <div>
                  <Label className="text-gray-500">Konum</Label>
                  {editing ? (
                    <Input value={editData.location || ''} onChange={(e) => setEditData({ ...editData, location: e.target.value })} />
                  ) : (
                    <p className="font-medium">{equipment.location || '-'}</p>
                  )}
                </div>
                <div>
                  <Label className="text-gray-500">Seri No</Label>
                  {editing ? (
                    <Input value={editData.serialNumber || ''} onChange={(e) => setEditData({ ...editData, serialNumber: e.target.value })} />
                  ) : (
                    <p className="font-medium">{equipment.serialNumber || '-'}</p>
                  )}
                </div>
                <div>
                  <Label className="text-gray-500">Model</Label>
                  {editing ? (
                    <Input value={editData.model || ''} onChange={(e) => setEditData({ ...editData, model: e.target.value })} />
                  ) : (
                    <p className="font-medium">{equipment.model || '-'}</p>
                  )}
                </div>
                <div>
                  <Label className="text-gray-500">Üretici</Label>
                  {editing ? (
                    <Input value={editData.manufacturer || ''} onChange={(e) => setEditData({ ...editData, manufacturer: e.target.value })} />
                  ) : (
                    <p className="font-medium">{equipment.manufacturer || '-'}</p>
                  )}
                </div>
                <div>
                  <Label className="text-gray-500">Durum</Label>
                  {editing ? (
                    <Select value={editData.status} onValueChange={(v) => setEditData({ ...editData, status: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(statusLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge className={statusColors[equipment.status]}>{statusLabels[equipment.status]}</Badge>
                  )}
                </div>
                <div>
                  <Label className="text-gray-500">Fiziksel Durumu</Label>
                  {editing ? (
                    <Select value={editData.condition} onValueChange={(v) => setEditData({ ...editData, condition: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(conditionLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="font-medium">{conditionLabels[equipment.condition]}</p>
                  )}
                </div>
                <div>
                  <Label className="text-gray-500">Sorumlu</Label>
                  {editing ? (
                    <Select value={editData.ownerId || ''} onValueChange={(v) => setEditData({ ...editData, ownerId: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sorumlu seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>{user.name} {user.surname}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="font-medium">{equipment.owner ? `${equipment.owner.name} ${equipment.owner.surname || ''}` : '-'}</p>
                  )}
                </div>
                <div className="col-span-2">
                  <Label className="text-gray-500">Açıklama</Label>
                  {editing ? (
                    <Textarea value={editData.description || ''} onChange={(e) => setEditData({ ...editData, description: e.target.value })} rows={3} />
                  ) : (
                    <p className="font-medium">{equipment.description || '-'}</p>
                  )}
                </div>
              </div>

              {/* Bakım ve Kalibrasyon Bilgileri */}
              <div className="mt-6 pt-6 border-t">
                <h3 className="font-semibold mb-4">Bakım & Kalibrasyon Bilgileri</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label className="text-gray-500">Bakım Periyodu (gün)</Label>
                    {editing ? (
                      <Input 
                        type="number" 
                        min="0"
                        value={editData.maintenanceFrequency || ''} 
                        onChange={(e) => setEditData({ ...editData, maintenanceFrequency: e.target.value ? parseInt(e.target.value) : null })} 
                        placeholder="Örn: 90"
                      />
                    ) : (
                      <p className="font-medium">{equipment.maintenanceFrequency ? `${equipment.maintenanceFrequency} gün` : '-'}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-gray-500">Son Bakım</Label>
                    <p className="font-medium">{formatDate(equipment.lastMaintenanceDate)}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Sonraki Bakım</Label>
                    <p className="font-medium">{formatDate(equipment.nextMaintenanceDate)}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Kalibrasyon Gerekli</Label>
                    {editing ? (
                      <Select value={editData.requiresCalibration ? 'true' : 'false'} onValueChange={(v) => setEditData({ ...editData, requiresCalibration: v === 'true' })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">Evet</SelectItem>
                          <SelectItem value="false">Hayır</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="font-medium">{equipment.requiresCalibration ? 'Evet' : 'Hayır'}</p>
                    )}
                  </div>
                  {(editing ? editData.requiresCalibration : equipment.requiresCalibration) && (
                    <>
                      <div>
                        <Label className="text-gray-500">Kalibrasyon Periyodu (gün)</Label>
                        {editing ? (
                          <Input 
                            type="number"
                            min="0"
                            value={editData.calibrationFrequency || ''} 
                            onChange={(e) => setEditData({ ...editData, calibrationFrequency: e.target.value ? parseInt(e.target.value) : null })} 
                            placeholder="Örn: 365"
                          />
                        ) : (
                          <p className="font-medium">{equipment.calibrationFrequency ? `${equipment.calibrationFrequency} gün` : '-'}</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-gray-500">Son Kalibrasyon</Label>
                        <p className="font-medium">{formatDate(equipment.lastCalibrationDate)}</p>
                      </div>
                      <div>
                        <Label className="text-gray-500">Sonraki Kalibrasyon</Label>
                        <p className="font-medium">{formatDate(equipment.nextCalibrationDate)}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Satın Alma ve Garanti Bilgileri */}
              <div className="mt-6 pt-6 border-t">
                <h3 className="font-semibold mb-4">Satın Alma & Garanti Bilgileri</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label className="text-gray-500">Satın Alma Tarihi</Label>
                    {editing ? (
                      <Input 
                        type="date" 
                        value={editData.purchaseDate ? new Date(editData.purchaseDate).toISOString().split('T')[0] : ''} 
                        onChange={(e) => setEditData({ ...editData, purchaseDate: e.target.value || null })} 
                      />
                    ) : (
                      <p className="font-medium">{formatDate(equipment.purchaseDate)}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-gray-500">Kurulum Tarihi</Label>
                    {editing ? (
                      <Input 
                        type="date" 
                        value={editData.installationDate ? new Date(editData.installationDate).toISOString().split('T')[0] : ''} 
                        onChange={(e) => setEditData({ ...editData, installationDate: e.target.value || null })} 
                      />
                    ) : (
                      <p className="font-medium">{formatDate(equipment.installationDate)}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-gray-500">Garanti Bitiş</Label>
                    {editing ? (
                      <Input 
                        type="date" 
                        value={editData.warrantyEndDate ? new Date(editData.warrantyEndDate).toISOString().split('T')[0] : ''} 
                        onChange={(e) => setEditData({ ...editData, warrantyEndDate: e.target.value || null })} 
                      />
                    ) : (
                      <p className="font-medium">{formatDate(equipment.warrantyEndDate)}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-gray-500">Satın Alma Maliyeti</Label>
                    {editing ? (
                      <Input 
                        type="number"
                        min="0"
                        step="0.01"
                        value={editData.purchaseCost || ''} 
                        onChange={(e) => setEditData({ ...editData, purchaseCost: e.target.value ? parseFloat(e.target.value) : null })} 
                        placeholder="0.00"
                      />
                    ) : (
                      <p className="font-medium">{equipment.purchaseCost ? `${equipment.purchaseCost.toLocaleString('tr-TR')} ₺` : '-'}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-gray-500">Güncel Değer</Label>
                    {editing ? (
                      <Input 
                        type="number"
                        min="0"
                        step="0.01"
                        value={editData.currentValue || ''} 
                        onChange={(e) => setEditData({ ...editData, currentValue: e.target.value ? parseFloat(e.target.value) : null })} 
                        placeholder="0.00"
                      />
                    ) : (
                      <p className="font-medium">{equipment.currentValue ? `${equipment.currentValue.toLocaleString('tr-TR')} ₺` : '-'}</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bakım */}
        <TabsContent value="maintenance">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Bakım Kayıtları</CardTitle>
              <Dialog open={maintenanceDialogOpen} onOpenChange={setMaintenanceDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />Yeni Bakım
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Yeni Bakım Kaydı</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 mt-4">
                    <div>
                      <Label>Bakım Tipi *</Label>
                      <Select value={maintenanceForm.maintenanceType} onValueChange={(v) => setMaintenanceForm({ ...maintenanceForm, maintenanceType: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Bakım tipi seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(maintenanceTypeLabels).map(([key, label]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Başlık *</Label>
                      <Input
                        value={maintenanceForm.title}
                        onChange={(e) => setMaintenanceForm({ ...maintenanceForm, title: e.target.value })}
                        placeholder="Bakım başlığı"
                      />
                    </div>
                    <div>
                      <Label>Açıklama</Label>
                      <Textarea
                        value={maintenanceForm.description}
                        onChange={(e) => setMaintenanceForm({ ...maintenanceForm, description: e.target.value })}
                        placeholder="Bakım açıklaması"
                      />
                    </div>
                    <div>
                      <Label>Planlanan Tarih</Label>
                      <Input
                        type="date"
                        value={maintenanceForm.plannedDate}
                        onChange={(e) => setMaintenanceForm({ ...maintenanceForm, plannedDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Bakımı Yapan</Label>
                      <Select value={maintenanceForm.performedByType} onValueChange={(v) => {
                        if (v === 'EXTERNAL') {
                          setMaintenanceForm({ ...maintenanceForm, performedByType: 'EXTERNAL' as const, technicianId: '' });
                        } else {
                          setMaintenanceForm({ ...maintenanceForm, performedByType: 'INTERNAL' as const, externalCompany: '' });
                        }
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="INTERNAL">İç Personel</SelectItem>
                          <SelectItem value="EXTERNAL">Dış Firma</SelectItem>
                        </SelectContent>
                      </Select>
                      {maintenanceForm.performedByType === 'INTERNAL' ? (
                        <div className="mt-2">
                          <Select value={maintenanceForm.technicianId} onValueChange={(v) => setMaintenanceForm({ ...maintenanceForm, technicianId: v })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Teknisyen seçin" />
                            </SelectTrigger>
                            <SelectContent>
                              {users.map((user) => (
                                <SelectItem key={user.id} value={user.id}>{user.name} {user.surname}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        <div className="mt-2">
                          <Input
                            value={maintenanceForm.externalCompany}
                            onChange={(e) => setMaintenanceForm({ ...maintenanceForm, externalCompany: e.target.value })}
                            placeholder="Dış firma adı girin"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2 mt-4">
                    <Button variant="outline" onClick={() => setMaintenanceDialogOpen(false)}>Vazgeç</Button>
                    <Button onClick={handleCreateMaintenance}>Oluştur</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kod</TableHead>
                    <TableHead>Başlık</TableHead>
                    <TableHead>Tip</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Planlı Tarih</TableHead>
                    <TableHead>Bakımı Yapan</TableHead>
                    <TableHead>İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {equipment.maintenances?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">Bakım kaydı bulunamadı</TableCell>
                    </TableRow>
                  ) : (
                    equipment.maintenances?.map((m: any) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-mono text-sm">{m.code}</TableCell>
                        <TableCell>{m.title}</TableCell>
                        <TableCell>{maintenanceTypeLabels[m.maintenanceType]}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{maintenanceStatusLabels[m.status]}</Badge>
                        </TableCell>
                        <TableCell>{formatDate(m.plannedDate)}</TableCell>
                        <TableCell>{m.technician ? `${m.technician.name} ${m.technician.surname || ''}` : m.externalCompany ? `🏢 ${m.externalCompany}` : '-'}</TableCell>
                        <TableCell>
                          {m.status === 'PLANLI' && (
                            <Button size="sm" variant="outline" onClick={() => handleUpdateMaintenance(m.id, 'DEVAM_EDIYOR')}>
                              <Play className="h-3 w-3 mr-1" />Başlat
                            </Button>
                          )}
                          {m.status === 'DEVAM_EDIYOR' && (
                            <Button size="sm" variant="outline" onClick={() => handleUpdateMaintenance(m.id, 'TAMAMLANDI')}>
                              <CheckCircle className="h-3 w-3 mr-1" />Tamamla
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Kalibrasyon */}
        <TabsContent value="calibration">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Kalibrasyon Kayıtları</CardTitle>
              <div className="flex space-x-2">
                {/* Erken Kalibrasyon Butonu */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setEarlyCalibrationDialogOpen(true)}
                        className="text-orange-600 border-orange-300 hover:bg-orange-50"
                      >
                        <FastForward className="h-4 w-4 mr-2" />Erken Kalibrasyon
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Planlanan tarihten önce kalibrasyon başlat</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* Takvim Butonu */}
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => router.push('/dashboard/equipment/calendar')}
                >
                  <Calendar className="h-4 w-4 mr-2" />Takvim
                </Button>

                {/* Yeni Kalibrasyon Dialog */}
                <Dialog open={calibrationDialogOpen} onOpenChange={setCalibrationDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />Yeni Kalibrasyon
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Yeni Kalibrasyon Kaydı</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 mt-4">
                      <div>
                        <Label>Kalibrasyon Tipi *</Label>
                        <Select value={calibrationForm.calibrationType} onValueChange={(v) => setCalibrationForm({ ...calibrationForm, calibrationType: v })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Kalibrasyon tipi seçin" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(calibrationTypeLabels).map(([key, label]) => (
                              <SelectItem key={key} value={key}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Başlık *</Label>
                        <Input
                          value={calibrationForm.title}
                          onChange={(e) => setCalibrationForm({ ...calibrationForm, title: e.target.value })}
                          placeholder="Kalibrasyon başlığı"
                        />
                      </div>
                      <div>
                        <Label>Referans Standart</Label>
                        <Input
                          value={calibrationForm.referenceStandard}
                          onChange={(e) => setCalibrationForm({ ...calibrationForm, referenceStandard: e.target.value })}
                          placeholder="ISO 9001, vb."
                        />
                      </div>
                      <div>
                        <Label>Planlanan Tarih</Label>
                        <Input
                          type="date"
                          value={calibrationForm.plannedDate}
                          onChange={(e) => setCalibrationForm({ ...calibrationForm, plannedDate: e.target.value })}
                        />
                      </div>
                      {calibrationForm.calibrationType === 'DIS_KALIBRASYON' && (
                        <div>
                          <Label>Dış Kuruluş</Label>
                          <Input
                            value={calibrationForm.externalProvider}
                            onChange={(e) => setCalibrationForm({ ...calibrationForm, externalProvider: e.target.value })}
                            placeholder="Kalibrasyon kuruluşu"
                          />
                        </div>
                      )}
                      <div>
                        <Label>Kalibrasyon Yapan</Label>
                        <Select value={calibrationForm.performedByType} onValueChange={(v) => {
                          if (v === 'EXTERNAL') {
                            setCalibrationForm({ ...calibrationForm, performedByType: 'EXTERNAL' as const, calibratorId: '' });
                          } else {
                            setCalibrationForm({ ...calibrationForm, performedByType: 'INTERNAL' as const, externalProvider: '' });
                          }
                        }}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seçin" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="INTERNAL">İç Personel</SelectItem>
                            <SelectItem value="EXTERNAL">Dış Firma</SelectItem>
                          </SelectContent>
                        </Select>
                        {calibrationForm.performedByType === 'INTERNAL' ? (
                          <div className="mt-2">
                            <Select value={calibrationForm.calibratorId} onValueChange={(v) => setCalibrationForm({ ...calibrationForm, calibratorId: v })}>
                              <SelectTrigger>
                                <SelectValue placeholder="Kişi seçin" />
                              </SelectTrigger>
                              <SelectContent>
                                {users.map((user) => (
                                  <SelectItem key={user.id} value={user.id}>{user.name} {user.surname}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ) : (
                          <div className="mt-2">
                            <Input
                              value={calibrationForm.externalProvider}
                              onChange={(e) => setCalibrationForm({ ...calibrationForm, externalProvider: e.target.value })}
                              placeholder="Dış firma adı girin"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2 mt-4">
                      <Button variant="outline" onClick={() => setCalibrationDialogOpen(false)}>Vazgeç</Button>
                      <Button onClick={handleCreateCalibration}>Oluştur</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kod</TableHead>
                    <TableHead>Başlık</TableHead>
                    <TableHead>Tip</TableHead>
                    <TableHead>Sertifika No</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Planlı Tarih</TableHead>
                    <TableHead>Sonuç</TableHead>
                    <TableHead>İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {equipment.calibrations?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500">Kalibrasyon kaydı bulunamadı</TableCell>
                    </TableRow>
                  ) : (
                    equipment.calibrations?.map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono text-sm">{c.code}</TableCell>
                        <TableCell>{c.title}</TableCell>
                        <TableCell>{calibrationTypeLabels[c.calibrationType]}</TableCell>
                        <TableCell>
                          {c.certificateNumber ? (
                            <span className="flex items-center">
                              <FileText className="h-3 w-3 mr-1 text-blue-500" />
                              {c.certificateNumber}
                            </span>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{calibrationStatusLabels[c.status]}</Badge>
                        </TableCell>
                        <TableCell>{formatDate(c.plannedDate)}</TableCell>
                        <TableCell>
                          {c.status === 'TAMAMLANDI' && (
                            <Badge className={c.isAccepted ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                              {c.isAccepted ? 'Kabul' : 'Red'}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {c.status === 'PLANLI' && (
                            <Button size="sm" variant="outline" onClick={() => handleUpdateCalibration(c.id, 'DEVAM_EDIYOR')}>
                              <Play className="h-3 w-3 mr-1" />Başlat
                            </Button>
                          )}
                          {c.status === 'DEVAM_EDIYOR' && (
                            <Button size="sm" variant="outline" onClick={() => openCompleteDialog(c)}>
                              <CheckCircle className="h-3 w-3 mr-1" />Tamamla
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Erken Kalibrasyon Dialog */}
          <Dialog open={earlyCalibrationDialogOpen} onOpenChange={setEarlyCalibrationDialogOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center text-orange-600">
                  <FastForward className="h-5 w-5 mr-2" />
                  Erken Kalibrasyon
                </DialogTitle>
              </DialogHeader>
              <p className="text-sm text-gray-600 mb-4">
                Bu işlem, planlanan kalibrasyon tarihinden önce yeni bir kalibrasyon başlatır. 
                Ekipmanın durumu güncellenir ve yeni kalibrasyon kaydı oluşturulur.
              </p>
              <div className="grid gap-4">
                <div>
                  <Label>Kalibrasyon Tipi *</Label>
                  <Select value={calibrationForm.calibrationType} onValueChange={(v) => setCalibrationForm({ ...calibrationForm, calibrationType: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Kalibrasyon tipi seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(calibrationTypeLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Başlık *</Label>
                  <Input
                    value={calibrationForm.title}
                    onChange={(e) => setCalibrationForm({ ...calibrationForm, title: e.target.value })}
                    placeholder="Erken kalibrasyon - [Sebep]"
                  />
                </div>
                <div>
                  <Label>Açıklama (Erken kalibrasyon sebebi)</Label>
                  <Textarea
                    value={calibrationForm.description}
                    onChange={(e) => setCalibrationForm({ ...calibrationForm, description: e.target.value })}
                    placeholder="Neden erken kalibrasyon yapılıyor?"
                    rows={2}
                  />
                </div>
                <div>
                  <Label>Planlanan Tarih</Label>
                  <Input
                    type="date"
                    value={calibrationForm.plannedDate}
                    onChange={(e) => setCalibrationForm({ ...calibrationForm, plannedDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 mt-4">
                <Button variant="outline" onClick={() => setEarlyCalibrationDialogOpen(false)}>Vazgeç</Button>
                <Button onClick={handleEarlyCalibration} className="bg-orange-500 hover:bg-orange-600">
                  <FastForward className="h-4 w-4 mr-2" />Erken Kalibrasyon Başlat
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Kalibrasyon Tamamlama Dialog */}
          <Dialog open={completeCalibrationDialogOpen} onOpenChange={setCompleteCalibrationDialogOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Kalibrasyonu Tamamla</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Kalibrasyon Tarihi *</Label>
                    <Input
                      type="date"
                      value={calibrationCompleteForm.calibrationDate}
                      onChange={(e) => setCalibrationCompleteForm({ ...calibrationCompleteForm, calibrationDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Sertifika Numarası</Label>
                    <Input
                      value={calibrationCompleteForm.certificateNumber}
                      onChange={(e) => setCalibrationCompleteForm({ ...calibrationCompleteForm, certificateNumber: e.target.value })}
                      placeholder="KAL-2026-001"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Geçerlilik Tarihi</Label>
                    <Input
                      type="date"
                      value={calibrationCompleteForm.validUntilDate}
                      onChange={(e) => setCalibrationCompleteForm({ ...calibrationCompleteForm, validUntilDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Sonraki Kalibrasyon</Label>
                    <Input
                      type="date"
                      value={calibrationCompleteForm.nextCalibrationDate}
                      onChange={(e) => setCalibrationCompleteForm({ ...calibrationCompleteForm, nextCalibrationDate: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Sonuç</Label>
                  <Select 
                    value={calibrationCompleteForm.result} 
                    onValueChange={(v) => setCalibrationCompleteForm({ ...calibrationCompleteForm, result: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sonuç seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UYGUN">Uygun</SelectItem>
                      <SelectItem value="UYGUN_DEGIL">Uygun Değil</SelectItem>
                      <SelectItem value="SINIR_DISI">Sınır Dışı</SelectItem>
                      <SelectItem value="ONARILAMAZ">Onarılamaz</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Kalibrasyon Kabul Durumu</Label>
                  <Select 
                    value={calibrationCompleteForm.isAccepted ? 'true' : 'false'} 
                    onValueChange={(v) => setCalibrationCompleteForm({ ...calibrationCompleteForm, isAccepted: v === 'true' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Kabul</SelectItem>
                      <SelectItem value="false">Red</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {!calibrationCompleteForm.isAccepted && (
                  <div>
                    <Label>Red Sebebi</Label>
                    <Textarea
                      value={calibrationCompleteForm.rejectionReason}
                      onChange={(e) => setCalibrationCompleteForm({ ...calibrationCompleteForm, rejectionReason: e.target.value })}
                      placeholder="Neden reddedildi?"
                      rows={2}
                    />
                  </div>
                )}
              </div>
              <div className="flex justify-end space-x-2 mt-4">
                <Button variant="outline" onClick={() => setCompleteCalibrationDialogOpen(false)}>Vazgeç</Button>
                <Button onClick={handleCompleteCalibration}>Tamamla</Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Tarihçe */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Değişiklik Tarihçesi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {equipment.histories?.length === 0 ? (
                  <p className="text-center py-8 text-gray-500">Tarihçe kaydı bulunamadı</p>
                ) : (
                  equipment.histories?.map((h: any) => (
                    <div key={h.id} className="flex items-start space-x-4 p-4 border rounded-lg">
                      <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <History className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{h.user?.name} {h.user?.surname}</span>
                          <span className="text-sm text-gray-500">{new Date(h.createdAt).toLocaleString('tr-TR')}</span>
                        </div>
                        <Badge variant="outline" className="mt-1">{actionLabels[h.action] || h.action}</Badge>
                        {h.comments && <p className="text-sm text-gray-600 mt-2">{h.comments}</p>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
