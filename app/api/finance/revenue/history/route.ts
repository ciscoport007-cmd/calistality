import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20')));
    const skip = (page - 1) * limit;

    const [reports, total] = await Promise.all([
      prisma.financeReport.findMany({
        skip,
        take: limit,
        orderBy: { reportDate: 'desc' },
        include: {
          uploadedBy: { select: { name: true, email: true } },
          _count: { select: { entries: true } },
        },
      }),
      prisma.financeReport.count(),
    ]);

    return NextResponse.json({
      success: true,
      data: reports.map((r) => ({
        id: r.id,
        reportDate: r.reportDate,
        fileName: r.fileName,
        sheetName: r.sheetName,
        entryCount: r._count.entries,
        uploadedBy: r.uploadedBy?.name ?? r.uploadedBy?.email ?? '—',
        createdAt: r.createdAt,
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Finance history error:', error);
    return NextResponse.json({ error: 'Geçmiş verisi alınırken hata oluştu' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID gerekli' }, { status: 400 });

    await prisma.financeReport.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Finance history delete error:', error);
    return NextResponse.json({ error: 'Silme işlemi başarısız' }, { status: 500 });
  }
}
