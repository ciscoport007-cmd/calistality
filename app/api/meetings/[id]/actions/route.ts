import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET - Toplantı aksiyonları
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const actions = await prisma.meetingAction.findMany({
      where: { meetingId: params.id },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            surname: true,
            email: true,
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            surname: true,
          }
        },
        followers: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                surname: true,
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(actions);
  } catch (error) {
    console.error('Actions fetch error:', error);
    return NextResponse.json(
      { error: 'Aksiyonlar getirilirken hata oluştu' },
      { status: 500 }
    );
  }
}

// POST - Aksiyon ekle
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      type,
      title,
      description,
      assigneeId,
      dueDate,
      followers
    } = body;

    if (!title || !assigneeId || !dueDate) {
      return NextResponse.json(
        { error: 'Başlık, sorumlu ve bitiş tarihi zorunludur' },
        { status: 400 }
      );
    }

    const action = await prisma.meetingAction.create({
      data: {
        meetingId: params.id,
        type,
        title,
        description,
        assigneeId,
        dueDate: new Date(dueDate),
        status: 'BEKLEMEDE',
        createdById: session.user.id,
        followers: followers?.length > 0 ? {
          create: followers.filter((id: string | null): id is string => id !== null).map((userId: string) => ({
            userId
          }))
        } : undefined
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            surname: true,
            email: true,
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            surname: true,
          }
        },
        followers: {
          include: {
            user: {
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

    return NextResponse.json(action, { status: 201 });
  } catch (error) {
    console.error('Action create error:', error);
    return NextResponse.json(
      { error: 'Aksiyon oluşturulurken hata oluştu' },
      { status: 500 }
    );
  }
}

// PATCH - Aksiyon güncelle
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      actionId,
      title,
      description,
      status,
      progress,
      notes,
      completionNote,
      inPool,
      assigneeId,
      dueDate
    } = body;

    if (!actionId) {
      return NextResponse.json(
        { error: 'Aksiyon ID gerekli' },
        { status: 400 }
      );
    }

    // TAMAMLANDI durumu için completionNote zorunlu
    if (status === 'TAMAMLANDI' && !completionNote?.trim()) {
      return NextResponse.json(
        { error: 'Aksiyonu tamamlarken açıklama yazılması zorunludur' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) {
      updateData.status = status;
      if (status === 'TAMAMLANDI') {
        updateData.completedAt = new Date();
        updateData.progress = 100;
      }
    }
    if (progress !== undefined) updateData.progress = progress;
    if (notes !== undefined) updateData.notes = notes;
    if (completionNote !== undefined) updateData.completionNote = completionNote;
    if (inPool !== undefined) updateData.inPool = inPool;
    if (assigneeId !== undefined) updateData.assigneeId = assigneeId;
    if (dueDate !== undefined) updateData.dueDate = new Date(dueDate);

    const action = await prisma.meetingAction.update({
      where: { id: actionId },
      data: updateData,
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            surname: true,
            email: true,
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            surname: true,
          }
        },
        followers: {
          include: {
            user: {
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

    // Eğer havuza eklendiyse, pool item oluştur
    if (inPool) {
      const existingPoolItem = await prisma.meetingPoolItem.findFirst({
        where: { actionId: actionId }
      });

      if (!existingPoolItem) {
        await prisma.meetingPoolItem.create({
          data: {
            actionId: actionId,
            status: 'BEKLEMEDE',
            priority: 'ORTA'
          }
        });
      }
    }

    return NextResponse.json(action);
  } catch (error) {
    console.error('Action update error:', error);
    return NextResponse.json(
      { error: 'Aksiyon güncellenirken hata oluştu' },
      { status: 500 }
    );
  }
}

// DELETE - Aksiyon sil
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const actionId = searchParams.get('actionId');

    if (!actionId) {
      return NextResponse.json(
        { error: 'Aksiyon ID gerekli' },
        { status: 400 }
      );
    }

    await prisma.meetingAction.delete({
      where: { id: actionId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Action delete error:', error);
    return NextResponse.json(
      { error: 'Aksiyon silinirken hata oluştu' },
      { status: 500 }
    );
  }
}
