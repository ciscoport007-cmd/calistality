import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const equipment = await prisma.equipment.findUnique({
      where: { id },
      include: {
        category: true,
        department: true,
        owner: { select: { id: true, name: true, surname: true, email: true } },
        maintenanceResponsible: { select: { id: true, name: true, surname: true, email: true } },
        calibrationResponsible: { select: { id: true, name: true, surname: true, email: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
        maintenances: {
          orderBy: { createdAt: 'desc' },
          include: {
            technician: { select: { id: true, name: true, surname: true } },
            createdBy: { select: { id: true, name: true, surname: true } },
          },
        },
        calibrations: {
          orderBy: { createdAt: 'desc' },
          include: {
            calibrator: { select: { id: true, name: true, surname: true } },
            createdBy: { select: { id: true, name: true, surname: true } },
          },
        },
        histories: {
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, name: true, surname: true } },
          },
        },
      },
    });

    if (!equipment) {
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 });
    }

    return NextResponse.json(equipment);
  } catch (error) {
    console.error('Error fetching equipment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const existingEquipment = await prisma.equipment.findUnique({
      where: { id },
    });

    if (!existingEquipment) {
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 });
    }

    const updateData: any = {};
    const changedFields: string[] = [];
    const oldValues: any = {};
    const newValues: any = {};

    const fields = [
      'name', 'description', 'categoryId', 'departmentId', 'location',
      'serialNumber', 'model', 'manufacturer', 'status', 'condition',
      'maintenanceFrequency', 'requiresCalibration', 'calibrationFrequency',
      'purchaseCost', 'currentValue', 'specifications', 'operatingInstructions',
      'safetyInstructions', 'ownerId', 'maintenanceResponsibleId', 'calibrationResponsibleId',
    ];

    for (const field of fields) {
      if (body[field] !== undefined && body[field] !== (existingEquipment as any)[field]) {
        oldValues[field] = (existingEquipment as any)[field];
        newValues[field] = body[field];
        updateData[field] = body[field];
        changedFields.push(field);
      }
    }

    const dateFields = ['purchaseDate', 'installationDate', 'warrantyEndDate'];
    for (const field of dateFields) {
      if (body[field] !== undefined) {
        const newDate = body[field] ? new Date(body[field]) : null;
        const existingDate = (existingEquipment as any)[field];
        if (newDate?.toISOString() !== existingDate?.toISOString()) {
          oldValues[field] = existingDate;
          newValues[field] = newDate;
          updateData[field] = newDate;
          changedFields.push(field);
        }
      }
    }

    // Bakım ve kalibrasyon tarihlerini güncelle
    if (body.maintenanceFrequency !== undefined && body.maintenanceFrequency > 0) {
      const nextMaintenance = new Date();
      nextMaintenance.setDate(nextMaintenance.getDate() + body.maintenanceFrequency);
      updateData.nextMaintenanceDate = nextMaintenance;
    }

    if (body.calibrationFrequency !== undefined && body.calibrationFrequency > 0 && body.requiresCalibration) {
      const nextCalibration = new Date();
      nextCalibration.setDate(nextCalibration.getDate() + body.calibrationFrequency);
      updateData.nextCalibrationDate = nextCalibration;
    }

    const equipment = await prisma.equipment.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        department: true,
        owner: { select: { id: true, name: true, surname: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
      },
    });

    // Tarihçe kaydı
    if (changedFields.length > 0) {
      let action = 'GUNCELLENDI';
      if (changedFields.includes('status')) {
        if (body.status === 'DEVRE_DISI' || body.status === 'HURDA') {
          action = 'DEVRE_DISI_BIRAKILDI';
        } else if (existingEquipment.status === 'DEVRE_DISI' && body.status === 'AKTIF') {
          action = 'AKTIF_EDILDI';
        } else {
          action = 'DURUM_DEGISTI';
        }
      }

      await prisma.equipmentHistory.create({
        data: {
          equipmentId: equipment.id,
          userId: session.user.id,
          action,
          oldValue: JSON.stringify(oldValues),
          newValue: JSON.stringify(newValues),
          comments: `Güncellenen alanlar: ${changedFields.join(', ')}`,
        },
      });
    }

    return NextResponse.json(equipment);
  } catch (error) {
    console.error('Error updating equipment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const existingEquipment = await prisma.equipment.findUnique({
      where: { id },
    });

    if (!existingEquipment) {
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 });
    }

    // Soft delete
    await prisma.equipment.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    });

    // Tarihçe kaydı
    await prisma.equipmentHistory.create({
      data: {
        equipmentId: id,
        userId: session.user.id,
        action: 'DEVRE_DISI_BIRAKILDI',
        oldValue: JSON.stringify({ isActive: true }),
        newValue: JSON.stringify({ isActive: false }),
        comments: 'Ekipman silindi',
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting equipment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
