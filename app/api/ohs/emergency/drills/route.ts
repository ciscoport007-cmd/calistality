import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export const dynamic = 'force-dynamic';

// Tatbikat listesi
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const planId = searchParams.get('planId');
    const result = searchParams.get('result');

    const where: any = { isActive: true };

    if (planId) {
      where.planId = planId;
    }

    if (result) {
      where.result = result;
    }

    const drills = await prisma.oHSEmergencyDrill.findMany({
      where,
      include: {
        plan: { select: { id: true, code: true, title: true, type: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
      },
      orderBy: { drillDate: 'desc' },
    });

    return NextResponse.json(drills);
  } catch (error) {
    console.error('Drills fetch error:', error);
    return NextResponse.json(
      { error: 'Tatbikatlar alınamadı' },
      { status: 500 }
    );
  }
}

// Yeni tatbikat
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const body = await request.json();
    const {
      planId,
      title,
      drillDate,
      duration,
      participantCount,
      departments,
      result,
      findings,
      improvements,
      reportFileName,
      reportFileSize,
      reportFileType,
      reportCloudPath,
      reportIsPublic,
    } = body;

    if (!planId || !title || !drillDate) {
      return NextResponse.json(
        { error: 'Zorunlu alanlar eksik' },
        { status: 400 }
      );
    }

    // Plan kontrolü
    const plan = await prisma.oHSEmergencyPlan.findUnique({ where: { id: planId } });
    if (!plan) {
      return NextResponse.json({ error: 'Plan bulunamadı' }, { status: 404 });
    }

    // Kod oluştur
    const year = new Date().getFullYear();
    const lastDrill = await prisma.oHSEmergencyDrill.findFirst({
      where: { code: { startsWith: `TAT-${year}` } },
      orderBy: { code: 'desc' },
    });

    let nextNumber = 1;
    if (lastDrill) {
      const lastNumber = parseInt(lastDrill.code.split('-')[2]);
      nextNumber = lastNumber + 1;
    }
    const code = `TAT-${year}-${nextNumber.toString().padStart(4, '0')}`;

    const drill = await prisma.oHSEmergencyDrill.create({
      data: {
        code,
        planId,
        title,
        drillDate: new Date(drillDate),
        duration,
        participantCount,
        departments,
        result,
        findings,
        improvements,
        reportFileName,
        reportFileSize,
        reportFileType,
        reportCloudPath,
        reportIsPublic: reportIsPublic || false,
        createdById: session.user.id,
      },
      include: {
        plan: { select: { id: true, code: true, title: true, type: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
      },
    });

    return NextResponse.json(drill, { status: 201 });
  } catch (error) {
    console.error('Drill create error:', error);
    return NextResponse.json(
      { error: 'Tatbikat oluşturulamadı' },
      { status: 500 }
    );
  }
}
