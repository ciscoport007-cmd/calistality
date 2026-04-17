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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Pencil, Trash2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { ALL_MODULES, hasFullAccess } from '@/lib/modules';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

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

interface PendingUser {
  id: string;
  email: string;
  name: string;
  surname: string | null;
  phone: string | null;
  createdAt: string;
  department: { id: string; name: string } | null;
  position: { id: string; name: string } | null;
}

export default function UsersPage() {
  const { toast } = useToast();
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
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
    if (status === 'unauthenticated') { router.push('/login'); return; }
    if (status === 'authenticated') {
      if (session?.user?.role !== 'Admin' && session?.user?.role !== 'admin') {
        router.push('/dashboard');
        return;
      }
      fetchData();
    }
  }, [status, session]);

  const fetchData = async () => {
    try {
      const [usersRes, rolesRes, deptsRes, posRes, pendingRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/roles'),
        fetch('/api/departments'),
        fetch('/api/positions'),
        fetch('/api/users/pending'),
      ]);

      if (usersRes?.ok) setUsers((await usersRes.json())?.users ?? []);
      if (rolesRes?.ok) setRoles((await rolesRes.json())?.roles ?? []);
      if (deptsRes?.ok) setDepartments((await deptsRes.json())?.departments ?? []);
      if (posRes?.ok) {
        const data = await posRes.json();
        setPositions(Array.isArray(data) ? data : (data?.positions ?? []));
      }
      if (pendingRes?.ok) setPendingUsers((await pendingRes.json())?.users ?? []);
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

  const showModuleSelector = true; // Her zaman modül seçici göster

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

      if (userId) {
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

    try {
      const res = await fetch(`/api/users/${user.id}/module-access`);
      if (res.ok) {
        const data = await res.json();
        // Hiç kayıt yoksa (tam erişim) → tüm modüller seçili göster
        setSelectedModules(data.modules?.length > 0 ? data.modules : ALL_MODULES.map((m) => m.key));
      }
    } catch {
      setSelectedModules(ALL_MODULES.map((m) => m.key));
    }

    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu kullanıcıyı silmek istediğinizden emin misiniz?')) return;
    try {
      const response = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (response?.ok) {
        toast({ title: 'Başarılı', description: 'Kullanıcı silindi' });
        fetchData();
      } else {
        const data = await response.json().catch(() => ({}));
        toast({ title: 'Hata', description: data?.error ?? 'Kullanıcı silinemedi', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Hata', description: 'Kullanıcı silinirken hata oluştu', variant: 'destructive' });
    }
  };

  const handleApprove = async (id: string, action: 'approve' | 'reject') => {
    const confirmMsg =
      action === 'approve'
        ? 'Bu kullanıcıyı onaylamak istiyor musunuz?'
        : 'Bu kayıt talebini reddetmek ve silmek istiyor musunuz?';
    if (!confirm(confirmMsg)) return;

    try {
      const response = await fetch(`/api/users/${id}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (response?.ok) {
        toast({
          title: 'Başarılı',
          description: action === 'approve' ? 'Kullanıcı onaylandı' : 'Kayıt talebi reddedildi',
        });
        fetchData();
      } else {
        const data = await response?.json?.();
        toast({ title: 'Hata', description: data?.error || 'Bir hata oluştu', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Hata', description: 'Bir hata oluştu', variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setEditingUser(null);
    setSelectedModules(ALL_MODULES.map((m) => m.key)); // Yeni kullanıcı: tüm modüller varsayılan seçili
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

              {showModuleSelector && (
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">Modül Erişimi</Label>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setSelectedModules(ALL_MODULES.map((m) => m.key))}>
                        Tümünü Seç
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => setSelectedModules([])}>
                        Temizle
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Boş bırakırsanız kullanıcı tüm modüllere erişebilir. Departman erişimi varsa onu geçersiz kılar.
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

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">
            Aktif Kullanıcılar
            <Badge className="ml-2 bg-gray-100 text-gray-700 text-xs">{users.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="pending">
            Bekleyen Onaylar
            {pendingUsers.length > 0 && (
              <Badge className="ml-2 bg-amber-100 text-amber-700 text-xs">{pendingUsers.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
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
        </TabsContent>

        <TabsContent value="pending">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" />
                Bekleyen Kayıt Talepleri
              </CardTitle>
              <CardDescription>
                Dışarıdan kayıt olmuş ve onayınızı bekleyen kullanıcılar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ad Soyad</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefon</TableHead>
                    <TableHead>Departman</TableHead>
                    <TableHead>Pozisyon</TableHead>
                    <TableHead>Talep Tarihi</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        Bekleyen kayıt talebi bulunmuyor
                      </TableCell>
                    </TableRow>
                  ) : (
                    pendingUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name} {user.surname}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.phone ?? '-'}</TableCell>
                        <TableCell>{user.department?.name ?? '-'}</TableCell>
                        <TableCell>{user.position?.name ?? '-'}</TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {new Date(user.createdAt).toLocaleDateString('tr-TR')}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => handleApprove(user.id, 'approve')}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Onayla
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleApprove(user.id, 'reject')}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reddet
                          </Button>
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
    </div>
  );
}
