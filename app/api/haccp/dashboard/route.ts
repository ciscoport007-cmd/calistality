import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const last7Days = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalEquipment,
      activeEquipment,
      outOfRangeLast7Days,
      totalCCPs,
      ccpChecklistsToday,
      nonConformantCCPs,
      totalPestStations,
      pestIssuesLast30Days,
      expiredSamples,
      activeSamples,
      cleaningLogsToday,
      incompleteCleanings,
      recentTemperatureLogs,
      recentCCPIssues,
    ] = await Promise.all([
      prisma.hACCPEquipment.count({ where: { isActive: true } }),
      prisma.hACCPEquipment.count({ where: { isActive: true, status: 'AKTIF' } }),
      prisma.hACCPTemperatureLog.count({
        where: { isOutOfRange: true, measuredAt: { gte: last7Days } },
      }),
      prisma.hACCPCCP.count({ where: { isActive: true } }),
      prisma.hACCPCCPChecklist.count({
        where: { checkDate: { gte: today } },
      }),
      prisma.hACCPCCPChecklist.count({
        where: { status: 'UYGUNSUZ', checkDate: { gte: last7Days } },
      }),
      prisma.hACCPPestStation.count({ where: { isActive: true } }),
      prisma.hACCPPestLog.count({
        where: {
          status: { in: ['AKTIVITE_VAR', 'HASARLI'] },
          controlDate: { gte: last30Days },
        },
      }),
      prisma.hACCPFoodSample.count({
        where: { isActive: true, isExpired: true, isDisposed: false },
      }),
      prisma.hACCPFoodSample.count({
        where: { isActive: true, isDisposed: false },
      }),
      prisma.hACCPCleaningLog.count({
        where: { logDate: { gte: today } },
      }),
      prisma.hACCPCleaningLog.count({
        where: { overallStatus: { in: ['EKSIK', 'UYGUNSUZ'] }, logDate: { gte: last7Days } },
      }),
      prisma.hACCPTemperatureLog.findMany({
        where: { isOutOfRange: true, correctiveAction: null },
        include: {
          equipment: { select: { id: true, code: true, name: true } },
          measuredBy: { select: { id: true, name: true, surname: true } },
        },
        orderBy: { measuredAt: 'desc' },
        take: 5,
      }),
      prisma.hACCPCCPChecklist.findMany({
        where: { status: 'UYGUNSUZ', isApproved: false },
        include: {
          ccp: { select: { id: true, code: true, name: true, process: true } },
          checkedBy: { select: { id: true, name: true, surname: true } },
        },
        orderBy: { checkDate: 'desc' },
        take: 5,
      }),
    ]);

    return NextResponse.json({
      stats: {
        totalEquipment,
        activeEquipment,
        outOfRangeLast7Days,
        totalCCPs,
        ccpChecklistsToday,
        nonConformantCCPs,
        totalPestStations,
        pestIssuesLast30Days,
        expiredSamples,
        activeSamples,
        cleaningLogsToday,
        incompleteCleanings,
      },
      alerts: {
        recentTemperatureLogs,
        recentCCPIssues,
        expiredSampleCount: expiredSamples,
      },
    });
  } catch (error) {
    console.error('HACCP dashboard error:', error);
    return NextResponse.json({ error: 'Dashboard verisi alınamadı' }, { status: 500 });
  }
}
