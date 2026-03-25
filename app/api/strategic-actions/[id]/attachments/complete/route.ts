import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { authOptions } from '@/lib/auth-options'

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

    const attachment = await prisma.actionAttachment.create({
      data: {
        actionId: id,
        type: 'FILE',
        name: body.name,
        description: body.description,
        fileName: body.fileName,
        fileSize: body.fileSize,
        mimeType: body.mimeType,
        cloudStoragePath: body.cloud_storage_path,
        isPublic: body.isPublic || false,
        uploadedById: session.user.id
      },
      include: {
        uploadedBy: {
          select: { id: true, name: true, surname: true }
        }
      }
    })

    // Tarihçe kaydet
    await prisma.strategicActionHistory.create({
      data: {
        actionId: id,
        userId: session.user.id,
        actionType: 'EK_EKLENDI',
        newValue: body.name,
        comments: `Dosya yüklendi: ${body.fileName}`
      }
    })

    return NextResponse.json(attachment)
  } catch (error) {
    console.error('Attachment complete error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
