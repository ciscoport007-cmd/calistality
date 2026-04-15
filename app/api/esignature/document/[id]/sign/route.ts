import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.documentSignature.findFirst({
      where: { documentId: id, signedById: session.user.id },
    });
    if (existing) {
      return NextResponse.json({ error: 'Bu belgeyi zaten imzaladınız' }, { status: 409 });
    }

    const document = await prisma.document.findUnique({
      where: { id },
      include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } },
    });

    if (!document) {
      return NextResponse.json({ error: 'Doküman bulunamadı' }, { status: 404 });
    }

    const body = await request.json();
    const { signatureDataUrl, purpose = 'ONAY' } = body ?? {};

    if (!signatureDataUrl || !signatureDataUrl.startsWith('data:image/png;base64,')) {
      return NextResponse.json({ error: 'Geçerli imza verisi gereklidir' }, { status: 400 });
    }

    const base64Data = signatureDataUrl.replace(/^data:image\/png;base64,/, '');
    const signatureBuffer = Buffer.from(base64Data, 'base64');

    const version = document.versions[0];
    let pdfBuffer: Buffer;

    if (version?.cloudStoragePath) {
      const resolved = path.resolve(process.cwd(), version.cloudStoragePath);
      const uploadsRoot = path.resolve(process.cwd(), 'uploads');
      if (resolved.startsWith(uploadsRoot) && fs.existsSync(resolved)) {
        const existingPdf = fs.readFileSync(resolved);
        pdfBuffer = await appendSignatureToPdf(
          existingPdf,
          signatureBuffer,
          session.user.name || session.user.email || 'Kullanıcı'
        );
      } else {
        pdfBuffer = await createSignaturePdf(
          document,
          signatureBuffer,
          session.user.name || session.user.email || 'Kullanıcı'
        );
      }
    } else {
      pdfBuffer = await createSignaturePdf(
        document,
        signatureBuffer,
        session.user.name || session.user.email || 'Kullanıcı'
      );
    }

    const fileHash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

    const uploadsDir = path.join(process.cwd(), 'uploads', 'esignature');
    fs.mkdirSync(uploadsDir, { recursive: true });
    const fileName = `doc-${id}-${session.user.id}-${Date.now()}.pdf`;
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, pdfBuffer);
    const relPath = `uploads/esignature/${fileName}`;

    const signature = await prisma.documentSignature.create({
      data: {
        documentId: id,
        versionId: version?.id || null,
        signedById: session.user.id,
        signatureImagePath: relPath,
        fileHash,
        purpose: purpose as any,
      },
      include: {
        signedBy: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ signature }, { status: 201 });
  } catch (error) {
    console.error('Document sign error:', error);
    return NextResponse.json({ error: 'İmzalama başarısız' }, { status: 500 });
  }
}

async function appendSignatureToPdf(
  existingPdfBuffer: Buffer,
  signatureBuffer: Buffer,
  userName: string
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(existingPdfBuffer);
  const pages = pdfDoc.getPages();
  const lastPage = pages[pages.length - 1];
  const { width } = lastPage.getSize();
  const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const signatureImage = await pdfDoc.embedPng(signatureBuffer);
  const sigWidth = 180;
  const sigHeight = (signatureImage.height / signatureImage.width) * sigWidth;
  const sigX = width - sigWidth - 40;
  const sigY = 60;

  lastPage.drawRectangle({
    x: sigX - 5, y: sigY - 10,
    width: sigWidth + 10, height: sigHeight + 35,
    color: rgb(0.97, 0.97, 0.99),
    borderColor: rgb(0.8, 0.85, 0.95),
    borderWidth: 1,
  });
  lastPage.drawText('Onaylayan:', { x: sigX, y: sigY + sigHeight + 15, size: 8, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
  lastPage.drawText(userName, { x: sigX, y: sigY + sigHeight + 4, size: 8, font: fontReg, color: rgb(0.1, 0.1, 0.1) });
  lastPage.drawText(
    new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    { x: sigX, y: sigY - 5, size: 7, font: fontReg, color: rgb(0.5, 0.5, 0.5) }
  );
  lastPage.drawImage(signatureImage, { x: sigX, y: sigY, width: sigWidth, height: sigHeight });

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}

async function createSignaturePdf(
  document: any,
  signatureBuffer: Buffer,
  userName: string
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 300]);
  const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  page.drawRectangle({ x: 0, y: 240, width: 595, height: 60, color: rgb(0.11, 0.31, 0.87) });
  page.drawText('İMZA BELGESİ', { x: 40, y: 268, size: 14, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText(`Doküman: ${document.title || document.code || '-'}`, { x: 40, y: 215, size: 10, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
  page.drawText(`Onaylayan: ${userName}`, { x: 40, y: 195, size: 10, font: fontReg, color: rgb(0.2, 0.2, 0.2) });
  page.drawText(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`, { x: 40, y: 175, size: 10, font: fontReg, color: rgb(0.2, 0.2, 0.2) });
  page.drawText('Bu belgeyi okuduğumu ve onayladığımı beyan ederim.', { x: 40, y: 150, size: 9, font: fontReg, color: rgb(0.4, 0.4, 0.4) });

  const signatureImage = await pdfDoc.embedPng(signatureBuffer);
  const sigWidth = 200;
  const sigHeight = (signatureImage.height / signatureImage.width) * sigWidth;
  page.drawImage(signatureImage, { x: 40, y: 80 - sigHeight + 60, width: sigWidth, height: sigHeight });
  page.drawLine({ start: { x: 40, y: 45 }, end: { x: 240, y: 45 }, thickness: 1, color: rgb(0.5, 0.5, 0.5) });

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}
