'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, ChevronLeft, ChevronRight, Calendar, Gauge, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface CalibrationEvent {
  id: string;
  equipmentId: string;
  equipmentCode: string;
  equipmentName: string;
  nextCalibrationDate: string | null;
  lastCalibrationDate: string | null;
  calibrationFrequency: number | null;
  status: string;
  requiresCalibration: boolean;
  upcomingCalibrations: {
    id: string;
    code: string;
    title: string;
    plannedDate: string | null;
    status: string;
  }[];
}

const statusColors: Record<string, string> = {
  AKTIF: 'bg-green-500',
  KALIBRASYON_BEKLIYOR: 'bg-orange-500',
  KALIBRASYONDA: 'bg-purple-500',
  ARIZALI: 'bg-red-500',
};

const statusLabels: Record<string, string> = {
  AKTIF: 'Aktif',
  KALIBRASYON_BEKLIYOR: 'Kalibrasyon Bekliyor',
  KALIBRASYONDA: 'Kalibrasyonda',
  ARIZALI: 'Arızalı',
};

export default function CalibrationCalendarPage() {
  const router = useRouter();
  const [equipment, setEquipment] = useState<CalibrationEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'list'>('month');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const fetchEquipment = async () => {
    try {
      const res = await fetch('/api/equipment?pageSize=1000');
      const data = await res.json();
      const equipList = data.equipment || [];
      
      // Sadece kalibrasyon gerektiren ekipmanları filtrele
      const calibrationEquipment = equipList
        .filter((e: any) => e.requiresCalibration)
        .map((e: any) => ({
          id: e.id,
          equipmentId: e.id,
          equipmentCode: e.code,
          equipmentName: e.name,
          nextCalibrationDate: e.nextCalibrationDate,
          lastCalibrationDate: e.lastCalibrationDate,
          calibrationFrequency: e.calibrationFrequency,
          status: e.status,
          requiresCalibration: e.requiresCalibration,
          upcomingCalibrations: e.calibrations?.filter((c: any) => 
            c.status === 'PLANLI' || c.status === 'DEVAM_EDIYOR'
          ) || []
        }));
      
      setEquipment(calibrationEquipment);
    } catch (error) {
      console.error('Error fetching equipment:', error);
      toast.error('Ekipmanlar yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipment();
  }, []);

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const navigateMonth = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const getEventsForDay = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    return equipment.filter((e) => {
      if (e.nextCalibrationDate) {
        const nextDate = new Date(e.nextCalibrationDate).toISOString().split('T')[0];
        return nextDate === dateStr;
      }
      return false;
    });
  };

  const filteredEquipment = useMemo(() => {
    if (filterStatus === 'all') return equipment;
    return equipment.filter(e => e.status === filterStatus);
  }, [equipment, filterStatus]);

  const upcomingCalibrations = useMemo(() => {
    const now = new Date();
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

    return filteredEquipment
      .filter(e => e.nextCalibrationDate)
      .map(e => ({
        ...e,
        nextDate: new Date(e.nextCalibrationDate!),
        daysRemaining: Math.ceil((new Date(e.nextCalibrationDate!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      }))
      .filter(e => e.daysRemaining <= 30 && e.daysRemaining >= -7)
      .sort((a, b) => a.nextDate.getTime() - b.nextDate.getTime());
  }, [filteredEquipment]);

  const overdueCalibrations = useMemo(() => {
    return upcomingCalibrations.filter(e => e.daysRemaining < 0);
  }, [upcomingCalibrations]);

  const soonCalibrations = useMemo(() => {
    return upcomingCalibrations.filter(e => e.daysRemaining >= 0 && e.daysRemaining <= 7);
  }, [upcomingCalibrations]);

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const days = [];
    const dayNames = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

    // Gün adları
    for (let i = 0; i < 7; i++) {
      days.push(
        <div key={`header-${i}`} className="p-2 text-center font-semibold text-gray-600 border-b">
          {dayNames[i]}
        </div>
      );
    }

    // Boş günler
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-2 border-b border-r bg-gray-50" />);
    }

    // Ayın günleri
    for (let day = 1; day <= daysInMonth; day++) {
      const events = getEventsForDay(day);
      const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
      
      days.push(
        <div
          key={day}
          className={`p-2 min-h-[100px] border-b border-r relative ${
            isToday ? 'bg-blue-50 ring-2 ring-blue-300' : 'hover:bg-gray-50'
          }`}
        >
          <span className={`font-medium ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>{day}</span>
          <div className="mt-1 space-y-1">
            {events.slice(0, 3).map((event) => (
              <div
                key={event.id}
                className={`text-xs p-1 rounded truncate cursor-pointer hover:opacity-80 ${statusColors[event.status]} text-white`}
                onClick={() => router.push(`/dashboard/equipment/${event.id}`)}
                title={`${event.equipmentCode} - ${event.equipmentName}`}
              >
                {event.equipmentCode}
              </div>
            ))}
            {events.length > 3 && (
              <div className="text-xs text-gray-500">+{events.length - 3} daha</div>
            )}
          </div>
        </div>
      );
    }

    return days;
  };

  const monthNames = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ];

  if (loading) {
    return <div className="p-6">Yükleniyor...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => router.push('/dashboard/equipment')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Geri
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Kalibrasyon Takvimi</h1>
            <p className="text-sm text-gray-500">Ekipman kalibrasyon planlaması ve takibi</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Durum Filtresi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Durumlar</SelectItem>
              <SelectItem value="AKTIF">Aktif</SelectItem>
              <SelectItem value="KALIBRASYON_BEKLIYOR">Kalibrasyon Bekliyor</SelectItem>
              <SelectItem value="KALIBRASYONDA">Kalibrasyonda</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'month' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('month')}
            >
              <Calendar className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              Liste
            </Button>
          </div>
        </div>
      </div>

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">Kalibrasyon Gerektiren</p>
                <p className="text-2xl font-bold text-blue-800">{equipment.length}</p>
              </div>
              <Gauge className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-red-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600">Süresi Geçmiş</p>
                <p className="text-2xl font-bold text-red-800">{overdueCalibrations.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600">7 Gün İçinde</p>
                <p className="text-2xl font-bold text-orange-800">{soonCalibrations.length}</p>
              </div>
              <Calendar className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">Güncel</p>
                <p className="text-2xl font-bold text-green-800">
                  {equipment.filter(e => e.status === 'AKTIF').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {viewMode === 'month' ? (
        /* Takvim Görünümü */
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center space-x-4">
              <Button variant="outline" size="icon" onClick={() => navigateMonth(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</span>
              <Button variant="outline" size="icon" onClick={() => navigateMonth(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </CardTitle>
            <Button variant="outline" onClick={() => setCurrentDate(new Date())}>
              Bugün
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 border-l border-t">
              {renderCalendar()}
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Liste Görünümü */
        <Card>
          <CardHeader>
            <CardTitle>Yaklaşan Kalibrasyonlar (30 Gün)</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingCalibrations.length === 0 ? (
              <p className="text-center py-8 text-gray-500">Yaklaşan kalibrasyon bulunamadı</p>
            ) : (
              <div className="space-y-3">
                {upcomingCalibrations.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                      item.daysRemaining < 0 ? 'border-red-300 bg-red-50' :
                      item.daysRemaining <= 7 ? 'border-orange-300 bg-orange-50' : ''
                    }`}
                    onClick={() => router.push(`/dashboard/equipment/${item.id}`)}
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`w-3 h-3 rounded-full ${statusColors[item.status]}`} />
                      <div>
                        <p className="font-medium">{item.equipmentCode} - {item.equipmentName}</p>
                        <p className="text-sm text-gray-500">
                          Sonraki Kalibrasyon: {new Date(item.nextCalibrationDate!).toLocaleDateString('tr-TR')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={`${
                        item.daysRemaining < 0 ? 'bg-red-500' :
                        item.daysRemaining <= 7 ? 'bg-orange-500' : 'bg-blue-500'
                      }`}>
                        {item.daysRemaining < 0 
                          ? `${Math.abs(item.daysRemaining)} gün gecikmiş`
                          : item.daysRemaining === 0
                          ? 'Bugün'
                          : `${item.daysRemaining} gün kaldı`
                        }
                      </Badge>
                      <p className="text-xs text-gray-500 mt-1">
                        {item.calibrationFrequency ? `Periyod: ${item.calibrationFrequency} gün` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Süresi Geçmiş Kalibrasyonlar Uyarısı */}
      {overdueCalibrations.length > 0 && (
        <Card className="border-red-300 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Süresi Geçmiş Kalibrasyonlar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {overdueCalibrations.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-white rounded border border-red-200 cursor-pointer hover:bg-red-50"
                  onClick={() => router.push(`/dashboard/equipment/${item.id}`)}
                >
                  <span className="font-medium">{item.equipmentCode} - {item.equipmentName}</span>
                  <Badge className="bg-red-500">{Math.abs(item.daysRemaining)} gün gecikmiş</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
