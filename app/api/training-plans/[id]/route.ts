import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth-options';

// GET: Eğitim planı detayı
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

    const plan = await prisma.trainingPlan.findUnique({
      where: { id },
      include: {
        training: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
            method: true,
            durationMinutes: true,
            objectives: true,
            content: true,
            hasExam: true,
            passingScore: true,
            hasCertificate: true,
          },
        },
        instructor: { select: { id: true, name: true, surname: true, email: true } },
        department: { select: { id: true, name: true, code: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
        records: {
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
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!plan) {
      return NextResponse.json({ error: 'Eğitim planı bulunamadı' }, { status: 404 });
    }

    // İstatistikleri hesapla
    const stats = {
      totalParticipants: plan.records.length,
      attended: plan.records.filter(r => r.attended).length,
      passed: plan.records.filter(r => r.isPassed === true).length,
      failed: plan.records.filter(r => r.isPassed === false).length,
      avgScore: plan.records.filter(r => r.examScore).reduce((sum, r) => sum + Number(r.examScore || 0), 0) / (plan.records.filter(r => r.examScore).length || 1),
      avgSatisfaction: plan.records.filter(r => r.satisfactionScore).reduce((sum, r) => sum + (r.satisfactionScore || 0), 0) / (plan.records.filter(r => r.satisfactionScore).length || 1),
    };

    return NextResponse.json({ ...plan, stats });
  } catch (error) {
    console.error('Error fetching training plan:', error);
    return NextResponse.json(
      { error: 'Eğitim planı alınırken hata oluştu' },
      { status: 500 }
    );
  }
}

// PATCH: Eğitim planı güncelle
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

    const updateData: any = { ...body };

    if (body.plannedDate) {
      updateData.plannedDate = new Date(body.plannedDate);
    }
    if (body.actualDate) {
      updateData.actualDate = new Date(body.actualDate);
    }
    if (body.cost !== undefined) {
      updateData.cost = body.cost ? parseFloat(body.cost) : null;
    }
    if (body.evaluationScore !== undefined) {
      updateData.evaluationScore = body.evaluationScore ? parseFloat(body.evaluationScore) : null;
    }

    const plan = await prisma.trainingPlan.update({
      where: { id },
      data: updateData,
      include: {
        training: { select: { id: true, code: true, name: true } },
        instructor: { select: { id: true, name: true, surname: true } },
        department: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(plan);
  } catch (error) {
    console.error('Error updating training plan:', error);
    return NextResponse.json(
      { error: 'Eğitim planı güncellenirken hata oluştu' },
      { status: 500 }
    );
  }
}

// DELETE: Eğitim planı sil
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

    await prisma.trainingPlan.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Eğitim planı silindi' });
  } catch (error) {
    console.error('Error deleting training plan:', error);
    return NextResponse.json(
      { error: 'Eğitim planı silinirken hata oluştu' },
      { status: 500 }
    );
  }
}
