import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateSupplierCategories() {
  console.log('Tedarikçi kategorileri güncelleniyor...');

  try {
    // "Eğitim ve Danışmanlık" kategorisini bul
    const existingCategory = await prisma.supplierCategory.findFirst({
      where: {
        OR: [
          { name: { contains: 'Eğitim ve Danışmanlık', mode: 'insensitive' } },
          { name: { contains: 'Egitim ve Danismanlik', mode: 'insensitive' } },
          { code: 'EGITIM_DANISMANLIK' }
        ]
      }
    });

    if (existingCategory) {
      // Mevcut kategoriyi "Danışmanlık" olarak güncelle
      await prisma.supplierCategory.update({
        where: { id: existingCategory.id },
        data: {
          name: 'Danışmanlık',
          code: 'DANISMANLIK',
          description: 'Danışmanlık hizmetleri tedarikçileri'
        }
      });
      console.log('"Eğitim ve Danışmanlık" kategorisi "Danışmanlık" olarak güncellendi');
    } else {
      // Danışmanlık kategorisi yoksa oluştur
      await prisma.supplierCategory.upsert({
        where: { code: 'DANISMANLIK' },
        create: {
          name: 'Danışmanlık',
          code: 'DANISMANLIK',
          description: 'Danışmanlık hizmetleri tedarikçileri',
          color: '#6366F1',
          sortOrder: 10
        },
        update: {}
      });
      console.log('"Danışmanlık" kategorisi oluşturuldu');
    }

    // "Eğitim" kategorisini oluştur
    await prisma.supplierCategory.upsert({
      where: { code: 'EGITIM' },
      create: {
        name: 'Eğitim',
        code: 'EGITIM',
        description: 'Eğitim hizmetleri tedarikçileri',
        color: '#8B5CF6',
        sortOrder: 11
      },
      update: {}
    });
    console.log('"Eğitim" kategorisi oluşturuldu');

    // Tüm kategorileri listele
    const categories = await prisma.supplierCategory.findMany({
      orderBy: { sortOrder: 'asc' }
    });
    
    console.log('\nMevcut tedarikçi kategorileri:');
    categories.forEach(cat => {
      console.log(`  - ${cat.name} (${cat.code})`);
    });

    console.log('\nKategori güncelleme tamamlandı.');
  } catch (error) {
    console.error('Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateSupplierCategories();
