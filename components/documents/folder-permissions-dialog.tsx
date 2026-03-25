'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Shield, Edit3, Users, CheckCircle } from 'lucide-react';

interface Position {
  id: string;
  name: string;
  code: string;
}

interface ApprovalPosition {
  id: string;
  positionId: string;
  approvalStage: string;
  order: number;
  isRequired: boolean;
  position: Position;
}

interface PreparerPosition {
  id: string;
  positionId: string;
  canCreate: boolean;
  canRevise: boolean;
  position: Position;
}

interface FolderPermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderId: string;
  folderName: string;
}

const APPROVAL_STAGES = [
  { value: 'SISTEM_ON_ONAY', label: 'Sistem Ön Onayı', color: 'bg-blue-500' },
  { value: 'KONTROL_EDEN', label: 'Kontrol Eden', color: 'bg-yellow-500' },
  { value: 'SON_ONAY', label: 'Son Onay', color: 'bg-green-500' },
  { value: 'GOZDEN_GECIRECEK', label: 'Gözden Geçirecek', color: 'bg-purple-500' },
];

export function FolderPermissionsDialog({
  open,
  onOpenChange,
  folderId,
  folderName,
}: FolderPermissionsDialogProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('approval');
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);

  // Onay matrisi state'leri
  const [approvalMatrix, setApprovalMatrix] = useState<ApprovalPosition[]>([]);
  const [newApprovalStage, setNewApprovalStage] = useState('');
  const [newApprovalPosition, setNewApprovalPosition] = useState('');
  const [addingApproval, setAddingApproval] = useState(false);

  // Hazırlama yetkisi state'leri
  const [preparers, setPreparers] = useState<PreparerPosition[]>([]);
  const [newPreparerPosition, setNewPreparerPosition] = useState('');
  const [addingPreparer, setAddingPreparer] = useState(false);

  useEffect(() => {
    if (open && folderId) {
      fetchData();
    }
  }, [open, folderId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [positionsRes, approvalRes, preparersRes] = await Promise.all([
        fetch('/api/positions'),
        fetch(`/api/folders/${folderId}/approval-matrix`),
        fetch(`/api/folders/${folderId}/preparers`),
      ]);

      if (positionsRes.ok) {
        const data = await positionsRes.json();
        setPositions(Array.isArray(data) ? data : []);
      }

      if (approvalRes.ok) {
        const data = await approvalRes.json();
        setApprovalMatrix(data.approvalMatrix || []);
      }

      if (preparersRes.ok) {
        const data = await preparersRes.json();
        setPreparers(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  // Onay Matrisi İşlemleri
  const handleAddApproval = async () => {
    if (!newApprovalStage || !newApprovalPosition) {
      toast({ title: 'Hata', description: 'Aşama ve pozisyon seçmelisiniz', variant: 'destructive' });
      return;
    }

    setAddingApproval(true);
    try {
      const res = await fetch(`/api/folders/${folderId}/approval-matrix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          positionId: newApprovalPosition,
          approvalStage: newApprovalStage,
        }),
      });

      if (res.ok) {
        toast({ title: 'Başarılı', description: 'Onay pozisyonu eklendi' });
        setNewApprovalStage('');
        setNewApprovalPosition('');
        fetchData();
      } else {
        const err = await res.json();
        toast({ title: 'Hata', description: err.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Hata', description: 'Bir hata oluştu', variant: 'destructive' });
    } finally {
      setAddingApproval(false);
    }
  };

  const handleDeleteApproval = async (approvalPositionId: string) => {
    try {
      const res = await fetch(
        `/api/folders/${folderId}/approval-matrix?approvalPositionId=${approvalPositionId}`,
        { method: 'DELETE' }
      );

      if (res.ok) {
        toast({ title: 'Başarılı', description: 'Onay pozisyonu silindi' });
        fetchData();
      }
    } catch (error) {
      toast({ title: 'Hata', description: 'Silinemedi', variant: 'destructive' });
    }
  };

  // Hazırlama Yetkisi İşlemleri
  const handleAddPreparer = async () => {
    if (!newPreparerPosition) {
      toast({ title: 'Hata', description: 'Pozisyon seçmelisiniz', variant: 'destructive' });
      return;
    }

    setAddingPreparer(true);
    try {
      const res = await fetch(`/api/folders/${folderId}/preparers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          positionId: newPreparerPosition,
        }),
      });

      if (res.ok) {
        toast({ title: 'Başarılı', description: 'Hazırlama yetkisi eklendi' });
        setNewPreparerPosition('');
        fetchData();
      } else {
        const err = await res.json();
        toast({ title: 'Hata', description: err.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Hata', description: 'Bir hata oluştu', variant: 'destructive' });
    } finally {
      setAddingPreparer(false);
    }
  };

  const handleDeletePreparer = async (preparerId: string) => {
    try {
      const res = await fetch(
        `/api/folders/${folderId}/preparers?preparerId=${preparerId}`,
        { method: 'DELETE' }
      );

      if (res.ok) {
        toast({ title: 'Başarılı', description: 'Hazırlama yetkisi silindi' });
        fetchData();
      }
    } catch (error) {
      toast({ title: 'Hata', description: 'Silinemedi', variant: 'destructive' });
    }
  };

  const handleUpdatePreparer = async (preparerId: string, canCreate: boolean, canRevise: boolean) => {
    try {
      const res = await fetch(`/api/folders/${folderId}/preparers`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preparerId, canCreate, canRevise }),
      });

      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Güncelleme hatası:', error);
    }
  };

  const getStageLabel = (stage: string) => {
    return APPROVAL_STAGES.find(s => s.value === stage)?.label || stage;
  };

  const getStageColor = (stage: string) => {
    return APPROVAL_STAGES.find(s => s.value === stage)?.color || 'bg-gray-500';
  };

  // Onay matrisini aşamalara göre grupla
  const groupedApprovalMatrix = APPROVAL_STAGES.map(stage => ({
    ...stage,
    positions: approvalMatrix.filter(a => a.approvalStage === stage.value),
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Klasör Yetki Ayarları: {folderName}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="approval" className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Onay Matrisi
            </TabsTrigger>
            <TabsTrigger value="preparer" className="flex items-center gap-2">
              <Edit3 className="w-4 h-4" />
              Hazırlama Yetkisi
            </TabsTrigger>
          </TabsList>

          {/* Onay Matrisi Tab */}
          <TabsContent value="approval" className="space-y-4">
            <div className="text-sm text-muted-foreground mb-4">
              Bu klasördeki dokümanların hangi pozisyonlar tarafından, hangi sırayla onaylanacağını belirleyin.
            </div>

            {/* Yeni Onay Ekleme */}
            <div className="flex gap-2 items-end border rounded-lg p-4 bg-muted/30">
              <div className="flex-1">
                <Label>Onay Aşaması</Label>
                <Select value={newApprovalStage} onValueChange={setNewApprovalStage}>
                  <SelectTrigger>
                    <SelectValue placeholder="Aşama seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {APPROVAL_STAGES.map(stage => (
                      <SelectItem key={stage.value} value={stage.value}>
                        {stage.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Label>Pozisyon</Label>
                <Select value={newApprovalPosition} onValueChange={setNewApprovalPosition}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pozisyon seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {positions.map(pos => (
                      <SelectItem key={pos.id} value={pos.id}>
                        {pos.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddApproval} disabled={addingApproval}>
                <Plus className="w-4 h-4 mr-1" />
                Ekle
              </Button>
            </div>

            {/* Onay Matrisi Görünümü */}
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>
            ) : (
              <div className="space-y-4">
                {groupedApprovalMatrix.map(stage => (
                  <div key={stage.value} className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge className={`${stage.color} text-white`}>{stage.label}</Badge>
                      <span className="text-sm text-muted-foreground">
                        ({stage.positions.length} pozisyon)
                      </span>
                    </div>
                    {stage.positions.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">Bu aşama için pozisyon tanımlanmamış</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {stage.positions.map(ap => (
                          <div
                            key={ap.id}
                            className="flex items-center gap-2 bg-background border rounded-full px-3 py-1"
                          >
                            <Users className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{ap.position.name}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-6 h-6"
                              onClick={() => handleDeleteApproval(ap.id)}
                            >
                              <Trash2 className="w-3 h-3 text-red-500" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Hazırlama Yetkisi Tab */}
          <TabsContent value="preparer" className="space-y-4">
            <div className="text-sm text-muted-foreground mb-4">
              Bu klasörde hangi pozisyonların doküman oluşturup/revize edebileceğini belirleyin.
            </div>

            {/* Yeni Hazırlama Yetkisi Ekleme */}
            <div className="flex gap-2 items-end border rounded-lg p-4 bg-muted/30">
              <div className="flex-1">
                <Label>Pozisyon</Label>
                <Select value={newPreparerPosition} onValueChange={setNewPreparerPosition}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pozisyon seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {positions.map(pos => (
                      <SelectItem key={pos.id} value={pos.id}>
                        {pos.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddPreparer} disabled={addingPreparer}>
                <Plus className="w-4 h-4 mr-1" />
                Ekle
              </Button>
            </div>

            {/* Hazırlama Yetkileri Tablosu */}
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>
            ) : preparers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Henüz hazırlama yetkisi tanımlanmamış
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pozisyon</TableHead>
                    <TableHead className="text-center">Oluşturabilir</TableHead>
                    <TableHead className="text-center">Revize Edebilir</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preparers.map(prep => (
                    <TableRow key={prep.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{prep.position.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={prep.canCreate}
                          onCheckedChange={(checked) =>
                            handleUpdatePreparer(prep.id, checked as boolean, prep.canRevise)
                          }
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={prep.canRevise}
                          onCheckedChange={(checked) =>
                            handleUpdatePreparer(prep.id, prep.canCreate, checked as boolean)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeletePreparer(prep.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
