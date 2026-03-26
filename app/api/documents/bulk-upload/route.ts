import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { PrismaClient } from '@prisma/client';
import { uploadFile } from '@/lib/storage';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const formData = await request.formData();
    const folderId = formData.get('folderId') as string;
    const departmentId = formData.get('departmentId') as string;
    const documentTypeId = formData.get('documentTypeId') as string;
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'Dosya seçilmedi' }, { status: 400 });
    }

    const uploadedDocuments = [];
    const errors: string[] = [];

    // Departman ve doküman tipi kodlarını önceden al
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

    for (const file of files) {
      try {
        // Her dosya için benzersiz kod oluştur (prefix'e göre + kaç dosya yüklendiyse offset)
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
        nextNumber += uploadedDocuments.length;
        const code = `${prefix}${String(nextNumber).padStart(2, '0')}`;

        // Dosyayı S3'e yükle
        const buffer = Buffer.from(await file.arrayBuffer());
        const cloudStoragePath = await uploadFile(buffer, file.name, false);

        // Dosya adından başlık oluştur (uzantıyı kaldır)
        const title = file.name.replace(/\.[^/.]+$/, '');

        // Doküman oluştur
        const document = await prisma.document.create({
          data: {
            code,
            title,
            description: null,
            folderId: folderId || null,
            departmentId: departmentId || null,
            documentTypeId: documentTypeId || null,
            createdById: session.user.id,
            status: 'TASLAK',
            currentVersion: 1,
            versions: {
              create: {
                versionNumber: 1,
                title,
                description: null,
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
                cloudStoragePath,
                isPublic: false,
              },
            },
          },
          include: {
            folder: true,
            documentType: true,
            department: true,
          },
        });

        // Audit log
        await createAuditLog({
          userId: session.user.id,
          action: 'CREATE',
          module: 'DOCUMENTS',
          entityType: 'Document',
          entityId: document.id,
          newValues: { code, title, status: 'TASLAK', folderId, bulkUpload: true },
        });

        uploadedDocuments.push(document);
      } catch (error: any) {
        console.error(`Error uploading file ${file.name}:`, error);
        errors.push(`${file.name}: ${error?.message || 'Yüklenemedi'}`);
      }
    }

    return NextResponse.json({
      message: `${uploadedDocuments.length} doküman başarıyla yüklendi`,
      documents: uploadedDocuments,
      errors: errors.length > 0 ? errors : undefined,
      totalUploaded: uploadedDocuments.length,
      totalFailed: errors.length,
    }, { status: 201 });
  } catch (error) {
    console.error('Bulk upload error:', error);
    return NextResponse.json(
      { error: 'Toplu yükleme sırasında hata oluştu' },
      { status: 500 }
    );
  }
}
