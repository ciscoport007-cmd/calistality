import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Checklist listesi
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await params;

    const checklists = await prisma.auditChecklist.findMany({
      where: { auditId: id },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json(checklists);
  } catch (error) {
    console.error('Checklist listesi hatası:', error);
    return NextResponse.json({ error: 'Checklist yüklenirken hata oluştu' }, { status: 500 });
  }
}

// Yeni checklist öğesi oluştur
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id: auditId } = await params;
    const body = await request.json();

    // Toplu ekleme desteği
    if (Array.isArray(body)) {
      const items = body.map((item, index) => ({
        auditId,
        category: item.category || null,
        question: item.question,
        expected: item.expected || null,
        sortOrder: item.sortOrder ?? index,
      }));

      await prisma.auditChecklist.createMany({
        data: items,
      });

      const checklists = await prisma.auditChecklist.findMany({
        where: { auditId },
        orderBy: { sortOrder: 'asc' },
      });

      return NextResponse.json(checklists, { status: 201 });
    }

    // Tekli ekleme
    const { category, question, expected, sortOrder } = body;

    if (!question) {
      return NextResponse.json(
        { error: 'Soru zorunludur' },
        { status: 400 }
      );
    }

    const maxSortOrder = await prisma.auditChecklist.aggregate({
      where: { auditId },
      _max: { sortOrder: true },
    });

    const checklist = await prisma.auditChecklist.create({
      data: {
        auditId,
        category,
        question,
        expected,
        sortOrder: sortOrder ?? ((maxSortOrder._max.sortOrder ?? -1) + 1),
      },
    });

    return NextResponse.json(checklist, { status: 201 });
  } catch (error) {
    console.error('Checklist oluşturma hatası:', error);
    return NextResponse.json({ error: 'Checklist oluşturulurken hata oluştu' }, { status: 500 });
  }
}

// Checklist güncelle
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const body = await request.json();
    const { checklistId, ...updateData } = body;

    if (!checklistId) {
      return NextResponse.json({ error: 'Checklist ID zorunludur' }, { status: 400 });
    }

    const existingChecklist = await prisma.auditChecklist.findUnique({
      where: { id: checklistId },
    });

    if (!existingChecklist) {
      return NextResponse.json({ error: 'Checklist bulunamadı' }, { status: 404 });
    }

    const {
      category,
      question,
      expected,
      actual,
      result,
      notes,
      evidences,
      sortOrder,
      isCompleted,
    } = updateData;

    const checklist = await prisma.auditChecklist.update({
      where: { id: checklistId },
      data: {
        category: category !== undefined ? category : existingChecklist.category,
        question: question ?? existingChecklist.question,
        expected: expected !== undefined ? expected : existingChecklist.expected,
        actual: actual !== undefined ? actual : existingChecklist.actual,
        result: result !== undefined ? result : existingChecklist.result,
        notes: notes !== undefined ? notes : existingChecklist.notes,
        evidences: evidences !== undefined ? evidences : existingChecklist.evidences,
        sortOrder: sortOrder !== undefined ? sortOrder : existingChecklist.sortOrder,
        isCompleted: isCompleted !== undefined ? isCompleted : existingChecklist.isCompleted,
        completedAt: isCompleted === true && !existingChecklist.isCompleted ? new Date() : existingChecklist.completedAt,
      },
    });

    return NextResponse.json(checklist);
  } catch (error) {
    console.error('Checklist güncelleme hatası:', error);
    return NextResponse.json({ error: 'Checklist güncellenirken hata oluştu' }, { status: 500 });
  }
}

// Checklist sil
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const checklistId = searchParams.get('checklistId');

    if (!checklistId) {
      return NextResponse.json({ error: 'Checklist ID zorunludur' }, { status: 400 });
    }

    await prisma.auditChecklist.delete({
      where: { id: checklistId },
    });

    return NextResponse.json({ message: 'Checklist silindi' });
  } catch (error) {
    console.error('Checklist silme hatası:', error);
    return NextResponse.json({ error: 'Checklist silinirken hata oluştu' }, { status: 500 });
  }
}
