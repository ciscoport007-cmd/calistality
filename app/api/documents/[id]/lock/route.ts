import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { PrismaClient } from '@prisma/client';
import { createAuditLog, isStrictAdmin } from '@/lib/audit';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

// Check-out (Kilitle)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    // Sadece Admin kullanıcılar dosya kilitleyebilir (Yönetici hariç)
    const userRole = (session.user as any).role?.name || (session.user as any).role || '';
    if (!isStrictAdmin(userRole)) {
      return NextResponse.json(
        { error: 'Dosya kilitleme yetkisi sadece Admin kullanıcılara aittir' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { reason, password } = body;

    // Şifre doğrulaması zorunlu
    if (!password) {
      return NextResponse.json({ error: 'Şifre doğrulaması gereklidir' }, { status: 400 });
    }

    // Kullanıcının şifresini doğrula
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true },
    });

    if (!user || !user.password) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Şifre hatalı' }, { status: 401 });
    }

    // Dokümanı kontrol et
    const document = await prisma.document.findUnique({
      where: { id },
      include: { lockedBy: true },
    });

    if (!document) {
      return NextResponse.json({ error: 'Doküman bulunamadı' }, { status: 404 });
    }

    // Zaten kilitli mi kontrol et
    if (document.isLockedForEdit) {
      return NextResponse.json(
        { 
          error: 'Doküman zaten kilitli',
          lockedBy: document.lockedBy?.name,
          lockedAt: document.lockedAt
        },
        { status: 409 }
      );
    }

    // Kilitle
    const updatedDoc = await prisma.document.update({
      where: { id },
      data: {
        isLockedForEdit: true,
        lockedById: session.user.id,
        lockedAt: new Date(),
        lockReason: reason || null,
      },
      include: {
        lockedBy: { select: { id: true, name: true, email: true } },
      },
    });

    // Audit log
    await createAuditLog({
      userId: session.user.id,
      action: 'CHECK_OUT',
      module: 'DOKUMAN',
      entityType: 'Document',
      entityId: id,
      newValues: { lockedBy: session.user.name, reason },
    });

    return NextResponse.json({
      message: 'Doküman başarıyla kilitlendi (check-out)',
      document: updatedDoc,
    });
  } catch (error) {
    console.error('Document lock error:', error);
    return NextResponse.json(
      { error: 'Doküman kilitlenirken hata oluştu' },
      { status: 500 }
    );
  }
}

// Check-in (Kilidi Kaldır)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    // Sadece Admin kullanıcılar kilit kaldırabilir (Yönetici hariç)
    const userRole = (session.user as any).role?.name || (session.user as any).role || '';
    if (!isStrictAdmin(userRole)) {
      return NextResponse.json(
        { error: 'Dosya kilidi kaldırma yetkisi sadece Admin kullanıcılara aittir' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Dokümanı kontrol et
    const document = await prisma.document.findUnique({
      where: { id },
      include: { lockedBy: true },
    });

    if (!document) {
      return NextResponse.json({ error: 'Doküman bulunamadı' }, { status: 404 });
    }

    // Kilit yoksa
    if (!document.isLockedForEdit) {
      return NextResponse.json({ message: 'Doküman zaten kilitli değil' });
    }

    // Kilidi kaldır
    const updatedDoc = await prisma.document.update({
      where: { id },
      data: {
        isLockedForEdit: false,
        lockedById: null,
        lockedAt: null,
        lockReason: null,
      },
    });

    // Audit log
    await createAuditLog({
      userId: session.user.id,
      action: 'CHECK_IN',
      module: 'DOKUMAN',
      entityType: 'Document',
      entityId: id,
      oldValues: { lockedBy: document.lockedBy?.name },
    });

    return NextResponse.json({
      message: 'Doküman kilidi kaldırıldı (check-in)',
      document: updatedDoc,
    });
  } catch (error) {
    console.error('Document unlock error:', error);
    return NextResponse.json(
      { error: 'Doküman kilidi kaldırılırken hata oluştu' },
      { status: 500 }
    );
  }
}
