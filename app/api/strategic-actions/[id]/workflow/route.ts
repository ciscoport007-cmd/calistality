import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { authOptions } from '@/lib/auth-options'

const workflowStatusLabels: Record<string, string> = {
  TASLAK: 'Taslak',
  YAYINLANDI: 'Yayınlandı',
  UYGULAMA: 'Uygulama',
  KAPANIS: 'Kapanış',
  DEGERLENDIRME: 'Değerlendirme',
  TAMAMLANDI: 'Tamamlandı',
  IPTAL: 'İptal'
}

// Geçerli geçişler
const validTransitions: Record<string, string[]> = {
  TASLAK: ['YAYINLANDI', 'IPTAL'],
  YAYINLANDI: ['UYGULAMA', 'TASLAK', 'IPTAL'],
  UYGULAMA: ['KAPANIS', 'BLOKAJ', 'IPTAL'],
  KAPANIS: ['DEGERLENDIRME', 'UYGULAMA'],
  DEGERLENDIRME: ['TAMAMLANDI', 'KAPANIS'],
  TAMAMLANDI: [],
  IPTAL: ['TASLAK']
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { toStatus, notes, requestApproval } = body

    const action = await prisma.strategicAction.findUnique({
      where: { id },
      include: {
        responsible: true,
        accountable: true
      }
    })

    if (!action) {
      return NextResponse.json({ error: 'Action not found' }, { status: 404 })
    }

    const currentStatus = action.workflowStatus
    const allowedTransitions = validTransitions[currentStatus] || []

    if (!allowedTransitions.includes(toStatus)) {
      return NextResponse.json(
        { error: `${workflowStatusLabels[currentStatus]} durumundan ${workflowStatusLabels[toStatus]} durumuna geçiş yapılamaz` },
        { status: 400 }
      )
    }

    // Onay gerektiren geçişler
    const requiresApproval = ['YAYINLANDI', 'TAMAMLANDI'].includes(toStatus)

    if (requiresApproval && requestApproval && action.accountableId) {
      // Onay talebi oluştur
      const approval = await prisma.actionApproval.create({
        data: {
          actionId: id,
          fromStatus: currentStatus,
          toStatus,
          requestedById: session.user.id,
          approverId: action.accountableId,
          status: 'BEKLIYOR',
          requestNotes: notes
        }
      })

      // Onaylayanlara bildirim gönder
      await prisma.actionNotification.create({
        data: {
          userId: action.accountableId,
          type: 'ONAY_BEKLIYOR',
          title: 'Onay Bekliyor',
          message: `${action.code} aksiyonu için ${workflowStatusLabels[toStatus]} onayı bekleniyor`,
          actionId: id
        }
      })

      // Tarihçe
      await prisma.strategicActionHistory.create({
        data: {
          actionId: id,
          userId: session.user.id,
          actionType: 'ONAY_TALEP_EDILDI',
          oldValue: currentStatus,
          newValue: toStatus,
          comments: notes
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Onay talebi gönderildi',
        approval
      })
    }

    // Doğrudan geçiş yap
    const updated = await prisma.strategicAction.update({
      where: { id },
      data: {
        workflowStatus: toStatus,
        ...(toStatus === 'TAMAMLANDI' && { completedDate: new Date() })
      }
    })

    // İlgili kişilere bildirim
    const notifyUsers = new Set<string>()
    if (action.responsibleId && action.responsibleId !== session.user.id) {
      notifyUsers.add(action.responsibleId)
    }
    if (action.accountableId && action.accountableId !== session.user.id) {
      notifyUsers.add(action.accountableId)
    }

    for (const userId of notifyUsers) {
      await prisma.actionNotification.create({
        data: {
          userId,
          type: 'AKSIYON_DURUM_DEGISTI',
          title: 'Durum Değişti',
          message: `${action.code} aksiyonu ${workflowStatusLabels[toStatus]} durumuna geçti`,
          actionId: id
        }
      })
    }

    // Tarihçe
    await prisma.strategicActionHistory.create({
      data: {
        actionId: id,
        userId: session.user.id,
        actionType: 'IS_AKISI_DEGISTI',
        oldValue: currentStatus,
        newValue: toStatus,
        comments: notes
      }
    })

    return NextResponse.json({
      success: true,
      action: updated
    })
  } catch (error) {
    console.error('Workflow transition error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
