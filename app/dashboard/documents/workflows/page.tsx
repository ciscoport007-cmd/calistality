'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Plus,
  Trash2,
  Edit,
  ArrowUp,
  ArrowDown,
  GitBranch,
  CheckCircle,
  XCircle,
  Users,
  Briefcase,
  User,
  Building2,
  FileText,
  FolderOpen,
  Send,
} from 'lucide-react';
import { toast } from 'sonner';

interface WorkflowStep {
  id?: string;
  name: string;
  description?: string;
  stepOrder: number;
  approverType: 'POSITION' | 'ROLE' | 'SPECIFIC_USER' | 'DEPARTMENT_HEAD' | 'DOCUMENT_OWNER';
  positionId?: string;
  roleId?: string;
  specificUserId?: string;
  isDepartmentHead: boolean;
  canPublish: boolean;
  isRequired: boolean;
  deadlineDays?: number;
  position?: { id: string; name: string };
  role?: { id: string; name: string };
  specificUser?: { id: string; name: string; surname?: string };
}

interface Workflow {
  id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  isDefault: boolean;
  documentType?: { id: string; name: string; code: string };
  folder?: { id: string; name: string; code: string };
  department?: { id: string; name: string; code: string };
  createdBy: { id: string; name: string; surname?: string };
  steps: WorkflowStep[];
  _count?: { instances: number };
  createdAt: string;
}

const approverTypeLabels: Record<string, string> = {
  POSITION: 'Pozisyon',
  ROLE: 'Rol',
  SPECIFIC_USER: 'Belirli Kullanıcı',
  DEPARTMENT_HEAD: 'Departman Müdürü',
  DOCUMENT_OWNER: 'Doküman Sahibi',
};

const approverTypeIcons: Record<string, any> = {
  POSITION: Briefcase,
  ROLE: Users,
  SPECIFIC_USER: User,
  DEPARTMENT_HEAD: Building2,
  DOCUMENT_OWNER: FileText,
};

