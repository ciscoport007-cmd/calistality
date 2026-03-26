import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export const dynamic = 'force-dynamic';

const APPROVAL_STAGES = [
  { value: 'SISTEM_ON_ONAY', label: 'Sistem Ön Onayı', order: 1 },
  { value: 'KONTROL_EDEN', label: 'Kontrol Eden', order: 2 },
  { value: 'SON_ONAY', label: 'Son Onay', order: 3 },
  { value: 'GOZDEN_GECIRECEK', label: 'Gözden Geçirecek', order: 4 },
];

// GET - Klasörün onay matrisini getir
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

    const approvalMatrix = await prisma.folderApprovalPosition.findMany({
      where: { folderId },
      include: {
        position: true,
      },
      orderBy: [
        { approvalStage: 'asc' },
        { order: 'asc' },
      ],
    });

    // Aşamalara göre grupla
    const grouped = APPROVAL_STAGES.map(stage => ({
      stage: stage.value,
      label: stage.label,
      stageOrder: stage.order,
      positions: approvalMatrix.filter(a => a.approvalStage === stage.value),
    }));

    return NextResponse.json({
      approvalMatrix,
      grouped,
      stages: APPROVAL_STAGES,
    });
  } catch (error) {
    console.error('Onay matrisi getirme hatası:', error);
    return NextResponse.json(
      { error: 'Onay matrisi getirilemedi' },
      { status: 500 }
    );
  }
}

// POST - Yeni onay pozisyonu ekle
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
    const { positionId, approvalStage, order, isRequired } = body;

    if (!positionId || !approvalStage) {
      return NextResponse.json(
        { error: 'Pozisyon ve onay aşaması zorunludur' },
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
    const existing = await prisma.folderApprovalPosition.findUnique({
      where: {
        folderId_positionId_approvalStage: {
          folderId,
          positionId,
          approvalStage,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Bu pozisyon zaten bu aşamada tanımlı' },
        { status: 400 }
      );
    }

    const approvalPosition = await prisma.folderApprovalPosition.create({
      data: {
        folderId,
        positionId,
        approvalStage,
        order: order || 1,
        isRequired: isRequired !== false,
      },
      include: {
        position: true,
      },
    });

    return NextResponse.json(approvalPosition, { status: 201 });
  } catch (error) {
    console.error('Onay pozisyonu ekleme hatası:', error);
    return NextResponse.json(
      { error: 'Onay pozisyonu eklenemedi' },
      { status: 500 }
    );
  }
}

// DELETE - Onay pozisyonunu sil
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
    const approvalPositionId = searchParams.get('approvalPositionId');

    if (!approvalPositionId) {
      return NextResponse.json(
        { error: 'Silinecek kayıt ID\'si gerekli' },
        { status: 400 }
      );
    }

    await prisma.folderApprovalPosition.delete({
      where: { id: approvalPositionId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Onay pozisyonu silme hatası:', error);
    return NextResponse.json(
      { error: 'Onay pozisyonu silinemedi' },
      { status: 500 }
    );
  }
}

// PUT - Onay pozisyonunu güncelle
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
    const { approvalPositionId, order, isRequired } = body;

    if (!approvalPositionId) {
      return NextResponse.json(
        { error: 'Güncellenecek kayıt ID\'si gerekli' },
        { status: 400 }
      );
    }

    const updated = await prisma.folderApprovalPosition.update({
      where: { id: approvalPositionId },
      data: {
        order: order !== undefined ? order : undefined,
        isRequired: isRequired !== undefined ? isRequired : undefined,
      },
      include: {
        position: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Onay pozisyonu güncelleme hatası:', error);
    return NextResponse.json(
      { error: 'Onay pozisyonu güncellenemedi' },
      { status: 500 }
    );
  }
}
