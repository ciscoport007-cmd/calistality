'use client';

import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface Position {
  id: string;
  name: string;
  code: string;
  departmentId: string | null;
  department?: { id: string; name: string } | null;
}

interface User {
  id: string;
  email: string;
  name: string;
  surname: string | null;
  phone: string | null;
  isActive: boolean;
  role: any;
  department: any;
  position: any;
}

export default function UsersPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    surname: '',
    phone: '',
    roleId: '',
    departmentId: '',
    positionId: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, rolesRes, deptsRes, posRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/roles'),
        fetch('/api/departments'),
        fetch('/api/positions'),
      ]);

      if (usersRes?.ok) {
        const data = await usersRes?.json?.();
        setUsers(data?.users ?? []);
      }
      if (rolesRes?.ok) {
        const data = await rolesRes?.json?.();
        setRoles(data?.roles ?? []);
      }
      if (deptsRes?.ok) {
        const data = await deptsRes?.json?.();
        setDepartments(data?.departments ?? []);
      }
      if (posRes?.ok) {
        const data = await posRes?.json?.();
        // API doğrudan array döndürüyor
        setPositions(Array.isArray(data) ? data : (data?.positions ?? []));
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Seçili departmana göre filtrelenmiş pozisyonlar
  const filteredPositions = useMemo(() => {
    if (!formData.departmentId) {
      // Departman seçilmemişse tüm pozisyonları göster
      return positions;
    }
    // Seçili departmana ait veya departmansız pozisyonları göster
    return positions.filter(
      (pos) => pos.departmentId === formData.departmentId || pos.departmentId === null
    );
  }, [positions, formData.departmentId]);

  const handleDepartmentChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      departmentId: value,
      positionId: '', // Departman değiştiğinde pozisyonu sıfırla
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e?.preventDefault?.();

    try {
      const url = editingUser ? `/api/users/${editingUser?.id}` : '/api/users';
      const method = editingUser ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response?.ok) {
        toast({
          title: 'Başarılı',
          description: editingUser
            ? 'Kullanıcı başarıyla güncellendi'
            : 'Kullanıcı başarıyla oluşturuldu',
        });
        setDialogOpen(false);
        resetForm();
        fetchData();
      } else {
        const data = await response?.json?.();
        toast({
          title: 'Hata',
          description: data?.error || 'Bir hata oluştu',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Hata',
        description: 'Bir hata oluştu',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      email: user?.email ?? '',
      password: '',
      name: user?.name ?? '',
      surname: user?.surname ?? '',
      phone: user?.phone ?? '',
      roleId: user?.role?.id ?? '',
      departmentId: user?.department?.id ?? '',
      positionId: user?.position?.id ?? '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu kullanıcıyı silmek istediğinizden emin misiniz?')) return;

    try {
      const response = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (response?.ok) {
        toast({
          title: 'Başarılı',
          description: 'Kullanıcı başarıyla silindi',
        });
        fetchData();
      }
    } catch (error) {
      toast({
        title: 'Hata',
        description: 'Kullanıcı silinirken hata oluştu',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setEditingUser(null);
    setFormData({
      email: '',
      password: '',
      name: '',
      surname: '',
      phone: '',
      roleId: '',
      departmentId: '',
      positionId: '',
    });
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
          <h1 className="text-3xl font-bold text-gray-900">Kullanıcı Yönetimi</h1>
          <p className="text-gray-500 mt-2">Sistem kullanıcılarını yönetin</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Yeni Kullanıcı
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingUser ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı Ekle'}
              </DialogTitle>
              <DialogDescription>
                Kullanıcı bilgilerini giriniz.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Ad *</Label>
                  <Input
                    value={formData?.name ?? ''}
                    onChange={(e) => setFormData({ ...formData, name: e?.target?.value ?? '' })}
                    required
                  />
                </div>
                <div>
                  <Label>Soyad</Label>
                  <Input
                    value={formData?.surname ?? ''}
                    onChange={(e) => setFormData({ ...formData, surname: e?.target?.value ?? '' })}
                  />
                </div>
              </div>
              <div>
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={formData?.email ?? ''}
                  onChange={(e) => setFormData({ ...formData, email: e?.target?.value ?? '' })}
                  required
                />
              </div>
              <div>
                <Label>Şifre {!editingUser && '*'}</Label>
                <Input
                  type="password"
                  value={formData?.password ?? ''}
                  onChange={(e) => setFormData({ ...formData, password: e?.target?.value ?? '' })}
                  required={!editingUser}
                  placeholder={editingUser ? 'Değiştirmek için yeni şifre girin' : ''}
                />
              </div>
              <div>
                <Label>Telefon</Label>
                <Input
                  value={formData?.phone ?? ''}
                  onChange={(e) => setFormData({ ...formData, phone: e?.target?.value ?? '' })}
                />
              </div>
              <div>
                <Label>Rol</Label>
                <Select value={formData?.roleId ?? ''} onValueChange={(value) => setFormData({ ...formData, roleId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Rol seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {(roles ?? [])?.map?.((role) => (
                      <SelectItem key={role?.id} value={role?.id ?? ''}>
                        {role?.name}
                      </SelectItem>
                    )) ?? null}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Departman</Label>
                <Select
                  value={formData?.departmentId ?? ''}
                  onValueChange={handleDepartmentChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Departman seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {(departments ?? [])?.map?.((dept) => (
                      <SelectItem key={dept?.id} value={dept?.id ?? ''}>
                        {dept?.name}
                      </SelectItem>
                    )) ?? null}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Pozisyon</Label>
                <Select
                  value={formData?.positionId ?? ''}
                  onValueChange={(value) => setFormData({ ...formData, positionId: value })}
                  disabled={filteredPositions.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={filteredPositions.length === 0 ? 'Önce departman seçin veya pozisyon ekleyin' : 'Pozisyon seçin'} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredPositions?.map?.((pos) => (
                      <SelectItem key={pos?.id} value={pos?.id ?? ''}>
                        {pos?.name}
                        {pos?.department && (
                          <span className="text-gray-400 ml-2">({pos?.department?.name})</span>
                        )}
                      </SelectItem>
                    )) ?? null}
                  </SelectContent>
                </Select>
                {filteredPositions.length === 0 && formData.departmentId && (
                  <p className="text-xs text-amber-600 mt-1">
                    Seçili departmanda pozisyon bulunmuyor. Departman Yönetimi sayfasından pozisyon ekleyebilirsiniz.
                  </p>
                )}
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    resetForm();
                  }}
                >
                  İptal
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  {editingUser ? 'Güncelle' : 'Oluştur'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Kullanıcılar</CardTitle>
          <CardDescription>Toplam {(users ?? [])?.length ?? 0} kullanıcı</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ad Soyad</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Departman</TableHead>
                <TableHead>Pozisyon</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(users ?? [])?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    Henüz kullanıcı bulunmuyor
                  </TableCell>
                </TableRow>
              ) : (
                (users ?? [])?.map?.((user) => (
                  <TableRow key={user?.id}>
                    <TableCell className="font-medium">
                      {user?.name} {user?.surname}
                    </TableCell>
                    <TableCell>{user?.email}</TableCell>
                    <TableCell>{user?.role?.name ?? '-'}</TableCell>
                    <TableCell>{user?.department?.name ?? '-'}</TableCell>
                    <TableCell>{user?.position?.name ?? '-'}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          user?.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }
                      >
                        {user?.isActive ? 'Aktif' : 'Pasif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(user)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDelete(user?.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )) ?? null
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
