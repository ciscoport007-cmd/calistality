import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { createNotification } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

// GET - Dokümanın iş akışı durumunu getir
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id: documentId } = await params;

    // Dokümanın aktif iş akışı örneğini getir
    const instance = await prisma.workflowInstance.findUnique({
      where: { documentId },
      include: {
        workflow: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        startedBy: {
          select: { id: true, name: true, surname: true },
        },
        steps: {
          include: {
            step: {
              include: {
                position: { select: { id: true, name: true } },
                role: { select: { id: true, name: true } },
                specificUser: { select: { id: true, name: true, surname: true } },
              },
            },
            assignedUser: {
              select: { id: true, name: true, surname: true, email: true },
            },
            actionBy: {
              select: { id: true, name: true, surname: true },
            },
          },
          orderBy: { step: { stepOrder: 'asc' } },
        },
      },
    });

    if (!instance) {
      // Hiç iş akışı başlatılmamış, mevcut şablonları getir
      const document = await prisma.document.findUnique({
        where: { id: documentId },
        select: { documentTypeId: true, folderId: true, departmentId: true },
      });

      if (!document) {
        return NextResponse.json({ error: 'Doküman bulunamadı' }, { status: 404 });
      }

      // Uygun iş akışlarını bul
      const workflows = await prisma.documentWorkflow.findMany({
        where: {
          isActive: true,
          OR: [
            { documentTypeId: document.documentTypeId },
            { folderId: document.folderId },
            { departmentId: document.departmentId },
            { documentTypeId: null, folderId: null, departmentId: null }, // Genel
          ],
        },
        include: {
          steps: {
            include: {
              position: { select: { id: true, name: true } },
              role: { select: { id: true, name: true } },
            },
            orderBy: { stepOrder: 'asc' },
          },
        },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      });

      return NextResponse.json({
        instance: null,
        availableWorkflows: workflows,
      });
    }

    // Kullanıcının bu adımda onay yetkisi var mı kontrol et
    const currentStep = instance.steps.find(
      (s) => s.step.stepOrder === instance.currentStepOrder && s.status === 'AKTIF'
    );

    let canApprove = false;
    let canPublish = false;

    if (currentStep) {
      // Atanan kullanıcı mı?
      if (currentStep.assignedUserId === session.user.id) {
        canApprove = true;
        canPublish = currentStep.step.canPublish;
      }
    }

    return NextResponse.json({
      instance,
      currentStep,
      canApprove,
      canPublish,
    });
  } catch (error) {
    console.error('Error fetching workflow instance:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// POST - İş akışı başlat
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id: documentId } = await params;
    const body = await request.json();
    const { workflowId } = body;

    if (!workflowId) {
      return NextResponse.json(
        { error: 'İş akışı seçilmelidir' },
        { status: 400 }
      );
    }

    // Mevcut aktif instance kontrolü
    const existingInstance = await prisma.workflowInstance.findUnique({
      where: { documentId },
    });

    if (existingInstance && existingInstance.status === 'AKTIF') {
      return NextResponse.json(
        { error: 'Bu doküman için zaten aktif bir iş akışı var' },
        { status: 400 }
      );
    }

    // Eski instance varsa sil
    if (existingInstance) {
      await prisma.workflowInstance.delete({
        where: { id: existingInstance.id },
      });
    }

    // İş akışı ve adımlarını getir
    const workflow = await prisma.documentWorkflow.findUnique({
      where: { id: workflowId },
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' },
        },
      },
    });

    if (!workflow || !workflow.isActive) {
      return NextResponse.json(
        { error: 'Geçersiz veya pasif iş akışı' },
        { status: 400 }
      );
    }

    // Dokümanı getir
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: { department: true },
    });

    if (!document) {
      return NextResponse.json({ error: 'Doküman bulunamadı' }, { status: 404 });
    }

    // İş akışı örneği oluştur
    const instance = await prisma.workflowInstance.create({
      data: {
        workflowId,
        documentId,
        status: 'AKTIF',
        currentStepOrder: 1,
        startedById: session.user.id,
      },
    });

    // Her adım için instance step oluştur
    for (const step of workflow.steps) {
      // Onaylayacak kullanıcıyı belirle
      let assignedUserId: string | null = null;

      if (step.approverType === 'SPECIFIC_USER' && step.specificUserId) {
        assignedUserId = step.specificUserId;
      } else if (step.approverType === 'POSITION' && step.positionId) {
        // Pozisyona sahip kullanıcıyı bul (departman içinden öncelikli)
        const user = await prisma.user.findFirst({
          where: {
            positionId: step.positionId,
            isActive: true,
            ...(document.departmentId && {
              OR: [
                { departmentId: document.departmentId },
                { departmentId: null },
              ],
            }),
          },
        });
        assignedUserId = user?.id || null;
      } else if (step.approverType === 'ROLE' && step.roleId) {
        // Role sahip kullanıcıyı bul
        const user = await prisma.user.findFirst({
          where: {
            roleId: step.roleId,
            isActive: true,
          },
        });
        assignedUserId = user?.id || null;
      } else if (step.approverType === 'DEPARTMENT_HEAD' && document.departmentId) {
        // Departman müdürünü bul ("Müdür" pozisyonundaki)
        const deptHead = await prisma.user.findFirst({
          where: {
            departmentId: document.departmentId,
            isActive: true,
            position: {
              name: { contains: 'Müdür', mode: 'insensitive' },
            },
          },
        });
        assignedUserId = deptHead?.id || null;
      } else if (step.approverType === 'DOCUMENT_OWNER') {
        assignedUserId = document.createdById;
      }

      // Deadline hesapla
      let deadline: Date | null = null;
      if (step.deadlineDays) {
        deadline = new Date();
        deadline.setDate(deadline.getDate() + step.deadlineDays);
      }

      await prisma.workflowInstanceStep.create({
        data: {
          instanceId: instance.id,
          stepId: step.id,
          status: step.stepOrder === 1 ? 'AKTIF' : 'BEKLIYOR',
          assignedUserId,
          deadline,
        },
      });

      // İlk adım için bildirim gönder
      if (step.stepOrder === 1 && assignedUserId) {
        await createNotification({
          userId: assignedUserId,
          title: 'Doküman Onayı Bekliyor',
          message: `"${document.title}" dokümanı onayınızı bekliyor.`,
          type: 'BILGI',
          link: `/dashboard/documents/${documentId}`,
        });
      }
    }

    // Doküman durumunu güncelle
    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'ONAY_BEKLIYOR' },
    });

    // Güncel instance'i getir
    const updatedInstance = await prisma.workflowInstance.findUnique({
      where: { id: instance.id },
      include: {
        workflow: { select: { id: true, name: true, code: true } },
        startedBy: { select: { id: true, name: true, surname: true } },
        steps: {
          include: {
            step: {
              include: {
                position: { select: { id: true, name: true } },
                role: { select: { id: true, name: true } },
              },
            },
            assignedUser: { select: { id: true, name: true, surname: true } },
          },
          orderBy: { step: { stepOrder: 'asc' } },
        },
      },
    });

    return NextResponse.json(updatedInstance, { status: 201 });
  } catch (error) {
    console.error('Error starting workflow:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// PUT - Adımı onayla/reddet
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id: documentId } = await params;
    const body = await request.json();
    const { action, comments, publish } = body; // action: 'approve' | 'reject' | 'skip'

    if (!action || !['approve', 'reject', 'skip'].includes(action)) {
      return NextResponse.json(
        { error: 'Geçersiz işlem' },
        { status: 400 }
      );
    }

    // Aktif instance'i getir
    const instance = await prisma.workflowInstance.findUnique({
      where: { documentId },
      include: {
        workflow: {
          include: {
            steps: { orderBy: { stepOrder: 'asc' } },
          },
        },
        steps: {
          include: {
            step: true,
          },
          orderBy: { step: { stepOrder: 'asc' } },
        },
      },
    });

    if (!instance || instance.status !== 'AKTIF') {
      return NextResponse.json(
        { error: 'Aktif iş akışı bulunamadı' },
        { status: 400 }
      );
    }

    // Mevcut adımı bul
    const currentInstanceStep = instance.steps.find(
      (s) => s.step.stepOrder === instance.currentStepOrder && s.status === 'AKTIF'
    );

    if (!currentInstanceStep) {
      return NextResponse.json(
        { error: 'Aktif adım bulunamadı' },
        { status: 400 }
      );
    }

    // Yetki kontrolü
    if (currentInstanceStep.assignedUserId !== session.user.id) {
      // Admin değilse izin verme
      const userRole = session.user.role;
      if (userRole !== 'admin' && userRole !== 'Admin') {
        return NextResponse.json(
          { error: 'Bu adımı onaylama yetkiniz yok' },
          { status: 403 }
        );
      }
    }

    // Dokümanı getir
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      return NextResponse.json({ error: 'Doküman bulunamadı' }, { status: 404 });
    }

    // Adımı güncelle
    const stepStatus = action === 'approve' ? 'ONAYLANDI' : action === 'reject' ? 'REDDEDILDI' : 'ATLANDI';

    await prisma.workflowInstanceStep.update({
      where: { id: currentInstanceStep.id },
      data: {
        status: stepStatus,
        actionById: session.user.id,
        actionAt: new Date(),
        comments: comments || null,
      },
    });

    // Sonraki adımı belirle
    const totalSteps = instance.workflow.steps.length;
    const isLastStep = instance.currentStepOrder >= totalSteps;

    if (action === 'reject') {
      // Reddedildi - iş akışını bitir
      await prisma.workflowInstance.update({
        where: { id: instance.id },
        data: {
          status: 'REDDEDILDI',
          completedAt: new Date(),
        },
      });

      // Dokümanı taslak durumuna getir
      await prisma.document.update({
        where: { id: documentId },
        data: { status: 'TASLAK' },
      });

      // Doküman sahibine bildirim
      await createNotification({
        userId: document.createdById,
        title: 'Doküman Reddedildi',
        message: `"${document.title}" dokümanı onay sürecinde reddedildi. Sebep: ${comments || 'Belirtilmedi'}`,
        type: 'BILGI',
        link: `/dashboard/documents/${documentId}`,
      });
    } else if (isLastStep || (action === 'approve' && currentInstanceStep.step.canPublish && publish)) {
      // Son adım veya yayınlama adımı
      await prisma.workflowInstance.update({
        where: { id: instance.id },
        data: {
          status: 'TAMAMLANDI',
          completedAt: new Date(),
        },
      });

      // Erken tamamlanma durumunda (canPublish ile son adım değilse) kalan adımları atla
      if (!isLastStep) {
        const remainingSteps = instance.steps.filter(
          (s) => s.step.stepOrder > instance.currentStepOrder && s.status === 'BEKLIYOR'
        );
        for (const remaining of remainingSteps) {
          await prisma.workflowInstanceStep.update({
            where: { id: remaining.id },
            data: { status: 'ATLANDI' },
          });
        }
      }

      // Yayınlama yapılsın mı?
      if (publish && currentInstanceStep.step.canPublish) {
        await prisma.document.update({
          where: { id: documentId },
          data: {
            status: 'YAYINDA',
            approvedById: session.user.id,
            approvedAt: new Date(),
            publishedAt: new Date(),
          },
        });

        // Doküman sahibine bildirim
        await createNotification({
          userId: document.createdById,
          title: 'Doküman Yayınlandı',
          message: `"${document.title}" dokümanı onaylandı ve yayınlandı.`,
          type: 'BILGI',
          link: `/dashboard/documents/${documentId}`,
        });
      } else {
        await prisma.document.update({
          where: { id: documentId },
          data: {
            status: 'ONAYLANDI',
            approvedById: session.user.id,
            approvedAt: new Date(),
          },
        });

        // Doküman sahibine bildirim
        await createNotification({
          userId: document.createdById,
          title: 'Doküman Onaylandı',
          message: `"${document.title}" dokümanı tüm onay adımlarını tamamladı.`,
          type: 'BILGI',
          link: `/dashboard/documents/${documentId}`,
        });
      }
    } else {
      // Sonraki adıma geç
      const nextStepOrder = instance.currentStepOrder + 1;
      const nextInstanceStep = instance.steps.find(
        (s) => s.step.stepOrder === nextStepOrder
      );

      if (nextInstanceStep) {
        // Sonraki adımı aktif et
        await prisma.workflowInstanceStep.update({
          where: { id: nextInstanceStep.id },
          data: { status: 'AKTIF' },
        });

        // Instance'i güncelle
        await prisma.workflowInstance.update({
          where: { id: instance.id },
          data: { currentStepOrder: nextStepOrder },
        });

        // Doküman sahibine adım onaylandı bildirimi gönder
        if (document.createdById && document.createdById !== session.user.id) {
          await createNotification({
            userId: document.createdById,
            title: 'Doküman Adımı Onaylandı',
            message: `"${document.title}" dokümanı ${currentInstanceStep.step.name || 'Adım ' + instance.currentStepOrder} aşamasında onaylandı. Sonraki adıma geçildi.`,
            type: 'BILGI',
            link: `/dashboard/documents/${documentId}`,
          });
        }

        // Sonraki onaylayan kullanıcıya bildirim
        if (nextInstanceStep.assignedUserId) {
          await createNotification({
            userId: nextInstanceStep.assignedUserId,
            title: 'Doküman Onayı Bekliyor',
            message: `"${document.title}" dokümanı onayınızı bekliyor.`,
            type: 'BILGI',
            link: `/dashboard/documents/${documentId}`,
          });
        }
      }
    }

    // Güncel durumu dön
    const updatedInstance = await prisma.workflowInstance.findUnique({
      where: { id: instance.id },
      include: {
        workflow: { select: { id: true, name: true, code: true } },
        startedBy: { select: { id: true, name: true, surname: true } },
        steps: {
          include: {
            step: {
              include: {
                position: { select: { id: true, name: true } },
                role: { select: { id: true, name: true } },
              },
            },
            assignedUser: { select: { id: true, name: true, surname: true } },
            actionBy: { select: { id: true, name: true, surname: true } },
          },
          orderBy: { step: { stepOrder: 'asc' } },
        },
      },
    });

    return NextResponse.json(updatedInstance);
  } catch (error) {
    console.error('Error processing workflow action:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// DELETE - İş akışını iptal et
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id: documentId } = await params;

    const instance = await prisma.workflowInstance.findUnique({
      where: { documentId },
    });

    if (!instance) {
      return NextResponse.json(
        { error: 'İş akışı bulunamadı' },
        { status: 404 }
      );
    }

    if (instance.status !== 'AKTIF') {
      return NextResponse.json(
        { error: 'Sadece aktif iş akışları iptal edilebilir' },
        { status: 400 }
      );
    }

    // İptal et
    await prisma.workflowInstance.update({
      where: { id: instance.id },
      data: {
        status: 'IPTAL',
        completedAt: new Date(),
      },
    });

    // Dokümanı taslak durumuna getir
    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'TASLAK' },
    });

    return NextResponse.json({ message: 'İş akışı iptal edildi' });
  } catch (error) {
    console.error('Error cancelling workflow:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
