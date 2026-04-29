import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export const dynamic = 'force-dynamic';

// Tanık listesi
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await params;

    const witnesses = await prisma.oHSAccidentWitness.findMany({
      where: { accidentId: id },
      include: {
        user: { select: { id: true, name: true, surname: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(witnesses);
  } catch (error) {
    console.error('Witness fetch error:', error);
    return NextResponse.json({ error: 'Tanıklar alınamadı' }, { status: 500 });
  }
}

// Tanık ekle
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { userId, externalName, contactInfo, statement } = body;

    if (!userId && !externalName?.trim()) {
      return NextResponse.json(
        { error: 'Sistemdeki kullanıcı veya harici isim girilmelidir' },
        { status: 400 }
      );
    }

    const witness = await prisma.oHSAccidentWitness.create({
      data: {
        accidentId: id,
        userId: userId || null,
        externalName: externalName?.trim() || null,
        contactInfo: contactInfo?.trim() || null,
        statement: statement?.trim() || null,
      },
      include: {
        user: { select: { id: true, name: true, surname: true, email: true } },
      },
    });

    return NextResponse.json(witness, { status: 201 });
  } catch (error) {
    console.error('Witness create error:', error);
    return NextResponse.json({ error: 'Tanık eklenemedi' }, { status: 500 });
  }
}

// Tanık sil
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const witnessId = searchParams.get('witnessId');

    if (!witnessId) {
      return NextResponse.json({ error: 'Tanık ID gerekli' }, { status: 400 });
    }

    await prisma.oHSAccidentWitness.delete({ where: { id: witnessId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Witness delete error:', error);
    return NextResponse.json({ error: 'Tanık silinemedi' }, { status: 500 });
  }
}
