import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth-options';

// GET: Eğitim detayı
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await params;

    const training = await prisma.training.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true, surname: true } },
        plans: {
          include: {
            instructor: { select: { id: true, name: true, surname: true } },
            department: { select: { id: true, name: true } },
            _count: { select: { records: true } },
          },
          orderBy: { plannedDate: 'desc' },
          take: 10,
        },
        requirements: {
          include: {
            position: { select: { id: true, name: true, code: true } },
          },
        },
        _count: {
          select: { plans: true, requirements: true },
        },
      },
    });

    if (!training) {
      return NextResponse.json({ error: 'Eğitim bulunamadı' }, { status: 404 });
    }

    return NextResponse.json(training);
  } catch (error) {
    console.error('Error fetching training:', error);
    return NextResponse.json(
      { error: 'Eğitim alınırken hata oluştu' },
      { status: 500 }
    );
  }
}

// PATCH: Eğitim güncelle
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const training = await prisma.training.update({
      where: { id },
      data: body,
      include: {
        createdBy: { select: { id: true, name: true, surname: true } },
      },
    });

    return NextResponse.json(training);
  } catch (error) {
    console.error('Error updating training:', error);
    return NextResponse.json(
      { error: 'Eğitim güncellenirken hata oluştu' },
      { status: 500 }
    );
  }
}

// DELETE: Eğitim sil
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await params;

    await prisma.training.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Eğitim silindi' });
  } catch (error) {
    console.error('Error deleting training:', error);
    return NextResponse.json(
      { error: 'Eğitim silinirken hata oluştu' },
      { status: 500 }
    );
  }
}
