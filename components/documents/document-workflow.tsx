'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  GitBranch,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  User,
  AlertTriangle,
  Send,
  SkipForward,
  Ban,
} from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface WorkflowStep {
  id: string;
  stepId: string;
  status: 'BEKLIYOR' | 'AKTIF' | 'ONAYLANDI' | 'REDDEDILDI' | 'ATLANDI';
  assignedUser?: { id: string; name: string; surname?: string; email?: string };
  actionBy?: { id: string; name: string; surname?: string };
  actionAt?: string;
  comments?: string;
  deadline?: string;
  step: {
    id: string;
    name: string;
    stepOrder: number;
    approverType: string;
    canPublish: boolean;
    isRequired: boolean;
    position?: { id: string; name: string };
    role?: { id: string; name: string };
  };
}

interface WorkflowInstance {
  id: string;
  status: 'AKTIF' | 'TAMAMLANDI' | 'REDDEDILDI' | 'IPTAL';
  currentStepOrder: number;
  startedAt: string;
  completedAt?: string;
  workflow: { id: string; name: string; code: string };
  startedBy: { id: string; name: string; surname?: string };
  steps: WorkflowStep[];
}

interface AvailableWorkflow {
  id: string;
  name: string;
  code: string;
  description?: string;
  steps: {
    name: string;
    stepOrder: number;
    position?: { name: string };
    role?: { name: string };
  }[];
}

interface Props {
  documentId: string;
  documentTitle: string;
  documentStatus: string;
  onStatusChange?: () => void;
}

