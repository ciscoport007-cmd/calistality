import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { generatePresignedUploadUrl, deleteFile } from '@/lib/s3';

// GET - Kapanış kanıtlarını getir
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const attachments = await prisma.actionAttachment.findMany({
      where: {
        actionId: id,
        isClosingEvidence: true
      },
      include: {
        uploadedBy: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(attachments);
  } catch (error) {
    console.error('Error fetching closing evidence:', error);
    return NextResponse.json(
      { error: 'Kapanış kanıtları getirilirken hata oluştu' },
      { status: 500 }
    );
  }
}

// POST - Kapanış kanıtı ekle (presigned URL ile)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { fileName, fileSize, mimeType, description } = body;

    if (!fileName || !mimeType) {
      return NextResponse.json(
        { error: 'Dosya adı ve tipi zorunludur' },
        { status: 400 }
      );
    }

    // Aksiyon var mı kontrol et
    const action = await prisma.strategicAction.findUnique({
      where: { id }
    });

    if (!action) {
      return NextResponse.json(
        { error: 'Aksiyon bulunamadı' },
        { status: 404 }
      );
    }

    // Presigned URL oluştur
    const { uploadUrl, cloud_storage_path } = await generatePresignedUploadUrl(
      `closing-evidence/${id}/${fileName}`,
      mimeType,
      false // Private
    );

    // Attachment kaydı oluştur
    const attachment = await prisma.actionAttachment.create({
      data: {
        actionId: id,
        type: 'FILE',
        name: fileName,
        description: description || 'Kapanış kanıtı',
        fileName: fileName,
        fileSize: fileSize || 0,
        mimeType: mimeType,
        cloudStoragePath: cloud_storage_path,
        isPublic: false,
        isClosingEvidence: true,
        uploadedById: session.user.id
      },
      include: {
        uploadedBy: {
          select: { id: true, name: true }
        }
      }
    });

    // Tarihçe kaydı
    await prisma.strategicActionHistory.create({
      data: {
        actionId: id,
        userId: session.user.id,
        actionType: 'KAPANIS_KANITI_EKLENDI',
        newValue: fileName
      }
    });

    return NextResponse.json({
      attachment,
      uploadUrl,
      cloud_storage_path
    });
  } catch (error) {
    console.error('Error creating closing evidence:', error);
    return NextResponse.json(
      { error: 'Kapanış kanıtı eklenirken hata oluştu' },
      { status: 500 }
    );
  }
}

// DELETE - Kapanış kanıtını sil
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const attachmentId = searchParams.get('attachmentId');

    if (!attachmentId) {
      return NextResponse.json(
        { error: 'Ek ID zorunludur' },
        { status: 400 }
      );
    }

    // Eki bul
    const attachment = await prisma.actionAttachment.findFirst({
      where: {
        id: attachmentId,
        actionId: id,
        isClosingEvidence: true
      }
    });

    if (!attachment) {
      return NextResponse.json(
        { error: 'Kapanış kanıtı bulunamadı' },
        { status: 404 }
      );
    }

    // S3'ten sil
    if (attachment.cloudStoragePath) {
      try {
        await deleteFile(attachment.cloudStoragePath);
      } catch (e) {
        console.error('S3 delete error:', e);
      }
    }

    // Veritabanından sil
    await prisma.actionAttachment.delete({
      where: { id: attachmentId }
    });

    // Tarihçe kaydı
    await prisma.strategicActionHistory.create({
      data: {
        actionId: id,
        userId: session.user.id,
        actionType: 'KAPANIS_KANITI_SILINDI',
        oldValue: attachment.name
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting closing evidence:', error);
    return NextResponse.json(
      { error: 'Kapanış kanıtı silinirken hata oluştu' },
      { status: 500 }
    );
  }
}
