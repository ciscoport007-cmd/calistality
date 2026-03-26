import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export const dynamic = 'force-dynamic';

// Varsayılan denetim soruları
const DEFAULT_QUESTIONS = [
  'Firma yasal kayıt belgeleri güncel mi?',
  'Vergi levhası mevcut ve güncel mi?',
  'İSG sertifikaları var mı ve geçerli mi?',
  'Çalışanlar için sosyal güvenlik kayıtları düzenli mi?',
  'İş kazası geçmişi sorgulandı mı?',
  'Firma tesisi fiziksel olarak denetlendi mi?',
  'Ürün/hizmet kalite belgeleri mevcut mu? (ISO, CE vb.)',
  'Referans kontrolleri yapıldı mı?',
  'Fiyat teklifi ve sözleşme şartları uygun mu?',
  'Teslimat/sevkiyat kapasitesi yeterli mi?',
  'Çevre yönetim politikası var mı?',
  'Etik iş ilkeleri ve davranış kuralları mevcut mu?',
  'Alt tedarikçi kullanıyor mu? Kullanıyorsa kayıtlı mı?',
  'Acil durum ve iş sürekliliği planı var mı?',
  'Daha önceki denetimlerde tespit edilen bulgular kapatılmış mı?',
  'Depolama ve taşıma koşulları uygun mu?',
  'Hijyen ve temizlik standartları yeterli mi?',
  'Gizlilik ve veri güvenliği politikası var mı?',
  'Finansal istikrar değerlendirildi mi?',
  'Genel izlenim ve güvenilirlik yeterli mi?',
];

// Soruları listele (yoksa varsayılanları oluştur)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    let questions = await prisma.supplierAuditQuestion.findMany({
      where: { isActive: true },
      orderBy: { orderNo: 'asc' },
    });

    // Varsayılan soruları oluştur (eğer hiç soru yoksa)
    if (questions.length === 0) {
      const createdQuestions = await Promise.all(
        DEFAULT_QUESTIONS.map((question, index) =>
          prisma.supplierAuditQuestion.create({
            data: {
              orderNo: index + 1,
              question,
            },
          })
        )
      );
      questions = createdQuestions;
    }

    return NextResponse.json(questions);
  } catch (error) {
    console.error('Audit questions fetch error:', error);
    return NextResponse.json(
      { error: 'Sorular alınamadı' },
      { status: 500 }
    );
  }
}

// Yeni soru ekle
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    // Yetki kontrolü
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { role: true },
    });

    const allowedRoles = ['Admin', 'Yönetici', 'Kalite Müdürü'];
    if (!user?.role || !allowedRoles.some(r => user.role?.name.includes(r))) {
      return NextResponse.json(
        { error: 'Bu işlem için yetkiniz yok' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { question } = body;

    if (!question) {
      return NextResponse.json(
        { error: 'Soru metni zorunludur' },
        { status: 400 }
      );
    }

    // En yüksek sıra numarasını bul
    const lastQuestion = await prisma.supplierAuditQuestion.findFirst({
      orderBy: { orderNo: 'desc' },
    });

    const newQuestion = await prisma.supplierAuditQuestion.create({
      data: {
        orderNo: (lastQuestion?.orderNo || 0) + 1,
        question,
      },
    });

    return NextResponse.json(newQuestion, { status: 201 });
  } catch (error) {
    console.error('Audit question create error:', error);
    return NextResponse.json(
      { error: 'Soru eklenemedi' },
      { status: 500 }
    );
  }
}

// Soru güncelle veya sil
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const body = await request.json();
    const { id, question, isActive, orderNo } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Soru ID zorunludur' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (question !== undefined) updateData.question = question;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (orderNo !== undefined) updateData.orderNo = orderNo;

    const updated = await prisma.supplierAuditQuestion.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Audit question update error:', error);
    return NextResponse.json(
      { error: 'Soru güncellenemedi' },
      { status: 500 }
    );
  }
}
