import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isAdmin, getDepartmentFilterWithNull, canCreate } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const type = searchParams.get('type') || '';
    const categoryId = searchParams.get('categoryId') || '';
    const departmentIdParam = searchParams.get('departmentId') || '';
    const forGoalLinking = searchParams.get('forGoalLinking') === 'true';

    // Departman bazlı yetkilendirme
    const userRole = session.user.role;
    const userDepartmentId = session.user.departmentId;
    
    // Hedef bağlama için tüm KPI'ları göster, normal listeleme için departman filtresi uygula
    const departmentFilter = forGoalLinking ? {} : getDepartmentFilterWithNull(userDepartmentId, userRole);

    const where: any = { 
      isActive: true,
      ...departmentFilter,
    };

    if (search) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { code: { contains: search, mode: 'insensitive' } },
            { name: { contains: search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    if (status) where.status = status;
    if (type) where.type = type;
    if (categoryId) where.categoryId = categoryId;
    // Departman filtresi: sadece admin için manuel filtrelemeye izin ver
    if (departmentIdParam && isAdmin(userRole)) {
      where.departmentId = departmentIdParam;
    }

    const kpis = await prisma.kPI.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        category: { select: { id: true, name: true, code: true, color: true } },
        department: { select: { id: true, name: true, code: true } },
        owner: { select: { id: true, name: true, surname: true } },
        _count: { select: { measurements: true } },
      },
    });

    return NextResponse.json(kpis);
  } catch (error) {
    console.error('KPI listesi hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    // Yalnızca Admin ve Yönetici rolleri yeni içerik oluşturabilir
    if (!canCreate(session.user?.role)) {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz bulunmamaktadır' }, { status: 403 });
    }

    const body = await request.json();

    const {
      name,
      description,
      measurementType,
      type,
      categoryId,
      departmentId,
      unit,
      formula,
      dataSource,
      period,
      targetValue,
      minValue,
      maxValue,
      warningThreshold,
      criticalThreshold,
      trendDirection,
      weight,
      baselineValue,
      baselineDate,
      ownerId,
    } = body;

    if (!name || !unit || targetValue === undefined) {
      return NextResponse.json(
        { error: 'İsim, birim ve hedef değer zorunludur' },
        { status: 400 }
      );
    }

    // Otomatik kod oluştur
    const year = new Date().getFullYear();
    const lastKPI = await prisma.kPI.findFirst({
      where: { code: { startsWith: `KPI-${year}-` } },
      orderBy: { code: 'desc' },
    });

    let nextNumber = 1;
    if (lastKPI) {
      const lastNumber = parseInt(lastKPI.code.split('-')[2]);
      nextNumber = lastNumber + 1;
    }
    const code = `KPI-${year}-${String(nextNumber).padStart(4, '0')}`;

    const kpi = await prisma.kPI.create({
      data: {
        code,
        name,
        description,
        measurementType: measurementType || 'KPI',
        type: type || 'OPERASYONEL',
        categoryId: categoryId || null,
        departmentId: departmentId || null,
        unit,
        formula,
        dataSource,
        period: period || 'AYLIK',
        targetValue: parseFloat(targetValue),
        minValue: minValue ? parseFloat(minValue) : null,
        maxValue: maxValue ? parseFloat(maxValue) : null,
        warningThreshold: warningThreshold ? parseFloat(warningThreshold) : null,
        criticalThreshold: criticalThreshold ? parseFloat(criticalThreshold) : null,
        trendDirection: trendDirection || 'YUKARI_IYI',
        weight: weight ? parseFloat(weight) : 1.0,
        baselineValue: baselineValue ? parseFloat(baselineValue) : null,
        baselineDate: baselineDate ? new Date(baselineDate) : null,
        ownerId: ownerId || null,
        createdById: session.user.id,
        status: 'TASLAK',
      },
      include: {
        category: true,
        department: true,
        owner: { select: { id: true, name: true, surname: true } },
      },
    });

    return NextResponse.json(kpi, { status: 201 });
  } catch (error) {
    console.error('KPI oluşturma hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
