import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth-options';

// GET - Kilometre taşı ilerleme kayıtlarını listele
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; milestoneId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { milestoneId } = await params;

    const progressEntries = await prisma.milestoneProgress.findMany({
      where: { milestoneId },
      include: {
        createdBy: { select: { id: true, name: true, surname: true } },
      },
      orderBy: { measurementDate: 'desc' },
    });

    return NextResponse.json(progressEntries);
  } catch (error) {
    console.error('Milestone progress fetch error:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// POST - Yeni ilerleme kaydı ekle
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; milestoneId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id: actionId, milestoneId } = await params;
    const body = await request.json();
    const { value, measurementDate, notes } = body;

    if (value === undefined || !measurementDate) {
      return NextResponse.json({ error: 'Değer ve tarih zorunludur' }, { status: 400 });
    }

    const numericValue = parseFloat(value);

    const milestone = await prisma.actionMilestone.findUnique({
      where: { id: milestoneId },
    });

    if (!milestone || milestone.actionId !== actionId) {
      return NextResponse.json({ error: 'Kilometre taşı bulunamadı' }, { status: 404 });
    }

    const progressEntry = await prisma.milestoneProgress.create({
      data: {
        milestoneId,
        value: numericValue,
        measurementDate: new Date(measurementDate),
        notes,
        createdById: session.user.id,
      },
      include: {
        createdBy: { select: { id: true, name: true, surname: true } },
      },
    });

    // Kilometre taşının currentValue'sunu güncelle (en son ölçüm tarihe göre)
    const latestEntry = await prisma.milestoneProgress.findFirst({
      where: { milestoneId },
      orderBy: { measurementDate: 'desc' },
    });

    await prisma.actionMilestone.update({
      where: { id: milestoneId },
      data: { currentValue: latestEntry?.value ?? numericValue },
    });

    // Aksiyon tarihçesine ekle
    await prisma.strategicActionHistory.create({
      data: {
        actionId,
        userId: session.user.id,
        actionType: 'KILOMETRE_TASI_DURUMU',
        newValue: String(numericValue),
        comments: `"${milestone.name}" kilometre taşına ilerleme kaydı eklendi: ${numericValue}${milestone.unit || ''}`,
      },
    });

    return NextResponse.json(progressEntry, { status: 201 });
  } catch (error) {
    console.error('Milestone progress create error:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// DELETE - İlerleme kaydını sil
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; milestoneId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { milestoneId } = await params;
    const { searchParams } = new URL(request.url);
    const progressId = searchParams.get('progressId');

    if (!progressId) {
      return NextResponse.json({ error: 'progressId gerekli' }, { status: 400 });
    }

    await prisma.milestoneProgress.delete({ where: { id: progressId } });

    // currentValue'yu güncelle (kalan en son ölçüm)
    const latestEntry = await prisma.milestoneProgress.findFirst({
      where: { milestoneId },
      orderBy: { measurementDate: 'desc' },
    });

    await prisma.actionMilestone.update({
      where: { id: milestoneId },
      data: { currentValue: latestEntry?.value ?? null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Milestone progress delete error:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
