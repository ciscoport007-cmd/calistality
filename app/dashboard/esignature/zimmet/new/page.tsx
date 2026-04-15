'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Plus, FileSignature } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ZimmetItemRow, { ZimmetItemData } from '@/components/esignature/ZimmetItemRow';
import SignatureOverlay from '@/components/esignature/SignatureOverlay';

const emptyItem = (): ZimmetItemData => ({
  category: 'EKIPMAN',
  name: '',
  quantity: 1,
  condition: 'IYI',
  note: '',
});

export default function ZimmetNewPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [items, setItems] = useState<ZimmetItemData[]>([emptyItem()]);
  const [formId, setFormId] = useState<string | null>(null);
  const [formNo, setFormNo] = useState('');
  const [showOverlay, setShowOverlay] = useState(false);
  const [saving, setSaving] = useState(false);
  const [signing, setSigning] = useState(false);

  const updateItem = (index: number, field: keyof ZimmetItemData, value: string | number) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const removeItem = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index));
  const addItem = () => setItems((prev) => [...prev, emptyItem()]);

  const handleSaveAndSign = async () => {
    if (!title.trim()) {
      toast({ title: 'Hata', description: 'Başlık zorunludur', variant: 'destructive' });
      return;
    }
    const invalidItems = items.filter((item) => !item.name.trim() || !item.category);
    if (invalidItems.length > 0) {
      toast({ title: 'Hata', description: 'Tüm kalemlerin adı ve kategorisi doldurulmalıdır', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/esignature/zimmet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, receiverName, items }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: 'Hata', description: data.error || 'Form oluşturulamadı', variant: 'destructive' });
        return;
      }
      setFormId(data.form.id);
      setFormNo(data.form.formNo);
      setShowOverlay(true);
    } catch {
      toast({ title: 'Hata', description: 'Bir hata oluştu', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSign = async (dataUrl: string) => {
    if (!formId) return;
    setSigning(true);
    try {
      const res = await fetch(`/api/esignature/zimmet/${formId}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signatureDataUrl: dataUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: 'Hata', description: data.error || 'İmzalanamadı', variant: 'destructive' });
        return;
      }
      toast({ title: 'Zimmet İmzalandı', description: `${formNo} imzalandı ve arşivlendi.` });
      setShowOverlay(false);
      router.push(`/dashboard/esignature/zimmet/${formId}`);
    } catch {
      toast({ title: 'Hata', description: 'İmzalama sırasında hata oluştu', variant: 'destructive' });
    } finally {
      setSigning(false);
    }
  };

  const overlaySummary = (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="font-semibold text-gray-600">Form No:</span>
        <span className="font-mono">{formNo}</span>
      </div>
      <div className="flex justify-between">
        <span className="font-semibold text-gray-600">Konu:</span>
        <span>{title}</span>
      </div>
      <div className="flex justify-between">
        <span className="font-semibold text-gray-600">Teslim Alan:</span>
        <span>{receiverName || '-'}</span>
      </div>
      <hr className="my-2" />
      <p className="font-semibold text-gray-600">Kalemler:</p>
      {items.map((item, i) => (
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
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileSignature className="w-6 h-6 text-blue-600" />
            Yeni Zimmet Formu
          </h1>
          <p className="text-sm text-gray-500">Form oluşturup imzaya gönderin</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Genel Bilgiler</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Başlık *</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="örn. Mutfak Ekipmanı Zimmet" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="description">Açıklama</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opsiyonel" className="mt-1 h-20" />
          </div>
          <div>
            <Label htmlFor="receiverName">Teslim Alanın Adı</Label>
            <Input id="receiverName" value={receiverName} onChange={(e) => setReceiverName(e.target.value)} placeholder="Ad Soyad" className="mt-1" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Kalemler</CardTitle>
            <Button variant="outline" size="sm" onClick={addItem}>
              <Plus className="w-4 h-4 mr-1" /> Kalem Ekle
            </Button>
          </div>
          <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-500 mt-2">
            <div className="col-span-3">Kategori</div>
            <div className="col-span-3">Kalem Adı</div>
            <div className="col-span-1">Adet</div>
            <div className="col-span-2">Durum</div>
            <div className="col-span-2">Not</div>
            <div className="col-span-1"></div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {items.map((item, index) => (
            <ZimmetItemRow key={index} item={item} index={index} onChange={updateItem} onRemove={removeItem} />
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button className="bg-blue-600 hover:bg-blue-700 px-8" onClick={handleSaveAndSign} disabled={saving}>
          <FileSignature className="w-4 h-4 mr-2" />
          {saving ? 'Kaydediliyor...' : 'Kaydet ve İmzaya Geç'}
        </Button>
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
