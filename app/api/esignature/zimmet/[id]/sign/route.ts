import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const CATEGORY_LABELS: Record<string, string> = {
  EKIPMAN: 'Ekipman',
  UNIFORM: 'Üniform',
  ANAHTAR: 'Anahtar',
  DIGER: 'Diğer',
};

const CONDITION_LABELS: Record<string, string> = {
  IYI: 'İyi',
  KULLANILMIS: 'Kullanılmış',
  HASARLI: 'Hasarlı',
};

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
    const form = await prisma.zimmetForm.findFirst({
      where: { id, isActive: true },
      include: {
        issuedBy: { select: { name: true } },
        receivedBy: { select: { name: true } },
        items: true,
      },
    });

    if (!form) {
      return NextResponse.json({ error: 'Zimmet formu bulunamadı' }, { status: 404 });
    }
    if (form.status === 'SIGNED') {
      return NextResponse.json({ error: 'Bu form zaten imzalanmış' }, { status: 409 });
    }

    const body = await request.json();
    const { signatureDataUrl } = body ?? {};

    if (!signatureDataUrl || !signatureDataUrl.startsWith('data:image/png;base64,')) {
      return NextResponse.json({ error: 'Geçerli imza verisi gereklidir' }, { status: 400 });
    }

    const base64Data = signatureDataUrl.replace(/^data:image\/png;base64,/, '');
    const signatureBuffer = Buffer.from(base64Data, 'base64');

    const pdfBuffer = await generateZimmetPdf(form, signatureBuffer);
    const fileHash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

    const uploadsDir = path.join(process.cwd(), 'uploads', 'esignature');
    fs.mkdirSync(uploadsDir, { recursive: true });
    const fileName = `zimmet-${form.formNo}-${Date.now()}.pdf`;
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, pdfBuffer);
    const relPath = `uploads/esignature/${fileName}`;

    const updated = await prisma.zimmetForm.update({
      where: { id },
      data: {
        status: 'SIGNED',
        signatureImagePath: relPath,
        fileHash,
        signedAt: new Date(),
      },
    });

    return NextResponse.json({ form: updated, message: 'Zimmet imzalandı' });
  } catch (error) {
    console.error('Zimmet sign error:', error);
    return NextResponse.json({ error: 'İmzalama işlemi başarısız' }, { status: 500 });
  }
}

async function generateZimmetPdf(form: any, signatureBuffer: Buffer): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const { width, height } = page.getSize();

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica);

  page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: rgb(0.11, 0.31, 0.87) });
  page.drawText('ZİMMET FORMU', { x: 40, y: height - 35, size: 20, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText(`Form No: ${form.formNo}`, { x: 40, y: height - 58, size: 11, font: fontReg, color: rgb(0.85, 0.9, 1) });

  let y = height - 110;
  const drawRow = (label: string, value: string) => {
    page.drawText(label, { x: 40, y, size: 10, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
    page.drawText(value || '-', { x: 180, y, size: 10, font: fontReg, color: rgb(0.1, 0.1, 0.1) });
    y -= 20;
  };

  drawRow('Teslim Eden:', form.issuedBy?.name || '-');
  drawRow('Teslim Alan:', form.receivedBy?.name || form.receiverName || '-');
  drawRow('Tarih:', new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }));
  drawRow('Konu:', form.title);
  if (form.description) drawRow('Açıklama:', form.description);

  y -= 10;
  page.drawRectangle({ x: 40, y: y - 5, width: width - 80, height: 22, color: rgb(0.92, 0.94, 0.98) });
  page.drawText('Kategori', { x: 45, y: y + 3, size: 9, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
  page.drawText('Kalem', { x: 135, y: y + 3, size: 9, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
  page.drawText('Adet', { x: 305, y: y + 3, size: 9, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
  page.drawText('Durum', { x: 355, y: y + 3, size: 9, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
  page.drawText('Not', { x: 430, y: y + 3, size: 9, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
  y -= 20;

  for (const item of form.items) {
    page.drawText(CATEGORY_LABELS[item.category] || item.category, { x: 45, y, size: 9, font: fontReg, color: rgb(0.1, 0.1, 0.1) });
    page.drawText(item.name.substring(0, 20), { x: 135, y, size: 9, font: fontReg, color: rgb(0.1, 0.1, 0.1) });
    page.drawText(String(item.quantity), { x: 305, y, size: 9, font: fontReg, color: rgb(0.1, 0.1, 0.1) });
    page.drawText(CONDITION_LABELS[item.condition] || item.condition, { x: 355, y, size: 9, font: fontReg, color: rgb(0.1, 0.1, 0.1) });
    page.drawText((item.note || '-').substring(0, 12), { x: 430, y, size: 9, font: fontReg, color: rgb(0.1, 0.1, 0.1) });
    y -= 18;
  }

  y -= 20;
  page.drawText('Teslim Alanın İmzası:', { x: 40, y, size: 10, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
  y -= 10;

  const signatureImage = await pdfDoc.embedPng(signatureBuffer);
  const sigWidth = Math.min(250, signatureImage.width);
  const sigHeight = (signatureImage.height / signatureImage.width) * sigWidth;
  page.drawImage(signatureImage, { x: 40, y: y - sigHeight, width: sigWidth, height: sigHeight });
  y -= sigHeight + 10;

  page.drawLine({ start: { x: 40, y }, end: { x: 290, y }, thickness: 1, color: rgb(0.5, 0.5, 0.5) });

  page.drawRectangle({ x: 0, y: 0, width, height: 30, color: rgb(0.95, 0.96, 0.99) });
  page.drawText('CALISTA Document Management System — Kontrollü Kopya', { x: 40, y: 10, size: 8, font: fontReg, color: rgb(0.5, 0.5, 0.5) });

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}
