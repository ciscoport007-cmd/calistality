'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
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
  Plus,
  Trash2,
  Target,
  Play,
  AlertTriangle,
  Link,
} from 'lucide-react';
import { toast } from 'sonner';

interface PESTELFactor {
  id: string;
  category: string;
  title: string;
}

interface GoalLink {
  id: string;
  linkType: string;
  notes: string | null;
  goal: {
    id: string;
    code: string;
    name: string;
    objective?: {
      code: string;
      name: string;
      perspective?: { name: string };
    };
  };
}

interface RiskLink {
  id: string;
  notes: string | null;
  risk: {
    id: string;
    code: string;
    title: string;
    status: string;
    category?: { name: string };
    department?: { name: string };
  };
}

interface ActionLink {
  id: string;
  linkType: string;
  notes: string | null;
  action: {
    id: string;
    code: string;
    name: string;
    status: string;
    goal?: { code: string; name: string };
    department?: { name: string };
    responsible?: { name: string };
  };
}

interface Props {
  studyId: string;
  factor: PESTELFactor;
  onClose: () => void;
}

const linkTypeOptions = [
  { value: 'DESTEKLER', label: 'Destekler' },
  { value: 'ENGELLER', label: 'Engeller' },
  { value: 'ILGILI', label: 'İlgili' },
  { value: 'KAYNAK', label: 'Kaynak (bu PESTEL\'den doğdu)' },
];

const statusConfig: Record<string, { label: string; color: string }> = {
  PLANLANDI: { label: 'Planlandı', color: 'bg-gray-100 text-gray-800' },
  DEVAM_EDIYOR: { label: 'Devam Ediyor', color: 'bg-blue-100 text-blue-800' },
  BEKLEMEDE: { label: 'Beklemede', color: 'bg-yellow-100 text-yellow-800' },
  TAMAMLANDI: { label: 'Tamamlandı', color: 'bg-green-100 text-green-800' },
  IPTAL: { label: 'İptal', color: 'bg-red-100 text-red-800' },
};

const riskStatusConfig: Record<string, { label: string; color: string }> = {
  TANIMLANDI: { label: 'Tanımlandı', color: 'bg-gray-100 text-gray-800' },
  ANALIZ_EDILIYOR: { label: 'Analiz Ediliyor', color: 'bg-blue-100 text-blue-800' },
  IZLENIYOR: { label: 'İzleniyor', color: 'bg-yellow-100 text-yellow-800' },
  AZALTILDI: { label: 'Azaltıldı', color: 'bg-green-100 text-green-800' },
  KABUL_EDILDI: { label: 'Kabul Edildi', color: 'bg-purple-100 text-purple-800' },
  KAPANDI: { label: 'Kapandı', color: 'bg-green-100 text-green-800' },
};

