import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { createNotification } from '@/lib/notifications';

async function generateMaintenanceCode(): Promise<string> {
  const prefix = 'EKP-BKM-';

  const lastMaintenance = await prisma.equipmentMaintenance.findFirst({
    where: { code: { startsWith: prefix } },
    orderBy: { code: 'desc' },
  });

  let nextNumber = 1;
  if (lastMaintenance) {
    const lastNumber = parseInt(lastMaintenance.code.split('-').pop() || '0');
    nextNumber = lastNumber + 1;
  }

  return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
}

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

    const maintenances = await prisma.equipmentMaintenance.findMany({
      where: { equipmentId: id },
      include: {
        technician: { select: { id: true, name: true, surname: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(maintenances);
  } catch (error) {
    console.error('Error fetching maintenances:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
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
    const {
      maintenanceType,
      title,
      description,
      priority,
      plannedDate,
      technicianId,
      externalCompany,
    } = body;

    if (!title || !maintenanceType) {
      return NextResponse.json({ error: 'Title and maintenance type are required' }, { status: 400 });
    }

    const equipment = await prisma.equipment.findUnique({
      where: { id },
    });

    if (!equipment) {
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 });
    }

    const code = await generateMaintenanceCode();

    const maintenance = await prisma.equipmentMaintenance.create({
      data: {
        equipmentId: id,
        code,
        maintenanceType,
        title,
        description,
        priority: priority || 'ORTA',
        plannedDate: plannedDate ? new Date(plannedDate) : null,
        technicianId: technicianId || null,
        externalCompany: externalCompany || null,
        createdById: session.user.id,
      },
      include: {
        technician: { select: { id: true, name: true, surname: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
      },
    });

    // Ekipman durumunu güncelle
    await prisma.equipment.update({
      where: { id },
      data: { status: 'BAKIM_BEKLIYOR' },
    });

    // Tarihçe kaydı
    await prisma.equipmentHistory.create({
      data: {
        equipmentId: id,
        userId: session.user.id,
        action: 'BAKIM_PLANLANDI',
        newValue: JSON.stringify({ code, title, maintenanceType }),
        comments: `Bakım planlandı: ${title}`,
      },
    });

    // Teknisyene bildirim gönder
    if (technicianId && technicianId !== session.user.id) {
      const maintenanceTypes: Record<string, string> = {
        'PERIYODIK': 'Periyodik',
        'ARIZALI': 'Arıza',
        'ONLEYICI': 'Önleyici',
        'DUZELTUCU': 'Düzeltici',
        'REVIZYON': 'Revizyon',
      };
      await createNotification({
        userId: technicianId,
        title: 'Bakım Görevi Atandı',
        message: `${equipment.code} - ${equipment.name} ekipmanı için ${maintenanceTypes[maintenanceType] || maintenanceType} bakım görevi size atandı.`,
        type: 'BILGI',
        link: `/dashboard/equipment/${id}`,
      });
    }

    return NextResponse.json(maintenance);
  } catch (error) {
    console.error('Error creating maintenance:', error);
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

    const { id: equipmentId } = await params;
    const body = await request.json();
    const {
      maintenanceId,
      status,
      workPerformed,
      partsUsed,
      laborHours,
      partsCost,
      laborCost,
      result,
      findings,
      recommendations,
      nextMaintenanceDate,
    } = body;

    if (!maintenanceId) {
      return NextResponse.json({ error: 'Maintenance ID is required' }, { status: 400 });
    }

    const existingMaintenance = await prisma.equipmentMaintenance.findUnique({
      where: { id: maintenanceId },
    });

    if (!existingMaintenance || existingMaintenance.equipmentId !== equipmentId) {
      return NextResponse.json({ error: 'Maintenance not found' }, { status: 404 });
    }

    const updateData: any = {};

    if (status) {
      updateData.status = status;
      if (status === 'DEVAM_EDIYOR' && !existingMaintenance.startDate) {
        updateData.startDate = new Date();
      }
      if (status === 'TAMAMLANDI' && !existingMaintenance.completionDate) {
        updateData.completionDate = new Date();
      }
    }

    if (workPerformed !== undefined) updateData.workPerformed = workPerformed;
    if (partsUsed !== undefined) updateData.partsUsed = partsUsed;
    if (laborHours !== undefined) updateData.laborHours = laborHours;
    if (partsCost !== undefined) updateData.partsCost = partsCost;
    if (laborCost !== undefined) updateData.laborCost = laborCost;
    if (result !== undefined) updateData.result = result;
    if (findings !== undefined) updateData.findings = findings;
    if (recommendations !== undefined) updateData.recommendations = recommendations;
    if (nextMaintenanceDate !== undefined) {
      updateData.nextMaintenanceDate = nextMaintenanceDate ? new Date(nextMaintenanceDate) : null;
    }

    // Toplam maliyet hesapla
    if (partsCost !== undefined || laborCost !== undefined) {
      const pc = partsCost !== undefined ? partsCost : existingMaintenance.partsCost || 0;
      const lc = laborCost !== undefined ? laborCost : existingMaintenance.laborCost || 0;
      updateData.totalCost = pc + lc;
    }

    const maintenance = await prisma.equipmentMaintenance.update({
      where: { id: maintenanceId },
      data: updateData,
      include: {
        technician: { select: { id: true, name: true, surname: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
      },
    });

    // Bakım tamamlandıysa ekipmanı güncelle
    if (status === 'TAMAMLANDI') {
      const equipmentUpdateData: any = {
        status: 'AKTIF',
        lastMaintenanceDate: new Date(),
      };

      if (nextMaintenanceDate) {
        equipmentUpdateData.nextMaintenanceDate = new Date(nextMaintenanceDate);
      }

      await prisma.equipment.update({
        where: { id: equipmentId },
        data: equipmentUpdateData,
      });

      // Tarihçe kaydı
      await prisma.equipmentHistory.create({
        data: {
          equipmentId,
          userId: session.user.id,
          action: 'BAKIM_TAMAMLANDI',
          newValue: JSON.stringify({ maintenanceCode: maintenance.code, result }),
          comments: `Bakım tamamlandı: ${maintenance.title}`,
        },
      });
    } else if (status === 'DEVAM_EDIYOR') {
      await prisma.equipment.update({
        where: { id: equipmentId },
        data: { status: 'BAKIMDA' },
      });
    }

    return NextResponse.json(maintenance);
  } catch (error) {
    console.error('Error updating maintenance:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
