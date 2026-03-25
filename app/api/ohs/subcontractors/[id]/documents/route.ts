import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { createNotification } from '@/lib/notifications';

// Belgeleri listele
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const documents = await prisma.subcontractorDocument.findMany({
      where: {
        supplierId: params.id,
        isActive: true,
      },
      include: {
        uploadedBy: { select: { id: true, name: true, surname: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error('Documents fetch error:', error);
    return NextResponse.json(
      { error: 'Belgeler alınamadı' },
      { status: 500 }
    );
  }
}

// Yeni belge ekle
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
      documentType,
      title,
      description,
      fileName,
      fileSize,
      fileType,
      cloudStoragePath,
      isPublic,
      expiryDate,
    } = body;

    // Taşeron kontrolü
    const supplier = await prisma.supplier.findUnique({
      where: { id: params.id },
    });

    if (!supplier || !supplier.isSubcontractor) {
      return NextResponse.json(
        { error: 'Taşeron bulunamadı' },
        { status: 404 }
      );
    }

    const document = await prisma.subcontractorDocument.create({
      data: {
        supplierId: params.id,
        documentType,
        title,
        description,
        fileName,
        fileSize,
        fileType,
        cloudStoragePath,
        isPublic: isPublic || false,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        uploadedById: session.user.id,
      },
      include: {
        uploadedBy: { select: { id: true, name: true, surname: true } },
      },
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error('Document create error:', error);
    return NextResponse.json(
      { error: 'Belge oluşturulamadı' },
      { status: 500 }
    );
  }
}
