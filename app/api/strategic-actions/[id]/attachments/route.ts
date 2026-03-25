import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { authOptions } from '@/lib/auth-options'
import { generatePresignedUploadUrl, getFileUrl, deleteFile } from '@/lib/s3'

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

    const attachments = await prisma.actionAttachment.findMany({
      where: { actionId: id },
      include: {
        uploadedBy: {
          select: { id: true, name: true, surname: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // URL'leri getir
    const attachmentsWithUrls = await Promise.all(
      attachments.map(async (att: any) => {
        if (att.type === 'FILE' && att.cloudStoragePath) {
          const url = await getFileUrl(att.cloudStoragePath, att.isPublic)
          return { ...att, url }
        }
        return att
      })
    )

    return NextResponse.json(attachmentsWithUrls)
  } catch (error) {
    console.error('Attachments fetch error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
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

    // Aksiyon var mı kontrol et
    const action = await prisma.strategicAction.findUnique({
      where: { id }
    })

    if (!action) {
      return NextResponse.json({ error: 'Action not found' }, { status: 404 })
    }

    // Link ekleme
    if (body.type === 'LINK') {
      const attachment = await prisma.actionAttachment.create({
        data: {
          actionId: id,
          type: 'LINK',
          name: body.name,
          description: body.description,
          url: body.url,
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
          comments: `Link eklendi: ${body.url}`
        }
      })

      return NextResponse.json(attachment)
    }

    // Dosya için presigned URL oluştur
    if (body.type === 'FILE' && body.fileName && body.contentType) {
      const { uploadUrl, cloud_storage_path } = await generatePresignedUploadUrl(
        body.fileName,
        body.contentType,
        body.isPublic || false
      )

      return NextResponse.json({
        uploadUrl,
        cloud_storage_path,
        fileName: body.fileName,
        contentType: body.contentType
      })
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  } catch (error) {
    console.error('Attachment create error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
