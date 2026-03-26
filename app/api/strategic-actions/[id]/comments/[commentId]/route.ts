import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { authOptions } from '@/lib/auth-options'

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, commentId } = await params
    const body = await request.json()

    const comment = await prisma.actionComment.findUnique({
      where: { id: commentId }
    })

    if (!comment || comment.actionId !== id) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    // Sadece yazar düzenleyebilir
    if (comment.authorId !== session.user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const updated = await prisma.actionComment.update({
      where: { id: commentId },
      data: {
        content: body.content,
        isEdited: true
      },
      include: {
        author: {
          select: { id: true, name: true, surname: true, email: true }
        },
        mentionedUsers: {
          include: {
            user: {
              select: { id: true, name: true, surname: true }
            }
          }
        }
      }
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Comment update error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, commentId } = await params

    const comment = await prisma.actionComment.findUnique({
      where: { id: commentId }
    })

    if (!comment || comment.actionId !== id) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    // Sadece yazar silebilir
    if (comment.authorId !== session.user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    await prisma.actionComment.delete({
      where: { id: commentId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Comment delete error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
