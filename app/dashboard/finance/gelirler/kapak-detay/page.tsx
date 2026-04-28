'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, ChevronRight, FileText, BarChart2 } from 'lucide-react';

interface AvailableDate {
  date: string;
  label: string;
  month: string;
}

function groupByMonth(dates: string[]): Record<string, AvailableDate[]> {
  const months: Record<string, AvailableDate[]> = {};
  const monthNames = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
  ];
  for (const d of dates) {
    const dt = new Date(d);
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
    const day = String(dt.getDate()).padStart(2, '0');
    const monthName = monthNames[dt.getMonth()];
    if (!months[key]) months[key] = [];
    months[key].push({
      date: d,
      label: `${day} ${monthName} ${dt.getFullYear()}`,
      month: `${monthName} ${dt.getFullYear()}`,
    });
  }
  return months;
}

export default function KapakDetayListPage() {
  const router = useRouter();
  const [dates, setDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/finance/revenue/detail')
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setDates(res.data);
        else setError('Veriler alınamadı');
      })
      .catch(() => setError('Bağlantı hatası'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-muted-foreground text-sm">Yükleniyor...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-destructive text-sm">{error}</div>
      </div>
    );
  }

  if (dates.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kapak Detay</h1>
          <p className="text-muted-foreground text-sm mt-1">Günlük detay gelir raporlarına buradan ulaşabilirsiniz.</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <FileText className="w-12 h-12 text-muted-foreground/40" />
            <p className="text-muted-foreground text-sm">Henüz veri yüklenmemiş.</p>
            <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/finance/gelirler/yukle')}>
              Excel Yükle
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const grouped = groupByMonth(dates);
  const sortedKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kapak Detay</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Toplam <span className="font-medium text-foreground">{dates.length}</span> gün kayıtlı — departman bazlı detay gelir raporları
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/finance/gelirler/yukle')}>
          <BarChart2 className="w-4 h-4 mr-2" />
          Excel Yükle
        </Button>
      </div>

      {sortedKeys.map((key) => {
        const items = grouped[key];
        return (
          <Card key={key}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-muted-foreground" />
                {items[0].month}
                <Badge variant="secondary" className="ml-auto">{items.length} gün</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-2">
                {items.map((item) => (
                  <button
                    key={item.date}
                    onClick={() => router.push(`/dashboard/finance/gelirler/kapak-detay/${item.date}`)}
                    className="flex items-center justify-between px-3 py-2 rounded-lg border text-sm font-medium hover:bg-accent hover:border-primary/40 transition-colors text-left"
                  >
                    <span>{item.label.split(' ')[0] + ' ' + item.label.split(' ')[1]}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
