'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  link: string | null;
  createdAt: string;
}

const typeLabels: Record<string, string> = {
  BILGI: 'Bilgi',
  UYARI: 'Uyarı',
  HATA: 'Hata',
  BASARI: 'Başarı',
};

const typeColors: Record<string, string> = {
  BILGI: 'bg-blue-100 text-blue-800',
  UYARI: 'bg-yellow-100 text-yellow-800',
  HATA: 'bg-red-100 text-red-800',
  BASARI: 'bg-green-100 text-green-800',
};

const typeIcons: Record<string, any> = {
  BILGI: Info,
  UYARI: AlertTriangle,
  HATA: AlertCircle,
  BASARI: CheckCircle,
};

export default function NotificationsPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [filterRead, setFilterRead] = useState('all');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications?limit=100');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error('Bildirimler alınırken hata:', error);
      toast.error('Bildirimler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, { method: 'PATCH' });
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
      );
      toast.success('Bildirim okundu olarak işaretlendi');
    } catch (error) {
      toast.error('Bildirim güncellenemedi');
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications/mark-all-read', { method: 'POST' });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      toast.success('Tüm bildirimler okundu olarak işaretlendi');
    } catch (error) {
      toast.error('Bildirimler güncellenemedi');
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
      setNotifications(prev => prev.filter(n => n.id !== id));
      toast.success('Bildirim silindi');
    } catch (error) {
      toast.error('Bildirim silinemedi');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredNotifications = notifications.filter(n => {
    if (filterType !== 'all' && n.type !== filterType) return false;
    if (filterRead === 'unread' && n.isRead) return false;
    if (filterRead === 'read' && !n.isRead) return false;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bildirimler</h1>
          <p className="text-muted-foreground mt-1">
            {unreadCount > 0
              ? `${unreadCount} okunmamış bildiriminiz var`
              : 'Tüm bildirimlerinizi görüntüleyin'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button onClick={markAllAsRead}>
            <CheckCheck className="h-4 w-4 mr-2" />
            Tümünü Okundu İşaretle
          </Button>
        )}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Toplam</p>
                <p className="text-2xl font-bold">{notifications.length}</p>
              </div>
              <Bell className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Okunmamış</p>
                <p className="text-2xl font-bold">{unreadCount}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Uyarılar</p>
                <p className="text-2xl font-bold">
                  {notifications.filter(n => n.type === 'UYARI').length}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Hatalar</p>
                <p className="text-2xl font-bold">
                  {notifications.filter(n => n.type === 'HATA').length}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtreler</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tip" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Tipler</SelectItem>
                <SelectItem value="BILGI">Bilgi</SelectItem>
                <SelectItem value="UYARI">Uyarı</SelectItem>
                <SelectItem value="HATA">Hata</SelectItem>
                <SelectItem value="BASARI">Başarı</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterRead} onValueChange={setFilterRead}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Durum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü</SelectItem>
                <SelectItem value="unread">Okunmamış</SelectItem>
                <SelectItem value="read">Okunmuş</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notifications Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Tip</TableHead>
                <TableHead>Başlık</TableHead>
                <TableHead className="hidden md:table-cell">Mesaj</TableHead>
                <TableHead>Tarih</TableHead>
                <TableHead className="w-[100px]">Durum</TableHead>
                <TableHead className="w-[120px]">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredNotifications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Bildirim bulunamadı
                  </TableCell>
                </TableRow>
              ) : (
                filteredNotifications.map((notification) => {
                  const Icon = typeIcons[notification.type];
                  return (
                    <TableRow
                      key={notification.id}
                      className={cn(!notification.isRead && 'bg-blue-50/50')}
                    >
                      <TableCell>
                        <Badge className={typeColors[notification.type]}>
                          <Icon className="h-3 w-3 mr-1" />
                          {typeLabels[notification.type]}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {notification.link ? (
                          <a
                            href={notification.link}
                            className="flex items-center gap-1 text-blue-600 hover:underline"
                          >
                            {notification.title}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          notification.title
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell max-w-[300px] truncate">
                        {notification.message}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(notification.createdAt)}
                      </TableCell>
                      <TableCell>
                        {notification.isRead ? (
                          <Badge variant="outline" className="text-gray-500">
                            <Check className="h-3 w-3 mr-1" />
                            Okundu
                          </Badge>
                        ) : (
                          <Badge className="bg-blue-500">
                            Yeni
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {!notification.isRead && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => markAsRead(notification.id)}
                              title="Okundu İşaretle"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteNotification(notification.id)}
                            className="text-red-500 hover:text-red-700"
                            title="Sil"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
