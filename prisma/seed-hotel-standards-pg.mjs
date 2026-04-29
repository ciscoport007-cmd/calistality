/**
 * LQA Otel Standartları Seed — pg driver ile direkt bağlantı
 * Çalıştırma: node prisma/seed-hotel-standards-pg.mjs
 */

import pg from 'pg';

const { Client } = pg;

const DB_URL = process.env.DATABASE_URL ||
  "postgresql://role_a9cbc14d6:mQCh8JoDPGgs8KaZbPQaXbsrgGBOoCXm@db-a9cbc14d6.db003.hosteddb.reai.io:5432/a9cbc14d6?connect_timeout=30";

const categories = [
  {
    code: 'FO-CHECKIN',
    name: 'Front Office — Check In',
    icon: '🏨',
    order: 10,
    weight: 1.0,
    criteria: [
      { code: 'FO-CI-01', description: 'Misafir resepsiyona geldiğinde 30 saniye içinde fark edilip 1 dakika içinde yardım teklif edildi mi?', guidance: 'Karşılama ve Operasyon — Karşılama süresi: şehir oteli max 1 dk.', isCritical: true, order: 1 },
      { code: 'FO-CI-02', description: 'Misafir zamanında karşılanmadıysa özür dilendi mi?', guidance: 'Karşılama ve Operasyon — Gecikme durumunda özür protokolü.', isCritical: false, order: 2 },
      { code: 'FO-CI-03', description: 'Yasal olarak mümkün olan durumlarda kağıtsız check-in (paperless check-in) sunuldu mu?', guidance: 'Karşılama ve Operasyon — Dijital check-in imkânı.', isCritical: false, order: 3 },
      { code: 'FO-CI-04', description: 'Check-in işlemi şehir otellerinde 5 dakika, resort otellerde 10 dakika içinde tamamlandı mı?', guidance: 'Karşılama ve Operasyon — Süre: şehir 5 dk, resort 10 dk.', isCritical: true, order: 4 },
      { code: 'FO-CI-05', description: 'Oda tipi, özel talepler, rezervasyon detayları ve çıkış tarihi teyit edildi mi?', guidance: 'Karşılama ve Operasyon — Rezervasyon doğrulama.', isCritical: true, order: 5 },
      { code: 'FO-CI-06', description: 'Oda, ilan edilen check-in saatinde hazır mıydı?', guidance: 'Karşılama ve Operasyon — Oda hazırlık standardı.', isCritical: true, order: 6 },
      { code: 'FO-CI-07A', description: 'Oda hazır değilse misafire otel imkanları önerildi mi?', guidance: 'Karşılama ve Operasyon — Oda gecikmesi: imkan önerisi.', isCritical: false, order: 7 },
      { code: 'FO-CI-07B', description: 'Oda hazır değilse misafire tahmini bekleme süresi söylendi mi?', guidance: 'Karşılama ve Operasyon — Oda gecikmesi: süre bilgisi.', isCritical: false, order: 8 },
      { code: 'FO-CI-07C', description: 'Oda hazır değilse bekleme süresi boyunca misafir bilgilendirilmeye devam edildi mi?', guidance: 'Karşılama ve Operasyon — Oda gecikmesi: düzenli bilgilendirme.', isCritical: false, order: 9 },
      { code: 'FO-CI-08', description: 'İlk kez gelen misafire otelin en az iki önemli alanı tanıtıldı mı?', guidance: 'Misafir Yönlendirme ve Refakat — Otel tanıtımı.', isCritical: false, order: 10 },
      { code: 'FO-CI-09', description: 'Bagaj taşıma hizmeti teklif edildi mi?', guidance: 'Misafir Yönlendirme ve Refakat — Bagaj yardım protokolü.', isCritical: false, order: 11 },
      { code: 'FO-CI-10', description: 'Misafire odaya eşlik edildi mi veya eşlik teklif edildi mi?', guidance: 'Misafir Yönlendirme ve Refakat — Odaya refakat standardı.', isCritical: false, order: 12 },
      { code: 'FO-CI-11', description: 'Refakat yapılmadıysa asansör ve oda yönü açık şekilde anlatıldı mı?', guidance: 'Misafir Yönlendirme ve Refakat — Yönlendirme alternatifi.', isCritical: false, order: 13 },
      { code: 'FO-CI-12', description: 'Görüşme sonunda samimi bir vedalaşma ve teşekkür yapıldı mı?', guidance: 'Misafir Yönlendirme ve Refakat — Kapanış protokolü.', isCritical: false, order: 14 },
      { code: 'FO-CI-13', description: 'Çalışanlar bakımlı, temiz üniformalı ve isimlikli miydi?', guidance: 'EI Davranış — Görünüm standardı.', isCritical: true, order: 15 },
      { code: 'FO-CI-14', description: 'İngilizce konuşma seviyesi iletişim için yeterli miydi?', guidance: 'EI Davranış — Yabancı dil yeterliliği.', isCritical: true, order: 16 },
      { code: 'FO-CI-15', description: 'İletişim doğal, samimi ve ezberlenmiş hissi vermeden gerçekleşti mi?', guidance: 'EI Davranış — İletişim kalitesi ve özgünlük.', isCritical: false, order: 17 },
      { code: 'FO-CI-16', description: 'Misafirin adı doğal şekilde kullanıldı mı?', guidance: 'EI Davranış — Kişiselleştirilmiş iletişim: isim kullanımı.', isCritical: false, order: 18 },
      { code: 'FO-CI-17', description: 'Çalışan görevinde kendinden emin miydi ve otel hakkında bilgi sahibiydi mi?', guidance: 'EI Davranış — Ürün bilgisi ve güven.', isCritical: false, order: 19 },
      { code: 'FO-CI-18', description: 'Çalışan misafir ihtiyaçlarını önceden öngören (anticipatory) hizmet sundu mu?', guidance: 'EI Davranış — Proaktif hizmet standardı.', isCritical: true, order: 20 },
      { code: 'FO-CI-19', description: 'Değişen durumlara veya misafir ihtiyacına uyum sağladı mı?', guidance: 'EI Davranış — Esneklik ve adaptasyon.', isCritical: false, order: 21 },
      { code: 'FO-CI-20', description: 'Misafir taleplerini karşılamak için maksimum çaba gösterildi mi veya alternatif sunuldu mu?', guidance: 'EI Davranış — Hizmet kararlılığı ve alternatif çözüm.', isCritical: true, order: 22 },
      { code: 'FO-CI-21', description: 'Hizmet kişiselleştirildi mi, misafir birey olarak ele alındı mı?', guidance: 'EI Davranış — Bireysel hizmet anlayışı.', isCritical: false, order: 23 },
      { code: 'FO-CI-22', description: 'Çalışanlar arası koordinasyon kesintisiz ve profesyonel miydi?', guidance: 'EI Davranış — Ekip koordinasyonu.', isCritical: false, order: 24 },
      { code: 'FO-CI-23', description: 'Çalışan aktif dinleme yaptı mı ve misafir kendini tekrar etmek zorunda kaldı mı?', guidance: 'EI Davranış — Aktif dinleme; misafir aynı şeyi iki kez söylememeli.', isCritical: false, order: 25 },
      { code: 'FO-CI-24', description: 'Çalışanlar birbirleriyle iletişim kurarken misafire saygılı duruş sergiledi mi?', guidance: 'EI Davranış — Misafir huzurunda ekip içi iletişim tutumu.', isCritical: false, order: 26 },
      { code: 'FO-CI-25', description: 'Zor durumlarda empati ve öz kontrol gösterildi mi?', guidance: 'EI Davranış — Duygusal zeka; stres altında profesyonel tutum.', isCritical: true, order: 27 },
    ],
  },
  {
    code: 'PORTER-ARRIVAL',
    name: 'Porter / Doorman — Arrival',
    icon: '🚪',
    order: 11,
    weight: 1.0,
    criteria: [
      { code: 'PT-AR-01', description: 'Misafir geldiğinde kapıda görevli var mıydı ve misafir fark edildi mi?', guidance: 'Karşılama — Kapı görevlisi yerinde ve uyanık olmalı.', isCritical: true, order: 1 },
      { code: 'PT-AR-02', description: 'Araç kapısı açma yardımı teklif edildi mi?', guidance: 'Karşılama — Araçtan inişte kapı açma protokolü.', isCritical: false, order: 2 },
      { code: 'PT-AR-03', description: 'Misafir otel adı kullanılarak karşılandı mı?', guidance: 'Karşılama — Otel adıyla resmi karşılama standardı.', isCritical: true, order: 3 },
      { code: 'PT-AR-04', description: 'Bagaj yardımı teklif edildi ve bagaj adedi teyit edildi mi?', guidance: 'Karşılama — Bagaj protokolü: teklif + adet doğrulama.', isCritical: true, order: 4 },
      { code: 'PT-AR-05', description: 'Otel giriş kapısı misafir için açıldı mı?', guidance: 'Karşılama — Kapı açma hizmeti.', isCritical: false, order: 5 },
      { code: 'PT-AR-06', description: 'Vale hizmeti teklif edildi mi ve araç teslim süreci açıklandı mı?', guidance: 'Karşılama — Vale hizmeti: teklif + süreç açıklaması.', isCritical: false, order: 6 },
      { code: 'PT-AR-07', description: 'Misafir resepsiyona eşlik edilip adı resepsiyona iletildi mi?', guidance: 'Karşılama — Resepsiyona handoff protokolü.', isCritical: true, order: 7 },
      { code: 'PT-AR-08', description: 'Eşlik edilmediyse resepsiyon yönü gösterildi mi?', guidance: 'Karşılama — Eşlik alternatifi: yönlendirme.', isCritical: false, order: 8 },
      { code: 'PT-BG-01', description: 'Bagajlar kamu alanlarında sürekli gözetim altında tutuldu mu?', guidance: 'Bagaj Süreci — Bagaj güvenlik standardı; sahipsiz bırakılmamalı.', isCritical: true, order: 9 },
      { code: 'PT-BG-02', description: 'Bagajlar resort otellerde 15 dakika içinde odaya ulaştırıldı mı?', guidance: 'Bagaj Süreci — Teslimat süresi: resort max 15 dk.', isCritical: true, order: 10 },
      { code: 'PT-BG-03', description: 'Odaya girişte kapı çalınıp departman belirtilerek izin istendi mi?', guidance: 'Bagaj Süreci — Oda girişi: çal, departmanı belirt, bekle.', isCritical: true, order: 11 },
      { code: 'PT-BG-04', description: 'Valizler doğru şekilde luggage rack üzerine yerleştirildi mi?', guidance: 'Bagaj Süreci — Bagaj yerleştirme standardı.', isCritical: false, order: 12 },
      { code: 'PT-BG-05', description: 'Misafirin kaban veya takım elbisesi asılması teklif edildi mi?', guidance: 'Bagaj Süreci — Dolap/askı hizmeti teklifi.', isCritical: false, order: 13 },
      { code: 'PT-BG-06', description: 'İlk kez gelen misafire odanın önemli özellikleri tanıtıldı mı?', guidance: 'Bagaj Süreci — Oda tanıtımı (iklim kontrolü, güvenli, minibar vb.).', isCritical: false, order: 14 },
    ],
  },
];

