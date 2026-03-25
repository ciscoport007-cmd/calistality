'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Users, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface CommitteeMemberView {
  id: string;
  role: string;
  startDate: string;
  isActive: boolean;
  committee: { id: string; name: string; code: string; status: string };
  user: { id: string; name: string; surname: string; email: string; department: { name: string } | null };
}

const roleLabels: Record<string, string> = {
  BASKAN: 'Başkan',
  BASKAN_YARDIMCISI: 'Başkan Yardımcısı',
  SEKRETER: 'Sekreter',
  UYE: 'Üye',
  GOZLEMCI: 'Gözlemci',
};

export default function CommitteeMembersPage() {
  const router = useRouter();
  const [members, setMembers] = useState<CommitteeMemberView[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const fetchMembers = async () => {
    try {
      // Tüm komiteleri çekip üyeleri birleştir
      const res = await fetch('/api/committees');
      if (res.ok) {
        const committees = await res.json();
        const allMembers: CommitteeMemberView[] = [];

        for (const committee of committees) {
          const detailRes = await fetch(`/api/committees/${committee.id}`);
          if (detailRes.ok) {
            const detail = await detailRes.json();
            for (const member of detail.members || []) {
              allMembers.push({
                ...member,
                committee: {
                  id: committee.id,
                  name: committee.name,
                  code: committee.code,
                  status: committee.status,
                },
              });
            }
          }
        }

        setMembers(allMembers);
      }
    } catch (error) {
      toast.error('Veriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const filteredMembers = members.filter(m => {
    const matchesSearch = 
      m.user.name.toLowerCase().includes(search.toLowerCase()) ||
      m.user.surname.toLowerCase().includes(search.toLowerCase()) ||
      m.committee.name.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || m.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Kullanıcı bazında grupla
  const userMemberships = new Map<string, CommitteeMemberView[]>();
  filteredMembers.forEach(m => {
    const key = m.user.id;
    if (!userMemberships.has(key)) {
      userMemberships.set(key, []);
    }
    userMemberships.get(key)!.push(m);
  });

  if (loading) {
    return <div className="flex items-center justify-center h-64">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Komite Üyeleri</h1>
          <p className="text-muted-foreground">Tüm komitelerdeki üyeler</p>
        </div>
      </div>

      {/* Filtreler */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Kişi veya komite ara..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-48">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Roller</SelectItem>
                  {Object.entries(roleLabels).map(([key, val]) => (
                    <SelectItem key={key} value={key}>{val}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Özet */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{members.length}</div>
            <p className="text-sm text-muted-foreground">Toplam Üyelik</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{userMemberships.size}</div>
            <p className="text-sm text-muted-foreground">Farklı Kişi</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-500">
              {members.filter(m => m.role === 'BASKAN').length}
            </div>
            <p className="text-sm text-muted-foreground">Başkan</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-500">
              {members.filter(m => m.isActive).length}
            </div>
            <p className="text-sm text-muted-foreground">Aktif Üye</p>
          </CardContent>
        </Card>
      </div>

      {/* Üye Listesi */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kişi</TableHead>
              <TableHead>Departman</TableHead>
              <TableHead>Komite</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Başlangıç</TableHead>
              <TableHead className="text-right">İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMembers.map((member) => (
              <TableRow key={member.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{member.user.name} {member.user.surname}</div>
                    <div className="text-sm text-muted-foreground">{member.user.email}</div>
                  </div>
                </TableCell>
                <TableCell>{member.user.department?.name || '-'}</TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{member.committee.name}</div>
                    <div className="text-sm text-muted-foreground">{member.committee.code}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={member.role === 'BASKAN' ? 'default' : 'outline'}>
                    {roleLabels[member.role] || member.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  {format(new Date(member.startDate), 'dd MMM yyyy', { locale: tr })}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.push(`/dashboard/committees/${member.committee.id}`)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filteredMembers.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Üye bulunamadı
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
