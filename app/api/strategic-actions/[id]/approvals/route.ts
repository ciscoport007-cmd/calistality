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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const approvals = await prisma.actionApproval.findMany({
      where: { actionId: id },
      include: {
        requestedBy: {
          select: { id: true, name: true, surname: true }
        },
        approver: {
          select: { id: true, name: true, surname: true }
        }
      },
      orderBy: { requestedAt: 'desc' }
    })

    return NextResponse.json(approvals)
  } catch (error) {
    console.error('Approvals fetch error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
