import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth-options';

export const dynamic = 'force-dynamic';

// PATCH: Eğitim kaydını güncelle
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; recordId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { recordId } = await params;
    const body = await request.json();

    const updateData: any = { ...body };

    if (body.examScore !== undefined) {
      updateData.examScore = body.examScore ? parseFloat(body.examScore) : null;
    }
    if (body.examDate) {
      updateData.examDate = new Date(body.examDate);
    }
    if (body.certificateDate) {
      updateData.certificateDate = new Date(body.certificateDate);
    }
    if (body.certificateExpiry) {
      updateData.certificateExpiry = new Date(body.certificateExpiry);
    }

    // Katılım durumunu güncelle
    if (body.attended !== undefined) {
      updateData.attended = body.attended;
      if (body.attended) {
        updateData.status = 'KATILDI';
      }
    }

    // Sınav sonucunu güncelle
    if (body.isPassed !== undefined) {
      updateData.isPassed = body.isPassed;
      updateData.status = body.isPassed ? 'BASARILI' : 'BASARISIZ';
    }

    const record = await prisma.trainingRecord.update({
      where: { id: recordId },
      data: updateData,
      include: {
        participant: {
          select: {
            id: true,
            name: true,
            surname: true,
            email: true,
            department: { select: { name: true } },
            position: { select: { name: true } },
          },
        },
      },
    });

    return NextResponse.json(record);
  } catch (error) {
    console.error('Error updating training record:', error);
    return NextResponse.json(
      { error: 'Eğitim kaydı güncellenirken hata oluştu' },
      { status: 500 }
    );
  }
}

// DELETE: Eğitim kaydını sil
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; recordId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { recordId } = await params;

    await prisma.trainingRecord.delete({
      where: { id: recordId },
    });

    return NextResponse.json({ message: 'Eğitim kaydı silindi' });
  } catch (error) {
    console.error('Error deleting training record:', error);
    return NextResponse.json(
      { error: 'Eğitim kaydı silinirken hata oluştu' },
      { status: 500 }
    );
  }
}
