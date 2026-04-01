import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { createNotification } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

// Risk listesi
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status');
    const source = searchParams.get('source');
    const departmentId = searchParams.get('departmentId');
    const minScore = searchParams.get('minScore');

    const where: any = { isActive: true };

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (source) {
      where.source = source;
    }

    if (departmentId) {
      where.departmentId = departmentId;
    }

    if (minScore) {
      where.riskScore = { gte: parseInt(minScore) };
    }

    const risks = await prisma.oHSRisk.findMany({
      where,
      include: {
        department: { select: { id: true, name: true, code: true } },
        owner: { select: { id: true, name: true, surname: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
        actions: {
          where: { status: { in: ['OLUSTURULDU', 'DEVAM_EDIYOR'] } },
        },
        assessments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: {
          select: {
            actions: true,
            assessments: true,
            comments: true,
          },
        },
      },
      orderBy: [{ riskScore: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json(risks);
  } catch (error) {
    console.error('OHS risks fetch error:', error);
    return NextResponse.json(
      { error: 'Riskler alınamadı' },
      { status: 500 }
    );
  }
}

// Yeni risk oluştur
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    // İSG Uzmanı rolü kontrolü
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { role: true },
    });

    const allowedRoles = ['Admin', 'Yönetici', 'İSG Uzmanı', 'İş Güvenliği Uzmanı', 'Kalite Müdürü'];
    if (!user?.role || !allowedRoles.some(r => user.role?.name.includes(r))) {
      return NextResponse.json(
        { error: 'Sadece İSG Uzmanları risk kaydı oluşturabilir' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      description,
      source,
      sourceDetail,
      departmentId,
      ownerId,
      likelihood,
      impact,
      // Kanıt doküman
      evidenceFileName,
      evidenceFileSize,
      evidenceFileType,
      evidenceCloudPath,
      evidenceIsPublic,
    } = body;

    // Validasyon
    if (!name || !source || !departmentId || !ownerId || !likelihood || !impact) {
      return NextResponse.json(
        { error: 'Zorunlu alanlar eksik' },
        { status: 400 }
      );
    }

    // Risk puanı hesapla
    const riskScore = likelihood * impact;

    // Risk seviyesi belirle
    let riskLevel = 'DUSUK';
    if (riskScore >= 20) riskLevel = 'KRITIK';
    else if (riskScore >= 15) riskLevel = 'COK_YUKSEK';
    else if (riskScore >= 10) riskLevel = 'YUKSEK';
    else if (riskScore >= 5) riskLevel = 'ORTA';

    // Kod oluştur
    const year = new Date().getFullYear();
    const lastRisk = await prisma.oHSRisk.findFirst({
      where: { code: { startsWith: `ISG-${year}` } },
      orderBy: { code: 'desc' },
    });

    let nextNumber = 1;
    if (lastRisk) {
      const lastNumber = parseInt(lastRisk.code.split('-')[2]);
      nextNumber = lastNumber + 1;
    }
    const code = `ISG-${year}-${nextNumber.toString().padStart(4, '0')}`;

    const risk = await prisma.oHSRisk.create({
      data: {
        code,
        name,
        description,
        source,
        sourceDetail,
        departmentId,
        ownerId,
        likelihood,
        impact,
        riskScore,
        riskLevel,
        evidenceFileName,
        evidenceFileSize,
        evidenceFileType,
        evidenceCloudPath,
        evidenceIsPublic: evidenceIsPublic || false,
        createdById: session.user.id,
      },
      include: {
        department: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true, surname: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
      },
    });

    // Risk puanı 15 ve üzeri ise bildirim gönder
    if (riskScore >= 15) {
      // Yöneticileri bul
      const managers = await prisma.user.findMany({
        where: {
          isActive: true,
          role: {
            name: {
              in: ['Genel Müdür', 'Kalite Müdürü', 'İnsan Kaynakları Müdürü', 'Finans Müdürü'],
            },
          },
        },
      });

      const ownerInfo = risk.owner;
      const deptInfo = risk.department;

      for (const manager of managers) {
        await createNotification({
          userId: manager.id,
          type: 'UYARI',
          title: 'Yüksek İSG Riski Tespit Edildi',
          message: `${name} - Puan: ${riskScore} - Departman: ${deptInfo?.name || '-'} - Risk Sahibi: ${ownerInfo?.name || ''} ${ownerInfo?.surname || ''}`,
          link: `/dashboard/ohs/risks/${risk.id}`,
        });
      }
    }

    return NextResponse.json(risk, { status: 201 });
  } catch (error) {
    console.error('OHS risk create error:', error);
    return NextResponse.json(
      { error: 'Risk oluşturulamadı' },
      { status: 500 }
    );
  }
}
