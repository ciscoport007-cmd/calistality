import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getFileUrl } from '@/lib/storage';
import { createNotification } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

// Tedarikçiye ait belgeleri listele
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const documents = await prisma.supplierDocument.findMany({
      where: { supplierId: params.id },
      include: {
        uploadedBy: { select: { id: true, name: true, surname: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Her belge için indirme URL'i oluştur
    const docsWithUrls = await Promise.all(
      documents.map(async (doc) => {
        let downloadUrl = null;
        try {
          downloadUrl = await getFileUrl(doc.cloudStoragePath, doc.isPublic);
        } catch (e) {
          console.error('URL generation error:', e);
        }
        return {
          ...doc,
          downloadUrl,
        };
      })
    );

    return NextResponse.json(docsWithUrls);
  } catch (error) {
    console.error('Supplier documents fetch error:', error);
    return NextResponse.json(
      { error: 'Belgeler alınamadı' },
      { status: 500 }
    );
  }
}

// Yeni belge yükle
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      documentType,
      description,
      expiryDate,
      fileName,
      fileSize,
      mimeType,
      cloudStoragePath,
      isPublic,
    } = body;

    // Validasyon
    if (!name || !documentType || !fileName || !cloudStoragePath) {
      return NextResponse.json(
        { error: 'Zorunlu alanlar eksik' },
        { status: 400 }
      );
    }

    // PDF kontrolü
    if (mimeType && mimeType !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Yalnızca PDF dosyaları kabul edilmektedir' },
        { status: 400 }
      );
    }

    const document = await prisma.supplierDocument.create({
      data: {
        supplierId: params.id,
        name,
        documentType,
        description,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        fileName,
        fileSize,
        mimeType: mimeType || 'application/pdf',
        cloudStoragePath,
        isPublic: isPublic || false,
        uploadedById: session.user.id,
      },
      include: {
        uploadedBy: { select: { id: true, name: true, surname: true } },
        supplier: { select: { id: true, name: true, code: true } },
      },
    });

    // Tedarikçi geçmişine ekle
    await prisma.supplierHistory.create({
      data: {
        supplierId: params.id,
        userId: session.user.id,
        action: 'BELGE_YUKLENDI',
        comments: `Belge yüklendi: ${name} (${documentType})`,
      },
    });

    // Geçerlilik tarihi varsa ve 30 gün içinde doluyorsa bildirim planla
    if (expiryDate) {
      const expDate = new Date(expiryDate);
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      
      if (expDate <= thirtyDaysFromNow && expDate > now) {
        // Tedarikçiyi oluşturan kullanıcıya bildirim gönder
        const supplier = await prisma.supplier.findUnique({
          where: { id: params.id },
          select: { createdById: true, name: true },
        });

        if (supplier) {
          await createNotification({
            userId: supplier.createdById,
            type: 'UYARI',
            title: 'Belge Süresi Dolacak',
            message: `${supplier.name} tedarikçisine ait "${name}" belgesinin süresi ${expDate.toLocaleDateString('tr-TR')} tarihinde dolacak.`,
            link: `/dashboard/suppliers/${params.id}?tab=documents`,
          });
        }
      }
    }

    // İndirme URL'i ekle
    let downloadUrl = null;
    try {
      downloadUrl = await getFileUrl(cloudStoragePath, isPublic || false);
    } catch (e) {
      console.error('URL generation error:', e);
    }

    return NextResponse.json({ ...document, downloadUrl }, { status: 201 });
  } catch (error) {
    console.error('Supplier document create error:', error);
    return NextResponse.json(
      { error: 'Belge yüklenemedi' },
      { status: 500 }
    );
  }
}

// Belge sil
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json(
        { error: 'Belge ID zorunludur' },
        { status: 400 }
      );
    }

    const document = await prisma.supplierDocument.findUnique({
      where: { id: documentId },
      include: { supplier: true },
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Belge bulunamadı' },
        { status: 404 }
      );
    }

    await prisma.supplierDocument.delete({
      where: { id: documentId },
    });

    // Tedarikçi geçmişine ekle
    await prisma.supplierHistory.create({
      data: {
        supplierId: document.supplierId,
        userId: session.user.id,
        action: 'SILINDI',
        comments: `Belge silindi: ${document.name}`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Supplier document delete error:', error);
    return NextResponse.json(
      { error: 'Belge silinemedi' },
      { status: 500 }
    );
  }
}
