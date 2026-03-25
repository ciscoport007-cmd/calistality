import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

// POST - Aksiyonu kapat (kanıt zorunluluğu ile)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { closingNotes, skipEvidenceCheck = false } = body;

    // Aksiyonu getir
    const action = await prisma.strategicAction.findUnique({
      where: { id },
      include: {
        attachments: {
          where: { isClosingEvidence: true }
        },
        milestones: true
      }
    });

    if (!action) {
      return NextResponse.json(
        { error: 'Aksiyon bulunamadı' },
        { status: 404 }
      );
    }

    // Zaten tamamlanmış mı kontrol et
    if (action.status === 'TAMAMLANDI') {
      return NextResponse.json(
        { error: 'Aksiyon zaten tamamlanmış' },
        { status: 400 }
      );
    }

    // Kanıt zorunluluğu kontrolü
    if (action.closingEvidenceRequired && !skipEvidenceCheck) {
      // En az bir kapanış kanıtı dosyası olmalı
      if (action.attachments.length === 0) {
        return NextResponse.json(
          { 
            error: 'Kapanış için kanıt dokümanı zorunludur',
            code: 'EVIDENCE_REQUIRED' 
          },
          { status: 400 }
        );
      }
    }

    // Tüm kilometre taşları tamamlanmış mı kontrol et (isteğe bağlı uyarı)
    const incompleteMilestones = action.milestones.filter(
      m => m.status !== 'TAMAMLANDI' && m.status !== 'IPTAL'
    );

    // Aksiyonu güncelle
    const updatedAction = await prisma.strategicAction.update({
      where: { id },
      data: {
        status: 'TAMAMLANDI',
        workflowStatus: 'TAMAMLANDI',
        progress: 100,
        completedDate: new Date(),
        closingDate: new Date(),
        closingNotes: closingNotes || null,
        closedById: session.user.id
      },
      include: {
        responsible: { select: { id: true, name: true } },
        accountable: { select: { id: true, name: true } },
        closedBy: { select: { id: true, name: true } },
        attachments: {
          where: { isClosingEvidence: true },
          include: {
            uploadedBy: { select: { id: true, name: true } }
          }
        }
      }
    });

    // Tarihçe kaydı
    await prisma.strategicActionHistory.create({
      data: {
        actionId: id,
        userId: session.user.id,
        actionType: 'TAMAMLANDI',
        oldValue: action.status,
        newValue: 'TAMAMLANDI',
        comments: closingNotes || 'Aksiyon tamamlandı'
      }
    });

    return NextResponse.json({
      ...updatedAction,
      incompleteMilestonesCount: incompleteMilestones.length,
      message: 'Aksiyon başarıyla tamamlandı'
    });
  } catch (error) {
    console.error('Error closing action:', error);
    return NextResponse.json(
      { error: 'Aksiyon kapatılırken hata oluştu' },
      { status: 500 }
    );
  }
}
