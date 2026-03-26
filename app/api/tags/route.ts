import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET - Tüm etiketleri getir
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const includeDocCount = searchParams.get('includeDocCount') === 'true';

    const where: any = { isActive: true };
    
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const tags = await prisma.tag.findMany({
      where,
      include: includeDocCount ? {
        documents: {
          select: { id: true }
        }
      } : undefined,
      orderBy: { name: 'asc' }
    });

    // Doküman sayısını ekle
    const tagsWithCount = tags.map((tag: any) => ({
      ...tag,
      documentCount: includeDocCount ? tag.documents?.length || 0 : undefined,
      documents: undefined
    }));

    return NextResponse.json(tagsWithCount);
  } catch (error) {
    console.error('Error fetching tags:', error);
    return NextResponse.json(
      { error: 'Etiketler getirilemedi' },
      { status: 500 }
    );
  }
}

// POST - Yeni etiket oluştur
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, color, description } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Etiket adı zorunludur' },
        { status: 400 }
      );
    }

    // Aynı isimde etiket var mı kontrol et
    const existing = await prisma.tag.findFirst({
      where: {
        name: { equals: name.trim(), mode: 'insensitive' }
      }
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Bu isimde bir etiket zaten mevcut' },
        { status: 400 }
      );
    }

    const tag = await prisma.tag.create({
      data: {
        name: name.trim(),
        color: color || '#3B82F6',
        description: description?.trim() || null
      }
    });

    return NextResponse.json(tag, { status: 201 });
  } catch (error) {
    console.error('Error creating tag:', error);
    return NextResponse.json(
      { error: 'Etiket oluşturulamadı' },
      { status: 500 }
    );
  }
}
