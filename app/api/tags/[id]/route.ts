import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET - Tek etiket getir
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tag = await prisma.tag.findUnique({
      where: { id: params.id },
      include: {
        documents: {
          include: {
            document: {
              select: {
                id: true,
                code: true,
                title: true,
                status: true
              }
            }
          }
        }
      }
    });

    if (!tag) {
      return NextResponse.json(
        { error: 'Etiket bulunamadı' },
        { status: 404 }
      );
    }

    return NextResponse.json(tag);
  } catch (error) {
    console.error('Error fetching tag:', error);
    return NextResponse.json(
      { error: 'Etiket getirilemedi' },
      { status: 500 }
    );
  }
}

// PUT - Etiket güncelle
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, color, description, isActive } = body;

    const tag = await prisma.tag.findUnique({
      where: { id: params.id }
    });

    if (!tag) {
      return NextResponse.json(
        { error: 'Etiket bulunamadı' },
        { status: 404 }
      );
    }

    // İsim değiştirildiyse benzersizlik kontrolü
    if (name && name.trim() !== tag.name) {
      const existing = await prisma.tag.findFirst({
        where: {
          name: { equals: name.trim(), mode: 'insensitive' },
          id: { not: params.id }
        }
      });

      if (existing) {
        return NextResponse.json(
          { error: 'Bu isimde bir etiket zaten mevcut' },
          { status: 400 }
        );
      }
    }

    const updatedTag = await prisma.tag.update({
      where: { id: params.id },
      data: {
        ...(name && { name: name.trim() }),
        ...(color && { color }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(isActive !== undefined && { isActive })
      }
    });

    return NextResponse.json(updatedTag);
  } catch (error) {
    console.error('Error updating tag:', error);
    return NextResponse.json(
      { error: 'Etiket güncellenemedi' },
      { status: 500 }
    );
  }
}

// DELETE - Etiket sil (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tag = await prisma.tag.findUnique({
      where: { id: params.id }
    });

    if (!tag) {
      return NextResponse.json(
        { error: 'Etiket bulunamadı' },
        { status: 404 }
      );
    }

    // Soft delete
    await prisma.tag.update({
      where: { id: params.id },
      data: { isActive: false }
    });

    return NextResponse.json({ message: 'Etiket silindi' });
  } catch (error) {
    console.error('Error deleting tag:', error);
    return NextResponse.json(
      { error: 'Etiket silinemedi' },
      { status: 500 }
    );
  }
}
