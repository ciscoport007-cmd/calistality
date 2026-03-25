// Doküman E-posta Bildirim Servisi

interface SendNotificationParams {
  notificationId: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  htmlBody: string;
}

export async function sendDocumentNotification({
  notificationId,
  recipientEmail,
  recipientName,
  subject,
  htmlBody,
}: SendNotificationParams): Promise<{ success: boolean; error?: string }> {
  try {
    const appUrl = process.env.NEXTAUTH_URL || '';
    const appName = appUrl ? new URL(appUrl).hostname.split('.')[0] : 'QDMS';

    const response = await fetch('https://apps.abacus.ai/api/sendNotificationEmail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deployment_token: process.env.ABACUSAI_API_KEY,
        app_id: process.env.WEB_APP_ID,
        notification_id: notificationId,
        subject,
        body: htmlBody,
        is_html: true,
        recipient_email: recipientEmail,
        sender_email: appUrl ? `noreply@${new URL(appUrl).hostname}` : undefined,
        sender_alias: `${appName} Kalite Sistemi`,
      }),
    });

    const result = await response.json();
    
    if (!result.success) {
      if (result.notification_disabled) {
        console.log(`Bildirim devre dışı: ${recipientEmail}`);
        return { success: true }; // Kullanıcı bildirimleri kapattıysa hata döndürme
      }
      return { success: false, error: result.message };
    }

    return { success: true };
  } catch (error) {
    console.error('E-posta gönderim hatası:', error);
    return { success: false, error: 'E-posta gönderilemedi' };
  }
}

// Doküman Güncelleme Bildirimi
export async function sendDocumentUpdateNotification(params: {
  documentCode: string;
  documentTitle: string;
  newVersion: number;
  updatedBy: string;
  changeDescription?: string;
  recipientEmail: string;
  recipientName: string;
  documentUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1e40af; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">
        📄 Doküman Güncellendi
      </h2>
      <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 10px 0;"><strong>Doküman Kodu:</strong> ${params.documentCode}</p>
        <p style="margin: 10px 0;"><strong>Doküman Adı:</strong> ${params.documentTitle}</p>
        <p style="margin: 10px 0;"><strong>Yeni Versiyon:</strong> v${params.newVersion}</p>
        <p style="margin: 10px 0;"><strong>Güncelleyen:</strong> ${params.updatedBy}</p>
        ${params.changeDescription ? `
        <div style="background: white; padding: 15px; border-radius: 4px; border-left: 4px solid #3b82f6; margin-top: 15px;">
          <strong>Değişiklik Açıklaması:</strong><br/>
          ${params.changeDescription}
        </div>
        ` : ''}
      </div>
      <div style="text-align: center; margin: 20px 0;">
        <a href="${params.documentUrl}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Dokümanı Görüntüle
        </a>
      </div>
      <p style="color: #666; font-size: 12px; margin-top: 20px;">
        Bu e-posta, doküman güncellemelerinden haberdar olmanız için otomatik olarak gönderilmiştir.
      </p>
    </div>
  `;

  return sendDocumentNotification({
    notificationId: process.env.NOTIF_ID_DOKMAN_GNCELLEME_BILDIRIMI || '',
    recipientEmail: params.recipientEmail,
    recipientName: params.recipientName,
    subject: `[${params.documentCode}] Doküman Güncellendi - v${params.newVersion}`,
    htmlBody,
  });
}

// Okundu Onayı Hatırlatması
export async function sendAcknowledgmentReminder(params: {
  documentCode: string;
  documentTitle: string;
  deadline: Date;
  recipientEmail: string;
  recipientName: string;
  documentUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  const deadlineStr = params.deadline.toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #b45309; border-bottom: 2px solid #f59e0b; padding-bottom: 10px;">
        ⚠️ Okundu Onayı Hatırlatması
      </h2>
      <p style="margin: 15px 0;">Sayın ${params.recipientName},</p>
      <div style="background: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #fcd34d;">
        <p style="margin: 10px 0;"><strong>Doküman Kodu:</strong> ${params.documentCode}</p>
        <p style="margin: 10px 0;"><strong>Doküman Adı:</strong> ${params.documentTitle}</p>
        <p style="margin: 10px 0; color: #b45309;"><strong>Son Tarih:</strong> ${deadlineStr}</p>
      </div>
      <p style="margin: 15px 0;">
        Yukarıdaki dokümanı okumanız ve onaylamanız gerekmektedir. 
        Lütfen son tarihe kadar dokümanı inceleyip onaylayınız.
      </p>
      <div style="text-align: center; margin: 20px 0;">
        <a href="${params.documentUrl}" style="background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Dokümanı İncele ve Onayla
        </a>
      </div>
      <p style="color: #666; font-size: 12px; margin-top: 20px;">
        Bu e-posta, kalite yönetim sistemi gereksinimlerinin karşılanması için otomatik olarak gönderilmiştir.
      </p>
    </div>
  `;

  return sendDocumentNotification({
    notificationId: process.env.NOTIF_ID_DOKMAN_OKUNDU_ONAY_HATRLATMAS || '',
    recipientEmail: params.recipientEmail,
    recipientName: params.recipientName,
    subject: `⚠️ [${params.documentCode}] Okundu Onayı Bekliyor - Son Tarih: ${deadlineStr}`,
    htmlBody,
  });
}

// Gözden Geçirme Hatırlatması
export async function sendReviewReminder(params: {
  documentCode: string;
  documentTitle: string;
  reviewDate: Date;
  recipientEmail: string;
  recipientName: string;
  documentUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  const reviewDateStr = params.reviewDate.toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #7c3aed; border-bottom: 2px solid #8b5cf6; padding-bottom: 10px;">
        🔄 Gözden Geçirme Hatırlatması
      </h2>
      <p style="margin: 15px 0;">Sayın ${params.recipientName},</p>
      <div style="background: #f5f3ff; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #c4b5fd;">
        <p style="margin: 10px 0;"><strong>Doküman Kodu:</strong> ${params.documentCode}</p>
        <p style="margin: 10px 0;"><strong>Doküman Adı:</strong> ${params.documentTitle}</p>
        <p style="margin: 10px 0; color: #7c3aed;"><strong>Planlı Gözden Geçirme Tarihi:</strong> ${reviewDateStr}</p>
      </div>
      <p style="margin: 15px 0;">
        Yukarıdaki dokümanın planlı gözden geçirme tarihi yaklaşmaktadır. 
        Lütfen dokümanı değerlendirip gerekli güncellemeleri yapınız.
      </p>
      <div style="text-align: center; margin: 20px 0;">
        <a href="${params.documentUrl}" style="background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Dokümanı Gözden Geçir
        </a>
      </div>
      <p style="color: #666; font-size: 12px; margin-top: 20px;">
        Bu e-posta, kalite yönetim sistemi kapsamında periyodik doküman gözden geçirme hatırlatması olarak gönderilmiştir.
      </p>
    </div>
  `;

  return sendDocumentNotification({
    notificationId: process.env.NOTIF_ID_DOKMAN_GZDEN_GEIRME_HATRLATMAS || '',
    recipientEmail: params.recipientEmail,
    recipientName: params.recipientName,
    subject: `🔄 [${params.documentCode}] Gözden Geçirme Zamanı - ${reviewDateStr}`,
    htmlBody,
  });
}
