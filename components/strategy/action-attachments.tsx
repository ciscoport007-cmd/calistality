'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Trash2,
  FileText,
  Link2,
  Download,
  Upload,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface ActionAttachmentsProps {
  actionId: string;
}

export default function ActionAttachments({ actionId }: ActionAttachmentsProps) {
  const [attachments, setAttachments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [attachType, setAttachType] = useState<'FILE' | 'LINK'>('FILE');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [linkForm, setLinkForm] = useState({
    name: '',
    description: '',
    url: '',
  });

  const fetchAttachments = async () => {
    try {
      const res = await fetch(`/api/strategic-actions/${actionId}/attachments`);
      if (res.ok) {
        const data = await res.json();
        setAttachments(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Attachments fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttachments();
  }, [actionId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // 1. Presigned URL al
      const presignRes = await fetch(`/api/strategic-actions/${actionId}/attachments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'FILE',
          fileName: file.name,
          contentType: file.type || 'application/octet-stream',
          isPublic: false,
        }),
      });

      if (!presignRes.ok) throw new Error('Presigned URL alınamadı');
      const { uploadUrl, cloud_storage_path, fileName, contentType } = await presignRes.json();

      // 2. S3'e yükle
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: file,
      });

      if (!uploadRes.ok) throw new Error('Dosya yüklenemedi');

      // 3. Kayıt tamamla
      const completeRes = await fetch(`/api/strategic-actions/${actionId}/attachments/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: file.name,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type || 'application/octet-stream',
          cloud_storage_path,
          isPublic: false,
        }),
      });

      if (completeRes.ok) {
        toast.success('Dosya yüklendi');
        fetchAttachments();
      }
    } catch (error: any) {
      toast.error(error.message || 'Dosya yüklenirken hata oluştu');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAddLink = async () => {
    if (!linkForm.name || !linkForm.url) {
      toast.error('Ad ve URL zorunludur');
      return;
    }

    try {
      const res = await fetch(`/api/strategic-actions/${actionId}/attachments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'LINK',
          ...linkForm,
        }),
      });

      if (res.ok) {
        toast.success('Link eklendi');
        setLinkForm({ name: '', description: '', url: '' });
        setDialogOpen(false);
        fetchAttachments();
      }
    } catch (error) {
      toast.error('Link eklenirken hata oluştu');
    }
  };

  const handleDelete = async (attachmentId: string) => {
    if (!confirm('Bu eki silmek istediğinizden emin misiniz?')) return;

    try {
      const res = await fetch(`/api/strategic-actions/${actionId}/attachments/${attachmentId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Ek silindi');
        fetchAttachments();
      }
    } catch (error) {
      toast.error('Ek silinirken hata oluştu');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">Dosya ve Linkler</CardTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? 'Yükleniyor...' : 'Dosya Yükle'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileUpload}
            />
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Link2 className="h-4 w-4 mr-2" /> Link Ekle
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Link Ekle</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Ad</Label>
                    <Input
                      value={linkForm.name}
                      onChange={(e) => setLinkForm({ ...linkForm, name: e.target.value })}
                      placeholder="Link adı"
                    />
                  </div>
                  <div>
                    <Label>URL</Label>
                    <Input
                      value={linkForm.url}
                      onChange={(e) => setLinkForm({ ...linkForm, url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <Label>Açıklama</Label>
                    <Textarea
                      value={linkForm.description}
                      onChange={(e) => setLinkForm({ ...linkForm, description: e.target.value })}
                      placeholder="Açıklama (isteğe bağlı)"
                    />
                  </div>
                  <Button onClick={handleAddLink} className="w-full">
                    Link Ekle
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground text-center py-4">Yükleniyor...</p>
        ) : attachments.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">Henüz ek eklenmemiş</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tür</TableHead>
                <TableHead>Ad</TableHead>
                <TableHead>Boyut</TableHead>
                <TableHead>Yükleyen</TableHead>
                <TableHead>Tarih</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attachments.map((att) => (
                <TableRow key={att.id}>
                  <TableCell>
                    <Badge variant="outline">
                      {att.type === 'FILE' ? (
                        <><FileText className="h-3 w-3 mr-1" /> Dosya</>
                      ) : (
                        <><Link2 className="h-3 w-3 mr-1" /> Link</>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    {att.name}
                    {att.description && (
                      <p className="text-xs text-muted-foreground">{att.description}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    {att.type === 'FILE' && att.fileSize ? formatFileSize(att.fileSize) : '-'}
                  </TableCell>
                  <TableCell>
                    {att.uploadedBy?.name} {att.uploadedBy?.surname}
                  </TableCell>
                  <TableCell>
                    {format(new Date(att.createdAt), 'dd MMM yyyy', { locale: tr })}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {att.type === 'FILE' && att.url ? (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            const a = document.createElement('a');
                            a.href = att.url;
                            a.download = att.fileName || att.name;
                            a.click();
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      ) : att.type === 'LINK' ? (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => window.open(att.url, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      ) : null}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(att.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
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
  );
}
