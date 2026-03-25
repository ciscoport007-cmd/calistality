'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
  Plus,
  Target,
  Calendar,
  MoreVertical,
  Trash2,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
} from 'lucide-react';

interface PoolItem {
  id: string;
  title: string | null;
  description: string | null;
  status: string;
  priority: string | null;
  action: {
    id: string;
    title: string;
    status: string;
    dueDate: string;
    meeting: {
      id: string;
      code: string;
      title: string;
    };
    assignee: {
      id: string;
      name: string;
      surname: string;
    };
  } | null;
  meeting: {
    id: string;
    code: string;
    title: string;
    date: string;
    status: string;
  } | null;
  createdAt: string;
}

interface Meeting {
  id: string;
  code: string;
  title: string;
  date: string;
}

const statusColors: Record<string, string> = {
  BEKLEMEDE: 'bg-gray-100 text-gray-800',
  TOPLANTIDA: 'bg-blue-100 text-blue-800',
  COZULDU: 'bg-green-100 text-green-800',
  IPTAL: 'bg-red-100 text-red-800',
};

const statusLabels: Record<string, string> = {
  BEKLEMEDE: 'Toplantı Bekleniyor',
  TOPLANTIDA: 'Toplantıya Eklendi',
  COZULDU: 'Çözüldü',
  IPTAL: 'İptal Edildi',
};

const priorityColors: Record<string, string> = {
  DUSUK: 'bg-gray-100 text-gray-800',
  ORTA: 'bg-yellow-100 text-yellow-800',
  YUKSEK: 'bg-red-100 text-red-800',
};

const priorityLabels: Record<string, string> = {
  DUSUK: 'Düşük',
  ORTA: 'Orta',
  YUKSEK: 'Yüksek',
};

