import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { authOptions } from '@/lib/auth-options'

export const dynamic = 'force-dynamic';

const workflowStatusLabels: Record<string, string> = {
  TASLAK: 'Taslak',
  YAYINLANDI: 'Yayınlandı',
  UYGULAMA: 'Uygulama',
  KAPANIS: 'Kapanış',
  DEGERLENDIRME: 'Değerlendirme',
  TAMAMLANDI: 'Tamamlandı',
  IPTAL: 'İptal'
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; approvalId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, approvalId } = await params
    const body = await request.json()
    const { decision, notes } = body // decision: 'ONAYLANDI' | 'REDDEDILDI'

    const approval = await prisma.actionApproval.findUnique({
      where: { id: approvalId },
      include: {
        action: true,
        requestedBy: true
      }
    })

    if (!approval || approval.actionId !== id) {
      return NextResponse.json({ error: 'Approval not found' }, { status: 404 })
    }

    // Sadece onaylayan karar verebilir
    if (approval.approverId !== session.user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    if (approval.status !== 'BEKLIYOR') {
      return NextResponse.json({ error: 'Approval already decided' }, { status: 400 })
    }

    // Onay kaydını güncelle
    await prisma.actionApproval.update({
      where: { id: approvalId },
      data: {
        status: decision,
        decidedAt: new Date(),
        decisionNotes: notes
      }
    })

    // Onaylandiysa durumu geçir
    if (decision === 'ONAYLANDI') {
      await prisma.strategicAction.update({
        where: { id },
        data: {
          workflowStatus: approval.toStatus,
          ...(approval.toStatus === 'TAMAMLANDI' && { completedDate: new Date() })
        }
      })
    }

    // Talep edene bildirim gönder
    await prisma.actionNotification.create({
      data: {
        userId: approval.requestedById,
        type: 'ONAY_SONUCU',
        title: decision === 'ONAYLANDI' ? 'Onay Verildi' : 'Onay Reddedildi',
        message: `${approval.action.code} aksiyonu için ${workflowStatusLabels[approval.toStatus]} talebi ${decision === 'ONAYLANDI' ? 'onaylandı' : 'reddedildi'}`,
        actionId: id
      }
    })

    // Tarihçe
    await prisma.strategicActionHistory.create({
      data: {
        actionId: id,
        userId: session.user.id,
        actionType: decision === 'ONAYLANDI' ? 'ONAYLANDI' : 'REDDEDILDI',
        oldValue: approval.fromStatus,
        newValue: decision === 'ONAYLANDI' ? approval.toStatus : approval.fromStatus,
        comments: notes
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Approval decision error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
