import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { authOptions } from '@/lib/auth-options'
import { deleteFile } from '@/lib/storage'

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, attachmentId } = await params

    const attachment = await prisma.actionAttachment.findUnique({
      where: { id: attachmentId }
    })

    if (!attachment || attachment.actionId !== id) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 })
    }

    // S3'ten dosyayı sil
    if (attachment.type === 'FILE' && attachment.cloudStoragePath) {
      await deleteFile(attachment.cloudStoragePath)
    }

    await prisma.actionAttachment.delete({
      where: { id: attachmentId }
    })

    // Tarihçe kaydet
    await prisma.strategicActionHistory.create({
      data: {
        actionId: id,
        userId: session.user.id,
        actionType: 'EK_SILINDI',
        oldValue: attachment.name
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Attachment delete error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