export default function WorkflowsPage() {
  const { data: session } = useSession() || {};
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [documentTypes, setDocumentTypes] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [canManageWorkflows, setCanManageWorkflows] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [workflowToDelete, setWorkflowToDelete] = useState<string | null>(null);

  // Yetki kontrolü - admin veya müdür pozisyonundaki kullanıcılar
  useEffect(() => {
    if (session?.user) {
      const role = (session.user as any).role?.toLowerCase() || '';
      const position = (session.user as any).position?.toLowerCase() || '';
      
      const isAdmin = role === 'admin' || role === 'yönetici';
      const isManager = position.includes('müdür');
      
      setCanManageWorkflows(isAdmin || isManager);
    }
  }, [session]);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    documentTypeId: '',
    folderId: '',
    departmentId: '',
    isDefault: false,
  });

  const [steps, setSteps] = useState<WorkflowStep[]>([]);

  useEffect(() => {
    fetchWorkflows();
    fetchReferenceData();
  }, []);

  const fetchWorkflows = async () => {
    try {
      const res = await fetch('/api/document-workflows');
      const data = await res.json();
      setWorkflows(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching workflows:', error);
      toast.error('Veriler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const fetchReferenceData = async () => {
    try {
      const [posRes, roleRes, userRes, dtRes, folderRes, deptRes] = await Promise.all([
        fetch('/api/positions'),
        fetch('/api/roles'),
        fetch('/api/users'),
        fetch('/api/document-types'),
        fetch('/api/folders'),
        fetch('/api/departments'),
      ]);

      const [posData, roleData, userData, dtData, folderData, deptData] = await Promise.all([
        posRes.json(),
        roleRes.json(),
        userRes.json(),
        dtRes.json(),
        folderRes.json(),
        deptRes.json(),
      ]);

      setPositions(Array.isArray(posData) ? posData : []);
      setRoles(Array.isArray(roleData) ? roleData : []);
      setUsers(Array.isArray(userData) ? userData : userData.users || []);
      setDocumentTypes(Array.isArray(dtData) ? dtData : []);
      setFolders(Array.isArray(folderData) ? folderData : []);
      const deptList = deptData.departments || deptData;
      setDepartments(Array.isArray(deptList) ? deptList : []);
    } catch (error) {
      console.error('Error fetching reference data:', error);
    }
  };

  const handleOpenCreate = () => {
    setEditingWorkflow(null);
    setFormData({
      name: '',
      code: '',
      description: '',
      documentTypeId: '',
      folderId: '',
      departmentId: '',
      isDefault: false,
    });
    setSteps([
      {
        name: 'Onay Adımı 1',
        stepOrder: 1,
        approverType: 'SPECIFIC_USER',
        isDepartmentHead: false,
        canPublish: false,
        isRequired: true,
        specificUserId: '',
      },
    ]);
    setDialogOpen(true);
  };

  const handleOpenEdit = (workflow: Workflow) => {
    setEditingWorkflow(workflow);
    setFormData({
      name: workflow.name,
      code: workflow.code,
      description: workflow.description || '',
      documentTypeId: workflow.documentType?.id || '',
      folderId: workflow.folder?.id || '',
      departmentId: workflow.department?.id || '',
      isDefault: workflow.isDefault,
    });
    setSteps(
      workflow.steps.map((s) => ({
        ...s,
        positionId: s.position?.id || s.positionId,
        roleId: s.role?.id || s.roleId,
        specificUserId: s.specificUser?.id || s.specificUserId,
      }))
    );
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.code) {
      toast.error('İsim ve kod zorunludur');
      return;
    }

    if (steps.length === 0) {
      toast.error('En az bir adım eklemelisiniz');
      return;
    }

    // Tüm adımların geçerli onaylayanı olduğunu kontrol et
    for (const step of steps) {
      if (!step.specificUserId) {
        toast.error(`"${step.name}" adımı için onaylayan kişi seçmelisiniz`);
        return;
      }
    }

    try {
      const url = editingWorkflow
        ? `/api/document-workflows/${editingWorkflow.id}`
        : '/api/document-workflows';
      const method = editingWorkflow ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          documentTypeId: formData.documentTypeId || null,
          folderId: formData.folderId || null,
          departmentId: formData.departmentId || null,
          steps: steps.map((s, i) => ({
            ...s,
            stepOrder: i + 1,
          })),
        }),
      });

      if (res.ok) {
        toast.success(editingWorkflow ? 'İş akışı güncellendi' : 'İş akışı oluşturuldu');
        setDialogOpen(false);
        fetchWorkflows();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Bir hata oluştu');
      }
    } catch (error) {
      console.error('Error saving workflow:', error);
      toast.error('Sunucu hatası');
    }
  };

  const handleDelete = async () => {
    if (!workflowToDelete) return;

    try {
      const res = await fetch(`/api/document-workflows/${workflowToDelete}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('İş akışı silindi');
        setDeleteDialogOpen(false);
        setWorkflowToDelete(null);
        fetchWorkflows();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Silme başarısız');
      }
    } catch (error) {
      console.error('Error deleting workflow:', error);
      toast.error('Sunucu hatası');
    }
  };

  const addStep = () => {
    setSteps([
      ...steps,
      {
        name: `Onay Adımı ${steps.length + 1}`,
        stepOrder: steps.length + 1,
        approverType: 'SPECIFIC_USER',
        isDepartmentHead: false,
        canPublish: false,
        isRequired: true,
        specificUserId: '',
      },
    ]);
  };

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const newSteps = [...steps];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= steps.length) return;

    [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
    setSteps(newSteps);
  };

  const updateStep = (index: number, field: string, value: any) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], [field]: value };

    // Onaylayan tipine göre ilişkili alanları temizle
    if (field === 'approverType') {
      newSteps[index].positionId = undefined;
      newSteps[index].roleId = undefined;
      newSteps[index].specificUserId = undefined;
      newSteps[index].isDepartmentHead = value === 'DEPARTMENT_HEAD';
    }

    setSteps(newSteps);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Onay İş Akışları</h1>
          <p className="text-muted-foreground">
            Doküman onay süreçlerini tanımlayın ve yönetin
          </p>
        </div>
        {canManageWorkflows && (
          <Button onClick={handleOpenCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Yeni İş Akışı
          </Button>
        )}
      </div>

      {/* İş Akışı Listesi */}
      <div className="grid gap-4">
        {workflows.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <GitBranch className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Henüz iş akışı tanımlanmamış</p>
              <Button variant="link" onClick={handleOpenCreate}>
                İlk iş akışını oluşturun
              </Button>
            </CardContent>
          </Card>
        ) : (
          workflows.map((workflow) => (
            <Card key={workflow.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{workflow.name}</CardTitle>
                      <Badge variant="outline">{workflow.code}</Badge>
                      {workflow.isDefault && (
                        <Badge variant="default">Varsayılan</Badge>
                      )}
                      {!workflow.isActive && (
                        <Badge variant="secondary">Pasif</Badge>
                      )}
                    </div>
                    <CardDescription className="mt-1">
                      {workflow.description || 'Açıklama yok'}
                    </CardDescription>
                  </div>
                  {canManageWorkflows && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEdit(workflow)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Düzenle
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setWorkflowToDelete(workflow.id);
                          setDeleteDialogOpen(true);
                        }}
                        disabled={(workflow._count?.instances ?? 0) > 0}
                        title={(workflow._count?.instances ?? 0) > 0 ? 'Aktif süreçler varken silinemez' : 'İş akışını sil'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                  {workflow.documentType && (
                    <Badge variant="outline">
                      <FileText className="w-3 h-3 mr-1" />
                      {workflow.documentType.name}
                    </Badge>
                  )}
                  {workflow.folder && (
                    <Badge variant="outline">
                      <FolderOpen className="w-3 h-3 mr-1" />
                      {workflow.folder.name}
                    </Badge>
                  )}
                  {workflow.department && (
                    <Badge variant="outline">
                      <Building2 className="w-3 h-3 mr-1" />
                      {workflow.department.name}
                    </Badge>
                  )}
                  {!workflow.documentType && !workflow.folder && !workflow.department && (
                    <Badge variant="secondary">Tüm Dokümanlar</Badge>
                  )}
                </div>

                {/* Adımlar */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                  {workflow.steps.map((step, index) => {
                    const Icon = approverTypeIcons[step.approverType];
                    return (
                      <div key={step.id || index} className="flex items-center">
                        <div className="flex flex-col items-center min-w-[120px] p-3 bg-muted rounded-lg">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                            <span>Adım {index + 1}</span>
                            {step.canPublish && (
                              <Send className="w-3 h-3 text-green-600" />
                            )}
                          </div>
                          <Icon className="w-5 h-5 mb-1" />
                          <span className="text-sm font-medium text-center">{step.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {step.specificUser
                              ? `${step.specificUser.name} ${step.specificUser.surname || ''}`
                              : step.position?.name || step.role?.name || 'Atanmadı'}
                          </span>
                        </div>
                        {index < workflow.steps.length - 1 && (
                          <div className="w-8 h-0.5 bg-muted-foreground/30 mx-1" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Oluştur/Düzenle Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingWorkflow ? 'İş Akışını Düzenle' : 'Yeni İş Akışı Oluştur'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Temel Bilgiler */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>İsim *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Standart Onay Akışı"
                />
              </div>
              <div>
                <Label>Kod *</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="WF-001"
                  disabled={!!editingWorkflow}
                />
              </div>
            </div>

            <div>
              <Label>Açıklama</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Bu iş akışının açıklaması..."
                rows={2}
              />
            </div>

            {/* Kapsam */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Doküman Türü (Opsiyonel)</Label>
                <Select
                  value={formData.documentTypeId || 'all'}
                  onValueChange={(v) => setFormData({ ...formData, documentTypeId: v === 'all' ? '' : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tümü" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tümü</SelectItem>
                    {documentTypes.map((dt) => (
                      <SelectItem key={dt.id} value={dt.id}>
                        {dt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Klasör (Opsiyonel)</Label>
                <Select
                  value={formData.folderId || 'all'}
                  onValueChange={(v) => setFormData({ ...formData, folderId: v === 'all' ? '' : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tümü" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tümü</SelectItem>
                    {folders.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Departman (Opsiyonel)</Label>
                <Select
                  value={formData.departmentId || 'all'}
                  onValueChange={(v) => setFormData({ ...formData, departmentId: v === 'all' ? '' : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tümü" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tümü</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="isDefault"
                checked={formData.isDefault}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isDefault: checked as boolean })
                }
              />
              <Label htmlFor="isDefault">Varsayılan iş akışı olarak ayarla</Label>
            </div>

            {/* Onay Adımları */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-semibold">Onay Adımları</Label>
                <Button type="button" variant="outline" size="sm" onClick={addStep}>
                  <Plus className="w-4 h-4 mr-1" />
                  Adım Ekle
                </Button>
              </div>

              <div className="space-y-4">
                {steps.map((step, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Adım {index + 1}</Badge>
                        <Input
                          value={step.name}
                          onChange={(e) => updateStep(index, 'name', e.target.value)}
                          className="w-48"
                          placeholder="Adım adı"
                        />
                      </div>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => moveStep(index, 'up')}
                          disabled={index === 0}
                        >
                          <ArrowUp className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => moveStep(index, 'down')}
                          disabled={index === steps.length - 1}
                        >
                          <ArrowDown className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeStep(index)}
                          disabled={steps.length === 1}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs">Onaylayan Kişi *</Label>
                        <Select
                          value={step.specificUserId || ''}
                          onValueChange={(v) => {
                            updateStep(index, 'approverType', 'SPECIFIC_USER');
                            updateStep(index, 'specificUserId', v);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Kişi seçin" />
                          </SelectTrigger>
                          <SelectContent>
                            {users.map((u) => (
                              <SelectItem key={u.id} value={u.id}>
                                {u.name} {u.surname || ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-xs">Süre Limiti (Gün)</Label>
                        <Input
                          type="number"
                          value={step.deadlineDays || ''}
                          onChange={(e) =>
                            updateStep(
                              index,
                              'deadlineDays',
                              e.target.value ? parseInt(e.target.value) : undefined
                            )
                          }
                          placeholder="Opsiyonel"
                        />
                      </div>
                    </div>

                    <div className="flex gap-6 mt-3">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`required-${index}`}
                          checked={step.isRequired}
                          onCheckedChange={(checked) =>
                            updateStep(index, 'isRequired', checked)
                          }
                        />
                        <Label htmlFor={`required-${index}`} className="text-sm">
                          Zorunlu Adım
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`publish-${index}`}
                          checked={step.canPublish}
                          onCheckedChange={(checked) =>
                            updateStep(index, 'canPublish', checked)
                          }
                        />
                        <Label htmlFor={`publish-${index}`} className="text-sm">
                          Yayınlama Yetkisi
                        </Label>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              İptal
            </Button>
            <Button onClick={handleSubmit}>
              {editingWorkflow ? 'Güncelle' : 'Oluştur'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Silme Onay Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>İş Akışını Sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu iş akışını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Sil</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