export default function MeetingPoolPage() {
  const router = useRouter();
  const [poolItems, setPoolItems] = useState<PoolItem[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PoolItem | null>(null);
  const [selectedMeetingId, setSelectedMeetingId] = useState('');
  const [filter, setFilter] = useState('all');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'ORTA',
  });

  useEffect(() => {
    fetchPoolItems();
    fetchMeetings();
  }, []);

  const fetchPoolItems = async () => {
    try {
      const res = await fetch('/api/meeting-pool');
      if (res.ok) {
        const data = await res.json();
        setPoolItems(data);
      }
    } catch (error) {
      console.error('Pool fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMeetings = async () => {
    try {
      const res = await fetch('/api/meetings?status=PLANLANMIS');
      if (res.ok) {
        const data = await res.json();
        setMeetings(data);
      }
    } catch (error) {
      console.error('Meetings fetch error:', error);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title) {
      toast.error('Konu başlığı zorunludur');
      return;
    }

    try {
      const res = await fetch('/api/meeting-pool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success('Konu havuza eklendi');
        setDialogOpen(false);
        setFormData({ title: '', description: '', priority: 'ORTA' });
        fetchPoolItems();
      } else {
        toast.error('Hata oluştu');
      }
    } catch (error) {
      toast.error('Hata oluştu');
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch('/api/meeting-pool', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });

      if (res.ok) {
        toast.success('Durum güncellendi');
        fetchPoolItems();
      }
    } catch (error) {
      toast.error('Hata oluştu');
    }
  };

  const assignToMeeting = async () => {
    if (!selectedItem || !selectedMeetingId) {
      toast.error('Toplantı seçin');
      return;
    }

    try {
      const res = await fetch('/api/meeting-pool', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedItem.id,
          meetingId: selectedMeetingId,
          status: 'TOPLANTIDA',
        }),
      });

      if (res.ok) {
        toast.success('Konu toplantıya eklendi');
        setAssignDialogOpen(false);
        setSelectedItem(null);
        setSelectedMeetingId('');
        fetchPoolItems();
      }
    } catch (error) {
      toast.error('Hata oluştu');
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm('Bu konuyu havuzdan kaldırmak istediğinize emin misiniz?')) return;

    try {
      const res = await fetch(`/api/meeting-pool?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Konu kaldırıldı');
        fetchPoolItems();
      }
    } catch (error) {
      toast.error('Hata oluştu');
    }
  };

  const filteredItems = poolItems.filter(item => {
    if (filter === 'all') return true;
    return item.status === filter;
  });

  const stats = {
    total: poolItems.length,
    waiting: poolItems.filter(i => i.status === 'BEKLEMEDE').length,
    inMeeting: poolItems.filter(i => i.status === 'TOPLANTIDA').length,
    resolved: poolItems.filter(i => i.status === 'COZULDU').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gündem Havuzu</h2>
          <p className="text-muted-foreground">
            Çözülemeyen konular ve bekleyen aksiyonlar
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Konu Ekle
        </Button>
      </div>

      {/* İstatistikler */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gray-100 rounded-full">
                <Target className="h-6 w-6 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Toplam Konu</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-full">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.waiting}</p>
                <p className="text-sm text-muted-foreground">Bekleyen</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.inMeeting}</p>
                <p className="text-sm text-muted-foreground">Toplantıda</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.resolved}</p>
                <p className="text-sm text-muted-foreground">Çözülen</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtre ve Liste */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Havuzdaki Konular</CardTitle>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrele" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tümü</SelectItem>
              <SelectItem value="BEKLEMEDE">Bekleyen</SelectItem>
              <SelectItem value="TOPLANTIDA">Toplantıda</SelectItem>
              <SelectItem value="COZULDU">Çözülen</SelectItem>
              <SelectItem value="IPTAL">İptal</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Yükleniyor...</div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Havuzda konu bulunmuyor
            </div>
          ) : (
            <div className="space-y-4">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium">
                        {item.action ? item.action.title : item.title}
                      </h4>
                      <Badge className={statusColors[item.status]}>
                        {statusLabels[item.status]}
                      </Badge>
                      {item.priority && (
                        <Badge variant="outline" className={priorityColors[item.priority]}>
                          {priorityLabels[item.priority]}
                        </Badge>
                      )}
                    </div>

                    {item.description && (
                      <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                    )}

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {item.action && (
                        <>
                          <span>
                            Kaynak: <span
                              className="text-blue-600 hover:underline cursor-pointer"
                              onClick={() => router.push(`/dashboard/meetings/${item.action!.meeting.id}`)}
                            >
                              {item.action.meeting.code}
                            </span>
                          </span>
                          <span>
                            Sorumlu: {item.action.assignee.name} {item.action.assignee.surname}
                          </span>
                          <span>
                            Bitiş: {format(parseISO(item.action.dueDate), 'd MMM yyyy', { locale: tr })}
                          </span>
                        </>
                      )}
                      {item.meeting && (
                        <span>
                          Toplantı: <span
                            className="text-blue-600 hover:underline cursor-pointer"
                            onClick={() => router.push(`/dashboard/meetings/${item.meeting!.id}`)}
                          >
                            {item.meeting.title} ({format(parseISO(item.meeting.date), 'd MMM', { locale: tr })})
                          </span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.status === 'BEKLEMEDE' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedItem(item);
                          setAssignDialogOpen(true);
                        }}
                      >
                        <Calendar className="mr-1 h-4 w-4" />
                        Toplantıya Ekle
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {item.status !== 'COZULDU' && (
                          <DropdownMenuItem onClick={() => updateStatus(item.id, 'COZULDU')}>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Çözüldü Olarak İşaretle
                          </DropdownMenuItem>
                        )}
                        {item.status !== 'IPTAL' && (
                          <DropdownMenuItem onClick={() => updateStatus(item.id, 'IPTAL')}>
                            <XCircle className="mr-2 h-4 w-4" />
                            İptal Et
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => deleteItem(item.id)} className="text-red-600">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Kaldır
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Yeni Konu Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Havuza Konu Ekle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Konu Başlığı *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Görüşülmesi gereken konu"
              />
            </div>
            <div>
              <Label>Açıklama</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detaylı açıklama..."
              />
            </div>
            <div>
              <Label>Öncelik</Label>
              <Select
                value={formData.priority}
                onValueChange={(v) => setFormData({ ...formData, priority: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DUSUK">Düşük</SelectItem>
                  <SelectItem value="ORTA">Orta</SelectItem>
                  <SelectItem value="YUKSEK">Yüksek</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              İptal
            </Button>
            <Button onClick={handleSubmit}>Ekle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toplantıya Atama Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Toplantıya Ekle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              "{selectedItem?.action?.title || selectedItem?.title}" konusunu hangi toplantıya eklemek istiyorsunuz?
            </p>
            <div>
              <Label>Toplantı Seçin</Label>
              <Select
                value={selectedMeetingId}
                onValueChange={setSelectedMeetingId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Planlanmış toplantı seçin" />
                </SelectTrigger>
                <SelectContent>
                  {meetings.map((meeting) => (
                    <SelectItem key={meeting.id} value={meeting.id}>
                      {meeting.title} - {format(parseISO(meeting.date), 'd MMM yyyy', { locale: tr })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              İptal
            </Button>
            <Button onClick={assignToMeeting}>Ekle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
