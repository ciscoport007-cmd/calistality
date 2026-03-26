import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const map: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.zip': 'application/zip',
    '.txt': 'text/plain',
    '.csv': 'text/csv',
  };
  return map[ext] || 'application/octet-stream';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { path: parts } = await params;
    const filePath = decodeURIComponent(parts.join('/'));

    // Security: prevent path traversal
    const resolved = path.resolve(process.cwd(), filePath);
    const uploadsRoot = path.resolve(process.cwd(), 'uploads');
    if (!resolved.startsWith(uploadsRoot)) {
      return NextResponse.json({ error: 'Geçersiz yol' }, { status: 400 });
    }

    if (!fs.existsSync(resolved)) {
      return NextResponse.json({ error: 'Dosya bulunamadı' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const forPreview = searchParams.get('preview') === '1';
    const downloadFileName = searchParams.get('filename') || path.basename(resolved);

    const buffer = fs.readFileSync(resolved);
    const mimeType = getMimeType(resolved);
    const disposition = forPreview ? 'inline' : 'attachment';

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `${disposition}; filename="${encodeURIComponent(downloadFileName)}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('File serve error:', error);
    return NextResponse.json({ error: 'Dosya sunulurken hata oluştu' }, { status: 500 });
  }
}
