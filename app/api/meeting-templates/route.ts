import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET - Toplantı şablonları listesi
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const templates = await prisma.meetingTemplate.findMany({
      where: {
        createdById: session.user.id,
      },
      include: {
        participants: {
          select: {
            userId: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Kullanıcı bilgilerini getir
    const userIds = [...new Set(templates.flatMap((t: any) => t.participants.map((p: any) => p.userId)))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, surname: true, email: true },
    });

    const usersMap = new Map(users.map((u: any) => [u.id, u]));

    const result = templates.map((template: any) => ({
      id: template.id,
      name: template.name,
      description: template.description,
      users: template.participants.map((p: any) => usersMap.get(p.userId)).filter(Boolean),
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Meeting templates fetch error:', error);
    return NextResponse.json(
      { error: 'Şablonlar getirilirken hata oluştu' },
      { status: 500 }
    );
  }
}

// POST - Yeni şablon oluştur
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, participants } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Şablon adı zorunludur' },
        { status: 400 }
      );
    }

    const template = await prisma.meetingTemplate.create({
      data: {
        name,
        description,
        createdById: session.user.id,
        participants: participants?.length > 0 ? {
          create: participants.filter((id: string | null): id is string => id !== null).map((userId: string) => ({ userId })),
        } : undefined,
      },
      include: {
        participants: {
          select: { userId: true },
        },
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error('Meeting template create error:', error);
    return NextResponse.json(
      { error: 'Şablon oluşturulurken hata oluştu' },
      { status: 500 }
    );
  }
}
