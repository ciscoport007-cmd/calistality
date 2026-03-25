import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

// Acil durum planları listesi
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type');
    const status = searchParams.get('status');

    const where: any = { isActive: true };

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (type) {
      where.type = type;
    }

    if (status) {
      where.status = status;
    }

    const plans = await prisma.oHSEmergencyPlan.findMany({
      where,
      include: {
        createdBy: { select: { id: true, name: true, surname: true } },
        _count: { select: { drills: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(plans);
  } catch (error) {
    console.error('Emergency plans fetch error:', error);
    return NextResponse.json(
      { error: 'Acil durum planları alınamadı' },
      { status: 500 }
    );
  }
}

// Yeni acil durum planı
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const body = await request.json();
    const {
      type,
      title,
      description,
      procedures,
      evacuationRoutes,
      assemblyPoints,
      responsiblePersons,
      emergencyContacts,
      status,
      version,
      validFrom,
      validUntil,
      documentFileName,
      documentFileSize,
      documentFileType,
      documentCloudPath,
      documentIsPublic,
    } = body;

    if (!type || !title || !description || !procedures) {
      return NextResponse.json(
        { error: 'Zorunlu alanlar eksik' },
        { status: 400 }
      );
    }

    // Kod oluştur
    const year = new Date().getFullYear();
    const lastPlan = await prisma.oHSEmergencyPlan.findFirst({
      where: { code: { startsWith: `ADP-${year}` } },
      orderBy: { code: 'desc' },
    });

    let nextNumber = 1;
    if (lastPlan) {
      const lastNumber = parseInt(lastPlan.code.split('-')[2]);
      nextNumber = lastNumber + 1;
    }
    const code = `ADP-${year}-${nextNumber.toString().padStart(4, '0')}`;

    const plan = await prisma.oHSEmergencyPlan.create({
      data: {
        code,
        type,
        title,
        description,
        procedures,
        evacuationRoutes,
        assemblyPoints,
        responsiblePersons,
        emergencyContacts,
        status: status || 'TASLAK',
        version: version || '1.0',
        validFrom: validFrom ? new Date(validFrom) : null,
        validUntil: validUntil ? new Date(validUntil) : null,
        documentFileName,
        documentFileSize,
        documentFileType,
        documentCloudPath,
        documentIsPublic: documentIsPublic || false,
        createdById: session.user.id,
      },
      include: {
        createdBy: { select: { id: true, name: true, surname: true } },
      },
    });

    return NextResponse.json(plan, { status: 201 });
  } catch (error) {
    console.error('Emergency plan create error:', error);
    return NextResponse.json(
      { error: 'Acil durum planı oluşturulamadı' },
      { status: 500 }
    );
  }
}
