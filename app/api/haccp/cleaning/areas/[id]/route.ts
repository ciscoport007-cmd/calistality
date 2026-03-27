import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const body = await request.json();

    const area = await prisma.hACCPCleaningArea.update({
      where: { id: params.id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.areaType !== undefined && { areaType: body.areaType }),
        ...(body.description !== undefined && { description: body.description || null }),
        ...(body.checklistItems !== undefined && { checklistItems: JSON.stringify(body.checklistItems) }),
        ...(body.frequency !== undefined && { frequency: body.frequency }),
      },
    });

    return NextResponse.json(area);
  } catch (error) {
    console.error('HACCP cleaning area update error:', error);
    return NextResponse.json({ error: 'Temizlik alanı güncellenemedi' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    await prisma.hACCPCleaningArea.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('HACCP cleaning area delete error:', error);
    return NextResponse.json({ error: 'Temizlik alanı silinemedi' }, { status: 500 });
  }
}
