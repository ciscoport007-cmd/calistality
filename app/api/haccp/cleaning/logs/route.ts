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
    const areaId = searchParams.get('areaId');
    const overallStatus = searchParams.get('overallStatus');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: Record<string, unknown> = {};
    if (areaId) where.areaId = areaId;
    if (overallStatus) where.overallStatus = overallStatus;
    if (startDate || endDate) {
      where.logDate = {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate) }),
      };
    }

    const logs = await prisma.hACCPCleaningLog.findMany({
      where,
      include: {
        area: { select: { id: true, name: true, areaType: true } },
        performedBy: { select: { id: true, name: true, surname: true } },
        signedOffBy: { select: { id: true, name: true, surname: true } },
      },
      orderBy: { logDate: 'desc' },
      take: 100,
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error('HACCP cleaning logs fetch error:', error);
    return NextResponse.json({ error: 'Temizlik kayıtları alınamadı' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const body = await request.json();
    const { areaId, logDate, shift, checklistResults, overallStatus, notes, actionRequired, actionTaken } = body;

    if (!areaId || !logDate || !checklistResults) {
      return NextResponse.json({ error: 'Alan, tarih ve kontrol sonuçları zorunludur' }, { status: 400 });
    }

    const log = await prisma.hACCPCleaningLog.create({
      data: {
        areaId,
        logDate: new Date(logDate),
        shift: shift || null,
        checklistResults: JSON.stringify(checklistResults),
        overallStatus: overallStatus || 'TAMAM',
        notes: notes || null,
        actionRequired: actionRequired || false,
        actionTaken: actionTaken || null,
        performedById: session.user.id,
      },
      include: {
        area: { select: { id: true, name: true, areaType: true } },
        performedBy: { select: { id: true, name: true, surname: true } },
      },
    });

    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    console.error('HACCP cleaning log create error:', error);
    return NextResponse.json({ error: 'Temizlik kaydı oluşturulamadı' }, { status: 500 });
  }
}
