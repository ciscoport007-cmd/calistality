/**
 * LQA Otel Standartları Seed Scripti
 * Çalıştırma: npx tsx prisma/seed-hotel-standards.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const categories = [
  {
    code: 'FO-CHECKIN',
    name: 'Front Office — Check In',
    icon: '🏨',
    order: 10,
    weight: 1.0,
    criteria: [
      // ── Karşılama ve Operasyon ──────────────────────────
      {
        code: 'FO-CI-01',
        description: 'Misafir resepsiyona geldiğinde 30 saniye içinde fark edilip 1 dakika içinde yardım teklif edildi mi?',
        guidance: 'Karşılama ve Operasyon — Karşılama süresi standartları: şehir oteli max 1 dk.',
        isCritical: true,
        weight: 1.0,
        order: 1,
      },
      {
        code: 'FO-CI-02',
        description: 'Misafir zamanında karşılanmadıysa özür dilendi mi?',
        guidance: 'Karşılama ve Operasyon — Gecikme durumunda özür protokolü.',
        isCritical: false,
        weight: 1.0,
        order: 2,
      },
      {
        code: 'FO-CI-03',
        description: 'Yasal olarak mümkün olan durumlarda kağıtsız check-in (paperless check-in) sunuldu mu?',
        guidance: 'Karşılama ve Operasyon — Dijital check-in imkânı sunulmalıdır.',
        isCritical: false,
        weight: 1.0,
        order: 3,
      },
      {
        code: 'FO-CI-04',
        description: 'Check-in işlemi şehir otellerinde 5 dakika, resort otellerde 10 dakika içinde tamamlandı mı?',
        guidance: 'Karşılama ve Operasyon — Süre standartları: şehir 5 dk, resort 10 dk.',
        isCritical: true,
        weight: 1.0,
        order: 4,
      },
      {
        code: 'FO-CI-05',
        description: 'Oda tipi, özel talepler, rezervasyon detayları ve çıkış tarihi teyit edildi mi?',
        guidance: 'Karşılama ve Operasyon — Rezervasyon doğrulama kontrol listesi.',
        isCritical: true,
        weight: 1.0,
        order: 5,
      },
      {
        code: 'FO-CI-06',
        description: 'Oda, ilan edilen check-in saatinde hazır mıydı?',
        guidance: 'Karşılama ve Operasyon — Oda hazırlık standardı.',
        isCritical: true,
        weight: 1.0,
        order: 6,
      },
      {
        code: 'FO-CI-07A',
        description: 'Oda hazır değilse misafire otel imkanları önerildi mi?',
        guidance: 'Karşılama ve Operasyon — Oda gecikmesi protokolü (imkan önerisi).',
        isCritical: false,
        weight: 1.0,
        order: 7,
      },
      {
        code: 'FO-CI-07B',
        description: 'Oda hazır değilse misafire tahmini bekleme süresi söylendi mi?',
        guidance: 'Karşılama ve Operasyon — Oda gecikmesi protokolü (süre bilgisi).',
        isCritical: false,
        weight: 1.0,
        order: 8,
      },
      {
        code: 'FO-CI-07C',
        description: 'Oda hazır değilse bekleme süresi boyunca misafir bilgilendirilmeye devam edildi mi?',
        guidance: 'Karşılama ve Operasyon — Oda gecikmesi protokolü (düzenli bilgilendirme).',
        isCritical: false,
        weight: 1.0,
        order: 9,
      },
      // ── Misafir Yönlendirme ve Refakat ─────────────────
      {
        code: 'FO-CI-08',
        description: 'İlk kez gelen misafire otelin en az iki önemli alanı tanıtıldı mı?',
        guidance: 'Misafir Yönlendirme ve Refakat — Otel tanıtımı (restoranlar, havuz, spa vb.).',
        isCritical: false,
        weight: 1.0,
        order: 10,
      },
      {
        code: 'FO-CI-09',
        description: 'Bagaj taşıma hizmeti teklif edildi mi?',
        guidance: 'Misafir Yönlendirme ve Refakat — Bagaj yardım protokolü.',
        isCritical: false,
        weight: 1.0,
        order: 11,
      },
      {
        code: 'FO-CI-10',
        description: 'Misafire odaya eşlik edildi mi veya eşlik teklif edildi mi?',
        guidance: 'Misafir Yönlendirme ve Refakat — Odaya refakat standardı.',
        isCritical: false,
        weight: 1.0,
        order: 12,
      },
      {
        code: 'FO-CI-11',
        description: 'Refakat yapılmadıysa asansör ve oda yönü açık şekilde anlatıldı mı?',
        guidance: 'Misafir Yönlendirme ve Refakat — Yönlendirme alternatifi.',
        isCritical: false,
        weight: 1.0,
        order: 13,
      },
      {
        code: 'FO-CI-12',
        description: 'Görüşme sonunda samimi bir vedalaşma ve teşekkür yapıldı mı?',
        guidance: 'Misafir Yönlendirme ve Refakat — Kapanış protokolü.',
        isCritical: false,
        weight: 1.0,
        order: 14,
      },
      // ── Çalışan Görünümü ve İletişim (EI Davranış) ────
      {
        code: 'FO-CI-13',
        description: 'Çalışanlar bakımlı, temiz üniformalı ve isimlikli miydi?',
        guidance: 'EI Davranış — Görünüm standardı: üniformaya uygunluk.',
        isCritical: true,
        weight: 1.0,
        order: 15,
      },
      {
        code: 'FO-CI-14',
        description: 'İngilizce konuşma seviyesi iletişim için yeterli miydi?',
        guidance: 'EI Davranış — Yabancı dil yeterliliği.',
        isCritical: true,
        weight: 1.0,
        order: 16,
      },
      {
        code: 'FO-CI-15',
        description: 'İletişim doğal, samimi ve ezberlenmiş hissi vermeden gerçekleşti mi?',
        guidance: 'EI Davranış — İletişim kalitesi ve özgünlük.',
        isCritical: false,
        weight: 1.0,
        order: 17,
      },
      {
        code: 'FO-CI-16',
        description: "Misafirin adı doğal şekilde kullanıldı mı?",
        guidance: 'EI Davranış — Kişiselleştirilmiş iletişim: isim kullanımı.',
        isCritical: false,
        weight: 1.0,
        order: 18,
      },
      {
        code: 'FO-CI-17',
        description: 'Çalışan görevinde kendinden emin miydi ve otel hakkında bilgi sahibiydi mi?',
        guidance: 'EI Davranış — Ürün bilgisi ve güven.',
        isCritical: false,
        weight: 1.0,
        order: 19,
      },
      {
        code: 'FO-CI-18',
        description: 'Çalışan misafir ihtiyaçlarını önceden öngören (anticipatory) hizmet sundu mu?',
        guidance: 'EI Davranış — Proaktif hizmet standardı.',
        isCritical: true,
        weight: 1.0,
        order: 20,
      },
      {
        code: 'FO-CI-19',
        description: 'Değişen durumlara veya misafir ihtiyacına uyum sağladı mı?',
        guidance: 'EI Davranış — Esneklik ve adaptasyon.',
        isCritical: false,
        weight: 1.0,
        order: 21,
      },
      {
        code: 'FO-CI-20',
        description: 'Misafir taleplerini karşılamak için maksimum çaba gösterildi mi veya alternatif sunuldu mu?',
        guidance: 'EI Davranış — Hizmet kararlılığı ve alternatif çözüm.',
        isCritical: true,
        weight: 1.0,
        order: 22,
      },
      {
        code: 'FO-CI-21',
        description: 'Hizmet kişiselleştirildi mi, misafir birey olarak ele alındı mı?',
        guidance: 'EI Davranış — Bireysel hizmet anlayışı.',
        isCritical: false,
        weight: 1.0,
        order: 23,
      },
      {
        code: 'FO-CI-22',
        description: 'Çalışanlar arası koordinasyon kesintisiz ve profesyonel miydi?',
        guidance: 'EI Davranış — Ekip koordinasyonu.',
        isCritical: false,
        weight: 1.0,
        order: 24,
      },
      {
        code: 'FO-CI-23',
        description: 'Çalışan aktif dinleme yaptı mı ve misafir kendini tekrar etmek zorunda kaldı mı?',
        guidance: 'EI Davranış — Aktif dinleme; misafir aynı şeyi iki kez söylememeli.',
        isCritical: false,
        weight: 1.0,
        order: 25,
      },
      {
        code: 'FO-CI-24',
        description: 'Çalışanlar birbirleriyle iletişim kurarken misafire saygılı duruş sergiledi mi?',
        guidance: 'EI Davranış — Misafir huzurunda ekip içi iletişim tutumu.',
        isCritical: false,
        weight: 1.0,
        order: 26,
      },
      {
        code: 'FO-CI-25',
        description: 'Zor durumlarda empati ve öz kontrol gösterildi mi?',
        guidance: 'EI Davranış — Duygusal zeka; stres altında profesyonel tutum.',
        isCritical: true,
        weight: 1.0,
        order: 27,
      },
    ],
  },
  {
    code: 'PORTER-ARRIVAL',
    name: 'Porter / Doorman — Arrival',
    icon: '🚪',
    order: 11,
    weight: 1.0,
    criteria: [
      // ── Karşılama ───────────────────────────────────────
      {
        code: 'PT-AR-01',
        description: 'Misafir geldiğinde kapıda görevli var mıydı ve misafir fark edildi mi?',
        guidance: 'Karşılama — Kapı görevlisi yerinde ve uyanık olmalı.',
        isCritical: true,
        weight: 1.0,
        order: 1,
      },
      {
        code: 'PT-AR-02',
        description: 'Araç kapısı açma yardımı teklif edildi mi?',
        guidance: 'Karşılama — Araçtan inişte kapı açma protokolü.',
        isCritical: false,
        weight: 1.0,
        order: 2,
      },
      {
        code: 'PT-AR-03',
        description: 'Misafir otel adı kullanılarak karşılandı mı?',
        guidance: 'Karşılama — Otel adıyla resmi karşılama standardı.',
        isCritical: true,
        weight: 1.0,
        order: 3,
      },
      {
        code: 'PT-AR-04',
        description: 'Bagaj yardımı teklif edildi ve bagaj adedi teyit edildi mi?',
        guidance: 'Karşılama — Bagaj protokolü: teklif + adet doğrulama.',
        isCritical: true,
        weight: 1.0,
        order: 4,
      },
      {
        code: 'PT-AR-05',
        description: 'Otel giriş kapısı misafir için açıldı mı?',
        guidance: 'Karşılama — Kapı açma hizmeti.',
        isCritical: false,
        weight: 1.0,
        order: 5,
      },
      {
        code: 'PT-AR-06',
        description: 'Vale hizmeti teklif edildi mi ve araç teslim süreci açıklandı mı?',
        guidance: 'Karşılama — Vale hizmeti protokolü: teklif + süreç açıklaması.',
        isCritical: false,
        weight: 1.0,
        order: 6,
      },
      {
        code: 'PT-AR-07',
        description: 'Misafir resepsiyona eşlik edilip adı resepsiyona iletildi mi?',
        guidance: 'Karşılama — Resepsiyona handoff protokolü.',
        isCritical: true,
        weight: 1.0,
        order: 7,
      },
      {
        code: 'PT-AR-08',
        description: 'Eşlik edilmediyse resepsiyon yönü gösterildi mi?',
        guidance: 'Karşılama — Eşlik alternatifi: yönlendirme.',
        isCritical: false,
        weight: 1.0,
        order: 8,
      },
      // ── Bagaj Süreci ────────────────────────────────────
      {
        code: 'PT-BG-01',
        description: 'Bagajlar kamu alanlarında sürekli gözetim altında tutuldu mu?',
        guidance: 'Bagaj Süreci — Bagaj güvenlik standardı; sahipsiz bırakılmamalı.',
        isCritical: true,
        weight: 1.0,
        order: 9,
      },
      {
        code: 'PT-BG-02',
        description: 'Bagajlar resort otellerde 15 dakika içinde odaya ulaştırıldı mı?',
        guidance: 'Bagaj Süreci — Teslimat süresi standardı: resort max 15 dk.',
        isCritical: true,
        weight: 1.0,
        order: 10,
      },
      {
        code: 'PT-BG-03',
        description: 'Odaya girişte kapı çalınıp departman belirtilerek izin istendi mi?',
        guidance: 'Bagaj Süreci — Oda girişi protokolü: çal, departmanı belirt, bekle.',
        isCritical: true,
        weight: 1.0,
        order: 11,
      },
      {
        code: 'PT-BG-04',
        description: 'Valizler doğru şekilde luggage rack üzerine yerleştirildi mi?',
        guidance: 'Bagaj Süreci — Bagaj yerleştirme standardı.',
        isCritical: false,
        weight: 1.0,
        order: 12,
      },
      {
        code: 'PT-BG-05',
        description: "Misafirin kaban veya takım elbisesi asılması teklif edildi mi?",
        guidance: 'Bagaj Süreci — Dolap/askı hizmeti teklifi.',
        isCritical: false,
        weight: 1.0,
        order: 13,
      },
      {
        code: 'PT-BG-06',
        description: 'İlk kez gelen misafire odanın önemli özellikleri tanıtıldı mı?',
        guidance: 'Bagaj Süreci — Oda tanıtımı (iklim kontrolü, güvenli, minibar vb.).',
        isCritical: false,
        weight: 1.0,
        order: 14,
      },
    ],
  },
];

async function main() {
  console.log('🏨 Otel standartları ekleniyor...\n');

  for (const cat of categories) {
    const { criteria, ...categoryData } = cat;

    // Kategori var mı kontrol et — varsa atla, yoksa oluştur
    const existing = await prisma.lQACategory.findUnique({
      where: { code: categoryData.code },
    });

    let category;
    if (existing) {
      console.log(`⚠️  Kategori zaten mevcut, güncelleniyor: ${categoryData.code}`);
      category = await prisma.lQACategory.update({
        where: { code: categoryData.code },
        data: categoryData,
      });
    } else {
      category = await prisma.lQACategory.create({ data: categoryData });
      console.log(`✅ Kategori oluşturuldu: ${category.code} — ${category.name}`);
    }

    // Kriterleri ekle (upsert — varsa güncelle, yoksa oluştur)
    let added = 0;
    let updated = 0;
    for (const criterion of criteria) {
      const result = await prisma.lQACriteria.upsert({
        where: { code: criterion.code },
        update: { ...criterion, categoryId: category.id },
        create: { ...criterion, categoryId: category.id },
      });
      const isNew = result.createdAt.getTime() === result.updatedAt.getTime();
      if (isNew) added++; else updated++;
    }

    console.log(
      `   📋 ${criteria.length} kriter — ${added} yeni eklendi, ${updated} güncellendi\n`
    );
  }

  console.log('✅ Tamamlandı.');
}

main()
  .catch((e) => {
    console.error('❌ Hata:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
