import { prisma } from '@/lib/db';

export type NotificationType = 'BILGI' | 'UYARI' | 'HATA' | 'BASARI';

interface CreateNotificationParams {
  userId: string | null | undefined;
  title: string;
  message: string;
  type?: NotificationType;
  link?: string;
}

// Tekil bildirim oluştur
export async function createNotification(params: CreateNotificationParams) {
  const { userId, title, message, type = 'BILGI', link } = params;

  if (!userId) return null;

  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        link,
      },
    });
    return notification;
  } catch (error) {
    console.error('Bildirim oluşturma hatası:', error);
    return null;
  }
}

// Birden fazla kullanıcıya bildirim gönder
export async function createNotifications(userIds: string[], params: Omit<CreateNotificationParams, 'userId'>) {
  const { title, message, type = 'BILGI', link } = params;

  try {
    const notifications = await prisma.notification.createMany({
      data: userIds.map(userId => ({
        userId,
        title,
        message,
        type,
        link,
      })),
    });
    return notifications;
  } catch (error) {
    console.error('Bildirimler oluşturulurken hata:', error);
    return null;
  }
}

// Belirli rol veya departmandaki kullanıcılara bildirim gönder
export async function notifyByRole(roleNames: string[], params: Omit<CreateNotificationParams, 'userId'>) {
  try {
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        role: {
          name: { in: roleNames },
        },
      },
      select: { id: true },
    });

    if (users.length === 0) return null;

    return createNotifications(users.map(u => u.id), params);
  } catch (error) {
    console.error('Role göre bildirim hatası:', error);
    return null;
  }
}

export async function notifyByDepartment(departmentId: string, params: Omit<CreateNotificationParams, 'userId'>) {
  try {
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        departmentId,
      },
      select: { id: true },
    });

    if (users.length === 0) return null;

    return createNotifications(users.map(u => u.id), params);
  } catch (error) {
    console.error('Departmana göre bildirim hatası:', error);
    return null;
  }
}

