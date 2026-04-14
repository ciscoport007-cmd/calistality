# e-İmza & Zimmet Modülü — Tasarım Dokümanı

**Tarih:** 2026-04-14  
**Modül Adı:** e-İmza & Zimmet  
**Yaklaşım:** Hibrit (bağımsız zimmet modülü + mevcut doküman entegrasyonu)  
**Durum:** Onaylandı

---

## 1. Kapsam

Bu modül iki temel işlevi kapsar:

1. **Zimmet Formları** — Yönetici anlık form oluşturur, teslim alan ekranda canvas ile imzalar, imzalı PDF arşivlenir.
2. **Doküman İmzası** — Mevcut doküman onay akışına imza adımı eklenir; onaylayan kullanıcı canvas ile imzalar, imzalı PDF doküman versiyonuna bağlanır.

### Kapsam Dışı
- OTP / SMS tabanlı yasal e-imza (yasal geçerlilik hedeflenmemektedir)
- Önceden hazırlanmış şablon tabanlı zimmet akışı
- Çok taraflı eş zamanlı imza

---

## 2. İmza Yöntemi

**Canvas tabanlı el imzası** — fare veya dokunmatik ekran ile çizilir.

- Tam ekran overlay üzerinde `<canvas>` elementi
- "Temizle" butonu ile yeniden çizim
- "Onayla" ile PNG olarak alınır, PDF'e gömülür
- "İptal" ile işlem sonlandırılır

---

## 3. Veri Modeli

### ZimmetForm
```prisma
model ZimmetForm {
  id                 String        @id @default(cuid())
  title              String
  description        String?
  issuedById         String
  issuedBy           User          @relation("ZimmetIssued", fields: [issuedById], references: [id])
  receivedById       String?
  receivedBy         User?         @relation("ZimmetReceived", fields: [receivedById], references: [id])
  receiverName       String?       // Sistemde kayıtlı olmayan kişi
  items              ZimmetItem[]
  signatureImagePath String?       // uploads/ altındaki imzalı PDF yolu
  fileHash           String?       // SHA-256 değişmezlik doğrulaması
  signedAt           DateTime?
  status             ZimmetStatus  @default(DRAFT)
  createdAt          DateTime      @default(now())
  updatedAt          DateTime      @updatedAt
}

enum ZimmetStatus {
  DRAFT
  SIGNED
  CANCELLED
}
```

### ZimmetItem
```prisma
model ZimmetItem {
  id            String          @id @default(cuid())
  zimmetFormId  String
  zimmetForm    ZimmetForm      @relation(fields: [zimmetFormId], references: [id])
  category      ZimmetCategory
  name          String
  quantity      Int             @default(1)
  condition     ItemCondition   @default(GOOD)
  note          String?
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
```

### DocumentSignature
```prisma
model DocumentSignature {
  id                 String    @id @default(cuid())
  documentId         String
  document           Document  @relation(fields: [documentId], references: [id])
  versionId          String?
  signedById         String
  signedBy           User      @relation(fields: [signedById], references: [id])
  signatureImagePath String    // uploads/ altındaki imzalı PDF yolu
  fileHash           String    // SHA-256
  purpose            SignaturePurpose @default(ONAY)
  signedAt           DateTime  @default(now())
}

enum SignaturePurpose {
  ONAY
  BILGILENDIRME
  ZIMMET
}
```

---

## 4. Sayfalar & API Rotaları

### Yeni Sayfalar
```
/dashboard/esignature/zimmet/          → Zimmet listesi (Admin + Yönetici)
/dashboard/esignature/zimmet/new       → Form oluştur + imzala
/dashboard/esignature/zimmet/[id]      → Detay / PDF indir
```

### Yeni API Rotaları
```
GET  /api/esignature/zimmet            → Zimmet listesi
POST /api/esignature/zimmet            → Yeni zimmet formu oluştur
GET  /api/esignature/zimmet/[id]       → Zimmet detayı
PATCH /api/esignature/zimmet/[id]      → Güncelle (yalnızca DRAFT)
DELETE /api/esignature/zimmet/[id]     → Sil (yalnızca DRAFT, yalnızca oluşturan)
POST /api/esignature/zimmet/[id]/sign  → İmzayı al + PDF üret + arşivle

POST /api/esignature/document/[id]/sign → Doküman imzası al + PDF üret
```

### Mevcut Sayfa Değişikliği
```
/dashboard/documents/[id]  → "İmzalar" sekmesi eklenir
```

### Paylaşılan Bileşenler
```
components/esignature/
  SignatureCanvas.tsx     → canvas + temizle + kaydet
  SignaturePreview.tsx    → imzayı görüntüle (img)
  SignatureOverlay.tsx    → tam ekran overlay wrapper
  ZimmetItemRow.tsx       → kalem satırı (form içi)
```

---

## 5. Zimmet Form Akışı

