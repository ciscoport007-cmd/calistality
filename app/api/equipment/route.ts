import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { canCreate, isAdmin } from '@/lib/audit';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const categoryId = searchParams.get('categoryId') || '';
    const departmentId = searchParams.get('departmentId') || '';
    const condition = searchParams.get('condition') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');

    const where: any = {
      isActive: true,
    };

    // Admin değilse sadece kendi departmanının ekipmanlarını görebilir
    if (!isAdmin(session.user?.role)) {
      const userDepartmentId = session.user?.departmentId;
      if (userDepartmentId) {
        where.departmentId = userDepartmentId;
      }
    } else {
      // Admin ise departman filtresi URL param'dan alınır
      if (departmentId) where.departmentId = departmentId;
    }

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { serialNumber: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) where.status = status;
    if (categoryId) where.categoryId = categoryId;
    if (condition) where.condition = condition;

    const [equipment, total] = await Promise.all([
      prisma.equipment.findMany({
        where,
        include: {
          category: true,
          department: true,
          owner: { select: { id: true, name: true, surname: true } },
          createdBy: { select: { id: true, name: true, surname: true } },
          _count: { select: { maintenances: true, calibrations: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.equipment.count({ where }),
    ]);

    return NextResponse.json({
      equipment,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('Error fetching equipment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function generateEquipmentCode(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `EKP-${year}-`;

  const lastEquipment = await prisma.equipment.findFirst({
    where: { code: { startsWith: prefix } },
    orderBy: { code: 'desc' },
  });

  let nextNumber = 1;
  if (lastEquipment) {
    const lastNumber = parseInt(lastEquipment.code.split('-').pop() || '0');
    nextNumber = lastNumber + 1;
  }

  return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Yalnızca Admin ve Yönetici rolleri yeni içerik oluşturabilir
    if (!canCreate(session.user?.role)) {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz bulunmamaktadır' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      description,
      categoryId,
      departmentId,
      location,
      serialNumber,
      model,
      manufacturer,
      purchaseDate,
      installationDate,
      warrantyEndDate,
      maintenanceFrequency,
      requiresCalibration,
      calibrationFrequency,
      purchaseCost,
      currentValue,
      specifications,
      operatingInstructions,
      safetyInstructions,
      ownerId,
      maintenanceResponsibleId,
      calibrationResponsibleId,
      lastCalibrationDate,
      imageUrl,
    } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const code = await generateEquipmentCode();

    // Sonraki bakım ve kalibrasyon tarihlerini hesapla
    let nextMaintenanceDate = null;
    let nextCalibrationDate = null;
    const today = new Date();

    if (maintenanceFrequency && maintenanceFrequency > 0) {
      nextMaintenanceDate = new Date(today);
      nextMaintenanceDate.setDate(today.getDate() + maintenanceFrequency);
    }

    if (requiresCalibration && calibrationFrequency && calibrationFrequency > 0) {
      // Son kalibrasyon tarihi girilmişse ona göre, yoksa bugüne göre hesapla
      const baseDate = lastCalibrationDate ? new Date(lastCalibrationDate) : new Date();
      nextCalibrationDate = new Date(baseDate);
      nextCalibrationDate.setDate(baseDate.getDate() + calibrationFrequency);
    }

    const equipment = await prisma.equipment.create({
      data: {
        code,
        name,
        description,
        categoryId: categoryId || null,
        departmentId: departmentId || null,
        location,
        serialNumber,
        model,
        manufacturer,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        installationDate: installationDate ? new Date(installationDate) : null,
        warrantyEndDate: warrantyEndDate ? new Date(warrantyEndDate) : null,
        maintenanceFrequency,
        nextMaintenanceDate,
        requiresCalibration: requiresCalibration || false,
        calibrationFrequency,
        lastCalibrationDate: lastCalibrationDate ? new Date(lastCalibrationDate) : null,
        nextCalibrationDate,
        purchaseCost,
        currentValue,
        specifications,
        operatingInstructions,
        safetyInstructions,
        ownerId: ownerId || null,
        maintenanceResponsibleId: maintenanceResponsibleId || null,
        calibrationResponsibleId: calibrationResponsibleId || null,
        imageUrl: imageUrl || null,
        createdById: session.user.id,
      },
      include: {
        category: true,
        department: true,
        owner: { select: { id: true, name: true, surname: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
      },
    });

    // Tarihçe kaydı
    await prisma.equipmentHistory.create({
      data: {
        equipmentId: equipment.id,
        userId: session.user.id,
        action: 'OLUSTURULDU',
        newValue: JSON.stringify({ code, name, status: 'AKTIF' }),
        comments: 'Ekipman oluşturuldu',
      },
    });

    return NextResponse.json(equipment);
  } catch (error) {
    console.error('Error creating equipment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
