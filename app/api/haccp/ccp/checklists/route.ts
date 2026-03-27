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
    const ccpId = searchParams.get('ccpId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {};
    if (ccpId) where.ccpId = ccpId;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.checkDate = {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate) }),
      };
    }

    const checklists = await prisma.hACCPCCPChecklist.findMany({
      where,
      include: {
        ccp: { select: { id: true, code: true, name: true, process: true } },
        checkedBy: { select: { id: true, name: true, surname: true } },
        approvedBy: { select: { id: true, name: true, surname: true } },
      },
      orderBy: { checkDate: 'desc' },
      take: 100,
    });

    return NextResponse.json(checklists);
  } catch (error) {
    console.error('HACCP CCP checklists fetch error:', error);
    return NextResponse.json({ error: 'Kontrol listesi alınamadı' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const body = await request.json();
    const { ccpId, checkDate, status, measuredValue, notes, nonConformity } = body;

    if (!ccpId || !checkDate || !status) {
      return NextResponse.json({ error: 'CCP, tarih ve durum zorunludur' }, { status: 400 });
    }

    const checklist = await prisma.hACCPCCPChecklist.create({
      data: {
        ccpId,
        checkDate: new Date(checkDate),
        status,
        measuredValue: measuredValue !== '' && measuredValue !== undefined ? parseFloat(measuredValue) : null,
        notes: notes || null,
        nonConformity: nonConformity || null,
        capaCreated: false,
        checkedById: session.user.id,
      },
      include: {
        ccp: { select: { id: true, code: true, name: true, process: true } },
        checkedBy: { select: { id: true, name: true, surname: true } },
      },
    });

    return NextResponse.json(checklist, { status: 201 });
  } catch (error) {
    console.error('HACCP CCP checklist create error:', error);
    return NextResponse.json({ error: 'Kontrol kaydı oluşturulamadı' }, { status: 500 });
  }
}
