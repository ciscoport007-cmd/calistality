'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FileText,
  Users,
  Shield,
  Building2,
  Briefcase,
  LogOut,
  Menu,
  X,
  MessageSquareWarning,
  ClipboardCheck,
  ClipboardList,
  AlertTriangle,
  Package,
  Truck,
  BarChart3,
  Target,
  Grid3X3,
  Globe,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  Settings,
  Calendar,
  Bell,
  HardHat,
  Lightbulb,
  UtensilsCrossed,
  Leaf,
  Award,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { signOut, useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

const menuItems = [
  {
    title: 'Ana Sayfa',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Dokümanlar',
    href: '/dashboard/documents',
    icon: FileText,
    subItems: [
      { title: 'Tüm Dokümanlar', href: '/dashboard/documents' },
      { title: 'Klasör Yönetimi', href: '/dashboard/documents/folders' },
      { title: 'Onay İş Akışları', href: '/dashboard/documents/workflows' },
    ],
  },
  {
    title: 'Müşteri Şikayetleri',
    href: '/dashboard/complaints',
    icon: MessageSquareWarning,
  },
  {
    title: 'CAPA / DÖF',
    href: '/dashboard/capas',
    icon: ClipboardCheck,
  },
  {
    title: 'Toplantı Yönetimi',
    href: '/dashboard/meetings',
    icon: Calendar,
    subItems: [
      { title: 'Toplantılar', href: '/dashboard/meetings' },
      { title: 'Gündem Havuzu', href: '/dashboard/meetings/pool' },
      { title: 'Toplantı Salonları', href: '/dashboard/meetings/rooms' },
    ],
  },
  {
    title: 'Denetim Yönetimi',
    href: '/dashboard/audits',
    icon: ClipboardList,
  },
  {
    title: 'Risk Değerlendirmesi',
    href: '/dashboard/risks',
    icon: AlertTriangle,
  },
  {
    title: 'Ekipman Yönetimi',
    href: '/dashboard/equipment',
    icon: Package,
    subItems: [
      { title: 'Tüm Ekipmanlar', href: '/dashboard/equipment' },
      { title: 'Kalibrasyon Takvimi', href: '/dashboard/equipment/calendar' },
    ],
  },
  {
    title: 'Tedarikçi Yönetimi',
    href: '/dashboard/suppliers',
    icon: Truck,
  },
  {
    title: 'HACCP & Gıda Güvenliği',
    href: '/dashboard/haccp',
    icon: UtensilsCrossed,
    subItems: [
      { title: 'Genel Bakış', href: '/dashboard/haccp' },
      { title: 'Sıcaklık Takibi', href: '/dashboard/haccp/temperature' },
      { title: 'CCP Kontrolleri', href: '/dashboard/haccp/ccp' },
      { title: 'Haşere Kontrol', href: '/dashboard/haccp/pest' },
      { title: 'Gıda Numuneleri', href: '/dashboard/haccp/food-samples' },
      { title: 'Temizlik Kontrol', href: '/dashboard/haccp/cleaning' },
      { title: 'Raporlar & Denetim', href: '/dashboard/haccp/reports' },
    ],
  },
  {
    title: 'İş Sağlığı ve Güvenliği',
    href: '/dashboard/ohs',
    icon: HardHat,
    subItems: [
      { title: 'Taşeron Firmalar', href: '/dashboard/ohs/subcontractors' },
      { title: 'İş Kazaları', href: '/dashboard/ohs/accidents' },
      { title: 'Ramak Kala', href: '/dashboard/ohs/near-misses' },
      { title: 'Risk Değerlendirme', href: '/dashboard/ohs/risks' },
      { title: 'Sağlık Gözetimi', href: '/dashboard/ohs/health' },
      { title: 'KKD Takibi', href: '/dashboard/ohs/ppe' },
      { title: 'Acil Durum Yönetimi', href: '/dashboard/ohs/emergency' },
    ],
  },
  {
    title: 'Ölçüm Yönetimi (KPI)',
    href: '/dashboard/kpis',
    icon: BarChart3,
  },
  {
    title: 'Eğitim Yönetimi',
    href: '/dashboard/trainings',
    icon: GraduationCap,
    subItems: [
      { title: 'Eğitim Tanımları', href: '/dashboard/trainings' },
      { title: 'Eğitim Planları', href: '/dashboard/trainings/plans' },
    ],
  },
  {
    title: 'Stratejik Planlama',
    href: '/dashboard/strategy',
    icon: Target,
    subItems: [
      { title: 'Strateji Dönemleri', href: '/dashboard/strategy' },
      { title: 'Aksiyonlar', href: '/dashboard/strategy/actions' },
      { title: 'Performans Karneleri', href: '/dashboard/strategy/scorecards' },
      { title: 'Bireysel Karneler', href: '/dashboard/strategy/individual-scorecards' },
      { title: 'Yetkinlikler', href: '/dashboard/strategy/competencies' },
      { title: 'Puan Skalaları', href: '/dashboard/strategy/score-scales' },
      { title: 'Karne Formülleri', href: '/dashboard/strategy/scorecard-formulas' },
      { title: 'SWOT Analizi', href: '/dashboard/strategy/swot' },
      { title: 'PESTEL Analizi', href: '/dashboard/strategy/pestel' },
    ],
  },
  {
    title: 'Komite Yönetimi',
    href: '/dashboard/committees',
    icon: Users,
    subItems: [
      { title: 'Komiteler', href: '/dashboard/committees' },
      { title: 'Komite Üyeleri', href: '/dashboard/committees/members' },
    ],
  },
  {
    title: 'İnovasyon Yönetimi',
    href: '/dashboard/innovation',
    icon: Lightbulb,
    subItems: [
      { title: 'İnovasyon Fikirleri', href: '/dashboard/innovation' },
      { title: 'Projeler', href: '/dashboard/innovation/projects' },
      { title: 'Kanban Panosu', href: '/dashboard/innovation/kanban' },
      { title: 'Dashboard', href: '/dashboard/innovation/dashboard' },
    ],
  },
  {
    title: 'LQA Kalite Değerlendirme',
    href: '/dashboard/lqa',
    icon: Award,
    subItems: [
      { title: 'Genel Bakış', href: '/dashboard/lqa' },
      { title: 'Standart Kütüphanesi', href: '/dashboard/lqa/standards' },
      { title: 'Denetimler', href: '/dashboard/lqa/audits' },
      { title: 'Raporlar & Analiz', href: '/dashboard/lqa/reports' },
      { title: 'Hedef Yönetimi', href: '/dashboard/lqa/targets' },
    ],
  },
  {
    title: 'Enerji & Çevre Yönetimi',
    href: '/dashboard/sustainability',
    icon: Leaf,
    subItems: [
      { title: 'Genel Bakış', href: '/dashboard/sustainability' },
      { title: 'Enerji Yönetimi', href: '/dashboard/sustainability/energy' },
      { title: 'Su Yönetimi', href: '/dashboard/sustainability/water' },
      { title: 'Atık Yönetimi', href: '/dashboard/sustainability/waste' },
      { title: 'Karbon Ayak İzi', href: '/dashboard/sustainability/carbon' },
      { title: 'Hedef & Aksiyon', href: '/dashboard/sustainability/targets' },
      { title: 'Raporlar & Denetim', href: '/dashboard/sustainability/reports' },
    ],
  },
  {
    title: 'Yönetim',
    href: '/dashboard/users',
    icon: Settings,
    subItems: [
      { title: 'Kullanıcılar', href: '/dashboard/users' },
      { title: 'Roller', href: '/dashboard/roles' },
      { title: 'Departmanlar', href: '/dashboard/departments' },
      { title: 'Denetim Geçmişi', href: '/dashboard/audit-logs' },
      { title: 'Uygulama Ayarları', href: '/dashboard/settings' },
    ],
  },
];

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  link: string | null;
  createdAt: string;
}

