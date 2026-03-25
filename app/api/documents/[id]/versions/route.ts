import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { PrismaClient } from '@prisma/client';
import { uploadFile, getFileUrl } from '@/lib/s3';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

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

    const versions = await prisma.documentVersion.findMany({
      where: { documentId: id },
      orderBy: { versionNumber: 'desc' },
    });

    // Her versiyon için dosya URL'lerini al
    const versionsWithUrls = await Promise.all(
      (versions ?? [])?.map?.(async (version) => {
        const fileUrl = await getFileUrl(
          version?.cloudStoragePath ?? '', 
          version?.isPublic ?? false,
          version?.fileName ?? undefined
        );
        return { ...version, fileUrl };
      }) ?? []
    );

    return NextResponse.json({ versions: versionsWithUrls });
  } catch (error) {
    console.error('Document versions GET error:', error);
    return NextResponse.json(
      { error: 'Doküman versiyonları getirilirken hata oluştu' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await params;

    const formData = await request.formData();
    const changeDescription = (formData?.get?.('changeDescription') || formData?.get?.('notes')) as string;
    const file = formData?.get?.('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Dosya zorunludur' }, { status: 400 });
    }

    // Mevcut dokümanı al
    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
        },
        lockedBy: {
          select: { id: true, name: true },
        },
      },
    });

    if (!document) {
      return NextResponse.json({ error: 'Doküman bulunamadı' }, { status: 404 });
    }

    // Kilit kontrolü - başka kullanıcı tarafından kilitliyse revizyon eklenemez
    if (document.isLockedForEdit && document.lockedById !== session.user.id) {
      return NextResponse.json(
        { error: `Bu doküman ${document.lockedBy?.name || 'başka bir kullanıcı'} tarafından kilitlenmiş. Yeni revizyon eklenemez.` },
        { status: 403 }
      );
    }

    // Dosyayı yükle
    const buffer = Buffer.from(await file?.arrayBuffer?.());
    const cloudStoragePath = await uploadFile(buffer, file?.name ?? 'document', false);

    // Yeni versiyon oluştur
    const newVersionNumber = document?.currentVersion + 1;
    const version = await prisma.documentVersion.create({
      data: {
        documentId: id,
        versionNumber: newVersionNumber,
        title: document?.title ?? '',
        description: document?.description,
        changeDescription: changeDescription || null,
        fileName: file?.name ?? '',
        fileSize: file?.size ?? 0,
        fileType: file?.type ?? '',
        cloudStoragePath,
        isPublic: false,
      },
    });

    // Sonraki revizyon tarihini hesapla
    let nextReviewDate = null;
    if (document.reviewFrequencyMonths) {
      const reviewDate = new Date();
      reviewDate.setMonth(reviewDate.getMonth() + document.reviewFrequencyMonths);
      nextReviewDate = reviewDate;
    }

    // Dokümanı güncelle - revizyon tarihleri dahil
    await prisma.document.update({
      where: { id },
      data: {
        currentVersion: newVersionNumber,
        status: 'REVIZE_EDILIYOR',
        lastReviewDate: new Date(),
        nextReviewDate: nextReviewDate,
      },
    });

    return NextResponse.json(
      { version, message: 'Yeni versiyon başarıyla oluşturuldu' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Document version POST error:', error);
    return NextResponse.json(
      { error: 'Yeni versiyon oluşturulurken hata oluştu' },
      { status: 500 }
    );
  }
}
