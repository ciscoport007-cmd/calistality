import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { PrismaClient } from '@prisma/client';
import { uploadFile } from '@/lib/storage';
import { createAuditLog, getDepartmentFilterWithNull, isAdmin, canCreate } from '@/lib/audit';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { searchParams } = new URL(request?.url ?? '');
    const status = searchParams?.get?.('status');
    const folderId = searchParams?.get?.('folderId');
    const departmentId = searchParams?.get?.('departmentId');
    const search = searchParams?.get?.('search');
    const documentTypeId = searchParams?.get?.('documentTypeId');
    const tagId = searchParams?.get?.('tagId');
    const specialFilter = searchParams?.get?.('specialFilter');
    
    // Özel filtre: Kullanıcıya özel dokümanları getir
    if (specialFilter) {
      let documentIds: string[] = [];
      
      if (specialFilter === 'pending_approval') {
        // Kullanıcının onay bekleyen dokümanları - Eski Approval sistemi
        const oldApprovals = await prisma.approval.findMany({
          where: {
            approverId: session?.user?.id,
            status: 'BEKLIYOR',
          },
          select: { documentId: true },
        });
        
        // Kullanıcının onay bekleyen dokümanları - Workflow sistemi
        const workflowApprovals = await prisma.workflowInstanceStep.findMany({
          where: {
            assignedUserId: session?.user?.id,
            status: 'AKTIF',
          },
          include: {
            instance: {
              select: { documentId: true },
            },
          },
        });
        
        // Her iki sistemi birleştir
        const oldIds = oldApprovals.map(a => a.documentId);
        const workflowIds = workflowApprovals
          .filter(w => w.instance?.documentId)
          .map(w => w.instance!.documentId);
        documentIds = [...new Set([...oldIds, ...workflowIds])];
      } else if (specialFilter === 'needs_reading') {
        // Kullanıcının okuması gereken dokümanlar
        const acknowledgments = await prisma.documentAcknowledgment.findMany({
          where: {
            userId: session?.user?.id,
            status: 'BEKLIYOR',
          },
          select: { documentId: true },
        });
        documentIds = acknowledgments.map(a => a.documentId);
      } else if (specialFilter === 'needs_feedback') {
        // Kullanıcının görüş vermesi gereken dokümanlar
        const reviews = await prisma.documentReview.findMany({
          where: {
            reviewerId: session?.user?.id,
            status: 'BEKLIYOR',
          },
          select: { documentId: true },
        });
        documentIds = reviews.map(r => r.documentId);
      }
      
      // Filtrelenmiş dokümanları getir
      const documents = await prisma.document.findMany({
        where: {
          id: { in: documentIds },
        },
        include: {
          folder: true,
          documentType: true,
          department: true,
          createdBy: {
            select: { id: true, name: true, surname: true, email: true },
          },
          preparedBy: {
            select: { id: true, name: true, surname: true, email: true },
          },
          versions: {
            orderBy: { versionNumber: 'desc' },
            take: 1,
          },
          approvals: {
            include: {
              approver: { select: { id: true, name: true, surname: true } },
            },
            orderBy: { order: 'asc' },
          },
          tags: { include: { tag: true } },
        },
        orderBy: { updatedAt: 'desc' },
      });
      
      return NextResponse.json({ documents });
    }

    // Departman bazlı filtreleme
    const deptFilter = getDepartmentFilterWithNull(session.user.departmentId, session.user.role);

    const where: any = { ...deptFilter };
    if (status) where.status = status;
    // folderId=null gönderilirse klasörsüz dokümanları getir
    if (folderId === 'null') {
      where.folderId = null;
    } else if (folderId) {
      where.folderId = folderId;
    }
    if (documentTypeId) where.documentTypeId = documentTypeId;
    // Admin değilse kendi departmanı dışında filtreleme yapamaz
    if (departmentId && isAdmin(session.user.role)) where.departmentId = departmentId;
    
    // Tam metin arama (Phase 2)
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { searchContent: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    // Etiket filtreleme (Phase 3)
    if (tagId) {
      where.tags = {
        some: { tagId: tagId }
      };
    }

    const documents = await prisma.document.findMany({
      where,
      include: {
        folder: true,
        documentType: true,
        department: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            surname: true,
            email: true,
          },
        },
        preparedBy: {
          select: {
            id: true,
            name: true,
            surname: true,
            email: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            name: true,
            surname: true,
            email: true,
          },
        },
        lockedBy: {
          select: {
            id: true,
            name: true,
            surname: true,
            email: true,
          },
        },
        cancelledBy: {
          select: {
            id: true,
            name: true,
            surname: true,
            email: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            name: true,
            surname: true,
            email: true,
          },
        },
        reviews: {
          include: {
            reviewer: {
              select: {
                id: true,
                name: true,
                surname: true,
                email: true,
              },
            },
          },
          orderBy: { order: 'asc' },
        },
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
        },
        approvals: {
          include: {
            approver: {
              select: {
                id: true,
                name: true,
                surname: true,
                email: true,
              },
            },
          },
          orderBy: { order: 'asc' },
        },
        acknowledgments: {
          select: {
            id: true,
            userId: true,
            status: true,
            versionNumber: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ documents: documents ?? [] });
  } catch (error) {
    console.error('Documents GET error:', error);
    return NextResponse.json(
      { error: 'Dokümanlar getirilirken hata oluştu' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    // Yalnızca Admin ve Yönetici rolleri yeni içerik oluşturabilir
    if (!canCreate(session.user?.role)) {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz bulunmamaktadır' }, { status: 403 });
    }

    const formData = await request.formData();
    const title = formData?.get?.('title') as string;
    const description = formData?.get?.('description') as string;
    const folderId = formData?.get?.('folderId') as string;
    const departmentId = formData?.get?.('departmentId') as string;
    const documentTypeId = formData?.get?.('documentTypeId') as string;
    const file = formData?.get?.('file') as File;
    const metadataStr = formData?.get?.('metadata') as string;
    const metadata = metadataStr ? JSON.parse(metadataStr) : null;

    if (!title || !file) {
      return NextResponse.json(
        { error: 'Başlık ve dosya zorunludur' },
        { status: 400 }
      );
    }

    // Dosyayı yükle
    const buffer = Buffer.from(await file?.arrayBuffer?.());
    const cloudStoragePath = await uploadFile(buffer, file?.name ?? 'document', false);

    // Doküman kodu oluştur: CLR.{DEPT}.{TIP}.{SIRA}
    // Departman ve doküman tipi kodlarını al
    let deptCode = 'XX';
    let typeCode = 'XX';

    if (departmentId) {
      const dept = await prisma.department.findUnique({
        where: { id: departmentId },
        select: { code: true },
      });
      if (dept?.code) deptCode = dept.code.toUpperCase();
    }

    if (documentTypeId) {
      const docType = await prisma.documentType.findUnique({
        where: { id: documentTypeId },
        select: { code: true },
      });
      if (docType?.code) typeCode = docType.code.toUpperCase();
    }

    const prefix = `CLR.${deptCode}.${typeCode}.`;

    // Bu prefix ile mevcut son numarayı bul
    const lastDoc = await prisma.document.findFirst({
      where: { code: { startsWith: prefix } },
      orderBy: { code: 'desc' },
      select: { code: true },
    });

    let nextNumber = 1;
    if (lastDoc?.code) {
      const parts = lastDoc.code.split('.');
      const lastNum = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastNum)) nextNumber = lastNum + 1;
    }
    const code = `${prefix}${String(nextNumber).padStart(2, '0')}`;

    // Doküman oluştur
    const document = await prisma.document.create({
      data: {
        code,
        title,
        description: description || null,
        folderId: folderId || null,
        departmentId: departmentId || null,
        documentTypeId: documentTypeId || null,
        createdById: session?.user?.id,
        status: 'TASLAK',
        currentVersion: 1,
        metadata: metadata || null,
        versions: {
          create: {
            versionNumber: 1,
            title,
            description: description || null,
            fileName: file?.name ?? '',
            fileSize: file?.size ?? 0,
            fileType: file?.type ?? '',
            cloudStoragePath,
            isPublic: false,
          },
        },
      },
      include: {
        folder: true,
        documentType: true,
        department: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            surname: true,
            email: true,
          },
        },
      },
    });

    // Audit log
    await createAuditLog({
      userId: session.user.id,
      action: 'CREATE',
      module: 'DOCUMENTS',
      entityType: 'Document',
      entityId: document.id,
      newValues: { code, title, status: 'TASLAK', departmentId },
    });

    return NextResponse.json(
      { document, message: 'Doküman başarıyla oluşturuldu' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Documents POST error:', error);
    return NextResponse.json(
      { error: 'Doküman oluşturulurken hata oluştu' },
      { status: 500 }
    );
  }
}
