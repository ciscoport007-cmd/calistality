import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getFileUrl } from '@/lib/storage';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { cloud_storage_path, isPublic = false, forPreview = false, fileName } = body;

    if (!cloud_storage_path) {
      return NextResponse.json({ error: 'cloud_storage_path gereklidir' }, { status: 400 });
    }

    const url = await getFileUrl(cloud_storage_path, isPublic, fileName, forPreview);

    return NextResponse.json({ url });
  } catch (error) {
    console.error('Error getting file URL:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