export function PESTELLinkPanel({ studyId, factor, onClose }: Props) {
  const [goalLinks, setGoalLinks] = useState<GoalLink[]>([]);
  const [riskLinks, setRiskLinks] = useState<RiskLink[]>([]);
  const [actionLinks, setActionLinks] = useState<ActionLink[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Add link dialog state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [addType, setAddType] = useState<'goal' | 'risk' | 'action'>('goal');
  const [selectedTarget, setSelectedTarget] = useState('');
  const [linkType, setLinkType] = useState('ILGILI');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  
  // Available goals, risks and actions
  const [availableGoals, setAvailableGoals] = useState<any[]>([]);
  const [availableRisks, setAvailableRisks] = useState<any[]>([]);
  const [availableActions, setAvailableActions] = useState<any[]>([]);

  useEffect(() => {
    fetchLinks();
    fetchAvailableTargets();
  }, [factor.id]);

  const fetchLinks = async () => {
    try {
      const res = await fetch(`/api/pestel-studies/${studyId}/factors/${factor.id}/links`);
      if (res.ok) {
        const data = await res.json();
        setGoalLinks(data.goalLinks || []);
        setRiskLinks(data.riskLinks || []);
        setActionLinks(data.actionLinks || []);
      }
    } catch (error) {
      console.error('Error fetching links:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableTargets = async () => {
    try {
      // Hedefleri getir
      const goalsRes = await fetch('/api/goals');
      if (goalsRes.ok) {
        const data = await goalsRes.json();
        setAvailableGoals(Array.isArray(data) ? data : []);
      }
      
      // Riskleri getir
      const risksRes = await fetch('/api/risks');
      if (risksRes.ok) {
        const data = await risksRes.json();
        setAvailableRisks(Array.isArray(data) ? data : []);
      }
      
      // Aksiyonları getir
      const actionsRes = await fetch('/api/strategic-actions');
      if (actionsRes.ok) {
        const data = await actionsRes.json();
        setAvailableActions(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching targets:', error);
    }
  };

  const handleAddLink = async () => {
    if (!selectedTarget) {
      toast.error('Lütfen bir hedef, risk veya aksiyon seçin');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/pestel-studies/${studyId}/factors/${factor.id}/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: addType,
          targetId: selectedTarget,
          linkType: addType === 'risk' ? undefined : linkType,
          notes: notes || null,
        }),
      });

      if (res.ok) {
        toast.success('Bağlantı eklendi');
        fetchLinks();
        setIsAddDialogOpen(false);
        setSelectedTarget('');
        setLinkType('ILGILI');
        setNotes('');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Bağlantı eklenemedi');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLink = async (type: 'goal' | 'risk' | 'action', linkId: string) => {
    if (!confirm('Bu bağlantıyı silmek istediğinize emin misiniz?')) return;

    try {
      const res = await fetch(
        `/api/pestel-studies/${studyId}/factors/${factor.id}/links?type=${type}&linkId=${linkId}`,
        { method: 'DELETE' }
      );

      if (res.ok) {
        toast.success('Bağlantı silindi');
        fetchLinks();
      } else {
        toast.error('Bağlantı silinemedi');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">{factor.title}</h3>
          <p className="text-sm text-muted-foreground">Bağlı hedefler, riskler ve aksiyonlar</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => { setAddType('goal'); setIsAddDialogOpen(true); }}>
            <Target className="h-4 w-4 mr-1" />
            Hedef
          </Button>
          <Button size="sm" variant="outline" onClick={() => { setAddType('risk'); setIsAddDialogOpen(true); }}>
            <AlertTriangle className="h-4 w-4 mr-1" />
            Risk
          </Button>
          <Button size="sm" variant="outline" onClick={() => { setAddType('action'); setIsAddDialogOpen(true); }}>
            <Play className="h-4 w-4 mr-1" />
            Aksiyon
          </Button>
        </div>
      </div>

      {/* Bağlı Hedefler */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="h-4 w-4 text-blue-600" />
            Bağlı Hedefler ({goalLinks.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {goalLinks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Henüz hedef bağlanmamış</p>
          ) : (
            <div className="space-y-2">
              {goalLinks.map((link) => (
                <div key={link.id} className="flex items-start justify-between p-3 bg-blue-50 rounded-lg group">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{link.goal.code}</Badge>
                      <Badge className="text-xs bg-blue-100 text-blue-800">
                        {linkTypeOptions.find(l => l.value === link.linkType)?.label || link.linkType}
                      </Badge>
                    </div>
                    <p className="font-medium mt-1">{link.goal.name}</p>
                    {link.goal.objective && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {link.goal.objective.perspective?.name} → {link.goal.objective.name}
                      </p>
                    )}
                    {link.notes && <p className="text-xs text-gray-600 mt-1 italic">{link.notes}</p>}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100"
                    onClick={() => handleDeleteLink('goal', link.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bağlı Riskler */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            Bağlı Riskler ({riskLinks.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {riskLinks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Henüz risk bağlanmamış</p>
          ) : (
            <div className="space-y-2">
              {riskLinks.map((link) => (
                <div key={link.id} className="flex items-start justify-between p-3 bg-orange-50 rounded-lg group">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{link.risk.code}</Badge>
                      <Badge className={`text-xs ${riskStatusConfig[link.risk.status]?.color || 'bg-gray-100'}`}>
                        {riskStatusConfig[link.risk.status]?.label || link.risk.status}
                      </Badge>
                    </div>
                    <p className="font-medium mt-1">{link.risk.title}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      {link.risk.category && <span>{link.risk.category.name}</span>}
                      {link.risk.department && <span>• {link.risk.department.name}</span>}
                    </div>
                    {link.notes && <p className="text-xs text-gray-600 mt-1 italic">{link.notes}</p>}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100"
                    onClick={() => handleDeleteLink('risk', link.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bağlı Aksiyonlar */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Play className="h-4 w-4 text-green-600" />
            Bağlı Aksiyonlar ({actionLinks.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {actionLinks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Henüz aksiyon bağlanmamış</p>
          ) : (
            <div className="space-y-2">
              {actionLinks.map((link) => (
                <div key={link.id} className="flex items-start justify-between p-3 bg-green-50 rounded-lg group">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{link.action.code}</Badge>
                      <Badge className={`text-xs ${statusConfig[link.action.status]?.color || 'bg-gray-100'}`}>
                        {statusConfig[link.action.status]?.label || link.action.status}
                      </Badge>
                      <Badge className="text-xs bg-green-100 text-green-800">
                        {linkTypeOptions.find(l => l.value === link.linkType)?.label || link.linkType}
                      </Badge>
                    </div>
                    <p className="font-medium mt-1">{link.action.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      {link.action.department && <span>{link.action.department.name}</span>}
                      {link.action.responsible && <span>• {link.action.responsible.name}</span>}
                    </div>
                    {link.notes && <p className="text-xs text-gray-600 mt-1 italic">{link.notes}</p>}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100"
                    onClick={() => handleDeleteLink('action', link.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Link Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {addType === 'goal' ? 'Hedef Bağla' : addType === 'risk' ? 'Risk Bağla' : 'Aksiyon Bağla'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>
                {addType === 'goal' ? 'Hedef' : addType === 'risk' ? 'Risk' : 'Aksiyon'}
              </Label>
              <Select value={selectedTarget} onValueChange={setSelectedTarget}>
                <SelectTrigger>
                  <SelectValue placeholder="Seçin..." />
                </SelectTrigger>
                <SelectContent>
                  {addType === 'goal' ? (
                    availableGoals.map((goal) => (
                      <SelectItem key={goal.id} value={goal.id}>
                        {goal.code} - {goal.name}
                      </SelectItem>
                    ))
                  ) : addType === 'risk' ? (
                    availableRisks.map((risk) => (
                      <SelectItem key={risk.id} value={risk.id}>
                        {risk.code} - {risk.title}
                      </SelectItem>
                    ))
                  ) : (
                    availableActions.map((action) => (
                      <SelectItem key={action.id} value={action.id}>
                        {action.code} - {action.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {addType !== 'risk' && (
              <div>
                <Label>İlişki Türü</Label>
                <Select value={linkType} onValueChange={setLinkType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {linkTypeOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Notlar (opsiyonel)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Bağlantı hakkında not..."
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>İptal</Button>
              <Button onClick={handleAddLink} disabled={saving}>
                {saving ? 'Ekleniyor...' : 'Ekle'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
