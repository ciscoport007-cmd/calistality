import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { PrismaClient } from '@prisma/client';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createS3Client, getBucketConfig } from '@/lib/aws-config';
import { createAuditLog } from '@/lib/audit';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

// GET - Metin dosyasının içeriğini getir
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const document = await prisma.document.findUnique({
      where: { id: params.id },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
        },
      },
    });

    if (!document) {
      return NextResponse.json({ error: 'Doküman bulunamadı' }, { status: 404 });
    }

    const latestVersion = document.versions[0];
    if (!latestVersion?.cloudStoragePath) {
      return NextResponse.json({ error: 'Dosya bulunamadı' }, { status: 404 });
    }

    // Metin dosyası mı kontrol et
    const textExtensions = ['.txt', '.md', '.json', '.xml', '.csv', '.log', '.ini', '.cfg', '.yaml', '.yml', '.html', '.css', '.js', '.ts'];
    const fileName = latestVersion.fileName.toLowerCase();
    const isTextFile = textExtensions.some(ext => fileName.endsWith(ext)) || 
                       latestVersion.fileType.startsWith('text/');

    if (!isTextFile) {
      return NextResponse.json({ error: 'Bu dosya türü düzenlenemez' }, { status: 400 });
    }

    // S3'ten dosya içeriğini oku
    const s3Client = createS3Client();
    const { bucketName } = getBucketConfig();

    const getCommand = new GetObjectCommand({
      Bucket: bucketName,
      Key: latestVersion.cloudStoragePath,
    });

    const response = await s3Client.send(getCommand);
    const content = await response.Body?.transformToString('utf-8');

    return NextResponse.json({
      content: content || '',
      fileName: latestVersion.fileName,
      fileType: latestVersion.fileType,
      versionNumber: latestVersion.versionNumber,
    });
  } catch (error) {
    console.error('Text file read error:', error);
    return NextResponse.json(
      { error: 'Dosya okunamadı' },
      { status: 500 }
    );
  }
}

// PUT - Metin dosyasını güncelle (yeni versiyon oluştur)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { content, createNewVersion = true } = await request.json();

    if (content === undefined) {
      return NextResponse.json({ error: 'İçerik gerekli' }, { status: 400 });
    }

    const document = await prisma.document.findUnique({
      where: { id: params.id },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
        },
      },
    });

    if (!document) {
      return NextResponse.json({ error: 'Doküman bulunamadı' }, { status: 404 });
    }

    // Kilitli mi kontrol et
    if (document.isLockedForEdit && document.lockedById !== session.user.id) {
      return NextResponse.json({ error: 'Doküman başka bir kullanıcı tarafından kilitli' }, { status: 403 });
    }

    const latestVersion = document.versions[0];
    if (!latestVersion) {
      return NextResponse.json({ error: 'Dosya versiyonu bulunamadı' }, { status: 404 });
    }

    // Metin dosyası mı kontrol et
    const textExtensions = ['.txt', '.md', '.json', '.xml', '.csv', '.log', '.ini', '.cfg', '.yaml', '.yml', '.html', '.css', '.js', '.ts'];
    const fileName = latestVersion.fileName.toLowerCase();
    const isTextFile = textExtensions.some(ext => fileName.endsWith(ext)) || 
                       latestVersion.fileType.startsWith('text/');

    if (!isTextFile) {
      return NextResponse.json({ error: 'Bu dosya türü düzenlenemez' }, { status: 400 });
    }

    const s3Client = createS3Client();
    const { bucketName, folderPrefix } = getBucketConfig();

    // Yeni versiyon oluştur veya mevcut versiyonu güncelle
    let newVersionNumber = latestVersion.versionNumber;
    let cloudStoragePath = latestVersion.cloudStoragePath;

    if (createNewVersion) {
      newVersionNumber = latestVersion.versionNumber + 1;
      cloudStoragePath = `${folderPrefix}uploads/${Date.now()}-${latestVersion.fileName}`;
    }

    // İçeriği S3'e yükle
    const putCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: cloudStoragePath,
      Body: content,
      ContentType: latestVersion.fileType,
    });

    await s3Client.send(putCommand);

    if (createNewVersion) {
      // Yeni versiyon oluştur
      await prisma.documentVersion.create({
        data: {
          document: { connect: { id: document.id } },
          versionNumber: newVersionNumber,
          title: document.title,
          fileName: latestVersion.fileName,
          fileType: latestVersion.fileType,
          fileSize: Buffer.byteLength(content, 'utf-8'),
          cloudStoragePath: cloudStoragePath,
          isPublic: latestVersion.isPublic,
          changeDescription: 'Metin düzenleme ile güncellendi',
        },
      });

      // Dokümanın mevcut versiyonunu güncelle
      await prisma.document.update({
        where: { id: document.id },
        data: {
          currentVersion: newVersionNumber,
          status: 'TASLAK', // Düzenleme sonrası taslağa al
        },
      });

      // Audit log
      await createAuditLog({
        userId: session.user.id,
        action: 'UPDATE',
        module: 'DOCUMENTS',
        entityType: 'Document',
        entityId: document.id,
        newValues: { versionNumber: newVersionNumber, editType: 'text_edit' },
      });
    }

    return NextResponse.json({
      success: true,
      message: createNewVersion ? 'Yeni versiyon oluşturuldu' : 'Dosya güncellendi',
      versionNumber: newVersionNumber,
    });
  } catch (error) {
    console.error('Text file save error:', error);
    return NextResponse.json(
      { error: 'Dosya kaydedilemedi' },
      { status: 500 }
    );
  }
}
