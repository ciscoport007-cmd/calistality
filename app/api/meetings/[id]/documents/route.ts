import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { getFileUrl } from '@/lib/s3';

// GET - Toplantı dökümanları
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const documents = await prisma.meetingDocument.findMany({
      where: { meetingId: params.id },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            surname: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // URL'leri ekle
    const documentsWithUrls = await Promise.all(
      documents.map(async (doc: any) => {
        const url = await getFileUrl(doc.cloud_storage_path, doc.isPublic);
        return { ...doc, url };
      })
    );

    return NextResponse.json(documentsWithUrls);
  } catch (error) {
    console.error('Documents fetch error:', error);
    return NextResponse.json(
      { error: 'Dökümanlar getirilirken hata oluştu' },
      { status: 500 }
    );
  }
}

// POST - Döküman ekle
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
    const {
      name,
      description,
      fileName,
      fileSize,
      mimeType,
      cloud_storage_path,
      isPublic
    } = body;

    if (!name || !fileName || !cloud_storage_path) {
      return NextResponse.json(
        { error: 'Döküman adı, dosya adı ve yolu zorunludur' },
        { status: 400 }
      );
    }

    const document = await prisma.meetingDocument.create({
      data: {
        meetingId: params.id,
        name,
        description,
        fileName,
        fileSize,
        mimeType,
        cloud_storage_path,
        isPublic: isPublic || false,
        uploadedById: session.user.id
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            surname: true,
          }
        }
      }
    });

    const url = await getFileUrl(document.cloud_storage_path, document.isPublic);

    return NextResponse.json({ ...document, url }, { status: 201 });
  } catch (error) {
    console.error('Document create error:', error);
    return NextResponse.json(
      { error: 'Döküman eklenirken hata oluştu' },
      { status: 500 }
    );
  }
}

// DELETE - Döküman sil
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
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json(
        { error: 'Döküman ID gerekli' },
        { status: 400 }
      );
    }

    await prisma.meetingDocument.delete({
      where: { id: documentId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Document delete error:', error);
    return NextResponse.json(
      { error: 'Döküman silinirken hata oluştu' },
      { status: 500 }
    );
  }
}
