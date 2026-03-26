import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { MeetingType, ParticipantStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET - Komiteye ait toplantıları getir (Meeting tablosundan)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const meetings = await prisma.meeting.findMany({
      where: { committeeId: params.id },
      include: {
        room: true,
        department: true,
        createdBy: {
          select: { id: true, name: true, surname: true, email: true }
        },
        participants: {
          include: {
            user: {
              select: { id: true, name: true, surname: true, email: true }
            }
          }
        },
        _count: { select: { actions: true, documents: true } },
      },
      orderBy: { date: 'asc' },
    });

    return NextResponse.json(meetings);
  } catch (error) {
    console.error('Committee meetings fetch error:', error);
    return NextResponse.json(
      { error: 'Komite toplantıları getirilirken hata oluştu' },
      { status: 500 }
    );
  }
}

// POST - Komite için toplantıları oluştur (generate meetings)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const committee = await prisma.committee.findUnique({
      where: { id: params.id },
      include: {
        members: { select: { userId: true } },
      },
    });

    if (!committee) {
      return NextResponse.json({ error: 'Komite bulunamadı' }, { status: 404 });
    }

    const body = await request.json();
    const { startDate: startDateStr, endDate: endDateStr, frequency: freqOverride } = body;

    const meetingFrequency = freqOverride || committee.meetingFrequency;
    if (!meetingFrequency) {
      return NextResponse.json(
        { error: 'Toplantı sıklığı belirtilmemiş' },
        { status: 400 }
      );
    }

    if (!startDateStr) {
      return NextResponse.json(
        { error: 'Başlangıç tarihi zorunludur' },
        { status: 400 }
      );
    }

    const startDate = new Date(startDateStr);
    const endDate = endDateStr ? new Date(endDateStr) : new Date(startDate);
    if (!endDateStr) {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    const frequencyDays: Record<string, number> = {
      'HAFTALIK': 7,
      'IKI_HAFTALIK': 14,
      'IKI_HAFTADA_BIR': 14,
      'AYLIK': 30,
      'IKI_AYLIK': 60,
      'UC_AYLIK': 90,
      'ALTI_AYLIK': 180,
      'YILLIK': 365,
    };

    const intervalDays = frequencyDays[meetingFrequency];
    if (!intervalDays) {
      return NextResponse.json(
        { error: 'Geçersiz toplantı sıklığı' },
        { status: 400 }
      );
    }

    // Mevcut komite toplantılarını kontrol et (çakışma önleme)
    const existingMeetings = await prisma.meeting.findMany({
      where: { committeeId: params.id },
      select: { date: true },
    });
    const existingDates = new Set(
      existingMeetings.map((m) => m.date.toISOString().split('T')[0])
    );

    // Toplantıları oluştur
    const meetingsToCreate: { date: Date; title: string }[] = [];
    let currentDate = new Date(startDate);
    let meetingIndex = existingMeetings.length + 1;

    while (currentDate <= endDate) {
      const dateKey = currentDate.toISOString().split('T')[0];
      if (!existingDates.has(dateKey)) {
        meetingsToCreate.push({
          date: new Date(currentDate),
          title: `${committee.name} - Toplantı #${meetingIndex}`,
        });
        meetingIndex++;
      }
      currentDate = new Date(currentDate.getTime() + intervalDays * 24 * 60 * 60 * 1000);
    }

    if (meetingsToCreate.length === 0) {
      return NextResponse.json(
        { message: 'Oluşturulacak yeni toplantı yok (tüm tarihler mevcut)' },
        { status: 200 }
      );
    }

    const currentYear = new Date().getFullYear();
    const lastMainMeeting = await prisma.meeting.findFirst({
      where: { code: { startsWith: `MTG-${currentYear}-` } },
      orderBy: { code: 'desc' },
    });
    let nextMainNumber = 1;
    if (lastMainMeeting) {
      const lastNum = parseInt(lastMainMeeting.code.split('-')[2]);
      nextMainNumber = lastNum + 1;
    }

    const allMemberIds = committee.members.map((m) => m.userId);
    const timeStr = committee.meetingTime || '10:00';
    const [hours, minutes] = timeStr.split(':').map(Number);

    let createdCount = 0;
    for (let i = 0; i < meetingsToCreate.length; i++) {
      const mtg = meetingsToCreate[i];
      const mainMtgCode = `MTG-${currentYear}-${String(nextMainNumber + i).padStart(4, '0')}`;

      const meetingDateObj = new Date(mtg.date);
      const startTimeDate = new Date(meetingDateObj);
      startTimeDate.setHours(hours || 10, minutes || 0, 0, 0);
      const endTimeDate = new Date(startTimeDate);
      endTimeDate.setHours(endTimeDate.getHours() + 1);

      await prisma.meeting.create({
        data: {
          code: mainMtgCode,
          title: mtg.title,
          description: `${committee.name} komitesi toplantısı`,
          type: MeetingType.KOMITE,
          date: meetingDateObj,
          startTime: startTimeDate,
          endTime: endTimeDate,
          roomId: committee.meetingRoomId || null,
          departmentId: committee.departmentId || null,
          committeeId: committee.id,
          isRecurring: true,
          createdById: session.user.id,
          ...(allMemberIds.length > 0
            ? {
                participants: {
                  create: allMemberIds.map((userId: string) => ({
                    userId,
                    status: ParticipantStatus.DAVET_EDILDI,
                  })),
                },
              }
            : {}),
        },
      });
      createdCount++;
    }

    return NextResponse.json(
      { message: `${createdCount} toplantı başarıyla oluşturuldu`, count: createdCount },
      { status: 201 }
    );
  } catch (error) {
    console.error('Generate committee meetings error:', error);
    return NextResponse.json(
      { error: 'Toplantılar oluşturulurken hata oluştu' },
      { status: 500 }
    );
  }
}
