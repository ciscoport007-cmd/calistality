import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { generatePresignedUploadUrl, getFileUrl, deleteFile } from '@/lib/storage';

export const dynamic = 'force-dynamic';

// Bulgu dosyaları listesi
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; findingId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { findingId } = await params;

    const attachments = await prisma.findingAttachment.findMany({
      where: { findingId },
      include: {
        uploadedBy: {
          select: { id: true, name: true, surname: true }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    // URL'leri oluştur
    const attachmentsWithUrls = await Promise.all(
      attachments.map(async (attachment) => {
        const url = await getFileUrl(attachment.cloudStoragePath, attachment.isPublic);
        return { ...attachment, url };
      })
    );

    return NextResponse.json(attachmentsWithUrls);
  } catch (error) {
    console.error('Bulgu dosyaları hatası:', error);
    return NextResponse.json({ error: 'Dosyalar yüklenirken hata oluştu' }, { status: 500 });
  }
}

// Presigned URL oluştur ve dosya kaydı yap
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; findingId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { findingId } = await params;
    const body = await request.json();
    const { fileName, fileSize, fileType, description, category, isPublic } = body;

    if (!fileName || !fileSize || !fileType) {
      return NextResponse.json(
        { error: 'Dosya bilgileri zorunludur' },
        { status: 400 }
      );
    }

    // Bulgunun var olduğunu kontrol et
    const finding = await prisma.auditFinding.findUnique({
      where: { id: findingId }
    });

    if (!finding) {
      return NextResponse.json({ error: 'Bulgu bulunamadı' }, { status: 404 });
    }

    // Presigned URL oluştur
    const { uploadUrl, cloud_storage_path } = await generatePresignedUploadUrl(
      fileName,
      fileType,
      isPublic ?? false
    );

    // Veritabanına kaydet
    const attachment = await prisma.findingAttachment.create({
      data: {
        findingId,
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
    console.error('Bulgu dosyası yükleme hatası:', error);
    return NextResponse.json({ error: 'Dosya yükleme URL oluşturulurken hata oluştu' }, { status: 500 });
  }
}

// Dosya sil
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; findingId: string }> }
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

    const attachment = await prisma.findingAttachment.findUnique({
      where: { id: attachmentId },
    });

    if (!attachment) {
      return NextResponse.json({ error: 'Dosya bulunamadı' }, { status: 404 });
    }

    // S3'ten sil
    await deleteFile(attachment.cloudStoragePath);

    // Veritabanından sil
    await prisma.findingAttachment.delete({
      where: { id: attachmentId },
    });

    return NextResponse.json({ message: 'Dosya silindi' });
  } catch (error) {
    console.error('Bulgu dosyası silme hatası:', error);
    return NextResponse.json({ error: 'Dosya silinirken hata oluştu' }, { status: 500 });
  }
}
