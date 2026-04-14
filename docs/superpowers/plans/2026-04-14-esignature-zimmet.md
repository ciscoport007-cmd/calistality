# e-İmza & Zimmet Modülü — Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Canvas tabanlı dijital imza ile zimmet formu oluşturma, imzalı PDF arşivleme ve doküman onay akışına imza adımı ekleme.

**Architecture:** Hibrit yaklaşım — bağımsız `/dashboard/esignature/zimmet/` modülü + mevcut doküman detay sayfasına "İmzalar" sekmesi. Paylaşılan `SignatureCanvas` ve `SignatureOverlay` bileşenleri her iki akışta da kullanılır. PDF üretimi `pdf-lib` ile sunucu tarafında yapılır, imzalı dosya `uploads/esignature/` altında saklanır.

**Tech Stack:** Next.js 14 App Router, Prisma ORM, pdf-lib, crypto (Node.js built-in), shadcn/ui, Tailwind CSS, next-auth

---

## Dosya Haritası

### Yeni Oluşturulacak Dosyalar
```
prisma/schema.prisma                              ← ZimmetForm, ZimmetItem, DocumentSignature eklenir

components/esignature/
  SignatureCanvas.tsx                             ← Canvas çizim bileşeni
  SignatureOverlay.tsx                            ← Tam ekran overlay wrapper
  ZimmetItemRow.tsx                               ← Zimmet kalemi satırı

app/api/esignature/
  zimmet/route.ts                                 ← GET (liste), POST (yeni form)
  zimmet/[id]/route.ts                            ← GET (detay), PATCH (güncelle), DELETE (sil)
  zimmet/[id]/sign/route.ts                       ← POST (imzala + PDF üret)
  document/[id]/sign/route.ts                     ← POST (doküman imzası)

app/dashboard/esignature/
  zimmet/page.tsx                                 ← Zimmet listesi
  zimmet/new/page.tsx                             ← Yeni zimmet formu
  zimmet/[id]/page.tsx                            ← Zimmet detayı / PDF indir
```

### Değiştirilecek Mevcut Dosyalar
```
lib/modules.ts                                    ← esignature modülü eklenir
components/dashboard/sidebar.tsx                  ← e-İmza & Zimmet menü öğesi
app/dashboard/documents/[id]/page.tsx             ← İmzalar sekmesi eklenir
```

---

## Task 1: Prisma Schema — Yeni Modeller

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Adım 1: Schema'ya enum'ları ekle**

`prisma/schema.prisma` dosyasının sonuna ekle:

```prisma
enum ZimmetStatus {
  DRAFT
  SIGNED
  CANCELLED
}

enum ZimmetCategory {
  EKIPMAN
  UNIFORM
  ANAHTAR
  DIGER
}

enum ItemCondition {
  IYI
  HASARLI
  KULLANILMIS
}

enum SignaturePurpose {
  ONAY
  BILGILENDIRME
  ZIMMET
}
```

- [ ] **Adım 2: ZimmetForm ve ZimmetItem modellerini ekle**

```prisma
model ZimmetForm {
  id                 String       @id @default(cuid())
  formNo             String       @unique
  title              String
  description        String?
  issuedById         String
  issuedBy           User         @relation("ZimmetIssued", fields: [issuedById], references: [id])
  receivedById       String?
  receivedBy         User?        @relation("ZimmetReceived", fields: [receivedById], references: [id])
  receiverName       String?
  items              ZimmetItem[]
  signatureImagePath String?
  fileHash           String?
  signedAt           DateTime?
  status             ZimmetStatus @default(DRAFT)
  isActive           Boolean      @default(true)
  createdAt          DateTime     @default(now())
  updatedAt          DateTime     @updatedAt

  @@map("zimmet_forms")
}

model ZimmetItem {
  id           String          @id @default(cuid())
  zimmetFormId String
  zimmetForm   ZimmetForm      @relation(fields: [zimmetFormId], references: [id], onDelete: Cascade)
  category     ZimmetCategory
  name         String
  quantity     Int             @default(1)
  condition    ItemCondition   @default(IYI)
  note         String?
  createdAt    DateTime        @default(now())

  @@map("zimmet_items")
}
```

- [ ] **Adım 3: DocumentSignature modelini ekle**

```prisma
model DocumentSignature {
  id                 String          @id @default(cuid())
  documentId         String
  document           Document        @relation(fields: [documentId], references: [id])
  versionId          String?
  signedById         String
  signedBy           User            @relation("DocumentSigner", fields: [signedById], references: [id])
  signatureImagePath String
  fileHash           String
  purpose            SignaturePurpose @default(ONAY)
  signedAt           DateTime        @default(now())

  @@map("document_signatures")
}
```

- [ ] **Adım 4: User modeline relation'ları ekle**

