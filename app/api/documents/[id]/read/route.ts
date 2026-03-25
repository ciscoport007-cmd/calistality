import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await params;
    
    let duration = null;
    try {
      const body = await request.json();
      duration = body?.duration || null;
    } catch {
      // Body boş olabilir, sorun değil
    }

    // Okuma logu oluştur
    await prisma.readLog.create({
      data: {
        documentId: id,
        userId: session?.user?.id,
        duration: duration,
      },
    });

    return NextResponse.json({ message: 'Okuma logu kaydedildi' });
  } catch (error) {
    console.error('Document read POST error:', error);
    return NextResponse.json(
      { error: 'Okuma logu kaydedilirken hata oluştu' },
      { status: 500 }
    );
  }
}
