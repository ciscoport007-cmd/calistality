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
    const { ccpId, checkDate, measuredValue, measuredDuration, measurementArea, notes, nonConformity } = body;

    if (!ccpId || !checkDate) {
      return NextResponse.json({ error: 'CCP ve tarih zorunludur' }, { status: 400 });
    }

    // CCP limitlerini çek — otomatik uygunluk değerlendirmesi için
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ccp: any = await prisma.hACCPCCP.findUnique({
      where: { id: ccpId },
      select: { criticalLimitMin: true, criticalLimitMax: true, criticalTimeLimitValue: true, criticalTimeLimitUnit: true } as never,
    });

    const parsedValue = measuredValue !== '' && measuredValue !== undefined ? parseFloat(measuredValue) : null;
    const parsedDuration = measuredDuration !== '' && measuredDuration !== undefined ? parseFloat(measuredDuration) : null;

    // Otomatik uygunluk: limit varsa ve ölçüm değeri dışarıdaysa → UYGUNSUZ
    let autoStatus = 'YAPILDI';
    let autoNonConformity = nonConformity || null;

    if (parsedValue !== null && ccp) {
      const belowMin = ccp.criticalLimitMin !== null && parsedValue < ccp.criticalLimitMin;
      const aboveMax = ccp.criticalLimitMax !== null && parsedValue > ccp.criticalLimitMax;
      const exceedsDuration = ccp.criticalTimeLimitValue !== null && parsedDuration !== null && parsedDuration > ccp.criticalTimeLimitValue;

      if (belowMin || aboveMax || exceedsDuration) {
        autoStatus = 'UYGUNSUZ';
        if (!autoNonConformity) {
          const reasons: string[] = [];
          if (belowMin) reasons.push(`Sıcaklık min limitin (${ccp.criticalLimitMin}) altında: ${parsedValue}`);
          if (aboveMax) reasons.push(`Sıcaklık max limitin (${ccp.criticalLimitMax}) üzerinde: ${parsedValue}`);
          if (exceedsDuration) reasons.push(`Süre limitini (${ccp.criticalTimeLimitValue} ${ccp.criticalTimeLimitUnit ?? ''}) aştı: ${parsedDuration}`);
          autoNonConformity = reasons.join('; ');
        }
      }
    }

    // Eğer ölçüm yapılmadıysa (değer girilmemişse) ve kullanıcı YAPILMADI seçtiyse
    const finalStatus = parsedValue === null ? (body.status ?? 'YAPILMADI') : autoStatus;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const checklist = await (prisma.hACCPCCPChecklist.create as any)({
      data: {
        ccpId,
        checkDate: new Date(checkDate),
        status: finalStatus,
        measuredValue: parsedValue,
        measuredDuration: parsedDuration,
        measurementArea: measurementArea || null,
        notes: notes || null,
        nonConformity: autoNonConformity,
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
