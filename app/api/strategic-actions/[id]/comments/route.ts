import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { authOptions } from '@/lib/auth-options'

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

    const comments = await prisma.actionComment.findMany({
      where: { 
        actionId: id,
        parentId: null // Sadece ana yorumlar
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
        },
        replies: {
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
          },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(comments)
  } catch (error) {
    console.error('Comments fetch error:', error)
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

    if (!body.content?.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    // Aksiyon var mı kontrol et
    const action = await prisma.strategicAction.findUnique({
      where: { id },
      include: { responsible: true, accountable: true }
    })

    if (!action) {
      return NextResponse.json({ error: 'Action not found' }, { status: 404 })
    }

    // @mention'ları parse et
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g
    const mentions: string[] = []
    let match
    while ((match = mentionRegex.exec(body.content)) !== null) {
      mentions.push(match[2]) // userId
    }

    // Yorum oluştur
    const comment = await prisma.actionComment.create({
      data: {
        actionId: id,
        content: body.content,
        authorId: session.user.id,
        parentId: body.parentId || null
      },
      include: {
        author: {
          select: { id: true, name: true, surname: true, email: true }
        }
      }
    })

    // Mention ilişkilerini oluştur ve bildirim gönder
    if (mentions.length > 0) {
      const uniqueMentions = [...new Set(mentions)]
      
      for (const userId of uniqueMentions) {
        // Mention kaydı
        await prisma.actionCommentMention.create({
          data: {
            commentId: comment.id,
            userId
          }
        }).catch(() => {}) // Duplicate ı yoksay

        // Bildirim gönder
        if (userId !== session.user.id) {
          await prisma.actionNotification.create({
            data: {
              userId,
              type: 'AKSIYON_MENTION',
              title: 'Yorumda Etiketlendiniz',
              message: `${session.user.name} sizi ${action.code} aksiyonunda etiketledi`,
              actionId: id,
              commentId: comment.id
            }
          })
        }
      }
    }

    // Yorum bildirimi (aksiyon sahibi ve onaylayan için)
    const notifyUsers = new Set<string>()
    if (action.responsibleId && action.responsibleId !== session.user.id) {
      notifyUsers.add(action.responsibleId)
    }
    if (action.accountableId && action.accountableId !== session.user.id) {
      notifyUsers.add(action.accountableId)
    }

    // Mention edilen kullanıcıları çıkar (zaten bildirim gönderildi)
    mentions.forEach(m => notifyUsers.delete(m))

    for (const userId of notifyUsers) {
      await prisma.actionNotification.create({
        data: {
          userId,
          type: 'AKSIYON_YORUM',
          title: 'Yeni Yorum',
          message: `${session.user.name} ${action.code} aksiyonuna yorum ekledi`,
          actionId: id,
          commentId: comment.id
        }
      })
    }

    // Tarihçe kaydet
    await prisma.strategicActionHistory.create({
      data: {
        actionId: id,
        userId: session.user.id,
        actionType: 'YORUM_EKLENDI',
        comments: body.content.substring(0, 200)
      }
    })

    // Yanıtlarla birlikte dön
    const fullComment = await prisma.actionComment.findUnique({
      where: { id: comment.id },
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
        },
        replies: {
          include: {
            author: {
              select: { id: true, name: true, surname: true, email: true }
            }
          }
        }
      }
    })

    return NextResponse.json(fullComment)
  } catch (error) {
    console.error('Comment create error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
