import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

// GET - Toplantı katılımcıları
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const participants = await prisma.meetingParticipant.findMany({
      where: { meetingId: params.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            surname: true,
            email: true,
            department: {
              select: { id: true, name: true }
            },
            position: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });

    const externalParticipants = await prisma.meetingExternalParticipant.findMany({
      where: { meetingId: params.id }
    });

    return NextResponse.json({
      internal: participants,
      external: externalParticipants
    });
  } catch (error) {
    console.error('Participants fetch error:', error);
    return NextResponse.json(
      { error: 'Katılımcılar getirilirken hata oluştu' },
      { status: 500 }
    );
  }
}

// POST - Katılımcı ekle
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
    const { userId, external } = body;

    // Kurum dışı katılımcı
    if (external) {
      const { name, email, phone, company, title } = body;
      
      if (!name) {
        return NextResponse.json(
          { error: 'Katılımcı adı zorunludur' },
          { status: 400 }
        );
      }

      const participant = await prisma.meetingExternalParticipant.create({
        data: {
          meetingId: params.id,
          name,
          email,
          phone,
          company,
          title,
          status: 'DAVET_EDILDI'
        }
      });

      return NextResponse.json(participant, { status: 201 });
    }

    // Kurum içi katılımcı
    if (!userId) {
      return NextResponse.json(
        { error: 'Kullanıcı ID gerekli' },
        { status: 400 }
      );
    }

    // Zaten ekli mi kontrol et
    const existing = await prisma.meetingParticipant.findUnique({
      where: {
        meetingId_userId: {
          meetingId: params.id,
          userId
        }
      }
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Bu kullanıcı zaten katılımcı' },
        { status: 400 }
      );
    }

    const participant = await prisma.meetingParticipant.create({
      data: {
        meetingId: params.id,
        userId,
        status: 'DAVET_EDILDI'
      },
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
    });

    return NextResponse.json(participant, { status: 201 });
  } catch (error) {
    console.error('Participant add error:', error);
    return NextResponse.json(
      { error: 'Katılımcı eklenirken hata oluştu' },
      { status: 500 }
    );
  }
}

// PATCH - Katılımcı durumu güncelle
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
    const { participantId, status, responseNote, attended, external } = body;

    if (external) {
      const updated = await prisma.meetingExternalParticipant.update({
        where: { id: participantId },
        data: {
          status,
          responseNote,
          attended
        }
      });
      return NextResponse.json(updated);
    }

    const updated = await prisma.meetingParticipant.update({
      where: { id: participantId },
      data: {
        status,
        responseNote,
        respondedAt: status ? new Date() : undefined,
        attended,
        attendedAt: attended ? new Date() : undefined
      },
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
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Participant update error:', error);
    return NextResponse.json(
      { error: 'Katılımcı güncellenirken hata oluştu' },
      { status: 500 }
    );
  }
}

// DELETE - Katılımcı kaldır
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
    const participantId = searchParams.get('participantId');
    const external = searchParams.get('external') === 'true';

    if (!participantId) {
      return NextResponse.json(
        { error: 'Katılımcı ID gerekli' },
        { status: 400 }
      );
    }

    if (external) {
      await prisma.meetingExternalParticipant.delete({
        where: { id: participantId }
      });
    } else {
      await prisma.meetingParticipant.delete({
        where: { id: participantId }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Participant delete error:', error);
    return NextResponse.json(
      { error: 'Katılımcı silinirken hata oluştu' },
      { status: 500 }
    );
  }
}
