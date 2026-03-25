import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export async function GET(
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
        department: true,
        chairman: { select: { id: true, name: true, surname: true, email: true, position: true } },
        secretary: { select: { id: true, name: true, surname: true, email: true, position: true } },
        meetingRoom: { select: { id: true, name: true, code: true, location: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        gmApprovedBy: { select: { id: true, name: true } },
        parent: { select: { id: true, name: true, code: true } },
        children: { select: { id: true, name: true, code: true, status: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, surname: true, email: true, position: true, department: true } },
            assignedBy: { select: { id: true, name: true } },
          },
          orderBy: { role: 'asc' },
        },
        meetings: {
          orderBy: { date: 'desc' },
          take: 10,
        },
        documents: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!committee) {
      return NextResponse.json({ error: 'Komite bulunamadı' }, { status: 404 });
    }

    return NextResponse.json(committee);
  } catch (error) {
    console.error('Error fetching committee:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
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
      name, description, type, departmentId, chairmanId, secretaryId,
      mission, responsibilities, authorities, meetingFrequency, meetingRoomId,
      meetingTime, establishedDate, endDate, status, parentId,
      responsibilitiesFile, responsibilitiesFileName,
    } = body;

    const updated = await prisma.committee.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(type && { type }),
        ...(departmentId !== undefined && { departmentId: departmentId || null }),
        ...(chairmanId !== undefined && { chairmanId: chairmanId || null }),
        ...(secretaryId !== undefined && { secretaryId: secretaryId || null }),
        ...(mission !== undefined && { mission }),
        ...(responsibilities !== undefined && { responsibilities }),
        ...(authorities !== undefined && { authorities }),
        ...(meetingFrequency !== undefined && { meetingFrequency }),
        ...(meetingRoomId !== undefined && { meetingRoomId: meetingRoomId || null }),
        ...(meetingTime !== undefined && { meetingTime }),
        ...(establishedDate !== undefined && { establishedDate: establishedDate ? new Date(establishedDate) : null }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(status && { status }),
        ...(parentId !== undefined && { parentId: parentId || null }),
        ...(responsibilitiesFile !== undefined && { responsibilitiesFile: responsibilitiesFile || null }),
        ...(responsibilitiesFileName !== undefined && { responsibilitiesFileName: responsibilitiesFileName || null }),
      },
      include: {
        department: true,
        chairman: { select: { id: true, name: true, surname: true, email: true } },
        secretary: { select: { id: true, name: true, surname: true, email: true } },
        meetingRoom: { select: { id: true, name: true, code: true, location: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, surname: true, email: true } },
          },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating committee:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Önce üyeleri sil
    await prisma.committeeMember.deleteMany({ where: { committeeId: params.id } });
    await prisma.committeeMeeting.deleteMany({ where: { committeeId: params.id } });
    await prisma.committeeDocument.deleteMany({ where: { committeeId: params.id } });

    await prisma.committee.delete({ where: { id: params.id } });

    return NextResponse.json({ message: 'Komite silindi' });
  } catch (error) {
    console.error('Error deleting committee:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GM Onayı
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
    const { action } = body;

    if (action === 'approve') {
      const updated = await prisma.committee.update({
        where: { id: params.id },
        data: {
          gmApproval: true,
          gmApprovalDate: new Date(),
          gmApprovedById: session.user.id,
          status: 'AKTIF',
        },
      });
      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: 'Geçersiz işlem' }, { status: 400 });
  } catch (error) {
    console.error('Error processing committee action:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
