import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { generatePresignedUploadUrl, getFileUrl } from '@/lib/s3';

type RouteContext = { params: Promise<{ id: string }> };

// Ek Listesi
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await context.params;

    const attachments = await prisma.cAPAAttachment.findMany({
      where: { capaId: id },
      include: {
        uploadedBy: { select: { id: true, name: true, surname: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // URL'leri ekle
    const attachmentsWithUrls = await Promise.all(
      attachments.map(async (att) => ({
        ...att,
        url: await getFileUrl(att.cloudStoragePath, att.isPublic),
      }))
    );

    return NextResponse.json(attachmentsWithUrls);
  } catch (error) {
    console.error('Ek listesi hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// Presigned URL al
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const { fileName, contentType, fileSize, description, isPublic = false, attachmentType = 'GENEL' } = body;

    // Presigned URL oluştur
    const { uploadUrl, cloud_storage_path } = await generatePresignedUploadUrl(
      fileName,
      contentType,
      isPublic
    );

    // Veritabanına kaydet
    const attachment = await prisma.cAPAAttachment.create({
      data: {
        capaId: id,
        fileName,
        fileSize,
        fileType: contentType,
        cloudStoragePath: cloud_storage_path,
        isPublic,
        description,
        attachmentType,
        uploadedById: session.user.id,
      },
      include: {
        uploadedBy: { select: { id: true, name: true, surname: true } },
      },
    });

    return NextResponse.json({
      uploadUrl,
      attachment,
    }, { status: 201 });
  } catch (error) {
    console.error('Presigned URL hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// Ek Sil
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const attachmentId = searchParams.get('attachmentId');

    if (!attachmentId) {
      return NextResponse.json({ error: 'Ek ID gerekli' }, { status: 400 });
    }

    await prisma.cAPAAttachment.delete({
      where: { id: attachmentId },
    });

    return NextResponse.json({ message: 'Ek silindi' });
  } catch (error) {
    console.error('Ek silme hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
