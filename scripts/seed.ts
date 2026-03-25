import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seed işlemi başlatılıyor...');

  // 1. Rolleri oluştur
  console.log('👤 Roller oluşturuluyor...');
  const adminRole = await prisma.role.upsert({
    where: { name: 'Admin' },
    update: {},
    create: {
      name: 'Admin',
      description: 'Sistem yöneticisi - tüm yetkilere sahip',
      isActive: true,
    },
  });

  const managerRole = await prisma.role.upsert({
    where: { name: 'Yönetici' },
    update: {},
    create: {
      name: 'Yönetici',
      description: 'Departman yöneticisi',
      isActive: true,
    },
  });

  const userRole = await prisma.role.upsert({
    where: { name: 'Kullanıcı' },
    update: {},
    create: {
      name: 'Kullanıcı',
      description: 'Standart kullanıcı',
      isActive: true,
    },
  });

  // 2. Departmanları oluştur
  console.log('🏢 Departmanlar oluşturuluyor...');
  const kaliteDept = await prisma.department.upsert({
    where: { code: 'KLT' },
    update: {},
    create: {
      name: 'Kalite Departmanı',
      code: 'KLT',
      description: 'Kalite yönetimi ve kontrol',
      isActive: true,
    },
  });

  const uretimDept = await prisma.department.upsert({
    where: { code: 'URT' },
    update: {},
    create: {
      name: 'Üretim Departmanı',
      code: 'URT',
      description: 'Üretim süreçleri',
      isActive: true,
    },
  });

  const argeDept = await prisma.department.upsert({
    where: { code: 'ARG' },
    update: {},
    create: {
      name: 'Ar-Ge Departmanı',
      code: 'ARG',
      description: 'Araştırma ve geliştirme',
      isActive: true,
    },
  });

  const ikDept = await prisma.department.upsert({
    where: { code: 'IK' },
    update: {},
    create: {
      name: 'İnsan Kaynakları',
      code: 'IK',
      description: 'İnsan kaynakları yönetimi',
      isActive: true,
    },
  });

  // 3. Pozisyonları oluştur
  console.log('📋 Pozisyonlar oluşturuluyor...');
  
  // Kalite Yöneticisi
  let kaliteYoneticisi = await prisma.position.findFirst({
    where: { code: 'KLT-YNT', departmentId: null },
  });
  if (!kaliteYoneticisi) {
    kaliteYoneticisi = await prisma.position.create({
      data: {
        name: 'Kalite Yöneticisi',
        code: 'KLT-YNT',
        description: 'Kalite departmanı yöneticisi',
        level: 3,
        isActive: true,
      },
    });
  }

  // Kalite Uzmanı
  let kaliteUzmani = await prisma.position.findFirst({
    where: { code: 'KLT-UZM', departmentId: null },
  });
  if (!kaliteUzmani) {
    kaliteUzmani = await prisma.position.create({
      data: {
        name: 'Kalite Uzmanı',
        code: 'KLT-UZM',
        description: 'Kalite kontrol uzmanı',
        level: 2,
        isActive: true,
      },
    });
  }

  // Departman Müdürü
  let departmanMuduru = await prisma.position.findFirst({
    where: { code: 'DEPT-MDR', departmentId: null },
  });
  if (!departmanMuduru) {
    departmanMuduru = await prisma.position.create({
      data: {
        name: 'Departman Müdürü',
        code: 'DEPT-MDR',
        description: 'Departman müdürü',
        level: 3,
        isActive: true,
      },
    });
  }

  // 4. Test kullanıcılarını oluştur
  console.log('👥 Kullanıcılar oluşturuluyor...');
  const hashedPassword = await bcrypt.hash('johndoe123', 10);
  
  // Admin kullanıcısı - mevcut email korunuyor
  const adminUser = await prisma.user.upsert({
    where: { email: 'john@doe.com' },
    update: {
      name: 'Mehmet',
      surname: 'Yılmaz',
    },
    create: {
      email: 'john@doe.com',
      password: hashedPassword,
      name: 'Mehmet',
      surname: 'Yılmaz',
      phone: '+90 532 111 11 11',
      isActive: true,
      roleId: adminRole.id,
      departmentId: kaliteDept.id,
      positionId: kaliteYoneticisi.id,
    },
  });

  // Ek test kullanıcıları
  const testUsers = [
    { email: 'ahmet.demir@test.com', name: 'Ahmet', surname: 'Demir', role: 'yonetici', dept: 'uretim' },
    { email: 'ayse.kaya@test.com', name: 'Ayşe', surname: 'Kaya', role: 'kullanici', dept: 'kalite' },
    { email: 'fatma.celik@test.com', name: 'Fatma', surname: 'Çelik', role: 'kullanici', dept: 'arge' },
    { email: 'mustafa.ozturk@test.com', name: 'Mustafa', surname: 'Öztürk', role: 'yonetici', dept: 'ik' },
    { email: 'zeynep.aksoy@test.com', name: 'Zeynep', surname: 'Aksoy', role: 'kullanici', dept: 'kalite' },
  ];

  const deptMap: Record<string, string> = {
    kalite: kaliteDept.id,
    uretim: uretimDept.id,
    arge: argeDept.id,
    ik: ikDept.id,
  };

  const roleMap: Record<string, string> = {
    admin: adminRole.id,
    yonetici: managerRole.id,
    kullanici: userRole.id,
  };

  for (const user of testUsers) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        surname: user.surname,
      },
      create: {
        email: user.email,
        password: hashedPassword,
        name: user.name,
        surname: user.surname,
        phone: '+90 555 000 00 00',
        isActive: true,
        roleId: roleMap[user.role],
        departmentId: deptMap[user.dept],
      },
    });
    console.log(`  ✓ ${user.name} ${user.surname} oluşturuldu`);
  }

  // 5. Doküman tiplerini oluştur
  console.log('📄 Doküman tipleri oluşturuluyor...');
  const sopType = await prisma.documentType.upsert({
    where: { code: 'SOP' },
    update: {},
    create: {
      name: 'SOP (Standart Operasyon Prosedürü)',
      code: 'SOP',
      description: 'Standart operasyon prosedürleri',
      isActive: true,
    },
  });

  const prosedurType = await prisma.documentType.upsert({
    where: { code: 'PRS' },
    update: {},
    create: {
      name: 'Prosedür',
      code: 'PRS',
      description: 'İş prosedürleri',
      isActive: true,
    },
  });

  const politikaType = await prisma.documentType.upsert({
    where: { code: 'PLT' },
    update: {},
    create: {
      name: 'Politika',
      code: 'PLT',
      description: 'Şirket politikaları',
      isActive: true,
    },
  });

  const talimatType = await prisma.documentType.upsert({
    where: { code: 'TLM' },
    update: {},
    create: {
      name: 'Talimat',
      code: 'TLM',
      description: 'İş talimatları',
      isActive: true,
    },
  });

  const formType = await prisma.documentType.upsert({
    where: { code: 'FRM' },
    update: {},
    create: {
      name: 'Form',
      code: 'FRM',
      description: 'Formlar ve kayıtlar',
      isActive: true,
    },
  });

  // 6. Klasör yapısını oluştur
  console.log('📁 Klasörler oluşturuluyor...');
  const kaliteFolder = await prisma.folder.upsert({
    where: { code: 'KLT-ROOT' },
    update: {},
    create: {
      name: 'Kalite Dokümanları',
      code: 'KLT-ROOT',
      description: 'Kalite departmanı dokümanları',
      departmentId: kaliteDept.id,
      codeTemplate: 'KLT-{TYPE}-{YEAR}-{NUM}',
      isActive: true,
    },
  });

  const uretimFolder = await prisma.folder.upsert({
    where: { code: 'URT-ROOT' },
    update: {},
    create: {
      name: 'Üretim Dokümanları',
      code: 'URT-ROOT',
      description: 'Üretim departmanı dokümanları',
      departmentId: uretimDept.id,
      codeTemplate: 'URT-{TYPE}-{YEAR}-{NUM}',
      isActive: true,
    },
  });

  // 7. İzinleri oluştur
  console.log('🔐 İzinler oluşturuluyor...');
  const modules = [
    'kontrollü_doküman',
    'müşteri_şikayet',
    'döf',
    'denetim',
    'risk',
    'cihaz',
  ];
  const actions = ['görüntüle', 'oluştur', 'düzenle', 'sil', 'onayla'];

  for (const module of modules) {
    for (const action of actions) {
      // Önce var mı kontrol et
      const existing = await prisma.permission.findFirst({
        where: {
          module,
          action,
          roleId: adminRole.id,
          groupId: null,
        },
      });

      if (!existing) {
        await prisma.permission.create({
          data: {
            module,
            action,
            roleId: adminRole.id,
            description: `Admin rolü için ${module} modülünde ${action} izni`,
          },
        });
      }
    }
  }

  // 8. Şikayet kategorilerini oluştur
  console.log('📋 Şikayet kategorileri oluşturuluyor...');
  const complaintCategories = [
    { name: 'Temizlik', code: 'TEMIZLIK', description: 'Temizlik ile ilgili şikayetler' },
    { name: 'Oda bakım eksikliği', code: 'ODA-BAKIM', description: 'Oda bakım eksikliği şikayetleri' },
    { name: 'Koku', code: 'KOKU', description: 'Koku ile ilgili şikayetler' },
    { name: 'Gürültü', code: 'GURULTU', description: 'Gürültü şikayetleri' },
    { name: 'Eksik ekipman', code: 'EKSIK-EKIP', description: 'Eksik ekipman şikayetleri' },
    { name: 'Yemek kalitesi', code: 'YEMEK-KLT', description: 'Yemek kalitesi şikayetleri' },
    { name: 'Yemek çeşitliliği', code: 'YEMEK-CST', description: 'Yemek çeşitliliği şikayetleri' },
    { name: 'Hijyen', code: 'HIJYEN', description: 'Hijyen şikayetleri' },
    { name: 'Servis hızı', code: 'SERVIS-HIZ', description: 'Servis hızı şikayetleri' },
    { name: 'Alerjen', code: 'ALERJEN', description: 'Alerjen ile ilgili şikayetler' },
    { name: 'İlgisizlik', code: 'ILGISIZLIK', description: 'Personel ilgisizliği şikayetleri' },
    { name: 'Dil eksikliği', code: 'DIL-EKSIK', description: 'Dil eksikliği şikayetleri' },
    { name: 'Çok bekleme', code: 'BEKLEME', description: 'Bekleme süresi şikayetleri' },
    { name: 'Oda tipi', code: 'ODA-TIPI', description: 'Oda tipi ile ilgili şikayetler' },
    { name: 'Havuz hijyeni', code: 'HAVUZ-HIJ', description: 'Havuz hijyeni şikayetleri' },
    { name: 'Haşere', code: 'HASERE', description: 'Haşere ile ilgili şikayetler' },
    { name: 'Klima', code: 'KLIMA', description: 'Klima ile ilgili şikayetler' },
    { name: 'Elektrik', code: 'ELEKTRIK-SK', description: 'Elektrik ile ilgili şikayetler' },
    { name: 'Çocuk aktiviteleri', code: 'COCUK-AKT', description: 'Çocuk aktiviteleri şikayetleri' },
    { name: 'Transfer', code: 'TRANSFER', description: 'Transfer ile ilgili şikayetler' },
    { name: 'Otopark', code: 'OTOPARK', description: 'Otopark şikayetleri' },
    { name: 'Araç şarj', code: 'ARAC-SARJ', description: 'Araç şarj istasyonu şikayetleri' },
    { name: 'Spa', code: 'SPA', description: 'Spa ile ilgili şikayetler' },
    { name: 'Fitness', code: 'FITNESS', description: 'Fitness ile ilgili şikayetler' },
  ];

  for (const cat of complaintCategories) {
    await prisma.complaintCategory.upsert({
      where: { code: cat.code },
      update: {},
      create: cat,
    });
  }

  // 9. Grupları oluştur
  console.log('👥 Gruplar oluşturuluyor...');
  const groups = [
    { name: 'Şikayet Çözüm Ekibi', description: 'Müşteri şikayetlerini çözmekle görevli ekip' },
    { name: 'Kalite Kontrol Ekibi', description: 'Kalite kontrol ve denetim ekibi' },
    { name: 'Teknik Destek Ekibi', description: 'Teknik destek ve sorun giderme ekibi' },
    { name: 'Yönetim Kurulu', description: 'Üst düzey karar verme grubu' },
  ];

  for (const group of groups) {
    await prisma.group.upsert({
      where: { name: group.name },
      update: {},
      create: group,
    });
  }

  // 10. Tedarikçi kategorilerini oluştur (5 Yıldızlı Otel)
  console.log('🏨 Tedarikçi kategorileri oluşturuluyor...');
  const supplierCategories = [
    { name: 'Gıda ve İçecek Tedarikçileri', code: 'GIDA', description: 'Yiyecek, içecek ve gıda malzemeleri tedarikçileri', color: '#10B981', sortOrder: 1 },
    { name: 'Taze Meyve & Sebze', code: 'MEYVE-SEBZE', description: 'Günlük taze meyve ve sebze tedarikçileri', color: '#22C55E', sortOrder: 2 },
    { name: 'Et ve Et Ürünleri', code: 'ET', description: 'Kırmızı et, beyaz et ve şarküteri ürünleri', color: '#DC2626', sortOrder: 3 },
    { name: 'Deniz Ürünleri', code: 'DENIZ', description: 'Balık ve deniz mahsulleri tedarikçileri', color: '#0EA5E9', sortOrder: 4 },
    { name: 'Süt Ürünleri', code: 'SUT', description: 'Süt, peynir, yoğurt ve süt ürünleri', color: '#F5F5F4', sortOrder: 5 },
    { name: 'Fırın ve Pastane Malzemeleri', code: 'FIRIN', description: 'Un, maya ve pastane malzemeleri', color: '#F59E0B', sortOrder: 6 },
    { name: 'İçecek Tedarikçileri', code: 'ICECEK', description: 'Alkolsüz içecekler, meşrubatlar ve sular', color: '#06B6D4', sortOrder: 7 },
    { name: 'Alkollü İçecekler', code: 'ALKOL', description: 'Şarap, bira, distile içkiler ve kokteyller', color: '#7C3AED', sortOrder: 8 },
    { name: 'Temizlik ve Hijyen Malzemeleri', code: 'TEMIZLIK', description: 'Temizlik kimyasalları ve hijyen ürünleri', color: '#3B82F6', sortOrder: 9 },
    { name: 'Çamaşırhane Malzemeleri', code: 'CAMASIR', description: 'Çamaşırhane deterjanları ve kimyasalları', color: '#8B5CF6', sortOrder: 10 },
    { name: 'Otel Tekstili', code: 'TEKSTIL', description: 'Nevresim, havlu, perde ve döşemelik kumaşlar', color: '#EC4899', sortOrder: 11 },
    { name: 'Oda Malzemeleri (Amenity)', code: 'AMENITY', description: 'Şampuan, sabun, terlik ve oda malzemeleri', color: '#14B8A6', sortOrder: 12 },
    { name: 'Mutfak Ekipmanları', code: 'MUTFAK-EKP', description: 'Profesyonel mutfak ekipmanları ve makineleri', color: '#6366F1', sortOrder: 13 },
    { name: 'Mobilya ve Dekorasyon', code: 'MOBILYA', description: 'Otel mobilyaları ve dekorasyon ürünleri', color: '#A855F7', sortOrder: 14 },
    { name: 'Aydınlatma Sistemleri', code: 'AYDINLATMA', description: 'Aydınlatma ürünleri ve sistemleri', color: '#EAB308', sortOrder: 15 },
    { name: 'HVAC - Klima ve Havalandırma', code: 'HVAC', description: 'Isıtma, soğutma ve havalandırma sistemleri', color: '#0284C7', sortOrder: 16 },
    { name: 'Elektrik ve Elektronik', code: 'ELEKTRIK', description: 'Elektrik malzemeleri ve elektronik ekipmanlar', color: '#F97316', sortOrder: 17 },
    { name: 'IT ve Teknoloji', code: 'IT', description: 'Bilgisayar, yazılım ve teknoloji hizmetleri', color: '#64748B', sortOrder: 18 },
    { name: 'Güvenlik Sistemleri', code: 'GUVENLIK', description: 'Güvenlik kameraları, alarm ve erişim sistemleri', color: '#1E293B', sortOrder: 19 },
    { name: 'Havuz ve SPA Malzemeleri', code: 'SPA', description: 'Havuz kimyasalları ve SPA ekipmanları', color: '#0D9488', sortOrder: 20 },
    { name: 'Bahçe ve Peyzaj', code: 'BAHCE', description: 'Bahçe bakımı ve peyzaj malzemeleri', color: '#16A34A', sortOrder: 21 },
    { name: 'İnşaat ve Tadilat', code: 'INSAAT', description: 'İnşaat malzemeleri ve tadilat hizmetleri', color: '#78716C', sortOrder: 22 },
    { name: 'Kırtasiye ve Ofis Malzemeleri', code: 'KIRTASIYE', description: 'Ofis ve kırtasiye malzemeleri', color: '#9CA3AF', sortOrder: 23 },
    { name: 'Baskı ve Matbaa', code: 'BASKI', description: 'Baskı, matbaa ve promosyon ürünleri', color: '#4B5563', sortOrder: 24 },
    { name: 'Taşıma ve Lojistik', code: 'LOJISTIK', description: 'Taşımacılık ve lojistik hizmetleri', color: '#0369A1', sortOrder: 25 },
    { name: 'Araç Kiralama ve Transfer', code: 'ARAC', description: 'Araç kiralama ve transfer hizmetleri', color: '#4338CA', sortOrder: 26 },
    { name: 'Eğitim ve Danışmanlık', code: 'EGITIM', description: 'Personel eğitimi ve danışmanlık hizmetleri', color: '#DB2777', sortOrder: 27 },
    { name: 'Sağlık ve İş Güvenliği', code: 'ISG', description: 'İş sağlığı ve güvenliği malzemeleri', color: '#E11D48', sortOrder: 28 },
    { name: 'Sigorta Hizmetleri', code: 'SIGORTA', description: 'Otel sigortası ve risk yönetimi', color: '#1D4ED8', sortOrder: 29 },
    { name: 'Hukuk ve Mali Müşavirlik', code: 'HUKUK', description: 'Hukuk ve mali müşavirlik hizmetleri', color: '#334155', sortOrder: 30 },
    { name: 'Animasyon ve Eğlence', code: 'ANIMASYON', description: 'Animasyon, müzik ve eğlence hizmetleri', color: '#F472B6', sortOrder: 31 },
    { name: 'Çiçek ve Organizasyon', code: 'CICEK', description: 'Çiçek tedariki ve etkinlik organizasyonu', color: '#FB7185', sortOrder: 32 },
    { name: 'Diğer Tedarikçiler', code: 'DIGER', description: 'Diğer tedarikçi kategorileri', color: '#6B7280', sortOrder: 99 },
  ];

  for (const cat of supplierCategories) {
    await prisma.supplierCategory.upsert({
      where: { code: cat.code },
      update: { name: cat.name, description: cat.description, color: cat.color, sortOrder: cat.sortOrder },
      create: cat,
    });
  }

  // Risk Kategorileri - 5 Yıldızlı Otel için
  console.log('⚠️ Risk Kategorileri oluşturuluyor...');
  const riskCategories = [
    { name: 'Misafir Güvenliği', code: 'MISAFIR-GUVENLIK', description: 'Misafir sağlığı ve güvenliği ile ilgili riskler', color: '#EF4444', sortOrder: 1 },
    { name: 'Gıda Güvenliği', code: 'GIDA-GUVENLIK', description: 'Mutfak, restoran ve gıda hijyeni riskleri', color: '#F97316', sortOrder: 2 },
    { name: 'İş Sağlığı ve Güvenliği', code: 'ISG', description: 'Çalışan sağlığı ve iş güvenliği riskleri', color: '#F59E0B', sortOrder: 3 },
    { name: 'Yangın ve Acil Durum', code: 'YANGIN-ACIL', description: 'Yangın, deprem ve acil durum riskleri', color: '#DC2626', sortOrder: 4 },
    { name: 'Havuz ve SPA', code: 'HAVUZ-SPA', description: 'Havuz, hamam, sauna ve SPA alanı riskleri', color: '#06B6D4', sortOrder: 5 },
    { name: 'Elektrik ve Teknik', code: 'ELEKTRIK-TEKNIK', description: 'Elektrik tesisatı ve teknik ekipman riskleri', color: '#8B5CF6', sortOrder: 6 },
    { name: 'Siber Güvenlik', code: 'SIBER-GUVENLIK', description: 'Bilgi güvenliği ve siber tehditler', color: '#3B82F6', sortOrder: 7 },
    { name: 'Finansal Riskler', code: 'FINANSAL', description: 'Mali kayıp ve dolandırıcılık riskleri', color: '#10B981', sortOrder: 8 },
    { name: 'Operasyonel Riskler', code: 'OPERASYONEL', description: 'Günlük operasyon ve hizmet aksaklıkları', color: '#6366F1', sortOrder: 9 },
    { name: 'Çevresel Riskler', code: 'CEVRESEL', description: 'Çevre kirliliği ve sürdürülebilirlik riskleri', color: '#22C55E', sortOrder: 10 },
    { name: 'Yasal ve Uyum', code: 'YASAL-UYUM', description: 'Mevzuat uyumu ve yasal yaptırım riskleri', color: '#A855F7', sortOrder: 11 },
    { name: 'İtibar ve Marka', code: 'ITIBAR-MARKA', description: 'Otel itibarı ve marka değeri riskleri', color: '#EC4899', sortOrder: 12 },
    { name: 'Tedarik Zinciri', code: 'TEDARIK', description: 'Tedarikçi ve malzeme temin riskleri', color: '#14B8A6', sortOrder: 13 },
    { name: 'İnsan Kaynakları', code: 'IK-RISK', description: 'Personel devri ve yetkinlik riskleri', color: '#F472B6', sortOrder: 14 },
    { name: 'Doğal Afetler', code: 'DOGAL-AFET', description: 'Deprem, sel, fırtına gibi doğal afet riskleri', color: '#78716C', sortOrder: 15 },
    { name: 'Savaş ve Çatışma', code: 'SAVAS', description: 'Savaş, silahlı çatışma, terör saldırısı ve jeopolitik kriz riskleri', color: '#991B1B', sortOrder: 16 },
    { name: 'Epidemik / Pandemik Salgın', code: 'EPIDEMIK-SALGIN', description: 'Bulaşıcı hastalık salgınları, pandemi ve halk sağlığı acil durum riskleri', color: '#7C3AED', sortOrder: 17 },
  ];

  for (const cat of riskCategories) {
    await prisma.riskCategory.upsert({
      where: { code: cat.code },
      update: { name: cat.name, description: cat.description, color: cat.color, sortOrder: cat.sortOrder },
      create: cat,
    });
  }

  // Ekipman Kategorileri
  const equipmentCategories = [
    { name: 'Üretim Ekipmanları', code: 'URETIM', description: 'Üretim sürecinde kullanılan ekipmanlar', color: '#3B82F6', sortOrder: 1 },
    { name: 'Ölçüm ve Test Cihazları', code: 'OLCUM-TEST', description: 'Ölçüm ve test amaçlı kullanılan cihazlar', color: '#10B981', sortOrder: 2 },
    { name: 'Taşıma ve Kaldırma', code: 'TASIMA', description: 'Taşıma ve kaldırma ekipmanları', color: '#F59E0B', sortOrder: 3 },
    { name: 'Elektrik ve Elektronik', code: 'ELEKTRIK', description: 'Elektrik ve elektronik ekipmanlar', color: '#8B5CF6', sortOrder: 4 },
    { name: 'HVAC ve İklimlendirme', code: 'HVAC', description: 'Isıtma, soğutma ve havalandırma sistemleri', color: '#06B6D4', sortOrder: 5 },
    { name: 'Güvenlik Ekipmanları', code: 'GUVENLIK', description: 'İş güvenliği ekipmanları', color: '#EF4444', sortOrder: 6 },
    { name: 'Bilgi Teknolojileri', code: 'BT', description: 'Bilgi teknolojileri ekipmanları', color: '#6366F1', sortOrder: 7 },
    { name: 'Temizlik ve Hijyen', code: 'TEMIZLIK', description: 'Temizlik ve hijyen ekipmanları', color: '#14B8A6', sortOrder: 8 },
    { name: 'Mutfak Ekipmanları', code: 'MUTFAK', description: 'Mutfak ve yemek servisi ekipmanları', color: '#F97316', sortOrder: 9 },
    { name: 'Genel Kullanım', code: 'GENEL', description: 'Genel amaçlı ekipmanlar', color: '#6B7280', sortOrder: 10 },
  ];

  for (const cat of equipmentCategories) {
    await prisma.equipmentCategory.upsert({
      where: { code: cat.code },
      update: { name: cat.name, description: cat.description, color: cat.color, sortOrder: cat.sortOrder },
      create: cat,
    });
  }

  console.log('✅ Seed işlemi tamamlandı!');
  console.log('👤 Test Kullanıcısı:');
  console.log('   Email: john@doe.com');
  console.log('   Şifre: johndoe123');
}

main()
  .catch((e) => {
    console.error('❌ Seed işlemi başarısız:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
