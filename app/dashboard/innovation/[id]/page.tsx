'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  ThumbsUp, ThumbsDown, MessageCircle, Paperclip, ArrowLeft,
  Edit2, Loader2, Send, Trash2, FolderKanban, CheckCircle2, XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  YENI: { label: 'Yeni', color: 'bg-blue-100 text-blue-800' },
  DEGERLENDIRME: { label: 'Değerlendirme', color: 'bg-yellow-100 text-yellow-800' },
  ONAYLANDI: { label: 'Onaylandı', color: 'bg-green-100 text-green-800' },
  PROJELESTI: { label: 'Projeye Dönüştü', color: 'bg-purple-100 text-purple-800' },
  REDDEDILDI: { label: 'Reddedildi', color: 'bg-red-100 text-red-800' },
  ARSIV: { label: 'Arşiv', color: 'bg-gray-100 text-gray-800' },
};

const CATEGORY_LABELS: Record<string, string> = {
  MISAFIR_DENEYIMI: 'Misafir Deneyimi',
  OPERASYONEL_VERIMLILIK: 'Op. Verimlilik',
  SURDURULEBILIRLIK: 'Sürdürülebilirlik',
  TEKNOLOJI: 'Teknoloji',
  PERSONEL_REFAHI: 'Personel Refahı',
  MALIYET_AZALTMA: 'Maliyet Azaltma',
  GELIR_ARTIRMA: 'Gelir Artırma',
};

const MATURITY_LABELS: Record<string, string> = {
  HAM_FIKIR: 'Ham Fikir',
  KONSEPT: 'Konsept',
  IS_PLANI: 'İş Planı',
  PROJE: 'Proje',
};

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  YENI: ['DEGERLENDIRME', 'REDDEDILDI', 'ARSIV'],
  DEGERLENDIRME: ['ONAYLANDI', 'REDDEDILDI', 'ARSIV', 'YENI'],
  ONAYLANDI: ['ARSIV'],
  PROJELESTI: [],
  REDDEDILDI: ['ARSIV', 'YENI'],
  ARSIV: ['YENI'],
};

