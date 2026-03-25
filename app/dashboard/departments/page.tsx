'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Building2, Pencil, Trash2, Users, ChevronDown, ChevronRight, Briefcase } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface Position {
  id: string;
  name: string;
  code: string;
  description: string | null;
  level: number;
  isActive: boolean;
  departmentId: string | null;
  _count: { users: number };
}

interface Department {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  positions: Position[];
  _count: { users: number; documents: number; positions: number };
}

export default function DepartmentsPage() {
  const { toast } = useToast();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [formData, setFormData] = useState({ name: '', code: '', description: '' });
  const [editFormData, setEditFormData] = useState({ name: '', code: '', description: '', isActive: true });
  const [submitting, setSubmitting] = useState(false);
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());
  
  // Pozisyon state'leri
  const [positionDialogOpen, setPositionDialogOpen] = useState(false);
  const [editPositionDialogOpen, setEditPositionDialogOpen] = useState(false);
  const [deletePositionDialogOpen, setDeletePositionDialogOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [positionFormData, setPositionFormData] = useState({ name: '', code: '', description: '', level: 0, departmentId: '' });
  const [editPositionFormData, setEditPositionFormData] = useState({ name: '', code: '', description: '', level: 0, isActive: true });

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/departments');
      if (response?.ok) {
        const data = await response?.json?.();
        setDepartments(data?.departments ?? []);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (deptId: string) => {
    setExpandedDepts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(deptId)) {
        newSet.delete(deptId);
      } else {
        newSet.add(deptId);
      }
      return newSet;
    });
  };

  // Departman işlemleri
  const handleSubmit = async (e: React.FormEvent) => {
    e?.preventDefault?.();
    setSubmitting(true);

    try {
      const response = await fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response?.ok) {
        toast({ title: 'Başarılı', description: 'Departman başarıyla oluşturuldu' });
        setDialogOpen(false);
        setFormData({ name: '', code: '', description: '' });
        fetchDepartments();
      } else {
        const data = await response?.json?.();
        toast({ title: 'Hata', description: data?.error || 'Bir hata oluştu', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Hata', description: 'Bir hata oluştu', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (dept: Department) => {
    setSelectedDepartment(dept);
    setEditFormData({
      name: dept.name,
      code: dept.code,
      description: dept.description || '',
      isActive: dept.isActive,
    });
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e?.preventDefault?.();
    if (!selectedDepartment) return;
    setSubmitting(true);

    try {
      const response = await fetch(`/api/departments/${selectedDepartment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData),
      });

      if (response?.ok) {
        toast({ title: 'Başarılı', description: 'Departman başarıyla güncellendi' });
        setEditDialogOpen(false);
        setSelectedDepartment(null);
        fetchDepartments();
      } else {
        const data = await response?.json?.();
        toast({ title: 'Hata', description: data?.error || 'Bir hata oluştu', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Hata', description: 'Bir hata oluştu', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (dept: Department) => {
    setSelectedDepartment(dept);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedDepartment) return;
    setSubmitting(true);

    try {
      const response = await fetch(`/api/departments/${selectedDepartment.id}`, {
        method: 'DELETE',
      });

      if (response?.ok) {
        toast({ title: 'Başarılı', description: 'Departman başarıyla silindi' });
        setDeleteDialogOpen(false);
        setSelectedDepartment(null);
        fetchDepartments();
      } else {
        const data = await response?.json?.();
        toast({ title: 'Hata', description: data?.error || 'Bir hata oluştu', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Hata', description: 'Bir hata oluştu', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // Pozisyon işlemleri
  const handleAddPosition = (dept: Department) => {
    setSelectedDepartment(dept);
    setPositionFormData({ name: '', code: '', description: '', level: 0, departmentId: dept.id });
    setPositionDialogOpen(true);
  };

  const handlePositionSubmit = async (e: React.FormEvent) => {
    e?.preventDefault?.();
    setSubmitting(true);

    try {
      const response = await fetch('/api/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(positionFormData),
      });

      if (response?.ok) {
        toast({ title: 'Başarılı', description: 'Pozisyon başarıyla oluşturuldu' });
        setPositionDialogOpen(false);
        setPositionFormData({ name: '', code: '', description: '', level: 0, departmentId: '' });
        fetchDepartments();
      } else {
        const data = await response?.json?.();
        toast({ title: 'Hata', description: data?.error || 'Bir hata oluştu', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Hata', description: 'Bir hata oluştu', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditPosition = (position: Position) => {
    setSelectedPosition(position);
    setEditPositionFormData({
      name: position.name,
      code: position.code,
      description: position.description || '',
      level: position.level,
      isActive: position.isActive,
    });
    setEditPositionDialogOpen(true);
  };

  const handleEditPositionSubmit = async (e: React.FormEvent) => {
    e?.preventDefault?.();
    if (!selectedPosition) return;
    setSubmitting(true);

    try {
      const response = await fetch(`/api/positions/${selectedPosition.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editPositionFormData),
      });

      if (response?.ok) {
        toast({ title: 'Başarılı', description: 'Pozisyon başarıyla güncellendi' });
        setEditPositionDialogOpen(false);
        setSelectedPosition(null);
        fetchDepartments();
      } else {
        const data = await response?.json?.();
        toast({ title: 'Hata', description: data?.error || 'Bir hata oluştu', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Hata', description: 'Bir hata oluştu', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePositionClick = (position: Position) => {
    setSelectedPosition(position);
    setDeletePositionDialogOpen(true);
  };

  const handleDeletePosition = async () => {
    if (!selectedPosition) return;
    setSubmitting(true);

    try {
      const response = await fetch(`/api/positions/${selectedPosition.id}`, {
        method: 'DELETE',
      });

      if (response?.ok) {
        toast({ title: 'Başarılı', description: 'Pozisyon başarıyla silindi' });
        setDeletePositionDialogOpen(false);
        setSelectedPosition(null);
        fetchDepartments();
      } else {
        const data = await response?.json?.();
        toast({ title: 'Hata', description: data?.error || 'Bir hata oluştu', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Hata', description: 'Bir hata oluştu', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Departman Yönetimi</h1>
          <p className="text-gray-500 mt-2">Departmanları ve pozisyonları yönetin</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Yeni Departman
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Yeni Departman Ekle</DialogTitle>
              <DialogDescription>Departman bilgilerini giriniz.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Departman Adı *</Label>
                <Input
                  value={formData?.name ?? ''}
                  onChange={(e) => setFormData({ ...formData, name: e?.target?.value ?? '' })}
                  required
                />
              </div>
              <div>
                <Label>Departman Kodu *</Label>
                <Input
                  value={formData?.code ?? ''}
                  onChange={(e) => setFormData({ ...formData, code: e?.target?.value ?? '' })}
                  required
                />
              </div>
              <div>
                <Label>Açıklama</Label>
                <Input
                  value={formData?.description ?? ''}
                  onChange={(e) => setFormData({ ...formData, description: e?.target?.value ?? '' })}
                />
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  İptal
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={submitting}>
                  {submitting ? 'Oluşturuluyor...' : 'Oluştur'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Departman Düzenleme Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Departman Düzenle</DialogTitle>
            <DialogDescription>Departman bilgilerini güncelleyin.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <Label>Departman Adı *</Label>
              <Input
                value={editFormData?.name ?? ''}
                onChange={(e) => setEditFormData({ ...editFormData, name: e?.target?.value ?? '' })}
                required
              />
            </div>
            <div>
              <Label>Departman Kodu *</Label>
              <Input
                value={editFormData?.code ?? ''}
                onChange={(e) => setEditFormData({ ...editFormData, code: e?.target?.value ?? '' })}
                required
              />
            </div>
            <div>
              <Label>Açıklama</Label>
              <Input
                value={editFormData?.description ?? ''}
                onChange={(e) => setEditFormData({ ...editFormData, description: e?.target?.value ?? '' })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Aktif Durum</Label>
              <Switch
                checked={editFormData.isActive}
                onCheckedChange={(checked) => setEditFormData({ ...editFormData, isActive: checked })}
              />
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                İptal
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={submitting}>
                {submitting ? 'Kaydediliyor...' : 'Kaydet'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Departman Silme Onay Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Departmanı Sil</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{selectedDepartment?.name}</strong> departmanını silmek istediğinizden emin misiniz?
              {((selectedDepartment?._count?.users ?? 0) > 0 || (selectedDepartment?._count?.documents ?? 0) > 0) && (
                <span className="block mt-2 text-amber-600">
                  ⚠️ Bu departmanda {selectedDepartment?._count?.users} kullanıcı ve {selectedDepartment?._count?.documents} doküman bulunmaktadır.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={submitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {submitting ? 'Siliniyor...' : 'Sil'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Pozisyon Ekleme Dialog */}
      <Dialog open={positionDialogOpen} onOpenChange={setPositionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Pozisyon Ekle</DialogTitle>
            <DialogDescription>
              <strong>{selectedDepartment?.name}</strong> departmanına yeni pozisyon ekleyin.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePositionSubmit} className="space-y-4">
            <div>
              <Label>Pozisyon Adı *</Label>
              <Input
                value={positionFormData?.name ?? ''}
                onChange={(e) => setPositionFormData({ ...positionFormData, name: e?.target?.value ?? '' })}
                placeholder="Örn: Müdür, Şef, Uzman"
                required
              />
            </div>
            <div>
              <Label>Pozisyon Kodu *</Label>
              <Input
                value={positionFormData?.code ?? ''}
                onChange={(e) => setPositionFormData({ ...positionFormData, code: e?.target?.value ?? '' })}
                placeholder="Örn: MDR, SEF, UZM"
                required
              />
            </div>
            <div>
              <Label>Açıklama</Label>
              <Input
                value={positionFormData?.description ?? ''}
                onChange={(e) => setPositionFormData({ ...positionFormData, description: e?.target?.value ?? '' })}
              />
            </div>
            <div>
              <Label>Seviye (Hiyerarşi)</Label>
              <Input
                type="number"
                min="0"
                value={positionFormData?.level ?? 0}
                onChange={(e) => setPositionFormData({ ...positionFormData, level: parseInt(e?.target?.value) || 0 })}
              />
              <p className="text-xs text-gray-500 mt-1">Düşük sayı = Yüksek pozisyon (0: En üst)</p>
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setPositionDialogOpen(false)}>
                İptal
              </Button>
              <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={submitting}>
                {submitting ? 'Oluşturuluyor...' : 'Oluştur'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Pozisyon Düzenleme Dialog */}
      <Dialog open={editPositionDialogOpen} onOpenChange={setEditPositionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pozisyon Düzenle</DialogTitle>
            <DialogDescription>Pozisyon bilgilerini güncelleyin.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditPositionSubmit} className="space-y-4">
            <div>
              <Label>Pozisyon Adı *</Label>
              <Input
                value={editPositionFormData?.name ?? ''}
                onChange={(e) => setEditPositionFormData({ ...editPositionFormData, name: e?.target?.value ?? '' })}
                required
              />
            </div>
            <div>
              <Label>Pozisyon Kodu *</Label>
              <Input
                value={editPositionFormData?.code ?? ''}
                onChange={(e) => setEditPositionFormData({ ...editPositionFormData, code: e?.target?.value ?? '' })}
                required
              />
            </div>
            <div>
              <Label>Açıklama</Label>
              <Input
                value={editPositionFormData?.description ?? ''}
                onChange={(e) => setEditPositionFormData({ ...editPositionFormData, description: e?.target?.value ?? '' })}
              />
            </div>
            <div>
              <Label>Seviye (Hiyerarşi)</Label>
              <Input
                type="number"
                min="0"
                value={editPositionFormData?.level ?? 0}
                onChange={(e) => setEditPositionFormData({ ...editPositionFormData, level: parseInt(e?.target?.value) || 0 })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Aktif Durum</Label>
              <Switch
                checked={editPositionFormData.isActive}
                onCheckedChange={(checked) => setEditPositionFormData({ ...editPositionFormData, isActive: checked })}
              />
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setEditPositionDialogOpen(false)}>
                İptal
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={submitting}>
                {submitting ? 'Kaydediliyor...' : 'Kaydet'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Pozisyon Silme Onay Dialog */}
      <AlertDialog open={deletePositionDialogOpen} onOpenChange={setDeletePositionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pozisyonu Sil</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{selectedPosition?.name}</strong> pozisyonunu silmek istediğinizden emin misiniz?
              {(selectedPosition?._count?.users ?? 0) > 0 && (
                <span className="block mt-2 text-amber-600">
                  ⚠️ Bu pozisyonda {selectedPosition?._count?.users} kullanıcı bulunmaktadır.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePosition}
              disabled={submitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {submitting ? 'Siliniyor...' : 'Sil'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Departmanlar ve Pozisyonlar</CardTitle>
          <CardDescription>Toplam {(departments ?? [])?.length ?? 0} departman</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {(departments ?? [])?.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Henüz departman bulunmuyor
              </div>
            ) : (
              (departments ?? [])?.map?.((dept) => (
                <Collapsible
                  key={dept?.id}
                  open={expandedDepts.has(dept.id)}
                  onOpenChange={() => toggleExpand(dept.id)}
                >
                  <div className="border rounded-lg">
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50">
                        <div className="flex items-center space-x-3">
                          {expandedDepts.has(dept.id) ? (
                            <ChevronDown className="w-5 h-5 text-gray-500" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-gray-500" />
                          )}
                          <Building2 className="w-5 h-5 text-blue-600" />
                          <div>
                            <span className="font-medium">{dept?.name}</span>
                            <span className="text-gray-500 ml-2">({dept?.code})</span>
                          </div>
                          <Badge className={dept?.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {dept?.isActive ? 'Aktif' : 'Pasif'}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span className="flex items-center">
                              <Users className="w-4 h-4 mr-1" />
                              {dept?._count?.users ?? 0} Kullanıcı
                            </span>
                            <span className="flex items-center">
                              <Briefcase className="w-4 h-4 mr-1" />
                              {dept?._count?.positions ?? 0} Pozisyon
                            </span>
                          </div>
                          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAddPosition(dept)}
                              className="text-green-600 hover:text-green-700"
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(dept)}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteClick(dept)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="border-t px-4 py-3 bg-gray-50">
                        {(dept?.positions ?? [])?.length === 0 ? (
                          <div className="text-center py-4 text-gray-500">
                            Bu departmanda henüz pozisyon bulunmuyor.
                            <Button
                              variant="link"
                              className="text-green-600 ml-2"
                              onClick={() => handleAddPosition(dept)}
                            >
                              Pozisyon Ekle
                            </Button>
                          </div>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Pozisyon</TableHead>
                                <TableHead>Kod</TableHead>
                                <TableHead>Seviye</TableHead>
                                <TableHead>Kullanıcı</TableHead>
                                <TableHead>Durum</TableHead>
                                <TableHead className="text-right">İşlemler</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {(dept?.positions ?? [])?.map?.((pos) => (
                                <TableRow key={pos?.id}>
                                  <TableCell className="font-medium">
                                    <div className="flex items-center space-x-2">
                                      <Briefcase className="w-4 h-4 text-green-600" />
                                      <span>{pos?.name}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell>{pos?.code}</TableCell>
                                  <TableCell>{pos?.level}</TableCell>
                                  <TableCell>{pos?._count?.users ?? 0}</TableCell>
                                  <TableCell>
                                    <Badge className={pos?.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                      {pos?.isActive ? 'Aktif' : 'Pasif'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleEditPosition(pos)}
                                        className="text-blue-600 hover:text-blue-700"
                                      >
                                        <Pencil className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleDeletePositionClick(pos)}
                                        className="text-red-600 hover:text-red-700"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )) ?? null}
                            </TableBody>
                          </Table>
                        )}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              )) ?? null
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
