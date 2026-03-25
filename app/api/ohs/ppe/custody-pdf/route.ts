import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generatePresignedUploadUrl } from '@/lib/s3';

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
      return NextResponse.json({ error: 'Da\u011f\u0131t\u0131m kayd\u0131 bulunamad\u0131' }, { status: 404 });
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
    <h1>KKD Z\u0130MMET FORMU</h1>
    <h2>Ki\u015fisel Koruyucu Donan\u0131m Teslim Belgesi</h2>
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
      <div class="label">Departman M\u00fcd\u00fcr\u00fc</div>
      <div class="value">${departmentManager}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>KKD Kodu</th>
        <th>KKD Ad\u0131 / Marka / Model</th>
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

  ${distribution.description ? `<div class="note"><strong>A\u00e7\u0131klama:</strong> ${distribution.description}</div>` : ''}
  ${distribution.notes ? `<div class="note"><strong>Not:</strong> ${distribution.notes}</div>` : ''}

  <p style="font-size: 13px; line-height: 1.6;">
    Yukar\u0131da belirtilen ki\u015fisel koruyucu donan\u0131mlar\u0131 teslim ald\u0131m. 
    Teslim ald\u0131\u011f\u0131m KKD'leri amac\u0131na uygun \u015fekilde kullanaca\u011f\u0131m\u0131, 
    hasar g\u00f6rmesi durumunda derhal bildirece\u011fimi ve g\u00f6rev sonunda 
    iade edece\u011fimi taahh\u00fct ederim.
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
    <p>Bu belge otomatik olarak QDMS sistemi taraf\u0131ndan olu\u015fturulmu\u015ftur.</p>
    <p>Olu\u015fturulma Tarihi: ${new Date().toLocaleDateString('tr-TR')} ${new Date().toLocaleTimeString('tr-TR')}</p>
  </div>
</body>
</html>
    `;

    // Step 1: Create PDF request
    const createResponse = await fetch('https://apps.abacus.ai/api/createConvertHtmlToPdfRequest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deployment_token: process.env.ABACUSAI_API_KEY,
        html_content: htmlContent,
        pdf_options: { format: 'A4', print_background: true },
      }),
    });

    if (!createResponse.ok) {
      console.error('PDF create request failed:', await createResponse.text());
      return NextResponse.json({ error: 'PDF olu\u015fturma iste\u011fi ba\u015far\u0131s\u0131z' }, { status: 500 });
    }

    const { request_id } = await createResponse.json();
    if (!request_id) {
      return NextResponse.json({ error: 'PDF request ID al\u0131namad\u0131' }, { status: 500 });
    }

    // Step 2: Poll for status
    const maxAttempts = 120;
    let attempts = 0;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1500));

      const statusResponse = await fetch('https://apps.abacus.ai/api/getConvertHtmlToPdfStatus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_id,
          deployment_token: process.env.ABACUSAI_API_KEY,
        }),
      });

      const statusResult = await statusResponse.json();
      const status = statusResult?.status || 'FAILED';
      const result = statusResult?.result || null;

      if (status === 'SUCCESS' && result?.result) {
        const pdfBuffer = Buffer.from(result.result, 'base64');
        const fileName = `KKD_Zimmet_${distribution.ppe.code}_${dateStr.replace(/\./g, '-')}.pdf`;

        // Upload to S3
        const { uploadUrl, cloud_storage_path } = await generatePresignedUploadUrl(
          fileName,
          'application/pdf',
          false
        );

        const uploadRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/pdf' },
          body: pdfBuffer,
        });

        if (!uploadRes.ok) {
          console.error('PDF S3 upload failed');
          return NextResponse.json({ error: 'PDF y\u00fcklenemedi' }, { status: 500 });
        }

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
      } else if (status === 'FAILED') {
        console.error('PDF generation failed:', result);
        return NextResponse.json({ error: 'PDF olu\u015fturulamad\u0131' }, { status: 500 });
      }

      attempts++;
    }

    return NextResponse.json({ error: 'PDF olu\u015fturma zaman a\u015f\u0131m\u0131' }, { status: 500 });
  } catch (error) {
    console.error('Custody PDF error:', error);
    return NextResponse.json({ error: 'PDF olu\u015fturulurken hata' }, { status: 500 });
  }
}