export default function IdeaDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { data: session } = useSession();
  const router = useRouter();

  const [idea, setIdea] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [voteLoading, setVoteLoading] = useState(false);
  const [comment, setComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [reviewNote, setReviewNote] = useState('');
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [converting, setConverting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedManager, setSelectedManager] = useState('');

  const isAdmin = ['Admin', 'Yönetici'].includes(session?.user?.role ?? '');

  const fetchIdea = async () => {
    try {
      const res = await fetch(`/api/innovation/ideas/${id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setIdea(data);
      setReviewNote(data.reviewNote ?? '');
    } catch {
      toast.error('Fikir yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : (data.users ?? []));
    } catch { /* sessiz */ }
  };

  useEffect(() => { fetchIdea(); fetchUsers(); }, [id]);

  const handleVote = async (isUpVote: boolean) => {
    setVoteLoading(true);
    try {
      const res = await fetch(`/api/innovation/ideas/${id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isUpVote }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setIdea((prev: any) => ({ ...prev, upVotes: data.upVotes, downVotes: data.downVotes, score: data.score, userVote: data.userVote }));
    } catch {
      toast.error('Oy kaydedilemedi');
    } finally {
      setVoteLoading(false);
    }
  };

  const handleComment = async () => {
    if (!comment.trim()) return;
    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/innovation/ideas/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: comment }),
      });
      if (!res.ok) throw new Error();
      const newComment = await res.json();
      setIdea((prev: any) => ({ ...prev, comments: [...(prev.comments ?? []), newComment] }));
      setComment('');
      toast.success('Yorum eklendi');
    } catch {
      toast.error('Yorum eklenemedi');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/innovation/ideas/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, reviewNote: reviewNote || undefined }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      const updated = await res.json();
      setIdea((prev: any) => ({ ...prev, ...updated }));
      toast.success('Durum güncellendi');
    } catch (err: any) {
      toast.error(err.message ?? 'Durum güncellenemedi');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSaveReviewNote = async () => {
    try {
      const res = await fetch(`/api/innovation/ideas/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewNote }),
      });
      if (!res.ok) throw new Error();
      toast.success('Not kaydedildi');
    } catch {
      toast.error('Not kaydedilemedi');
    }
  };

  const handleConvert = async () => {
    setConverting(true);
    try {
      const res = await fetch(`/api/innovation/ideas/${id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ managerId: selectedManager || null }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      const project = await res.json();
      toast.success('Fikir projeye dönüştürüldü');
      setShowConvertDialog(false);
      router.push(`/dashboard/innovation/projects/${project.id}`);
    } catch (err: any) {
      toast.error(err.message ?? 'Dönüştürme başarısız');
    } finally {
      setConverting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!idea) return null;

  const allowedNext = ALLOWED_TRANSITIONS[idea.status] ?? [];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Üst Bar */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground font-mono">{idea.code}</span>
              <Badge className={`text-xs ${STATUS_CONFIG[idea.status]?.color ?? ''}`}>
                {STATUS_CONFIG[idea.status]?.label ?? idea.status}
              </Badge>
            </div>
            <h2 className="text-xl font-bold mt-0.5">{idea.title}</h2>
          </div>
        </div>

        {/* Aksiyon butonları */}
        <div className="flex gap-2 shrink-0">
          {idea.status === 'ONAYLANDI' && isAdmin && !idea.projectId && (
            <Button onClick={() => setShowConvertDialog(true)} className="bg-purple-600 hover:bg-purple-700">
              <FolderKanban className="h-4 w-4 mr-2" />
              Projeye Dönüştür
            </Button>
          )}
          {idea.status === 'YENI' && isAdmin && (
            <Button
              variant="outline"
              onClick={() => handleStatusChange('DEGERLENDIRME')}
              disabled={updatingStatus}
            >
              {updatingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Değerlendirmeye Al'}
            </Button>
          )}
          {idea.status === 'DEGERLENDIRME' && isAdmin && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="border-green-500 text-green-700 hover:bg-green-50"
                onClick={() => handleStatusChange('ONAYLANDI')}
                disabled={updatingStatus}
              >
                <CheckCircle2 className="h-4 w-4 mr-1" /> Onayla
              </Button>
              <Button
                variant="outline"
                className="border-red-400 text-red-600 hover:bg-red-50"
                onClick={() => handleStatusChange('REDDEDILDI')}
                disabled={updatingStatus}
              >
                <XCircle className="h-4 w-4 mr-1" /> Reddet
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sol: Ana bilgiler */}
        <div className="lg:col-span-2 space-y-6">
          {/* Fikir detayları */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Fikir Detayları</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Açıklama</Label>
                <p className="mt-1 text-sm whitespace-pre-wrap">{idea.description}</p>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-xs text-muted-foreground">Kategori</Label>
                  <p className="mt-1">{CATEGORY_LABELS[idea.category] ?? idea.category}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Olgunluk</Label>
                  <p className="mt-1">{MATURITY_LABELS[idea.maturity] ?? idea.maturity}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Departman</Label>
                  <p className="mt-1">{idea.department?.name ?? '-'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Stratejik Hedef</Label>
                  <p className="mt-1">{idea.strategicGoal?.name ?? '-'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Gönderen</Label>
                  <p className="mt-1">{idea.isAnonymous ? 'Anonim' : idea.createdBy ? `${idea.createdBy.name} ${idea.createdBy.surname}` : '-'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Tarih</Label>
                  <p className="mt-1">{format(new Date(idea.createdAt), 'dd MMMM yyyy', { locale: tr })}</p>
                </div>
              </div>
              {(idea.costSavingEstimate || idea.revenueEstimate || idea.guestSatisfactionImpact) && (
                <>
                  <Separator />
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {idea.costSavingEstimate && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Tahmini Tasarruf</Label>
                        <p className="mt-1 font-medium text-green-700">₺{Number(idea.costSavingEstimate).toLocaleString('tr-TR')}</p>
                      </div>
                    )}
                    {idea.revenueEstimate && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Tahmini Gelir Artışı</Label>
                        <p className="mt-1 font-medium text-blue-700">₺{Number(idea.revenueEstimate).toLocaleString('tr-TR')}</p>
                      </div>
                    )}
                    {idea.guestSatisfactionImpact && (
                      <div className="col-span-2">
                        <Label className="text-xs text-muted-foreground">Misafir Etkisi</Label>
                        <p className="mt-1">{idea.guestSatisfactionImpact}</p>
                      </div>
                    )}
                  </div>
                </>
              )}
              {idea.project && (
                <>
                  <Separator />
                  <div>
                    <Label className="text-xs text-muted-foreground">Bağlı Proje</Label>
                    <Button
                      variant="link"
                      className="p-0 h-auto text-sm mt-1"
                      onClick={() => router.push(`/dashboard/innovation/projects/${idea.project.id}`)}
                    >
                      <FolderKanban className="h-4 w-4 mr-1" />
                      {idea.project.code} — {idea.project.name}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Yorumlar */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                Yorumlar ({idea.comments?.length ?? 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(idea.comments ?? []).map((c: any) => (
                <div key={c.id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-bold">
                    {c.author?.name?.[0] ?? '?'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{c.author?.name} {c.author?.surname}</span>
                      <span className="text-xs text-muted-foreground">{format(new Date(c.createdAt), 'dd MMM yyyy HH:mm', { locale: tr })}</span>
                    </div>
                    <p className="text-sm mt-0.5">{c.content}</p>
                  </div>
                </div>
              ))}
              {(idea.comments ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Henüz yorum yok</p>
              )}
              <Separator />
              <div className="flex gap-2">
                <Textarea
                  placeholder="Yorum yazın..."
                  rows={2}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleComment} disabled={submittingComment || !comment.trim()} size="icon">
                  {submittingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sağ: Oy + Yönetici notu */}
        <div className="space-y-6">
          {/* Oylama */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Oylama</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-4">
                <div className="text-3xl font-bold">
                  {idea.score >= 0 ? '+' : ''}{idea.score}
                </div>
                <div className="flex gap-3">
                  <Button
                    variant={idea.userVote === 'up' ? 'default' : 'outline'}
                    className={idea.userVote === 'up' ? 'bg-green-600 hover:bg-green-700' : ''}
                    onClick={() => handleVote(true)}
                    disabled={voteLoading}
                  >
                    <ThumbsUp className="h-4 w-4 mr-1" />
                    {idea.upVotes}
                  </Button>
                  <Button
                    variant={idea.userVote === 'down' ? 'default' : 'outline'}
                    className={idea.userVote === 'down' ? 'bg-red-600 hover:bg-red-700' : ''}
                    onClick={() => handleVote(false)}
                    disabled={voteLoading}
                  >
                    <ThumbsDown className="h-4 w-4 mr-1" />
                    {idea.downVotes}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Yönetici Notu */}
          {isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Yönetici Notu</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  placeholder="Personele geri bildirim yazın..."
                  rows={4}
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                />
                <Button size="sm" className="w-full" onClick={handleSaveReviewNote}>
                  Not Kaydet
                </Button>
                {idea.reviewedBy && (
                  <p className="text-xs text-muted-foreground text-center">
                    Son değerlendiren: {idea.reviewedBy.name} {idea.reviewedBy.surname}
                    {idea.reviewedAt && ` — ${format(new Date(idea.reviewedAt), 'dd MMM yyyy', { locale: tr })}`}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Yönetici notu (okuma modu — değerlendirildiyse) */}
          {!isAdmin && idea.reviewNote && (
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader>
                <CardTitle className="text-base text-amber-800">Yönetici Geri Bildirimi</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-amber-900">{idea.reviewNote}</p>
              </CardContent>
            </Card>
          )}

          {/* Durum değiştirme — Admin */}
          {isAdmin && allowedNext.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Durum Değiştir</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {allowedNext.map((s) => (
                  <Button
                    key={s}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => handleStatusChange(s)}
                    disabled={updatingStatus}
                  >
                    {STATUS_CONFIG[s]?.label ?? s}
                  </Button>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Projeye Dönüştür Dialog */}
      <Dialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fikri Projeye Dönüştür</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              <strong>{idea.title}</strong> fikri yeni bir projeye dönüştürülecektir.
              Departman ve stratejik hedef bilgileri otomatik aktarılacaktır.
            </p>
            <div className="space-y-2">
              <Label>Proje Yöneticisi (Opsiyonel)</Label>
              <Select value={selectedManager || 'none'} onValueChange={(v) => setSelectedManager(v === 'none' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Seçme</SelectItem>
                  {users.map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>{u.name} {u.surname}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConvertDialog(false)}>İptal</Button>
            <Button onClick={handleConvert} disabled={converting} className="bg-purple-600 hover:bg-purple-700">
              {converting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Projeye Dönüştür
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
