'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  ShieldAlert,
  Search,
  Plus,
  AlertTriangle,
  Filter,
  Eye,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/export-utils';

interface OHSRisk {
  id: string;
  code: string;
  name: string;
  description?: string;
  source: string;
  sourceDetail?: string;
  department: { id: string; name: string; code: string };
  owner: { id: string; name: string; surname?: string };
  likelihood: number;
  impact: number;
  riskScore: number;
  riskLevel?: string;
  status: string;
  createdBy: { id: true; name: string; surname?: string };
  createdAt: string;
  _count: { actions: number; assessments: number; comments: number };
}

interface Department {
  id: string;
  name: string;
  code: string;
}

interface User {
  id: string;
  name: string;
  surname?: string;
}

const SOURCE_LABELS: Record<string, string> = {
  TASERON: 'Taşeron',
  EKIPMAN: 'Ekipman',
  CEVRE: 'Çevre',
  INSAN: 'İnsan Faktörü',
  PROSES: 'Proses',
  KIMYASAL: 'Kimyasal',
  FIZIKSEL: 'Fiziksel',
  BIYOLOJIK: 'Biyolojik',
  ERGONOMIK: 'Ergonomik',
  DIGER: 'Diğer',
};

const STATUS_LABELS: Record<string, string> = {
  ACIK: 'Açık',
  AKSIYON_BEKLIYOR: 'Aksiyon Bekliyor',
  DEGERLENDIRMEDE: 'Değerlendirmede',
  KAPATILDI: 'Kapatıldı',
};

const STATUS_COLORS: Record<string, string> = {
  ACIK: 'bg-blue-100 text-blue-800',
  AKSIYON_BEKLIYOR: 'bg-yellow-100 text-yellow-800',
  DEGERLENDIRMEDE: 'bg-purple-100 text-purple-800',
  KAPATILDI: 'bg-gray-100 text-gray-800',
};

const RISK_LEVEL_COLORS: Record<string, string> = {
  DUSUK: 'bg-green-100 text-green-800',
  ORTA: 'bg-yellow-100 text-yellow-800',
  YUKSEK: 'bg-orange-100 text-orange-800',
  COK_YUKSEK: 'bg-red-100 text-red-800',
  KRITIK: 'bg-red-500 text-white',
};

const RISK_LEVEL_LABELS: Record<string, string> = {
  DUSUK: 'Düşük',
  ORTA: 'Orta',
  YUKSEK: 'Yüksek',
  COK_YUKSEK: 'Çok Yüksek',
  KRITIK: 'Kritik',
};

