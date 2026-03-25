import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const hotelKPICategories = [
  // --- Temel Operasyonel ---
  { code: 'FIN',       name: 'Finansal Performans',          description: 'Gelir, karlılık, maliyet ve bütçe sapma göstergeleri',                    color: '#10B981', sortOrder: 1 },
  { code: 'ROOM',      name: 'Oda Yönetimi & Doluluk',       description: 'Doluluk oranı, RevPAR, ADR ve oda geliri göstergeleri',                   color: '#06B6D4', sortOrder: 2 },
  { code: 'FNB',       name: 'Yiyecek & İçecek',             description: 'Restoran, bar, oda servisi ve mutfak performansı',                        color: '#EF4444', sortOrder: 3 },
  { code: 'HOUSE',     name: 'Kat Hizmetleri',               description: 'Oda temizlik kalitesi, hizmet süresi ve housekeeping verimliliği',         color: '#84CC16', sortOrder: 4 },

  // --- Misafir Odaklı ---
  { code: 'GUEST',     name: 'Misafir Memnuniyeti',          description: 'NPS, anket skorları ve genel müşteri deneyimi ölçümleri',                  color: '#3B82F6', sortOrder: 5 },
  { code: 'GUEST_REL', name: 'Misafir İlişkileri & Şikayet', description: 'Şikayet çözüm süresi, tekrar ziyaret oranı ve özel istek karşılama',       color: '#60A5FA', sortOrder: 6 },
  { code: 'CONCIERGE', name: 'Concierge & Butlership',       description: 'Concierge talep karşılama, butler hizmet kalitesi ve VIP deneyimi',        color: '#A78BFA', sortOrder: 7 },
  { code: 'LOYALTY',   name: 'Sadakat Programı',             description: 'Sadakat üye sayısı, puan kullanım oranı ve tekrar rezervasyon katsayısı',  color: '#F472B6', sortOrder: 8 },

  // --- Gelir & Satış ---
  { code: 'REVENUE',   name: 'Gelir Yönetimi',               description: 'RevPAR, TRevPAR, GOP PAR ve yield management göstergeleri',               color: '#14B8A6', sortOrder: 9 },
  { code: 'SALES',     name: 'Satış & Pazarlama',             description: 'Rezervasyon dönüşüm oranı, kanal bazlı gelir ve kampanya ROI',            color: '#F59E0B', sortOrder: 10 },
  { code: 'MICE',      name: 'Toplantı & Etkinlik (MICE)',    description: 'Kongre, konferans, incentive ve sosyal etkinlik doluluk ve geliri',        color: '#0EA5E9', sortOrder: 11 },
  { code: 'BANQ',      name: 'Banket & Catering',             description: 'Banket doluluk oranı, ortalama kişi başı harcama ve catering kalitesi',   color: '#FB923C', sortOrder: 12 },

  // --- İnsan Kaynakları ---
  { code: 'HR',        name: 'İnsan Kaynakları',              description: 'İşgören devir hızı, bordro verimliliği ve işe alım süresi',               color: '#8B5CF6', sortOrder: 13 },
  { code: 'TRAIN',     name: 'Eğitim & Gelişim',              description: 'Kişi başı eğitim saati, eğitim tamamlanma oranı ve yetkinlik gelişimi',   color: '#7C3AED', sortOrder: 14 },
  { code: 'EMP_SAT',   name: 'Çalışan Memnuniyeti',           description: 'eNPS, çalışan bağlılık anketi ve iç motivasyon göstergeleri',             color: '#C084FC', sortOrder: 15 },

  // --- Spor, Sağlık & Rekreasyon ---
  { code: 'SPA',       name: 'SPA & Wellness',                description: 'SPA doluluk, kişi başı harcama ve tedavi memnuniyet skorları',            color: '#EC4899', sortOrder: 16 },
  { code: 'HEALTH',    name: 'Spor & Fitness',                 description: 'Spor salonu kullanım oranı, fitness program katılımı',                   color: '#F43F5E', sortOrder: 17 },
  { code: 'POOL',      name: 'Havuz & Plaj Hizmetleri',        description: 'Havuz & plaj doluluk oranı, hizmet kalitesi ve güvenlik uyumu',          color: '#22D3EE', sortOrder: 18 },
  { code: 'GOLF',      name: 'Golf & Outdoor Aktiviteler',     description: 'Golf sahası kullanımı, outdoor aktivite katılımı ve gelir',              color: '#4ADE80', sortOrder: 19 },

  // --- Destek & Altyapı ---
  { code: 'TECH',      name: 'Teknik & Bakım',                 description: 'Ekipman arıza süresi, önleyici bakım oranı ve iş emri kapanma hızı',    color: '#64748B', sortOrder: 20 },
  { code: 'DIGITAL',   name: 'Dijital Hizmetler & Teknoloji',  description: 'Dijital check-in kullanımı, wifi memnuniyeti ve uygulama etkileşimi',   color: '#6366F1', sortOrder: 21 },
  { code: 'SUPPLY',    name: 'Tedarik & Satın Alma',           description: 'Tedarikçi performansı, stok devir hızı ve satın alma tasarruf oranı',   color: '#A16207', sortOrder: 22 },
  { code: 'VALET',     name: 'Vale & Ulaşım Hizmetleri',       description: 'Vale bekleme süresi, araç hasarı oranı ve transfer memnuniyeti',        color: '#475569', sortOrder: 23 },
  { code: 'RETAIL',    name: 'Butik & Mağazacılık',            description: 'Mağaza cirosu, m² başına gelir ve stok karlılığı',                      color: '#BE185D', sortOrder: 24 },

  // --- Kalite & Sürdürülebilirlik ---
  { code: 'QUAL',      name: 'Kalite Yönetimi',                description: 'Denetim skorları, sapma oranı ve hata tekrarlanma yüzdesi',             color: '#6366F1', sortOrder: 25 },
  { code: 'ENV',       name: 'Çevre & Sürdürülebilirlik',      description: 'Karbon ayak izi, atık azaltma ve yeşil sertifika uyumu',                color: '#22C55E', sortOrder: 26 },
  { code: 'ENERGY',    name: 'Enerji & Su Yönetimi',           description: 'Enerji tüketimi (kWh/geceleme), su tüketimi ve yenilenebilir enerji payı', color: '#16A34A', sortOrder: 27 },
  { code: 'BRAND',     name: 'Marka & İtibar',                 description: 'OTA puanları, sosyal medya etkileşimi ve online yorum skoru',           color: '#0284C7', sortOrder: 28 },

  // --- Güvenlik & Uyum ---
  { code: 'SEC',       name: 'Güvenlik & Emniyet',             description: 'Güvenlik olay sayısı, müdahale süresi ve kamera/erişim uyumu',          color: '#DC2626', sortOrder: 29 },
  { code: 'OHS',       name: 'İş Sağlığı & Güvenliği',         description: 'Kaza sıklık hızı, ramak kala bildirimi ve eğitim uyum oranı',          color: '#B91C1C', sortOrder: 30 },
  { code: 'AUDIT',     name: 'Denetim & Uyum',                 description: 'İç denetim bulgu sayısı, kapatma süresi ve yasal uyum oranı',          color: '#7E22CE', sortOrder: 31 },
];

async function main() {
  console.log('5 yıldızlı otel KPI kategorileri oluşturuluyor...');

  let created = 0;
  let skipped = 0;

  for (const cat of hotelKPICategories) {
    const existing = await prisma.kPICategory.findUnique({ where: { code: cat.code } });
    if (existing) {
      // Mevcut kaydı güncelle (isim/açıklama/renk değişmiş olabilir)
      await prisma.kPICategory.update({ where: { code: cat.code }, data: cat });
      console.log(`↺  ${cat.code.padEnd(10)} güncellendi  — ${cat.name}`);
      skipped++;
    } else {
      await prisma.kPICategory.create({ data: cat });
      console.log(`✓  ${cat.code.padEnd(10)} oluşturuldu — ${cat.name}`);
      created++;
    }
  }

  console.log(`\n${created} yeni kategori oluşturuldu, ${skipped} kategori güncellendi.`);
  console.log('\nMevcut kategoriler:');
  const all = await prisma.kPICategory.findMany({ orderBy: { sortOrder: 'asc' } });
  all.forEach(c => console.log(`  ${c.sortOrder.toString().padStart(2)}. ${c.code.padEnd(10)} ${c.name}`));
}

main().finally(() => prisma.$disconnect());
