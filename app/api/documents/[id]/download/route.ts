import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { PrismaClient } from '@prisma/client';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { isAdmin } from '@/lib/audit';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const versionId = searchParams.get('versionId');

    // Dokümanı ve versiyonu al
    const document = await prisma.document.findUnique({
      where: { id: params.id },
      include: {
        versions: versionId 
          ? { where: { id: versionId } }
          : { orderBy: { versionNumber: 'desc' }, take: 1 },
      },
    });

    if (!document || document.versions.length === 0) {
      return NextResponse.json({ error: 'Doküman bulunamadı' }, { status: 404 });
    }

    const version = document.versions[0];
    if (!version.cloudStoragePath) {
      return NextResponse.json({ error: 'Dosya bulunamadı' }, { status: 404 });
    }

    // S3'ten dosyayı al
    const { createS3Client, getBucketConfig } = await import('@/lib/aws-config');
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    
    const s3Client = createS3Client();
    const { bucketName } = getBucketConfig();

    const getCommand = new GetObjectCommand({
      Bucket: bucketName,
      Key: version.cloudStoragePath,
    });

    const s3Response = await s3Client.send(getCommand);
    const bodyStream = s3Response.Body as any;
    
    // Stream'i buffer'a çevir
    const chunks: Uint8Array[] = [];
    for await (const chunk of bodyStream) {
      chunks.push(chunk);
    }
    let fileBuffer = Buffer.concat(chunks);

    const fileName = version.fileName || 'document';
    const isPdf = fileName.toLowerCase().endsWith('.pdf') || 
                  version.fileType?.includes('pdf');
    const userIsAdmin = isAdmin(session.user.role);

    // Admin değilse ve PDF ise filigran ekle
    if (!userIsAdmin && isPdf) {
      try {
        fileBuffer = await addWatermarkToPdf(
          fileBuffer,
          session.user.name || session.user.email || 'Kullanıcı',
          document.code || 'DOK'
        );
      } catch (watermarkError) {
        console.error('Filigran eklenirken hata:', watermarkError);
        // Filigran eklenemezse orijinal dosyayı gönder
      }
    }

    // İndirme logunu kaydet
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DOWNLOAD',
        module: 'kontrollü_doküman',
        entityType: 'Document',
        entityId: document.id,
        newValues: JSON.stringify({
          documentCode: document.code,
          documentTitle: document.title,
          versionNumber: version.versionNumber,
          fileName: version.fileName,
          isControlledCopy: !userIsAdmin,
        }),
      },
    });

    // Dosyayı döndür
    const headers = new Headers();
    headers.set('Content-Type', version.fileType || 'application/octet-stream');
    headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    headers.set('Content-Length', fileBuffer.length.toString());

    return new NextResponse(fileBuffer, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json({ error: 'Dosya indirilemedi' }, { status: 500 });
  }
}

async function addWatermarkToPdf(
  pdfBuffer: Buffer,
  userName: string,
  documentCode: string
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const now = new Date();
  const dateStr = now.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const watermarkText = 'KONTROLLU KOPYA';
  const infoText = `${documentCode} | ${userName} | ${dateStr}`;

  for (const page of pages) {
    const { width, height } = page.getSize();

    // Ana filigran - çapraz (diagonal) - yarı saydam
    const fontSize = 60;
    const textWidth = boldFont.widthOfTextAtSize(watermarkText, fontSize);
    
    // Merkeze çapraz filigran
    page.drawText(watermarkText, {
      x: (width - textWidth) / 2,
      y: height / 2,
      size: fontSize,
      font: boldFont,
      color: rgb(0.9, 0.1, 0.1),
      opacity: 0.15,
      rotate: { angle: 45, type: 'degrees' as any },
    });

    // Alt bilgi bandı
    const footerHeight = 25;
    const footerY = 10;
    
    // Alt bilgi arka planı
    page.drawRectangle({
      x: 0,
      y: footerY,
      width: width,
      height: footerHeight,
      color: rgb(0.95, 0.95, 0.95),
      opacity: 0.9,
    });

    // Alt bilgi metni
    const infoFontSize = 8;
    page.drawText(`KONTROLLU KOPYA - ${infoText}`, {
      x: 10,
      y: footerY + 8,
      size: infoFontSize,
      font: font,
      color: rgb(0.3, 0.3, 0.3),
    });

    // Üst köşe damgası
    page.drawText('KONTROLLU', {
      x: width - 80,
      y: height - 20,
      size: 10,
      font: boldFont,
      color: rgb(0.8, 0.1, 0.1),
      opacity: 0.7,
    });
  }

  const modifiedPdfBytes = await pdfDoc.save();
  return Buffer.from(modifiedPdfBytes);
}
