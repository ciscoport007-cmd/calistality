import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth-options';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

// GET - Kilometre taşları
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await context.params;

    const milestones = await prisma.innovationMilestone.findMany({
      where: { projectId: id },
      orderBy: { dueDate: 'asc' },
    });

    return NextResponse.json(milestones);
  } catch (error) {
    console.error('Milestone listesi hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// POST - Yeni kilometre taşı
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await context.params;
    const { title, description, dueDate } = await request.json();

    if (!title) {
      return NextResponse.json({ error: 'Başlık zorunludur' }, { status: 400 });
    }

    const milestone = await prisma.innovationMilestone.create({
      data: {
        title,
        description: description || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        projectId: id,
      },
    });

    return NextResponse.json(milestone, { status: 201 });
  } catch (error) {
    console.error('Milestone oluşturma hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// PATCH - Kilometre taşı güncelle
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const milestoneId = searchParams.get('milestoneId');
    if (!milestoneId) {
      return NextResponse.json({ error: 'Milestone ID gerekli' }, { status: 400 });
    }

    const { status, completedAt, title, description, dueDate } = await request.json();

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (status !== undefined) {
      updateData.status = status;
      if (status === 'TAMAMLANDI') updateData.completedAt = completedAt ? new Date(completedAt) : new Date();
      else updateData.completedAt = null;
    }

    const milestone = await prisma.innovationMilestone.update({
      where: { id: milestoneId },
      data: updateData,
    });

    return NextResponse.json(milestone);
  } catch (error) {
    console.error('Milestone güncelleme hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// DELETE - Kilometre taşı sil
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const milestoneId = searchParams.get('milestoneId');
    if (!milestoneId) {
      return NextResponse.json({ error: 'Milestone ID gerekli' }, { status: 400 });
    }

    await prisma.innovationMilestone.delete({ where: { id: milestoneId } });

    return NextResponse.json({ message: 'Kilometre taşı silindi' });
  } catch (error) {
    console.error('Milestone silme hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
