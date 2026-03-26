import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const { html_content, pdf_options, css_stylesheet } = await request.json();

    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    const page = await browser.newPage();

    let fullHtml = html_content;
    if (css_stylesheet) {
      fullHtml = `<style>${css_stylesheet}</style>${html_content}`;
    }

    await page.setContent(fullHtml, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: pdf_options?.format || 'A4',
      printBackground: true,
      margin: pdf_options?.margin || { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
    });

    await browser.close();

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="document.pdf"',
      },
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json({ success: false, error: 'PDF oluşturulamadı' }, { status: 500 });
  }
}