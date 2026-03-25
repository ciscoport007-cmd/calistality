'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, parseISO, setHours, setMinutes } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  Video,
  Lock,
  MoreVertical,
  Eye,
  Pencil,
  Trash2,
  RefreshCw,
  List,
  LayoutGrid,
  Repeat,
} from 'lucide-react';

interface Meeting {
  id: string;
  code: string;
  title: string;
  description: string | null;
  type: string;
  date: string;
  startTime: string;
  endTime: string;
  room: { id: string; name: string; location: string } | null;
  onlineLink: string | null;
  isOnline: boolean;
  isPrivate: boolean;
  status: string;
  isRecurring: boolean;
  recurrenceType: string | null;
  agenda: string | null;
  department: { id: string; name: string } | null;
  committee: { id: string; name: string; code: string } | null;
  createdBy: { id: string; name: string; surname: string; email: string };
  participants: Array<{
    id: string;
    status: string;
    user: { id: string; name: string; surname: string; email: string };
  }>;
  externalParticipants: Array<{
    id: string;
    name: string;
    email: string | null;
    company: string | null;
    status: string;
  }>;
  _count: { actions: number; documents: number };
}

interface MeetingRoom {
  id: string;
  name: string;
  code: string;
  location: string | null;
  capacity: number | null;
}

interface User {
  id: string;
  name: string;
  surname: string;
  email: string;
}

interface MeetingTemplate {
  id: string;
  name: string;
  users: User[];
}

const statusColors: Record<string, string> = {
  PLANLANMIS: 'bg-blue-100 text-blue-800',
  DEVAM_EDIYOR: 'bg-green-100 text-green-800',
  TAMAMLANDI: 'bg-gray-100 text-gray-800',
  IPTAL: 'bg-red-100 text-red-800',
  ERTELENDI: 'bg-yellow-100 text-yellow-800',
};

const statusLabels: Record<string, string> = {
  PLANLANMIS: 'Planlandı',
  DEVAM_EDIYOR: 'Devam Ediyor',
  TAMAMLANDI: 'Tamamlandı',
  IPTAL: 'İptal',
  ERTELENDI: 'Ertelendi',
};

const typeLabels: Record<string, string> = {
  STANDART: 'Standart',
  PERIYODIK: 'Periyodik',
  AKSIYON_BAZLI: 'Aksiyon Bazlı',
  ACIL: 'Acil',
  KOMITE: 'Komite',
};

