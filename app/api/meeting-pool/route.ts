import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

// GET - Toplantı havuzu
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const poolItems = await prisma.meetingPoolItem.findMany({
      where,
      include: {
        action: {
          include: {
            meeting: {
              select: {
                id: true,
                code: true,
                title: true,
              }
            },
            assignee: {
              select: {
                id: true,
                name: true,
                surname: true,
              }
            }
          }
        },
        meeting: {
          select: {
            id: true,
            code: true,
            title: true,
            date: true,
            status: true,
          }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    return NextResponse.json(poolItems);
  } catch (error) {
    console.error('Meeting pool fetch error:', error);
    return NextResponse.json(
      { error: 'Toplantı havuzu getirilirken hata oluştu' },
      { status: 500 }
    );
  }
}

// POST - Havuza öğe ekle
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { actionId, title, description, priority } = body;

    if (!actionId && !title) {
      return NextResponse.json(
        { error: 'Aksiyon ID veya başlık gerekli' },
        { status: 400 }
      );
    }

    // Eğer actionId varsa, aksiyon zaten havuzda mı kontrol et
    if (actionId) {
      const existing = await prisma.meetingPoolItem.findFirst({
        where: { actionId }
      });

      if (existing) {
        return NextResponse.json(
          { error: 'Bu aksiyon zaten havuzda' },
          { status: 400 }
        );
      }

      // Aksiyonu havuza eklenmiş olarak işaretle
      await prisma.meetingAction.update({
        where: { id: actionId },
        data: { inPool: true }
      });
    }

    const poolItem = await prisma.meetingPoolItem.create({
      data: {
        actionId: actionId || null,
        title: actionId ? null : title,
        description: actionId ? null : description,
        priority: priority || 'ORTA',
        status: 'BEKLEMEDE'
      },
      include: {
        action: {
          include: {
            meeting: {
              select: {
                id: true,
                code: true,
                title: true,
              }
            },
            assignee: {
              select: {
                id: true,
                name: true,
                surname: true,
              }
            }
          }
        }
      }
    });

    return NextResponse.json(poolItem, { status: 201 });
  } catch (error) {
    console.error('Meeting pool item create error:', error);
    return NextResponse.json(
      { error: 'Havuza öğe eklenirken hata oluştu' },
      { status: 500 }
    );
  }
}

// PATCH - Havuz öğesi güncelle
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, status, priority, meetingId } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Öğe ID gerekli' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (meetingId !== undefined) {
      updateData.meetingId = meetingId;
      if (meetingId) {
        updateData.status = 'TOPLANTIDA';
      }
    }

    const poolItem = await prisma.meetingPoolItem.update({
      where: { id },
      data: updateData,
      include: {
        action: {
          include: {
            meeting: {
              select: {
                id: true,
                code: true,
                title: true,
              }
            },
            assignee: {
              select: {
                id: true,
                name: true,
                surname: true,
              }
            }
          }
        },
        meeting: {
          select: {
            id: true,
            code: true,
            title: true,
          }
        }
      }
    });

    return NextResponse.json(poolItem);
  } catch (error) {
    console.error('Meeting pool item update error:', error);
    return NextResponse.json(
      { error: 'Havuz öğesi güncellenirken hata oluştu' },
      { status: 500 }
    );
  }
}

// DELETE - Havuzdan kaldır
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Öğe ID gerekli' },
        { status: 400 }
      );
    }

    // Önce pool item'ı bul
    const poolItem = await prisma.meetingPoolItem.findUnique({
      where: { id }
    });

    if (poolItem?.actionId) {
      // Aksiyon varsa, havuzdan kaldırıldı olarak işaretle
      await prisma.meetingAction.update({
        where: { id: poolItem.actionId },
        data: { inPool: false }
      });
    }

    await prisma.meetingPoolItem.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Meeting pool item delete error:', error);
    return NextResponse.json(
      { error: 'Havuzdan öğe silinirken hata oluştu' },
      { status: 500 }
    );
  }
}
