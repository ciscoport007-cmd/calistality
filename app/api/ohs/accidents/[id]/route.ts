import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export const dynamic = 'force-dynamic';

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

    const accident = await prisma.oHSAccident.findUnique({
      where: { id },
      include: {
        department: { select: { id: true, name: true, code: true } },
        createdBy: { select: { id: true, name: true, surname: true, email: true } },
        involvedPersons: {
          include: {
            user: { select: { id: true, name: true, surname: true, email: true } },
            personDepartment: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!accident) {
      return NextResponse.json({ error: 'Kaza bulunamadı' }, { status: 404 });
    }

    return NextResponse.json(accident);
  } catch (error) {
    console.error('OHS accident fetch error:', error);
    return NextResponse.json({ error: 'Kaza detayı alınamadı' }, { status: 500 });
  }
}

export async function PATCH(
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

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { role: true },
    });

    const allowedRoles = ['Admin', 'Yönetici', 'İSG Uzmanı', 'İş Güvenliği Uzmanı', 'Kalite Müdürü'];
    if (!user?.role || !allowedRoles.some(r => user.role?.name.includes(r))) {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 });
    }

    const {
      title, accidentDate, location, departmentId, description,
      rootCauseAnalysis, actionsTaken, preventiveMeasures, status,
      trainingStatus, trainingDate, trainingCertFileName, trainingCertFileSize,
      trainingCertCloudPath, trainingCertIsPublic, trainingCompletedAt,
    } = body;

    const updateData: any = {};

    if (title) updateData.title = title;
    if (accidentDate) updateData.accidentDate = new Date(accidentDate);
    if (location) updateData.location = location;
    if (departmentId) updateData.departmentId = departmentId;
    if (description) updateData.description = description;
    if (rootCauseAnalysis !== undefined) updateData.rootCauseAnalysis = rootCauseAnalysis;
    if (actionsTaken !== undefined) updateData.actionsTaken = actionsTaken;
    if (preventiveMeasures !== undefined) updateData.preventiveMeasures = preventiveMeasures;
    if (status) updateData.status = status;

    // Training fields
    if (trainingStatus !== undefined) updateData.trainingStatus = trainingStatus;
    if (trainingDate !== undefined) updateData.trainingDate = trainingDate ? new Date(trainingDate) : null;
    if (trainingCertFileName !== undefined) updateData.trainingCertFileName = trainingCertFileName;
    if (trainingCertFileSize !== undefined) updateData.trainingCertFileSize = trainingCertFileSize;
    if (trainingCertCloudPath !== undefined) updateData.trainingCertCloudPath = trainingCertCloudPath;
    if (trainingCertIsPublic !== undefined) updateData.trainingCertIsPublic = trainingCertIsPublic;
    if (trainingCompletedAt !== undefined) updateData.trainingCompletedAt = trainingCompletedAt ? new Date(trainingCompletedAt) : null;

    // Eğitim dokümanı yüklendiğinde otomatik TAMAMLANDI durumuna geç
    if (trainingCertCloudPath && trainingCompletedAt) {
      updateData.status = 'TAMAMLANDI';
    }

    const accident = await prisma.oHSAccident.update({
      where: { id },
      data: updateData,
      include: {
        department: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
        involvedPersons: {
          include: {
            user: { select: { id: true, name: true, surname: true } },
            personDepartment: { select: { id: true, name: true } },
          },
        },
      },
    });

    return NextResponse.json(accident);
  } catch (error) {
    console.error('OHS accident update error:', error);
    return NextResponse.json({ error: 'Kaza güncellenemedi' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { role: true },
    });

    const allowedRoles = ['Admin', 'Yönetici'];
    if (!user?.role || !allowedRoles.some(r => user.role?.name.includes(r))) {
      return NextResponse.json({ error: 'Silme yetkisi yalnızca yöneticilere aittir' }, { status: 403 });
    }

    await prisma.oHSAccident.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('OHS accident delete error:', error);
    return NextResponse.json({ error: 'Kaza silinemedi' }, { status: 500 });
  }
}
