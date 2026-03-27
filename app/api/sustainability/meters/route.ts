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
    const category = searchParams.get('category'); // ENERJI | SU
    const type = searchParams.get('type');
    const level = searchParams.get('level');

    const meters = await prisma.sustainabilityMeter.findMany({
      where: {
        isActive: true,
        ...(category && { category }),
        ...(type && { type }),
        ...(level && { level }),
      },
      include: {
        parent: { select: { id: true, name: true, code: true } },
        children: { select: { id: true, name: true, code: true } },
        _count: { select: { readings: true } },
      },
      orderBy: [{ category: 'asc' }, { level: 'desc' }, { name: 'asc' }],
    });

    return NextResponse.json({ meters });
  } catch (error) {
    console.error('Meters GET error:', error);
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
    const { name, type, category, level, location, unit, parentId, notes } = body;

    if (!name || !type || !category || !location || !unit) {
      return NextResponse.json({ error: 'Zorunlu alanlar eksik' }, { status: 400 });
    }

    // Auto-generate code
    const prefix = category === 'ENERJI' ? 'ENR' : 'SU';
    const year = new Date().getFullYear();
    const last = await prisma.sustainabilityMeter.findFirst({
      where: { code: { startsWith: `${prefix}-${year}-` } },
      orderBy: { code: 'desc' },
    });
    const nextNum = last ? parseInt(last.code.split('-')[2]) + 1 : 1;
    const code = `${prefix}-${year}-${nextNum.toString().padStart(4, '0')}`;

    const meter = await prisma.sustainabilityMeter.create({
      data: {
        code,
        name,
        type,
        category,
        level: level || 'ALT',
        location,
        unit,
        parentId: parentId || null,
        notes,
        createdById: session.user.id,
      },
    });

    return NextResponse.json(meter, { status: 201 });
  } catch (error) {
    console.error('Meter POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
