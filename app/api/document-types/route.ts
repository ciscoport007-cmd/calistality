import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { PrismaClient } from '@prisma/client';
import { canCreate } from '@/lib/audit';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const documentTypes = await prisma.documentType.findMany({
      include: {
        _count: {
          select: { documents: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ documentTypes: documentTypes ?? [] });
  } catch (error) {
    console.error('Document types GET error:', error);
    return NextResponse.json(
      { error: 'Doküman tipleri getirilirken hata oluştu' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    // Yalnızca Admin ve Yönetici rolleri yeni içerik oluşturabilir
    if (!canCreate(session.user?.role)) {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz bulunmamaktadır' }, { status: 403 });
    }

    const body = await request.json();
    const { name, code, description } = body ?? {};

    if (!name || !code) {
      return NextResponse.json(
        { error: 'Doküman tipi adı ve kodu zorunludur' },
        { status: 400 }
      );
    }

    const documentType = await prisma.documentType.create({
      data: {
        name,
        code,
        description: description || null,
      },
    });

    return NextResponse.json(
      { documentType, message: 'Doküman tipi başarıyla oluşturuldu' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Document types POST error:', error);
    return NextResponse.json(
      { error: 'Doküman tipi oluşturulurken hata oluştu' },
      { status: 500 }
    );
  }
}
