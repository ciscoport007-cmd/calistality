import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const ccp = await prisma.hACCPCCP.findUnique({
      where: { id: params.id },
      include: {
        responsible: { select: { id: true, name: true, surname: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
        checklists: {
          include: {
            checkedBy: { select: { id: true, name: true, surname: true } },
            approvedBy: { select: { id: true, name: true, surname: true } },
          },
          orderBy: { checkDate: 'desc' },
          take: 30,
        },
      },
    });

    if (!ccp) {
      return NextResponse.json({ error: 'CCP bulunamadı' }, { status: 404 });
    }

    return NextResponse.json(ccp);
  } catch (error) {
    console.error('HACCP CCP detail error:', error);
    return NextResponse.json({ error: 'CCP alınamadı' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const body = await request.json();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ccp = await (prisma.hACCPCCP.update as any)({
      where: { id: params.id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.process !== undefined && { process: body.process }),
        ...(body.description !== undefined && { description: body.description || null }),
        ...(body.criticalLimitMin !== undefined && { criticalLimitMin: body.criticalLimitMin !== '' ? parseFloat(body.criticalLimitMin) : null }),
        ...(body.criticalLimitMax !== undefined && { criticalLimitMax: body.criticalLimitMax !== '' ? parseFloat(body.criticalLimitMax) : null }),
        ...(body.criticalLimitUnit !== undefined && { criticalLimitUnit: body.criticalLimitUnit || null }),
        ...(body.criticalLimitDesc !== undefined && { criticalLimitDesc: body.criticalLimitDesc || null }),
        ...(body.criticalTimeLimitValue !== undefined && { criticalTimeLimitValue: body.criticalTimeLimitValue !== '' ? parseFloat(body.criticalTimeLimitValue) : null }),
        ...(body.criticalTimeLimitUnit !== undefined && { criticalTimeLimitUnit: body.criticalTimeLimitUnit || null }),
        ...(body.monitoringMethod !== undefined && { monitoringMethod: body.monitoringMethod || null }),
        ...(body.monitoringFrequency !== undefined && { monitoringFrequency: body.monitoringFrequency || null }),
        ...(body.responsibleId !== undefined && { responsibleId: body.responsibleId || null }),
        ...(body.correctiveProcedure !== undefined && { correctiveProcedure: body.correctiveProcedure || null }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    });

    return NextResponse.json(ccp);
  } catch (error) {
    console.error('HACCP CCP update error:', error);
    return NextResponse.json({ error: 'CCP güncellenemedi' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    await prisma.hACCPCCP.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('HACCP CCP delete error:', error);
    return NextResponse.json({ error: 'CCP silinemedi' }, { status: 500 });
  }
}
