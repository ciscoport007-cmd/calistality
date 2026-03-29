import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth-options';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

// GET - Proje detayı
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await context.params;

    const project = await prisma.innovationProject.findUnique({
      where: { id },
      include: {
        manager: { select: { id: true, name: true, surname: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
        department: { select: { id: true, name: true } },
        strategicGoal: { select: { id: true, name: true, code: true } },
        idea: { select: { id: true, code: true, title: true, status: true } },
        tasks: {
          include: {
            assignee: { select: { id: true, name: true, surname: true } },
            createdBy: { select: { id: true, name: true, surname: true } },
          },
          orderBy: [{ status: 'asc' }, { sortOrder: 'asc' }],
        },
        milestones: { orderBy: { dueDate: 'asc' } },
        stakeholders: {
          include: { user: { select: { id: true, name: true, surname: true } } },
        },
      },
    });

    if (!project || !project.isActive) {
      return NextResponse.json({ error: 'Proje bulunamadı' }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error('Proje detay hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// PATCH - Proje güncelle
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();

    const existing = await prisma.innovationProject.findUnique({ where: { id } });
    if (!existing || !existing.isActive) {
      return NextResponse.json({ error: 'Proje bulunamadı' }, { status: 404 });
    }

    const {
      name, description, status, managerId, departmentId, strategicGoalId,
      startDate, endDate, actualEndDate,
      estimatedBudget, actualBudget,
      estimatedROI, actualROI, roiNote,
      progress,
    } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (managerId !== undefined) updateData.managerId = managerId || null;
    if (departmentId !== undefined) updateData.departmentId = departmentId || null;
    if (strategicGoalId !== undefined) updateData.strategicGoalId = strategicGoalId || null;
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
    if (actualEndDate !== undefined) updateData.actualEndDate = actualEndDate ? new Date(actualEndDate) : null;
    if (estimatedBudget !== undefined) updateData.estimatedBudget = estimatedBudget ? parseFloat(estimatedBudget) : null;
    if (actualBudget !== undefined) updateData.actualBudget = actualBudget ? parseFloat(actualBudget) : null;
    if (estimatedROI !== undefined) updateData.estimatedROI = estimatedROI ? parseFloat(estimatedROI) : null;
    if (actualROI !== undefined) updateData.actualROI = actualROI ? parseFloat(actualROI) : null;
    if (roiNote !== undefined) updateData.roiNote = roiNote;
    if (progress !== undefined) updateData.progress = parseFloat(progress);

    const project = await prisma.innovationProject.update({
      where: { id },
      data: updateData,
      include: {
        manager: { select: { id: true, name: true, surname: true } },
        department: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(project);
  } catch (error) {
    console.error('Proje güncelleme hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// DELETE - Proje sil (sadece Admin)
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    if (session.user.role !== 'Admin') {
      return NextResponse.json({ error: 'Silme işlemi için Admin yetkisi gereklidir' }, { status: 403 });
    }

    const { id } = await context.params;

    await prisma.innovationProject.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ message: 'Proje silindi' });
  } catch (error) {
    console.error('Proje silme hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
