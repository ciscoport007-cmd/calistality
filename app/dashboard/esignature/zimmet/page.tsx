'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, FileSignature, Eye, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { isAdmin } from '@/lib/audit';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const STATUS_LABELS: Record<string, string> = { DRAFT: 'Taslak', SIGNED: 'İmzalandı', CANCELLED: 'İptal' };
const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-yellow-100 text-yellow-800',
  SIGNED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

interface ZimmetForm {
  id: string;
  formNo: string;
  title: string;
  status: string;
  signedAt: string | null;
  createdAt: string;
  issuedBy: { name: string };
  receivedBy: { name: string } | null;
  receiverName: string | null;
  items: any[];
}

export default function ZimmetListPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { data: session } = useSession();
  const [forms, setForms] = useState<ZimmetForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<ZimmetForm | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchForms = async () => {
    try {
      const res = await fetch('/api/esignature/zimmet');
      const data = await res.json();
      if (res.ok) setForms(data.forms || []);
    } catch {
      toast({ title: 'Hata', description: 'Formlar getirilemedi', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchForms(); }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/esignature/zimmet/${deleteTarget.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        toast({ title: 'Silindi', description: `"${deleteTarget.title}" silindi.` });
        setDeleteTarget(null);
        fetchForms();
      } else {
        toast({ title: 'Hata', description: data.error || 'Silinemedi', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Hata', description: 'Bir hata oluştu', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  const userIsAdmin = isAdmin(session?.user?.role);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileSignature className="w-7 h-7 text-blue-600" />
            Zimmet Formları
          </h1>
          <p className="text-gray-500 text-sm mt-1">Ekipman, üniform ve anahtar zimmet kayıtları</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => router.push('/dashboard/esignature/zimmet/new')}>
          <Plus className="w-4 h-4 mr-2" /> Yeni Zimmet
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Yükleniyor...</div>
          ) : forms.length === 0 ? (
            <div className="p-8 text-center text-gray-400">Henüz zimmet formu yok.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Form No</TableHead>
                  <TableHead>Başlık</TableHead>
                  <TableHead>Teslim Eden</TableHead>
                  <TableHead>Teslim Alan</TableHead>
                  <TableHead>Kalem</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead className="text-right">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {forms.map((form) => (
                  <TableRow key={form.id}>
                    <TableCell className="font-mono text-sm">{form.formNo}</TableCell>
                    <TableCell className="font-medium">{form.title}</TableCell>
                    <TableCell>{form.issuedBy?.name}</TableCell>
                    <TableCell>{form.receivedBy?.name || form.receiverName || '-'}</TableCell>
                    <TableCell>{form.items?.length || 0}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[form.status]}>{STATUS_LABELS[form.status] || form.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {format(new Date(form.createdAt), 'dd.MM.yyyy', { locale: tr })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/esignature/zimmet/${form.id}`)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        {form.status === 'DRAFT' && userIsAdmin && (
                          <Button variant="outline" size="sm" className="text-red-500 hover:text-red-700" onClick={() => setDeleteTarget(form)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Formu sil</AlertDialogTitle>
            <AlertDialogDescription>"{deleteTarget?.title}" zimmet formunu silmek istediğinizden emin misiniz?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Vazgeç</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700">
              {deleting ? 'Siliniyor...' : 'Evet, Sil'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
