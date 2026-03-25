'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Users, Building2, Calendar, Search, Eye, Trash2, CheckCircle, Shield, Upload, FileText, X, MapPin, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface Committee {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: string;
  status: string;
  gmApproval: boolean;
  department: { id: string; name: string } | null;
  chairman: { id: string; name: string; surname: string } | null;
  secretary: { id: string; name: string; surname: string } | null;
  meetingRoom: { id: string; name: string; code: string; location: string | null } | null;
  _count: { members: number; meetings: number; documents: number };
  createdAt: string;
}

interface Department {
  id: string;
  name: string;
  code?: string;
}

interface User {
  id: string;
  name: string;
  surname?: string;
  email: string;
  department?: { id: string; name: string } | null;
  position?: { id: string; name: string } | null;
  role?: { name: string } | null;
}

interface MeetingRoom {
  id: string;
  name: string;
  code: string;
  location?: string;
  capacity?: number;
}

const typeLabels: Record<string, string> = {
  DAIMI: 'Daimi',
  GECICI: 'Geçici',
  PROJE: 'Proje',
  YONETIM: 'Yönetim',
  DENETIM: 'Denetim',
  KALITE: 'Kalite',
};

const statusLabels: Record<string, { label: string; color: string }> = {
  TASLAK: { label: 'Taslak', color: 'bg-gray-500' },
  AKTIF: { label: 'Aktif', color: 'bg-green-500' },
  ASKIDA: { label: 'Askıda', color: 'bg-yellow-500' },
  KAPALI: { label: 'Kapalı', color: 'bg-red-500' },
};

const frequencyLabels: Record<string, string> = {
  HAFTALIK: 'Haftalık',
  IKI_HAFTADA_BIR: '2 Haftada 1',
  AYLIK: 'Aylık',
  IKI_AYDA_BIR: '2 Ayda 1',
  CEYREKLIK: 'Çeyreklik',
  YILLIK: 'Yıllık',
};

