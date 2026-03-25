'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
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
import {
  ArrowRight,
  CheckCircle,
  XCircle,
  Clock,
  FileEdit,
  Send,
  Play,
  Flag,
  Star,
  Ban,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface ActionWorkflowProps {
  actionId: string;
  currentStatus: string;
  accountableId?: string;
  onStatusChange: () => void;
}

const workflowStatusConfig: Record<string, { label: string; color: string; icon: any }> = {
  TASLAK: { label: 'Taslak', color: 'bg-gray-100 text-gray-800', icon: FileEdit },
  YAYINLANDI: { label: 'Yayınlandı', color: 'bg-blue-100 text-blue-800', icon: Send },
  UYGULAMA: { label: 'Uygulama', color: 'bg-indigo-100 text-indigo-800', icon: Play },
  KAPANIS: { label: 'Kapanış', color: 'bg-purple-100 text-purple-800', icon: Flag },
  DEGERLENDIRME: { label: 'Değerlendirme', color: 'bg-yellow-100 text-yellow-800', icon: Star },
  TAMAMLANDI: { label: 'Tamamlandı', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  IPTAL: { label: 'İptal', color: 'bg-red-100 text-red-800', icon: Ban },
};

const validTransitions: Record<string, string[]> = {
  TASLAK: ['YAYINLANDI', 'IPTAL'],
  YAYINLANDI: ['UYGULAMA', 'TASLAK', 'IPTAL'],
  UYGULAMA: ['KAPANIS', 'IPTAL'],
  KAPANIS: ['DEGERLENDIRME', 'UYGULAMA'],
  DEGERLENDIRME: ['TAMAMLANDI', 'KAPANIS'],
  TAMAMLANDI: [],
  IPTAL: ['TASLAK'],
};

export default function ActionWorkflow({
  actionId,
  currentStatus,
  accountableId,
  onStatusChange,
}: ActionWorkflowProps) {
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTransition, setSelectedTransition] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [requestApproval, setRequestApproval] = useState(false);

  const fetchApprovals = async () => {
    try {
      const res = await fetch(`/api/strategic-actions/${actionId}/approvals`);
      if (res.ok) {
        const data = await res.json();
        setApprovals(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Approvals fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, [actionId]);

  const handleTransition = async () => {
    if (!selectedTransition) return;

    try {
      const res = await fetch(`/api/strategic-actions/${actionId}/workflow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toStatus: selectedTransition,
          notes,
          requestApproval,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(data.message || 'İş akışı güncellendi');
        setDialogOpen(false);
        setSelectedTransition(null);
        setNotes('');
        setRequestApproval(false);
        fetchApprovals();
        onStatusChange();
      } else {
        toast.error(data.error || 'Hata oluştu');
      }
    } catch (error) {
      toast.error('İşlem sırasında hata oluştu');
    }
  };

  const handleApprovalDecision = async (approvalId: string, decision: 'ONAYLANDI' | 'REDDEDILDI', decisionNotes: string) => {
    try {
      const res = await fetch(`/api/strategic-actions/${actionId}/approvals/${approvalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, notes: decisionNotes }),
      });

      if (res.ok) {
        toast.success(decision === 'ONAYLANDI' ? 'Onaylandı' : 'Reddedildi');
        fetchApprovals();
        onStatusChange();
      }
    } catch (error) {
      toast.error('Karar verilirken hata oluştu');
    }
  };

  const allowedTransitions = validTransitions[currentStatus] || [];
  const currentConfig = workflowStatusConfig[currentStatus] || workflowStatusConfig.TASLAK;
  const CurrentIcon = currentConfig.icon;

  // Bekleyen onay var mı?
  const pendingApproval = approvals.find((a) => a.status === 'BEKLIYOR');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">İş Akışı ve Onay</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Mevcut durum */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${currentConfig.color}`}>
              <CurrentIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Mevcut Durum</p>
              <p className="font-semibold">{currentConfig.label}</p>
            </div>
          </div>
          
          {allowedTransitions.length > 0 && !pendingApproval && (
            <div className="flex gap-2">
              {allowedTransitions.map((status) => {
                const config = workflowStatusConfig[status];
                const Icon = config.icon;
                return (
                  <Button
                    key={status}
                    size="sm"
                    variant={status === 'IPTAL' ? 'destructive' : 'outline'}
                    onClick={() => {
                      setSelectedTransition(status);
                      setRequestApproval(['YAYINLANDI', 'TAMAMLANDI'].includes(status) && !!accountableId);
                      setDialogOpen(true);
                    }}
                  >
                    <Icon className="h-4 w-4 mr-1" />
                    {config.label}
                  </Button>
                );
              })}
            </div>
          )}
        </div>

        {/* İş akışı adımları */}
        <div>
          <h4 className="font-medium mb-3">İş Akışı Adımları</h4>
          <div className="flex items-center justify-between">
            {['TASLAK', 'YAYINLANDI', 'UYGULAMA', 'KAPANIS', 'DEGERLENDIRME', 'TAMAMLANDI'].map((status, index) => {
              const config = workflowStatusConfig[status];
              const Icon = config.icon;
              const isActive = status === currentStatus;
              const isPast = ['TASLAK', 'YAYINLANDI', 'UYGULAMA', 'KAPANIS', 'DEGERLENDIRME', 'TAMAMLANDI']
                .indexOf(currentStatus) > index;

              return (
                <div key={status} className="flex items-center">
                  <div
                    className={`flex flex-col items-center ${
                      isActive ? 'text-primary' : isPast ? 'text-green-600' : 'text-muted-foreground'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-full border-2 ${
                        isActive
                          ? 'border-primary bg-primary/10'
                          : isPast
                          ? 'border-green-600 bg-green-50'
                          : 'border-muted'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-xs mt-1 text-center w-16">{config.label}</span>
                  </div>
                  {index < 5 && (
                    <ArrowRight className={`h-4 w-4 mx-1 ${isPast ? 'text-green-600' : 'text-muted-foreground'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bekleyen onay */}
        {pendingApproval && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-800">
              <Clock className="h-5 w-5" />
              <span className="font-medium">Onay Bekliyor</span>
            </div>
            <p className="text-sm text-yellow-700 mt-1">
              {workflowStatusConfig[pendingApproval.toStatus]?.label} geçişi için onay bekleniyor
            </p>
            {pendingApproval.requestNotes && (
              <p className="text-sm text-yellow-600 mt-2 italic">"{pendingApproval.requestNotes}"</p>
            )}
          </div>
        )}

        {/* Onay geçmişi */}
        {approvals.length > 0 && (
          <div>
            <h4 className="font-medium mb-3">Onay Geçmişi</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Geçiş</TableHead>
                  <TableHead>Talep Eden</TableHead>
                  <TableHead>Onaylayan</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Tarih</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {approvals.map((approval) => (
                  <TableRow key={approval.id}>
                    <TableCell>
                      {workflowStatusConfig[approval.fromStatus]?.label} →{' '}
                      {workflowStatusConfig[approval.toStatus]?.label}
                    </TableCell>
                    <TableCell>
                      {approval.requestedBy?.name} {approval.requestedBy?.surname}
                    </TableCell>
                    <TableCell>
                      {approval.approver?.name} {approval.approver?.surname}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          approval.status === 'ONAYLANDI'
                            ? 'bg-green-100 text-green-800'
                            : approval.status === 'REDDEDILDI'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }
                      >
                        {approval.status === 'BEKLIYOR' && <Clock className="h-3 w-3 mr-1" />}
                        {approval.status === 'ONAYLANDI' && <CheckCircle className="h-3 w-3 mr-1" />}
                        {approval.status === 'REDDEDILDI' && <XCircle className="h-3 w-3 mr-1" />}
                        {approval.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(approval.requestedAt), 'dd MMM yyyy HH:mm', { locale: tr })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Geçiş dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Durum Değiştir</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedTransition && (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <Badge className={currentConfig.color}>{currentConfig.label}</Badge>
                  <ArrowRight className="h-4 w-4" />
                  <Badge className={workflowStatusConfig[selectedTransition]?.color}>
                    {workflowStatusConfig[selectedTransition]?.label}
                  </Badge>
                </div>
              )}
              
              <div>
                <Label>Not (isteğe bağlı)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Geçiş ile ilgili not ekleyin..."
                />
              </div>
              
              {['YAYINLANDI', 'TAMAMLANDI'].includes(selectedTransition || '') && accountableId && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="requestApproval"
                    checked={requestApproval}
                    onChange={(e) => setRequestApproval(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="requestApproval">Onay talep et</Label>
                </div>
              )}
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>iptal</Button>
                <Button onClick={handleTransition}>Onayla</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
