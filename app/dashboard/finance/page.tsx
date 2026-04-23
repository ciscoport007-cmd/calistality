'use client';

import Link from 'next/link';
import { TrendingUp, Upload, BarChart3, Calendar, ChevronRight, DollarSign } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const modules = [
  {
    title: 'Gelirler',
    description: 'Günlük gelir takibi, bütçe karşılaştırması ve kategori analizi',
    href: '/dashboard/finance/gelirler',
    icon: TrendingUp,
    color: 'bg-indigo-50 text-indigo-600',
    actions: [
      { label: 'Veri Yükle', href: '/dashboard/finance/gelirler/yukle', icon: Upload },
      { label: 'Analiz', href: '/dashboard/finance/gelirler/analiz', icon: BarChart3 },
    ],
  },
];

const comingSoon = [
  { title: 'Giderler', description: 'Operasyonel gider takibi ve bütçe yönetimi', icon: DollarSign },
  { title: 'Kar / Zarar', description: 'Gelir-gider dengesi ve karlılık analizi', icon: TrendingUp },
  { title: 'Bütçe Yönetimi', description: 'Yıllık bütçe planlama ve takip', icon: Calendar },
];

export default function FinancePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Finans Yönetimi</h1>
        <p className="text-sm text-gray-500 mt-1">Gelir, gider ve finansal performans takibi</p>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Aktif Modüller</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((mod) => (
            <Card key={mod.href} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${mod.color} mb-3`}>
                  <mod.icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-base">{mod.title}</CardTitle>
                <CardDescription className="text-sm">{mod.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                <Link href={mod.href}>
                  <Button variant="outline" className="w-full justify-between" size="sm">
                    Genel Bakış
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
                <div className="grid grid-cols-2 gap-2">
                  {mod.actions.map((action) => (
                    <Link key={action.href} href={action.href}>
                      <Button variant="ghost" size="sm" className="w-full text-xs justify-start gap-1.5">
                        <action.icon className="h-3.5 w-3.5" />
                        {action.label}
                      </Button>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Yakında</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {comingSoon.map((m) => (
            <Card key={m.title} className="opacity-60 border-dashed">
              <CardHeader className="pb-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-100 text-gray-400 mb-3">
                  <m.icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-base text-gray-500">{m.title}</CardTitle>
                <CardDescription className="text-sm">{m.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">Geliştiriliyor</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