`User` modelinde şu satırları ekle (mevcut relation'ların yanına):

```prisma
  zimmetIssued       ZimmetForm[]        @relation("ZimmetIssued")
  zimmetReceived     ZimmetForm[]        @relation("ZimmetReceived")
  documentSignatures DocumentSignature[] @relation("DocumentSigner")
```

- [ ] **Adım 5: Document modeline relation ekle**

`Document` modelinde:
```prisma
  signatures         DocumentSignature[]
```

- [ ] **Adım 6: Migration çalıştır**

```bash
cd "c:\Users\Cinema\Desktop\Calistality\nextjs_space"
npx prisma db push
npx prisma generate
```

Beklenen çıktı: `Your database is now in sync with your Prisma schema.`

- [ ] **Adım 7: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: ZimmetForm, ZimmetItem, DocumentSignature prisma modelleri eklendi"
```

---

## Task 2: SignatureCanvas Bileşeni

**Files:**
- Create: `components/esignature/SignatureCanvas.tsx`

- [ ] **Adım 1: Bileşeni oluştur**

```tsx
'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';

interface SignatureCanvasProps {
  onSave: (dataUrl: string) => void;
  onClear?: () => void;
  width?: number;
  height?: number;
  className?: string;
}

export default function SignatureCanvas({
  onSave,
  onClear,
  width = 600,
  height = 200,
  className = '',
}: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
    setIsEmpty(false);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDraw = () => setIsDrawing(false);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
    onClear?.();
  }, [onClear]);

  const save = () => {
    if (isEmpty) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Sıkıştır: max 800x300
    const offscreen = document.createElement('canvas');
    offscreen.width = Math.min(canvas.width, 800);
    offscreen.height = Math.min(canvas.height, 300);
    const ctx = offscreen.getContext('2d')!;
    ctx.drawImage(canvas, 0, 0, offscreen.width, offscreen.height);
    const dataUrl = offscreen.toDataURL('image/png', 0.8);
    onSave(dataUrl);
  };

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <div className="border-2 border-dashed border-gray-300 rounded-lg overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="w-full touch-none cursor-crosshair"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
        />
      </div>
      <p className="text-xs text-gray-400 text-center">
        Fare veya parmağınızla yukarıdaki alana imzanızı çizin
      </p>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" size="sm" onClick={clear}>
          <RotateCcw className="w-4 h-4 mr-1" /> Temizle
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={isEmpty}
          onClick={save}
          className="bg-blue-600 hover:bg-blue-700"
        >
          İmzayı Onayla
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Adım 2: Manuel test**

`npm run dev` çalıştır. Herhangi bir sayfada import edip render et. Canvas'ta çizim yapılabilmeli, temizle çalışmalı, "İmzayı Onayla" tıklandığında `onSave` çağrılmalı.

- [ ] **Adım 3: Commit**

```bash
git add components/esignature/SignatureCanvas.tsx
git commit -m "feat: SignatureCanvas canvas tabanlı imza bileşeni eklendi"
```

---

## Task 3: SignatureOverlay Bileşeni

**Files:**
- Create: `components/esignature/SignatureOverlay.tsx`

- [ ] **Adım 1: Overlay bileşenini oluştur**

```tsx
'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SignatureCanvas from './SignatureCanvas';

interface SignatureOverlayProps {
  title: string;
  summary: React.ReactNode;
  onSave: (dataUrl: string) => void;
  onClose: () => void;
  loading?: boolean;
}

export default function SignatureOverlay({
  title,
  summary,
  onSave,
  onClose,
  loading = false,
}: SignatureOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Lütfen aşağıdaki özeti okuyun ve imzanızı çizin
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            disabled={loading}
            className="rounded-full"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Özet */}
        <div className="p-6 bg-gray-50 border-b">
          {summary}
        </div>

        {/* Canvas */}
        <div className="p-6">
          <p className="text-sm font-medium text-gray-700 mb-3">
            İmzanız
          </p>
          {loading ? (
            <div className="flex items-center justify-center h-32 text-gray-400">
              İmza işleniyor...
            </div>
          ) : (
            <SignatureCanvas
              onSave={onSave}
              width={700}
              height={180}
            />
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Adım 2: Commit**

```bash
git add components/esignature/SignatureOverlay.tsx
git commit -m "feat: SignatureOverlay tam ekran imza overlay bileşeni eklendi"
```

---

## Task 4: ZimmetItemRow Bileşeni

**Files:**
- Create: `components/esignature/ZimmetItemRow.tsx`

- [ ] **Adım 1: Bileşeni oluştur**

```tsx
'use client';

import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

export interface ZimmetItemData {
  id?: string;
  category: string;
  name: string;
  quantity: number;
  condition: string;
  note: string;
}

interface ZimmetItemRowProps {
  item: ZimmetItemData;
  index: number;
  onChange: (index: number, field: keyof ZimmetItemData, value: string | number) => void;
  onRemove: (index: number) => void;
  readOnly?: boolean;
}

const CATEGORIES = [
  { value: 'EKIPMAN', label: 'Ekipman' },
  { value: 'UNIFORM', label: 'Üniform' },
  { value: 'ANAHTAR', label: 'Anahtar' },
  { value: 'DIGER', label: 'Diğer' },
];

const CONDITIONS = [
  { value: 'IYI', label: 'İyi' },
  { value: 'KULLANILMIS', label: 'Kullanılmış' },
  { value: 'HASARLI', label: 'Hasarlı' },
];