export default function CommitteesPage() {
  const router = useRouter();
  const { data: session } = useSession() || {};
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [committees, setCommittees] = useState<Committee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [meetingRooms, setMeetingRooms] = useState<MeetingRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'DAIMI',
    departmentId: '',
    chairmanId: '',
    secretaryId: '',
    mission: '',
    authorities: '',
    meetingFrequency: '',
    meetingRoomId: '',
    meetingTime: '',
    establishedDate: '',
    firstMeetingDate: '',
    responsibilitiesFile: '',
    responsibilitiesFileName: '',
  });

  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [memberSearchTerm, setMemberSearchTerm] = useState('');

  const fetchCommittees = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (typeFilter !== 'all') params.append('type', typeFilter);

      const res = await fetch(`/api/committees?${params}`);
      if (res.ok) {
        const data = await res.json();
        setCommittees(data);
      }
    } catch (error) {
      toast.error('Komiteler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/departments');
      if (res.ok) {
        const data = await res.json();
        const depts = data.departments || data;
        setDepartments(Array.isArray(depts) ? depts : []);
      }
    } catch (error) {
      console.error('Departments fetch error:', error);
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

  const fetchMeetingRooms = async () => {
    try {
      const res = await fetch('/api/meeting-rooms');
      if (res.ok) {
        const data = await res.json();
        setMeetingRooms(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Meeting rooms fetch error:', error);
    }
  };

  useEffect(() => {
    fetchCommittees();
    fetchDepartments();
    fetchUsers();
    fetchMeetingRooms();
  }, [statusFilter, typeFilter]);

  // Hızlı kullanıcı grupları
  const getManagementUsers = () => {
    return users.filter(u => 
      u.role?.name?.toLowerCase().includes('yönetici') ||
      u.role?.name?.toLowerCase().includes('yonetici') ||
      u.role?.name?.toLowerCase().includes('admin') ||
      u.role?.name?.toLowerCase().includes('management') ||
      u.position?.name?.toLowerCase().includes('genel müdür') ||
      u.position?.name?.toLowerCase().includes('müdür yardımcısı')
    );
  };

  const getManagerUsers = () => {
    return users.filter(u => 
      u.position?.name?.toLowerCase().includes('müdür') ||
      u.position?.name?.toLowerCase().includes('mudur') ||
      u.position?.name?.toLowerCase().includes('director') ||
      u.position?.name?.toLowerCase().includes('manager')
    );
  };

  const getDepartmentUsers = (deptId: string) => {
    return users.filter(u => u.department?.id === deptId);
  };

  const handleQuickSelect = (type: 'management' | 'managers' | 'department', deptId?: string) => {
    let userIds: string[] = [];
    if (type === 'management') {
      userIds = getManagementUsers().map(u => u.id);
    } else if (type === 'managers') {
      userIds = getManagerUsers().map(u => u.id);
    } else if (type === 'department' && deptId) {
      userIds = getDepartmentUsers(deptId).map(u => u.id);
    }
    
    setSelectedMembers(prev => {
      const newSet = new Set([...prev, ...userIds]);
      return Array.from(newSet);
    });
    toast.success(`${userIds.length} kullanıcı eklendi`);
  };

  const toggleMember = (userId: string) => {
    setSelectedMembers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Sadece PDF dosyası yükleyebilirsiniz');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Dosya boyutu 10MB\'tan küçük olmalıdır');
      return;
    }

    setUploadingPdf(true);
    try {
      // Presigned URL al
      const presignRes = await fetch('/api/upload/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          isPublic: false,
        }),
      });

      if (!presignRes.ok) {
        throw new Error('Upload URL alınamadı');
      }

      const { uploadUrl, cloud_storage_path } = await presignRes.json();

      // S3'e yükle
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      if (!uploadRes.ok) {
        throw new Error('Dosya yüklenemedi');
      }

      setFormData(prev => ({
        ...prev,
        responsibilitiesFile: cloud_storage_path,
        responsibilitiesFileName: file.name,
      }));

      toast.success('PDF dosyası yüklendi');
    } catch (error) {
      console.error('PDF upload error:', error);
      toast.error('PDF yüklenirken hata oluştu');
    } finally {
      setUploadingPdf(false);
    }
  };

  const removePdf = () => {
    setFormData(prev => ({
      ...prev,
      responsibilitiesFile: '',
      responsibilitiesFileName: '',
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      toast.error('Komite adı zorunludur');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/committees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          departmentId: formData.departmentId || null,
          chairmanId: formData.chairmanId || null,
          secretaryId: formData.secretaryId || null,
          meetingRoomId: formData.meetingRoomId || null,
          memberIds: selectedMembers,
        }),
      });

      if (res.ok) {
        toast.success('Komite oluşturuldu');
        setDialogOpen(false);
        resetForm();
        fetchCommittees();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Bir hata oluştu');
      }
    } catch (error) {
      console.error('Submit error:', error);
      toast.error('Bir hata oluştu');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '', description: '', type: 'DAIMI', departmentId: '', chairmanId: '',
      secretaryId: '', mission: '', authorities: '',
      meetingFrequency: '', meetingRoomId: '', meetingTime: '', establishedDate: '',
      firstMeetingDate: '', responsibilitiesFile: '', responsibilitiesFileName: '',
    });
    setSelectedMembers([]);
    setMemberSearchTerm('');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu komiteyi silmek istediğinize emin misiniz?')) return;
    try {
      const res = await fetch(`/api/committees/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Komite silindi');
        fetchCommittees();
      }
    } catch (error) {
      toast.error('Silme işlemi başarısız');
    }
  };

  const filteredCommittees = committees.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code.toLowerCase().includes(search.toLowerCase())
  );

  const filteredUsers = users.filter(u => {
    if (!memberSearchTerm) return true;
    const searchLower = memberSearchTerm.toLowerCase();
    return (
      u.name?.toLowerCase().includes(searchLower) ||
      u.surname?.toLowerCase().includes(searchLower) ||
      u.email?.toLowerCase().includes(searchLower) ||
      u.department?.name?.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return <div className="flex items-center justify-center h-64">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Komite Yönetimi</h1>
          <p className="text-muted-foreground">Kurumsal komiteler ve üyelik yönetimi</p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Yeni Komite
        </Button>
      </div>

      {/* Filtreler */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Ara..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-40">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Durum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Durumlar</SelectItem>
                  {Object.entries(statusLabels).map(([key, val]) => (
                    <SelectItem key={key} value={key}>{val.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-40">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tip" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Tipler</SelectItem>
                  {Object.entries(typeLabels).map(([key, val]) => (
                    <SelectItem key={key} value={key}>{val}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Özet Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{committees.length}</div>
            <p className="text-sm text-muted-foreground">Toplam Komite</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-500">
              {committees.filter(c => c.status === 'AKTIF').length}
            </div>
            <p className="text-sm text-muted-foreground">Aktif</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-500">
              {committees.filter(c => c.gmApproval).length}
            </div>
            <p className="text-sm text-muted-foreground">GM Onaylı</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">
              {committees.reduce((sum, c) => sum + c._count.members, 0)}
            </div>
            <p className="text-sm text-muted-foreground">Toplam Üye</p>
          </CardContent>
        </Card>
      </div>

      {/* Komite Listesi */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Komite</TableHead>
              <TableHead>Tip</TableHead>
              <TableHead>Başkan</TableHead>
              <TableHead>Toplantı Salonu</TableHead>
              <TableHead className="text-center">Üye</TableHead>
              <TableHead>GM Onay</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead className="text-right">İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCommittees.map((committee) => (
              <TableRow key={committee.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{committee.name}</div>
                    <div className="text-sm text-muted-foreground">{committee.code}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{typeLabels[committee.type] || committee.type}</Badge>
                </TableCell>
                <TableCell>
                  {committee.chairman ? (
                    <span>{committee.chairman.name} {committee.chairman.surname}</span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {committee.meetingRoom ? (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span>{committee.meetingRoom.name}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="secondary">{committee._count.members}</Badge>
                </TableCell>
                <TableCell>
                  {committee.gmApproval ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge className={statusLabels[committee.status]?.color || 'bg-gray-500'}>
                    {statusLabels[committee.status]?.label || committee.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => router.push(`/dashboard/committees/${committee.id}`)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(committee.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredCommittees.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Henüz komite oluşturulmamış
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Yeni Komite Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Yeni Komite Oluştur</DialogTitle>
            <DialogDescription>Kurumsal komite bilgilerini girin</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Temel Bilgiler */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">Temel Bilgiler</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Komite Adı *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Örn: Kalite Komitesi"
                  />
                </div>
                <div>
                  <Label>Komite Tipi</Label>
                  <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(typeLabels).map(([key, val]) => (
                        <SelectItem key={key} value={key}>{val}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Açıklama</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Komite hakkında kısa açıklama"
                  rows={2}
                />
              </div>
            </div>

            {/* Organizasyon */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">Organizasyon</h3>
              
              {/* Departman Seçimi */}
              <div>
                <Label>Departman</Label>
                <div className="flex gap-2 mb-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickSelect('management')}
                  >
                    <Shield className="h-3 w-3 mr-1" /> Management
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickSelect('managers')}
                  >
                    <Users className="h-3 w-3 mr-1" /> Müdürler
                  </Button>
                </div>
                <Select
                  value={formData.departmentId || 'none'}
                  onValueChange={(v) => setFormData({ ...formData, departmentId: v === 'none' ? '' : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Departman seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tüm Kurum</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Başkan</Label>
                  <Select
                    value={formData.chairmanId || 'none'}
                    onValueChange={(v) => setFormData({ ...formData, chairmanId: v === 'none' ? '' : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Seçiniz</SelectItem>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name} {u.surname} {u.department ? `(${u.department.name})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Sekreter</Label>
                  <Select
                    value={formData.secretaryId || 'none'}
                    onValueChange={(v) => setFormData({ ...formData, secretaryId: v === 'none' ? '' : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Seçiniz</SelectItem>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name} {u.surname} {u.department ? `(${u.department.name})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Üye Seçimi */}
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b pb-2">
                <h3 className="font-semibold text-lg">Üyeler</h3>
                <Badge variant="secondary">{selectedMembers.length} seçili</Badge>
              </div>

              {/* Hızlı Grup Seçimi */}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickSelect('management')}
                >
                  <Shield className="h-3 w-3 mr-1" /> Management Ekle
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickSelect('managers')}
                >
                  <Users className="h-3 w-3 mr-1" /> Müdürleri Ekle
                </Button>
                {formData.departmentId && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickSelect('department', formData.departmentId)}
                  >
                    <Building2 className="h-3 w-3 mr-1" /> Departman Üyelerini Ekle
                  </Button>
                )}
                {selectedMembers.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedMembers([])}
                    className="text-red-500"
                  >
                    <X className="h-3 w-3 mr-1" /> Tümünü Kaldır
                  </Button>
                )}
              </div>

              {/* Üye Arama */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Kullanıcı ara..."
                  value={memberSearchTerm}
                  onChange={(e) => setMemberSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Üye Listesi */}
              <ScrollArea className="h-[200px] border rounded-md p-2">
                <div className="space-y-1">
                  {filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      className={`flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer ${
                        selectedMembers.includes(user.id) ? 'bg-primary/10' : ''
                      }`}
                      onClick={() => toggleMember(user.id)}
                    >
                      <Checkbox
                        checked={selectedMembers.includes(user.id)}
                        onCheckedChange={() => toggleMember(user.id)}
                      />
                      <div className="flex-1">
                        <div className="font-medium">
                          {user.name} {user.surname}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {user.department?.name || 'Departman yok'} • {user.email}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Görev & Sorumluluk */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">Görev & Sorumluluk</h3>
              
              <div>
                <Label>Misyon</Label>
                <Textarea
                  value={formData.mission}
                  onChange={(e) => setFormData({ ...formData, mission: e.target.value })}
                  placeholder="Komitenin misyonu"
                  rows={2}
                />
              </div>

              <div>
                <Label>Sorumluluklar (PDF)</Label>
                <div className="mt-2">
                  {formData.responsibilitiesFileName ? (
                    <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/50">
                      <FileText className="h-5 w-5 text-red-500" />
                      <span className="flex-1 truncate">{formData.responsibilitiesFileName}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={removePdf}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div
                      className="border-2 border-dashed rounded-md p-6 text-center cursor-pointer hover:bg-muted/50 transition"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {uploadingPdf ? (
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>Yükleniyor...</span>
                        </div>
                      ) : (
                        <>
                          <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">
                            PDF dosyası yüklemek için tıklayın
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Maksimum 10MB
                          </p>
                        </>
                      )}
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handlePdfUpload}
                    className="hidden"
                  />
                </div>
              </div>

              <div>
                <Label>Yetkiler (Opsiyonel)</Label>
                <Textarea
                  value={formData.authorities}
                  onChange={(e) => setFormData({ ...formData, authorities: e.target.value })}
                  placeholder="Her satıra bir yetki (opsiyonel)"
                  rows={2}
                />
              </div>
            </div>

            {/* Toplantı Ayarları */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">Toplantı Ayarları</h3>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Toplantı Sıklığı</Label>
                  <Select
                    value={formData.meetingFrequency || 'none'}
                    onValueChange={(v) => setFormData({ ...formData, meetingFrequency: v === 'none' ? '' : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Seçiniz</SelectItem>
                      {Object.entries(frequencyLabels).map(([key, val]) => (
                        <SelectItem key={key} value={key}>{val}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Toplantı Salonu</Label>
                  <Select
                    value={formData.meetingRoomId || 'none'}
                    onValueChange={(v) => setFormData({ ...formData, meetingRoomId: v === 'none' ? '' : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Seçiniz</SelectItem>
                      {meetingRooms.map((room) => (
                        <SelectItem key={room.id} value={room.id}>
                          {room.name} {room.location ? `(${room.location})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Toplantı Saati</Label>
                  <Input
                    type="time"
                    value={formData.meetingTime}
                    onChange={(e) => setFormData({ ...formData, meetingTime: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>İlk Toplantı Günü</Label>
                  <Input
                    type="date"
                    value={formData.firstMeetingDate}
                    onChange={(e) => setFormData({ ...formData, firstMeetingDate: e.target.value })}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Sıklık seçiliyse, bu tarihten itibaren 1 yıllık toplantılar otomatik oluşturulur
                  </p>
                </div>
                <div>
                  <Label>Kuruluş Tarihi</Label>
                  <Input
                    type="date"
                    value={formData.establishedDate}
                    onChange={(e) => setFormData({ ...formData, establishedDate: e.target.value })}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>İptal</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Oluşturuluyor...
                </>
              ) : (
                'Oluştur'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
