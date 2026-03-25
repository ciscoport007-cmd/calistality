import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { createNotification } from '@/lib/notifications';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status');
    const categoryId = searchParams.get('categoryId');
    const supplierType = searchParams.get('supplierType');
    const rating = searchParams.get('rating');
    const grade = searchParams.get('grade'); // A, B, C sınıfı
    const certificates = searchParams.get('certificates'); // virgülle ayrılmış sertifikalar
    const sortBy = searchParams.get('sortBy'); // totalExpenses, overallScore, name, createdAt
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: any = { isActive: true };

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { tradeName: { contains: search, mode: 'insensitive' } },
        { taxNumber: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (status) {
      where.status = status;
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (supplierType) {
      where.supplierType = supplierType;
    }

    if (rating) {
      where.currentRating = rating;
    }

    // A/B/C sınıf filtresi
    if (grade) {
      where.supplierGrade = grade;
    }

    // Sertifika filtreleri (çoklu seçim)
    if (certificates) {
      const certList = certificates.split(',');
      const certConditions: any[] = [];
      
      certList.forEach(cert => {
        switch (cert) {
          case 'certTarimOrman': certConditions.push({ certTarimOrman: true }); break;
          case 'certFSC': certConditions.push({ certFSC: true }); break;
          case 'organic': certConditions.push({ organic: true }); break;
          case 'certFairTrade': certConditions.push({ certFairTrade: true }); break;
          case 'certIFS': certConditions.push({ certIFS: true }); break;
          case 'certBRC': certConditions.push({ certBRC: true }); break;
        }
      });
      
      if (certConditions.length > 0) {
        where.AND = certConditions;
      }
    }

    // Sıralama seçenekleri
    let orderBy: any = { createdAt: 'desc' };
    if (sortBy === 'totalExpenses') {
      // Harcamaya göre sıralama için raw query kullanılacak
      orderBy = { totalOrderAmount: sortOrder };
    } else if (sortBy === 'overallScore') {
      orderBy = { overallScore: sortOrder };
    } else if (sortBy === 'name') {
      orderBy = { name: sortOrder };
    }

    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        include: {
          category: true,
          createdBy: { select: { id: true, name: true, surname: true } },
          approvedBy: { select: { id: true, name: true, surname: true } },
          audits: {
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              code: true,
              title: true,
              status: true,
              auditScore: true,
              actualEndDate: true,
              createdAt: true
            }
          },
          expenses: {
            select: {
              id: true,
              amount: true
            }
          },
          _count: {
            select: {
              contacts: true,
              evaluations: true,
              documents: true,
              audits: true,
              expenses: true
            }
          }
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.supplier.count({ where })
    ]);

    // Her tedarikçi için toplam harcama hesapla
    const suppliersWithTotalExpense = suppliers.map(supplier => ({
      ...supplier,
      totalExpense: supplier.expenses.reduce((sum: number, exp: { amount: number }) => sum + exp.amount, 0)
    }));

    return NextResponse.json({
      suppliers: suppliersWithTotalExpense,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Suppliers fetch error:', error);
    return NextResponse.json(
      { error: 'Tedarikçiler alınamadı' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      tradeName,
      taxNumber,
      taxOffice,
      supplierType,
      categoryId,
      phone,
      fax,
      email,
      website,
      address,
      city,
      country,
      postalCode,
      bankName,
      iban,
      currency,
      productsServices,
      evaluationPeriod,
      // Mevcut Sertifikalar
      isoQuality,
      isoEnvironment,
      isoSafety,
      isoFood,
      haccp,
      tse,
      ce,
      halal,
      kosher,
      gmp,
      organic,
      otherCertificates,
      // Yeni Sertifikalar
      certTarimOrman,
      certFSC,
      certFairTrade,
      certIFS,
      certBRC,
      // Mesafe
      distanceToHotel,
      distanceNotes,
      // Sipariş Takibi
      purchaseFrequency,
      paymentTerms,
      leadTime,
      minimumOrderQuantity,
      deliveryTerms,
      notes,
      isCritical,
      isSubcontractor
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Tedarikçi adı zorunludur' },
        { status: 400 }
      );
    }

    if (!categoryId) {
      return NextResponse.json(
        { error: 'Kategori seçimi zorunludur' },
        { status: 400 }
      );
    }

    // Generate code
    const year = new Date().getFullYear();
    const lastSupplier = await prisma.supplier.findFirst({
      where: { code: { startsWith: `TDK-${year}` } },
      orderBy: { code: 'desc' }
    });

    let nextNumber = 1;
    if (lastSupplier) {
      const lastNumber = parseInt(lastSupplier.code.split('-')[2]);
      nextNumber = lastNumber + 1;
    }
    const code = `TDK-${year}-${nextNumber.toString().padStart(4, '0')}`;

    // Calculate next evaluation date based on period
    const evaluationMonths: Record<string, number> = {
      'AYLIK': 1,
      'UCAYLIK': 3,
      'ALTIAYLIK': 6,
      'YILLIK': 12
    };
    const nextEvaluationDate = new Date();
    nextEvaluationDate.setMonth(nextEvaluationDate.getMonth() + (evaluationMonths[evaluationPeriod || 'YILLIK'] || 12));

    const supplier = await prisma.supplier.create({
      data: {
        code,
        name,
        tradeName,
        taxNumber,
        taxOffice,
        supplierType: supplierType || 'URUN',
        categoryId,
        phone,
        fax,
        email,
        website,
        address,
        city,
        country: country || 'Türkiye',
        postalCode,
        bankName,
        iban,
        currency: currency || 'TRY',
        productsServices,
        evaluationPeriod: evaluationPeriod || 'YILLIK',
        nextEvaluationDate,
        // Mevcut Sertifikalar
        isoQuality: isoQuality || false,
        isoEnvironment: isoEnvironment || false,
        isoSafety: isoSafety || false,
        isoFood: isoFood || false,
        haccp: haccp || false,
        tse: tse || false,
        ce: ce || false,
        halal: halal || false,
        kosher: kosher || false,
        gmp: gmp || false,
        organic: organic || false,
        otherCertificates,
        // Yeni Sertifikalar
        certTarimOrman: certTarimOrman || false,
        certFSC: certFSC || false,
        certFairTrade: certFairTrade || false,
        certIFS: certIFS || false,
        certBRC: certBRC || false,
        // Sözleşme Durumu
        contractStatus: 'BEKLENIYOR',
        // Mesafe
        distanceToHotel: distanceToHotel ? parseFloat(distanceToHotel) : null,
        distanceNotes,
        // Sipariş Takibi
        purchaseFrequency,
        paymentTerms,
        leadTime: leadTime ? parseInt(leadTime) : null,
        minimumOrderQuantity,
        deliveryTerms,
        notes,
        isCritical: isCritical || false,
        isSubcontractor: isSubcontractor || false,
        subcontractorAddedAt: isSubcontractor ? new Date() : null,
        createdById: session.user.id
      },
      include: {
        category: true,
        createdBy: { select: { id: true, name: true, surname: true } }
      }
    });

    // Create history entry
    await prisma.supplierHistory.create({
      data: {
        supplierId: supplier.id,
        userId: session.user.id,
        action: 'OLUSTURULDU',
        newValue: JSON.stringify({ code, name, status: 'ADAY' }),
        comments: `${name} tedarikçisi oluşturuldu`
      }
    });

    // Ali Durur'a sözleşme yükleme bildirimi gönder
    const aliDurur = await prisma.user.findFirst({
      where: {
        OR: [
          { name: { contains: 'Ali', mode: 'insensitive' }, surname: { contains: 'Durur', mode: 'insensitive' } },
          { email: { contains: 'ali.durur', mode: 'insensitive' } }
        ],
        isActive: true
      }
    });

    if (aliDurur) {
      await createNotification({
        userId: aliDurur.id,
        type: 'UYARI',
        title: 'Yeni Tedarikçi - Sözleşme Bekleniyor',
        message: `"${name}" tedarikçisi eklendi, sözleşme yüklenmesi bekleniyor.`,
        link: `/dashboard/suppliers/${supplier.id}`
      });
    }

    // Taşeron olarak işaretlendiyse Kalite Müdürüne bildirim gönder
    if (isSubcontractor) {
      // Kalite Müdürü rolündeki kullanıcıları bul
      const qualityManagers = await prisma.user.findMany({
        where: {
          isActive: true,
          role: {
            name: {
              in: ['Kalite Müdürü', 'Kalite Yöneticisi', 'Quality Manager']
            }
          }
        }
      });

      for (const manager of qualityManagers) {
        await createNotification({
          userId: manager.id,
          type: 'UYARI',
          title: 'Yeni Taşeron Firma',
          message: `"${name}" taşeron olarak işaretlendi, İSG süreçleri takip edilmeli.`,
          link: `/dashboard/ohs/subcontractors`
        });
      }
    }

    return NextResponse.json(supplier, { status: 201 });
  } catch (error) {
    console.error('Supplier create error:', error);
    return NextResponse.json(
      { error: 'Tedarikçi oluşturulamadı' },
      { status: 500 }
    );
  }
}
