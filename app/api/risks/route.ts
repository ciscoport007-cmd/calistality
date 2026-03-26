import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isAdmin, getDepartmentFilterWithNull, canCreate } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// Risk listesi ve oluşturma
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const type = searchParams.get('type') || '';
    const level = searchParams.get('level') || '';
    const categoryId = searchParams.get('categoryId') || '';
    const departmentIdParam = searchParams.get('departmentId') || '';

    // Departman bazlı yetkilendirme
    const userRole = session.user.role;
    const userDepartmentId = session.user.departmentId;
    const departmentFilter = getDepartmentFilterWithNull(userDepartmentId, userRole);

    const where: any = {
      isDeleted: false,
      ...departmentFilter,
    };

    if (search) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { code: { contains: search, mode: 'insensitive' } },
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    if (status && status !== 'all') where.status = status;
    if (type && type !== 'all') where.type = type;
    if (level && level !== 'all') where.currentLevel = level;
    if (categoryId && categoryId !== 'all') where.categoryId = categoryId;
    // Departman filtresi: sadece admin için manuel filtrelemeye izin ver
    if (departmentIdParam && departmentIdParam !== 'all' && isAdmin(userRole)) {
      where.departmentId = departmentIdParam;
    }

    const [risks, total] = await Promise.all([
      prisma.risk.findMany({
        where,
        include: {
          category: true,
          department: true,
          owner: { select: { id: true, name: true, surname: true, email: true } },
          createdBy: { select: { id: true, name: true, surname: true } },
          _count: {
            select: {
              assessments: true,
              actions: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.risk.count({ where }),
    ]);

    return NextResponse.json({
      risks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Risk listesi hatası:', error);
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
      title,
      description,
      type,
      source,
      categoryId,
      departmentId,
      ownerId,
      existingControls,
      controlEffectiveness,
      responseStrategy,
      inherentProbability,
      inherentImpact,
      reviewDate,
      tags,
      notes,
      relatedComplaintId,
      relatedCAPAId,
      relatedAuditId,
    } = body;

    if (!title || !type) {
      return NextResponse.json(
        { error: 'Başlık ve risk tipi zorunludur' },
        { status: 400 }
      );
    }

    // Otomatik kod oluştur
    const year = new Date().getFullYear();
    const lastRisk = await prisma.risk.findFirst({
      where: { code: { startsWith: `RSK-${year}` } },
      orderBy: { code: 'desc' },
    });

    let nextNumber = 1;
    if (lastRisk) {
      const lastNumber = parseInt(lastRisk.code.split('-')[2]);
      nextNumber = lastNumber + 1;
    }
    const code = `RSK-${year}-${String(nextNumber).padStart(4, '0')}`;

    // Risk skorunu hesapla
    let inherentRiskScore = null;
    let currentLevel = null;
    if (inherentProbability && inherentImpact) {
      inherentRiskScore = inherentProbability * inherentImpact;
      currentLevel = calculateRiskLevel(inherentRiskScore);
    }

    const risk = await prisma.risk.create({
      data: {
        code,
        title,
        description,
        type,
        source,
        categoryId: categoryId || null,
        departmentId: departmentId || null,
        ownerId: ownerId || null,
        existingControls,
        controlEffectiveness,
        responseStrategy,
        inherentProbability: inherentProbability ? parseInt(inherentProbability) : null,
        inherentImpact: inherentImpact ? parseInt(inherentImpact) : null,
        inherentRiskScore,
        currentLevel,
        reviewDate: reviewDate ? new Date(reviewDate) : null,
        tags,
        notes,
        relatedComplaintId,
        relatedCAPAId,
        relatedAuditId,
        createdById: session.user.id,
      },
      include: {
        category: true,
        department: true,
        owner: { select: { id: true, name: true, surname: true, email: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
      },
    });

    // Geçmiş kaydı oluştur
    await prisma.riskHistory.create({
      data: {
        riskId: risk.id,
        userId: session.user.id,
        action: 'OLUSTURULDU',
        newValue: JSON.stringify({ code: risk.code, title: risk.title, type: risk.type }),
        comments: 'Risk kaydı oluşturuldu',
      },
    });

    return NextResponse.json(risk, { status: 201 });
  } catch (error) {
    console.error('Risk oluşturma hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

function calculateRiskLevel(score: number): string {
  if (score <= 4) return 'DUSUK';
  if (score <= 9) return 'ORTA';
  if (score <= 14) return 'YUKSEK';
  if (score <= 19) return 'COK_YUKSEK';
  return 'KRITIK';
}
