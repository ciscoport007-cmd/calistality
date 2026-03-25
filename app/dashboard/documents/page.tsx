'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, FileText, Eye, Upload, Search, Filter, X, Trash2, Edit, FileImage, Tag, CheckSquare, Square, MoreHorizontal } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ExportButton } from '@/components/ui/export-button';
import { getStatusLabel, formatDate } from '@/lib/export-utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";

const statusLabels: Record<string, string> = {
  TASLAK: 'Taslak',
  INCELEME_BEKLIYOR: 'İnceleme Bekliyor',
  ONAY_BEKLIYOR: 'Onay Bekliyor',
  ONAYLANDI: 'Onaylandı',
  YAYINDA: 'Yayında',
  REVIZE_EDILIYOR: 'Revize Ediliyor',
  IPTAL_EDILDI: 'İptal Edildi',
};

const statusColors: Record<string, string> = {
  TASLAK: 'bg-gray-100 text-gray-800',
  INCELEME_BEKLIYOR: 'bg-purple-100 text-purple-800',
  ONAY_BEKLIYOR: 'bg-yellow-100 text-yellow-800',
  ONAYLANDI: 'bg-green-100 text-green-800',
  YAYINDA: 'bg-blue-100 text-blue-800',
  REVIZE_EDILIYOR: 'bg-orange-100 text-orange-800',
  IPTAL_EDILDI: 'bg-red-100 text-red-800',
};

interface TagItem {
  id: string;
  name: string;
  color: string;
}

interface Document {
  id: string;
  code: string;
  title: string;
  status: string;
  folder: any;
  documentType: any;
  department: any;
  createdBy: any;
  createdAt: string;
  approvals?: any[];
  versions?: any[];
  tags?: { tag: TagItem }[];
}

// Filter labels for display
const specialFilterLabels: Record<string, string> = {
  pending_approval: 'Onay Bekleyen Dokümanlar',
  needs_reading: 'Okunması Gereken Dokümanlar',
  needs_feedback: 'Görüş Bekleyen Dokümanlar',
};

