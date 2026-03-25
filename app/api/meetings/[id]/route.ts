import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

// GET - Tek toplantı detayı
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const meeting = await prisma.meeting.findUnique({
      where: { id: params.id },
      include: {
        room: true,
        department: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            surname: true,
            email: true,
          }
        },
        parentMeeting: {
          select: {
            id: true,
            code: true,
            title: true,
          }
        },
        childMeetings: {
          select: {
            id: true,
            code: true,
            title: true,
            date: true,
            status: true,
          },
          orderBy: {
            date: 'asc'
          }
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                surname: true,
                email: true,
                department: {
                  select: {
                    id: true,
                    name: true,
                  }
                },
                position: {
                  select: {
                    id: true,
                    name: true,
                  }
                }
              }
            }
          }
        },
        externalParticipants: true,
        actions: {
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
        },
        documents: {
          include: {
            uploadedBy: {
              select: {
                id: true,
                name: true,
                surname: true,
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        poolItems: {
          include: {
            action: true,
          }
        }
      }
    });

    if (!meeting) {
      return NextResponse.json(
        { error: 'Toplantı bulunamadı' },
        { status: 404 }
      );
    }

    // Gizli toplantı kontrolü
    if (meeting.isPrivate) {
      const isCreator = meeting.createdById === session.user.id;
      const isParticipant = meeting.participants.some((p: any) => p.userId === session.user.id);
      
      if (!isCreator && !isParticipant) {
        return NextResponse.json(
          { error: 'Bu toplantıya erişim yetkiniz yok' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(meeting);
  } catch (error) {
    console.error('Meeting fetch error:', error);
    return NextResponse.json(
      { error: 'Toplantı getirilirken hata oluştu' },
      { status: 500 }
    );
  }
}

// PATCH - Toplantı güncelle
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
      title,
      description,
      type,
      date,
      startTime,
      endTime,
      roomId,
      onlineLink,
      isOnline,
      isPrivate,
      status,
      agenda,
      notes,
      departmentId,
    } = body;

    const meeting = await prisma.meeting.findUnique({
      where: { id: params.id },
    });

    if (!meeting) {
      return NextResponse.json(
        { error: 'Toplantı bulunamadı' },
        { status: 404 }
      );
    }

    const updateData: any = {};
    
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (type !== undefined) updateData.type = type;
    if (date !== undefined) updateData.date = new Date(date);
    if (startTime !== undefined) updateData.startTime = new Date(startTime);
    if (endTime !== undefined) updateData.endTime = new Date(endTime);
    if (roomId !== undefined) updateData.roomId = roomId || null;
    if (onlineLink !== undefined) updateData.onlineLink = onlineLink;
    if (isOnline !== undefined) updateData.isOnline = isOnline;
    if (isPrivate !== undefined) updateData.isPrivate = isPrivate;
    if (status !== undefined) updateData.status = status;
    if (agenda !== undefined) updateData.agenda = agenda;
    if (notes !== undefined) updateData.notes = notes;
    if (departmentId !== undefined) updateData.departmentId = departmentId || null;

    const updatedMeeting = await prisma.meeting.update({
      where: { id: params.id },
      data: updateData,
      include: {
        room: true,
        department: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            surname: true,
            email: true,
          }
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                surname: true,
                email: true,
              }
            }
          }
        },
        externalParticipants: true,
      }
    });

    return NextResponse.json(updatedMeeting);
  } catch (error) {
    console.error('Meeting update error:', error);
    return NextResponse.json(
      { error: 'Toplantı güncellenirken hata oluştu' },
      { status: 500 }
    );
  }
}

// DELETE - Toplantı sil
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const meeting = await prisma.meeting.findUnique({
      where: { id: params.id },
    });

    if (!meeting) {
      return NextResponse.json(
        { error: 'Toplantı bulunamadı' },
        { status: 404 }
      );
    }

    // Sadece oluşturan silebilir
    if (meeting.createdById !== session.user.id) {
      const userRole = session.user.role?.toLowerCase();
      if (userRole !== 'admin' && userRole !== 'yönetici') {
        return NextResponse.json(
          { error: 'Bu toplantıyı silme yetkiniz yok' },
          { status: 403 }
        );
      }
    }

    await prisma.meeting.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Meeting delete error:', error);
    return NextResponse.json(
      { error: 'Toplantı silinirken hata oluştu' },
      { status: 500 }
    );
  }
}
