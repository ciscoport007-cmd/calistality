'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileCheck, User, Mail, Phone, Lock, CheckCircle2 } from 'lucide-react';

interface Department {
  id: string;
  name: string;
  code: string;
}

interface Position {
  id: string;
  name: string;
  code: string;
  departmentId: string | null;
}

export default function SignupPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [signupDomain, setSignupDomain] = useState('calista.com.tr');

  const [formData, setFormData] = useState({
    emailPrefix: '',
    password: '',
    passwordConfirm: '',
    name: '',
    surname: '',
    phone: '',
    departmentId: '',
    positionId: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [deptsRes, posRes, settingsRes] = await Promise.all([
          fetch('/api/public/departments'),
          fetch('/api/public/positions'),
          fetch('/api/app-settings'),
        ]);
        if (deptsRes.ok) setDepartments((await deptsRes.json()).departments ?? []);
        if (posRes.ok) setPositions((await posRes.json()).positions ?? []);
        if (settingsRes.ok) {
          const settings = await settingsRes.json();
          if (settings.signup_domain) setSignupDomain(settings.signup_domain);
        }
      } catch {
        // sessiz hata — varsayılan değerler kullanılır
      }
    };
    fetchData();
  }, []);

  const filteredPositions = useMemo(() => {
    if (!formData.departmentId) return positions;
    return positions.filter(
      (p) => p.departmentId === formData.departmentId || p.departmentId === null
    );
  }, [positions, formData.departmentId]);

  const handleDepartmentChange = (value: string) => {
    setFormData((prev) => ({ ...prev, departmentId: value, positionId: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim() || !formData.surname.trim()) {
      setError('Ad ve soyad zorunludur');
      return;
    }
    if (!formData.emailPrefix.trim()) {
      setError('E-posta kullanıcı adı zorunludur');
      return;
    }
    if (formData.password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır');
      return;
    }
    if (formData.password !== formData.passwordConfirm) {
      setError('Şifreler eşleşmiyor');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailPrefix: formData.emailPrefix.trim(),
          password: formData.password,
          name: formData.name.trim(),
          surname: formData.surname.trim(),
          phone: formData.phone.trim() || undefined,
          departmentId: formData.departmentId || undefined,
          positionId: formData.positionId || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Kayıt işlemi başarısız oldu');
        return;
      }

      setSubmitted(true);
    } catch {
      setError('Bir hata oluştu, lütfen tekrar deneyin');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Kaydınız Alındı</h2>
            <p className="text-gray-600 leading-relaxed">
              Kaydınız başarıyla alındı. Yönetim incelemesinden sonra
              onaylandığında giriş yapabileceksiniz.
            </p>
            <Link href="/login">
              <Button className="w-full bg-blue-600 hover:bg-blue-700 mt-2">
                Giriş Sayfasına Dön
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-2xl">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center">
            <FileCheck className="w-10 h-10 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Kayıt Ol</CardTitle>
            <CardDescription className="mt-1">
              Hesap talebinde bulunun — yönetici onayı gereklidir
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Ad & Soyad */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="name">Ad *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="name"
                    placeholder="Adınız"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="surname">Soyad *</Label>
                <Input
                  id="surname"
                  placeholder="Soyadınız"
                  value={formData.surname}
                  onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1">
              <Label htmlFor="emailPrefix">Kurumsal E-posta *</Label>
              <div className="flex items-center gap-0">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="emailPrefix"
                    placeholder="kullanici.adi"
                    value={formData.emailPrefix}
                    onChange={(e) =>
                      setFormData({ ...formData, emailPrefix: e.target.value.replace(/[@\s]/g, '') })
                    }
                    required
                    className="pl-9 rounded-r-none border-r-0"
                  />
                </div>
                <div className="bg-gray-100 border border-gray-300 rounded-r-md px-3 h-10 flex items-center text-sm text-gray-500 whitespace-nowrap select-none">
                  @{signupDomain}
                </div>
              </div>
            </div>

            {/* Telefon */}
            <div className="space-y-1">
              <Label htmlFor="phone">Telefon</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="phone"
                  placeholder="+90 5xx xxx xx xx"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Departman */}
            <div className="space-y-1">
              <Label>Departman</Label>
              <Select value={formData.departmentId} onValueChange={handleDepartmentChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Departman seçin" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Pozisyon */}
            <div className="space-y-1">
              <Label>Pozisyon</Label>
              <Select
                value={formData.positionId}
                onValueChange={(v) => setFormData({ ...formData, positionId: v })}
                disabled={filteredPositions.length === 0}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      filteredPositions.length === 0 ? 'Önce departman seçin' : 'Pozisyon seçin'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {filteredPositions.map((pos) => (
                    <SelectItem key={pos.id} value={pos.id}>
                      {pos.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Şifre */}
            <div className="space-y-1">
              <Label htmlFor="password">Şifre *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="En az 6 karakter"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="passwordConfirm">Şifre Tekrar *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="passwordConfirm"
                  type="password"
                  placeholder="Şifrenizi tekrar girin"
                  value={formData.passwordConfirm}
                  onChange={(e) => setFormData({ ...formData, passwordConfirm: e.target.value })}
                  required
                  className="pl-9"
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? 'Gönderiliyor...' : 'Kayıt Talebinde Bulun'}
            </Button>

            <p className="text-center text-sm text-gray-500">
              Hesabınız var mı?{' '}
              <Link href="/login" className="text-blue-600 hover:underline font-medium">
                Giriş Yapın
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
