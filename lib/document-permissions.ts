// Doküman Erişim Kontrolü Yardımcı Fonksiyonları
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export type PermissionType = 'view' | 'download' | 'edit' | 'delete' | 'approve' | 'share';

interface UserContext {
  userId: string;
  departmentId?: string | null;
  groupIds?: string[];
  isAdmin?: boolean;
}

// Kullanıcının doküman üzerindeki izinlerini kontrol et
export async function checkDocumentPermission(
  documentId: string,
  userId: string,
  permissionType: PermissionType
): Promise<boolean> {
  // Önce dokümanı ve kullanıcıyı al
  const [document, user] = await Promise.all([
    prisma.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        createdById: true,
        departmentId: true,
        status: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        departmentId: true,
        role: { select: { name: true } },
        groups: { select: { groupId: true } },
      },
    }),
  ]);

  if (!document || !user) return false;

  // Admin her şeyi yapabilir
  if (user.role?.name === 'Admin' || user.role?.name === 'Sistem Yöneticisi') {
    return true;
  }

  // Doküman sahibi her şeyi yapabilir
  if (document.createdById === userId) {
    return true;
  }

  // Kullanıcının grup ID'lerini al
  const userGroupIds = user.groups.map(g => g.groupId);

  // Doküman izinlerini kontrol et
  const permissions = await prisma.documentPermission.findMany({
    where: {
      documentId,
      AND: [
        {
          OR: [
            { userId },
            { departmentId: user.departmentId },
            { groupId: { in: userGroupIds } },
          ],
        },
        {
          // Süresi dolmuş izinleri hariç tut
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
      ],
    },
  });

  // Eğer özel izin yoksa ve aynı departmandaysa varsayılan izinleri uygula
  if (permissions.length === 0) {
    // Aynı departmandaki kullanıcılar varsayılan olarak görüntüleyebilir
    if (document.departmentId === user.departmentId) {
      return permissionType === 'view';
    }
    return false;
  }

  // İzin türüne göre kontrol et
  const permissionField = getPermissionField(permissionType);
  
  // Herhangi bir izin kaydında bu izin varsa true döndür
  return permissions.some((p: any) => p[permissionField] === true);
}

// Kullanıcının doküman üzerindeki tüm izinlerini getir
export async function getDocumentPermissions(
  documentId: string,
  userId: string
): Promise<Record<PermissionType, boolean>> {
  const defaultPermissions: Record<PermissionType, boolean> = {
    view: false,
    download: false,
    edit: false,
    delete: false,
    approve: false,
    share: false,
  };

  // Dokümanı ve kullanıcıyı al
  const [document, user] = await Promise.all([
    prisma.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        createdById: true,
        departmentId: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        departmentId: true,
        role: { select: { name: true } },
        groups: { select: { groupId: true } },
      },
    }),
  ]);

  if (!document || !user) return defaultPermissions;

  // Admin veya doküman sahibi tam yetkili
  if (
    user.role?.name === 'Admin' || 
    user.role?.name === 'Sistem Yöneticisi' ||
    document.createdById === userId
  ) {
    return {
      view: true,
      download: true,
      edit: true,
      delete: true,
      approve: true,
      share: true,
    };
  }

  const userGroupIds = user.groups.map(g => g.groupId);

  // Doküman izinlerini al
  const permissions = await prisma.documentPermission.findMany({
    where: {
      documentId,
      OR: [
        { userId },
        { departmentId: user.departmentId },
        { groupId: { in: userGroupIds } },
      ],
    },
  });

  // İzin yoksa ve aynı departmandaysa varsayılan görüntüleme izni
  if (permissions.length === 0) {
    if (document.departmentId === user.departmentId) {
      return { ...defaultPermissions, view: true };
    }
    return defaultPermissions;
  }

  // Tüm izinleri birleştir (OR mantığı)
  const mergedPermissions = { ...defaultPermissions };
  
  for (const perm of permissions) {
    // Süresi dolmuş izinleri atla
    if (perm.expiresAt && new Date(perm.expiresAt) < new Date()) {
      continue;
    }
    
    if (perm.canView) mergedPermissions.view = true;
    if (perm.canDownload) mergedPermissions.download = true;
    if (perm.canEdit) mergedPermissions.edit = true;
    if (perm.canDelete) mergedPermissions.delete = true;
    if (perm.canApprove) mergedPermissions.approve = true;
    if (perm.canShare) mergedPermissions.share = true;
  }

  return mergedPermissions;
}

// İzin türüne göre veritabanı alan adını döndür
function getPermissionField(permissionType: PermissionType): string {
  const fieldMap: Record<PermissionType, string> = {
    view: 'canView',
    download: 'canDownload',
    edit: 'canEdit',
    delete: 'canDelete',
    approve: 'canApprove',
    share: 'canShare',
  };
  return fieldMap[permissionType];
}

// Dokümanları izinlere göre filtrele
export async function filterDocumentsByPermission(
  documents: any[],
  userId: string,
  permissionType: PermissionType = 'view'
): Promise<any[]> {
  const filteredDocs = [];
  
  for (const doc of documents) {
    const hasPermission = await checkDocumentPermission(doc.id, userId, permissionType);
    if (hasPermission) {
      filteredDocs.push(doc);
    }
  }
  
  return filteredDocs;
}
