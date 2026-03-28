import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const LQA_STANDARDS = [
  {
    code: 'CAT-01',
    name: 'Karşılama & Resepsiyon',
    icon: '🛎️',
    order: 1,
    weight: 1.2,
    criteria: [
      { code: 'CAT01-001', description: 'Misafir kapıya geldiğinde 5 saniye içinde karşılandı mı?', weight: 1.5, isCritical: true },
      { code: 'CAT01-002', description: 'Personel gülümseyerek ve göz teması kurarak karşılama yaptı mı?', weight: 1.0 },
      { code: 'CAT01-003', description: 'Misafir ismi öğrenildi ve en az 3 kez kullanıldı mı?', weight: 1.5, isCritical: true },
      { code: 'CAT01-004', description: 'Check-in işlemi 5 dakika içinde tamamlandı mı?', weight: 1.0 },
      { code: 'CAT01-005', description: 'Oda bilgileri ve otel tesisleri hakkında bilgi verildi mi?', weight: 1.0 },
      { code: 'CAT01-006', description: 'Bagaj taşıma teklif edildi mi?', weight: 0.8 },
      { code: 'CAT01-007', description: 'VIP misafirler için özel karşılama düzenlemesi yapıldı mı?', weight: 1.2 },
      { code: 'CAT01-008', description: 'Ön büro personeli profesyonel görünüm içinde miydi?', weight: 1.0 },
      { code: 'CAT01-009', description: 'Check-out işlemi hızlı ve sorunsuz gerçekleşti mi?', weight: 1.0 },
      { code: 'CAT01-010', description: 'Misafir ayrılırken uğurlandı ve tekrar beklendiği belirtildi mi?', weight: 1.2, isCritical: true },
    ],
  },
  {
    code: 'CAT-02',
    name: 'Oda & Housekeeping',
    icon: '🛏️',
    order: 2,
    weight: 1.3,
    criteria: [
      { code: 'CAT02-001', description: 'Oda tam temizlik standartlarında teslim edildi mi?', weight: 1.5, isCritical: true },
      { code: 'CAT02-002', description: 'Yatak örtüsü ve yastık kılıfları pütürsüz, leKsiz ve kokusuzdur.', weight: 1.5, isCritical: true },
      { code: 'CAT02-003', description: 'Banyo tesisleri (lavabo, klozet, duş/küvet) hijyenik ve parlak mı?', weight: 1.5, isCritical: true },
      { code: 'CAT02-004', description: 'Tüm aydınlatmalar çalışıyor mu?', weight: 1.0 },
      { code: 'CAT02-005', description: 'Klima/ısıtma sistemi çalışıyor ve istenilen sıcaklığa ulaşıyor mu?', weight: 1.0 },
      { code: 'CAT02-006', description: 'Mini bar eksiksiz ve stoğu tam mı?', weight: 0.8 },
      { code: 'CAT02-007', description: 'Havlular temiz, katlanmış ve uygun şekilde sunulmuş mu?', weight: 1.0 },
      { code: 'CAT02-008', description: 'Amenity ürünleri eksiksiz ve düzenli mi?', weight: 0.8 },
      { code: 'CAT02-009', description: 'TV uzaktan kumandası ve diğer elektronik cihazlar çalışıyor mu?', weight: 0.8 },
      { code: 'CAT02-010', description: 'Oda kokusu hoş ve tazeleyici mi?', weight: 1.0 },
      { code: 'CAT02-011', description: 'Döşeme ve halılar temiz ve bakımlı mı?', weight: 1.0 },
      { code: 'CAT02-012', description: 'Pencere ve balkon temizliği uygun standartlarda mı?', weight: 0.8 },
      { code: 'CAT02-013', description: 'Turndown servisi zamanında ve eksiksiz yapıldı mı?', weight: 1.0 },
      { code: 'CAT02-014', description: 'Housekeeping personeli kapı çalmadan odaya girmedi mi?', weight: 1.5, isCritical: true },
    ],
  },
  {
    code: 'CAT-03',
    name: 'Yiyecek & İçecek (F&B)',
    icon: '🍽️',
    order: 3,
    weight: 1.2,
    criteria: [
      { code: 'CAT03-001', description: 'Misafir masaya oturduğunda 2 dakika içinde karşılandı mı?', weight: 1.5, isCritical: true },
      { code: 'CAT03-002', description: 'Servis personeli menü hakkında yeterli bilgiye sahip mi?', weight: 1.2, isCritical: true },
      { code: 'CAT03-003', description: 'Yiyecekler doğru sıcaklıkta sunuldu mu?', weight: 1.5, isCritical: true },
      { code: 'CAT03-004', description: 'Tabak presentasyonu görsel açıdan çekici mi?', weight: 1.0 },
      { code: 'CAT03-005', description: 'Servis süresi makul ve vaatte edilen süreyle uyumlu mu?', weight: 1.2 },
      { code: 'CAT03-006', description: 'Personel alerji ve diyet kısıtlamaları hakkında bilgi verdi mi?', weight: 1.5, isCritical: true },
      { code: 'CAT03-007', description: 'Masa düzeni standartlara uygun ve eksiksiz mi?', weight: 0.8 },
      { code: 'CAT03-008', description: 'İçecek servisi zamanında ve doğru yapıldı mı?', weight: 1.0 },
      { code: 'CAT03-009', description: 'Oda servisi siparişi zamanında ulaştırıldı mı?', weight: 1.0 },
      { code: 'CAT03-010', description: 'Hesap doğru ve zamanında sunuldu mu?', weight: 1.0 },
      { code: 'CAT03-011', description: 'Kahvaltı seçenekleri yeterli ve kaliteli miydi?', weight: 1.0 },
      { code: 'CAT03-012', description: 'Bar menüsü çeşitli ve prezantabl mı?', weight: 0.8 },
    ],
  },
  {
    code: 'CAT-04',
    name: 'Spa & Wellness',
    icon: '💆',
    order: 4,
    weight: 1.0,
    criteria: [
      { code: 'CAT04-001', description: 'Spa alanı temiz, düzenli ve kokusuzdur.', weight: 1.5, isCritical: true },
      { code: 'CAT04-002', description: 'Rezervasyon sistemi sorunsuz çalışıyor mu?', weight: 1.0 },
      { code: 'CAT04-003', description: 'Misafir tercih ve sağlık durumu hakkında bilgi alındı mı?', weight: 1.5, isCritical: true },
      { code: 'CAT04-004', description: 'Tedavi odaları uygun sıcaklık ve aydınlatmada mı?', weight: 1.0 },
      { code: 'CAT04-005', description: 'Terapist profesyonel ve sertifikalı mı?', weight: 1.5, isCritical: true },
      { code: 'CAT04-006', description: 'Kullanılan ürünler kaliteli ve açıklandı mı?', weight: 1.0 },
      { code: 'CAT04-007', description: 'Ortak kullanım alanları (sauna, jakuzi, havuz) temiz mi?', weight: 1.0 },
      { code: 'CAT04-008', description: 'Havlu ve bornoz temiz ve yeterli miktarda mı?', weight: 1.0 },
    ],
  },
  {
    code: 'CAT-05',
    name: 'Ortak Alanlar',
    icon: '🏊',
    order: 5,
    weight: 1.0,
    criteria: [
      { code: 'CAT05-001', description: 'Lobi temiz, düzenli ve kokusuzdur.', weight: 1.5, isCritical: true },
      { code: 'CAT05-002', description: 'Havuz alanı hijyenik mi ve su kalitesi uygun mu?', weight: 1.5, isCritical: true },
      { code: 'CAT05-003', description: 'Bahçe bakımlı ve estetik görünümde mi?', weight: 1.0 },
      { code: 'CAT05-004', description: 'Tuvalet ve soyunma odaları sürekli temiz mi?', weight: 1.5, isCritical: true },
      { code: 'CAT05-005', description: 'Koridor ve asansörler temiz ve iyi aydınlatılmış mı?', weight: 1.0 },
      { code: 'CAT05-006', description: 'Spor salonu ekipmanları çalışır durumda ve temiz mi?', weight: 1.0 },
      { code: 'CAT05-007', description: 'Tüm yönlendirme tabelaları açık ve doğru mu?', weight: 0.8 },
    ],
  },
  {
    code: 'CAT-06',
    name: 'Telefon & Misafir İletişimi',
    icon: '📞',
    order: 6,
    weight: 1.0,
    criteria: [
      { code: 'CAT06-001', description: 'Telefon 3 çalışta cevaplandı mı?', weight: 1.5, isCritical: true },
      { code: 'CAT06-002', description: 'Personel uygun telefon karşılama sözleriyle bağlandı mı?', weight: 1.0 },
      { code: 'CAT06-003', description: 'Misafir talepleri 10 dakika içinde yerine getirildi mi?', weight: 1.5, isCritical: true },
      { code: 'CAT06-004', description: 'Şikayetlere profesyonel ve çözüm odaklı yaklaşıldı mı?', weight: 1.5, isCritical: true },
      { code: 'CAT06-005', description: 'Özel günler (doğum günü, yıldönümü) tanındı ve kutlandı mı?', weight: 1.0 },
      { code: 'CAT06-006', description: 'Misafir talepleri takip edilerek geri bildirim verildi mi?', weight: 1.2 },
    ],
  },
  {
    code: 'CAT-07',
    name: 'Teknik & Bakım',
    icon: '🔧',
    order: 7,
    weight: 1.0,
    criteria: [
      { code: 'CAT07-001', description: 'Tesiste görünür bakım/onarım sorunları yok mu?', weight: 1.5, isCritical: true },
      { code: 'CAT07-002', description: 'Su sıcaklığı ve basıncı standartlarda mı?', weight: 1.0 },
      { code: 'CAT07-003', description: 'İnternet/Wi-Fi hızlı ve sorunsuz çalışıyor mu?', weight: 1.0 },
      { code: 'CAT07-004', description: 'Asansörler çalışır durumda ve düzenli bakımlı mı?', weight: 1.2 },
      { code: 'CAT07-005', description: 'Boya, duvar kağıdı ve yüzeyler hasarsız mı?', weight: 1.0 },
      { code: 'CAT07-006', description: 'Kapı kilitleri ve kasalar düzgün çalışıyor mu?', weight: 1.2 },
      { code: 'CAT07-007', description: 'Yangın güvenlik ekipmanları erişilebilir ve bakımlı mı?', weight: 1.5, isCritical: true },
    ],
  },
  {
    code: 'CAT-08',
    name: 'Personel Görünüm & Davranış',
    icon: '👔',
    order: 8,
    weight: 1.1,
    criteria: [
      { code: 'CAT08-001', description: 'Tüm personel temiz ve düzenli üniformayla görev yapıyor mu?', weight: 1.5, isCritical: true },
      { code: 'CAT08-002', description: 'Personel isim kartı takıyor mu?', weight: 1.0 },
      { code: 'CAT08-003', description: 'Saç, tırnak ve genel görünüm standartlara uygun mu?', weight: 1.0 },
      { code: 'CAT08-004', description: 'Personel misafir görmezden gelmeden aktif ilgi gösteriyor mu?', weight: 1.5, isCritical: true },
      { code: 'CAT08-005', description: 'Personel arasındaki iletişim misafir önünde profesyonel mi?', weight: 1.0 },
      { code: 'CAT08-006', description: 'Personel cep telefonu kullanımına ilişkin kurallara uyuyor mu?', weight: 1.2 },
      { code: 'CAT08-007', description: 'Yabancı misafirlere yeterli İngilizce desteği sağlandı mı?', weight: 1.2 },
    ],
  },
];

async function main() {
  console.log('LQA standart verileri yükleniyor...');

  for (const catData of LQA_STANDARDS) {
    const { criteria, ...categoryData } = catData;

    const category = await prisma.lQACategory.upsert({
      where: { code: categoryData.code },
      create: categoryData,
      update: categoryData,
    });

    for (const criteriaData of criteria) {
      await prisma.lQACriteria.upsert({
        where: { code: criteriaData.code },
        create: { ...criteriaData, categoryId: category.id, order: criteria.indexOf(criteriaData) },
        update: criteriaData,
      });
    }

    console.log(`  ✓ ${category.name} (${criteria.length} kriter)`);
  }

  console.log('\nLQA standart verileri başarıyla yüklendi!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
