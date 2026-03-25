import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isAdmin } from '@/lib/audit';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isAdmin(session.user?.role)) {
      return NextResponse.json({ error: 'Yetkisiz eri\u015fim' }, { status: 403 });
    }

    const body = await request.json();
    const { smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom, smtpFromName, smtpSecure } = body;

    if (!smtpHost || !smtpFrom) {
      return NextResponse.json({ error: 'SMTP sunucu ve g\u00f6nderen e-posta zorunludur' }, { status: 400 });
    }

    // Nodemailer ile SMTP ba\u011flant\u0131s\u0131n\u0131 test et
    // Not: Nodemailer production ortam\u0131nda y\u00fcklenecek
    // \u015eimdilik ba\u011flant\u0131 bilgilerini do\u011fruluyoruz
    const net = await import('net');
    
    const port = parseInt(smtpPort || '587');
    
    // TCP ba\u011flant\u0131 testi
    const testConnection = (): Promise<boolean> => {
      return new Promise((resolve) => {
        const socket = new net.Socket();
        const timeout = setTimeout(() => {
          socket.destroy();
          resolve(false);
        }, 5000);

        socket.connect(port, smtpHost, () => {
          clearTimeout(timeout);
          socket.destroy();
          resolve(true);
        });

        socket.on('error', () => {
          clearTimeout(timeout);
          socket.destroy();
          resolve(false);
        });
      });
    };

    const isConnectable = await testConnection();
    
    if (isConnectable) {
      return NextResponse.json({
        message: `SMTP sunucusuna ba\u011flant\u0131 ba\u015far\u0131l\u0131! (${smtpHost}:${port}) - Ayarlar\u0131 kaydettikten sonra bildirimler bu sunucu \u00fczerinden g\u00f6nderilecektir.`,
        success: true,
      });
    } else {
      return NextResponse.json(
        { error: `SMTP sunucusuna ba\u011flan\u0131lamad\u0131 (${smtpHost}:${port}). Sunucu adresi ve port bilgilerini kontrol edin.` },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('SMTP test error:', error);
    return NextResponse.json(
      { error: `SMTP test s\u0131ras\u0131nda hata: ${error.message || 'Bilinmeyen hata'}` },
      { status: 500 }
    );
  }
}
