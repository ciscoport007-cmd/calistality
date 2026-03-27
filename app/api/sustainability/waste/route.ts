import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const wasteType = searchParams.get('wasteType');
    const area = searchParams.get('area');
    const skip = (page - 1) * limit;

    const where = {
      ...(wasteType && { wasteType }),
      ...(area && { area }),
    };

    const [records, total] = await Promise.all([
      prisma.sustainabilityWasteRecord.findMany({
        where,
        include: { createdBy: { select: { id: true, name: true, surname: true } } },
        orderBy: { recordDate: 'desc' },
        skip,
        take: limit,
      }),
      prisma.sustainabilityWasteRecord.count({ where }),
    ]);

    return NextResponse.json({
      records,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Waste GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { recordDate, period, wasteType, area, quantity, isRecycled, disposalFirm, waybillNo, notes } = body;

    if (!recordDate || !wasteType || !area || quantity === undefined) {
      return NextResponse.json({ error: 'Zorunlu alanlar eksik' }, { status: 400 });
    }

    const year = new Date().getFullYear();
    const last = await prisma.sustainabilityWasteRecord.findFirst({
      where: { code: { startsWith: `ATK-${year}-` } },
      orderBy: { code: 'desc' },
    });
    const nextNum = last ? parseInt(last.code.split('-')[2]) + 1 : 1;
    const code = `ATK-${year}-${nextNum.toString().padStart(4, '0')}`;

    const record = await prisma.sustainabilityWasteRecord.create({
      data: {
        code,
        recordDate: new Date(recordDate),
        period: period || 'GUNLUK',
        wasteType,
        area,
        quantity: parseFloat(quantity),
        isRecycled: isRecycled || false,
        disposalFirm,
        waybillNo,
        notes,
        createdById: session.user.id,
      },
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error('Waste POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
