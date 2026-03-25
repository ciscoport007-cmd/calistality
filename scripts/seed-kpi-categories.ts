import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const hotelKPICategories = [
  { code: 'FIN', name: 'Finansal Performans', description: 'Gelir, karlılık ve maliyet göstergeleri', color: '#10B981', sortOrder: 1 },
  { code: 'GUEST', name: 'Misafir Memnuniyeti', description: 'Müşteri deneyimi ve memnuniyet ölçümleri', color: '#3B82F6', sortOrder: 2 },
  { code: 'OPS', name: 'Operasyonel Verimlilik', description: 'İşletme süreçleri ve verimlilik', color: '#F59E0B', sortOrder: 3 },
  { code: 'HR', name: 'İnsan Kaynakları', description: 'Çalışan performansı ve gelişimi', color: '#8B5CF6', sortOrder: 4 },
  { code: 'FNB', name: 'Yiyecek & İçecek', description: 'Restoran ve bar performansı', color: '#EF4444', sortOrder: 5 },
  { code: 'ROOM', name: 'Oda Yönetimi', description: 'Doluluk ve oda gelirleri', color: '#06B6D4', sortOrder: 6 },
  { code: 'SPA', name: 'SPA & Wellness', description: 'SPA hizmetleri performansı', color: '#EC4899', sortOrder: 7 },
  { code: 'SALES', name: 'Satış & Pazarlama', description: 'Rezervasyon ve pazarlama başarısı', color: '#14B8A6', sortOrder: 8 },
  { code: 'QUAL', name: 'Kalite Yönetimi', description: 'Kalite standartları ve denetimler', color: '#6366F1', sortOrder: 9 },
  { code: 'ENV', name: 'Çevre & Sürdürülebilirlik', description: 'Enerji, su ve atık yönetimi', color: '#22C55E', sortOrder: 10 },
  { code: 'TECH', name: 'Teknik & Bakım', description: 'Ekipman bakım ve arıza yönetimi', color: '#64748B', sortOrder: 11 },
  { code: 'SEC', name: 'Güvenlik', description: 'İş güvenliği ve olay takibi', color: '#DC2626', sortOrder: 12 },
];

async function main() {
  console.log('5 yıldızlı otel KPI kategorileri oluşturuluyor...');
  
  for (const cat of hotelKPICategories) {
    const existing = await prisma.kPICategory.findUnique({ where: { code: cat.code } });
    if (existing) {
      console.log(`✓ ${cat.code} zaten mevcut`);
    } else {
      await prisma.kPICategory.create({ data: cat });
      console.log(`✓ ${cat.code} - ${cat.name} oluşturuldu`);
    }
  }
  
  console.log('\nToplam kategoriler:');
  const all = await prisma.kPICategory.findMany({ orderBy: { sortOrder: 'asc' } });
  all.forEach(c => console.log(`  ${c.code} - ${c.name}`));
}

main().finally(() => prisma.$disconnect());
