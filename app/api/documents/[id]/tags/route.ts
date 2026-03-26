import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface DocumentTag {
  id: string;
  documentId: string;
  tagId: string;
  tag: any;
}

// GET - Dokümanın etiketlerini getir
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const documentTags = await prisma.documentTag.findMany({
      where: { documentId: params.id },
      include: {
        tag: true
      },
      orderBy: { addedAt: 'desc' }
    });

    return NextResponse.json(documentTags.map((dt: DocumentTag) => dt.tag));
  } catch (error) {
    console.error('Error fetching document tags:', error);
    return NextResponse.json(
      { error: 'Etiketler getirilemedi' },
      { status: 500 }
    );
  }
}

// POST - Dokümana etiket ekle
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { tagId, tagIds } = body;

    // Doküman var mı kontrol et
    const document = await prisma.document.findUnique({
      where: { id: params.id }
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Doküman bulunamadı' },
        { status: 404 }
      );
    }

    // Tek etiket veya çoklu etiket ekleme
    const idsToAdd: string[] = tagIds || (tagId ? [tagId] : []);

    if (idsToAdd.length === 0) {
      return NextResponse.json(
        { error: 'En az bir etiket ID gerekli' },
        { status: 400 }
      );
    }

    // Mevcut etiketleri al
    const existingTags = await prisma.documentTag.findMany({
      where: {
        documentId: params.id,
        tagId: { in: idsToAdd }
      }
    });

    const existingTagIds = new Set(existingTags.map((t: any) => t.tagId));
    const newTagIds = idsToAdd.filter((id: string) => !existingTagIds.has(id));

    // Yeni etiketleri ekle
    if (newTagIds.length > 0) {
      await prisma.documentTag.createMany({
        data: newTagIds.map((tid: string) => ({
          documentId: params.id,
          tagId: tid
        }))
      });
    }

    // Güncel etiketleri döndür
    const updatedTags = await prisma.documentTag.findMany({
      where: { documentId: params.id },
      include: { tag: true }
    });

    return NextResponse.json(updatedTags.map((dt: DocumentTag) => dt.tag), { status: 201 });
  } catch (error) {
    console.error('Error adding tags to document:', error);
    return NextResponse.json(
      { error: 'Etiketler eklenemedi' },
      { status: 500 }
    );
  }
}

// DELETE - Dokümandan etiket kaldır
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tagId = searchParams.get('tagId');

    if (!tagId) {
      return NextResponse.json(
        { error: 'tagId parametresi gerekli' },
        { status: 400 }
      );
    }

    await prisma.documentTag.deleteMany({
      where: {
        documentId: params.id,
        tagId: tagId
      }
    });

    return NextResponse.json({ message: 'Etiket kaldırıldı' });
  } catch (error) {
    console.error('Error removing tag from document:', error);
    return NextResponse.json(
      { error: 'Etiket kaldırılamadı' },
      { status: 500 }
    );
  }
}

// PUT - Dokümanın tüm etiketlerini güncelle
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
    const { tagIds } = body;

    if (!Array.isArray(tagIds)) {
      return NextResponse.json(
        { error: 'tagIds array olmalı' },
        { status: 400 }
      );
    }

    // Tüm mevcut etiketleri sil
    await prisma.documentTag.deleteMany({
      where: { documentId: params.id }
    });

    // Yeni etiketleri ekle
    if (tagIds.length > 0) {
      await prisma.documentTag.createMany({
        data: tagIds.map((tagId: string) => ({
          documentId: params.id,
          tagId
        }))
      });
    }

    // Güncel etiketleri döndür
    const updatedTags = await prisma.documentTag.findMany({
      where: { documentId: params.id },
      include: { tag: true }
    });

    return NextResponse.json(updatedTags.map((dt: DocumentTag) => dt.tag));
  } catch (error) {
    console.error('Error updating document tags:', error);
    return NextResponse.json(
      { error: 'Etiketler güncellenemedi' },
      { status: 500 }
    );
  }
}
