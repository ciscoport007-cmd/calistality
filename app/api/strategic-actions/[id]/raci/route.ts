import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export const dynamic = 'force-dynamic';

// GET - Aksiyonun RACI bilgilerini getir
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const actionId = params.id;

    const action = await prisma.strategicAction.findUnique({
      where: { id: actionId },
      select: {
        id: true,
        name: true,
        responsible: {
          select: { id: true, name: true, email: true, department: { select: { name: true } } }
        },
        accountable: {
          select: { id: true, name: true, email: true, department: { select: { name: true } } }
        },
        consultedUsers: {
          include: {
            user: {
              select: { id: true, name: true, email: true, department: { select: { name: true } } }
            }
          },
          orderBy: { addedAt: 'desc' }
        },
        informedUsers: {
          include: {
            user: {
              select: { id: true, name: true, email: true, department: { select: { name: true } } }
            }
          },
          orderBy: { addedAt: 'desc' }
        },
      }
    });

    if (!action) {
      return NextResponse.json({ error: 'Aksiyon bulunamadı' }, { status: 404 });
    }

    return NextResponse.json({
      responsible: action.responsible,
      accountable: action.accountable,
      consulted: action.consultedUsers,
      informed: action.informedUsers
    });
  } catch (error) {
    console.error('RACI getirme hatası:', error);
    return NextResponse.json({ error: 'RACI bilgileri getirilemedi' }, { status: 500 });
  }
}

// POST - RACI’ye kişi ekle
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const actionId = params.id;
    const body = await request.json();
    const { type, userId, notes, notifyOnProgress, notifyOnComplete, notifyOnBlock } = body;

    // type: 'responsible' | 'accountable' | 'consulted' | 'informed'
    if (!type || !userId) {
      return NextResponse.json({ error: 'Tür ve kullanıcı ID zorunludur' }, { status: 400 });
    }

    const action = await prisma.strategicAction.findUnique({
      where: { id: actionId }
    });

    if (!action) {
      return NextResponse.json({ error: 'Aksiyon bulunamadı' }, { status: 404 });
    }

    let result;

    switch (type) {
      case 'responsible':
        result = await prisma.strategicAction.update({
          where: { id: actionId },
          data: { responsibleId: userId }
        });
        break;

      case 'accountable':
        result = await prisma.strategicAction.update({
          where: { id: actionId },
          data: { accountableId: userId }
        });
        break;

      case 'consulted':
        result = await prisma.actionConsulted.create({
          data: {
            actionId,
            userId,
            notes: notes || null
          },
          include: {
            user: {
              select: { id: true, name: true, email: true, department: { select: { name: true } } }
            }
          }
        });
        break;

      case 'informed':
        result = await prisma.actionInformed.create({
          data: {
            actionId,
            userId,
            notifyOnProgress: notifyOnProgress !== false,
            notifyOnComplete: notifyOnComplete !== false,
            notifyOnBlock: notifyOnBlock !== false
          },
          include: {
            user: {
              select: { id: true, name: true, email: true, department: { select: { name: true } } }
            }
          }
        });
        break;

      default:
        return NextResponse.json({ error: 'Geçersiz RACI türü' }, { status: 400 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error('RACI ekleme hatası:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Bu kullanıcı zaten eklenmiş' }, { status: 400 });
    }
    return NextResponse.json({ error: 'RACI eklenemedi' }, { status: 500 });
  }
}

// DELETE - RACI’den kişi çıkar
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const actionId = params.id;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const entryId = searchParams.get('entryId');

    if (!type) {
      return NextResponse.json({ error: 'Tür parametresi zorunludur' }, { status: 400 });
    }

    switch (type) {
      case 'responsible':
        await prisma.strategicAction.update({
          where: { id: actionId },
          data: { responsibleId: null }
        });
        break;

      case 'accountable':
        await prisma.strategicAction.update({
          where: { id: actionId },
          data: { accountableId: null }
        });
        break;

      case 'consulted':
        if (!entryId) {
          return NextResponse.json({ error: 'entryId zorunludur' }, { status: 400 });
        }
        await prisma.actionConsulted.delete({
          where: { id: entryId }
        });
        break;

      case 'informed':
        if (!entryId) {
          return NextResponse.json({ error: 'entryId zorunludur' }, { status: 400 });
        }
        await prisma.actionInformed.delete({
          where: { id: entryId }
        });
        break;

      default:
        return NextResponse.json({ error: 'Geçersiz RACI türü' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('RACI silme hatası:', error);
    return NextResponse.json({ error: 'RACI silinemedi' }, { status: 500 });
  }
}

// PUT - Informed ayarlarını güncelle
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
    const { entryId, notifyOnProgress, notifyOnComplete, notifyOnBlock } = body;

    if (!entryId) {
      return NextResponse.json({ error: 'entryId zorunludur' }, { status: 400 });
    }

    const updated = await prisma.actionInformed.update({
      where: { id: entryId },
      data: {
        notifyOnProgress: notifyOnProgress !== undefined ? notifyOnProgress : undefined,
        notifyOnComplete: notifyOnComplete !== undefined ? notifyOnComplete : undefined,
        notifyOnBlock: notifyOnBlock !== undefined ? notifyOnBlock : undefined
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('RACI güncelleme hatası:', error);
    return NextResponse.json({ error: 'RACI güncellenemedi' }, { status: 500 });
  }
}
