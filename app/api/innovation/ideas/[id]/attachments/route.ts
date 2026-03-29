import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth-options';
import { generatePresignedUploadUrl, getFileUrl } from '@/lib/storage';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

// GET - Ekleri listele
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await context.params;

    const attachments = await prisma.innovationIdeaAttachment.findMany({
      where: { ideaId: id },
      include: { uploadedBy: { select: { id: true, name: true, surname: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const withUrls = await Promise.all(
      attachments.map(async (att) => ({
        ...att,
        url: await getFileUrl(att.cloudStoragePath, att.isPublic),
      }))
    );

    return NextResponse.json(withUrls);
  } catch (error) {
    console.error('Ek listesi hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// POST - Presigned URL al ve kayıt oluştur
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await context.params;
    const { fileName, contentType, fileSize, isPublic = false } = await request.json();

    const { uploadUrl, cloud_storage_path } = await generatePresignedUploadUrl(fileName, contentType, isPublic);

    const attachment = await prisma.innovationIdeaAttachment.create({
      data: {
        ideaId: id,
        fileName,
        fileSize,
        mimeType: contentType,
        cloudStoragePath: cloud_storage_path,
        isPublic,
        uploadedById: session.user.id,
      },
      include: { uploadedBy: { select: { id: true, name: true, surname: true } } },
    });

    return NextResponse.json({ uploadUrl, attachment }, { status: 201 });
  } catch (error) {
    console.error('Ek yükleme hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// DELETE - Ek sil
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const attachmentId = searchParams.get('attachmentId');
    if (!attachmentId) {
      return NextResponse.json({ error: 'Ek ID gerekli' }, { status: 400 });
    }

    await prisma.innovationIdeaAttachment.delete({ where: { id: attachmentId } });

    return NextResponse.json({ message: 'Ek silindi' });
  } catch (error) {
    console.error('Ek silme hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
