'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Mail, Lock } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e?.preventDefault?.();
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        toast({
          title: 'Giriş Başarısız',
          description: 'Email veya şifre hatalı',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Giriş Başarılı',
          description: 'Yönlendiriliyorsunuz...',
        });
        router.refresh();
        router.push('/dashboard');
      }
    } catch (error) {
      toast({
        title: 'Hata',
        description: 'Bir hata oluştu, lütfen tekrar deneyin',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="space-y-6 text-center pb-2">
          {/* Logo */}
          <div className="flex flex-col items-center gap-3">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="64" height="64" rx="16" fill="#1D4ED8"/>
              <rect x="16" y="12" width="22" height="28" rx="3" fill="white" fillOpacity="0.2"/>
              <rect x="18" y="14" width="22" height="28" rx="3" fill="white"/>
              <line x1="23" y1="21" x2="35" y2="21" stroke="#1D4ED8" strokeWidth="2" strokeLinecap="round"/>
              <line x1="23" y1="26" x2="35" y2="26" stroke="#1D4ED8" strokeWidth="2" strokeLinecap="round"/>
              <line x1="23" y1="31" x2="30" y2="31" stroke="#1D4ED8" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="43" cy="43" r="10" fill="#2563EB" stroke="white" strokeWidth="2"/>
              <path d="M39 43.5L42 46.5L47.5 40" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {/* Wordmark */}
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-2xl font-black tracking-widest text-gray-900 leading-none">
                CALISTA
              </span>
              <div className="flex items-center gap-2">
                <span className="h-px w-6 bg-blue-600" />
                <span className="text-[10px] font-semibold tracking-[0.25em] text-blue-600 uppercase">
                  Document Management System
                </span>
                <span className="h-px w-6 bg-blue-600" />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="ornek@sirket.com"
                  value={email}
                  onChange={(e) => setEmail(e?.target?.value ?? '')}
                  required
                  autoComplete="email"
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Şifre</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e?.target?.value ?? '')}
                  required
                  autoComplete="current-password"
                  className="pl-10"
                />
              </div>
            </div>
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm text-gray-600 space-y-2">
            <p>
              Hesabınız yok mu?{' '}
              <a href="/signup" className="text-blue-600 hover:underline font-medium">
                Kayıt Ol
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
