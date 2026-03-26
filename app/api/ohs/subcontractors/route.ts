import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export const dynamic = 'force-dynamic';

// Taşeron firmaları listele (tedarikçilerden isSubcontractor=true olanlar)
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    const where: any = {
      isActive: true,
      isSubcontractor: true,
    };

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    const subcontractors = await prisma.supplier.findMany({
      where,
      include: {
        category: true,
        subcontractorDocuments: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          include: {
            uploadedBy: { select: { id: true, name: true, surname: true } },
          },
        },
        _count: {
          select: {
            subcontractorDocuments: { where: { isActive: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Her taşeron için belge son kullanma durumunu kontrol et
    const now = new Date();
    const subcontractorsWithStatus = subcontractors.map((sub) => {
      const expiringDocs = sub.subcontractorDocuments.filter((doc) => {
        if (!doc.expiryDate) return false;
        const daysUntilExpiry = Math.ceil(
          (new Date(doc.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
      });

      const expiredDocs = sub.subcontractorDocuments.filter((doc) => {
        if (!doc.expiryDate) return false;
        return new Date(doc.expiryDate) < now;
      });

      return {
        ...sub,
        expiringDocCount: expiringDocs.length,
        expiredDocCount: expiredDocs.length,
        documentStatus: expiredDocs.length > 0 ? 'EXPIRED' : expiringDocs.length > 0 ? 'EXPIRING' : 'OK',
      };
    });

    return NextResponse.json(subcontractorsWithStatus);
  } catch (error) {
    console.error('Subcontractors fetch error:', error);
    return NextResponse.json(
      { error: 'Taşeronlar alınamadı' },
      { status: 500 }
    );
  }
}
