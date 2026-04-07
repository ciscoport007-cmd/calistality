import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { generatePresignedUploadUrl, getFileUrl, deleteFile } from '@/lib/storage';

export const dynamic = 'force-dynamic';

// Dosya listesi
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await params;

    const attachments = await prisma.auditAttachment.findMany({
      where: { auditId: id },
      include: {
        uploadedBy: {
          select: { id: true, name: true, surname: true }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    // URL'leri oluştur
    const attachmentsWithUrls = await Promise.all(
      attachments.map(async (attachment: { cloudStoragePath: string; isPublic: boolean; id: string; fileName: string; fileSize: number; fileType: string; auditId: string; description: string | null; category: string | null; uploadedById: string | null; createdAt: Date; uploadedBy: { id: string; name: string; surname: string | null } | null }) => {
        const url = await getFileUrl(attachment.cloudStoragePath, attachment.isPublic);
        return { ...attachment, url };
      })
    );

    return NextResponse.json(attachmentsWithUrls);
  } catch (error) {
    console.error('Dosya listesi hatası:', error);
    return NextResponse.json({ error: 'Dosyalar yüklenirken hata oluştu' }, { status: 500 });
  }
}

// Presigned URL oluştur
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id: auditId } = await params;
    const body = await request.json();
    const { fileName, fileSize, fileType, description, category, isPublic } = body;

    if (!fileName || !fileSize || !fileType) {
      return NextResponse.json(
        { error: 'Dosya bilgileri zorunludur' },
        { status: 400 }
      );
    }

    // Presigned URL oluştur
    const { uploadUrl, cloud_storage_path } = await generatePresignedUploadUrl(
      fileName,
      fileType,
      isPublic ?? false
    );

    // Veritabanına kaydet
    const attachment = await prisma.auditAttachment.create({
      data: {
        auditId,
        fileName,
        fileSize,
        fileType,
        cloudStoragePath: cloud_storage_path,
        isPublic: isPublic ?? false,
        description,
        category: category || 'DIGER',
        uploadedById: session.user.id as string,
      },
      include: {
        uploadedBy: {
          select: { id: true, name: true, surname: true }
        }
      },
    });

    return NextResponse.json({ uploadUrl, attachment }, { status: 201 });
  } catch (error) {
    console.error('Dosya yükleme URL hatası:', error);
    return NextResponse.json({ error: 'Dosya yükleme URL oluşturulurken hata oluştu' }, { status: 500 });
  }
}

// Dosya sil
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const attachmentId = searchParams.get('attachmentId');

    if (!attachmentId) {
      return NextResponse.json({ error: 'Dosya ID zorunludur' }, { status: 400 });
    }

    const attachment = await prisma.auditAttachment.findUnique({
      where: { id: attachmentId },
    });

    if (!attachment) {
      return NextResponse.json({ error: 'Dosya bulunamadı' }, { status: 404 });
    }

    // S3'ten sil
    await deleteFile(attachment.cloudStoragePath);

    // Veritabanından sil
    await prisma.auditAttachment.delete({
      where: { id: attachmentId },
    });

    return NextResponse.json({ message: 'Dosya silindi' });
  } catch (error) {
    console.error('Dosya silme hatası:', error);
    return NextResponse.json({ error: 'Dosya silinirken hata oluştu' }, { status: 500 });
  }
}
