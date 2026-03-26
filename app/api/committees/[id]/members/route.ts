import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const members = await prisma.committeeMember.findMany({
      where: { committeeId: params.id },
      include: {
        user: {
          select: { id: true, name: true, surname: true, email: true, position: true, department: true },
        },
        assignedBy: { select: { id: true, name: true } },
      },
      orderBy: [{ role: 'asc' }, { startDate: 'asc' }],
    });

    return NextResponse.json(members);
  } catch (error) {
    console.error('Error fetching committee members:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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
    const { userId, role, jobDescription, responsibilities, startDate } = body;

    if (!userId) {
      return NextResponse.json({ error: 'Kullanıcı seçimi zorunludur' }, { status: 400 });
    }

    // Zaten üye mi kontrol et
    const existing = await prisma.committeeMember.findFirst({
      where: { committeeId: params.id, userId },
    });

    if (existing) {
      return NextResponse.json({ error: 'Bu kullanıcı zaten komite üyesi' }, { status: 400 });
    }

    const member = await prisma.committeeMember.create({
      data: {
        committeeId: params.id,
        userId,
        role: role || 'UYE',
        jobDescription,
        responsibilities,
        startDate: startDate ? new Date(startDate) : new Date(),
        assignedById: session.user.id,
      },
      include: {
        user: { select: { id: true, name: true, surname: true, email: true, position: true, department: true } },
        assignedBy: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    console.error('Error adding committee member:', error);
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

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');

    if (!memberId) {
      return NextResponse.json({ error: 'Üye ID gerekli' }, { status: 400 });
    }

    await prisma.committeeMember.delete({ where: { id: memberId } });

    return NextResponse.json({ message: 'Üye komiteden çıkarıldı' });
  } catch (error) {
    console.error('Error removing committee member:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
