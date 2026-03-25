import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Accepts PUT requests from client-side presigned upload flow.
// The path query param is the cloud_storage_path returned by generatePresignedUploadUrl.
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('path');

    if (!filePath) {
      return NextResponse.json({ error: 'path parametresi gereklidir' }, { status: 400 });
    }

    // Security: prevent path traversal
    const resolved = path.resolve(process.cwd(), filePath);
    const uploadsRoot = path.resolve(process.cwd(), 'uploads');
    const publicUploadsRoot = path.resolve(process.cwd(), 'public', 'uploads');
    if (!resolved.startsWith(uploadsRoot) && !resolved.startsWith(publicUploadsRoot)) {
      return NextResponse.json({ error: 'Geçersiz yol' }, { status: 400 });
    }

    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    const buffer = Buffer.from(await request.arrayBuffer());
    fs.writeFileSync(resolved, buffer);

    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error('Local upload error:', error);
    return NextResponse.json({ error: 'Dosya yüklenemedi' }, { status: 500 });
  }
}