export default function ZimmetItemRow({
  item,
  index,
  onChange,
  onRemove,
  readOnly = false,
}: ZimmetItemRowProps) {
  return (
    <div className="grid grid-cols-12 gap-2 items-start p-3 bg-gray-50 rounded-lg">
      <div className="col-span-3">
        <Select
          value={item.category}
          onValueChange={(v) => onChange(index, 'category', v)}
          disabled={readOnly}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Kategori" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="col-span-3">
        <Input
          placeholder="Kalem adı"
          value={item.name}
          onChange={(e) => onChange(index, 'name', e.target.value)}
          disabled={readOnly}
          className="h-9"
        />
      </div>
      <div className="col-span-1">
        <Input
          type="number"
          min={1}
          value={item.quantity}
          onChange={(e) => onChange(index, 'quantity', parseInt(e.target.value) || 1)}
          disabled={readOnly}
          className="h-9"
        />
      </div>
      <div className="col-span-2">
        <Select
          value={item.condition}
          onValueChange={(v) => onChange(index, 'condition', v)}
          disabled={readOnly}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Durum" />
          </SelectTrigger>
          <SelectContent>
            {CONDITIONS.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="col-span-2">
        <Input
          placeholder="Not (opsiyonel)"
          value={item.note}
          onChange={(e) => onChange(index, 'note', e.target.value)}
          disabled={readOnly}
          className="h-9"
        />
      </div>
      {!readOnly && (
        <div className="col-span-1 flex justify-center">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-red-500 hover:text-red-700"
            onClick={() => onRemove(index)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Adım 2: Commit**

```bash
git add components/esignature/ZimmetItemRow.tsx
git commit -m "feat: ZimmetItemRow zimmet kalemi satır bileşeni eklendi"
```

---

## Task 5: Zimmet API — CRUD

**Files:**
- Create: `app/api/esignature/zimmet/route.ts`
- Create: `app/api/esignature/zimmet/[id]/route.ts`

- [ ] **Adım 1: Liste ve oluşturma rotasını yaz**

`app/api/esignature/zimmet/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { canCreate } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const forms = await prisma.zimmetForm.findMany({
      where: { isActive: true },
      include: {
        issuedBy: { select: { id: true, name: true, email: true } },
        receivedBy: { select: { id: true, name: true, email: true } },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ forms });
  } catch (error) {
    console.error('Zimmet GET error:', error);
    return NextResponse.json({ error: 'Zimmet formları getirilemedi' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }
    if (!canCreate(session.user.role)) {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, receivedById, receiverName, items } = body ?? {};

    if (!title) {
      return NextResponse.json({ error: 'Başlık zorunludur' }, { status: 400 });
    }
    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'En az bir kalem eklenmelidir' }, { status: 400 });
    }

    // Form numarası: ZF-YYYY-NNNN
    const year = new Date().getFullYear();
    const count = await prisma.zimmetForm.count();
    const formNo = `ZF-${year}-${String(count + 1).padStart(4, '0')}`;

    const form = await prisma.zimmetForm.create({
      data: {
        formNo,
        title,
        description: description || null,
        issuedById: session.user.id,
        receivedById: receivedById || null,
        receiverName: receiverName || null,
        items: {
          create: items.map((item: any) => ({
            category: item.category,
            name: item.name,
            quantity: item.quantity || 1,
            condition: item.condition || 'IYI',
            note: item.note || null,
          })),
        },
      },
      include: {
        issuedBy: { select: { id: true, name: true } },
        receivedBy: { select: { id: true, name: true } },
        items: true,
      },
    });

    return NextResponse.json({ form }, { status: 201 });
  } catch (error) {
    console.error('Zimmet POST error:', error);
    return NextResponse.json({ error: 'Zimmet formu oluşturulamadı' }, { status: 500 });
  }
}
```

- [ ] **Adım 2: Detay, güncelleme ve silme rotasını yaz**

`app/api/esignature/zimmet/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isAdmin } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await params;
    const form = await prisma.zimmetForm.findFirst({
      where: { id, isActive: true },
      include: {
        issuedBy: { select: { id: true, name: true, email: true } },
        receivedBy: { select: { id: true, name: true, email: true } },
        items: true,
      },
    });

    if (!form) {
      return NextResponse.json({ error: 'Zimmet formu bulunamadı' }, { status: 404 });
    }

    return NextResponse.json({ form });
  } catch (error) {
    console.error('Zimmet GET [id] error:', error);
    return NextResponse.json({ error: 'Zimmet formu getirilemedi' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await params;
    const form = await prisma.zimmetForm.findFirst({ where: { id, isActive: true } });

    if (!form) {
      return NextResponse.json({ error: 'Zimmet formu bulunamadı' }, { status: 404 });
    }
    if (form.status === 'SIGNED') {
      return NextResponse.json({ error: 'İmzalanmış form düzenlenemez' }, { status: 403 });
    }
    if (form.issuedById !== session.user.id && !isAdmin(session.user.role)) {
      return NextResponse.json({ error: 'Bu formu düzenleme yetkiniz yok' }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, status } = body;

    const updated = await prisma.zimmetForm.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(status === 'CANCELLED' && { status: 'CANCELLED' }),
      },
    });

    return NextResponse.json({ form: updated });
  } catch (error) {
    console.error('Zimmet PATCH error:', error);
    return NextResponse.json({ error: 'Zimmet formu güncellenemedi' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await params;
    const form = await prisma.zimmetForm.findFirst({ where: { id, isActive: true } });

    if (!form) {
      return NextResponse.json({ error: 'Zimmet formu bulunamadı' }, { status: 404 });
    }
    if (form.status === 'SIGNED') {
      return NextResponse.json({ error: 'İmzalanmış form silinemez' }, { status: 403 });
    }
    if (form.issuedById !== session.user.id && !isAdmin(session.user.role)) {
      return NextResponse.json({ error: 'Bu formu silme yetkiniz yok' }, { status: 403 });
    }

    await prisma.zimmetForm.update({ where: { id }, data: { isActive: false } });

    return NextResponse.json({ message: 'Zimmet formu silindi' });
  } catch (error) {
    console.error('Zimmet DELETE error:', error);
    return NextResponse.json({ error: 'Zimmet formu silinemedi' }, { status: 500 });
  }
}
```

- [ ] **Adım 3: Commit**

```bash
git add app/api/esignature/zimmet/route.ts app/api/esignature/zimmet/[id]/route.ts
git commit -m "feat: Zimmet CRUD API rotaları eklendi"
```

---

## Task 6: Zimmet İmzalama API + PDF Üretimi

**Files:**
- Create: `app/api/esignature/zimmet/[id]/sign/route.ts`

- [ ] **Adım 1: İmzalama ve PDF üretim rotasını yaz**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const CATEGORY_LABELS: Record<string, string> = {
  EKIPMAN: 'Ekipman',
  UNIFORM: 'Üniform',
  ANAHTAR: 'Anahtar',
  DIGER: 'Diğer',
};

const CONDITION_LABELS: Record<string, string> = {
  IYI: 'İyi',
  KULLANILMIS: 'Kullanılmış',
  HASARLI: 'Hasarlı',
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await params;
    const form = await prisma.zimmetForm.findFirst({
      where: { id, isActive: true },
      include: {
        issuedBy: { select: { name: true } },
        receivedBy: { select: { name: true } },
        items: true,
      },
    });

    if (!form) {
      return NextResponse.json({ error: 'Zimmet formu bulunamadı' }, { status: 404 });
    }
    if (form.status === 'SIGNED') {
      return NextResponse.json({ error: 'Bu form zaten imzalanmış' }, { status: 409 });
    }

    const body = await request.json();
    const { signatureDataUrl } = body ?? {};

    if (!signatureDataUrl || !signatureDataUrl.startsWith('data:image/png;base64,')) {
      return NextResponse.json({ error: 'Geçerli imza verisi gereklidir' }, { status: 400 });
    }

    // base64 → Buffer
    const base64Data = signatureDataUrl.replace(/^data:image\/png;base64,/, '');
    const signatureBuffer = Buffer.from(base64Data, 'base64');

    // PDF oluştur
    const pdfBuffer = await generateZimmetPdf(form, signatureBuffer);

    // SHA-256 hash
    const fileHash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

    // uploads/esignature/ altına kaydet
    const uploadsDir = path.join(process.cwd(), 'uploads', 'esignature');
    fs.mkdirSync(uploadsDir, { recursive: true });
    const fileName = `zimmet-${form.formNo}-${Date.now()}.pdf`;
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, pdfBuffer);
    const relPath = `uploads/esignature/${fileName}`;

    // DB güncelle
    const updated = await prisma.zimmetForm.update({
      where: { id },
      data: {
        status: 'SIGNED',
        signatureImagePath: relPath,
        fileHash,
        signedAt: new Date(),
      },
    });

    return NextResponse.json({ form: updated, message: 'Zimmet imzalandı' });
  } catch (error) {
    console.error('Zimmet sign error:', error);
    return NextResponse.json({ error: 'İmzalama işlemi başarısız' }, { status: 500 });
  }
}

async function generateZimmetPdf(
  form: any,
  signatureBuffer: Buffer
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4
  const { width, height } = page.getSize();

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Başlık alanı
  page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: rgb(0.11, 0.31, 0.87) });
  page.drawText('ZİMMET FORMU', {
    x: 40, y: height - 35,
    size: 20, font: fontBold, color: rgb(1, 1, 1),
  });
  page.drawText(`Form No: ${form.formNo}`, {
    x: 40, y: height - 58,
    size: 11, font: fontReg, color: rgb(0.85, 0.9, 1),
  });

  // Form bilgileri
  let y = height - 110;
  const drawRow = (label: string, value: string) => {
    page.drawText(label, { x: 40, y, size: 10, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
    page.drawText(value || '-', { x: 180, y, size: 10, font: fontReg, color: rgb(0.1, 0.1, 0.1) });
    y -= 20;
  };

  drawRow('Teslim Eden:', form.issuedBy?.name || '-');
  drawRow('Teslim Alan:', form.receivedBy?.name || form.receiverName || '-');
  drawRow('Tarih:', new Date().toLocaleDateString('tr-TR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }));
  drawRow('Konu:', form.title);
  if (form.description) drawRow('Açıklama:', form.description);

  y -= 10;

  // Tablo başlığı
  page.drawRectangle({ x: 40, y: y - 5, width: width - 80, height: 22, color: rgb(0.92, 0.94, 0.98) });
  page.drawText('Kategori', { x: 45, y: y + 3, size: 9, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
  page.drawText('Kalem', { x: 135, y: y + 3, size: 9, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
  page.drawText('Adet', { x: 305, y: y + 3, size: 9, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
  page.drawText('Durum', { x: 355, y: y + 3, size: 9, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
  page.drawText('Not', { x: 430, y: y + 3, size: 9, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
  y -= 20;

  // Tablo satırları
  for (const item of form.items) {
    page.drawText(CATEGORY_LABELS[item.category] || item.category, { x: 45, y, size: 9, font: fontReg, color: rgb(0.1, 0.1, 0.1) });
    page.drawText(item.name.substring(0, 20), { x: 135, y, size: 9, font: fontReg, color: rgb(0.1, 0.1, 0.1) });
    page.drawText(String(item.quantity), { x: 305, y, size: 9, font: fontReg, color: rgb(0.1, 0.1, 0.1) });
    page.drawText(CONDITION_LABELS[item.condition] || item.condition, { x: 355, y, size: 9, font: fontReg, color: rgb(0.1, 0.1, 0.1) });
    page.drawText((item.note || '-').substring(0, 12), { x: 430, y, size: 9, font: fontReg, color: rgb(0.1, 0.1, 0.1) });
    y -= 18;
  }

  y -= 20;

  // İmza alanı
  page.drawText('Teslim Alanın İmzası:', { x: 40, y, size: 10, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
  y -= 10;

  // İmza PNG'yi göm
  const signatureImage = await pdfDoc.embedPng(signatureBuffer);
  const sigWidth = Math.min(250, signatureImage.width);
  const sigHeight = (signatureImage.height / signatureImage.width) * sigWidth;
  page.drawImage(signatureImage, { x: 40, y: y - sigHeight, width: sigWidth, height: sigHeight });
  y -= sigHeight + 10;

  page.drawLine({
    start: { x: 40, y },
    end: { x: 290, y },
    thickness: 1,
    color: rgb(0.5, 0.5, 0.5),
  });

  // Footer
  page.drawRectangle({ x: 0, y: 0, width, height: 30, color: rgb(0.95, 0.96, 0.99) });
  page.drawText('CALISTA Document Management System — Kontrollü Kopya', {
    x: 40, y: 10, size: 8, font: fontReg, color: rgb(0.5, 0.5, 0.5),
  });
  page.drawText(`Hash: ${crypto.createHash('sha256').update(signatureBuffer).digest('hex').substring(0, 16)}...`, {
    x: 380, y: 10, size: 7, font: fontReg, color: rgb(0.6, 0.6, 0.6),
  });

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}
```

- [ ] **Adım 2: Commit**

```bash
git add app/api/esignature/zimmet/[id]/sign/route.ts
git commit -m "feat: Zimmet imzalama ve PDF üretim API eklendi"
```

---

## Task 7: Zimmet Liste Sayfası

**Files:**
- Create: `app/dashboard/esignature/zimmet/page.tsx`

- [ ] **Adım 1: Liste sayfasını oluştur**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Taslak',
  SIGNED: 'İmzalandı',
  CANCELLED: 'İptal',
};
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
        <Button
          className="bg-blue-600 hover:bg-blue-700"
          onClick={() => router.push('/dashboard/esignature/zimmet/new')}
        >
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
                  <TableHead>Kalem Sayısı</TableHead>
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
                      <Badge className={STATUS_COLORS[form.status]}>
                        {STATUS_LABELS[form.status] || form.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {format(new Date(form.createdAt), 'dd.MM.yyyy', { locale: tr })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/dashboard/esignature/zimmet/${form.id}`)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {form.status === 'DRAFT' && userIsAdmin && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => setDeleteTarget(form)}
                          >
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
            <AlertDialogDescription>
              "{deleteTarget?.title}" zimmet formunu silmek istediğinizden emin misiniz?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? 'Siliniyor...' : 'Evet, Sil'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
```

- [ ] **Adım 2: Commit**

```bash
git add app/dashboard/esignature/zimmet/page.tsx
git commit -m "feat: Zimmet liste sayfası eklendi"
```

---

## Task 8: Zimmet Yeni Form + İmza Sayfası

**Files:**
- Create: `app/dashboard/esignature/zimmet/new/page.tsx`

- [ ] **Adım 1: Yeni form sayfasını oluştur**

```tsx
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
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

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
      <p className="text-xs text-gray-500">
        Yukarıdaki kalemleri teslim aldığımı kabul ve beyan ederim.
      </p>
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
        <CardHeader>
          <CardTitle className="text-base">Genel Bilgiler</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Başlık *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="örn. Mutfak Ekipmanı Zimmet"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="description">Açıklama</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Opsiyonel"
              className="mt-1 h-20"
            />
          </div>
          <div>
            <Label htmlFor="receiverName">Teslim Alanın Adı</Label>
            <Input
              id="receiverName"
              value={receiverName}
              onChange={(e) => setReceiverName(e.target.value)}
              placeholder="Ad Soyad"
              className="mt-1"
            />
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
            <ZimmetItemRow
              key={index}
              item={item}
              index={index}
              onChange={updateItem}
              onRemove={removeItem}
            />
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          className="bg-blue-600 hover:bg-blue-700 px-8"
          onClick={handleSaveAndSign}
          disabled={saving}
        >
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
```

- [ ] **Adım 2: Commit**

```bash
git add app/dashboard/esignature/zimmet/new/page.tsx
git commit -m "feat: Zimmet yeni form ve imzalama sayfası eklendi"
```

---

## Task 9: Zimmet Detay Sayfası

**Files:**
- Create: `app/dashboard/esignature/zimmet/[id]/page.tsx`

- [ ] **Adım 1: Detay sayfasını oluştur**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Download, FileSignature, CheckCircle, Clock, XCircle } from 'lucide-react';
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

  const handleDownload = async () => {
    if (!form?.signatureImagePath) return;
    const encoded = form.signatureImagePath
      .split('/')
      .map((s: string) => encodeURIComponent(s))
      .join('/');
    const url = `/api/files/${encoded}?dl=1&filename=${encodeURIComponent(form.formNo + '.pdf')}`;
    window.open(url, '_blank');
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
```

- [ ] **Adım 2: Commit**

```bash
git add app/dashboard/esignature/zimmet/[id]/page.tsx
git commit -m "feat: Zimmet detay sayfası eklendi"
```

---

## Task 10: Doküman İmzalama API

**Files:**
- Create: `app/api/esignature/document/[id]/sign/route.ts`

- [ ] **Adım 1: API rotasını oluştur**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await params;

    // Daha önce imzalamış mı?
    const existing = await prisma.documentSignature.findFirst({
      where: { documentId: id, signedById: session.user.id },
    });
    if (existing) {
      return NextResponse.json({ error: 'Bu belgeyi zaten imzaladınız' }, { status: 409 });
    }

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
      },
    });

    if (!document) {
      return NextResponse.json({ error: 'Doküman bulunamadı' }, { status: 404 });
    }

    const body = await request.json();
    const { signatureDataUrl, purpose = 'ONAY' } = body ?? {};

    if (!signatureDataUrl || !signatureDataUrl.startsWith('data:image/png;base64,')) {
      return NextResponse.json({ error: 'Geçerli imza verisi gereklidir' }, { status: 400 });
    }

    const base64Data = signatureDataUrl.replace(/^data:image\/png;base64,/, '');
    const signatureBuffer = Buffer.from(base64Data, 'base64');

    // Mevcut PDF varsa son sayfasına imza ekle, yoksa yeni PDF oluştur
    const version = document.versions[0];
    let pdfBuffer: Buffer;

    if (version?.cloudStoragePath) {
      const resolved = path.resolve(process.cwd(), version.cloudStoragePath);
      const uploadsRoot = path.resolve(process.cwd(), 'uploads');
      if (resolved.startsWith(uploadsRoot) && fs.existsSync(resolved)) {
        const existingPdf = fs.readFileSync(resolved);
        pdfBuffer = await appendSignatureToPdf(existingPdf, signatureBuffer, session.user.name || session.user.email || 'Kullanıcı');
      } else {
        pdfBuffer = await createSignaturePdf(document, signatureBuffer, session.user.name || session.user.email || 'Kullanıcı');
      }
    } else {
      pdfBuffer = await createSignaturePdf(document, signatureBuffer, session.user.name || session.user.email || 'Kullanıcı');
    }

    const fileHash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

    // Kaydet
    const uploadsDir = path.join(process.cwd(), 'uploads', 'esignature');
    fs.mkdirSync(uploadsDir, { recursive: true });
    const fileName = `doc-${id}-${session.user.id}-${Date.now()}.pdf`;
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, pdfBuffer);
    const relPath = `uploads/esignature/${fileName}`;

    const signature = await prisma.documentSignature.create({
      data: {
        documentId: id,
        versionId: version?.id || null,
        signedById: session.user.id,
        signatureImagePath: relPath,
        fileHash,
        purpose: purpose as any,
      },
      include: {
        signedBy: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ signature }, { status: 201 });
  } catch (error) {
    console.error('Document sign error:', error);
    return NextResponse.json({ error: 'İmzalama başarısız' }, { status: 500 });
  }
}

async function appendSignatureToPdf(
  existingPdfBuffer: Buffer,
  signatureBuffer: Buffer,
  userName: string
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(existingPdfBuffer);
  const pages = pdfDoc.getPages();
  const lastPage = pages[pages.length - 1];
  const { width } = lastPage.getSize();
  const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const signatureImage = await pdfDoc.embedPng(signatureBuffer);
  const sigWidth = 180;
  const sigHeight = (signatureImage.height / signatureImage.width) * sigWidth;
  const sigX = width - sigWidth - 40;
  const sigY = 60;

  lastPage.drawRectangle({ x: sigX - 5, y: sigY - 10, width: sigWidth + 10, height: sigHeight + 35, color: rgb(0.97, 0.97, 0.99), borderColor: rgb(0.8, 0.85, 0.95), borderWidth: 1 });
  lastPage.drawText('Onaylayan:', { x: sigX, y: sigY + sigHeight + 15, size: 8, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
  lastPage.drawText(userName, { x: sigX, y: sigY + sigHeight + 4, size: 8, font: fontReg, color: rgb(0.1, 0.1, 0.1) });
  lastPage.drawText(new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }), { x: sigX, y: sigY - 5, size: 7, font: fontReg, color: rgb(0.5, 0.5, 0.5) });
  lastPage.drawImage(signatureImage, { x: sigX, y: sigY, width: sigWidth, height: sigHeight });

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}

async function createSignaturePdf(document: any, signatureBuffer: Buffer, userName: string): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 300]);
  const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  page.drawRectangle({ x: 0, y: 240, width: 595, height: 60, color: rgb(0.11, 0.31, 0.87) });
  page.drawText('İMZA BELGESİ', { x: 40, y: 268, size: 14, font: fontBold, color: rgb(1, 1, 1) });

  page.drawText(`Doküman: ${document.title || document.code || '-'}`, { x: 40, y: 215, size: 10, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
  page.drawText(`Onaylayan: ${userName}`, { x: 40, y: 195, size: 10, font: fontReg, color: rgb(0.2, 0.2, 0.2) });
  page.drawText(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`, { x: 40, y: 175, size: 10, font: fontReg, color: rgb(0.2, 0.2, 0.2) });
  page.drawText('Bu belgeyi okuduğumu ve onayladığımı beyan ederim.', { x: 40, y: 150, size: 9, font: fontReg, color: rgb(0.4, 0.4, 0.4) });

  const signatureImage = await pdfDoc.embedPng(signatureBuffer);
  const sigWidth = 200;
  const sigHeight = (signatureImage.height / signatureImage.width) * sigWidth;
  page.drawImage(signatureImage, { x: 40, y: 80 - sigHeight + 60, width: sigWidth, height: sigHeight });
  page.drawLine({ start: { x: 40, y: 45 }, end: { x: 240, y: 45 }, thickness: 1, color: rgb(0.5, 0.5, 0.5) });

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}
```

- [ ] **Adım 2: Commit**

```bash
git add app/api/esignature/document/[id]/sign/route.ts
git commit -m "feat: Doküman imzalama API eklendi"
```

---

## Task 11: Doküman Detay — İmzalar Sekmesi

**Files:**
- Modify: `app/dashboard/documents/[id]/page.tsx`

- [ ] **Adım 1: GET endpoint'ine signature'ları ekle**

`app/api/documents/[id]/route.ts` dosyasında doküman include'una signatures ekle:

```typescript
// Mevcut include'a ekle:
signatures: {
  include: {
    signedBy: { select: { id: true, name: true, email: true } },
  },
  orderBy: { signedAt: 'desc' },
},
```

- [ ] **Adım 2: Document interface'ine signatures ekle**

`app/dashboard/documents/[id]/page.tsx` içinde mevcut `interface Document` bloğuna:

```typescript
signatures?: Array<{
  id: string;
  signedById: string;
  signedBy: { id: string; name: string; email: string };
  signatureImagePath: string;
  fileHash: string;
  purpose: string;
  signedAt: string;
}>;
```

- [ ] **Adım 3: Import'ları ekle**

Mevcut import'ların sonuna:
```typescript
import SignatureOverlay from '@/components/esignature/SignatureOverlay';
```

Icon import'larına `PenLine` ve `ShieldCheck` ekle.

- [ ] **Adım 4: State'leri ekle**

```typescript
const [showSignOverlay, setShowSignOverlay] = useState(false);
const [signingDoc, setSigningDoc] = useState(false);
```

- [ ] **Adım 5: handleDocSign fonksiyonunu ekle**

```typescript
const handleDocSign = async (dataUrl: string) => {
  setSigningDoc(true);
  try {
    const res = await fetch(`/api/esignature/document/${id}/sign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signatureDataUrl: dataUrl, purpose: 'ONAY' }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast({ title: 'Hata', description: data.error || 'İmzalanamadı', variant: 'destructive' });
      return;
    }
    toast({ title: 'İmzalandı', description: 'Belge imzanız kaydedildi.' });
    setShowSignOverlay(false);
    fetchDocument(); // mevcut fetch fonksiyonu
  } catch {
    toast({ title: 'Hata', description: 'Bir hata oluştu', variant: 'destructive' });
  } finally {
    setSigningDoc(false);
  }
};
```

- [ ] **Adım 6: Sekmeler listesine "İmzalar" ekle**

Mevcut `<TabsList>` içinde son sekmenin ardına:
```tsx
<TabsTrigger value="signatures">
  İmzalar {document?.signatures?.length ? `(${document.signatures.length})` : ''}
</TabsTrigger>
```

- [ ] **Adım 7: İmzalar sekmesi içeriğini ekle**

```tsx
<TabsContent value="signatures" className="space-y-4">
  <div className="flex justify-between items-center">
    <h3 className="font-semibold text-gray-700">Dijital İmzalar</h3>
    {!document?.signatures?.find((s) => s.signedById === session?.user?.id) && (
      <Button
        size="sm"
        className="bg-blue-600 hover:bg-blue-700"
        onClick={() => setShowSignOverlay(true)}
      >
        <PenLine className="w-4 h-4 mr-2" /> Belgeyi İmzala
      </Button>
    )}
  </div>
  {!document?.signatures?.length ? (
    <div className="text-center py-8 text-gray-400">Henüz imza yok.</div>
  ) : (
    <div className="space-y-3">
      {document.signatures.map((sig) => (
        <div key={sig.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-green-500" />
            <div>
              <p className="font-medium text-sm">{sig.signedBy.name}</p>
              <p className="text-xs text-gray-500">
                {format(new Date(sig.signedAt), 'dd.MM.yyyy HH:mm', { locale: tr })}
                {' · '}{sig.purpose}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const encoded = sig.signatureImagePath
                .split('/')
                .map((s: string) => encodeURIComponent(s))
                .join('/');
              window.open(`/api/files/${encoded}?dl=1`, '_blank');
            }}
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>
      ))}
    </div>
  )}

  {showSignOverlay && (
    <SignatureOverlay
      title="Belgeyi İmzala"
      summary={
        <div className="space-y-2 text-sm">
          <p><span className="font-semibold">Belge:</span> {document?.title}</p>
          <p><span className="font-semibold">Versiyon:</span> {document?.versions?.[document.versions.length - 1]?.versionNumber || '-'}</p>
          <hr className="my-2" />
          <p className="text-xs text-gray-500">Bu belgeyi okuduğumu ve onayladığımı beyan ederim.</p>
        </div>
      }
      onSave={handleDocSign}
      onClose={() => setShowSignOverlay(false)}
      loading={signingDoc}
    />
  )}
</TabsContent>
```

- [ ] **Adım 8: Commit**

```bash
git add app/dashboard/documents/[id]/page.tsx app/api/documents/[id]/route.ts
git commit -m "feat: Doküman detay sayfasına İmzalar sekmesi eklendi"
```

---

## Task 12: Sidebar ve Modül Kaydı

**Files:**
- Modify: `lib/modules.ts`
- Modify: `components/dashboard/sidebar.tsx`

- [ ] **Adım 1: modules.ts'e esignature ekle**

`ALL_MODULES` dizisine ekle:
```typescript
{ key: 'esignature', label: 'e-İmza & Zimmet', description: 'Dijital imza ve zimmet formu yönetimi' },
```

- [ ] **Adım 2: sidebar.tsx'e icon import ekle**

Mevcut icon import'larına `PenLine` ekle:
```typescript
import { ..., PenLine } from 'lucide-react';
```

- [ ] **Adım 3: sidebar.tsx'e menü öğesi ekle**

`menuItems` dizisinde uygun konuma (örn. `documents` girişinin hemen ardına) ekle:

```typescript
{
  moduleKey: 'esignature',
  title: 'e-İmza & Zimmet',
  href: '/dashboard/esignature/zimmet',
  icon: PenLine,
  subItems: [
    { title: 'Zimmet Formları', href: '/dashboard/esignature/zimmet' },
  ],
},
```

- [ ] **Adım 4: Build kontrolü**

```bash
npm run build
```

Beklenen: Build başarılı, hata yok.

- [ ] **Adım 5: Commit**

```bash
git add lib/modules.ts components/dashboard/sidebar.tsx
git commit -m "feat: e-İmza & Zimmet sidebar menüsü ve modül kaydı eklendi"
```

---

## Task 13: Uçtan Uca Manuel Test

- [ ] `npm run dev` ile uygulamayı başlat

- [ ] **Zimmet akışı test et:**
  1. `/dashboard/esignature/zimmet` sayfasına git
  2. "Yeni Zimmet" butonuna tıkla
  3. Başlık, teslim alan adı ve en az 2 kalem ekle
  4. "Kaydet ve İmzaya Geç" tıkla
  5. Overlay açılmalı, özet görünmeli
  6. Canvas'a imza çiz, "İmzayı Onayla" tıkla
  7. Detay sayfasına yönlendirilmeli, durum "İmzalandı" olmalı
  8. "PDF İndir" tıklandığında imzalı PDF açılmalı
  9. PDF'te form no, kalemler ve imza görünmeli

- [ ] **Doküman imzası test et:**
  1. Herhangi bir doküman detay sayfasına git
  2. "İmzalar" sekmesine tıkla
  3. "Belgeyi İmzala" butonuna tıkla
  4. İmzala
  5. Sekme güncellenmeli, imzalayan kişi listede görünmeli

- [ ] **Güvenlik test et:**
  - SIGNED zimmet için silme butonu görünmemeli
  - Aynı kişi aynı dokümanı tekrar imzalamaya çalışırsa "Zaten imzaladınız" uyarısı gelmeli

- [ ] **Final commit**

```bash
git add .
git commit -m "feat: e-İmza & Zimmet modülü tamamlandı"
git push
```
