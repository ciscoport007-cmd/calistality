import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export const dynamic = 'force-dynamic';

// GET - Klasörün hazırlama yetkili pozisyonlarını getir
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const folderId = params.id;

    const preparers = await prisma.folderPreparerPosition.findMany({
      where: { folderId },
      include: {
        position: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(preparers);
  } catch (error) {
    console.error('Hazırlama yetkileri getirme hatası:', error);
    return NextResponse.json(
      { error: 'Hazırlama yetkileri getirilemedi' },
      { status: 500 }
    );
  }
}

// POST - Yeni hazırlama yetkisi ekle
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const folderId = params.id;
    const body = await request.json();
    const { positionId, canCreate, canRevise } = body;

    if (!positionId) {
      return NextResponse.json(
        { error: 'Pozisyon zorunludur' },
        { status: 400 }
      );
    }

    // Klasör var mı kontrol et
    const folder = await prisma.folder.findUnique({
      where: { id: folderId },
    });

    if (!folder) {
      return NextResponse.json(
        { error: 'Klasör bulunamadı' },
        { status: 404 }
      );
    }

    // Aynı kayıt var mı kontrol et
    const existing = await prisma.folderPreparerPosition.findUnique({
      where: {
        folderId_positionId: {
          folderId,
          positionId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Bu pozisyon zaten tanımlı' },
        { status: 400 }
      );
    }

    const preparer = await prisma.folderPreparerPosition.create({
      data: {
        folderId,
        positionId,
        canCreate: canCreate !== false,
        canRevise: canRevise !== false,
      },
      include: {
        position: true,
      },
    });

    return NextResponse.json(preparer, { status: 201 });
  } catch (error) {
    console.error('Hazırlama yetkisi ekleme hatası:', error);
    return NextResponse.json(
      { error: 'Hazırlama yetkisi eklenemedi' },
      { status: 500 }
    );
  }
}

// DELETE - Hazırlama yetkisini sil
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const preparerId = searchParams.get('preparerId');

    if (!preparerId) {
      return NextResponse.json(
        { error: 'Silinecek kayıt ID\'si gerekli' },
        { status: 400 }
      );
    }

    await prisma.folderPreparerPosition.delete({
      where: { id: preparerId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Hazırlama yetkisi silme hatası:', error);
    return NextResponse.json(
      { error: 'Hazırlama yetkisi silinemedi' },
      { status: 500 }
    );
  }
}

// PUT - Hazırlama yetkisini güncelle
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const body = await request.json();
    const { preparerId, canCreate, canRevise } = body;

    if (!preparerId) {
      return NextResponse.json(
        { error: 'Güncellenecek kayıt ID\'si gerekli' },
        { status: 400 }
      );
    }

    const updated = await prisma.folderPreparerPosition.update({
      where: { id: preparerId },
      data: {
        canCreate: canCreate !== undefined ? canCreate : undefined,
        canRevise: canRevise !== undefined ? canRevise : undefined,
      },
      include: {
        position: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Hazırlama yetkisi güncelleme hatası:', error);
    return NextResponse.json(
      { error: 'Hazırlama yetkisi güncellenemedi' },
      { status: 500 }
    );
  }
}
