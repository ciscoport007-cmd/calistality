import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { createNotification } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

// Şikayete ait görevleri listele
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await params;

    const tasks = await prisma.complaintTask.findMany({
      where: { complaintId: id },
      include: {
        assignee: {
          select: { id: true, name: true, surname: true, email: true },
        },
        createdBy: {
          select: { id: true, name: true, surname: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Görev listesi hatası:', error);
    return NextResponse.json({ error: 'Görevler alınamadı' }, { status: 500 });
  }
}

// Yeni görev oluştur
export async function POST(
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
    const { title, description, assigneeId, priority, dueDate } = body;

    if (!title || !assigneeId) {
      return NextResponse.json(
        { error: 'Görev başlığı ve atanan kişi zorunludur' },
        { status: 400 }
      );
    }

    // Şikayetin varlığını kontrol et
    const complaint = await prisma.complaint.findUnique({ where: { id } });
    if (!complaint) {
      return NextResponse.json({ error: 'Şikayet bulunamadı' }, { status: 404 });
    }

    const task = await prisma.complaintTask.create({
      data: {
        complaintId: id,
        title,
        description,
        assigneeId,
        priority: priority || 'ORTA',
        dueDate: dueDate ? new Date(dueDate) : null,
        createdById: session.user.id,
      },
      include: {
        assignee: {
          select: { id: true, name: true, surname: true, email: true },
        },
        createdBy: {
          select: { id: true, name: true, surname: true },
        },
      },
    });

    // Geçmiş kaydı oluştur
    await prisma.complaintHistory.create({
      data: {
        complaintId: id,
        userId: session.user.id,
        action: 'GOREV_EKLENDI',
        newValue: title,
        comments: `Görev oluşturuldu: ${title}`,
      },
    });

    // Atanan kişiye bildirim gönder
    if (assigneeId && assigneeId !== session.user.id) {
      await createNotification({
        userId: assigneeId,
        title: 'Şikayet Görevi Atandı',
        message: `${complaint.code} kodlu şikayet için "${title}" başlıklı görev size atandı.`,
        type: 'BILGI',
        link: `/dashboard/complaints/${id}`,
      });
    }

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('Görev oluşturma hatası:', error);
    return NextResponse.json({ error: 'Görev oluşturulamadı' }, { status: 500 });
  }
}

// Görev güncelle
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id: complaintId } = await params;
    const body = await request.json();
    const { taskId, title, description, status, priority, dueDate, assigneeId } = body;

    if (!taskId) {
      return NextResponse.json({ error: 'Görev ID zorunludur' }, { status: 400 });
    }

    // Mevcut görevi al
    const existingTask = await prisma.complaintTask.findUnique({
      where: { id: taskId },
      select: { assigneeId: true, title: true, createdById: true },
    });

    const updateData: Record<string, unknown> = {};

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) {
      updateData.status = status;
      if (status === 'TAMAMLANDI') {
        updateData.completedAt = new Date();
      }
    }
    if (priority !== undefined) updateData.priority = priority;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (assigneeId !== undefined) updateData.assigneeId = assigneeId;

    const task = await prisma.complaintTask.update({
      where: { id: taskId, complaintId },
      data: updateData,
      include: {
        assignee: {
          select: { id: true, name: true, surname: true, email: true },
        },
        createdBy: {
          select: { id: true, name: true, surname: true },
        },
      },
    });

    // Atanan kişi değişti ise bildirim gönder
    if (assigneeId && assigneeId !== existingTask?.assigneeId && assigneeId !== session.user.id) {
      const complaint = await prisma.complaint.findUnique({ where: { id: complaintId }, select: { code: true } });
      await createNotification({
        userId: assigneeId,
        title: 'Şikayet Görevi Atandı',
        message: `${complaint?.code || ''} kodlu şikayet için "${task.title}" başlıklı görev size atandı.`,
        type: 'BILGI',
        link: `/dashboard/complaints/${complaintId}`,
      });
    }

    // Görev tamamlandıysa oluşturan kişiye bildirim
    if (status === 'TAMAMLANDI' && existingTask?.createdById && existingTask.createdById !== session.user.id) {
      const complaint = await prisma.complaint.findUnique({ where: { id: complaintId }, select: { code: true } });
      await createNotification({
        userId: existingTask.createdById,
        title: 'Şikayet Görevi Tamamlandı',
        message: `${complaint?.code || ''} kodlu şikayet için "${task.title}" başlıklı görev tamamlandı.`,
        type: 'BASARI',
        link: `/dashboard/complaints/${complaintId}`,
      });
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error('Görev güncelleme hatası:', error);
    return NextResponse.json({ error: 'Görev güncellenemedi' }, { status: 500 });
  }
}
