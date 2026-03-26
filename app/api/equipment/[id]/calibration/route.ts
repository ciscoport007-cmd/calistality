import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function generateCalibrationCode(): Promise<string> {
  const prefix = 'EKP-KLB-';

  const lastCalibration = await prisma.equipmentCalibration.findFirst({
    where: { code: { startsWith: prefix } },
    orderBy: { code: 'desc' },
  });

  let nextNumber = 1;
  if (lastCalibration) {
    const lastNumber = parseInt(lastCalibration.code.split('-').pop() || '0');
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

    const calibrations = await prisma.equipmentCalibration.findMany({
      where: { equipmentId: id },
      include: {
        calibrator: { select: { id: true, name: true, surname: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(calibrations);
  } catch (error) {
    console.error('Error fetching calibrations:', error);
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
      calibrationType,
      title,
      description,
      referenceStandard,
      referenceEquipment,
      plannedDate,
      calibratorId,
      externalProvider,
      externalCost,
      certificateNumber,
      isEarlyCalibration,
    } = body;

    if (!title || !calibrationType) {
      return NextResponse.json({ error: 'Title and calibration type are required' }, { status: 400 });
    }

    const equipment = await prisma.equipment.findUnique({
      where: { id },
    });

    if (!equipment) {
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 });
    }

    const code = await generateCalibrationCode();

    const calibration = await prisma.equipmentCalibration.create({
      data: {
        equipmentId: id,
        code,
        calibrationType,
        title,
        description,
        referenceStandard,
        referenceEquipment,
        plannedDate: plannedDate ? new Date(plannedDate) : null,
        calibratorId: calibratorId || null,
        externalProvider,
        externalCost,
        certificateNumber: certificateNumber || null,
        createdById: session.user.id,
      },
      include: {
        calibrator: { select: { id: true, name: true, surname: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
      },
    });

    // Ekipman durumunu güncelle
    await prisma.equipment.update({
      where: { id },
      data: { status: 'KALIBRASYON_BEKLIYOR' },
    });

    // Tarihçe kaydı
    const actionType = isEarlyCalibration ? 'Erken kalibrasyon' : 'Kalibrasyon';
    await prisma.equipmentHistory.create({
      data: {
        equipmentId: id,
        userId: session.user.id,
        action: 'KALIBRASYON_YAPILDI',
        newValue: JSON.stringify({ code, title, calibrationType, isEarlyCalibration: !!isEarlyCalibration }),
        comments: `${actionType} planlandı: ${title}`,
      },
    });

    return NextResponse.json(calibration);
  } catch (error) {
    console.error('Error creating calibration:', error);
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
      calibrationId,
      status,
      calibrationDate,
      validUntilDate,
      beforeReadings,
      afterReadings,
      tolerance,
      deviation,
      uncertainty,
      uncertaintyUnit,
      result,
      isAccepted,
      rejectionReason,
      certificateNumber,
      certificateUrl,
      nextCalibrationDate,
    } = body;

    if (!calibrationId) {
      return NextResponse.json({ error: 'Calibration ID is required' }, { status: 400 });
    }

    const existingCalibration = await prisma.equipmentCalibration.findUnique({
      where: { id: calibrationId },
    });

    if (!existingCalibration || existingCalibration.equipmentId !== equipmentId) {
      return NextResponse.json({ error: 'Calibration not found' }, { status: 404 });
    }

    const updateData: any = {};

    if (status) updateData.status = status;
    if (calibrationDate !== undefined) updateData.calibrationDate = calibrationDate ? new Date(calibrationDate) : null;
    if (validUntilDate !== undefined) updateData.validUntilDate = validUntilDate ? new Date(validUntilDate) : null;
    if (beforeReadings !== undefined) updateData.beforeReadings = beforeReadings;
    if (afterReadings !== undefined) updateData.afterReadings = afterReadings;
    if (tolerance !== undefined) updateData.tolerance = tolerance;
    if (deviation !== undefined) updateData.deviation = deviation;
    if (uncertainty !== undefined) updateData.uncertainty = uncertainty;
    if (uncertaintyUnit !== undefined) updateData.uncertaintyUnit = uncertaintyUnit;
    if (result !== undefined) updateData.result = result;
    if (isAccepted !== undefined) updateData.isAccepted = isAccepted;
    if (rejectionReason !== undefined) updateData.rejectionReason = rejectionReason;
    if (certificateNumber !== undefined) updateData.certificateNumber = certificateNumber;
    if (certificateUrl !== undefined) updateData.certificateUrl = certificateUrl;
    if (nextCalibrationDate !== undefined) {
      updateData.nextCalibrationDate = nextCalibrationDate ? new Date(nextCalibrationDate) : null;
    }

    const calibration = await prisma.equipmentCalibration.update({
      where: { id: calibrationId },
      data: updateData,
      include: {
        calibrator: { select: { id: true, name: true, surname: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
      },
    });

    // Kalibrasyon tamamlandıysa ekipmanı güncelle
    if (status === 'TAMAMLANDI') {
      const equipmentUpdateData: any = {
        status: isAccepted ? 'AKTIF' : 'ARIZALI',
        lastCalibrationDate: new Date(),
      };

      if (nextCalibrationDate) {
        equipmentUpdateData.nextCalibrationDate = new Date(nextCalibrationDate);
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
          action: 'KALIBRASYON_YAPILDI',
          newValue: JSON.stringify({ calibrationCode: calibration.code, result, isAccepted }),
          comments: `Kalibrasyon tamamlandı: ${calibration.title} - ${isAccepted ? 'Kabul edildi' : 'Reddedildi'}`,
        },
      });
    } else if (status === 'DEVAM_EDIYOR') {
      await prisma.equipment.update({
        where: { id: equipmentId },
        data: { status: 'KALIBRASYONDA' },
      });
    }

    return NextResponse.json(calibration);
  } catch (error) {
    console.error('Error updating calibration:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
