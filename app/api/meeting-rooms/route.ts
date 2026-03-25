import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

// GET - Toplantı salonları listesi
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rooms = await prisma.meetingRoom.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json(rooms);
  } catch (error) {
    console.error('Meeting rooms fetch error:', error);
    return NextResponse.json(
      { error: 'Toplantı salonları getirilirken hata oluştu' },
      { status: 500 }
    );
  }
}

// POST - Yeni toplantı salonu
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, code, location, capacity, description } = body;

    if (!name || !code) {
      return NextResponse.json(
        { error: 'Salon adı ve kodu zorunludur' },
        { status: 400 }
      );
    }

    // Kod benzersiz mi?
    const existing = await prisma.meetingRoom.findUnique({
      where: { code }
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Bu kod zaten kullanılıyor' },
        { status: 400 }
      );
    }

    const room = await prisma.meetingRoom.create({
      data: {
        name,
        code,
        location,
        capacity,
        description,
        isActive: true
      }
    });

    return NextResponse.json(room, { status: 201 });
  } catch (error) {
    console.error('Meeting room create error:', error);
    return NextResponse.json(
      { error: 'Toplantı salonu oluşturulurken hata oluştu' },
      { status: 500 }
    );
  }
}

// PATCH - Salon güncelle
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, location, capacity, description, isActive } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Salon ID gerekli' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (location !== undefined) updateData.location = location;
    if (capacity !== undefined) updateData.capacity = capacity;
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;

    const room = await prisma.meetingRoom.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json(room);
  } catch (error) {
    console.error('Meeting room update error:', error);
    return NextResponse.json(
      { error: 'Toplantı salonu güncellenirken hata oluştu' },
      { status: 500 }
    );
  }
}

// DELETE - Salon sil
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
        { error: 'Salon ID gerekli' },
        { status: 400 }
      );
    }

    // Soft delete
    await prisma.meetingRoom.update({
      where: { id },
      data: { isActive: false }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Meeting room delete error:', error);
    return NextResponse.json(
      { error: 'Toplantı salonu silinirken hata oluştu' },
      { status: 500 }
    );
  }
}
