import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const categories = [
    {
      name: 'Dikkatsizlik',
      code: 'DIKKATSIZLIK',
      description: 'Personel veya misafir dikkatsizliğinden kaynaklanan şikayetler',
    },
    {
      name: 'Uyarı Eksikliği',
      code: 'UYARI_EKSIKLIGI',
      description: 'Yeterli uyarı veya bilgilendirme yapılmamasından kaynaklanan şikayetler',
    },
  ];

  for (const cat of categories) {
    const existing = await prisma.complaintCategory.findUnique({ where: { code: cat.code } });
    if (existing) {
      console.log(`Zaten mevcut: ${cat.name}`);
      continue;
    }
    await prisma.complaintCategory.create({ data: cat });
    console.log(`Eklendi: ${cat.name}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