const typeColors: Record<string, string> = {
  BILGI: 'bg-blue-100 text-blue-800',
  UYARI: 'bg-yellow-100 text-yellow-800',
  HATA: 'bg-red-100 text-red-800',
  BASARI: 'bg-green-100 text-green-800',
};

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession() || {};
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['Stratejik Planlama']);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [appSettings, setAppSettings] = useState<Record<string, string | null>>({});

  // Fetch app settings
  useEffect(() => {
    const fetchAppSettings = async () => {
      try {
        const res = await fetch('/api/app-settings');
        if (res.ok) {
          const data = await res.json();
          setAppSettings(data);
        }
      } catch (error) {
        console.error('App settings alınırken hata:', error);
      }
    };
    fetchAppSettings();
  }, []);

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  const toggleSubmenu = (title: string) => {
    setExpandedMenus(prev => 
      prev.includes(title) 
        ? prev.filter(t => t !== title)
        : [...prev, title]
    );
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications?limit=10');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Bildirimler alınırken hata:', error);
    }
  };

  // Mark notification as read
  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, { method: 'PATCH' });
      fetchNotifications();
    } catch (error) {
      console.error('Bildirim okunurken hata:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications/mark-all-read', { method: 'POST' });
      fetchNotifications();
    } catch (error) {
      console.error('Bildirimler okunurken hata:', error);
    }
  };

  useEffect(() => {
    if (session?.user) {
      fetchNotifications();
      // Poll every 60 seconds
      const interval = setInterval(fetchNotifications, 60000);
      return () => clearInterval(interval);
    }
  }, [session]);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Az önce';
    if (minutes < 60) return `${minutes} dk önce`;
    if (hours < 24) return `${hours} saat önce`;
    return `${days} gün önce`;
  };

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden fixed top-4 left-4 z-50"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </Button>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed md:sticky top-0 left-0 h-screen w-64 bg-white border-r z-40 transition-transform duration-300',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo & Notifications */}
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {appSettings.appLogo ? (
                  <div className="relative w-10 h-10 flex-shrink-0">
                    <Image
                      src={appSettings.appLogo}
                      alt={appSettings.appName || 'Logo'}
                      fill
                      className="object-contain rounded"
                      unoptimized
                    />
                  </div>
                ) : null}
                <div>
                  <h1 className="text-2xl font-bold text-blue-600">{appSettings.appName || 'QDMS'}</h1>
                  <p className="text-sm text-gray-500 mt-1">{appSettings.appSubtitle || 'Yönetim Paneli'}</p>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="font-semibold">Bildirimler</span>
                    {unreadCount > 0 && (
                      <Button variant="ghost" size="sm" className="text-xs h-auto py-1" onClick={markAllAsRead}>
                        Tümünü Okundu İşaretle
                      </Button>
                    )}
                  </div>
                  <DropdownMenuSeparator />
                  <div className="max-h-[300px] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                        Bildirim bulunmuyor
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <DropdownMenuItem
                          key={notif.id}
                          className={cn(
                            'flex flex-col items-start px-3 py-2 cursor-pointer',
                            !notif.isRead && 'bg-blue-50'
                          )}
                          onClick={() => {
                            if (!notif.isRead) markAsRead(notif.id);
                            if (notif.link) window.location.href = notif.link;
                          }}
                        >
                          <div className="flex items-center gap-2 w-full">
                            <Badge className={cn('text-xs', typeColors[notif.type])}>
                              {notif.type === 'BILGI' && 'Bilgi'}
                              {notif.type === 'UYARI' && 'Uyarı'}
                              {notif.type === 'HATA' && 'Hata'}
                              {notif.type === 'BASARI' && 'Başarı'}
                            </Badge>
                            <span className="text-xs text-muted-foreground ml-auto">
                              {formatTimeAgo(notif.createdAt)}
                            </span>
                          </div>
                          <span className="font-medium text-sm mt-1">{notif.title}</span>
                          <span className="text-xs text-muted-foreground line-clamp-2">{notif.message}</span>
                        </DropdownMenuItem>
                      ))
                    )}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/notifications" className="w-full text-center text-sm text-blue-600">
                      Tüm Bildirimleri Gör
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Menu */}
          <nav className="flex-1 p-4 overflow-y-auto">
            <ul className="space-y-2">
              {(menuItems ?? [])?.map?.((item: any) => {
                const isActive = pathname === item?.href || pathname?.startsWith(item?.href + '/');
                const hasSubItems = item?.subItems && item.subItems.length > 0;
                const isExpanded = expandedMenus.includes(item.title);
                const Icon = item?.icon;

                if (hasSubItems) {
                  return (
                    <li key={item?.href}>
                      <button
                        onClick={() => toggleSubmenu(item.title)}
                        className={cn(
                          'w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors',
                          isActive
                            ? 'bg-blue-50 text-blue-600 font-medium'
                            : 'text-gray-700 hover:bg-gray-100'
                        )}
                      >
                        <div className="flex items-center space-x-3">
                          <Icon className="w-5 h-5" />
                          <span>{item?.title}</span>
                        </div>
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                      {isExpanded && (
                        <ul className="ml-6 mt-1 space-y-1">
                          {item.subItems.map((subItem: any) => {
                            const isSubActive = pathname === subItem.href;
                            return (
                              <li key={subItem.href}>
                                <Link
                                  href={subItem.href}
                                  className={cn(
                                    'block px-4 py-2 rounded-lg text-sm transition-colors',
                                    isSubActive
                                      ? 'bg-blue-50 text-blue-600 font-medium'
                                      : 'text-gray-600 hover:bg-gray-100'
                                  )}
                                  onClick={() => setMobileMenuOpen(false)}
                                >
                                  {subItem.title}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </li>
                  );
                }

                return (
                  <li key={item?.href}>
                    <Link
                      href={item?.href ?? '#'}
                      className={cn(
                        'flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors',
                        isActive
                          ? 'bg-blue-50 text-blue-600 font-medium'
                          : 'text-gray-700 hover:bg-gray-100'
                      )}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item?.title}</span>
                    </Link>
                  </li>
                );
              }) ?? null}
            </ul>
          </nav>

          {/* User Info & Logout */}
          <div className="p-4 border-t space-y-3">
            {/* Kullanıcı Bilgisi */}
            <div className="flex items-center space-x-3 px-2 py-2 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                {session?.user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {session?.user?.name || 'Kullanıcı'}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {session?.user?.position || session?.user?.role || 'Yetkili'}
                </p>
              </div>
            </div>
            
            <Button
              variant="ghost"
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5 mr-3" />
              Çıkış Yap
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </>
  );
}
