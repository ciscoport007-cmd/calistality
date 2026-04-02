import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const equipmentId = searchParams.get('equipmentId');
    const outOfRangeOnly = searchParams.get('outOfRangeOnly') === 'true';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: Record<string, unknown> = {};
    if (equipmentId) where.equipmentId = equipmentId;
    if (outOfRangeOnly) where.isOutOfRange = true;
    if (startDate || endDate) {
      where.measuredAt = {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate) }),
      };
    }

    const logs = await prisma.hACCPTemperatureLog.findMany({
      where,
      include: {
        equipment: { select: { id: true, code: true, name: true, location: true, minTemp: true, maxTemp: true } },
        measuredBy: { select: { id: true, name: true, surname: true } },
        correctiveActionBy: { select: { id: true, name: true, surname: true } },
      },
      orderBy: { measuredAt: 'desc' },
      take: 200,
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error('HACCP temperature logs fetch error:', error);
    return NextResponse.json({ error: 'Sıcaklık kayıtları alınamadı' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const body = await request.json();
    const { equipmentId, temperature, measuredAt, notes } = body;

    if (!equipmentId || temperature === undefined || temperature === '') {
      return NextResponse.json({ error: 'Ekipman ve sıcaklık değeri zorunludur' }, { status: 400 });
    }

    const equipment = await prisma.hACCPEquipment.findUnique({
      where: { id: equipmentId },
    });

    if (!equipment) {
      return NextResponse.json({ error: 'Ekipman bulunamadı' }, { status: 404 });
    }

    const temp = parseFloat(temperature);
    const isOutOfRange =
      (equipment.minTemp !== null && temp < equipment.minTemp) ||
      (equipment.maxTemp !== null && temp > equipment.maxTemp);

    const log = await prisma.hACCPTemperatureLog.create({
      data: {
        equipmentId,
        temperature: temp,
        measuredAt: measuredAt ? new Date(measuredAt) : new Date(),
        isOutOfRange,
        notes: notes || null,
        measuredById: session.user.id,
      },
      include: {
        equipment: { select: { id: true, code: true, name: true, location: true, minTemp: true, maxTemp: true, createdById: true } },
        measuredBy: { select: { id: true, name: true, surname: true } },
      },
    });

    // Limit dışına çıkınca ilgili kişilere bildirim gönder
    if (isOutOfRange) {
      const notifyUsers = await prisma.user.findMany({
        where: {
          isActive: true,
          OR: [
            { id: log.equipment.createdById },
            { role: { name: { contains: 'Admin', mode: 'insensitive' } } },
            { role: { name: { contains: 'Kalite', mode: 'insensitive' } } },
            { role: { name: { contains: 'HACCP', mode: 'insensitive' } } },
            { role: { name: { contains: 'Gıda', mode: 'insensitive' } } },
            { role: { name: { contains: 'Yönetici', mode: 'insensitive' } } },
            { role: { name: { contains: 'Müdür', mode: 'insensitive' } } },
          ],
        },
        select: { id: true },
      });

      const uniqueIds = [...new Set(notifyUsers.map((u) => u.id))];
      if (uniqueIds.length > 0) {
        await prisma.notification.createMany({
          data: uniqueIds.map((userId) => ({
            userId,
            title: '⚠️ Limit Dışı Sıcaklık Uyarısı',
            message: `${log.equipment.name} (${log.equipment.location}) ekipmanında sıcaklık ${temp}°C olarak ölçüldü. Limit: ${log.equipment.minTemp ?? '–'}°C / ${log.equipment.maxTemp ?? '–'}°C. Düzeltici faaliyet gerekli.`,
            type: 'UYARI',
            link: '/dashboard/haccp/temperature',
          })),
          skipDuplicates: true,
        });
      }
    }

    return NextResponse.json({ ...log, isOutOfRange }, { status: 201 });
  } catch (error) {
    console.error('HACCP temperature log create error:', error);
    return NextResponse.json({ error: 'Sıcaklık kaydı oluşturulamadı' }, { status: 500 });
  }
}