function DocumentsContent() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [documentTypes, setDocumentTypes] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // URL'den özel filtre
  const specialFilter = searchParams.get('filter') || '';

  // Önizleme state'leri
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewFileUrl, setPreviewFileUrl] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string | null>(null);
  const [previewFileType, setPreviewFileType] = useState<string | null>(null);

  // Filtreler
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [folderFilter, setFolderFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');

  // Etiket yönetimi
  const [tags, setTags] = useState<TagItem[]>([]);
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3B82F6');
  const [creatingTag, setCreatingTag] = useState(false);

  // Toplu işlemler
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<string>('');
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkRejectReason, setBulkRejectReason] = useState('');
  const [selectedTagsForBulk, setSelectedTagsForBulk] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    folderId: '',
    documentTypeId: '',
    departmentId: '',
    file: null as File | null,
  });

  useEffect(() => {
    fetchData();
  }, [specialFilter]);

  // Filtreleme etkisi
  useEffect(() => {
    let filtered = [...documents];

    // Arama filtresi
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(doc =>
        doc.code?.toLowerCase()?.includes(term) ||
        doc.title?.toLowerCase()?.includes(term)
      );
    }

    // Durum filtresi
    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter(doc => doc.status === statusFilter);
    }

    // Departman filtresi
    if (departmentFilter && departmentFilter !== 'all') {
      filtered = filtered.filter(doc => doc.department?.id === departmentFilter);
    }

    // Tip filtresi
    if (typeFilter && typeFilter !== 'all') {
      filtered = filtered.filter(doc => doc.documentType?.id === typeFilter);
    }

    // Klasör filtresi
    if (folderFilter && folderFilter !== 'all') {
      filtered = filtered.filter(doc => doc.folder?.id === folderFilter);
    }

    // Etiket filtresi
    if (tagFilter && tagFilter !== 'all') {
      filtered = filtered.filter(doc => 
        doc.tags?.some(t => t.tag.id === tagFilter)
      );
    }

    setFilteredDocuments(filtered);
  }, [documents, searchTerm, statusFilter, departmentFilter, typeFilter, folderFilter, tagFilter]);

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setDepartmentFilter('all');
    setTypeFilter('all');
    setFolderFilter('all');
    setTagFilter('all');
  };

  const hasActiveFilters = searchTerm || statusFilter !== 'all' || departmentFilter !== 'all' || typeFilter !== 'all' || folderFilter !== 'all' || tagFilter !== 'all';

  const fetchData = async () => {
    try {
      // Özel filtre varsa ilgili API'yi çağır
      let docsUrl = '/api/documents';
      if (specialFilter) {
        docsUrl = `/api/documents?specialFilter=${specialFilter}`;
      }
      
      const [docsRes, foldersRes, typesRes, deptsRes, tagsRes] = await Promise.all([
        fetch(docsUrl),
        fetch('/api/folders'),
        fetch('/api/document-types'),
        fetch('/api/departments'),
        fetch('/api/tags'),
      ]);

      if (docsRes?.ok) {
        const data = await docsRes?.json?.();
        setDocuments(data?.documents ?? []);
        setFilteredDocuments(data?.documents ?? []);
      }
      if (foldersRes?.ok) {
        const data = await foldersRes?.json?.();
        setFolders(data?.folders ?? []);
      }
      if (typesRes?.ok) {
        const data = await typesRes?.json?.();
        setDocumentTypes(data?.documentTypes ?? []);
      }
      if (deptsRes?.ok) {
        const data = await deptsRes?.json?.();
        setDepartments(data?.departments ?? []);
      }
      if (tagsRes?.ok) {
        const data = await tagsRes?.json?.();
        setTags(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!documentToDelete) return;
    
    setDeleting(true);
    try {
      const response = await fetch(`/api/documents/${documentToDelete}`, {
        method: 'DELETE',
      });

      if (response?.ok) {
        toast({ title: 'Başarılı', description: 'Doküman silindi' });
        fetchData();
      } else {
        const data = await response?.json?.();
        toast({ title: 'Hata', description: data?.error || 'Doküman silinemedi', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Hata', description: 'Bir hata oluştu', variant: 'destructive' });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
    }
  };

  const getPendingApprover = (doc: Document) => {
    const pendingApproval = doc.approvals?.find(a => a.status === 'BEKLIYOR');
    if (pendingApproval?.approver) {
      return `${pendingApproval.approver.name} ${pendingApproval.approver.surname || ''}`;
    }
    return null;
  };

  // Önizleme fonksiyonları
  const handlePreview = async (docId: string) => {
    setPreviewLoading(true);
    setPreviewOpen(true);
    try {
      const versionsRes = await fetch(`/api/documents/${docId}/versions`);
      if (versionsRes?.ok) {
        const versionsData = await versionsRes?.json?.();
        if (versionsData?.versions?.[0]) {
          const version = versionsData.versions[0];
          setPreviewFileName(version?.fileName);
          setPreviewFileType(version?.fileType);
          
          // Önizleme için inline URL al (forPreview: true)
          const previewUrlRes = await fetch('/api/upload/url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              cloud_storage_path: version?.cloudStoragePath,
              isPublic: version?.isPublic || false,
              forPreview: true,
              fileName: version?.fileName,
            }),
          });
          
          if (previewUrlRes.ok) {
            const previewData = await previewUrlRes.json();
            // Dosyayı fetch edip blob URL oluştur (önizleme için)
            const fileResponse = await fetch(previewData.url);
            if (fileResponse.ok) {
              const blob = await fileResponse.blob();
              const blobUrl = URL.createObjectURL(blob);
              setPreviewFileUrl(blobUrl);
            } else {
              throw new Error('Dosya yüklenemedi');
            }
          } else {
            // Fallback: eski URL'yi kullan
            const fileResponse = await fetch(version?.fileUrl);
            if (fileResponse.ok) {
              const blob = await fileResponse.blob();
              const blobUrl = URL.createObjectURL(blob);
              setPreviewFileUrl(blobUrl);
            } else {
              throw new Error('Dosya yüklenemedi');
            }
          }
        }
      }
    } catch (error) {
      console.error('Preview fetch error:', error);
      toast({ title: 'Hata', description: 'Dosya önizlemesi yüklenemedi', variant: 'destructive' });
    } finally {
      setPreviewLoading(false);
    }
  };

  const canPreview = (fileType: string | null) => {
    if (!fileType) return false;
    const previewableTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    return previewableTypes.includes(fileType);
  };

  const isImage = (fileType: string | null) => {
    if (!fileType) return false;
    return fileType.startsWith('image/');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e?.preventDefault?.();

    if (!formData?.file) {
      toast({ title: 'Hata', description: 'Dosya seçmelisiniz', variant: 'destructive' });
      return;
    }

    setUploading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData?.title ?? '');
      formDataToSend.append('description', formData?.description ?? '');
      formDataToSend.append('folderId', formData?.folderId ?? '');
      formDataToSend.append('documentTypeId', formData?.documentTypeId ?? '');
      formDataToSend.append('departmentId', formData?.departmentId ?? '');
      formDataToSend.append('file', formData?.file);

      const response = await fetch('/api/documents', {
        method: 'POST',
        body: formDataToSend,
      });

      if (response?.ok) {
        toast({ title: 'Başarılı', description: 'Doküman başarıyla yüklendi' });
        setDialogOpen(false);
        resetForm();
        fetchData();
      } else {
        const data = await response?.json?.();
        toast({ title: 'Hata', description: data?.error || 'Bir hata oluştu', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Hata', description: 'Bir hata oluştu', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      folderId: '',
      documentTypeId: '',
      departmentId: '',
      file: null,
    });
  };

  // Yeni etiket oluşturma
  const handleCreateTag = async () => {
    if (!newTagName.trim()) {
      toast({ title: 'Hata', description: 'Etiket adı boş olamaz', variant: 'destructive' });
      return;
    }

    setCreatingTag(true);
    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTagName.trim(), color: newTagColor }),
      });

      if (response?.ok) {
        toast({ title: 'Başarılı', description: 'Etiket oluşturuldu' });
        setNewTagName('');
        setNewTagColor('#3B82F6');
        setTagDialogOpen(false);
        fetchData();
      } else {
        const data = await response?.json?.();
        toast({ title: 'Hata', description: data?.error || 'Etiket oluşturulamadı', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Hata', description: 'Bir hata oluştu', variant: 'destructive' });
    } finally {
      setCreatingTag(false);
    }
  };

  // Toplu işlem seçimi
  const toggleDocSelection = (docId: string) => {
    const newSelected = new Set(selectedDocs);
    if (newSelected.has(docId)) {
      newSelected.delete(docId);
    } else {
      newSelected.add(docId);
    }
    setSelectedDocs(newSelected);
  };

  const selectAllDocs = () => {
    if (selectedDocs.size === filteredDocuments.length) {
      setSelectedDocs(new Set());
    } else {
      setSelectedDocs(new Set(filteredDocuments.map(d => d.id)));
    }
  };

  // Toplu işlem çalıştırma
  const handleBulkAction = async () => {
    if (selectedDocs.size === 0) {
      toast({ title: 'Hata', description: 'En az bir doküman seçmelisiniz', variant: 'destructive' });
      return;
    }

    setBulkProcessing(true);
    try {
      const payload: any = {
        action: bulkAction,
        documentIds: Array.from(selectedDocs),
      };

      if (bulkAction === 'reject') {
        payload.reason = bulkRejectReason;
      }

      if (bulkAction === 'addTags' || bulkAction === 'removeTags') {
        payload.tagIds = selectedTagsForBulk;
      }

      const response = await fetch('/api/documents/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response?.json?.();
      
      if (response?.ok) {
        toast({ 
          title: 'Başarılı', 
          description: `${data.results?.success || 0} doküman işlendi` 
        });
        setSelectedDocs(new Set());
        setBulkDialogOpen(false);
        setBulkAction('');
        setBulkRejectReason('');
        setSelectedTagsForBulk([]);
        fetchData();
      } else {
        toast({ title: 'Hata', description: data?.error || 'İşlem başarısız', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Hata', description: 'Bir hata oluştu', variant: 'destructive' });
    } finally {
      setBulkProcessing(false);
    }
  };

  // Resim dosyası mı kontrolü (thumbnail için)
  const getImageThumbnail = (doc: Document) => {
    const version = doc.versions?.[0];
    if (!version) return null;
    const imageTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    if (imageTypes.includes(version.fileType)) {
      return version;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Özel filtreyi temizle
  const clearSpecialFilter = () => {
    router.push('/dashboard/documents');
  };

  return (
    <div className="space-y-6">
      {/* Özel Filtre Banner */}
      {specialFilter && specialFilterLabels[specialFilter] && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-full">
              <Filter className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-blue-900">{specialFilterLabels[specialFilter]}</p>
              <p className="text-sm text-blue-700">
                {filteredDocuments.length} doküman listeleniyor
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={clearSpecialFilter}>
            <X className="h-4 w-4 mr-1" />
            Filtreyi Kaldır
          </Button>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {specialFilter && specialFilterLabels[specialFilter] 
              ? specialFilterLabels[specialFilter] 
              : 'Doküman Yönetimi'}
          </h1>
          <p className="text-gray-500 mt-2">
            {specialFilter 
              ? `Size atanan ${filteredDocuments.length} doküman` 
              : 'Kontrollü dokümanları yönetin'}
          </p>
        </div>
        <div className="flex gap-2">
          {/* Toplu İşlemler */}
          {selectedDocs.size > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <MoreHorizontal className="w-4 h-4 mr-2" />
                  Toplu İşlem ({selectedDocs.size})
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => { setBulkAction('approve'); setBulkDialogOpen(true); }}>
                  Toplu Onayla
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setBulkAction('reject'); setBulkDialogOpen(true); }}>
                  Toplu Reddet
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { setBulkAction('addTags'); setBulkDialogOpen(true); }}>
                  Etiket Ekle
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setBulkAction('removeTags'); setBulkDialogOpen(true); }}>
                  Etiket Kaldır
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { setBulkAction('publish'); setBulkDialogOpen(true); }}>
                  Toplu Yayınla
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setBulkAction('archive'); setBulkDialogOpen(true); }}>
                  Toplu Arşivle
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Etiket Yönetimi */}
          <Dialog open={tagDialogOpen} onOpenChange={setTagDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Tag className="w-4 h-4 mr-2" />
                Etiketler
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Yeni Etiket Oluştur</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Etiket Adı *</Label>
                  <Input
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="Örn: Acil, Önemli, Gizli"
                  />
                </div>
                <div>
                  <Label>Renk</Label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={newTagColor}
                      onChange={(e) => setNewTagColor(e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer"
                    />
                    <span className="text-sm text-gray-500">{newTagColor}</span>
                  </div>
                </div>
                <div>
                  <Label>Mevcut Etiketler</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {tags.map(tag => (
                      <Badge key={tag.id} style={{ backgroundColor: tag.color, color: '#fff' }}>
                        {tag.name}
                      </Badge>
                    ))}
                    {tags.length === 0 && <span className="text-sm text-gray-500">Henüz etiket yok</span>}
                  </div>
                </div>
                <Button onClick={handleCreateTag} disabled={creatingTag} className="w-full">
                  {creatingTag ? 'Oluşturuluyor...' : 'Etiket Oluştur'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <ExportButton
            data={filteredDocuments.map(doc => ({
              code: doc.code,
              title: doc.title,
              status: statusLabels[doc.status] || doc.status,
              folder: doc.folder?.name || '-',
              documentType: doc.documentType?.name || '-',
              department: doc.department?.name || '-',
              createdBy: doc.createdBy?.name || '-',
              createdAt: formatDate(doc.createdAt),
              tags: doc.tags?.map(t => t.tag.name).join(', ') || '-',
            }))}
            columns={[
              { header: 'Kod', key: 'code', width: 15 },
              { header: 'Başlık', key: 'title', width: 30 },
              { header: 'Durum', key: 'status', width: 15 },
              { header: 'Klasör', key: 'folder', width: 15 },
              { header: 'Tip', key: 'documentType', width: 15 },
              { header: 'Departman', key: 'department', width: 15 },
              { header: 'Oluşturan', key: 'createdBy', width: 15 },
              { header: 'Tarih', key: 'createdAt', width: 12 },
              { header: 'Etiketler', key: 'tags', width: 20 },
            ]}
            fileName="dokumanlar"
            title="Dokümanlar"
          />
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Yeni Doküman
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Yeni Doküman Ekle</DialogTitle>
              <DialogDescription>Doküman bilgilerini giriniz ve dosyayı yükleyiniz.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Başlık *</Label>
                <Input
                  value={formData?.title ?? ''}
                  onChange={(e) => setFormData({ ...formData, title: e?.target?.value ?? '' })}
                  required
                />
              </div>
              <div>
                <Label>Açıklama</Label>
                <Input
                  value={formData?.description ?? ''}
                  onChange={(e) => setFormData({ ...formData, description: e?.target?.value ?? '' })}
                />
              </div>
              <div>
                <Label>Klasör</Label>
                <Select
                  value={formData?.folderId ?? ''}
                  onValueChange={(value) => setFormData({ ...formData, folderId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Klasör seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {(folders ?? [])?.map?.((folder) => (
                      <SelectItem key={folder?.id} value={folder?.id ?? ''}>
                        {folder?.name}
                      </SelectItem>
                    )) ?? null}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Doküman Tipi</Label>
                <Select
                  value={formData?.documentTypeId ?? ''}
                  onValueChange={(value) => setFormData({ ...formData, documentTypeId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Doküman tipi seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {(documentTypes ?? [])?.map?.((type) => (
                      <SelectItem key={type?.id} value={type?.id ?? ''}>
                        {type?.name}
                      </SelectItem>
                    )) ?? null}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Departman</Label>
                <Select
                  value={formData?.departmentId ?? ''}
                  onValueChange={(value) => setFormData({ ...formData, departmentId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Departman seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {(departments ?? [])?.map?.((dept) => (
                      <SelectItem key={dept?.id} value={dept?.id ?? ''}>
                        {dept?.name}
                      </SelectItem>
                    )) ?? null}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Dosya *</Label>
                <Input
                  type="file"
                  onChange={(e) => setFormData({ ...formData, file: e?.target?.files?.[0] ?? null })}
                  required
                />
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => {
                  setDialogOpen(false);
                  resetForm();
                }}>
                  İptal
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={uploading}>
                  {uploading ? 'Yüklüyor...' : 'Yükle'}
                </Button>
              </div>
            </form>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filtreleme Arayüzü */}
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-500" />
              <CardTitle className="text-lg">Filtreler</CardTitle>
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="w-4 h-4 mr-1" />
                Filtreleri Temizle
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Arama */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Kod veya başlık ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Durum */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Durum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Durumlar</SelectItem>
                {Object.entries(statusLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Departman */}
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

            {/* Doküman Tipi */}
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Doküman Tipi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Tipler</SelectItem>
                {documentTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Klasör */}
            <Select value={folderFilter} onValueChange={setFolderFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Klasör" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Klasörler</SelectItem>
                {folders.map((folder) => (
                  <SelectItem key={folder.id} value={folder.id}>{folder.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Etiket */}
            <Select value={tagFilter} onValueChange={setTagFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Etiket" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Etiketler</SelectItem>
                {tags.map((tag) => (
                  <SelectItem key={tag.id} value={tag.id}>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }}></span>
                      {tag.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Dokümanlar</CardTitle>
          <CardDescription>
            {hasActiveFilters 
              ? `${filteredDocuments.length} / ${documents.length} doküman gösteriliyor`
              : `Toplam ${documents.length} doküman`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox 
                    checked={selectedDocs.size === filteredDocuments.length && filteredDocuments.length > 0}
                    onCheckedChange={selectAllDocs}
                  />
                </TableHead>
                <TableHead>Kod</TableHead>
                <TableHead>Başlık</TableHead>
                <TableHead>Tipi</TableHead>
                <TableHead>Departman</TableHead>
                <TableHead>Etiketler</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocuments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    {hasActiveFilters ? 'Filtrelere uygun doküman bulunamadı' : 'Henüz doküman bulunmuyor'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredDocuments.map((doc) => {
                  const pendingApprover = getPendingApprover(doc);
                  const thumbnail = getImageThumbnail(doc);
                  return (
                    <TableRow key={doc?.id} className={selectedDocs.has(doc?.id) ? 'bg-blue-50' : ''}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedDocs.has(doc?.id)}
                          onCheckedChange={() => toggleDocSelection(doc?.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <button 
                          className="flex items-center space-x-2 hover:text-blue-700 cursor-pointer group"
                          onClick={() => handlePreview(doc?.id)}
                          title="Önizlemek için tıklayın"
                        >
                          {thumbnail ? (
                            <div className="w-8 h-8 rounded overflow-hidden border">
                              <img 
                                src={thumbnail.fileUrl} 
                                alt={doc?.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <FileText className="w-4 h-4 text-blue-600 group-hover:text-blue-700" />
                          )}
                          <span className="text-blue-600 group-hover:text-blue-700 group-hover:underline">{doc?.code}</span>
                        </button>
                      </TableCell>
                      <TableCell>{doc?.title}</TableCell>
                      <TableCell>{doc?.documentType?.name ?? '-'}</TableCell>
                      <TableCell>{doc?.department?.name ?? '-'}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {doc?.tags && doc.tags.length > 0 ? (
                            doc.tags.slice(0, 3).map((t) => (
                              <Badge 
                                key={t.tag.id} 
                                style={{ backgroundColor: t.tag.color, color: '#fff' }}
                                className="text-xs"
                              >
                                {t.tag.name}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                          {doc?.tags && doc.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs">+{doc.tags.length - 3}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge className={statusColors?.[doc?.status] || 'bg-gray-100 text-gray-800'}>
                            {statusLabels?.[doc?.status] || doc?.status}
                          </Badge>
                          {doc?.status === 'ONAY_BEKLIYOR' && pendingApprover && (
                            <span className="text-xs text-orange-600">
                              Bekleyen: {pendingApprover}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" asChild title="Görüntüle">
                            <Link href={`/dashboard/documents/${doc?.id}`}>
                              <Eye className="w-4 h-4" />
                            </Link>
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            title="Sil"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => {
                              setDocumentToDelete(doc.id);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Silme Onay Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dokümanı Silmek İstediğinize Emin Misiniz?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu işlem geri alınamaz. Doküman ve tüm versiyonları kalıcı olarak silinecektir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? 'Siliniyor...' : 'Sil'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Önizleme Dialog */}
      <Dialog open={previewOpen} onOpenChange={(open) => {
        setPreviewOpen(open);
        if (!open) {
          // Blob URL'yi temizle (memory leak önleme)
          if (previewFileUrl && previewFileUrl.startsWith('blob:')) {
            URL.revokeObjectURL(previewFileUrl);
          }
          setPreviewFileUrl(null);
          setPreviewFileName(null);
          setPreviewFileType(null);
        }
      }}>
        <DialogContent className="max-w-5xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewFileType && isImage(previewFileType) ? <FileImage className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
              {previewFileName || 'Doküman Önizleme'}
            </DialogTitle>
          </DialogHeader>
          {previewLoading ? (
            <div className="w-full h-[70vh] flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
            </div>
          ) : previewFileUrl ? (
            <div className="w-full h-[70vh] overflow-auto">
              {previewFileType && isImage(previewFileType) ? (
                <img 
                  src={previewFileUrl} 
                  alt={previewFileName || 'Document'} 
                  className="max-w-full h-auto mx-auto"
                />
              ) : previewFileType && canPreview(previewFileType) ? (
                <iframe 
                  src={previewFileUrl} 
                  className="w-full h-full border-0"
                  title="Document Preview"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <FileText className="w-16 h-16 mb-4" />
                  <p>Bu dosya türü önizleme için desteklenmiyor.</p>
                  <p className="text-sm">Dosyayı indirip görüntüleyebilirsiniz.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-[70vh] flex items-center justify-center text-gray-500">
              Dosya bulunamadı
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Toplu İşlem Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={(open) => {
        setBulkDialogOpen(open);
        if (!open) {
          setBulkAction('');
          setBulkRejectReason('');
          setSelectedTagsForBulk([]);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {bulkAction === 'approve' && 'Toplu Onay'}
              {bulkAction === 'reject' && 'Toplu Red'}
              {bulkAction === 'addTags' && 'Toplu Etiket Ekle'}
              {bulkAction === 'removeTags' && 'Toplu Etiket Kaldır'}
              {bulkAction === 'publish' && 'Toplu Yayınla'}
              {bulkAction === 'archive' && 'Toplu Arşivle'}
            </DialogTitle>
            <DialogDescription>
              {selectedDocs.size} doküman seçildi
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {bulkAction === 'reject' && (
              <div>
                <Label>Red Nedeni</Label>
                <Input
                  value={bulkRejectReason}
                  onChange={(e) => setBulkRejectReason(e.target.value)}
                  placeholder="Red nedenini giriniz..."
                />
              </div>
            )}

            {(bulkAction === 'addTags' || bulkAction === 'removeTags') && (
              <div>
                <Label>Etiketler</Label>
                <div className="flex flex-wrap gap-2 mt-2 p-3 border rounded-md max-h-40 overflow-y-auto">
                  {tags.map((tag) => (
                    <label
                      key={tag.id}
                      className={`flex items-center gap-2 px-3 py-1 rounded-full cursor-pointer border transition-all ${
                        selectedTagsForBulk.includes(tag.id) 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Checkbox
                        checked={selectedTagsForBulk.includes(tag.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedTagsForBulk([...selectedTagsForBulk, tag.id]);
                          } else {
                            setSelectedTagsForBulk(selectedTagsForBulk.filter(id => id !== tag.id));
                          }
                        }}
                      />
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }}></span>
                      <span className="text-sm">{tag.name}</span>
                    </label>
                  ))}
                  {tags.length === 0 && (
                    <span className="text-gray-500 text-sm">Henüz etiket oluşturulmamış</span>
                  )}
                </div>
              </div>
            )}

            {(bulkAction === 'approve' || bulkAction === 'publish' || bulkAction === 'archive') && (
              <p className="text-sm text-gray-600">
                {bulkAction === 'approve' && 'Seçilen dokümanlar onaylanacaktır. Sadece onay bekleyen dokümanlar işlenecektir.'}
                {bulkAction === 'publish' && 'Seçilen dokümanlar yayınlanacaktır. Sadece onaylanmış dokümanlar işlenecektir.'}
                {bulkAction === 'archive' && 'Seçilen dokümanlar arşivlenecektir.'}
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setBulkDialogOpen(false)}>
              İptal
            </Button>
            <Button 
              onClick={handleBulkAction} 
              disabled={bulkProcessing || ((bulkAction === 'addTags' || bulkAction === 'removeTags') && selectedTagsForBulk.length === 0)}
            >
              {bulkProcessing ? 'İşleniyor...' : 'Uygula'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Export with Suspense for useSearchParams
export default function DocumentsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
      <DocumentsContent />
    </Suspense>
  );
}
