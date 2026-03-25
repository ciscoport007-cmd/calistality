import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    // İstatistikleri topla
    const [
      totalUsers,
      totalDocuments,
      pendingApprovals,
      publishedDocuments,
      documentsByStatus,
      // Şikayet istatistikleri
      totalComplaints,
      newComplaints,
      inProgressComplaints,
      resolvedComplaints,
      complaintsByStatus,
      complaintsByPriority,
      // CAPA istatistikleri
      totalCAPAs,
      openCAPAs,
      inProgressCAPAs,
      closedCAPAs,
      capasByStatus,
      capasByType,
      // Denetim istatistikleri
      totalAudits,
      plannedAudits,
      inProgressAudits,
      completedAudits,
      auditsByStatus,
      auditsByType,
      totalFindings,
      openFindings,
      // Risk istatistikleri
      totalRisks,
      criticalRisks,
      veryHighRisks,
      highRisks,
      risksInAction,
      risksByStatus,
      risksByLevel,
      // Ekipman istatistikleri
      totalEquipment,
      activeEquipment,
      maintenancePending,
      calibrationPending,
      faultyEquipment,
      equipmentByStatus,
      // Tedarikçi istatistikleri
      totalSuppliers,
      approvedSuppliers,
      pendingSuppliers,
      suspendedSuppliers,
      evaluationsDue,
      // KPI istatistikleri
      totalKPIs,
      activeKPIs,
      onTargetKPIs,
      warningKPIs,
      criticalKPIs,
    ] = await Promise.all([
      prisma.user.count({ where: { isActive: true } }),
      prisma.document.count(),
      prisma.approval.count({ where: { status: 'BEKLIYOR' } }),
      prisma.document.count({ where: { status: 'YAYINDA' } }),
      prisma.document.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      // Şikayet istatistikleri
      prisma.complaint.count({ where: { isActive: true } }),
      prisma.complaint.count({ where: { isActive: true, status: 'YENI' } }),
      prisma.complaint.count({ where: { isActive: true, status: 'INCELENIYOR' } }),
      prisma.complaint.count({ where: { isActive: true, status: 'COZULDU' } }),
      prisma.complaint.groupBy({
        by: ['status'],
        where: { isActive: true },
        _count: { id: true },
      }),
      prisma.complaint.groupBy({
        by: ['priority'],
        where: { isActive: true },
        _count: { id: true },
      }),
      // CAPA istatistikleri
      prisma.cAPA.count({ where: { isActive: true } }),
      prisma.cAPA.count({ where: { isActive: true, status: 'ACIK' } }),
      prisma.cAPA.count({ where: { isActive: true, status: { in: ['KOK_NEDEN_ANALIZI', 'AKSIYON_PLANLAMA', 'UYGULAMA', 'DOGRULAMA'] } } }),
      prisma.cAPA.count({ where: { isActive: true, status: 'KAPATILDI' } }),
      prisma.cAPA.groupBy({
        by: ['status'],
        where: { isActive: true },
        _count: { id: true },
      }),
      prisma.cAPA.groupBy({
        by: ['type'],
        where: { isActive: true },
        _count: { id: true },
      }),
      // Denetim istatistikleri
      prisma.audit.count({ where: { isActive: true } }),
      prisma.audit.count({ where: { isActive: true, status: 'PLANLI' } }),
      prisma.audit.count({ where: { isActive: true, status: { in: ['HAZIRLANIYOR', 'DEVAM_EDIYOR', 'RAPORLANIYOR'] } } }),
      prisma.audit.count({ where: { isActive: true, status: 'KAPATILDI' } }),
      prisma.audit.groupBy({
        by: ['status'],
        where: { isActive: true },
        _count: { id: true },
      }),
      prisma.audit.groupBy({
        by: ['type'],
        where: { isActive: true },
        _count: { id: true },
      }),
      prisma.auditFinding.count(),
      prisma.auditFinding.count({ where: { status: { in: ['ACIK', 'AKSIYON_BEKLENIYOR'] } } }),
      // Risk istatistikleri
      prisma.risk.count({ where: { isDeleted: false } }),
      prisma.risk.count({ where: { isDeleted: false, currentLevel: 'KRITIK' } }),
      prisma.risk.count({ where: { isDeleted: false, currentLevel: 'COK_YUKSEK' } }),
      prisma.risk.count({ where: { isDeleted: false, currentLevel: 'YUKSEK' } }),
      prisma.risk.count({ where: { isDeleted: false, status: 'AKSIYONDA' } }),
      prisma.risk.groupBy({
        by: ['status'],
        where: { isDeleted: false },
        _count: { id: true },
      }),
      prisma.risk.groupBy({
        by: ['currentLevel'],
        where: { isDeleted: false },
        _count: { id: true },
      }),
      // Ekipman istatistikleri
      prisma.equipment.count({ where: { isActive: true } }),
      prisma.equipment.count({ where: { isActive: true, status: 'AKTIF' } }),
      prisma.equipment.count({ where: { isActive: true, status: { in: ['BAKIM_BEKLIYOR', 'BAKIMDA'] } } }),
      prisma.equipment.count({ where: { isActive: true, status: { in: ['KALIBRASYON_BEKLIYOR', 'KALIBRASYONDA'] } } }),
      prisma.equipment.count({ where: { isActive: true, status: 'ARIZALI' } }),
      prisma.equipment.groupBy({
        by: ['status'],
        where: { isActive: true },
        _count: { id: true },
      }),
      // Tedarikçi istatistikleri
      prisma.supplier.count({ where: { isActive: true } }),
      prisma.supplier.count({ where: { isActive: true, status: 'ONAYLANDI' } }),
      prisma.supplier.count({ where: { isActive: true, status: { in: ['ADAY', 'DEGERLENDIRMEDE'] } } }),
      prisma.supplier.count({ where: { isActive: true, status: 'ASKIYA_ALINDI' } }),
      prisma.supplier.count({ where: { isActive: true, nextEvaluationDate: { lte: new Date() } } }),
      // KPI istatistikleri
      prisma.kPI.count({ where: { isActive: true } }),
      prisma.kPI.count({ where: { isActive: true, status: 'AKTIF' } }),
      prisma.kPI.count({ where: { isActive: true, currentPerformance: { gte: 100 } } }),
      prisma.kPI.count({ where: { isActive: true, currentPerformance: { gte: 60, lt: 80 } } }),
      prisma.kPI.count({ where: { isActive: true, currentPerformance: { lt: 60 } } }),
    ]);

    // Son dokümanlar
    const recentDocuments = await prisma.document.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: {
          select: {
            name: true,
            surname: true,
          },
        },
        folder: true,
      },
    });

    // Bekleyen onaylar - Eski Approval sistemi
    const oldApprovals = await prisma.approval.findMany({
      where: {
        approverId: session?.user?.id,
        status: 'BEKLIYOR',
      },
      include: {
        document: {
          include: {
            createdBy: {
              select: {
                name: true,
                surname: true,
              },
            },
          },
        },
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
    });

    // Bekleyen onaylar - Yeni Workflow sistemi (WorkflowInstanceStep)
    const workflowApprovals = await prisma.workflowInstanceStep.findMany({
      where: {
        assignedUserId: session?.user?.id,
        status: 'AKTIF',
      },
      include: {
        instance: {
          include: {
            document: {
              include: {
                createdBy: {
                  select: {
                    name: true,
                    surname: true,
                  },
                },
              },
            },
          },
        },
        step: {
          select: {
            name: true,
          },
        },
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
    });

    // Her iki sistemi birleştir
    const myPendingApprovals = [
      // Eski sistem onayları
      ...oldApprovals.map(a => ({
        id: a.id,
        document: a.document,
        type: 'approval' as const,
        createdAt: a.createdAt,
      })),
      // Workflow sistemi onayları
      ...workflowApprovals.map(w => ({
        id: w.id,
        document: w.instance?.document,
        type: 'workflow' as const,
        stepName: w.step?.name,
        createdAt: w.createdAt,
      })),
    ].slice(0, 10);

    // Okunması gereken dokümanlar (Acknowledgments)
    const myPendingAcknowledgments = await prisma.documentAcknowledgment.findMany({
      where: {
        userId: session?.user?.id,
        status: 'BEKLIYOR',
      },
      include: {
        document: {
          include: {
            createdBy: {
              select: {
                name: true,
                surname: true,
              },
            },
          },
        },
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
    });

    // Görüş bekleyen dokümanlar (Reviews)
    const myPendingReviews = await prisma.documentReview.findMany({
      where: {
        reviewerId: session?.user?.id,
        status: 'BEKLIYOR',
      },
      include: {
        document: {
          include: {
            createdBy: {
              select: {
                name: true,
                surname: true,
              },
            },
          },
        },
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
    });

    // Son şikayetler
    const recentComplaints = await prisma.complaint.findMany({
      where: { isActive: true },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        category: true,
        createdBy: {
          select: {
            name: true,
            surname: true,
          },
        },
        assignedUser: {
          select: {
            name: true,
            surname: true,
          },
        },
      },
    });

    // Acil şikayetler
    const urgentComplaints = await prisma.complaint.findMany({
      where: {
        isActive: true,
        priority: 'ACIL',
        status: { notIn: ['COZULDU', 'KAPATILDI', 'IPTAL_EDILDI'] },
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        category: true,
        assignedUser: {
          select: {
            name: true,
            surname: true,
          },
        },
      },
    });

    // Son CAPA'lar
    const recentCAPAs = await prisma.cAPA.findMany({
      where: { isActive: true },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        responsibleUser: {
          select: {
            name: true,
            surname: true,
          },
        },
        department: {
          select: {
            name: true,
          },
        },
      },
    });

    // Kritik CAPA'lar
    const criticalCAPAs = await prisma.cAPA.findMany({
      where: {
        isActive: true,
        priority: 'KRITIK',
        status: { notIn: ['KAPATILDI', 'IPTAL_EDILDI'] },
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        responsibleUser: {
          select: {
            name: true,
            surname: true,
          },
        },
      },
    });

    // Son denetimler
    const recentAudits = await prisma.audit.findMany({
      where: { isActive: true },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        leadAuditor: {
          select: {
            name: true,
            surname: true,
          },
        },
        auditedDepartment: {
          select: {
            name: true,
          },
        },
      },
    });

    // Major bulgular
    const majorFindings = await prisma.auditFinding.findMany({
      where: {
        severity: 'MAJOR',
        status: { notIn: ['KAPATILDI'] },
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        audit: {
          select: {
            code: true,
            title: true,
          },
        },
        assignee: {
          select: {
            name: true,
            surname: true,
          },
        },
      },
    });

    // Son riskler
    const recentRisks = await prisma.risk.findMany({
      where: { isDeleted: false },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        owner: {
          select: {
            name: true,
            surname: true,
          },
        },
        department: {
          select: {
            name: true,
          },
        },
        category: {
          select: {
            name: true,
          },
        },
      },
    });

    // Kritik riskler
    const criticalRisksList = await prisma.risk.findMany({
      where: {
        isDeleted: false,
        currentLevel: { in: ['KRITIK', 'COK_YUKSEK'] },
        status: { notIn: ['KAPATILDI', 'KABUL_EDILDI'] },
      },
      take: 5,
      orderBy: [{ currentLevel: 'desc' }, { createdAt: 'desc' }],
      include: {
        owner: {
          select: {
            name: true,
            surname: true,
          },
        },
        department: {
          select: {
            name: true,
          },
        },
      },
    });

    // Son ekipmanlar
    const recentEquipment = await prisma.equipment.findMany({
      where: { isActive: true },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        category: {
          select: {
            name: true,
            color: true,
          },
        },
        department: {
          select: {
            name: true,
          },
        },
        owner: {
          select: {
            name: true,
            surname: true,
          },
        },
      },
    });

    // Bakım/kalibrasyon bekleyen ekipmanlar
    const pendingEquipment = await prisma.equipment.findMany({
      where: {
        isActive: true,
        status: { in: ['BAKIM_BEKLIYOR', 'KALIBRASYON_BEKLIYOR', 'ARIZALI'] },
      },
      take: 5,
      orderBy: { updatedAt: 'desc' },
      include: {
        category: true,
        department: true,
      },
    });

    // Son tedarikçiler
    const recentSuppliers = await prisma.supplier.findMany({
      where: { isActive: true },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        category: true,
      },
    });

    // Son KPI'lar
    const recentKPIs = await prisma.kPI.findMany({
      where: { isActive: true },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        category: true,
        department: true,
        owner: {
          select: {
            name: true,
            surname: true,
          },
        },
      },
    });

    const stats = {
      totalUsers,
      totalDocuments,
      pendingApprovals,
      publishedDocuments,
      documentsByStatus: (documentsByStatus ?? [])?.map?.(item => ({
        status: item?.status,
        count: item?._count?.id ?? 0,
      })) ?? [],
      recentDocuments: recentDocuments ?? [],
      myPendingApprovals: myPendingApprovals ?? [],
      myPendingAcknowledgments: myPendingAcknowledgments ?? [],
      myPendingReviews: myPendingReviews ?? [],
      // Şikayet istatistikleri
      totalComplaints,
      newComplaints,
      inProgressComplaints,
      resolvedComplaints,
      complaintsByStatus: (complaintsByStatus ?? [])?.map?.(item => ({
        status: item?.status,
        count: item?._count?.id ?? 0,
      })) ?? [],
      complaintsByPriority: (complaintsByPriority ?? [])?.map?.(item => ({
        priority: item?.priority,
        count: item?._count?.id ?? 0,
      })) ?? [],
      recentComplaints: recentComplaints ?? [],
      urgentComplaints: urgentComplaints ?? [],
      // CAPA istatistikleri
      totalCAPAs,
      openCAPAs,
      inProgressCAPAs,
      closedCAPAs,
      capasByStatus: (capasByStatus ?? [])?.map?.(item => ({
        status: item?.status,
        count: item?._count?.id ?? 0,
      })) ?? [],
      capasByType: (capasByType ?? [])?.map?.(item => ({
        type: item?.type,
        count: item?._count?.id ?? 0,
      })) ?? [],
      recentCAPAs: recentCAPAs ?? [],
      criticalCAPAs: criticalCAPAs ?? [],
      // Denetim istatistikleri
      totalAudits,
      plannedAudits,
      inProgressAudits,
      completedAudits,
      auditsByStatus: (auditsByStatus ?? [])?.map?.(item => ({
        status: item?.status,
        count: item?._count?.id ?? 0,
      })) ?? [],
      auditsByType: (auditsByType ?? [])?.map?.(item => ({
        type: item?.type,
        count: item?._count?.id ?? 0,
      })) ?? [],
      totalFindings,
      openFindings,
      recentAudits: recentAudits ?? [],
      majorFindings: majorFindings ?? [],
      // Risk istatistikleri
      totalRisks,
      criticalRisks,
      veryHighRisks,
      highRisks,
      risksInAction,
      risksByStatus: (risksByStatus ?? [])?.map?.(item => ({
        status: item?.status,
        count: item?._count?.id ?? 0,
      })) ?? [],
      risksByLevel: (risksByLevel ?? [])?.map?.(item => ({
        level: item?.currentLevel,
        count: item?._count?.id ?? 0,
      })) ?? [],
      recentRisks: recentRisks ?? [],
      criticalRisksList: criticalRisksList ?? [],
      // Ekipman istatistikleri
      totalEquipment,
      activeEquipment,
      maintenancePending,
      calibrationPending,
      faultyEquipment,
      equipmentByStatus: (equipmentByStatus ?? [])?.map?.(item => ({
        status: item?.status,
        count: item?._count?.id ?? 0,
      })) ?? [],
      recentEquipment: recentEquipment ?? [],
      pendingEquipment: pendingEquipment ?? [],
      // Tedarikçi istatistikleri
      totalSuppliers,
      approvedSuppliers,
      pendingSuppliers,
      suspendedSuppliers,
      evaluationsDue,
      recentSuppliers: recentSuppliers ?? [],
      // KPI istatistikleri
      totalKPIs,
      activeKPIs,
      onTargetKPIs,
      warningKPIs,
      criticalKPIs,
      recentKPIs: recentKPIs ?? [],
    };

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Dashboard stats GET error:', error);
    return NextResponse.json(
      { error: 'İstatistikler getirilirken hata oluştu' },
      { status: 500 }
    );
  }
}
