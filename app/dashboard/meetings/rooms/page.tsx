'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import {
  Plus,
  Pencil,
  Trash2,
  MapPin,
  Users,
  DoorOpen,
} from 'lucide-react';

interface MeetingRoom {
  id: string;
  name: string;
  code: string;
  location: string | null;
  capacity: number | null;
  description: string | null;
  isActive: boolean;
}

export default function MeetingRoomsPage() {
  const [rooms, setRooms] = useState<MeetingRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<MeetingRoom | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    location: '',
    capacity: '',
    description: '',
  });

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const res = await fetch('/api/meeting-rooms');
      if (res.ok) {
        const data = await res.json();
        setRooms(data);
      }
    } catch (error) {
      console.error('Rooms fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.code) {
      toast.error('Salon adı ve kodu zorunludur');
      return;
    }

    try {
      if (editingRoom) {
        // Güncelleme
        const res = await fetch('/api/meeting-rooms', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingRoom.id,
            name: formData.name,
            location: formData.location || null,
            capacity: formData.capacity ? parseInt(formData.capacity) : null,
            description: formData.description || null,
          }),
        });

        if (res.ok) {
          toast.success('Salon güncellendi');
          setDialogOpen(false);
          resetForm();
          fetchRooms();
        } else {
          toast.error('Güncelleme başarısız');
        }
      } else {
        // Yeni oluşturma
        const res = await fetch('/api/meeting-rooms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            code: formData.code,
            location: formData.location || null,
            capacity: formData.capacity ? parseInt(formData.capacity) : null,
            description: formData.description || null,
          }),
        });

        if (res.ok) {
          toast.success('Salon oluşturuldu');
          setDialogOpen(false);
          resetForm();
          fetchRooms();
        } else {
          const error = await res.json();
          toast.error(error.error || 'Hata oluştu');
        }
      }
    } catch (error) {
      toast.error('Hata oluştu');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      location: '',
      capacity: '',
      description: '',
    });
    setEditingRoom(null);
  };

  const openEditDialog = (room: MeetingRoom) => {
    setEditingRoom(room);
    setFormData({
      name: room.name,
      code: room.code,
      location: room.location || '',
      capacity: room.capacity?.toString() || '',
      description: room.description || '',
    });
    setDialogOpen(true);
  };

  const deleteRoom = async (id: string) => {
    if (!confirm('Bu salonu silmek istediğinize emin misiniz?')) return;

    try {
      const res = await fetch(`/api/meeting-rooms?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Salon silindi');
        fetchRooms();
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
          <h2 className="text-2xl font-bold tracking-tight">Toplantı Salonları</h2>
          <p className="text-muted-foreground">
            Toplantı salonlarını yönetin
          </p>
        </div>
        <Button onClick={() => {
          resetForm();
          setDialogOpen(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Yeni Salon
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Salonlar</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Yükleniyor...</div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Henüz toplantı salonu tanımlanmamış
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Salon Adı</TableHead>
                  <TableHead>Kod</TableHead>
                  <TableHead>Konum</TableHead>
                  <TableHead>Kapasite</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rooms.map((room) => (
                  <TableRow key={room.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <DoorOpen className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{room.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{room.code}</Badge>
                    </TableCell>
                    <TableCell>
                      {room.location ? (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          {room.location}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {room.capacity ? (
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          {room.capacity} kişi
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={room.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {room.isActive ? 'Aktif' : 'Pasif'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(room)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteRoom(room.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Salon Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRoom ? 'Salon Düzenle' : 'Yeni Toplantı Salonu'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Salon Adı *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Örn: Ana Toplantı Salonu"
              />
            </div>
            <div>
              <Label>Kod * {editingRoom && '(değiştirilemez)'}</Label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="Örn: SAL-001"
                disabled={!!editingRoom}
              />
            </div>
            <div>
              <Label>Konum</Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Örn: 2. Kat, A Blok"
              />
            </div>
            <div>
              <Label>Kapasite (kişi)</Label>
              <Input
                type="number"
                min={1}
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                placeholder="Örn: 20"
              />
            </div>
            <div>
              <Label>Açıklama</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Salon hakkında notlar..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              İptal
            </Button>
            <Button onClick={handleSubmit}>
              {editingRoom ? 'Güncelle' : 'Oluştur'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
