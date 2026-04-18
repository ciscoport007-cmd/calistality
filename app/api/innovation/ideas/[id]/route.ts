import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth-options';
import { createNotification } from '@/lib/notifications';
import { isAdmin } from '@/lib/audit';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

// GET - Fikir detayı
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await context.params;

    const idea = await prisma.innovationIdea.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true, surname: true } },
        reviewedBy: { select: { id: true, name: true, surname: true } },
        department: { select: { id: true, name: true } },
        strategicGoal: { select: { id: true, name: true, code: true } },
        project: { select: { id: true, code: true, name: true, status: true } },
        votes: {
          include: { user: { select: { id: true, name: true, surname: true } } },
        },
        comments: {
          include: { author: { select: { id: true, name: true, surname: true } } },
          orderBy: { createdAt: 'asc' },
        },
        attachments: {
          include: { uploadedBy: { select: { id: true, name: true, surname: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!idea || !idea.isActive) {
      return NextResponse.json({ error: 'Fikir bulunamadı' }, { status: 404 });
    }

    // Kullanıcının oyunu bul
    const userVote = idea.votes.find((v) => v.userId === session.user.id);

    return NextResponse.json({
      ...idea,
      createdBy: idea.isAnonymous ? null : idea.createdBy,
      userVote: userVote ? (userVote.isUpVote ? 'up' : 'down') : null,
    });
  } catch (error) {
    console.error('Fikir detay hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  YENI: ['DEGERLENDIRME', 'REDDEDILDI', 'ARSIV'],
  DEGERLENDIRME: ['ONAYLANDI', 'REDDEDILDI', 'ARSIV', 'YENI'],
  ONAYLANDI: ['PROJELESTI', 'ARSIV'],
  PROJELESTI: [],
  REDDEDILDI: ['ARSIV', 'YENI'],
  ARSIV: ['YENI'],
};

// PATCH - Fikir güncelle
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();

    const existing = await prisma.innovationIdea.findUnique({ where: { id } });
    if (!existing || !existing.isActive) {
      return NextResponse.json({ error: 'Fikir bulunamadı' }, { status: 404 });
    }

    const {
      title,
      description,
      category,
      maturity,
      status,
      reviewNote,
      departmentId,
      strategicGoalId,
      costSavingEstimate,
      revenueEstimate,
      guestSatisfactionImpact,
      employeeSatisfactionImpact,
    } = body;

    const isAdmin = ['Admin', 'Yönetici'].includes(session.user.role ?? '');

    const updateData: any = {};

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (maturity !== undefined) updateData.maturity = maturity;
    if (departmentId !== undefined) updateData.departmentId = departmentId || null;
    if (strategicGoalId !== undefined) updateData.strategicGoalId = strategicGoalId || null;
    if (costSavingEstimate !== undefined) updateData.costSavingEstimate = costSavingEstimate ? parseFloat(costSavingEstimate) : null;
    if (revenueEstimate !== undefined) updateData.revenueEstimate = revenueEstimate ? parseFloat(revenueEstimate) : null;
    if (guestSatisfactionImpact !== undefined) updateData.guestSatisfactionImpact = guestSatisfactionImpact || null;
    if (employeeSatisfactionImpact !== undefined) updateData.employeeSatisfactionImpact = employeeSatisfactionImpact || null;

    // Durum değişikliği sadece Admin/Yönetici
    if (status !== undefined && status !== existing.status) {
      if (!isAdmin) {
        return NextResponse.json({ error: 'Durum değişikliği için yetkiniz yok' }, { status: 403 });
      }
      const allowed = ALLOWED_TRANSITIONS[existing.status] ?? [];
      if (!allowed.includes(status)) {
        return NextResponse.json({ error: `${existing.status} durumundan ${status} durumuna geçiş yapılamaz` }, { status: 400 });
      }
      updateData.status = status;
      updateData.reviewedById = session.user.id;
      updateData.reviewedAt = new Date();
    }

    if (reviewNote !== undefined) {
      if (!isAdmin) {
        return NextResponse.json({ error: 'Yönetici notu eklemek için yetkiniz yok' }, { status: 403 });
      }
      updateData.reviewNote = reviewNote;
    }

    const idea = await prisma.innovationIdea.update({
      where: { id },
      data: updateData,
      include: {
        createdBy: { select: { id: true, name: true, surname: true } },
        department: { select: { id: true, name: true } },
      },
    });

    // Durum değişince fikir sahibine bildir
    if (status !== undefined && status !== existing.status && existing.createdById !== session.user.id) {
      const statusLabels: Record<string, string> = {
        DEGERLENDIRME: 'Değerlendirme',
        ONAYLANDI: 'Onaylandı',
        REDDEDILDI: 'Reddedildi',
        PROJELESTI: 'Projeye Dönüştürüldü',
        ARSIV: 'Arşive Alındı',
      };
      await createNotification({
        userId: existing.createdById,
        title: 'Fikrinizin Durumu Güncellendi',
        message: `${existing.code} kodlu "${existing.title}" fikrinizin durumu "${statusLabels[status] ?? status}" olarak güncellendi.`,
        type: status === 'REDDEDILDI' ? 'UYARI' : 'BILGI',
        link: `/dashboard/innovation/${id}`,
      });
    }

    return NextResponse.json(idea);
  } catch (error) {
    console.error('Fikir güncelleme hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// DELETE - Fikir sil (soft delete, sadece Admin)
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    if (!isAdmin(session.user.role)) {
      return NextResponse.json({ error: 'Silme işlemi için Admin yetkisi gereklidir' }, { status: 403 });
    }

    const { id } = await context.params;

    await prisma.innovationIdea.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ message: 'Fikir silindi' });
  } catch (error) {
    console.error('Fikir silme hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
