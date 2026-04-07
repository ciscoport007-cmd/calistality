import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { MeetingType, ParticipantStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const departmentId = searchParams.get('departmentId');

    const committees = await prisma.committee.findMany({
      where: {
        ...(status && { status: status as any }),
        ...(type && { type: type as any }),
        ...(departmentId && { departmentId }),
      },
      include: {
        department: true,
        chairman: { select: { id: true, name: true, surname: true, email: true } },
        secretary: { select: { id: true, name: true, surname: true, email: true } },
        meetingRoom: { select: { id: true, name: true, code: true, location: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        gmApprovedBy: { select: { id: true, name: true } },
        _count: {
          select: { members: true, meetings: true, documents: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(committees);
  } catch (error) {
    console.error('Error fetching committees:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name, description, type, departmentId, chairmanId, secretaryId,
      mission, authorities, meetingFrequency, meetingRoomId,
      meetingTime, establishedDate, memberIds,
      responsibilitiesFile, responsibilitiesFileName,
      firstMeetingDate
    } = body;

    if (!name) {
      return NextResponse.json({ error: 'Komite adı zorunludur' }, { status: 400 });
    }

    // Kod üret - son kodu bulup +1 ekle (unique constraint hatasını önlemek için)
    const year = new Date().getFullYear();
    const lastCommittee = await prisma.committee.findFirst({
      where: { code: { startsWith: `KMT-${year}` } },
      orderBy: { code: 'desc' },
      select: { code: true },
    });
    let nextNumber = 1;
    if (lastCommittee) {
      const lastNum = parseInt(lastCommittee.code.split('-')[2]);
      if (!isNaN(lastNum)) nextNumber = lastNum + 1;
    }
    const code = `KMT-${year}-${String(nextNumber).padStart(4, '0')}`;

    const committee = await prisma.committee.create({
      data: {
        code,
        name,
        description,
        type: type || 'DAIMI',
        departmentId: departmentId || null,
        chairmanId: chairmanId || null,
        secretaryId: secretaryId || null,
        mission,
        authorities: authorities || null,
        meetingFrequency,
        meetingRoomId: meetingRoomId || null,
        meetingTime,
        responsibilitiesFile: responsibilitiesFile || null,
        responsibilitiesFileName: responsibilitiesFileName || null,
        establishedDate: establishedDate ? new Date(establishedDate) : null,
        firstMeetingDate: firstMeetingDate ? new Date(firstMeetingDate) : null,
        status: 'TASLAK',
        createdById: session.user.id,
      },
      include: {
        department: true,
        chairman: { select: { id: true, name: true, surname: true, email: true } },
        secretary: { select: { id: true, name: true, surname: true, email: true } },
        meetingRoom: { select: { id: true, name: true, code: true, location: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    // Üyeleri ekle
    if (memberIds && Array.isArray(memberIds) && memberIds.length > 0) {
      const memberData = memberIds.filter((id: string | null): id is string => id !== null).map((userId: string) => ({
        committeeId: committee.id,
        userId,
        role: 'UYE' as const,
        assignedById: session.user.id,
      }));

      await prisma.committeeMember.createMany({
        data: memberData,
        skipDuplicates: true,
      });
    }

    // Başkanı ve sekreteri de üye olarak ekle
    const leaderMembers = [];
    if (chairmanId) {
      leaderMembers.push({
        committeeId: committee.id,
        userId: chairmanId,
        role: 'BASKAN' as const,
        assignedById: session.user.id,
      });
    }
    if (secretaryId) {
      leaderMembers.push({
        committeeId: committee.id,
        userId: secretaryId,
        role: 'SEKRETER' as const,
        assignedById: session.user.id,
      });
    }
    if (leaderMembers.length > 0) {
      await prisma.committeeMember.createMany({
        data: leaderMembers,
        skipDuplicates: true,
      });
    }

    // İlk toplantı günü varsa toplantıları otomatik oluştur
    if (firstMeetingDate) {
      try {
        const startDate = new Date(firstMeetingDate);
        const meetingsToCreate: { date: Date; title: string }[] = [];
        
        if (meetingFrequency) {
          // Sıklığa göre interval hesapla (gün cinsinden)
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
          if (intervalDays) {
            // İlk toplantıdan başlayarak 1 yıl ileri için toplantılar oluştur
            const endDate = new Date(startDate);
            endDate.setFullYear(endDate.getFullYear() + 1);
            
            let currentDate = new Date(startDate);
            let meetingIndex = 1;
            
            while (currentDate <= endDate) {
              meetingsToCreate.push({
                date: new Date(currentDate),
                title: `${name} - Toplantı #${meetingIndex}`,
              });
              currentDate = new Date(currentDate.getTime() + intervalDays * 24 * 60 * 60 * 1000);
              meetingIndex++;
            }
          } else {
            // Sıklık tanımlı ama bilinmiyor — sadece ilk toplantıyı oluştur
            meetingsToCreate.push({
              date: new Date(startDate),
              title: `${name} - Toplantı #1`,
            });
          }
        } else {
          // Sıklık seçilmemiş — sadece ilk toplantıyı oluştur
          meetingsToCreate.push({
            date: new Date(startDate),
            title: `${name} - Toplantı #1`,
          });
        }

        // Toplantıları oluştur (hem CommitteeMeeting hem Meeting tablosuna)
        if (meetingsToCreate.length > 0) {
            const currentYear = new Date().getFullYear();
            const existingCommitteeCount = await prisma.committeeMeeting.count({
              where: { code: { startsWith: `KT-${currentYear}` } },
            });

            // Meeting tablosu için son kod numarasını bul
            const lastMainMeeting = await prisma.meeting.findFirst({
              where: { code: { startsWith: `MTG-${currentYear}-` } },
              orderBy: { code: 'desc' },
            });
            let nextMainNumber = 1;
            if (lastMainMeeting) {
              const lastNum = parseInt(lastMainMeeting.code.split('-')[2]);
              nextMainNumber = lastNum + 1;
            }

            // Komite üyelerini al (katılımcı olarak eklemek için)
            const allMemberIds: string[] = [];
            if (memberIds && Array.isArray(memberIds)) {
              allMemberIds.push(...memberIds);
            }
            if (chairmanId && !allMemberIds.includes(chairmanId)) {
              allMemberIds.push(chairmanId);
            }
            if (secretaryId && !allMemberIds.includes(secretaryId)) {
              allMemberIds.push(secretaryId);
            }
            
            for (let i = 0; i < meetingsToCreate.length; i++) {
              const mtg = meetingsToCreate[i];
              const mtgCode = `KT-${currentYear}-${String(existingCommitteeCount + i + 1).padStart(4, '0')}`;
              
              // CommitteeMeeting tablosuna kaydet
              await prisma.committeeMeeting.create({
                data: {
                  code: mtgCode,
                  committeeId: committee.id,
                  title: mtg.title,
                  date: mtg.date,
                  startTime: meetingTime || '10:00',
                  location: committee.meetingRoomId ? undefined : undefined,
                  status: 'PLANLANMIS',
                  createdById: session.user.id,
                },
              });

              // Meeting (Toplantı Yönetimi) tablosuna da kaydet
              const mainMtgCode = `MTG-${currentYear}-${String(nextMainNumber + i).padStart(4, '0')}`;
              const meetingDateObj = new Date(mtg.date);
              
              // Başlangıç ve bitiş saati oluştur
              const timeStr = meetingTime || '10:00';
              const [hours, minutes] = timeStr.split(':').map(Number);
              const startTimeDate = new Date(meetingDateObj);
              startTimeDate.setHours(hours, minutes, 0, 0);
              const endTimeDate = new Date(startTimeDate);
              endTimeDate.setHours(endTimeDate.getHours() + 1); // Varsayılan 1 saat

              await prisma.meeting.create({
                data: {
                  code: mainMtgCode,
                  title: mtg.title,
                  description: `${name} komitesi toplantısı`,
                  type: MeetingType.KOMITE,
                  date: meetingDateObj,
                  startTime: startTimeDate,
                  endTime: endTimeDate,
                  roomId: meetingRoomId || null,
                  departmentId: departmentId || null,
                  committeeId: committee.id,
                  isRecurring: !!meetingFrequency,
                  createdById: session.user.id,
                  // Komite üyelerini katılımcı olarak ekle
                  ...(allMemberIds.length > 0 ? {
                    participants: {
                      create: allMemberIds.filter((id: string | null): id is string => id !== null).map((userId: string) => ({
                        userId,
                        status: ParticipantStatus.DAVET_EDILDI,
                      })),
                    },
                  } : {}),
                },
              });
            }
          }
      } catch (meetingError) {
        console.error('Auto-create meetings error:', meetingError);
        // Toplantı oluşturma hatası komite oluşturmayı engellemez
      }
    }

    return NextResponse.json(committee, { status: 201 });
  } catch (error) {
    console.error('Error creating committee:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