```
1. Yönetici /dashboard/esignature/zimmet/new sayfasını açar
2. Başlık, açıklama ve kalemleri doldurur
3. Teslim alan seçer (sistem kullanıcısı) veya ad yazar (dış kişi)
4. "İmzaya Geç" butonuna basar
5. Tam ekran SignatureOverlay açılır — zimmet özeti gösterilir
6. Teslim alan ekrana bakarak canvas'a imzasını çizer
7. "Onayla" butonuna basar
8. Sunucu: PNG alınır → pdf-lib ile PDF üretilir → uploads/ kaydedilir → SHA-256 hesaplanır
9. ZimmetForm.status = SIGNED, signedAt = şimdiki zaman
10. Toast: "Zimmet imzalandı" + PDF indirme butonu aktif
```

### PDF Yapısı
```
┌─────────────────────────────────────┐
│  [Logo]  ZİMMET FORMU               │
│          Form No: ZF-2026-XXXX      │
├─────────────────────────────────────┤
│  Teslim Eden : [ad]                 │
│  Teslim Alan : [ad]                 │
│  Tarih       : GG.AA.YYYY SS:DD     │
├────────────┬──────┬─────────────────┤
│ Kalem      │ Adet │ Durum           │
├────────────┼──────┼─────────────────┤
│ ...        │ ...  │ ...             │
├─────────────────────────────────────┤
│  İmza:  [canvas PNG]                │
│  _________________________________  │
│  Teslim Alanın İmzası               │
└─────────────────────────────────────┘
```

---

## 6. Doküman İmza Akışı

```
1. Kullanıcı /dashboard/documents/[id] → "İmzalar" sekmesine gider
2. "İmzala" butonuna basar (henüz imzalamamışsa görünür)
3. SignatureOverlay açılır:
   - Belge başlığı + versiyon numarası
   - "Bu belgeyi okuduğumu ve onayladığımı beyan ederim."
   - Tarih (otomatik)
   - SignatureCanvas
4. Kullanıcı imzalar → "İmzayı Kaydet"
5. Sunucu: mevcut PDF'in son sayfasına imza eklenir → yeni dosya uploads/'a kaydedilir → hash hesaplanır
6. DocumentSignature kaydı oluşturulur
7. İmzalar sekmesi güncellenir
```

---

## 7. Değişmezlik & Güvenlik

### SHA-256 Hash Doğrulaması
- Her imzalı PDF oluşturulduğunda `crypto.createHash('sha256')` ile hash hesaplanır
- Hash, `ZimmetForm.fileHash` veya `DocumentSignature.fileHash` alanında saklanır
- İndirme sırasında hash karşılaştırılır — uyumsuzluk tespit edilirse uyarı verilir

### Dosya Erişim Kontrolü
- İmzalı PDF'ler `uploads/` altında saklanır
- Yalnızca `/api/files/` üzerinden, oturum kontrolüyle erişilebilir
- Ham base64 imza verisi DB'de saklanmaz; sunucuda dosyaya yazılır

### Yetki Matrisi

| İşlem | Admin | Yönetici | Diğer |
|-------|-------|----------|-------|
| Zimmet oluştur | ✅ | ✅ | ❌ |
| Zimmet imzala | ✅ | ✅ | ✅ (ekranda) |
| Zimmet iptal/sil | ✅ | Kendi oluşturduğu | ❌ |
| SIGNED zimmet sil | ❌ | ❌ | ❌ |
| Doküman imzala | Onay akışındaki kullanıcı | ✅ | Onay akışındaki kullanıcı |
| İmzalı PDF indir | ✅ | ✅ | Kendi imzaladığı |

---

## 8. Hata Yönetimi

| Senaryo | Davranış |
|---------|----------|
| Canvas boş gönderildi | Client-side validasyon, submit engellenir |
| PDF üretimi başarısız | DB kaydı yapılmaz, "Tekrar deneyin" toast |
| Aynı kullanıcı iki kez imzalar | API 409, "Zaten imzaladınız" uyarısı |
| SIGNED zimmet düzenlenmeye çalışılır | API 403, form read-only |
| Hash uyumsuzluğu | İndirme engellenir, Admin'e uyarı |
| Canvas PNG çok büyük | Max 800×300px, quality 0.8 sıkıştırma |

---

## 9. Bağımlılıklar

- `pdf-lib` — zaten yüklü (doküman download modülünde kullanılıyor)
- `crypto` — Node.js built-in, ek paket gerekmez
- Mevcut `uploads/` storage altyapısı — değişiklik gerekmez
- Mevcut `SignatureCanvas` — yeni bileşen olarak oluşturulacak

---

## 10. Etkilenen Mevcut Dosyalar

| Dosya | Değişiklik |
|-------|------------|
| `prisma/schema.prisma` | ZimmetForm, ZimmetItem, DocumentSignature modelleri eklenir |
| `app/dashboard/documents/[id]/page.tsx` | "İmzalar" sekmesi eklenir |
| `app/dashboard/layout.tsx` veya sidebar | e-İmza & Zimmet menü öğesi eklenir |
