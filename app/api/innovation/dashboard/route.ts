import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth-options';

export const dynamic = 'force-dynamic';

// GET - İnovasyon dashboard metrikleri
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    // Temel sayımlar
    const [
      totalIdeas,
      ideasByStatus,
      ideasByCategory,
      ideasByDepartment,
      totalProjects,
      projectsByStatus,
      topIdeas,
    ] = await Promise.all([
      prisma.innovationIdea.count({ where: { isActive: true } }),

      prisma.innovationIdea.groupBy({
        by: ['status'],
        where: { isActive: true },
        _count: { _all: true },
      }),

      prisma.innovationIdea.groupBy({
        by: ['category'],
        where: { isActive: true },
        _count: { _all: true },
      }),

      prisma.innovationIdea.groupBy({
        by: ['departmentId'],
        where: { isActive: true, departmentId: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { departmentId: 'desc' } },
        take: 10,
      }),

      prisma.innovationProject.count({ where: { isActive: true } }),

      prisma.innovationProject.groupBy({
        by: ['status'],
        where: { isActive: true },
        _count: { _all: true },
      }),

      prisma.innovationIdea.findMany({
        where: { isActive: true },
        orderBy: { score: 'desc' },
        take: 5,
        include: {
          createdBy: { select: { id: true, name: true, surname: true } },
          department: { select: { id: true, name: true } },
        },
      }),
    ]);

    // Departman adlarını çek
    const departmentIds = ideasByDepartment.map((d) => d.departmentId).filter(Boolean) as string[];
    const departments = await prisma.department.findMany({
      where: { id: { in: departmentIds } },
      select: { id: true, name: true },
    });
    const deptMap = Object.fromEntries(departments.map((d) => [d.id, d.name]));

    // Son 12 ay trendi
    const now = new Date();
    const monthlyTrend: { month: string; count: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const count = await prisma.innovationIdea.count({
        where: {
          isActive: true,
          createdAt: { gte: date, lt: nextDate },
        },
      });
      monthlyTrend.push({
        month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        count,
      });
    }

    // Onay oranı hesapla
    const approvedCount = ideasByStatus.find((s) => s.status === 'ONAYLANDI')?._count._all ?? 0;
    const rejectedCount = ideasByStatus.find((s) => s.status === 'REDDEDILDI')?._count._all ?? 0;
    const reviewedTotal = approvedCount + rejectedCount;
    const approvalRate = reviewedTotal > 0 ? Math.round((approvedCount / reviewedTotal) * 100) : 0;

    // Proje dönüşüm oranı
    const projectedCount = ideasByStatus.find((s) => s.status === 'PROJELESTI')?._count._all ?? 0;
    const conversionRate = totalIdeas > 0 ? Math.round((projectedCount / totalIdeas) * 100) : 0;

    // Aktif ve tamamlanan projeler
    const activeProjects = projectsByStatus.find((s) => s.status === 'DEVAM_EDIYOR')?._count._all ?? 0;
    const completedProjects = projectsByStatus.find((s) => s.status === 'TAMAMLANDI')?._count._all ?? 0;

    return NextResponse.json({
      totalIdeas,
      approvalRate,
      conversionRate,
      totalProjects,
      activeProjects,
      completedProjects,
      ideasByStatus: ideasByStatus.map((s) => ({ status: s.status, count: s._count._all })),
      ideasByCategory: ideasByCategory.map((c) => ({ category: c.category, count: c._count._all })),
      ideasByDepartment: ideasByDepartment.map((d) => ({
        departmentId: d.departmentId,
        departmentName: d.departmentId ? deptMap[d.departmentId] ?? 'Bilinmiyor' : 'Departmansız',
        count: d._count._all,
      })),
      projectsByStatus: projectsByStatus.map((s) => ({ status: s.status, count: s._count._all })),
      monthlyTrend,
      topIdeas: topIdeas.map((idea) => ({
        ...idea,
        createdBy: idea.isAnonymous ? null : idea.createdBy,
      })),
    });
  } catch (error) {
    console.error('Dashboard metrik hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
