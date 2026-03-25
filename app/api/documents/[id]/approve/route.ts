import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const body = await request.json();
    const { action, comments } = body ?? {}; // action: ONAYLANDI, REDDEDILDI

    if (!action) {
      return NextResponse.json({ error: 'Eylem zorunludur' }, { status: 400 });
    }

    // Dokümanı al
    const document = await prisma.document.findUnique({
      where: { id: params?.id },
      include: {
        approvals: {
          where: { approverId: session?.user?.id },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!document) {
      return NextResponse.json({ error: 'Doküman bulunamadı' }, { status: 404 });
    }

    // Kullanıcının onay yetkisi var mı?
    const approval = document?.approvals?.[0];
    if (!approval) {
      return NextResponse.json(
        { error: 'Bu dokümanı onaylama yetkiniz yok' },
        { status: 403 }
      );
    }

    if (approval?.status !== 'BEKLIYOR') {
      return NextResponse.json(
        { error: 'Bu onay zaten işleme alınmış' },
        { status: 400 }
      );
    }

    // Onayı güncelle
    await prisma.approval.update({
      where: { id: approval?.id },
      data: {
        status: action,
        comments: comments || null,
        approvedAt: new Date(),
      },
    });

    // Onay geçmişini kaydet
    await prisma.approvalHistory.create({
      data: {
        approvalId: approval?.id,
        userId: session?.user?.id,
        action,
        comments: comments || null,
      },
    });

    // Eğer onaylanmışsa, doküman durumunu güncelle
    if (action === 'ONAYLANDI') {
      // Tüm onaylar tamamlandı mı?
      const allApprovals = await prisma.approval.findMany({
        where: { documentId: params?.id },
      });

      const allApproved = allApprovals?.every?.(a => a?.status === 'ONAYLANDI') ?? false;

      if (allApproved) {
        await prisma.document.update({
          where: { id: params?.id },
          data: {
            status: 'ONAYLANDI',
            approvedById: session?.user?.id,
            approvedAt: new Date(),
          },
        });
      }
    } else if (action === 'REDDEDILDI') {
      await prisma.document.update({
        where: { id: params?.id },
        data: {
          status: 'TASLAK',
        },
      });
    }

    return NextResponse.json({
      message: action === 'ONAYLANDI' ? 'Doküman onaylandı' : 'Doküman reddedildi',
    });
  } catch (error) {
    console.error('Document approve POST error:', error);
    return NextResponse.json(
      { error: 'Onay işlemi sırasında hata oluştu' },
      { status: 500 }
    );
  }
}
