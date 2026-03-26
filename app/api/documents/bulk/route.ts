import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { createAuditLog, isAdmin } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// POST - Toplu işlemler
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, documentIds } = body;

    if (!action || !documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return NextResponse.json(
        { error: 'action ve documentIds (array) gerekli' },
        { status: 400 }
      );
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;
    const admin = isAdmin(userRole);

    const results: { success: number; failed: number; errors: string[] } = { success: 0, failed: 0, errors: [] };

    switch (action) {
      case 'approve': {
        // Toplu onay
        for (const docId of documentIds) {
          try {
            const doc = await prisma.document.findUnique({
              where: { id: docId },
              include: { approvals: true }
            });

            if (!doc) {
              results.failed++;
              results.errors.push(`Doküman bulunamadı: ${docId}`);
              continue;
            }

            if (doc.status !== 'ONAY_BEKLIYOR') {
              results.failed++;
              results.errors.push(`Doküman onay bekliyor durumunda değil: ${doc.code}`);
              continue;
            }

            // Onay kaydını güncelle
            const approval = doc.approvals.find(
              (a: any) => a.approverId === userId && a.status === 'BEKLIYOR'
            );

            if (!approval && !admin) {
              results.failed++;
              results.errors.push(`Onay yetkiniz yok: ${doc.code}`);
              continue;
            }

            if (approval) {
              await prisma.approval.update({
                where: { id: approval.id },
                data: { status: 'ONAYLANDI', approvedAt: new Date() }
              });
            }

            // Tüm onaylar tamamlandı mı kontrol et
            const pendingApprovals = await prisma.approval.count({
              where: { documentId: docId, status: 'BEKLIYOR' }
            });

            if (pendingApprovals === 0) {
              await prisma.document.update({
                where: { id: docId },
                data: {
                  status: 'ONAYLANDI',
                  approvedById: userId,
                  approvedAt: new Date()
                }
              });
            }

            await createAuditLog({
              userId,
              action: 'UPDATE',
              module: 'DOCUMENTS',
              entityType: 'Document',
              entityId: docId,
              description: `Toplu onay: ${doc.code}`
            });

            results.success++;
          } catch (e) {
            results.failed++;
            results.errors.push(`Hata: ${docId}`);
          }
        }
        break;
      }

      case 'reject': {
        // Toplu red
        const { reason } = body;

        for (const docId of documentIds) {
          try {
            const doc = await prisma.document.findUnique({
              where: { id: docId },
              include: { approvals: true }
            });

            if (!doc) {
              results.failed++;
              results.errors.push(`Doküman bulunamadı: ${docId}`);
              continue;
            }

            if (doc.status !== 'ONAY_BEKLIYOR') {
              results.failed++;
              results.errors.push(`Doküman onay bekliyor durumunda değil: ${doc.code}`);
              continue;
            }

            const approval = doc.approvals.find(
              (a: any) => a.approverId === userId && a.status === 'BEKLIYOR'
            );

            if (!approval && !admin) {
              results.failed++;
              results.errors.push(`Onay yetkiniz yok: ${doc.code}`);
              continue;
            }

            if (approval) {
              await prisma.approval.update({
                where: { id: approval.id },
                data: { status: 'REDDEDILDI', comments: reason, approvedAt: new Date() }
              });
            }

            await prisma.document.update({
              where: { id: docId },
              data: { status: 'TASLAK' }  // Reddedilen doküman taslağa döner
            });

            await createAuditLog({
              userId,
              action: 'UPDATE',
              module: 'DOCUMENTS',
              entityType: 'Document',
              entityId: docId,
              description: `Toplu red: ${doc.code} - ${reason || ''}`
            });

            results.success++;
          } catch (e) {
            results.failed++;
            results.errors.push(`Hata: ${docId}`);
          }
        }
        break;
      }

      case 'addTags': {
        // Toplu etiket ekleme
        const { tagIds } = body;

        if (!tagIds || !Array.isArray(tagIds) || tagIds.length === 0) {
          return NextResponse.json(
            { error: 'tagIds gerekli' },
            { status: 400 }
          );
        }

        for (const docId of documentIds) {
          try {
            // Mevcut etiketleri kontrol et
            const existingTags = await prisma.documentTag.findMany({
              where: {
                documentId: docId,
                tagId: { in: tagIds }
              }
            });

            const existingTagIds = new Set(existingTags.map((t: any) => t.tagId));
            const newTagIds = tagIds.filter((id: string) => !existingTagIds.has(id));

            if (newTagIds.length > 0) {
              await prisma.documentTag.createMany({
                data: newTagIds.map((tagId: string) => ({
                  documentId: docId,
                  tagId
                }))
              });
            }

            results.success++;
          } catch (e) {
            results.failed++;
            results.errors.push(`Hata: ${docId}`);
          }
        }
        break;
      }

      case 'removeTags': {
        // Toplu etiket kaldırma
        const { tagIds: removeTagIds } = body;

        if (!removeTagIds || !Array.isArray(removeTagIds) || removeTagIds.length === 0) {
          return NextResponse.json(
            { error: 'tagIds gerekli' },
            { status: 400 }
          );
        }

        for (const docId of documentIds) {
          try {
            await prisma.documentTag.deleteMany({
              where: {
                documentId: docId,
                tagId: { in: removeTagIds }
              }
            });

            results.success++;
          } catch (e) {
            results.failed++;
            results.errors.push(`Hata: ${docId}`);
          }
        }
        break;
      }

      case 'publish': {
        // Toplu yayınlama
        if (!admin) {
          return NextResponse.json(
            { error: 'Sadece admin yayınlayabilir' },
            { status: 403 }
          );
        }

        for (const docId of documentIds) {
          try {
            const doc = await prisma.document.findUnique({
              where: { id: docId }
            });

            if (!doc) {
              results.failed++;
              results.errors.push(`Doküman bulunamadı: ${docId}`);
              continue;
            }

            if (doc.status !== 'ONAYLANDI') {
              results.failed++;
              results.errors.push(`Doküman onaylı değil: ${doc.code}`);
              continue;
            }

            await prisma.document.update({
              where: { id: docId },
              data: {
                status: 'YAYINDA',
                publishedAt: new Date()
              }
            });

            await createAuditLog({
              userId,
              action: 'UPDATE',
              module: 'DOCUMENTS',
              entityType: 'Document',
              entityId: docId,
              description: `Toplu yayınlama: ${doc.code}`
            });

            results.success++;
          } catch (e) {
            results.failed++;
            results.errors.push(`Hata: ${docId}`);
          }
        }
        break;
      }

      case 'archive': {
        // Toplu arşivleme
        for (const docId of documentIds) {
          try {
            const doc = await prisma.document.findUnique({
              where: { id: docId }
            });

            if (!doc) {
              results.failed++;
              results.errors.push(`Doküman bulunamadı: ${docId}`);
              continue;
            }

            await prisma.document.update({
              where: { id: docId },
              data: { status: 'IPTAL_EDILDI' }  // Arşivlenen doküman iptal edildi olarak işaretlenir
            });

            await createAuditLog({
              userId,
              action: 'UPDATE',
              module: 'DOCUMENTS',
              entityType: 'Document',
              entityId: docId,
              description: `Toplu arşivleme: ${doc.code}`
            });

            results.success++;
          } catch (e) {
            results.failed++;
            results.errors.push(`Hata: ${docId}`);
          }
        }
        break;
      }

      default:
        return NextResponse.json(
          { error: `Geçersiz işlem: ${action}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      message: `Toplu işlem tamamlandı`,
      results
    });
  } catch (error) {
    console.error('Error in bulk operation:', error);
    return NextResponse.json(
      { error: 'Toplu işlem başarısız' },
      { status: 500 }
    );
  }
}
