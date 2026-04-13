'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Shield, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useSession } from 'next-auth/react';

interface Role {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  _count: { users: number };
}

export default function RolesPage() {
  const { toast } = useToast();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'Admin';
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const response = await fetch('/api/roles');
      if (response?.ok) {
        const data = await response?.json?.();
        setRoles(data?.roles ?? []);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e?.preventDefault?.();

    try {
      const response = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response?.ok) {
        toast({ title: 'Başarılı', description: 'Rol başarıyla oluşturuldu' });
        setDialogOpen(false);
        setFormData({ name: '', description: '' });
        fetchRoles();
      } else {
        const data = await response?.json?.();
        toast({ title: 'Hata', description: data?.error || 'Bir hata oluştu', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Hata', description: 'Bir hata oluştu', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/roles/${deleteTarget.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        toast({ title: 'Başarılı', description: `"${deleteTarget.name}" rolü silindi.` });
        setDeleteTarget(null);
        fetchRoles();
      } else {
        toast({ title: 'Hata', description: data.error || 'Silinemedi.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Hata', description: 'Bir hata oluştu.', variant: 'destructive' });
    } finally {
      setDeleting(false);
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
          <h1 className="text-3xl font-bold text-gray-900">Rol Yönetimi</h1>
          <p className="text-gray-500 mt-2">Sistem rollerini yönetin</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Yeni Rol
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Yeni Rol Ekle</DialogTitle>
              <DialogDescription>Rol bilgilerini giriniz.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Rol Adı *</Label>
                <Input
                  value={formData?.name ?? ''}
                  onChange={(e) => setFormData({ ...formData, name: e?.target?.value ?? '' })}
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
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  Oluştur
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Roller</CardTitle>
          <CardDescription>Toplam {(roles ?? [])?.length ?? 0} rol</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rol Adı</TableHead>
                <TableHead>Açıklama</TableHead>
                <TableHead>Kullanıcı Sayısı</TableHead>
                <TableHead>Durum</TableHead>
                {isAdmin && <TableHead className="w-10"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {(roles ?? [])?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                    Henüz rol bulunmuyor
                  </TableCell>
                </TableRow>
              ) : (
                (roles ?? [])?.map?.((role) => (
                  <TableRow key={role?.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        <Shield className="w-4 h-4 text-blue-600" />
                        <span>{role?.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{role?.description ?? '-'}</TableCell>
                    <TableCell>{role?._count?.users ?? 0}</TableCell>
                    <TableCell>
                      <Badge className={role?.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {role?.isActive ? 'Aktif' : 'Pasif'}
                      </Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setDeleteTarget(role)}
                          disabled={(role?._count?.users ?? 0) > 0}
                          title={(role?._count?.users ?? 0) > 0 ? 'Kullanıcısı olan rol silinemez' : 'Rolü sil'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                )) ?? null
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {/* Rol Silme Onay Dialog'u */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              Rolü Sil
            </DialogTitle>
            <DialogDescription>
              <span className="font-semibold text-gray-900">&quot;{deleteTarget?.name}&quot;</span> rolünü silmek istediğinizden emin misiniz?
              <br />
              <span className="text-red-500 text-sm mt-1 block">Bu işlem geri alınamaz.</span>
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
    </div>
  );
}
