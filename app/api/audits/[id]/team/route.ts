import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { createNotification, NotificationTemplates } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

// Ekip üyeleri listesi
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await params;

    const teamMembers = await prisma.auditTeamMember.findMany({
      where: { auditId: id },
      include: {
        user: {
          select: { id: true, name: true, surname: true, email: true }
        }
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(teamMembers);
  } catch (error) {
    console.error('Ekip listesi hatası:', error);
    return NextResponse.json({ error: 'Ekip yüklenirken hata oluştu' }, { status: 500 });
  }
}

// Ekip üyesi ekle
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id: auditId } = await params;
    const body = await request.json();
    const { userId, role } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'Kullanıcı zorunludur' },
        { status: 400 }
      );
    }

    // Kullanıcının zaten ekipte olup olmadığını kontrol et
    const existingMember = await prisma.auditTeamMember.findUnique({
      where: {
        auditId_userId: {
          auditId,
          userId,
        }
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: 'Bu kullanıcı zaten ekipte' },
        { status: 400 }
      );
    }

    const teamMember = await prisma.auditTeamMember.create({
      data: {
        auditId,
        userId,
        role: role || 'DENETCI',
      },
      include: {
        user: {
          select: { id: true, name: true, surname: true, email: true }
        }
      },
    });

    // History kaydı
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, surname: true },
    });

    await prisma.auditHistory.create({
      data: {
        auditId,
        userId: session.user.id as string,
        action: 'EKIP_UYELIK',
        newValue: `${user?.name} ${user?.surname || ''} ekibe eklendi (${role || 'DENETCI'})`,
      },
    });

    // Eklenen kullanıcıya bildirim gönder
    if (userId !== session.user.id) {
      const audit = await prisma.audit.findUnique({ 
        where: { id: auditId }, 
        select: { code: true, title: true } 
      });
      const template = NotificationTemplates.auditAssigned(audit?.code || '');
      await createNotification({
        userId,
        title: template.title,
        message: `${audit?.code || ''} kodlu "${audit?.title || ''}" denetimine ${role === 'BAS_DENETCI' ? 'Baş Denetçi' : 'Denetçi'} olarak atandınız.`,
        type: template.type,
        link: `/dashboard/audits/${auditId}`,
      });
    }

    return NextResponse.json(teamMember, { status: 201 });
  } catch (error) {
    console.error('Ekip üyesi ekleme hatası:', error);
    return NextResponse.json({ error: 'Ekip üyesi eklenirken hata oluştu' }, { status: 500 });
  }
}

// Ekip üyesi güncelle
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const body = await request.json();
    const { memberId, role } = body;

    if (!memberId || !role) {
      return NextResponse.json({ error: 'Üye ID ve rol zorunludur' }, { status: 400 });
    }

    const teamMember = await prisma.auditTeamMember.update({
      where: { id: memberId },
      data: { role },
      include: {
        user: {
          select: { id: true, name: true, surname: true, email: true }
        }
      },
    });

    return NextResponse.json(teamMember);
  } catch (error) {
    console.error('Ekip üyesi güncelleme hatası:', error);
    return NextResponse.json({ error: 'Ekip üyesi güncellenirken hata oluştu' }, { status: 500 });
  }
}

// Ekip üyesi sil
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id: auditId } = await params;
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');

    if (!memberId) {
      return NextResponse.json({ error: 'Üye ID zorunludur' }, { status: 400 });
    }

    const member = await prisma.auditTeamMember.findUnique({
      where: { id: memberId },
      include: {
        user: {
          select: { name: true, surname: true },
        },
      },
    });

    await prisma.auditTeamMember.delete({
      where: { id: memberId },
    });

    // History kaydı
    if (member) {
      await prisma.auditHistory.create({
        data: {
          auditId,
          userId: session.user.id as string,
          action: 'EKIP_CIKARILDI',
          newValue: `${member.user?.name ?? ''} ${member.user?.surname || ''} ekipten çıkarıldı`,
        },
      });
    }

    return NextResponse.json({ message: 'Ekip üyesi silindi' });
  } catch (error) {
    console.error('Ekip üyesi silme hatası:', error);
    return NextResponse.json({ error: 'Ekip üyesi silinirken hata oluştu' }, { status: 500 });
  }
}