// Önceden tanımlanmış bildirim şablonları
export const NotificationTemplates = {
  // Şikayet bildirimleri
  complaintAssigned: (complaintCode: string, customerName: string) => ({
    title: 'Yeni Şikayet Atandı',
    message: `${complaintCode} kodlu şikayet size atandı. Müşteri: ${customerName}`,
    type: 'BILGI' as NotificationType,
  }),
  complaintStatusChanged: (complaintCode: string, newStatus: string) => ({
    title: 'Şikayet Durumu Değişti',
    message: `${complaintCode} kodlu şikayetin durumu "${newStatus}" olarak değiştirildi.`,
    type: 'BILGI' as NotificationType,
  }),

  // Ekipman bildirimleri
  maintenanceDue: (equipmentCode: string, equipmentName: string, days: number) => ({
    title: 'Bakım Zamanı Yaklaşıyor',
    message: `${equipmentCode} - ${equipmentName} ekipmanının bakımına ${days} gün kaldı.`,
    type: 'UYARI' as NotificationType,
  }),
  calibrationDue: (equipmentCode: string, equipmentName: string, days: number) => ({
    title: 'Kalibrasyon Zamanı Yaklaşıyor',
    message: `${equipmentCode} - ${equipmentName} ekipmanının kalibrasyonuna ${days} gün kaldı.`,
    type: 'UYARI' as NotificationType,
  }),
  maintenanceOverdue: (equipmentCode: string, equipmentName: string) => ({
    title: 'Bakım Tarihi Geçti!',
    message: `${equipmentCode} - ${equipmentName} ekipmanının bakım tarihi geçmiştir!`,
    type: 'HATA' as NotificationType,
  }),
  calibrationOverdue: (equipmentCode: string, equipmentName: string) => ({
    title: 'Kalibrasyon Tarihi Geçti!',
    message: `${equipmentCode} - ${equipmentName} ekipmanının kalibrasyon tarihi geçmiştir!`,
    type: 'HATA' as NotificationType,
  }),

  // CAPA bildirimleri
  capaAssigned: (capaCode: string) => ({
    title: 'Yeni CAPA Atandı',
    message: `${capaCode} kodlu CAPA size atandı.`,
    type: 'BILGI' as NotificationType,
  }),
  capaDeadlineApproaching: (capaCode: string, days: number) => ({
    title: 'CAPA Termin Yaklaşıyor',
    message: `${capaCode} kodlu CAPA'nın terminine ${days} gün kaldı.`,
    type: 'UYARI' as NotificationType,
  }),

  // Denetim bildirimleri
  auditAssigned: (auditCode: string) => ({
    title: 'Denetime Atandınız',
    message: `${auditCode} kodlu denetime atandınız.`,
    type: 'BILGI' as NotificationType,
  }),
  auditScheduled: (auditCode: string, date: string) => ({
    title: 'Denetim Planlandı',
    message: `${auditCode} kodlu denetim ${date} tarihine planlandı.`,
    type: 'BILGI' as NotificationType,
  }),

  // Risk bildirimleri
  riskLevelChanged: (riskCode: string, newLevel: string) => ({
    title: 'Risk Seviyesi Değişti',
    message: `${riskCode} kodlu riskin seviyesi "${newLevel}" olarak değiştirildi.`,
    type: newLevel === 'KRITIK' || newLevel === 'COK_YUKSEK' ? 'HATA' as NotificationType : 'UYARI' as NotificationType,
  }),

  // Döküman bildirimleri
  documentApprovalRequired: (docCode: string, docTitle: string) => ({
    title: 'Döküman Onayı Bekleniyor',
    message: `${docCode} - ${docTitle} dökümanı onayınızı bekliyor.`,
    type: 'BILGI' as NotificationType,
  }),
  documentApproved: (docCode: string) => ({
    title: 'Döküman Onaylandı',
    message: `${docCode} kodlu döküman onaylandı.`,
    type: 'BASARI' as NotificationType,
  }),
  documentRejected: (docCode: string, reason: string) => ({
    title: 'Döküman Reddedildi',
    message: `${docCode} kodlu döküman reddedildi. Sebep: ${reason}`,
    type: 'HATA' as NotificationType,
  }),

  // KPI bildirimleri
  kpiTargetMissed: (kpiCode: string, kpiName: string) => ({
    title: 'KPI Hedefi Tutturulamadı',
    message: `${kpiCode} - ${kpiName} KPI'si hedef değerinin altında.`,
    type: 'UYARI' as NotificationType,
  }),
  kpiCritical: (kpiCode: string, kpiName: string) => ({
    title: 'KPI Kritik Seviyede!',
    message: `${kpiCode} - ${kpiName} KPI'si kritik seviyede!`,
    type: 'HATA' as NotificationType,
  }),

  // Stratejik aksiyon bildirimleri
  actionAssigned: (actionCode: string, actionName: string) => ({
    title: 'Yeni Aksiyon Atandı',
    message: `${actionCode} - ${actionName} aksiyonu size atandı.`,
    type: 'BILGI' as NotificationType,
  }),
  actionDeadlineApproaching: (actionCode: string, days: number) => ({
    title: 'Aksiyon Termin Yaklaşıyor',
    message: `${actionCode} kodlu aksiyonun terminine ${days} gün kaldı.`,
    type: 'UYARI' as NotificationType,
  }),
  actionDeadlineOverdue: (actionCode: string, actionName: string) => ({
    title: 'Aksiyon Tarihi Geçti!',
    message: `${actionCode} - ${actionName} aksiyonunun bitiş tarihi geçmiştir!`,
    type: 'HATA' as NotificationType,
  }),
  actionStatusChanged: (actionCode: string, oldStatus: string, newStatus: string, changedBy: string) => ({
    title: 'Aksiyon Durumu Değişti',
    message: `${actionCode} aksiyonu "${oldStatus}" → "${newStatus}" olarak ${changedBy} tarafından değiştirildi.`,
    type: 'BILGI' as NotificationType,
  }),
  actionCompleted: (actionCode: string, actionName: string) => ({
    title: 'Aksiyon Tamamlandı',
    message: `${actionCode} - ${actionName} aksiyonu başarıyla tamamlandı.`,
    type: 'BASARI' as NotificationType,
  }),
  actionBlocked: (actionCode: string, reason: string) => ({
    title: 'Aksiyon Blokajda!',
    message: `${actionCode} aksiyonu blokaja alındı. Sebep: ${reason || 'Belirtilmedi'}`,
    type: 'HATA' as NotificationType,
  }),
  actionUnblocked: (actionCode: string) => ({
    title: 'Aksiyon Blokajı Kaldırıldı',
    message: `${actionCode} aksiyonunun blokajı kaldırıldı.`,
    type: 'BASARI' as NotificationType,
  }),
  actionResponsibleRemoved: (actionCode: string) => ({
    title: 'Aksiyon Sorumluluğu Değişti',
    message: `${actionCode} aksiyonunun sorumluluğu başka bir kişiye devredildi.`,
    type: 'BILGI' as NotificationType,
  }),
  actionAccountableAssigned: (actionCode: string, actionName: string) => ({
    title: 'Aksiyon Onaylayanı Olarak Atandınız',
    message: `${actionCode} - ${actionName} aksiyonunun onaylayanı olarak atandınız.`,
    type: 'BILGI' as NotificationType,
  }),
  actionProgressUpdated: (actionCode: string, progress: number) => ({
    title: 'Aksiyon İlerlemesi Güncellendi',
    message: `${actionCode} aksiyonunun ilerlemesi %${progress} olarak güncellendi.`,
    type: 'BILGI' as NotificationType,
  }),
  actionCancelled: (actionCode: string, actionName: string) => ({
    title: 'Aksiyon İptal Edildi',
    message: `${actionCode} - ${actionName} aksiyonu iptal edildi.`,
    type: 'UYARI' as NotificationType,
  }),
  milestoneCompleted: (actionCode: string, milestoneName: string) => ({
    title: 'Kilometre Taşı Tamamlandı',
    message: `${actionCode} aksiyonunun "${milestoneName}" kilometre taşı tamamlandı.`,
    type: 'BASARI' as NotificationType,
  }),
  milestoneDelayed: (actionCode: string, milestoneName: string) => ({
    title: 'Kilometre Taşı Gecikti',
    message: `${actionCode} aksiyonunun "${milestoneName}" kilometre taşı gecikti!`,
    type: 'UYARI' as NotificationType,
  }),
};

