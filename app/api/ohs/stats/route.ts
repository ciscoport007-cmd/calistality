import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    // Taşeron sayısı (tedarikçilerden)
    const subcontractorCount = await prisma.supplier.count({
      where: {
        isActive: true,
        isSubcontractor: true,
      },
    });

    // İş kazası sayısı
    const accidentCount = await prisma.oHSAccident.count({
      where: { isActive: true },
    });

    // Açık iş kazası sayısı
    const openAccidentCount = await prisma.oHSAccident.count({
      where: {
        isActive: true,
        status: { not: 'KAPATILDI' },
      },
    });

    // Bu ay iş kazası sayısı
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const accidentThisMonth = await prisma.oHSAccident.count({
      where: {
        isActive: true,
        accidentDate: { gte: firstDayOfMonth },
      },
    });

    // Ramak kala sayısı
    const nearMissCount = await prisma.oHSNearMiss.count({
      where: { isActive: true },
    });

    // Bu ay ramak kala sayısı
    const nearMissThisMonth = await prisma.oHSNearMiss.count({
      where: {
        isActive: true,
        eventDate: { gte: firstDayOfMonth },
      },
    });

    // Aktif risk sayısı
    const riskCount = await prisma.oHSRisk.count({
      where: {
        isActive: true,
        status: { not: 'KAPATILDI' },
      },
    });

    // Yüksek risk sayısı (puan >= 15)
    const highRiskCount = await prisma.oHSRisk.count({
      where: {
        isActive: true,
        status: { not: 'KAPATILDI' },
        riskScore: { gte: 15 },
      },
    });

    // Açık aksiyon sayısı
    const openActionsCount = await prisma.oHSRiskAction.count({
      where: {
        status: { in: ['OLUSTURULDU', 'DEVAM_EDIYOR'] },
      },
    });

    // Son 5 kaza
    const recentAccidents = await prisma.oHSAccident.findMany({
      where: { isActive: true },
      orderBy: { accidentDate: 'desc' },
      take: 5,
      select: {
        id: true,
        code: true,
        title: true,
        accidentDate: true,
        status: true,
        department: { select: { name: true } },
      },
    });

    // Son 5 ramak kala
    const recentNearMisses = await prisma.oHSNearMiss.findMany({
      where: { isActive: true },
      orderBy: { eventDate: 'desc' },
      take: 5,
      select: {
        id: true,
        code: true,
        title: true,
        eventDate: true,
        department: { select: { name: true } },
        reporter: { select: { name: true, surname: true } },
      },
    });

    // Sağlık Gözetimi istatistikleri
    const healthRecordCount = await prisma.oHSHealthRecord.count({
      where: { isActive: true },
    });

    // Yakında muayenesi olan personel
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
    const upcomingExams = await prisma.oHSHealthRecord.count({
      where: {
        isActive: true,
        nextExamDate: {
          lte: thirtyDaysLater,
          gte: new Date(),
        },
      },
    });

    // Aşı sayısı
    const vaccinationCount = await prisma.oHSVaccination.count({
      where: { isActive: true },
    });

    // KKD istatistikleri
    const ppeItemCount = await prisma.oHSPPE.count({
      where: { isActive: true },
    });

    const lowStockPPE = await prisma.oHSPPE.count({
      where: {
        isActive: true,
        status: { in: ['AZALIYOR', 'TUKENDI'] },
      },
    });

    // Acil Durum istatistikleri
    const emergencyPlanCount = await prisma.oHSEmergencyPlan.count({
      where: { isActive: true },
    });

    const activePlanCount = await prisma.oHSEmergencyPlan.count({
      where: {
        isActive: true,
        status: 'AKTIF',
      },
    });

    const drillCount = await prisma.oHSEmergencyDrill.count({
      where: { isActive: true },
    });

    return NextResponse.json({
      subcontractorCount,
      accidentCount,
      openAccidentCount,
      accidentThisMonth,
      nearMissCount,
      nearMissThisMonth,
      riskCount,
      highRiskCount,
      openActionsCount,
      recentAccidents,
      recentNearMisses,
      // Faz 3
      healthRecordCount,
      upcomingExams,
      vaccinationCount,
      ppeItemCount,
      lowStockPPE,
      emergencyPlanCount,
      activePlanCount,
      drillCount,
    });
  } catch (error) {
    console.error('OHS stats error:', error);
    return NextResponse.json(
      { error: 'İstatistikler alınamadı' },
      { status: 500 }
    );
  }
}
