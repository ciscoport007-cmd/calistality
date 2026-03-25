import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

// Ramak kala detayı
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await params;

    const nearMiss = await prisma.oHSNearMiss.findUnique({
      where: { id },
      include: {
        department: { select: { id: true, name: true, code: true } },
        reporter: { select: { id: true, name: true, surname: true, email: true } },
        createdBy: { select: { id: true, name: true, surname: true, email: true } },
      },
    });

    if (!nearMiss) {
      return NextResponse.json({ error: 'Ramak kala bulunamadı' }, { status: 404 });
    }

    return NextResponse.json(nearMiss);
  } catch (error) {
    console.error('OHS near miss fetch error:', error);
    return NextResponse.json(
      { error: 'Ramak kala detayı alınamadı' },
      { status: 500 }
    );
  }
}

// Ramak kala güncelle
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Yetki kontrolü
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { role: true },
    });

    const allowedRoles = ['Admin', 'Yönetici', 'İSG Uzmanı', 'İş Güvenliği Uzmanı', 'Kalite Müdürü'];
    if (!user?.role || !allowedRoles.some(r => user.role?.name.includes(r))) {
      return NextResponse.json(
        { error: 'Bu işlem için yetkiniz yok' },
        { status: 403 }
      );
    }

    const {
      title,
      eventDate,
      departmentId,
      description,
      suggestedMeasure,
      responsibleNote,
      status,
      completedAt,
    } = body;

    const updateData: any = {};

    if (title) updateData.title = title;
    if (eventDate) updateData.eventDate = new Date(eventDate);
    if (departmentId) updateData.departmentId = departmentId;
    if (description) updateData.description = description;
    if (suggestedMeasure !== undefined) updateData.suggestedMeasure = suggestedMeasure;
    if (responsibleNote !== undefined) updateData.responsibleNote = responsibleNote;
    if (status !== undefined) {
      updateData.status = status;
      if (status === 'TAMAMLANDI') {
        updateData.completedAt = completedAt ? new Date(completedAt) : new Date();
      } else if (status === 'ACIK') {
        updateData.completedAt = null;
      }
    }

    const nearMiss = await prisma.oHSNearMiss.update({
      where: { id },
      data: updateData,
      include: {
        department: { select: { id: true, name: true } },
        reporter: { select: { id: true, name: true, surname: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
      },
    });

    return NextResponse.json(nearMiss);
  } catch (error) {
    console.error('OHS near miss update error:', error);
    return NextResponse.json(
      { error: 'Ramak kala güncellenemedi' },
      { status: 500 }
    );
  }
}

// Ramak kala sil (soft delete)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await params;

    // Yetki kontrolü
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { role: true },
    });

    const allowedRoles = ['Admin', 'Yönetici'];
    if (!user?.role || !allowedRoles.some(r => user.role?.name.includes(r))) {
      return NextResponse.json(
        { error: 'Silme yetkisi yalnızca yöneticilere aittir' },
        { status: 403 }
      );
    }

    await prisma.oHSNearMiss.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('OHS near miss delete error:', error);
    return NextResponse.json(
      { error: 'Ramak kala silinemedi' },
      { status: 500 }
    );
  }
}
