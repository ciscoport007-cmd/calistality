'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileCheck, Shield, Users, CheckCircle } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { data: session, status } = useSession() || {};

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/dashboard');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center max-w-7xl">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <FileCheck className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">QDMS</h1>
          </div>
          <Button onClick={() => router.push('/login')} className="bg-blue-600 hover:bg-blue-700">
            Giriş Yap
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Kalite Doküman Yönetim Sistemi
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Dokümanlarınızı tek bir platformda yönetin, onay süreçlerinizi otomatikleştirin ve kalite
            standartlarınıza uyumu sağlayın.
          </p>
          <Button
            size="lg"
            onClick={() => router.push('/login')}
            className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-6"
          >
            Hemen Başlayın
          </Button>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-20">
          <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <FileCheck className="w-6 h-6 text-blue-600" />
              </div>
              <CardTitle>Doküman Yönetimi</CardTitle>
              <CardDescription>
                Tüm dokümanlarınızı dijital ortamda saklayarak versiyon kontrolü ve geçmiş takibi
                yapabilirsiniz.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <CheckCircle className="w-6 h-6 text-blue-600" />
              </div>
              <CardTitle>Onay Süreçleri</CardTitle>
              <CardDescription>
                Doküman onay süreçlerinizi dijitallleştirin, onaylama adımlarını takip edin.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <CardTitle>Rol Tabanlı Erişim</CardTitle>
              <CardDescription>
                Kullanıcılara rol, departman ve pozisyonlarına göre farklı yetkilendirmeler tanımlayın.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t mt-20">
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          <p className="text-center text-gray-600">
            © {new Date()?.getFullYear?.()} QDMS - Kalite Doküman Yönetim Sistemi
          </p>
        </div>
      </footer>
    </div>
  );
}
