import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export const dynamic = 'force-dynamic';

// Belge güncelle
export async function PATCH(
  request: Request,
  { params }: { params: { id: string; docId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const body = await request.json();

    const document = await prisma.subcontractorDocument.update({
      where: { id: params.docId },
      data: {
        ...body,
        expiryDate: body.expiryDate ? new Date(body.expiryDate) : undefined,
      },
    });

    return NextResponse.json(document);
  } catch (error) {
    console.error('Document update error:', error);
    return NextResponse.json(
      { error: 'Belge güncellenemedi' },
      { status: 500 }
    );
  }
}

// Belge sil
export async function DELETE(
  request: Request,
  { params }: { params: { id: string; docId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    await prisma.subcontractorDocument.update({
      where: { id: params.docId },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Document delete error:', error);
    return NextResponse.json(
      { error: 'Belge silinemedi' },
      { status: 500 }
    );
  }
}
