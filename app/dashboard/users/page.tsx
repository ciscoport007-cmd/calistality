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
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { ALL_MODULES, hasFullAccess } from '@/lib/modules';

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
  const [selectedModules, setSelectedModules] = useState<string[]>([]);

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

      if (usersRes?.ok) setUsers((await usersRes.json())?.users ?? []);
      if (rolesRes?.ok) setRoles((await rolesRes.json())?.roles ?? []);
      if (deptsRes?.ok) setDepartments((await deptsRes.json())?.departments ?? []);
      if (posRes?.ok) {
        const data = await posRes.json();
        setPositions(Array.isArray(data) ? data : (data?.positions ?? []));
      }
    } catch {
      // sessiz hata
    } finally {
      setLoading(false);
    }
  };

  const selectedRoleName = useMemo(
    () => roles.find((r) => r.id === formData.roleId)?.name ?? '',
    [roles, formData.roleId]
  );

  // Seçili rol yönetici ise modül seçimi gösterme
  const showModuleSelector = formData.roleId && !hasFullAccess(selectedRoleName);

  const filteredPositions = useMemo(() => {
    if (!formData.departmentId) return positions;
    return positions.filter(
      (pos) => pos.departmentId === formData.departmentId || pos.departmentId === null
    );
  }, [positions, formData.departmentId]);

  const handleDepartmentChange = (value: string) => {
    setFormData((prev) => ({ ...prev, departmentId: value, positionId: '' }));
  };

  const toggleModule = (key: string) => {
    setSelectedModules((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e?.preventDefault?.();

    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
      const method = editingUser ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response?.ok) {
        const data = await response?.json?.();
        toast({ title: 'Hata', description: data?.error || 'Bir hata oluştu', variant: 'destructive' });
        return;
      }

      const savedUser = await response.json();
      const userId = editingUser?.id ?? savedUser?.id ?? savedUser?.user?.id;

      // Modül erişimini kaydet (sadece normal kullanıcılar için)
      if (userId && showModuleSelector) {
        await fetch(`/api/users/${userId}/module-access`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ modules: selectedModules }),
        });
      }

      toast({
        title: 'Başarılı',
        description: editingUser ? 'Kullanıcı başarıyla güncellendi' : 'Kullanıcı başarıyla oluşturuldu',
      });
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch {
      toast({ title: 'Hata', description: 'Bir hata oluştu', variant: 'destructive' });
    }
  };

  const handleEdit = async (user: User) => {
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

    // Mevcut modül erişimini yükle
    try {
      const res = await fetch(`/api/users/${user.id}/module-access`);
      if (res.ok) {
        const data = await res.json();
        setSelectedModules(data.modules ?? []);
      }
    } catch {
      setSelectedModules([]);
    }

    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu kullanıcıyı silmek istediğinizden emin misiniz?')) return;
    try {
      const response = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (response?.ok) {
        toast({ title: 'Başarılı', description: 'Kullanıcı başarıyla silindi' });
        fetchData();
      }
    } catch {
      toast({ title: 'Hata', description: 'Kullanıcı silinirken hata oluştu', variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setEditingUser(null);
    setSelectedModules([]);
    setFormData({ email: '', password: '', name: '', surname: '', phone: '', roleId: '', departmentId: '', positionId: '' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600" />
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
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Yeni Kullanıcı
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingUser ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı Ekle'}</DialogTitle>
              <DialogDescription>Kullanıcı bilgilerini giriniz.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Ad *</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                </div>
                <div>
                  <Label>Soyad</Label>
                  <Input value={formData.surname} onChange={(e) => setFormData({ ...formData, surname: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Email *</Label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
              </div>
              <div>
                <Label>Şifre {!editingUser && '*'}</Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={!editingUser}
                  placeholder={editingUser ? 'Değiştirmek için yeni şifre girin' : ''}
                />
              </div>
              <div>
                <Label>Telefon</Label>
                <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
              </div>
              <div>
                <Label>Rol</Label>
                <Select value={formData.roleId} onValueChange={(value) => setFormData({ ...formData, roleId: value })}>
                  <SelectTrigger><SelectValue placeholder="Rol seçin" /></SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Departman</Label>
                <Select value={formData.departmentId} onValueChange={handleDepartmentChange}>
                  <SelectTrigger><SelectValue placeholder="Departman seçin" /></SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Pozisyon</Label>
                <Select
                  value={formData.positionId}
                  onValueChange={(value) => setFormData({ ...formData, positionId: value })}
                  disabled={filteredPositions.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={filteredPositions.length === 0 ? 'Önce departman seçin' : 'Pozisyon seçin'} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredPositions.map((pos) => (
                      <SelectItem key={pos.id} value={pos.id}>
                        {pos.name}
                        {pos.department && <span className="text-gray-400 ml-2">({pos.department.name})</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Modül Erişimi - Sadece normal kullanıcılar için */}
              {showModuleSelector && (
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">Modül Erişimi</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedModules(ALL_MODULES.map((m) => m.key))}
                      >
                        Tümünü Seç
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedModules([])}
                      >
                        Temizle
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Boş bırakırsanız kullanıcı tüm modüllere erişebilir.
                    Departman erişimi varsa onu geçersiz kılar.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {ALL_MODULES.map((mod) => (
                      <div key={mod.key} className="flex items-start space-x-2 p-2 rounded hover:bg-gray-50">
                        <Checkbox
                          id={`mod-${mod.key}`}
                          checked={selectedModules.includes(mod.key)}
                          onCheckedChange={() => toggleModule(mod.key)}
                        />
                        <label htmlFor={`mod-${mod.key}`} className="cursor-pointer">
                          <div className="text-sm font-medium">{mod.label}</div>
                          <div className="text-xs text-gray-400">{mod.description}</div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
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
          <CardDescription>Toplam {users.length} kullanıcı</CardDescription>
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
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    Henüz kullanıcı bulunmuyor
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name} {user.surname}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.role?.name ?? '-'}</TableCell>
                    <TableCell>{user.department?.name ?? '-'}</TableCell>
                    <TableCell>{user.position?.name ?? '-'}</TableCell>
                    <TableCell>
                      <Badge className={user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {user.isActive ? 'Aktif' : 'Pasif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(user)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(user.id)}>
                        <Trash2 className="w-4 h-4" />
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
