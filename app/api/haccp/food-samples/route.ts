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
    const isExpired = searchParams.get('isExpired');
    const isDisposed = searchParams.get('isDisposed');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: Record<string, unknown> = { isActive: true };
    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { productName: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (isExpired === 'true') where.isExpired = true;
    if (isExpired === 'false') where.isExpired = false;
    if (isDisposed === 'true') where.isDisposed = true;
    if (isDisposed === 'false') where.isDisposed = false;
    if (startDate || endDate) {
      where.sampleDate = {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate) }),
      };
    }

    const samples = await prisma.hACCPFoodSample.findMany({
      where,
      include: {
        createdBy: { select: { id: true, name: true, surname: true } },
        disposedBy: { select: { id: true, name: true, surname: true } },
      },
      orderBy: { sampleDate: 'desc' },
    });

    // Süresi dolmuş olanları işaretle
    const now = new Date();
    const updatedSamples = await Promise.all(
      samples.map(async (sample) => {
        if (!sample.isExpired && !sample.isDisposed && sample.expiryDateTime < now) {
          await prisma.hACCPFoodSample.update({
            where: { id: sample.id },
            data: { isExpired: true },
          });
          return { ...sample, isExpired: true };
        }
        return sample;
      })
    );

    return NextResponse.json(updatedSamples);
  } catch (error) {
    console.error('HACCP food samples fetch error:', error);
    return NextResponse.json({ error: 'Numune listesi alınamadı' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const body = await request.json();
    const { productName, sampleDate, sampleTime, mealType, storageTemp, retentionHours, notes } = body;

    if (!productName || !sampleDate) {
      return NextResponse.json({ error: 'Ürün adı ve tarih zorunludur' }, { status: 400 });
    }

    const year = new Date().getFullYear();
    const lastSample = await prisma.hACCPFoodSample.findFirst({
      where: { code: { startsWith: `NMN-${year}-` } },
      orderBy: { code: 'desc' },
    });
    const nextNumber = lastSample ? parseInt(lastSample.code.split('-')[2]) + 1 : 1;
    const code = `NMN-${year}-${String(nextNumber).padStart(4, '0')}`;

    const dateTimeStr = sampleTime ? `${sampleDate}T${sampleTime}:00` : `${sampleDate}T00:00:00`;
    const sampleDateTime = new Date(dateTimeStr);
    const hours = parseInt(retentionHours) || 72;
    const expiryDateTime = new Date(sampleDateTime.getTime() + hours * 60 * 60 * 1000);

    const sample = await prisma.hACCPFoodSample.create({
      data: {
        code,
        productName,
        sampleDate: sampleDateTime,
        sampleTime: sampleTime || null,
        mealType: mealType || null,
        storageTemp: storageTemp !== '' && storageTemp !== undefined ? parseFloat(storageTemp) : null,
        retentionHours: hours,
        expiryDateTime,
        notes: notes || null,
        createdById: session.user.id,
      },
    });

    return NextResponse.json(sample, { status: 201 });
  } catch (error) {
    console.error('HACCP food sample create error:', error);
    return NextResponse.json({ error: 'Numune kaydı oluşturulamadı' }, { status: 500 });
  }
}
