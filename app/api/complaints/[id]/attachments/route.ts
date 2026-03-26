import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { generatePresignedUploadUrl, getFileUrl } from '@/lib/storage';

export const dynamic = 'force-dynamic';

// Şikayete ait dosyaları listele
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await params;

    const attachments = await prisma.complaintAttachment.findMany({
      where: { complaintId: id },
      include: {
        uploadedBy: {
          select: { id: true, name: true, surname: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Dosya URL'lerini oluştur
    const attachmentsWithUrls = await Promise.all(
      attachments.map(async (attachment) => ({
        ...attachment,
        url: await getFileUrl(attachment.cloudStoragePath, attachment.isPublic),
      }))
    );

    return NextResponse.json(attachmentsWithUrls);
  } catch (error) {
    console.error('Dosya listesi hatası:', error);
    return NextResponse.json({ error: 'Dosyalar alınamadı' }, { status: 500 });
  }
}

// Dosya yükleme için presigned URL al
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { fileName, fileSize, fileType, description, isPublic = false } = body;

    if (!fileName || !fileSize || !fileType) {
      return NextResponse.json(
        { error: 'Dosya bilgileri eksik' },
        { status: 400 }
      );
    }

    // Şikayetin varlığını kontrol et
    const complaint = await prisma.complaint.findUnique({ where: { id } });
    if (!complaint) {
      return NextResponse.json({ error: 'Şikayet bulunamadı' }, { status: 404 });
    }

    // Presigned URL oluştur
    const { uploadUrl, cloud_storage_path } = await generatePresignedUploadUrl(
      `complaints/${id}/${fileName}`,
      fileType,
      isPublic
    );

    // Dosya kaydını oluştur
    const attachment = await prisma.complaintAttachment.create({
      data: {
        complaintId: id,
        fileName,
        fileSize,
        fileType,
        cloudStoragePath: cloud_storage_path,
        isPublic,
        description,
        uploadedById: session.user.id,
      },
    });

    // Geçmiş kaydı oluştur
    await prisma.complaintHistory.create({
      data: {
        complaintId: id,
        userId: session.user.id,
        action: 'DOSYA_EKLENDI',
        newValue: fileName,
        comments: `Dosya yüklendi: ${fileName}`,
      },
    });

    return NextResponse.json(
      {
        attachment,
        uploadUrl,
        cloud_storage_path,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Dosya yükleme hatası:', error);
    return NextResponse.json({ error: 'Dosya yüklenemedi' }, { status: 500 });
  }
}
