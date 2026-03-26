import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { isAdmin, getDepartmentFilterWithNull } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// PESTEL çalışmalarını listele
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const periodId = searchParams.get('periodId');
    const status = searchParams.get('status');
    const departmentIdParam = searchParams.get('departmentId');

    // Departman bazlı yetkilendirme
    const userRole = session.user.role;
    const userDepartmentId = session.user.departmentId;
    const departmentFilter = getDepartmentFilterWithNull(userDepartmentId, userRole);

    const where: any = { ...departmentFilter };
    if (periodId) where.periodId = periodId;
    if (status) where.status = status;
    // Departman filtresi: sadece admin için manuel filtrelemeye izin ver
    if (departmentIdParam && isAdmin(userRole)) {
      where.departmentId = departmentIdParam;
    }

    const studies = await prisma.pESTELStudy.findMany({
      where,
      include: {
        period: { select: { id: true, code: true, name: true } },
        department: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
        factors: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // İstatistikler
    const stats = {
      total: studies.length,
      draft: studies.filter(s => s.status === 'TASLAK').length,
      active: studies.filter(s => s.status === 'AKTIF').length,
      completed: studies.filter(s => s.status === 'TAMAMLANDI').length,
    };

    return NextResponse.json({ studies, stats });
  } catch (error) {
    console.error('PESTEL studies fetch error:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// Yeni PESTEL çalışması oluştur
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, periodId, departmentId, analysisDate } = body;

    if (!name || !periodId) {
      return NextResponse.json({ error: 'Gerekli alanlar eksik' }, { status: 400 });
    }

    // Otomatik kod üretimi
    const year = new Date().getFullYear();
    const count = await prisma.pESTELStudy.count({
      where: { code: { startsWith: `PESTEL-${year}` } },
    });
    const code = `PESTEL-${year}-${String(count + 1).padStart(3, '0')}`;

    const study = await prisma.pESTELStudy.create({
      data: {
        code,
        name,
        description,
        periodId,
        departmentId: departmentId || null,
        analysisDate: analysisDate ? new Date(analysisDate) : new Date(),
        createdById: session.user.id,
      },
      include: {
        period: { select: { id: true, code: true, name: true } },
        department: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
      },
    });

    return NextResponse.json(study, { status: 201 });
  } catch (error) {
    console.error('PESTEL study create error:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
