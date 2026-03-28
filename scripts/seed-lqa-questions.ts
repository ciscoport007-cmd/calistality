import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const LQA_DATA = [
  {
    code: 'LQA-OB',
    name: 'Ön Büro ve Karşılama',
    icon: '🛎️',
    order: 10,
    weight: 20,
    criteria: [
      { code: 'OB-001', description: 'Telefon 3 çalış veya 10 saniye içinde yanıtlandı mı?', weight: 1.5, isCritical: true },
      { code: 'OB-002', description: 'Personel uygun ve net bir karşılama cümlesi kullandı mı?', weight: 1.0 },
      { code: 'OB-003', description: 'Etkileşim sırasında misafirin ismi doğal bir şekilde kullanıldı mı?', weight: 1.2, isCritical: true },
      { code: 'OB-004', description: 'Check-in işlemi makul bir süre içinde tamamlandı mı?', weight: 1.2, isCritical: true },
      { code: 'OB-005', description: 'Personel oda yükseltme (upgrade) veya ek hizmet teklifinde bulundu mu?', weight: 1.0 },
      { code: 'OB-006', description: 'Oda yönlendirmesi veya tanıtımı teklif edildi mi?', weight: 0.8 },
      { code: 'OB-007', description: 'Kapı görevlisi misafiri varışta hemen selamladı mı?', weight: 1.0 },
      { code: 'OB-008', description: 'Bagaj yardımı gecikmeksizin teklif edildi mi?', weight: 1.0 },
      { code: 'OB-009', description: 'Concierge yerel tavsiyeler konusunda bilgili ve yardımcı mıydı?', weight: 1.0 },
      { code: 'OB-010', description: 'Personel yerel kültüre duyarlılık ve bilgi birikimi sergiledi mi?', weight: 1.0 },
      { code: 'OB-011', description: 'Check-out işlemi hızlı ve hatasız mıydı?', weight: 1.2, isCritical: true },
      { code: 'OB-012', description: 'Ayrılışta misafire konaklamasının nasıl geçtiği soruldu mu?', weight: 1.0 },
      { code: 'OB-013', description: 'Fatura detayları net bir şekilde açıklandı mı?', weight: 1.2 },
      { code: 'OB-014', description: 'Ulaşım veya sonraki seyahat planları için yardım teklif edildi mi?', weight: 0.8 },
      { code: 'OB-015', description: 'Lobi alanı temiz ve bakımlı mıydı?', weight: 1.2, isCritical: true },
      { code: 'OB-016', description: 'Lobideki sıcaklık seviyesi konforlu muydu?', weight: 0.8 },
      { code: 'OB-017', description: 'Dekorasyon ve çiçekler taze ve amaca uygun muydu?', weight: 0.8 },
      { code: 'OB-018', description: 'Personelin duruşu ve dış görünüşü profesyonel miydi?', weight: 1.0 },
      { code: 'OB-019', description: 'Her etkileşimde göz teması kuruldu mu?', weight: 1.0 },
      { code: 'OB-020', description: 'Personel nazik bir uğurlama gerçekleştirdi mi?', weight: 1.0 },
    ],
  },
  {
    code: 'LQA-FB',
    name: 'Yiyecek ve İçecek',
    icon: '🍽️',
    order: 11,
    weight: 20,
    criteria: [
      { code: 'FB-001', description: 'İçecekler siparişten sonraki 5 dakika içinde servis edildi mi?', weight: 1.2, isCritical: true },
      { code: 'FB-002', description: 'Menü temiz ve iyi durumda mı sunuldu?', weight: 0.8 },
      { code: 'FB-003', description: 'Garson günün spesiyallerini veya diyet seçeneklerini açıkladı mı?', weight: 1.0 },
      { code: 'FB-004', description: 'Sipariş doğru ve eksiksiz alındı mı?', weight: 1.5, isCritical: true },
      { code: 'FB-005', description: 'Masa düzeni tam ve lekesiz miydi?', weight: 1.0 },
      { code: 'FB-006', description: 'Yemekler doğru sıcaklıkta servis edildi mi?', weight: 1.5, isCritical: true },
      { code: 'FB-007', description: 'Tabağın sunumu iştah açıcı ve estetik miydi?', weight: 1.0 },
      { code: 'FB-008', description: 'Personel ilk lokmalardan sonra memnuniyet kontrolü yaptı mı?', weight: 1.0 },
      { code: 'FB-009', description: 'Hesap istendiğinde gecikmeden getirildi mi?', weight: 1.0 },
      { code: 'FB-010', description: 'Restoran atmosferi (ışık, müzik) lüks konsepte uygun muydu?', weight: 1.0 },
      { code: 'FB-011', description: 'Boş tabaklar makul bir sürede masadan alındı mı?', weight: 1.0 },
      { code: 'FB-012', description: 'Oda servisi siparişi söz verilen sürede ulaştı mı?', weight: 1.2, isCritical: true },
      { code: 'FB-013', description: 'Oda servisi tepsisi veya arabası düzenli miydi?', weight: 0.8 },
      { code: 'FB-014', description: 'Oda servisi personeli tepsiyi nereye bırakacağını sordu mu?', weight: 0.8 },
      { code: 'FB-015', description: 'Açık büfe alanı temiz ve sürekli dolu tutuldu mu?', weight: 1.2, isCritical: true },
      { code: 'FB-016', description: 'Kullanılan malzemelerin kalitesi lüks standartları yansıtıyor mu?', weight: 1.2 },
      { code: 'FB-017', description: 'İçecek tazelemeleri proaktif olarak teklif edildi mi?', weight: 1.0 },
      { code: 'FB-018', description: 'Herhangi bir gecikme durumunda personel empati sergiledi mi?', weight: 1.0 },
      { code: 'FB-019', description: 'Masaya yerleştirme süreci verimli bir şekilde yönetildi mi?', weight: 1.0 },
      { code: 'FB-020', description: 'Personel misafir ismini doğru telaffuz etti mi?', weight: 0.8 },
      { code: 'FB-021', description: 'Masada tuz, karabiber gibi temel gereçler eksiksiz miydi?', weight: 0.8 },
      { code: 'FB-022', description: 'Ekmek ve tereyağı servisi zamanında yapıldı mı?', weight: 0.8 },
      { code: 'FB-023', description: 'Personel şarap listesi hakkında yeterli bilgiye sahip miydi?', weight: 1.0 },
      { code: 'FB-024', description: 'Restoran girişinde karşılama süresi 3 dakikanın altında mıydı?', weight: 1.2, isCritical: true },
      { code: 'FB-025', description: 'Çocuklar için uygun seçenekler sunuldu mu?', weight: 0.8 },
    ],
  },
  {
    code: 'LQA-KH',
    name: 'Kat Hizmetleri ve Oda Standartları',
    icon: '🛏️',
    order: 12,
    weight: 25,
    criteria: [
      { code: 'KH-001', description: 'Oda misafir varışında tamamen hazır mıydı?', weight: 1.5, isCritical: true },
      { code: 'KH-002', description: 'Odada toz, saç veya leke gibi temizlik kusurları var mıydı?', weight: 1.5, isCritical: true },
      { code: 'KH-003', description: 'Tüm ışıklar ve elektronik cihazlar çalışır durumda mıydı?', weight: 1.0 },
      { code: 'KH-004', description: 'Yatak, yüksek kaliteli çarşaflarla kusursuz yapılmış mıydı?', weight: 1.5, isCritical: true },
      { code: 'KH-005', description: 'Banyo buklet malzemeleri tam ve düzenli sunuldu mu?', weight: 1.2 },
      { code: 'KH-006', description: 'Minibar temiz ve tam dolu muydu?', weight: 1.0 },
      { code: 'KH-007', description: 'Akşam odası hazırlığı (turndown) standartlara uygun yapıldı mı?', weight: 1.2 },
      { code: 'KH-008', description: 'Misafirin kişisel eşyalarına özen gösterildi mi?', weight: 1.2, isCritical: true },
      { code: 'KH-009', description: 'Klima/sıcaklık kontrolü kolayca kullanılabiliyor mu?', weight: 1.0 },
      { code: 'KH-010', description: 'Koridordan gelen seslere karşı yeterli ses yalıtımı var mı?', weight: 0.8 },
      { code: 'KH-011', description: 'Havlular yumuşak ve doğru şekilde katlanmış mıydı?', weight: 1.0 },
      { code: 'KH-012', description: 'Çöp kovaları tamamen boşaltıldı mı?', weight: 1.0 },
      { code: 'KH-013', description: 'Yazı takımı ve kırtasiye malzemeleri eksiksiz miydi?', weight: 0.8 },
      { code: 'KH-014', description: 'Oda havalandırılmış ve ferah hissettiriyor mu?', weight: 1.0 },
      { code: 'KH-015', description: 'Çamaşırhane hizmeti zamanında ve istendiği gibi teslim edildi mi?', weight: 1.0 },
      { code: 'KH-016', description: 'Gardıropta yeterli sayıda ve tipte askı var mıydı?', weight: 0.8 },
      { code: 'KH-017', description: 'Banyo zemini kuru ve temiz miydi?', weight: 1.2, isCritical: true },
      { code: 'KH-018', description: 'Aynalar ve cam yüzeyler izsiz miydi?', weight: 1.0 },
      { code: 'KH-019', description: 'Personel koridorda misafirle karşılaştığında selam verdi mi?', weight: 0.8 },
      { code: 'KH-020', description: 'Odanın fiziksel durumu (boya, halı) mükemmel miydi?', weight: 1.0 },
      { code: 'KH-021', description: 'Odadaki buklet ürünleri markanın lüks algısıyla örtüşüyor mu?', weight: 1.0 },
      { code: 'KH-022', description: 'Terlikler misafirin kolayca erişebileceği yere bırakıldı mı?', weight: 0.8 },
      { code: 'KH-023', description: 'Kasa (safe box) çalışır durumda ve talimatları net mi?', weight: 1.0 },
      { code: 'KH-024', description: 'Perdesiz alanlarda tam karartma sağlanabiliyor mu?', weight: 0.8 },
      { code: 'KH-025', description: 'Yastık menüsü mevcut ve talepler karşılandı mı?', weight: 1.0 },
    ],
  },
  {
    code: 'LQA-DZ',
    name: 'Duygusal Zeka ve Hizmet Mükemmelliği',
    icon: '💡',
    order: 13,
    weight: 20,
    criteria: [
      { code: 'DZ-001', description: 'Personel bir ihtiyacı talep edilmeden öngördü mü?', weight: 1.5, isCritical: true },
      { code: 'DZ-002', description: 'Personel samimi bir sıcaklık ve misafirperverlik sergiledi mi?', weight: 1.5, isCritical: true },
      { code: 'DZ-003', description: 'Hizmet misafirin tercihlerine göre kişiselleştirildi mi?', weight: 1.2 },
      { code: 'DZ-004', description: 'Ekip, misafiri rahatsız etmeden uyum içinde çalıştı mı?', weight: 1.0 },
      { code: 'DZ-005', description: 'Personelin ses tonu profesyonel ama davetkârdı mı?', weight: 1.0 },
      { code: 'DZ-006', description: 'Personel hizmet stilini misafirin moduna göre uyarladı mı?', weight: 1.2 },
      { code: 'DZ-007', description: 'Herhangi bir hizmet kusuru için içten bir özür dileyebildi mi?', weight: 1.5, isCritical: true },
      { code: 'DZ-008', description: 'Personel daha önce belirtilen bir talebi takip etti mi?', weight: 1.2 },
      { code: 'DZ-009', description: 'Misafir kendini "evinde gibi" hissetti mi?', weight: 1.2 },
      { code: 'DZ-010', description: 'Personel misafirin kökenine kültürel hassasiyet gösterdi mi?', weight: 1.0 },
      { code: 'DZ-011', description: 'Personelin dil yetkinliği anlaşılır düzeyde miydi?', weight: 1.0 },
      { code: 'DZ-012', description: 'Personel yaptığı işe ve tesise olan tutkusunu hissettirdi mi?', weight: 1.0 },
      { code: 'DZ-013', description: 'Şikayetler empati ve çözüm odaklılıkla ele alındı mı?', weight: 1.5, isCritical: true },
      { code: 'DZ-014', description: 'Verilen tavsiyeler "otantik" ve güven verici miydi?', weight: 1.0 },
      { code: 'DZ-015', description: 'Etkileşim misafirde unutulmaz bir anı bıraktı mı?', weight: 1.2 },
    ],
  },
  {
    code: 'LQA-TG',
    name: 'Tesisler, Güvenlik ve Sürdürülebilirlik',
    icon: '🏊',
    order: 14,
    weight: 15,
    criteria: [
      { code: 'TG-001', description: 'Spor salonu ekipmanları temiz ve işlevsel miydi?', weight: 1.0 },
      { code: 'TG-002', description: 'Spor salonunda taze havlu ve su mevcut muydu?', weight: 0.8 },
      { code: 'TG-003', description: 'Spa resepsiyonu huzurlu ve karşılayıcı mıydı?', weight: 1.0 },
      { code: 'TG-004', description: 'Terapist uygulanacak bakımı net bir şekilde açıkladı mı?', weight: 1.2, isCritical: true },
      { code: 'TG-005', description: 'Soyunma odaları düzenli ve tam donanımlı mıydı?', weight: 1.0 },
      { code: 'TG-006', description: 'Havuz suyu sıcaklığı konforlu seviyede miydi?', weight: 1.0 },
      { code: 'TG-007', description: 'Ortak alan tuvaletleri sık sık temizlendi mi?', weight: 1.2, isCritical: true },
      { code: 'TG-008', description: 'Otel aracı temiz miydi ve hoş kokuyor muydu?', weight: 1.0 },
      { code: 'TG-009', description: 'Sürücü güvenli ve profesyonel bir sürüş sergiledi mi?', weight: 1.5, isCritical: true },
      { code: 'TG-010', description: 'Wi-Fi bağlantısı hızlı ve erişimi kolay mıydı?', weight: 1.0 },
      { code: 'TG-011', description: 'Asansörler temiz ve bekleme süresi kısa mıydı?', weight: 0.8 },
      { code: 'TG-012', description: 'Otel dış cephesi iyi aydınlatılmış ve davetkar mıydı?', weight: 0.8 },
      { code: 'TG-013', description: 'Bahçe ve dış alanların bakımı düzenli yapılmış mıydı?', weight: 0.8 },
      { code: 'TG-014', description: 'Güvenlik personeli fark edilir ama rahatsız etmeyecek düzeyde miydi?', weight: 1.0 },
      { code: 'TG-015', description: 'Otel sürdürülebilir uygulamalara (tek kullanımlık plastik azlığı vb.) dair kanıt sunuyor mu?', weight: 1.0 },
    ],
  },
];

async function main() {
  console.log('LQA soru havuzu yükleniyor...');

  for (const catData of LQA_DATA) {
    const { criteria, ...categoryData } = catData;

    const category = await prisma.lQACategory.upsert({
      where: { code: categoryData.code },
      create: { ...categoryData, isActive: true },
      update: { name: categoryData.name, icon: categoryData.icon, weight: categoryData.weight },
    });

    let addedCount = 0;
    for (let i = 0; i < criteria.length; i++) {
      const c = criteria[i];
      await prisma.lQACriteria.upsert({
        where: { code: c.code },
        create: {
          ...c,
          categoryId: category.id,
          order: i + 1,
          isActive: true,
        },
        update: {
          description: c.description,
          weight: c.weight,
          isCritical: c.isCritical ?? false,
        },
      });
      addedCount++;
    }

    console.log(`  ✓ ${category.name} — ${addedCount} soru`);
  }

  const total = LQA_DATA.reduce((sum, c) => sum + c.criteria.length, 0);
  console.log(`\nToplam ${total} soru başarıyla yüklendi!`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