async function main() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  console.log('🔌 Veritabanına bağlandı.\n🏨 Otel standartları ekleniyor...\n');

  const now = new Date().toISOString();

  for (const cat of categories) {
    const { criteria, ...catData } = cat;

    // Kategori upsert
    const catRes = await client.query(
      `SELECT id FROM lqa_categories WHERE code = $1`,
      [catData.code]
    );

    let categoryId;
    if (catRes.rows.length > 0) {
      categoryId = catRes.rows[0].id;
      await client.query(
        `UPDATE lqa_categories SET name=$1, icon=$2, "order"=$3, weight=$4, "updatedAt"=$5 WHERE id=$6`,
        [catData.name, catData.icon, catData.order, catData.weight, now, categoryId]
      );
      console.log(`⚠️  Güncellendi: ${catData.code} — ${catData.name}`);
    } else {
      categoryId = `c${Math.random().toString(36).slice(2, 27)}`;
      await client.query(
        `INSERT INTO lqa_categories (id, code, name, icon, "order", weight, "isActive", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, true, $7, $7)`,
        [categoryId, catData.code, catData.name, catData.icon, catData.order, catData.weight, now]
      );
      console.log(`✅ Kategori oluşturuldu: ${catData.code} — ${catData.name}`);
    }

    let added = 0, updated = 0;
    for (const cr of criteria) {
      const crRes = await client.query(
        `SELECT id FROM lqa_criteria WHERE code = $1`,
        [cr.code]
      );
      if (crRes.rows.length > 0) {
        await client.query(
          `UPDATE lqa_criteria SET description=$1, guidance=$2, "isCritical"=$3, "order"=$4,
           "categoryId"=$5, weight=1.0, "isActive"=true, "updatedAt"=$6 WHERE code=$7`,
          [cr.description, cr.guidance, cr.isCritical, cr.order, categoryId, now, cr.code]
        );
        updated++;
      } else {
        const crId = `c${Math.random().toString(36).slice(2, 27)}`;
        await client.query(
          `INSERT INTO lqa_criteria (id, "categoryId", code, description, guidance, weight, "isCritical", "isActive", "order", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, 1.0, $6, true, $7, $8, $8)`,
          [crId, categoryId, cr.code, cr.description, cr.guidance, cr.isCritical, cr.order, now]
        );
        added++;
      }
    }

    console.log(`   📋 ${criteria.length} kriter — ${added} yeni, ${updated} güncellendi\n`);
  }

  await client.end();
  console.log('✅ Tamamlandı.');
}

main().catch(e => { console.error('❌ Hata:', e.message); process.exit(1); });
