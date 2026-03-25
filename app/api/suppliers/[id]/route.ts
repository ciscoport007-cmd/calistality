import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { createNotification } from '@/lib/notifications';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const supplier = await prisma.supplier.findUnique({
      where: { id: params.id },
      include: {
        category: true,
        createdBy: { select: { id: true, name: true, surname: true, email: true } },
        approvedBy: { select: { id: true, name: true, surname: true, email: true } },
        contacts: {
          where: { isActive: true },
          orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }]
        },
        evaluations: {
          orderBy: { evaluationDate: 'desc' },
          take: 10,
          include: {
            evaluatedBy: { select: { id: true, name: true, surname: true } }
          }
        },
        documents: {
          orderBy: { createdAt: 'desc' },
          include: {
            uploadedBy: { select: { id: true, name: true, surname: true } }
          }
        },
        history: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            user: { select: { id: true, name: true, surname: true } }
          }
        },
        audits: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          include: {
            leadAuditor: { select: { id: true, name: true, surname: true } },
            createdBy: { select: { id: true, name: true, surname: true } },
            _count: {
              select: {
                findings: true,
                checklists: true
              }
            }
          }
        },
        expenses: {
          orderBy: { date: 'desc' },
          include: {
            createdBy: { select: { id: true, name: true, surname: true } }
          }
        },
        _count: {
          select: {
            contacts: true,
            evaluations: true,
            documents: true,
            audits: true,
            expenses: true
          }
        }
      }
    });

    if (!supplier) {
      return NextResponse.json(
        { error: 'Tedarikçi bulunamadı' },
        { status: 404 }
      );
    }

    // Toplam harcama hesapla
    const totalExpense = supplier.expenses.reduce((sum, exp) => sum + exp.amount, 0);

    return NextResponse.json({ ...supplier, totalExpense });
  } catch (error) {
    console.error('Supplier fetch error:', error);
    return NextResponse.json(
      { error: 'Tedarikçi alınamadı' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const body = await request.json();
    const currentSupplier = await prisma.supplier.findUnique({
      where: { id: params.id }
    });

    if (!currentSupplier) {
      return NextResponse.json(
        { error: 'Tedarikçi bulunamadı' },
        { status: 404 }
      );
    }

    // Track status changes for history
    const statusChanged = body.status && body.status !== currentSupplier.status;
    const oldStatus = currentSupplier.status;
    
    // Track subcontractor changes
    const subcontractorChanged = body.isSubcontractor !== undefined && 
                                  body.isSubcontractor !== currentSupplier.isSubcontractor;
    const becameSubcontractor = subcontractorChanged && body.isSubcontractor === true;

    // Set subcontractor timestamp if newly marked
    if (becameSubcontractor) {
      body.subcontractorAddedAt = new Date();
    }

    // Handle approval
    if (body.status === 'ONAYLANDI' && currentSupplier.status !== 'ONAYLANDI') {
      body.approvalDate = new Date();
      body.approvedById = session.user.id;
    }

    // Recalculate next evaluation date if period changed
    if (body.evaluationPeriod && body.evaluationPeriod !== currentSupplier.evaluationPeriod) {
      const evaluationMonths: Record<string, number> = {
        'AYLIK': 1,
        'UCAYLIK': 3,
        'ALTIAYLIK': 6,
        'YILLIK': 12
      };
      const nextDate = new Date();
      nextDate.setMonth(nextDate.getMonth() + (evaluationMonths[body.evaluationPeriod] || 12));
      body.nextEvaluationDate = nextDate;
    }

    const supplier = await prisma.supplier.update({
      where: { id: params.id },
      data: body,
      include: {
        category: true,
        createdBy: { select: { id: true, name: true, surname: true } },
        approvedBy: { select: { id: true, name: true, surname: true } }
      }
    });

    // Create history entry
    let action = 'GUNCELLENDI';
    let comments = 'Tedarikçi bilgileri güncellendi';

    if (statusChanged) {
      switch (body.status) {
        case 'ONAYLANDI':
          action = 'ONAYLANDI';
          comments = `Tedarikçi onaylandı`;
          break;
        case 'ASKIYA_ALINDI':
          action = 'ASKIYA_ALINDI';
          comments = `Tedarikçi askıya alındı`;
          break;
        case 'KARA_LISTE':
          action = 'KARA_LISTEYE_ALINDI';
          comments = `Tedarikçi kara listeye alındı`;
          break;
      }
    }

    await prisma.supplierHistory.create({
      data: {
        supplierId: supplier.id,
        userId: session.user.id,
        action,
        oldValue: statusChanged ? JSON.stringify({ status: oldStatus }) : null,
        newValue: statusChanged ? JSON.stringify({ status: body.status }) : null,
        comments
      }
    });

    // Taşeron olarak yeni işaretlendiyse Kalite Müdürüne bildirim gönder
    if (becameSubcontractor) {
      // Kalite Müdürü rolündeki kullanıcıları bul
      const qualityManagers = await prisma.user.findMany({
        where: {
          isActive: true,
          role: {
            name: {
              in: ['Kalite Müdürü', 'Kalite Yöneticisi', 'Quality Manager']
            }
          }
        }
      });

      for (const manager of qualityManagers) {
        await createNotification({
          userId: manager.id,
          type: 'UYARI',
          title: 'Firma Taşeron Olarak İşaretlendi',
          message: `"${supplier.name}" taşeron olarak işaretlendi, İSG süreçleri takip edilmeli.`,
          link: `/dashboard/ohs/subcontractors`
        });
      }

      // History kaydı ekle
      await prisma.supplierHistory.create({
        data: {
          supplierId: supplier.id,
          userId: session.user.id,
          action: 'TASERON_ISARETLENDI',
          comments: `${supplier.name} taşeron olarak işaretlendi`
        }
      });
    }

    return NextResponse.json(supplier);
  } catch (error) {
    console.error('Supplier update error:', error);
    return NextResponse.json(
      { error: 'Tedarikçi güncellenemedi' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const supplier = await prisma.supplier.findUnique({
      where: { id: params.id }
    });

    if (!supplier) {
      return NextResponse.json(
        { error: 'Tedarikçi bulunamadı' },
        { status: 404 }
      );
    }

    // Soft delete
    await prisma.supplier.update({
      where: { id: params.id },
      data: { isActive: false }
    });

    await prisma.supplierHistory.create({
      data: {
        supplierId: params.id,
        userId: session.user.id,
        action: 'SILINDI',
        comments: `${supplier.name} tedarikçisi silindi`
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Supplier delete error:', error);
    return NextResponse.json(
      { error: 'Tedarikçi silinemedi' },
      { status: 500 }
    );
  }
}