export default function MeetingsPage() {
  const router = useRouter();
  const { data: session } = useSession() || {};
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [rooms, setRooms] = useState<MeetingRoom[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [templates, setTemplates] = useState<MeetingTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day' | 'list'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'STANDART',
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '09:00',
    endTime: '10:00',
    roomId: '',
    onlineLink: '',
    isOnline: false,
    isPrivate: false,
    agenda: '',
    participants: [] as string[],
    externalParticipants: [] as { name: string; email: string; phone: string; company: string; title: string }[],
    isRecurring: false,
    recurrenceType: 'HAFTALIK',
    recurrenceInterval: 1,
    recurrenceCount: 4,
  });

  const [externalForm, setExternalForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    title: '',
  });

  useEffect(() => {
    fetchMeetings();
    fetchRooms();
    fetchUsers();
    fetchTemplates();
  }, []);

  const fetchMeetings = async () => {
    try {
      const res = await fetch('/api/meetings');
      if (res.ok) {
        const data = await res.json();
        setMeetings(data);
      }
    } catch (error) {
      console.error('Meetings fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRooms = async () => {
    try {
      const res = await fetch('/api/meeting-rooms');
      if (res.ok) {
        const data = await res.json();
        setRooms(data);
      }
    } catch (error) {
      console.error('Rooms fetch error:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        const userList = data.users || data;
        setUsers(Array.isArray(userList) ? userList : []);
      }
    } catch (error) {
      console.error('Users fetch error:', error);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/meeting-templates');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error('Templates fetch error:', error);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title) {
      toast.error('Toplantı başlığı zorunludur');
      return;
    }

    try {
      const startDateTime = new Date(`${formData.date}T${formData.startTime}:00`);
      const endDateTime = new Date(`${formData.date}T${formData.endTime}:00`);

      const res = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          date: startDateTime.toISOString(),
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          roomId: formData.roomId || null,
        }),
      });

      if (res.ok) {
        toast.success('Toplantı oluşturuldu');
        setDialogOpen(false);
        resetForm();
        fetchMeetings();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Hata oluştu');
      }
    } catch (error) {
      toast.error('Toplantı oluşturulurken hata oluştu');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      type: 'STANDART',
      date: format(new Date(), 'yyyy-MM-dd'),
      startTime: '09:00',
      endTime: '10:00',
      roomId: '',
      onlineLink: '',
      isOnline: false,
      isPrivate: false,
      agenda: '',
      participants: [],
      externalParticipants: [],
      isRecurring: false,
      recurrenceType: 'HAFTALIK',
      recurrenceInterval: 1,
      recurrenceCount: 4,
    });
    setExternalForm({ name: '', email: '', phone: '', company: '', title: '' });
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setFormData(prev => ({
      ...prev,
      date: format(date, 'yyyy-MM-dd'),
    }));
    setDialogOpen(true);
  };

  const addExternalParticipant = () => {
    if (!externalForm.name) {
      toast.error('Katılımcı adı zorunludur');
      return;
    }
    setFormData(prev => ({
      ...prev,
      externalParticipants: [...prev.externalParticipants, { ...externalForm }],
    }));
    setExternalForm({ name: '', email: '', phone: '', company: '', title: '' });
  };

  const removeExternalParticipant = (index: number) => {
    setFormData(prev => ({
      ...prev,
      externalParticipants: prev.externalParticipants.filter((_, i) => i !== index),
    }));
  };

  const applyTemplate = (template: MeetingTemplate) => {
    setFormData(prev => ({
      ...prev,
      participants: template.users.map(u => u.id),
    }));
    toast.success(`"${template.name}" şablonu uygulandı`);
  };

  const saveAsTemplate = async () => {
    if (formData.participants.length === 0) {
      toast.error('En az bir katılımcı seçin');
      return;
    }

    const templateName = prompt('Şablon adı:');
    if (!templateName) return;

    try {
      const res = await fetch('/api/meeting-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateName,
          participants: formData.participants,
        }),
      });

      if (res.ok) {
        toast.success('Şablon kaydedildi');
        fetchTemplates();
      }
    } catch (error) {
      toast.error('Şablon kaydedilemedi');
    }
  };

  const navigate = (direction: 'prev' | 'next') => {
    if (viewMode === 'month') {
      setCurrentDate(direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
    } else if (viewMode === 'week') {
      setCurrentDate(direction === 'prev' ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1));
    } else if (viewMode === 'day') {
      setCurrentDate(direction === 'prev' ? subDays(currentDate, 1) : addDays(currentDate, 1));
    }
  };

  const getDaysForView = () => {
    if (viewMode === 'month') {
      const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
      const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end });
    } else if (viewMode === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end });
    } else {
      return [currentDate];
    }
  };

  const getMeetingsForDay = (day: Date) => {
    return meetings.filter(m => isSameDay(parseISO(m.date), day));
  };

  const days = getDaysForView();
  const weekDays = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

  const deleteMeeting = async (id: string) => {
    if (!confirm('Bu toplantıyı silmek istediğinize emin misiniz?')) return;

    try {
      const res = await fetch(`/api/meetings/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Toplantı silindi');
        fetchMeetings();
      } else {
        toast.error('Silme başarısız');
      }
    } catch (error) {
      toast.error('Hata oluştu');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Toplantı Yönetimi</h2>
          <p className="text-muted-foreground">Toplantılarınızı yönetin ve takip edin</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Yeni Toplantı
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => navigate('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="text-lg font-semibold">
              {viewMode === 'month' && format(currentDate, 'MMMM yyyy', { locale: tr })}
              {viewMode === 'week' && `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'd MMM', { locale: tr })} - ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'd MMM yyyy', { locale: tr })}`}
              {viewMode === 'day' && format(currentDate, 'd MMMM yyyy, EEEE', { locale: tr })}
            </h3>
            <Button variant="outline" size="icon" onClick={() => navigate('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
              Bugün
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'day' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('day')}
            >
              Gün
            </Button>
            <Button
              variant={viewMode === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('week')}
            >
              Hafta
            </Button>
            <Button
              variant={viewMode === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('month')}
            >
              Ay
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Yükleniyor...</div>
          ) : viewMode === 'list' ? (
            <div className="space-y-4">
              {meetings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Henüz toplantı bulunmuyor
                </div>
              ) : (
                meetings.map((meeting) => (
                  <div
                    key={meeting.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => router.push(`/dashboard/meetings/${meeting.id}`)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-center min-w-[60px]">
                        <div className="text-2xl font-bold">
                          {format(parseISO(meeting.date), 'd')}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {format(parseISO(meeting.date), 'MMM', { locale: tr })}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{meeting.title}</h4>
                          {meeting.committee && (
                            <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                              {meeting.committee.name}
                            </Badge>
                          )}
                          {meeting.isPrivate && <Lock className="h-3 w-3 text-muted-foreground" />}
                          {meeting.isRecurring && <Repeat className="h-3 w-3 text-blue-500" />}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(parseISO(meeting.startTime), 'HH:mm')} - {format(parseISO(meeting.endTime), 'HH:mm')}
                          </span>
                          {meeting.room && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {meeting.room.name}
                            </span>
                          )}
                          {meeting.isOnline && (
                            meeting.onlineLink ? (
                              <a href={meeting.onlineLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                <Video className="h-3 w-3" />
                                Online Link
                              </a>
                            ) : (
                              <span className="flex items-center gap-1">
                                <Video className="h-3 w-3" />
                                Online
                              </span>
                            )
                          )}
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {meeting.participants.length + meeting.externalParticipants.length} katılımcı
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={statusColors[meeting.status]}>
                        {statusLabels[meeting.status]}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/dashboard/meetings/${meeting.id}`);
                          }}>
                            <Eye className="mr-2 h-4 w-4" />
                            Görüntüle
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            deleteMeeting(meeting.id);
                          }} className="text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Sil
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div>
              {/* Takvim başlıkları */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {weekDays.map((day) => (
                  <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                    {day}
                  </div>
                ))}
              </div>
              {/* Takvim günleri */}
              <div className={`grid grid-cols-7 gap-1 ${viewMode === 'day' ? 'min-h-[400px]' : ''}`}>
                {days.map((day) => {
                  const dayMeetings = getMeetingsForDay(day);
                  const isToday = isSameDay(day, new Date());
                  const isCurrentMonth = isSameMonth(day, currentDate);

                  return (
                    <div
                      key={day.toISOString()}
                      className={`min-h-[100px] p-1 border rounded-lg cursor-pointer hover:bg-muted/50 ${
                        isToday ? 'bg-blue-50 border-blue-200' : ''
                      } ${!isCurrentMonth && viewMode === 'month' ? 'opacity-50' : ''}`}
                      onDoubleClick={() => handleDateClick(day)}
                    >
                      <div className={`text-sm font-medium mb-1 ${isToday ? 'text-blue-600' : ''}`}>
                        {format(day, 'd')}
                      </div>
                      <div className="space-y-1">
                        {dayMeetings.slice(0, 3).map((meeting) => (
                          <div
                            key={meeting.id}
                            className="text-xs p-1 rounded bg-blue-100 text-blue-800 truncate cursor-pointer hover:bg-blue-200"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/dashboard/meetings/${meeting.id}`);
                            }}
                            title={`${format(parseISO(meeting.startTime), 'HH:mm')} - ${meeting.title}`}
                          >
                            {format(parseISO(meeting.startTime), 'HH:mm')} {meeting.title}
                          </div>
                        ))}
                        {dayMeetings.length > 3 && (
                          <div className="text-xs text-muted-foreground">
                            +{dayMeetings.length - 3} daha
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Yeni Toplantı Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Yeni Toplantı Oluştur</DialogTitle>
            <DialogDescription>
              Toplantı bilgilerini girin ve katılımcıları seçin
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="details">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Detaylar</TabsTrigger>
              <TabsTrigger value="participants">Katılımcılar</TabsTrigger>
              <TabsTrigger value="recurring">Periyodik</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Toplantı Başlığı *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Toplantı başlığı"
                  />
                </div>

                <div>
                  <Label>Tür</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(v) => setFormData({ ...formData, type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STANDART">Standart</SelectItem>
                      <SelectItem value="ACIL">Acil</SelectItem>
                      <SelectItem value="AKSIYON_BAZLI">Aksiyon Bazlı</SelectItem>
                      <SelectItem value="KOMITE">Komite</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Tarih *</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Başlangıç Saati *</Label>
                  <Input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Bitiş Saati *</Label>
                  <Input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Toplantı Salonu</Label>
                  <Select
                    value={formData.roomId || 'NONE'}
                    onValueChange={(v) => setFormData({ ...formData, roomId: v === 'NONE' ? '' : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Salon seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Fixed empty value issue */}
                      <SelectItem value="NONE">Seçilmedi</SelectItem>
                      {rooms.map((room) => (
                        <SelectItem key={room.id} value={room.id}>
                          {room.name} {room.capacity && `(${room.capacity} kişi)`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Online Link</Label>
                  <Input
                    value={formData.onlineLink}
                    onChange={(e) => setFormData({ ...formData, onlineLink: e.target.value })}
                    placeholder="https://..."
                  />
                </div>

                <div className="col-span-2 flex items-center gap-6">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isOnline"
                      checked={formData.isOnline}
                      onCheckedChange={(c) => setFormData({ ...formData, isOnline: !!c })}
                    />
                    <label htmlFor="isOnline" className="text-sm">Online Toplantı</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isPrivate"
                      checked={formData.isPrivate}
                      onCheckedChange={(c) => setFormData({ ...formData, isPrivate: !!c })}
                    />
                    <label htmlFor="isPrivate" className="text-sm">Gizli Toplantı</label>
                  </div>
                </div>

                <div className="col-span-2">
                  <Label>Gündem</Label>
                  <Textarea
                    value={formData.agenda}
                    onChange={(e) => setFormData({ ...formData, agenda: e.target.value })}
                    placeholder="Toplantı gündem maddeleri..."
                    rows={3}
                  />
                </div>

                <div className="col-span-2">
                  <Label>Açıklama</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Toplantı açıklaması..."
                    rows={2}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="participants" className="space-y-4 mt-4">
              {/* Şablon seçimi */}
              {templates.length > 0 && (
                <div className="flex items-center gap-2">
                  <Label>Şablon Uygula:</Label>
                  <Select onValueChange={(v) => {
                    const t = templates.find(t => t.id === v);
                    if (t) applyTemplate(t);
                  }}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Şablon seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Kurum içi katılımcılar */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Kurum İçi Katılımcılar</Label>
                  {formData.participants.length > 0 && (
                    <Button variant="outline" size="sm" onClick={saveAsTemplate}>
                      Şablon Olarak Kaydet
                    </Button>
                  )}
                </div>
                <div className="border rounded-lg p-2 max-h-[200px] overflow-y-auto space-y-1">
                  {users.filter(u => u.id !== session?.user?.id).map((user) => (
                    <div key={user.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`user-${user.id}`}
                        checked={formData.participants.includes(user.id)}
                        onCheckedChange={(c) => {
                          if (c) {
                            setFormData(prev => ({
                              ...prev,
                              participants: [...prev.participants, user.id],
                            }));
                          } else {
                            setFormData(prev => ({
                              ...prev,
                              participants: prev.participants.filter(id => id !== user.id),
                            }));
                          }
                        }}
                      />
                      <label htmlFor={`user-${user.id}`} className="text-sm">
                        {user.name} {user.surname} ({user.email})
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Kurum dışı katılımcılar */}
              <div>
                <Label>Kurum Dışı Davetliler</Label>
                <div className="grid grid-cols-5 gap-2 mt-2">
                  <Input
                    placeholder="Ad Soyad *"
                    value={externalForm.name}
                    onChange={(e) => setExternalForm({ ...externalForm, name: e.target.value })}
                  />
                  <Input
                    placeholder="E-posta"
                    value={externalForm.email}
                    onChange={(e) => setExternalForm({ ...externalForm, email: e.target.value })}
                  />
                  <Input
                    placeholder="Telefon"
                    value={externalForm.phone}
                    onChange={(e) => setExternalForm({ ...externalForm, phone: e.target.value })}
                  />
                  <Input
                    placeholder="Firma"
                    value={externalForm.company}
                    onChange={(e) => setExternalForm({ ...externalForm, company: e.target.value })}
                  />
                  <Button onClick={addExternalParticipant}>Ekle</Button>
                </div>
                {formData.externalParticipants.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {formData.externalParticipants.map((p, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-muted rounded">
                        <span className="text-sm">
                          {p.name} {p.company && `(${p.company})`} {p.email && `- ${p.email}`}
                        </span>
                        <Button variant="ghost" size="sm" onClick={() => removeExternalParticipant(i)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="recurring" className="space-y-4 mt-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isRecurring"
                  checked={formData.isRecurring}
                  onCheckedChange={(c) => setFormData({ ...formData, isRecurring: !!c })}
                />
                <label htmlFor="isRecurring" className="text-sm font-medium">
                  Periyodik Toplantı
                </label>
              </div>

              {formData.isRecurring && (
                <div className="grid grid-cols-2 gap-4 pl-6">
                  <div>
                    <Label>Tekrar Sıklığı</Label>
                    <Select
                      value={formData.recurrenceType}
                      onValueChange={(v) => setFormData({ ...formData, recurrenceType: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GUNLUK">Günlük</SelectItem>
                        <SelectItem value="HAFTALIK">Haftalık</SelectItem>
                        <SelectItem value="AYLIK">Aylık</SelectItem>
                        <SelectItem value="YILLIK">Yıllık</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Her kaç {formData.recurrenceType === 'GUNLUK' ? 'günde' : formData.recurrenceType === 'HAFTALIK' ? 'haftada' : formData.recurrenceType === 'AYLIK' ? 'ayda' : 'yılda'} bir</Label>
                    <Input
                      type="number"
                      min={1}
                      value={formData.recurrenceInterval}
                      onChange={(e) => setFormData({ ...formData, recurrenceInterval: parseInt(e.target.value) || 1 })}
                    />
                  </div>

                  <div>
                    <Label>Tekrar Sayısı</Label>
                    <Input
                      type="number"
                      min={1}
                      max={52}
                      value={formData.recurrenceCount}
                      onChange={(e) => setFormData({ ...formData, recurrenceCount: parseInt(e.target.value) || 1 })}
                    />
                  </div>

                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">
                      Bu ayarlarla toplam {formData.recurrenceCount + 1} toplantı oluşturulacak.
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              İptal
            </Button>
            <Button onClick={handleSubmit}>Oluştur</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
