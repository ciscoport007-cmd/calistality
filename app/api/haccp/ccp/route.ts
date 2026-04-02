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
    const search = searchParams.get('search') || '';
    const process = searchParams.get('process');

    const where: Record<string, unknown> = { isActive: true };
    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (process) where.process = process;

    const ccps = await prisma.hACCPCCP.findMany({
      where,
      include: {
        responsible: { select: { id: true, name: true, surname: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
        _count: { select: { checklists: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(ccps);
  } catch (error) {
    console.error('HACCP CCP fetch error:', error);
    return NextResponse.json({ error: 'CCP listesi alınamadı' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name, process, description,
      criticalLimitMin, criticalLimitMax, criticalLimitUnit, criticalLimitDesc,
      criticalTimeLimitValue, criticalTimeLimitUnit,
      monitoringMethod, monitoringFrequency,
      responsibleId, correctiveProcedure,
    } = body;

    if (!name || !process) {
      return NextResponse.json({ error: 'Ad ve süreç zorunludur' }, { status: 400 });
    }

    const year = new Date().getFullYear();
    const lastCCP = await prisma.hACCPCCP.findFirst({
      where: { code: { startsWith: `CCP-${year}-` } },
      orderBy: { code: 'desc' },
    });
    const nextNumber = lastCCP ? parseInt(lastCCP.code.split('-')[2]) + 1 : 1;
    const code = `CCP-${year}-${String(nextNumber).padStart(4, '0')}`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ccp = await (prisma.hACCPCCP.create as any)({
      data: {
        code,
        name,
        process,
        description: description || null,
        criticalLimitMin: criticalLimitMin !== '' && criticalLimitMin !== undefined ? parseFloat(criticalLimitMin) : null,
        criticalLimitMax: criticalLimitMax !== '' && criticalLimitMax !== undefined ? parseFloat(criticalLimitMax) : null,
        criticalLimitUnit: criticalLimitUnit || null,
        criticalLimitDesc: criticalLimitDesc || null,
        criticalTimeLimitValue: criticalTimeLimitValue !== '' && criticalTimeLimitValue !== undefined ? parseFloat(criticalTimeLimitValue) : null,
        criticalTimeLimitUnit: criticalTimeLimitUnit || null,
        monitoringMethod: monitoringMethod || null,
        monitoringFrequency: monitoringFrequency || null,
        responsibleId: responsibleId || null,
        correctiveProcedure: correctiveProcedure || null,
        createdById: session.user.id,
      },
    });

    return NextResponse.json(ccp, { status: 201 });
  } catch (error) {
    console.error('HACCP CCP create error:', error);
    return NextResponse.json({ error: 'CCP oluşturulamadı' }, { status: 500 });
  }
}
