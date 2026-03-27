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

    const factors = await prisma.sustainabilityEmissionFactor.findMany({
      where: { isActive: true },
      orderBy: { sourceType: 'asc' },
    });

    return NextResponse.json({ factors });
  } catch (error) {
    console.error('Emission factors GET error:', error);
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
    const { sourceType, factor, unit, year, source } = body;

    // Upsert - update if exists
    const existing = await prisma.sustainabilityEmissionFactor.findUnique({
      where: { sourceType },
    });

    if (existing) {
      const updated = await prisma.sustainabilityEmissionFactor.update({
        where: { sourceType },
        data: { factor: parseFloat(factor), unit, year: parseInt(year), source },
      });
      return NextResponse.json(updated);
    }

    const newFactor = await prisma.sustainabilityEmissionFactor.create({
      data: {
        sourceType,
        factor: parseFloat(factor),
        unit,
        year: parseInt(year),
        source,
      },
    });
    return NextResponse.json(newFactor, { status: 201 });
  } catch (error) {
    console.error('Emission factor POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
