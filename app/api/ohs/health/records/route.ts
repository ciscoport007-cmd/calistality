import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { createNotification } from '@/lib/notifications';

// Sağlık kayıtları listesi
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz eri\u015fim' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const examType = searchParams.get('examType');
    const result = searchParams.get('result');
    const userId = searchParams.get('userId');
    const expiringSoon = searchParams.get('expiringSoon');

    const where: any = { isActive: true };

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { personName: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { surname: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (examType) {
      where.examType = examType;
    }

    if (result) {
      where.result = result;
    }

    if (userId) {
      where.userId = userId;
    }

    // Yakında sona erecek muayeneler (30 gün içinde)
    if (expiringSoon === 'true') {
      const thirtyDaysLater = new Date();
      thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
      where.nextExamDate = {
        lte: thirtyDaysLater,
        gte: new Date(),
      };
    }

    const records = await prisma.oHSHealthRecord.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, surname: true, email: true } },
        personDepartment: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
      },
      orderBy: { examDate: 'desc' },
    });

    return NextResponse.json(records);
  } catch (error) {
    console.error('Health records fetch error:', error);
    return NextResponse.json(
      { error: 'Sa\u011fl\u0131k kay\u0131tlar\u0131 al\u0131namad\u0131' },
      { status: 500 }
    );
  }
}

// Yeni sağlık kaydı oluştur
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz eri\u015fim' }, { status: 401 });
    }

    // Yetki kontrolü
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { role: true },
    });

    const allowedRoles = ['Admin', 'Y\u00f6netici', '\u0130SG Uzman\u0131', '\u0130\u015f G\u00fcvenli\u011fi Uzman\u0131', '\u0130nsan Kaynaklar\u0131'];
    if (!currentUser?.role || !allowedRoles.some(r => currentUser.role?.name.includes(r))) {
      return NextResponse.json(
        { error: 'Bu i\u015flem i\u00e7in yetkiniz yok' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      personName,
      personDuty,
      personDepartmentId,
      examType,
      examDate,
      nextExamDate,
      physicianName,
      institution,
      result,
      restrictions,
      notes,
      reportFileName,
      reportFileSize,
      reportFileType,
      reportCloudPath,
      reportIsPublic,
    } = body;

    // Validasyon
    if (!personName || !examType || !examDate || !physicianName || !result) {
      return NextResponse.json(
        { error: 'Zorunlu alanlar eksik (\u0130sim Soyisim, Muayene T\u00fcr\u00fc, Tarih, Hekim, Sonu\u00e7)' },
        { status: 400 }
      );
    }

    // Kod oluştur
    const year = new Date().getFullYear();
    const lastRecord = await prisma.oHSHealthRecord.findFirst({
      where: { code: { startsWith: `SGL-${year}` } },
      orderBy: { code: 'desc' },
    });

    let nextNumber = 1;
    if (lastRecord) {
      const lastNumber = parseInt(lastRecord.code.split('-')[2]);
      nextNumber = lastNumber + 1;
    }
    const code = `SGL-${year}-${nextNumber.toString().padStart(4, '0')}`;

    const record = await prisma.oHSHealthRecord.create({
      data: {
        code,
        personName,
        personDuty: personDuty || null,
        personDepartmentId: personDepartmentId || null,
        examType,
        examDate: new Date(examDate),
        nextExamDate: nextExamDate ? new Date(nextExamDate) : null,
        physicianName,
        institution,
        result,
        restrictions,
        notes,
        reportFileName,
        reportFileSize,
        reportFileType,
        reportCloudPath,
        reportIsPublic: reportIsPublic || false,
        createdById: session.user.id,
      },
      include: {
        user: { select: { id: true, name: true, surname: true } },
        personDepartment: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
      },
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error('Health record create error:', error);
    return NextResponse.json(
      { error: 'Sa\u011fl\u0131k kayd\u0131 olu\u015fturulamad\u0131' },
      { status: 500 }
    );
  }
}
