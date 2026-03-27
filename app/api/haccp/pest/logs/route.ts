import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const stationId = searchParams.get('stationId');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: Record<string, unknown> = {};
    if (stationId) where.stationId = stationId;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.controlDate = {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate) }),
      };
    }

    const logs = await prisma.hACCPPestLog.findMany({
      where,
      include: {
        station: { select: { id: true, code: true, name: true, areaType: true, location: true } },
        inspectedBy: { select: { id: true, name: true, surname: true } },
      },
      orderBy: { controlDate: 'desc' },
      take: 100,
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error('HACCP pest logs fetch error:', error);
    return NextResponse.json({ error: 'Kontrol kayıtları alınamadı' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const body = await request.json();
    const { stationId, controlDate, status, findings, externalCompany, actionRequired, actionTaken } = body;

    if (!stationId || !controlDate || !status) {
      return NextResponse.json({ error: 'İstasyon, tarih ve durum zorunludur' }, { status: 400 });
    }

    const log = await prisma.hACCPPestLog.create({
      data: {
        stationId,
        controlDate: new Date(controlDate),
        status,
        findings: findings || null,
        externalCompany: externalCompany || null,
        actionRequired: actionRequired || false,
        actionTaken: actionTaken || null,
        inspectedById: session.user.id,
      },
      include: {
        station: { select: { id: true, code: true, name: true, areaType: true, location: true } },
        inspectedBy: { select: { id: true, name: true, surname: true } },
      },
    });

    // Son kontrol tarihini güncelle
    await prisma.hACCPPestStation.update({
      where: { id: stationId },
      data: { lastControlDate: new Date(controlDate) },
    });

    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    console.error('HACCP pest log create error:', error);
    return NextResponse.json({ error: 'Kontrol kaydı oluşturulamadı' }, { status: 500 });
  }
}
