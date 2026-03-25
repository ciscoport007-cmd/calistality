import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { generatePresignedUploadUrl } from '@/lib/s3';

// Sözleşme yükleme için presigned URL al
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get('fileName');
    const contentType = searchParams.get('contentType') || 'application/pdf';

    if (!fileName) {
      return NextResponse.json({ error: 'Dosya adı gerekli' }, { status: 400 });
    }

    const { uploadUrl, cloud_storage_path } = await generatePresignedUploadUrl(
      `supplier-contracts/${params.id}/${fileName}`,
      contentType,
      false // private
    );

    return NextResponse.json({ uploadUrl, cloud_storage_path });
  } catch (error) {
    console.error('Contract presigned URL error:', error);
    return NextResponse.json(
      { error: 'Yükleme URL adresi oluşturulamadı' },
      { status: 500 }
    );
  }
}

// Sözleşme yükleme tamamlandığında
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
    const { fileName, cloudStoragePath, fileSize, expiryDate } = body;

    // Sözleşme dokümanı oluştur
    const document = await prisma.supplierDocument.create({
      data: {
        supplierId: params.id,
        name: fileName,
        documentType: 'SOZLESME',
        fileName,
        fileSize: fileSize || 0,
        mimeType: 'application/pdf',
        cloudStoragePath,
        isPublic: false,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        uploadedById: session.user.id
      }
    });

    // Tedarikçi sözleşme durumunu güncelle
    await prisma.supplier.update({
      where: { id: params.id },
      data: {
        contractStatus: 'MEVCUT',
        contractUploadDate: new Date()
      }
    });

    // History kaydı
    await prisma.supplierHistory.create({
      data: {
        supplierId: params.id,
        userId: session.user.id,
        action: 'SOZLESME_YUKLENDI',
        newValue: JSON.stringify({ fileName, cloudStoragePath }),
        comments: `Sözleşme yüklendi: ${fileName}`
      }
    });

    return NextResponse.json({ success: true, document });
  } catch (error) {
    console.error('Contract upload complete error:', error);
    return NextResponse.json(
      { error: 'Sözleşme kaydedilemedi' },
      { status: 500 }
    );
  }
}
