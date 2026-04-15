'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Download, FileSignature } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import SignatureOverlay from '@/components/esignature/SignatureOverlay';

const STATUS_LABELS: Record<string, string> = { DRAFT: 'Taslak', SIGNED: 'İmzalandı', CANCELLED: 'İptal' };
const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-yellow-100 text-yellow-800',
  SIGNED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};
const CATEGORY_LABELS: Record<string, string> = { EKIPMAN: 'Ekipman', UNIFORM: 'Üniform', ANAHTAR: 'Anahtar', DIGER: 'Diğer' };
const CONDITION_LABELS: Record<string, string> = { IYI: 'İyi', KULLANILMIS: 'Kullanılmış', HASARLI: 'Hasarlı' };

export default function ZimmetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showOverlay, setShowOverlay] = useState(false);
  const [signing, setSigning] = useState(false);

  const fetchForm = async () => {
    try {
      const res = await fetch(`/api/esignature/zimmet/${id}`);
      const data = await res.json();
      if (res.ok) setForm(data.form);
      else toast({ title: 'Hata', description: data.error, variant: 'destructive' });
    } catch {
      toast({ title: 'Hata', description: 'Form getirilemedi', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchForm(); }, [id]);

  const handleSign = async (dataUrl: string) => {
    setSigning(true);
    try {
      const res = await fetch(`/api/esignature/zimmet/${id}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signatureDataUrl: dataUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: 'Hata', description: data.error || 'İmzalanamadı', variant: 'destructive' });
        return;
      }
      toast({ title: 'İmzalandı', description: 'Zimmet formu imzalandı ve arşivlendi.' });
      setShowOverlay(false);
      fetchForm();
    } catch {
      toast({ title: 'Hata', description: 'Bir hata oluştu', variant: 'destructive' });
    } finally {
      setSigning(false);
    }
  };

  const handleDownload = () => {
    if (!form?.signatureImagePath) return;
    const encoded = form.signatureImagePath.split('/').map((s: string) => encodeURIComponent(s)).join('/');
    window.open(`/api/files/${encoded}?dl=1&filename=${encodeURIComponent(form.formNo + '.pdf')}`, '_blank');
  };

  if (loading) return <div className="p-8 text-center text-gray-400">Yükleniyor...</div>;
  if (!form) return <div className="p-8 text-center text-red-400">Form bulunamadı.</div>;

  const overlaySummary = (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="font-semibold text-gray-600">Form No:</span>
        <span className="font-mono">{form.formNo}</span>
      </div>
      <div className="flex justify-between">
        <span className="font-semibold text-gray-600">Konu:</span>
        <span>{form.title}</span>
      </div>
      <hr className="my-2" />
      {form.items?.map((item: any, i: number) => (
        <div key={i} className="flex justify-between pl-2 text-gray-700">
          <span>{item.name}</span>
          <span>{item.quantity} adet</span>
        </div>
      ))}
      <hr className="my-2" />
      <p className="text-xs text-gray-500">Yukarıdaki kalemleri teslim aldığımı kabul ve beyan ederim.</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileSignature className="w-6 h-6 text-blue-600" />
              {form.formNo}
            </h1>
            <p className="text-sm text-gray-500">{form.title}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {form.status === 'DRAFT' && (
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setShowOverlay(true)}>
              <FileSignature className="w-4 h-4 mr-2" /> İmzala
            </Button>
          )}
          {form.status === 'SIGNED' && (
            <Button variant="outline" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" /> PDF İndir
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Form Bilgileri</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Durum</span>
              <Badge className={STATUS_COLORS[form.status]}>{STATUS_LABELS[form.status]}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Teslim Eden</span>
              <span>{form.issuedBy?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Teslim Alan</span>
              <span>{form.receivedBy?.name || form.receiverName || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Oluşturulma</span>
              <span>{format(new Date(form.createdAt), 'dd.MM.yyyy HH:mm', { locale: tr })}</span>
            </div>
            {form.signedAt && (
              <div className="flex justify-between">
                <span className="text-gray-500">İmzalanma</span>
                <span>{format(new Date(form.signedAt), 'dd.MM.yyyy HH:mm', { locale: tr })}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Kalemler</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kalem</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Adet</TableHead>
                  <TableHead>Durum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {form.items?.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{CATEGORY_LABELS[item.category] || item.category}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{CONDITION_LABELS[item.condition] || item.condition}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {showOverlay && (
        <SignatureOverlay
          title="Zimmet İmzalama"
          summary={overlaySummary}
          onSave={handleSign}
          onClose={() => setShowOverlay(false)}
          loading={signing}
        />
      )}
    </div>
  );
}
