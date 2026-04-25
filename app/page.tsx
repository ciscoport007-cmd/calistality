'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import {
  FileCheck,
  Shield,
  Users,
  CheckCircle,
  ArrowRight,
  FolderOpen,
  GitBranch,
  Lock,
  Zap,
} from 'lucide-react';

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
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center animate-pulse">
            <FileCheck className="w-6 h-6 text-white" />
          </div>
          <p className="text-slate-400 text-sm">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center max-w-7xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <FileCheck className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-base font-bold text-white tracking-tight">Calista</span>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">
                Document Management
              </span>
            </div>
          </div>
          <Button
            onClick={() => router.push('/login')}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm h-9 px-5 rounded-lg shadow-lg shadow-indigo-600/20 transition-all"
          >
            Giriş Yap
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-32 pb-24 px-6 overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-20 left-1/4 w-64 h-64 bg-violet-600/8 rounded-full blur-3xl pointer-events-none" />

        <div className="container mx-auto max-w-5xl relative">
          {/* Badge */}
          <div className="flex justify-center mb-8">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-medium tracking-wide">
              <Zap className="w-3 h-3" />
              Kurumsal Doküman Yönetimi
            </span>
          </div>

          {/* Heading */}
          <h1 className="text-center text-5xl sm:text-6xl font-bold leading-tight mb-6 tracking-tight">
            <span className="text-white">Calista</span>{' '}
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              Document
            </span>
            <br />
            <span className="text-white">Management System</span>
          </h1>

          <p className="text-center text-slate-400 text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
            Dokümanlarınızı tek platformda yönetin, onay süreçlerinizi otomatikleştirin
            ve organizasyonunuzun kalite standartlarını dijitale taşıyın.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => router.push('/login')}
              className="bg-indigo-600 hover:bg-indigo-500 text-white h-12 px-8 rounded-xl text-base font-medium shadow-xl shadow-indigo-600/25 transition-all hover:scale-[1.02]"
            >
              Platforma Giriş Yap
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          {/* Stats row */}
          <div className="mt-16 grid grid-cols-3 gap-6 max-w-lg mx-auto">
            {[
              { value: '99.9%', label: 'Uptime' },
              { value: 'ISO 27001', label: 'Güvenlik' },
              { value: '7/24', label: 'Erişim' },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-bold text-white">{s.value}</div>
                <div className="text-xs text-slate-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="border-t border-slate-800/50" />

      {/* Features */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-14">
            <p className="text-xs uppercase tracking-widest text-indigo-400 font-semibold mb-3">Özellikler</p>
            <h2 className="text-3xl font-bold text-white">İhtiyacınız olan her şey bir arada</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: FolderOpen,
                color: 'indigo',
                title: 'Doküman Yönetimi',
                desc: 'Tüm dokümanlarınızı dijital ortamda saklayın. Versiyon kontrolü ve geçmiş takibi otomatik olarak yönetilir.',
              },
              {
                icon: CheckCircle,
                color: 'violet',
                title: 'Onay Süreçleri',
                desc: 'Onay akışlarınızı özelleştirin, adım adım onaylama süreçlerini izleyin ve gecikmeleri önleyin.',
              },
              {
                icon: Users,
                color: 'sky',
                title: 'Rol Tabanlı Erişim',
                desc: 'Kullanıcılara departman ve pozisyonlarına göre özelleştirilmiş yetki seviyeleri tanımlayın.',
              },
              {
                icon: GitBranch,
                color: 'emerald',
                title: 'Versiyon Kontrolü',
                desc: 'Her değişiklik kayıt altına alınır. İstediğiniz versiyona tek tıkla geri dönün.',
              },
              {
                icon: Shield,
                color: 'orange',
                title: 'Güvenlik & Uyumluluk',
                desc: 'ISO standartlarına uygun güvenlik altyapısıyla verileriniz her zaman korunur.',
              },
              {
                icon: Lock,
                color: 'rose',
                title: 'Denetim İzi',
                desc: 'Kim, ne zaman, hangi dokümanı görüntüledi veya düzenledi — tümü kayıt altında.',
              },
            ].map(({ icon: Icon, color, title, desc }) => (
              <div
                key={title}
                className="group p-6 rounded-2xl border border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900 transition-all duration-300"
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4
                    ${color === 'indigo' ? 'bg-indigo-500/15 text-indigo-400' : ''}
                    ${color === 'violet' ? 'bg-violet-500/15 text-violet-400' : ''}
                    ${color === 'sky'    ? 'bg-sky-500/15 text-sky-400' : ''}
                    ${color === 'emerald'? 'bg-emerald-500/15 text-emerald-400' : ''}
                    ${color === 'orange' ? 'bg-orange-500/15 text-orange-400' : ''}
                    ${color === 'rose'   ? 'bg-rose-500/15 text-rose-400' : ''}
                  `}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-white font-semibold mb-2">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="px-6 pb-20">
        <div className="container mx-auto max-w-4xl">
          <div className="relative rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-600/20 to-violet-600/10 p-10 text-center overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.15),transparent_70%)] pointer-events-none" />
            <h3 className="text-2xl font-bold text-white mb-3">Hemen Başlayın</h3>
            <p className="text-slate-400 mb-6 max-w-md mx-auto text-sm">
              Calista DMS ile doküman yönetiminizi bir üst seviyeye taşıyın.
            </p>
            <Button
              onClick={() => router.push('/login')}
              className="bg-white text-slate-900 hover:bg-slate-100 h-11 px-8 rounded-xl font-semibold transition-all hover:scale-[1.02]"
            >
              Platforma Giriş Yap
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 py-8 px-6">
        <div className="container mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <FileCheck className="w-4 h-4 text-white" />
            </div>
            <span className="text-slate-400 text-sm font-medium">Calista Document Management System</span>
          </div>
          <p className="text-slate-600 text-xs">
            © {new Date()?.getFullYear?.()} Calista DMS. Tüm hakları saklıdır.
          </p>
        </div>
      </footer>
    </div>
  );
}