const stepStatusConfig: Record<string, { label: string; color: string; icon: any }> = {
  BEKLIYOR: { label: 'Bekliyor', color: 'bg-gray-100 text-gray-800', icon: Clock },
  AKTIF: { label: 'Onay Bekliyor', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  ONAYLANDI: { label: 'Onaylandı', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  REDDEDILDI: { label: 'Reddedildi', color: 'bg-red-100 text-red-800', icon: XCircle },
  ATLANDI: { label: 'Atlandı', color: 'bg-blue-100 text-blue-800', icon: SkipForward },
};

const instanceStatusConfig: Record<string, { label: string; color: string }> = {
  AKTIF: { label: 'Devam Ediyor', color: 'bg-blue-100 text-blue-800' },
  TAMAMLANDI: { label: 'Tamamlandı', color: 'bg-green-100 text-green-800' },
  REDDEDILDI: { label: 'Reddedildi', color: 'bg-red-100 text-red-800' },
  IPTAL: { label: 'İptal Edildi', color: 'bg-gray-100 text-gray-800' },
};

export default function DocumentWorkflow({ documentId, documentTitle, documentStatus, onStatusChange }: Props) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [instance, setInstance] = useState<WorkflowInstance | null>(null);
  const [availableWorkflows, setAvailableWorkflows] = useState<AvailableWorkflow[]>([]);
  const [currentStep, setCurrentStep] = useState<WorkflowStep | null>(null);
  const [canApprove, setCanApprove] = useState(false);
  const [canPublish, setCanPublish] = useState(false);

  const [startDialogOpen, setStartDialogOpen] = useState(false);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState('');
  const [starting, setStarting] = useState(false);

  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [actionComments, setActionComments] = useState('');
  const [publishOnApprove, setPublishOnApprove] = useState(false);
  const [processing, setProcessing] = useState(false);

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  useEffect(() => {
    fetchWorkflowStatus();
  }, [documentId]);

  const fetchWorkflowStatus = async () => {
    try {
      const res = await fetch(`/api/documents/${documentId}/workflow`);
      const data = await res.json();

      setInstance(data.instance || null);
      setAvailableWorkflows(data.availableWorkflows || []);
      setCurrentStep(data.currentStep || null);
      setCanApprove(data.canApprove || false);
      setCanPublish(data.canPublish || false);
    } catch (error) {
      console.error('Error fetching workflow status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartWorkflow = async () => {
    if (!selectedWorkflowId) {
      toast.error('Lütfen bir iş akışı seçin');
      return;
    }

    setStarting(true);
    try {
      const res = await fetch(`/api/documents/${documentId}/workflow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowId: selectedWorkflowId }),
      });

      if (res.ok) {
        toast.success('İş akışı başlatıldı');
        setStartDialogOpen(false);
        setSelectedWorkflowId('');
        fetchWorkflowStatus();
        onStatusChange?.();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Bir hata oluştu');
      }
    } catch (error) {
      console.error('Error starting workflow:', error);
      toast.error('Sunucu hatası');
    } finally {
      setStarting(false);
    }
  };

  const handleAction = async () => {
    setProcessing(true);
    try {
      const res = await fetch(`/api/documents/${documentId}/workflow`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionType,
          comments: actionComments,
          publish: publishOnApprove && canPublish,
        }),
      });

      if (res.ok) {
        toast.success(actionType === 'approve' ? 'Onayandı' : 'Reddedildi');
        setActionDialogOpen(false);
        setActionComments('');
        setPublishOnApprove(false);
        fetchWorkflowStatus();
        onStatusChange?.();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Bir hata oluştu');
      }
    } catch (error) {
      console.error('Error processing action:', error);
      toast.error('Sunucu hatası');
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelWorkflow = async () => {
    try {
      const res = await fetch(`/api/documents/${documentId}/workflow`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('İş akışı iptal edildi');
        setCancelDialogOpen(false);
        fetchWorkflowStatus();
        onStatusChange?.();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Bir hata oluştu');
      }
    } catch (error) {
      console.error('Error cancelling workflow:', error);
      toast.error('Sunucu hatası');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  // Aktif iş akışı yok
  if (!instance) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="w-5 h-5" />
            Onay İş Akışı
          </CardTitle>
          <CardDescription>
            Bu doküman için henüz onay süreci başlatılmamış
          </CardDescription>
        </CardHeader>
        <CardContent>
          {availableWorkflows.length > 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Aşağıdaki iş akışlarından birini seçerek onay sürecini başlatabilirsiniz.
              </p>
              <Button onClick={() => setStartDialogOpen(true)}>
                <Play className="w-4 h-4 mr-2" />
                İş Akışı Başlat
              </Button>
            </div>
          ) : (
            <div className="text-center py-4">
              <AlertTriangle className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Bu doküman için tanımlı iş akışı bulunamadı.
                <br />
                Lütfen önce bir iş akışı şablonu oluşturun.
              </p>
            </div>
          )}
        </CardContent>

        {/* İş Akışı Başlatma Dialog */}
        <Dialog open={startDialogOpen} onOpenChange={setStartDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>İş Akışı Başlat</DialogTitle>
              <DialogDescription>
                "{documentTitle}" dokümanı için onay sürecini başlatın
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label>İş Akışı Seçin</Label>
                <Select value={selectedWorkflowId} onValueChange={setSelectedWorkflowId}>
                  <SelectTrigger>
                    <SelectValue placeholder="İş akışı seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableWorkflows.map((wf) => (
                      <SelectItem key={wf.id} value={wf.id}>
                        {wf.name} ({wf.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedWorkflowId && (
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm font-medium mb-2">Onay Adımları:</p>
                  <div className="space-y-2">
                    {availableWorkflows
                      .find((wf) => wf.id === selectedWorkflowId)
                      ?.steps.map((step, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <Badge variant="outline" className="w-6 h-6 p-0 justify-center">
                            {step.stepOrder}
                          </Badge>
                          <span>{step.name}</span>
                          <span className="text-muted-foreground">
                            ({step.position?.name || step.role?.name || 'Otomatik'})
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStartDialogOpen(false)}>
                İptal
              </Button>
              <Button onClick={handleStartWorkflow} disabled={starting || !selectedWorkflowId}>
                {starting ? 'Başlatılıyor...' : 'Başlat'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Card>
    );
  }

  // Aktif veya tamamlanmış iş akışı var
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="w-5 h-5" />
              Onay İş Akışı
            </CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              {instance.workflow.name}
              <Badge className={instanceStatusConfig[instance.status].color}>
                {instanceStatusConfig[instance.status].label}
              </Badge>
            </CardDescription>
          </div>

          {instance.status === 'AKTIF' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCancelDialogOpen(true)}
            >
              <Ban className="w-4 h-4 mr-1" />
              İptal Et
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Onay Adımları Timeline */}
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-muted" />
          <div className="space-y-6">
            {instance.steps.map((step, index) => {
              const config = stepStatusConfig[step.status];
              const Icon = config.icon;
              const isCurrentStep = step.step.stepOrder === instance.currentStepOrder && step.status === 'AKTIF';

              return (
                <div key={step.id} className="relative pl-10">
                  <div
                    className={`absolute left-2 w-5 h-5 rounded-full flex items-center justify-center ${
                      isCurrentStep
                        ? 'bg-yellow-500 text-white animate-pulse'
                        : step.status === 'ONAYLANDI'
                        ? 'bg-green-500 text-white'
                        : step.status === 'REDDEDILDI'
                        ? 'bg-red-500 text-white'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                  </div>

                  <div className={`p-4 rounded-lg border ${isCurrentStep ? 'border-yellow-500 bg-yellow-50' : 'bg-card'}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{step.step.name}</span>
                          <Badge className={config.color}>{config.label}</Badge>
                          {step.step.canPublish && (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              <Send className="w-3 h-3 mr-1" />
                              Yayınlama Yetkisi
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {step.step.position?.name || step.step.role?.name || 'Otomatik Atama'}
                        </div>
                      </div>

                      {isCurrentStep && canApprove && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-600 hover:bg-red-50"
                            onClick={() => {
                              setActionType('reject');
                              setActionDialogOpen(true);
                            }}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reddet
                          </Button>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => {
                              setActionType('approve');
                              setPublishOnApprove(false);
                              setActionDialogOpen(true);
                            }}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Onayla
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Atanan Kullanıcı */}
                    {step.assignedUser && (
                      <div className="flex items-center gap-2 mt-2 text-sm">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span>
                          Atanan: {step.assignedUser.name} {step.assignedUser.surname || ''}
                        </span>
                      </div>
                    )}

                    {/* İşlem Bilgileri */}
                    {step.actionAt && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        <span>
                          {step.actionBy?.name} {step.actionBy?.surname || ''} tarafından{' '}
                          {format(new Date(step.actionAt), 'dd MMM yyyy HH:mm', { locale: tr })} tarihinde{' '}
                          {step.status === 'ONAYLANDI' ? 'onaylandı' : step.status === 'REDDEDILDI' ? 'reddedildi' : 'işlendi'}
                        </span>
                      </div>
                    )}

                    {/* Yorum */}
                    {step.comments && (
                      <div className="mt-2 p-2 bg-muted rounded text-sm">
                        <span className="font-medium">Yorum: </span>
                        {step.comments}
                      </div>
                    )}

                    {/* Deadline */}
                    {step.deadline && step.status === 'AKTIF' && (
                      <div className="mt-2 text-sm text-orange-600">
                        <Clock className="w-4 h-4 inline mr-1" />
                        Son tarih: {format(new Date(step.deadline), 'dd MMM yyyy', { locale: tr })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Başlatma Bilgileri */}
        <div className="text-sm text-muted-foreground border-t pt-4">
          <p>
            <strong>Başlatan:</strong> {instance.startedBy.name} {instance.startedBy.surname || ''}
          </p>
          <p>
            <strong>Başlangıç:</strong> {format(new Date(instance.startedAt), 'dd MMM yyyy HH:mm', { locale: tr })}
          </p>
          {instance.completedAt && (
            <p>
              <strong>Tamamlanma:</strong> {format(new Date(instance.completedAt), 'dd MMM yyyy HH:mm', { locale: tr })}
            </p>
          )}
        </div>
      </CardContent>

      {/* Onay/Red Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Dokümanı Onayla' : 'Dokümanı Reddet'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Yorum {actionType === 'reject' && '*'}</Label>
              <Textarea
                value={actionComments}
                onChange={(e) => setActionComments(e.target.value)}
                placeholder={actionType === 'approve' ? 'Opsiyonel yorum...' : 'Red sebebini yazın...'}
                rows={3}
              />
            </div>

            {actionType === 'approve' && canPublish && (
              <div className="flex items-center gap-2 p-4 bg-green-50 rounded-lg border border-green-200">
                <Checkbox
                  id="publishOnApprove"
                  checked={publishOnApprove}
                  onCheckedChange={(checked) => setPublishOnApprove(checked as boolean)}
                />
                <Label htmlFor="publishOnApprove" className="text-green-800">
                  <Send className="w-4 h-4 inline mr-1" />
                  Onayladıktan sonra dokümanı yayınla
                </Label>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>
              İptal
            </Button>
            <Button
              onClick={handleAction}
              disabled={processing || (actionType === 'reject' && !actionComments)}
              className={actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {processing
                ? 'İşleniyor...'
                : actionType === 'approve'
                ? publishOnApprove
                  ? 'Onayla ve Yayınla'
                  : 'Onayla'
                : 'Reddet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* İptal Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>İş Akışını İptal Et</AlertDialogTitle>
            <AlertDialogDescription>
              Bu iş akışını iptal etmek istediğinizden emin misiniz?
              Doküman taslak durumuna geri dönecektir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelWorkflow}>İptal Et</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
