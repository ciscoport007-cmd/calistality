import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

// GET - Aksiyona bağlı KPI'ları getir
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const actionKPIs = await prisma.actionKPI.findMany({
      where: { actionId: id },
      include: {
        kpi: {
          include: {
            category: true,
            owner: {
              select: { id: true, name: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(actionKPIs);
  } catch (error) {
    console.error('Error fetching action KPIs:', error);
    return NextResponse.json(
      { error: 'KPI\'lar getirilirken hata oluştu' },
      { status: 500 }
    );
  }
}

// POST - Aksiyona KPI bağla
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { kpiId } = body;

    if (!kpiId) {
      return NextResponse.json(
        { error: 'KPI seçimi zorunludur' },
        { status: 400 }
      );
    }

    // Aksiyon var mı kontrol et
    const action = await prisma.strategicAction.findUnique({
      where: { id }
    });

    if (!action) {
      return NextResponse.json(
        { error: 'Aksiyon bulunamadı' },
        { status: 404 }
      );
    }

    // KPI var mı kontrol et
    const kpi = await prisma.kPI.findUnique({
      where: { id: kpiId }
    });

    if (!kpi) {
      return NextResponse.json(
        { error: 'KPI bulunamadı' },
        { status: 404 }
      );
    }

    // Zaten bağlı mı kontrol et
    const existing = await prisma.actionKPI.findUnique({
      where: {
        actionId_kpiId: {
          actionId: id,
          kpiId: kpiId
        }
      }
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Bu KPI zaten aksiyona bağlı' },
        { status: 400 }
      );
    }

    // Bağlantıyı oluştur
    const actionKPI = await prisma.actionKPI.create({
      data: {
        actionId: id,
        kpiId: kpiId
      },
      include: {
        kpi: {
          include: {
            category: true,
            owner: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });

    // Tarihçe kaydı
    await prisma.strategicActionHistory.create({
      data: {
        actionId: id,
        userId: session.user.id,
        actionType: 'KPI_BAGLANDI',
        newValue: kpi.name
      }
    });

    return NextResponse.json(actionKPI);
  } catch (error) {
    console.error('Error linking KPI:', error);
    return NextResponse.json(
      { error: 'KPI bağlantısı oluşturulurken hata oluştu' },
      { status: 500 }
    );
  }
}

// DELETE - Aksiyondan KPI bağlantısını kaldır
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const kpiId = searchParams.get('kpiId');

    if (!kpiId) {
      return NextResponse.json(
        { error: 'KPI ID zorunludur' },
        { status: 400 }
      );
    }

    // Bağlantıyı bul
    const actionKPI = await prisma.actionKPI.findUnique({
      where: {
        actionId_kpiId: {
          actionId: id,
          kpiId: kpiId
        }
      },
      include: { kpi: true }
    });

    if (!actionKPI) {
      return NextResponse.json(
        { error: 'KPI bağlantısı bulunamadı' },
        { status: 404 }
      );
    }

    // Bağlantıyı sil
    await prisma.actionKPI.delete({
      where: {
        actionId_kpiId: {
          actionId: id,
          kpiId: kpiId
        }
      }
    });

    // Tarihçe kaydı
    await prisma.strategicActionHistory.create({
      data: {
        actionId: id,
        userId: session.user.id,
        actionType: 'KPI_KALDIRILDI',
        oldValue: actionKPI.kpi.name
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing KPI link:', error);
    return NextResponse.json(
      { error: 'KPI bağlantısı kaldırılırken hata oluştu' },
      { status: 500 }
    );
  }
}
