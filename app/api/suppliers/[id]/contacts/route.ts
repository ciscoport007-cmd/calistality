import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const contacts = await prisma.supplierContact.findMany({
      where: { supplierId: params.id, isActive: true },
      orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }]
    });

    return NextResponse.json(contacts);
  } catch (error) {
    console.error('Supplier contacts fetch error:', error);
    return NextResponse.json(
      { error: 'İletişim kişileri alınamadı' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const body = await request.json();
    const { name, title, department, phone, mobile, email, isPrimary, notes } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'İletişim kişisi adı zorunludur' },
        { status: 400 }
      );
    }

    // If this is primary, unset other primary contacts
    if (isPrimary) {
      await prisma.supplierContact.updateMany({
        where: { supplierId: params.id, isPrimary: true },
        data: { isPrimary: false }
      });
    }

    const contact = await prisma.supplierContact.create({
      data: {
        supplierId: params.id,
        name,
        title,
        department,
        phone,
        mobile,
        email,
        isPrimary: isPrimary || false,
        notes
      }
    });

    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    console.error('Supplier contact create error:', error);
    return NextResponse.json(
      { error: 'İletişim kişisi oluşturulamadı' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const body = await request.json();
    const { contactId, ...updateData } = body;

    if (!contactId) {
      return NextResponse.json(
        { error: 'İletişim kişisi ID zorunludur' },
        { status: 400 }
      );
    }

    // If setting as primary, unset other primary contacts
    if (updateData.isPrimary) {
      await prisma.supplierContact.updateMany({
        where: { supplierId: params.id, isPrimary: true, id: { not: contactId } },
        data: { isPrimary: false }
      });
    }

    const contact = await prisma.supplierContact.update({
      where: { id: contactId },
      data: updateData
    });

    return NextResponse.json(contact);
  } catch (error) {
    console.error('Supplier contact update error:', error);
    return NextResponse.json(
      { error: 'İletişim kişisi güncellenemedi' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get('contactId');

    if (!contactId) {
      return NextResponse.json(
        { error: 'İletişim kişisi ID zorunludur' },
        { status: 400 }
      );
    }

    // Soft delete
    await prisma.supplierContact.update({
      where: { id: contactId },
      data: { isActive: false }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Supplier contact delete error:', error);
    return NextResponse.json(
      { error: 'İletişim kişisi silinemedi' },
      { status: 500 }
    );
  }
}
