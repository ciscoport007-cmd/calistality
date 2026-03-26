import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export const dynamic = 'force-dynamic';

// Risk detayı
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const risk = await prisma.oHSRisk.findUnique({
      where: { id: params.id },
      include: {
        department: { select: { id: true, name: true, code: true } },
        owner: { select: { id: true, name: true, surname: true, email: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
        actions: {
          orderBy: { createdAt: 'desc' },
          include: {
            assignee: { select: { id: true, name: true, surname: true } },
            completedBy: { select: { id: true, name: true, surname: true } },
            createdBy: { select: { id: true, name: true, surname: true } },
          },
        },
        assessments: {
          orderBy: { createdAt: 'desc' },
          include: {
            createdBy: { select: { id: true, name: true, surname: true } },
          },
        },
        comments: {
          orderBy: { createdAt: 'desc' },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                surname: true,
                role: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    if (!risk) {
      return NextResponse.json(
        { error: 'Risk bulunamadı' },
        { status: 404 }
      );
    }

    return NextResponse.json(risk);
  } catch (error) {
    console.error('OHS risk fetch error:', error);
    return NextResponse.json(
      { error: 'Risk alınamadı' },
      { status: 500 }
    );
  }
}

// Risk güncelle
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const body = await request.json();

    // Eğer likelihood veya impact güncellenmişse, riskScore'u yeniden hesapla
    if (body.likelihood !== undefined || body.impact !== undefined) {
      const currentRisk = await prisma.oHSRisk.findUnique({
        where: { id: params.id },
      });

      if (currentRisk) {
        const likelihood = body.likelihood ?? currentRisk.likelihood;
        const impact = body.impact ?? currentRisk.impact;
        body.riskScore = likelihood * impact;

        // Risk seviyesi güncelle
        if (body.riskScore >= 20) body.riskLevel = 'KRITIK';
        else if (body.riskScore >= 15) body.riskLevel = 'COK_YUKSEK';
        else if (body.riskScore >= 10) body.riskLevel = 'YUKSEK';
        else if (body.riskScore >= 5) body.riskLevel = 'ORTA';
        else body.riskLevel = 'DUSUK';
      }
    }

    const risk = await prisma.oHSRisk.update({
      where: { id: params.id },
      data: body,
      include: {
        department: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true, surname: true } },
      },
    });

    return NextResponse.json(risk);
  } catch (error) {
    console.error('OHS risk update error:', error);
    return NextResponse.json(
      { error: 'Risk güncellenemedi' },
      { status: 500 }
    );
  }
}

// Risk sil
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    await prisma.oHSRisk.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('OHS risk delete error:', error);
    return NextResponse.json(
      { error: 'Risk silinemedi' },
      { status: 500 }
    );
  }
}