// Aksiyon bildirim yardımcı fonksiyonları
export async function notifyActionStakeholders(
  actionId: string,
  excludeUserId: string,
  notificationData: { title: string; message: string; type: NotificationType },
  options?: { 
    includeResponsible?: boolean;
    includeAccountable?: boolean;
    includeCreator?: boolean;
    includeDepartmentManager?: boolean;
  }
) {
  const { includeResponsible = true, includeAccountable = true, includeCreator = true, includeDepartmentManager = false } = options || {};

  try {
    const action = await prisma.strategicAction.findUnique({
      where: { id: actionId },
      include: {
        department: {
          include: {
            users: {
              where: { 
                isActive: true,
                role: { name: { in: ['Admin', 'Yönetici', 'Departman Yöneticisi'] } }
              },
              select: { id: true }
            }
          }
        }
      }
    });

    if (!action) return;

    const userIds = new Set<string>();

    if (includeResponsible && action.responsibleId && action.responsibleId !== excludeUserId) {
      userIds.add(action.responsibleId);
    }
    if (includeAccountable && action.accountableId && action.accountableId !== excludeUserId) {
      userIds.add(action.accountableId);
    }
    if (includeCreator && action.createdById && action.createdById !== excludeUserId) {
      userIds.add(action.createdById);
    }
    if (includeDepartmentManager && action.department?.users) {
      action.department.users.forEach(user => {
        if (user.id !== excludeUserId) userIds.add(user.id);
      });
    }

    if (userIds.size === 0) return;

    const link = `/dashboard/strategy/actions/${actionId}`;
    
    await createNotifications(Array.from(userIds), {
      ...notificationData,
      link,
    });
  } catch (error) {
    console.error('Aksiyon paydaş bildirimi hatası:', error);
  }
}