export default function OHSRisksPage() {
  const router = useRouter();
  const [risks, setRisks] = useState<OHSRisk[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  
  // Filtreler
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [minScoreFilter, setMinScoreFilter] = useState('');

  // Form
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    source: '',
    sourceDetail: '',
    departmentId: '',
    ownerId: '',
    likelihood: '',
    impact: '',
  });
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);

  useEffect(() => {
    fetchRisks();
    fetchDepartments();
    fetchUsers();
  }, [search, statusFilter, sourceFilter, departmentFilter, minScoreFilter]);

  const fetchRisks = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (sourceFilter) params.set('source', sourceFilter);
      if (departmentFilter) params.set('departmentId', departmentFilter);
      if (minScoreFilter) params.set('minScore', minScoreFilter);

      const response = await fetch(`/api/ohs/risks?${params}`);
      if (response.ok) {
        const data = await response.json();
        setRisks(Array.isArray(data) ? data : []);
      } else {
        setRisks([]);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Riskler yüklenemedi');
      setRisks([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/departments');
      if (response.ok) {
        const data = await response.json();
        const depts = data.departments || data;
        setDepartments(Array.isArray(depts) ? depts : []);
      }
    } catch (error) {
      console.error('Departments fetch error:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        const list = Array.isArray(data) ? data : (data.users ?? data.data ?? []);
        setUsers(list);
      }
    } catch (error) {
      console.error('Users fetch error:', error);
    }
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.source || !formData.departmentId || !formData.ownerId || !formData.likelihood || !formData.impact) {
      toast.error('Lütfen tüm zorunlu alanları doldurun');
      return;
    }

    try {
      setCreating(true);

      let evidenceCloudPath: string | undefined;
      let evidenceFileName: string | undefined;
      let evidenceFileSize: number | undefined;
      let evidenceFileType: string | undefined;

      // Kanıt dokümanı opsiyonel — yüklendiyse işle
      if (evidenceFile) {
        const presignedResponse = await fetch('/api/upload/presigned', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: evidenceFile.name,
            contentType: evidenceFile.type,
            isPublic: false,
          }),
        });

        if (!presignedResponse.ok) {
          throw new Error('Dosya yükleme URL\'si alınamadı');
        }

        const { uploadUrl, cloud_storage_path } = await presignedResponse.json();

        const uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          body: evidenceFile,
          headers: { 'Content-Type': evidenceFile.type },
        });

        if (!uploadResponse.ok) {
          throw new Error('Dosya yüklenemedi');
        }

        evidenceCloudPath = cloud_storage_path;
        evidenceFileName = evidenceFile.name;
        evidenceFileSize = evidenceFile.size;
        evidenceFileType = evidenceFile.type;
      }

      // Risk kaydı oluştur
      const response = await fetch('/api/ohs/risks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          likelihood: parseInt(formData.likelihood),
          impact: parseInt(formData.impact),
          evidenceFileName,
          evidenceFileSize,
          evidenceFileType,
          evidenceCloudPath,
          evidenceIsPublic: false,
        }),
      });

      if (response.ok) {
        toast.success('Risk başarıyla oluşturuldu');
        setCreateOpen(false);
        setFormData({
          name: '',
          description: '',
          source: '',
          sourceDetail: '',
          departmentId: '',
          ownerId: '',
          likelihood: '',
          impact: '',
        });
        setEvidenceFile(null);
        fetchRisks();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Risk oluşturulamadı');
      }
    } catch (error) {
      console.error('Create error:', error);
      toast.error('Risk oluşturulurken hata oluştu');
    } finally {
      setCreating(false);
    }
  };

  const calculateRiskScore = () => {
    if (formData.likelihood && formData.impact) {
      return parseInt(formData.likelihood) * parseInt(formData.impact);
    }
    return 0;
  };

  const getRiskScoreColor = (score: number) => {
    if (score >= 20) return 'text-red-600 bg-red-100';
    if (score >= 15) return 'text-red-500 bg-red-50';
    if (score >= 10) return 'text-orange-600 bg-orange-100';
    if (score >= 5) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldAlert className="w-7 h-7 text-purple-600" />
            İSG Risk Değerlendirme
          </h1>
          <p className="text-muted-foreground">
            İş güvenliği risklerini değerlendirin ve aksiyonları takip edin
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Yeni Risk
        </Button>
      </div>

      {/* Filtreler */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Risk ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Durum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Durumlar</SelectItem>
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Kaynak" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Kaynaklar</SelectItem>
                {Object.entries(SOURCE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Departman" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Departmanlar</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={minScoreFilter} onValueChange={setMinScoreFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Min Puan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Puanlar</SelectItem>
                <SelectItem value="15">15+ (Yüksek)</SelectItem>
                <SelectItem value="10">10+ (Orta)</SelectItem>
                <SelectItem value="5">5+ (Düşük)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Risk Listesi */}
      <Card>
        <CardHeader>
          <CardTitle>Riskler ({risks.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>
          ) : risks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Henüz risk kaydı bulunmuyor
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kod</TableHead>
                  <TableHead>Risk Adı</TableHead>
                  <TableHead>Kaynak</TableHead>
                  <TableHead>Departman</TableHead>
                  <TableHead className="text-center">Puan</TableHead>
                  <TableHead>Seviye</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Aksiyonlar</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {risks.map((risk) => (
                  <TableRow
                    key={risk.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/dashboard/ohs/risks/${risk.id}`)}
                  >
                    <TableCell className="font-mono text-sm">{risk.code}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{risk.name}</p>
                        {risk.owner && (
                          <p className="text-xs text-muted-foreground">
                            Sorumlu: {risk.owner.name} {risk.owner.surname}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {SOURCE_LABELS[risk.source] || risk.source}
                      </Badge>
                    </TableCell>
                    <TableCell>{risk.department?.name || '-'}</TableCell>
                    <TableCell className="text-center">
                      <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full font-bold ${getRiskScoreColor(risk.riskScore)}`}>
                        {risk.riskScore}
                      </span>
                    </TableCell>
                    <TableCell>
                      {risk.riskLevel && (
                        <Badge className={RISK_LEVEL_COLORS[risk.riskLevel]}>
                          {risk.riskScore >= 15 && <AlertTriangle className="w-3 h-3 mr-1" />}
                          {RISK_LEVEL_LABELS[risk.riskLevel]}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[risk.status]}>
                        {STATUS_LABELS[risk.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {risk._count.actions} Aksiyon
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/dashboard/ohs/risks/${risk.id}`);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Yeni Risk Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Yeni İSG Risk Kaydı</DialogTitle>
            <DialogDescription>Sadece İş Güvenliği Uzmanları risk kaydı oluşturabilir</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Risk Adı *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Risk adını girin"
                />
              </div>

              <div className="space-y-2">
                <Label>Risk Kaynağı *</Label>
                <Select
                  value={formData.source}
                  onValueChange={(value) => setFormData({ ...formData, source: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SOURCE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Kaynak Detayı</Label>
                <Input
                  value={formData.sourceDetail}
                  onChange={(e) => setFormData({ ...formData, sourceDetail: e.target.value })}
                  placeholder="Serbest metin"
                />
              </div>

              <div className="space-y-2">
                <Label>Departman *</Label>
                <Select
                  value={formData.departmentId}
                  onValueChange={(value) => setFormData({ ...formData, departmentId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Risk Sahibi *</Label>
                <Select
                  value={formData.ownerId}
                  onValueChange={(value) => setFormData({ ...formData, ownerId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} {user.surname}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2 space-y-2">
                <Label>Açıklama</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Risk hakkında detaylı açıklama"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Olasılık (1-5) *</Label>
                <Select
                  value={formData.likelihood}
                  onValueChange={(value) => setFormData({ ...formData, likelihood: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Çok Düşük</SelectItem>
                    <SelectItem value="2">2 - Düşük</SelectItem>
                    <SelectItem value="3">3 - Orta</SelectItem>
                    <SelectItem value="4">4 - Yüksek</SelectItem>
                    <SelectItem value="5">5 - Çok Yüksek</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Etki (1-5) *</Label>
                <Select
                  value={formData.impact}
                  onValueChange={(value) => setFormData({ ...formData, impact: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Çok Düşük</SelectItem>
                    <SelectItem value="2">2 - Düşük</SelectItem>
                    <SelectItem value="3">3 - Orta</SelectItem>
                    <SelectItem value="4">4 - Yüksek</SelectItem>
                    <SelectItem value="5">5 - Çok Yüksek</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Risk Puanı Önizleme */}
              {calculateRiskScore() > 0 && (
                <div className="col-span-2 p-4 rounded-lg bg-muted">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Hesaplanan Risk Puanı:</span>
                    <span className={`text-2xl font-bold px-4 py-2 rounded-lg ${getRiskScoreColor(calculateRiskScore())}`}>
                      {calculateRiskScore()}
                    </span>
                  </div>
                  {calculateRiskScore() >= 15 && (
                    <p className="text-sm text-red-600 mt-2 flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" />
                      Yüksek risk! Oluşturulduğunda yöneticilere bildirim gönderilecek.
                    </p>
                  )}
                </div>
              )}

              <div className="col-span-2 space-y-2">
                <Label>Kanıt Dokümanı (Fotoğraf veya PDF)</Label>
                <Input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)}
                />
                {evidenceFile && (
                  <p className="text-sm text-muted-foreground">
                    Seçili: {evidenceFile.name}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                İptal
              </Button>
              <Button onClick={handleCreate} disabled={creating}>
                {creating ? 'Oluşturuluyor...' : 'Oluştur'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
