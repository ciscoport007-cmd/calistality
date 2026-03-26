import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { FindingSeverity, FindingStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

// Bulgu listesi
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await params;

    const findings = await prisma.auditFinding.findMany({
      where: { auditId: id },
      include: {
        assignee: {
          select: { id: true, name: true, surname: true, email: true }
        },
        createdBy: {
          select: { id: true, name: true, surname: true }
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(findings);
  } catch (error) {
    console.error('Bulgu listesi hatası:', error);
    return NextResponse.json({ error: 'Bulgular yüklenirken hata oluştu' }, { status: 500 });
  }
}

// Yeni bulgu oluştur
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id: auditId } = await params;
    const body = await request.json();
    const {
      title,
      description,
      severity,
      evidence,
      requirement,
      clause,
      area,
      correctionRequired,
      correctionDeadline,
      assigneeId,
    } = body;

    if (!title || !description || !severity) {
      return NextResponse.json(
        { error: 'Bulgu başlığı, açıklaması ve ciddiyeti zorunludur' },
        { status: 400 }
      );
    }

    // Bulgu kodu oluştur
    const audit = await prisma.audit.findUnique({
      where: { id: auditId },
      select: { code: true }
    });

    if (!audit) {
      return NextResponse.json({ error: 'Denetim bulunamadı' }, { status: 404 });
    }

    const findingCount = await prisma.auditFinding.count({
      where: { auditId },
    });

    const code = `${audit.code}-B${(findingCount + 1).toString().padStart(3, '0')}`;

    const finding = await prisma.auditFinding.create({
      data: {
        auditId,
        code,
        title,
        description,
        severity: severity as FindingSeverity,
        evidence,
        requirement,
        clause,
        area,
        correctionRequired: correctionRequired ?? true,
        correctionDeadline: correctionDeadline ? new Date(correctionDeadline) : null,
        assigneeId: assigneeId || null,
        createdById: session.user.id as string,
      },
      include: {
        assignee: {
          select: { id: true, name: true, surname: true, email: true }
        },
        createdBy: {
          select: { id: true, name: true, surname: true }
        },
      },
    });

    // Denetim history kaydı
    await prisma.auditHistory.create({
      data: {
        auditId,
        userId: session.user.id as string,
        action: 'BULGU_EKLENDI',
        newValue: `${code}: ${title}`,
      },
    });

    return NextResponse.json(finding, { status: 201 });
  } catch (error) {
    console.error('Bulgu oluşturma hatası:', error);
    return NextResponse.json({ error: 'Bulgu oluşturulurken hata oluştu' }, { status: 500 });
  }
}

// Bulgu güncelle
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const body = await request.json();
    const { findingId, ...updateData } = body;

    if (!findingId) {
      return NextResponse.json({ error: 'Bulgu ID zorunludur' }, { status: 400 });
    }

    const existingFinding = await prisma.auditFinding.findUnique({
      where: { id: findingId },
    });

    if (!existingFinding) {
      return NextResponse.json({ error: 'Bulgu bulunamadı' }, { status: 404 });
    }

    const {
      title,
      description,
      severity,
      status,
      evidence,
      requirement,
      clause,
      area,
      correctionRequired,
      correctionDeadline,
      correctionAction,
      correctionNotes,
      correctionDate,
      verificationNotes,
      verificationDate,
      isVerified,
      assigneeId,
    } = updateData;

    const finding = await prisma.auditFinding.update({
      where: { id: findingId },
      data: {
        title: title ?? existingFinding.title,
        description: description ?? existingFinding.description,
        severity: severity ? (severity as FindingSeverity) : existingFinding.severity,
        status: status ? (status as FindingStatus) : existingFinding.status,
        evidence: evidence !== undefined ? evidence : existingFinding.evidence,
        requirement: requirement !== undefined ? requirement : existingFinding.requirement,
        clause: clause !== undefined ? clause : existingFinding.clause,
        area: area !== undefined ? area : existingFinding.area,
        correctionRequired: correctionRequired !== undefined ? correctionRequired : existingFinding.correctionRequired,
        correctionDeadline: correctionDeadline !== undefined ? (correctionDeadline ? new Date(correctionDeadline) : null) : existingFinding.correctionDeadline,
        correctionAction: correctionAction !== undefined ? correctionAction : existingFinding.correctionAction,
        correctionNotes: correctionNotes !== undefined ? correctionNotes : existingFinding.correctionNotes,
        correctionDate: correctionDate !== undefined ? (correctionDate ? new Date(correctionDate) : null) : existingFinding.correctionDate,
        verificationNotes: verificationNotes !== undefined ? verificationNotes : existingFinding.verificationNotes,
        verificationDate: verificationDate !== undefined ? (verificationDate ? new Date(verificationDate) : null) : existingFinding.verificationDate,
        isVerified: isVerified !== undefined ? isVerified : existingFinding.isVerified,
        assigneeId: assigneeId !== undefined ? (assigneeId || null) : existingFinding.assigneeId,
        closedAt: status === 'KAPATILDI' ? new Date() : existingFinding.closedAt,
      },
      include: {
        assignee: {
          select: { id: true, name: true, surname: true, email: true }
        },
        createdBy: {
          select: { id: true, name: true, surname: true }
        },
      },
    });

    return NextResponse.json(finding);
  } catch (error) {
    console.error('Bulgu güncelleme hatası:', error);
    return NextResponse.json({ error: 'Bulgu güncellenirken hata oluştu' }, { status: 500 });
  }
}

// Bulgu sil
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const findingId = searchParams.get('findingId');

    if (!findingId) {
      return NextResponse.json({ error: 'Bulgu ID zorunludur' }, { status: 400 });
    }

    await prisma.auditFinding.delete({
      where: { id: findingId },
    });

    return NextResponse.json({ message: 'Bulgu silindi' });
  } catch (error) {
    console.error('Bulgu silme hatası:', error);
    return NextResponse.json({ error: 'Bulgu silinirken hata oluştu' }, { status: 500 });
  }
}
