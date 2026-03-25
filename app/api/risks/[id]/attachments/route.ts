import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { getFileUrl, deleteFile } from '@/lib/storage';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 });
    }

    const attachments = await prisma.riskAttachment.findMany({
      where: { riskId: params.id },
      include: {
        uploadedBy: { select: { id: true, name: true, surname: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const withUrls = await Promise.all(
      attachments.map(async (att: any) => {
        const url = await getFileUrl(att.cloud_storage_path, att.isPublic);
        return { ...att, url };
      })
    );

    return NextResponse.json(withUrls);
  } catch (error) {
    console.error('Risk attachments fetch error:', error);
    return NextResponse.json({ error: 'Dosyalar getirilemedi' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 });
    }

    const body = await request.json();
    const { fileName, fileSize, mimeType, cloud_storage_path, isPublic } = body;

    if (!fileName || !cloud_storage_path) {
      return NextResponse.json({ error: 'Dosya bilgileri zorunludur' }, { status: 400 });
    }

    const attachment = await prisma.riskAttachment.create({
      data: {
        riskId: params.id,
        fileName,
        fileSize: fileSize || null,
        mimeType: mimeType || null,
        cloud_storage_path,
        isPublic: isPublic || false,
        uploadedById: session.user.id,
      },
      include: {
        uploadedBy: { select: { id: true, name: true, surname: true } },
      },
    });

    return NextResponse.json(attachment, { status: 201 });
  } catch (error) {
    console.error('Risk attachment create error:', error);
    return NextResponse.json({ error: 'Dosya kaydedilemedi' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const attachmentId = searchParams.get('attachmentId');

    if (!attachmentId) {
      return NextResponse.json({ error: 'Dosya ID zorunludur' }, { status: 400 });
    }

    const attachment = await prisma.riskAttachment.findUnique({
      where: { id: attachmentId },
    });

    if (attachment) {
      try {
        await deleteFile(attachment.cloud_storage_path);
      } catch (e) {
        console.error('S3 delete error:', e);
      }
      await prisma.riskAttachment.delete({ where: { id: attachmentId } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Risk attachment delete error:', error);
    return NextResponse.json({ error: 'Dosya silinemedi' }, { status: 500 });
  }
}
