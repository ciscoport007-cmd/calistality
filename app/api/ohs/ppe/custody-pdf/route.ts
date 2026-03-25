import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { uploadFile } from '@/lib/storage';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { distributionId } = body;

    if (!distributionId) {
      return NextResponse.json({ error: 'distributionId gerekli' }, { status: 400 });
    }

    // Distribution kaydını al
    const distribution = await prisma.oHSPPEDistribution.findUnique({
      where: { id: distributionId },
      include: {
        ppe: { select: { code: true, name: true, type: true, brand: true, model: true, unit: true } },
        distributedBy: { select: { name: true, surname: true } },
      },
    });

    if (!distribution) {
      return NextResponse.json({ error: 'Dağıtım kaydı bulunamadı' }, { status: 404 });
    }

    const recipientName = distribution.recipientName || '-';
    const departmentManager = distribution.departmentManagerName || '-';
    const distributedByName = distribution.distributedBy
      ? `${distribution.distributedBy.name} ${distribution.distributedBy.surname || ''}`.trim()
      : '-';
    const dateStr = new Date(distribution.distributionDate).toLocaleDateString('tr-TR');
    const ppeName = `${distribution.ppe.name}${distribution.ppe.brand ? ` - ${distribution.ppe.brand}` : ''}${distribution.ppe.model ? ` / ${distribution.ppe.model}` : ''}`;

    const htmlContent = `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      margin: 40px;
      color: #333;
      font-size: 14px;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 3px solid #1a56db;
      padding-bottom: 15px;
    }
    .header h1 {
      font-size: 22px;
      color: #1a56db;
      margin: 0 0 5px 0;
    }
    .header h2 {
      font-size: 16px;
      color: #555;
      margin: 0;
      font-weight: normal;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 25px;
    }
    .info-item {
      padding: 8px 12px;
      background: #f8f9fa;
      border-radius: 4px;
    }
    .info-item .label {
      font-size: 11px;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .info-item .value {
      font-size: 14px;
      font-weight: 600;
      color: #333;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    th {
      background: #1a56db;
      color: white;
      padding: 10px;
      text-align: left;
      font-size: 12px;
      text-transform: uppercase;
    }
    td {
      padding: 10px;
      border-bottom: 1px solid #e5e7eb;
    }
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-top: 60px;
    }
    .signature-box {
      text-align: center;
    }
    .signature-box .line {
      border-top: 1px solid #333;
      margin-top: 60px;
      padding-top: 8px;
    }
    .signature-box .name {
      font-weight: 600;
    }
    .signature-box .role {
      font-size: 12px;
      color: #666;
    }
    .footer {
      margin-top: 40px;
      text-align: center;
      font-size: 11px;
      color: #999;
    }
    .note {
      background: #fef3c7;
      padding: 12px;
      border-radius: 4px;
      margin-bottom: 20px;
      font-size: 13px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>KKD ZİMMET FORMU</h1>
    <h2>Kişisel Koruyucu Donanım Teslim Belgesi</h2>
  </div>

  <div class="info-grid">
    <div class="info-item">
      <div class="label">Teslim Alan</div>
      <div class="value">${recipientName}</div>
    </div>
    <div class="info-item">
      <div class="label">Teslim Tarihi</div>
      <div class="value">${dateStr}</div>
    </div>
    <div class="info-item">
      <div class="label">Teslim Eden</div>
      <div class="value">${distributedByName}</div>
    </div>
    <div class="info-item">
      <div class="label">Departman Müdürü</div>
      <div class="value">${departmentManager}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>KKD Kodu</th>
        <th>KKD Adı / Marka / Model</th>
        <th>Miktar</th>
        <th>Birim</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${distribution.ppe.code}</td>
        <td>${ppeName}</td>
        <td>${distribution.quantity}</td>
        <td>${distribution.ppe.unit || 'Adet'}</td>
      </tr>
    </tbody>
  </table>

  ${distribution.description ? `<div class="note"><strong>Açıklama:</strong> ${distribution.description}</div>` : ''}
  ${distribution.notes ? `<div class="note"><strong>Not:</strong> ${distribution.notes}</div>` : ''}

  <p style="font-size: 13px; line-height: 1.6;">
    Yukarıda belirtilen kişisel koruyucu donanımları teslim aldım.
    Teslim aldığım KKD'leri amacına uygun şekilde kullanacağımı,
    hasar görmesi durumunda derhal bildireceğimi ve görev sonunda
    iade edeceğimi taahhüt ederim.
  </p>

  <div class="signatures">
    <div class="signature-box">
      <div class="line">
        <div class="name">${recipientName}</div>
        <div class="role">Teslim Alan</div>
      </div>
    </div>
    <div class="signature-box">
      <div class="line">
        <div class="name">${distributedByName}</div>
        <div class="role">Teslim Eden</div>
      </div>
    </div>
  </div>

  <div class="footer">
    <p>Bu belge otomatik olarak QDMS sistemi tarafından oluşturulmuştur.</p>
    <p>Oluşturulma Tarihi: ${new Date().toLocaleDateString('tr-TR')} ${new Date().toLocaleTimeString('tr-TR')}</p>
  </div>
</body>
</html>
    `;

    // Generate PDF with Puppeteer
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
    });

    await browser.close();

    const fileName = `KKD_Zimmet_${distribution.ppe.code}_${dateStr.replace(/\./g, '-')}.pdf`;

    // Upload to local storage
    const cloud_storage_path = await uploadFile(pdfBuffer, fileName, false);

    // Update distribution record
    await prisma.oHSPPEDistribution.update({
      where: { id: distributionId },
      data: {
        custodyFormFileName: fileName,
        custodyFormFileSize: pdfBuffer.length,
        custodyFormCloudPath: cloud_storage_path,
        custodyFormIsPublic: false,
      },
    });

    return NextResponse.json({
      success: true,
      fileName,
      cloud_storage_path,
    });
  } catch (error) {
    console.error('Custody PDF error:', error);
    return NextResponse.json({ error: 'PDF oluşturulurken hata' }, { status: 500 });
  }
}
