import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { MeetingType, ParticipantStatus } from '@prisma/client';

// GET - Toplantı listesi
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const view = searchParams.get('view'); // daily, weekly, monthly
    const myMeetings = searchParams.get('myMeetings') === 'true';

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    // Tarih filtreleme
    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        where.date.lte = new Date(endDate);
      }
    }

    // Sadece kullanıcının katıldığı toplantılar
    if (myMeetings) {
      where.OR = [
        { createdById: session.user.id },
        {
          participants: {
            some: {
              userId: session.user.id
            }
          }
        }
      ];
    }

    // Gizli toplantıları filtreleme (sadece katılımcılar görebilir)
    const meetings = await prisma.meeting.findMany({
      where,
      include: {
        room: true,
        department: true,
        committee: { select: { id: true, name: true, code: true } },
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
        _count: {
          select: {
            actions: true,
            documents: true,
          }
        }
      },
      orderBy: {
        date: 'asc'
      }
    });

    // Gizli toplantıları filtrele (sadece oluşturan ve katılımcılar görebilir)
    const filteredMeetings = meetings.filter((meeting: any) => {
      if (!meeting.isPrivate) return true;
      if (meeting.createdById === session.user.id) return true;
      return meeting.participants.some((p: any) => p.userId === session.user.id);
    });

    return NextResponse.json(filteredMeetings);
  } catch (error) {
    console.error('Meetings fetch error:', error);
    return NextResponse.json(
      { error: 'Toplantılar getirilirken hata oluştu' },
      { status: 500 }
    );
  }
}

// POST - Yeni toplantı oluştur
export async function POST(request: NextRequest) {
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
      agenda,
      departmentId,
      participants,
      externalParticipants,
      // Periyodik toplantı ayarları
      isRecurring,
      recurrenceType,
      recurrenceInterval,
      recurrenceEndDate,
      recurrenceCount,
    } = body;

    if (!title || !date || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Başlık, tarih, başlangıç ve bitiş saati zorunludur' },
        { status: 400 }
      );
    }

    // Kod oluştur
    const year = new Date().getFullYear();
    const lastMeeting = await prisma.meeting.findFirst({
      where: {
        code: {
          startsWith: `MTG-${year}-`
        }
      },
      orderBy: {
        code: 'desc'
      }
    });

    let nextNumber = 1;
    if (lastMeeting) {
      const lastNumber = parseInt(lastMeeting.code.split('-')[2]);
      nextNumber = lastNumber + 1;
    }
    const code = `MTG-${year}-${String(nextNumber).padStart(4, '0')}`;

    // Ana toplantıyı oluştur
    const meeting = await prisma.meeting.create({
      data: {
        code,
        title,
        description,
        type: type || 'STANDART',
        date: new Date(date),
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        roomId: roomId || null,
        onlineLink,
        isOnline: isOnline || false,
        isPrivate: isPrivate || false,
        agenda,
        departmentId: departmentId || null,
        isRecurring: isRecurring || false,
        recurrenceType: isRecurring ? recurrenceType : null,
        recurrenceInterval: isRecurring ? recurrenceInterval : null,
        recurrenceEndDate: isRecurring && recurrenceEndDate ? new Date(recurrenceEndDate) : null,
        recurrenceCount: isRecurring ? recurrenceCount : null,
        createdById: session.user.id,
        participants: participants?.length > 0 ? {
          create: participants.map((userId: string) => ({
            userId,
            status: ParticipantStatus.DAVET_EDILDI
          }))
        } : undefined,
        externalParticipants: externalParticipants?.length > 0 ? {
          create: externalParticipants.map((p: any) => ({
            name: p.name,
            email: p.email,
            phone: p.phone,
            company: p.company,
            title: p.title,
            status: ParticipantStatus.DAVET_EDILDI
          }))
        } : undefined,
      },
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

    // Periyodik toplantılar oluştur
    if (isRecurring && recurrenceType && (recurrenceEndDate || recurrenceCount)) {
      const childMeetings = [];
      let currentDate = new Date(date);
      let count = 0;
      const maxCount = recurrenceCount || 52; // Maksimum 52 tekrar
      const endDateLimit = recurrenceEndDate ? new Date(recurrenceEndDate) : null;

      while (count < maxCount) {
        // Sonraki tarihi hesapla
        switch (recurrenceType) {
          case 'GUNLUK':
            currentDate = new Date(currentDate.getTime() + (recurrenceInterval || 1) * 24 * 60 * 60 * 1000);
            break;
          case 'HAFTALIK':
            currentDate = new Date(currentDate.getTime() + (recurrenceInterval || 1) * 7 * 24 * 60 * 60 * 1000);
            break;
          case 'AYLIK':
            currentDate = new Date(currentDate.setMonth(currentDate.getMonth() + (recurrenceInterval || 1)));
            break;
          case 'YILLIK':
            currentDate = new Date(currentDate.setFullYear(currentDate.getFullYear() + (recurrenceInterval || 1)));
            break;
        }

        if (endDateLimit && currentDate > endDateLimit) break;

        count++;
        const childCode = `MTG-${year}-${String(nextNumber + count).padStart(4, '0')}`;
        
        childMeetings.push({
          code: childCode,
          title,
          description,
          type: MeetingType.PERIYODIK,
          date: new Date(currentDate),
          startTime: new Date(new Date(startTime).setFullYear(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate())),
          endTime: new Date(new Date(endTime).setFullYear(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate())),
          roomId: roomId || null,
          onlineLink,
          isOnline: isOnline || false,
          isPrivate: isPrivate || false,
          agenda,
          departmentId: departmentId || null,
          parentMeetingId: meeting.id,
          createdById: session.user.id,
        });
      }

      if (childMeetings.length > 0) {
        await prisma.meeting.createMany({
          data: childMeetings
        });

        // Alt toplantılara da katılımcıları ekle
        const createdChildren = await prisma.meeting.findMany({
          where: { parentMeetingId: meeting.id }
        });

        for (const child of createdChildren) {
          if (participants?.length > 0) {
            await prisma.meetingParticipant.createMany({
              data: participants.map((userId: string) => ({
                meetingId: child.id,
                userId,
                status: ParticipantStatus.DAVET_EDILDI
              }))
            });
          }
        }
      }
    }

    return NextResponse.json(meeting, { status: 201 });
  } catch (error) {
    console.error('Meeting create error:', error);
    return NextResponse.json(
      { error: 'Toplantı oluşturulurken hata oluştu' },
      { status: 500 }
    );
  }
}
