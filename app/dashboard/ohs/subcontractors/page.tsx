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
  DialogTrigger,
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
  Users,
  Search,
  FileText,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  ExternalLink,
  Download,
  Trash2,
  Eye,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/export-utils';

interface Subcontractor {
  id: string;
  code: string;
  name: string;
  category?: { id: string; name: string };
  phone?: string;
  email?: string;
  city?: string;
  subcontractorAddedAt: string;
  subcontractorDocuments: SubcontractorDocument[];
  _count: { subcontractorDocuments: number };
  documentStatus: 'OK' | 'EXPIRING' | 'EXPIRED';
  expiringDocCount: number;
  expiredDocCount: number;
}

interface SubcontractorDocument {
  id: string;
  documentType: string;
  title: string;
  description?: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  cloudStoragePath: string;
  isPublic: boolean;
  expiryDate?: string;
  uploadedBy: { id: string; name: string; surname?: string };
  createdAt: string;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  SOZLESME: 'Sözleşme',
  ISG_SERTIFIKA: 'İSG Sertifikası',
  DIGER: 'Diğer',
};

const DOC_STATUS_COLORS: Record<string, string> = {
  OK: 'bg-green-100 text-green-800',
  EXPIRING: 'bg-yellow-100 text-yellow-800',
  EXPIRED: 'bg-red-100 text-red-800',
};

const DOC_STATUS_LABELS: Record<string, string> = {
  OK: 'Güncel',
  EXPIRING: 'Süresi Yaklaşıyor',
  EXPIRED: 'Süresi Dolmuş',
};

export default function SubcontractorsPage() {
  const router = useRouter();
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSubcontractor, setSelectedSubcontractor] = useState<Subcontractor | null>(null);
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    documentType: '',
    title: '',
    description: '',
    expiryDate: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    fetchSubcontractors();
  }, [search]);

  const fetchSubcontractors = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);

      const response = await fetch(`/api/ohs/subcontractors?${params}`);
      if (response.ok) {
        const data = await response.json();
        setSubcontractors(Array.isArray(data) ? data : []);
      } else {
        setSubcontractors([]);
        toast.error('Taşeronlar yüklenemedi');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Bir hata oluştu');
      setSubcontractors([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadDocument = async () => {
    if (!selectedSubcontractor || !selectedFile || !uploadForm.documentType || !uploadForm.title) {
      toast.error('Lütfen tüm zorunlu alanları doldurun');
      return;
    }

    try {
      setUploading(true);

      // Presigned URL al
      const presignedResponse = await fetch('/api/upload/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: selectedFile.name,
          contentType: selectedFile.type,
          isPublic: false,
        }),
      });

      if (!presignedResponse.ok) {
        throw new Error('Presigned URL alınamadı');
      }

      const { uploadUrl, cloud_storage_path } = await presignedResponse.json();

      // S3'e yükle
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: selectedFile,
        headers: {
          'Content-Type': selectedFile.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Dosya yüklenemedi');
      }

      // Veritabanına kaydet
      const docResponse = await fetch(`/api/ohs/subcontractors/${selectedSubcontractor.id}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType: uploadForm.documentType,
          title: uploadForm.title,
          description: uploadForm.description,
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          fileType: selectedFile.type,
          cloudStoragePath: cloud_storage_path,
          isPublic: false,
          expiryDate: uploadForm.expiryDate || null,
        }),
      });

      if (docResponse.ok) {
        toast.success('Belge başarıyla yüklendi');
        setUploadDialogOpen(false);
        setUploadForm({ documentType: '', title: '', description: '', expiryDate: '' });
        setSelectedFile(null);
        fetchSubcontractors();
      } else {
        throw new Error('Belge kaydedilemedi');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Belge yüklenirken hata oluştu');
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadDocument = async (doc: SubcontractorDocument) => {
    try {
      const response = await fetch('/api/upload/url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cloud_storage_path: doc.cloudStoragePath,
          isPublic: doc.isPublic,
          fileName: doc.fileName,
        }),
      });

      if (response.ok) {
        const { url } = await response.json();
        window.open(url, '_blank');
      } else {
        toast.error('Dosya indirilemedi');
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Bir hata oluştu');
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!selectedSubcontractor) return;
    if (!confirm('Bu belgeyi silmek istediğinize emin misiniz?')) return;

    try {
      const response = await fetch(
        `/api/ohs/subcontractors/${selectedSubcontractor.id}/documents/${docId}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        toast.success('Belge silindi');
        fetchSubcontractors();
        // Dialog'daki belgeleri güncelle
        if (selectedSubcontractor) {
          const updatedDocs = selectedSubcontractor.subcontractorDocuments.filter((d) => d.id !== docId);
          setSelectedSubcontractor({
            ...selectedSubcontractor,
            subcontractorDocuments: updatedDocs,
          });
        }
      } else {
        toast.error('Belge silinemedi');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Bir hata oluştu');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-7 h-7 text-orange-600" />
            Taşeron Firmalar
          </h1>
          <p className="text-muted-foreground">
            Taşeron firma belgelerini ve İSG süreçlerini takip edin
          </p>
        </div>
      </div>

      {/* Arama */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Firma adı veya kodu ile ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Taşeron Listesi */}
      <Card>
        <CardHeader>
          <CardTitle>Kayıtlı Taşeronlar ({subcontractors.length})</CardTitle>
          <CardDescription>
            Tedarikçi modülünde taşeron olarak işaretlenen firmalar
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>
          ) : subcontractors.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Henüz taşeron firma bulunmuyor. Tedarikçi modülünden taşeron işaretleyin.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kod</TableHead>
                  <TableHead>Firma Adı</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>İletişim</TableHead>
                  <TableHead>Belge Durumu</TableHead>
                  <TableHead>Belgeler</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subcontractors.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-mono text-sm">{sub.code}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{sub.name}</p>
                        {sub.city && <p className="text-xs text-muted-foreground">{sub.city}</p>}
                      </div>
                    </TableCell>
                    <TableCell>{sub.category?.name || '-'}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {sub.phone && <p>{sub.phone}</p>}
                        {sub.email && <p className="text-muted-foreground">{sub.email}</p>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={DOC_STATUS_COLORS[sub.documentStatus]}>
                        {sub.documentStatus === 'EXPIRED' && (
                          <AlertTriangle className="w-3 h-3 mr-1" />
                        )}
                        {sub.documentStatus === 'EXPIRING' && (
                          <Clock className="w-3 h-3 mr-1" />
                        )}
                        {sub.documentStatus === 'OK' && (
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                        )}
                        {DOC_STATUS_LABELS[sub.documentStatus]}
                      </Badge>
                      {sub.expiredDocCount > 0 && (
                        <p className="text-xs text-red-600 mt-1">
                          {sub.expiredDocCount} belgenin süresi dolmuş
                        </p>
                      )}
                      {sub.expiringDocCount > 0 && (
                        <p className="text-xs text-yellow-600 mt-1">
                          {sub.expiringDocCount} belgenin süresi yaklaşıyor
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        <FileText className="w-3 h-3 mr-1" />
                        {sub._count.subcontractorDocuments} Belge
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedSubcontractor(sub);
                            setDocumentDialogOpen(true);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Belgeler
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => {
                            setSelectedSubcontractor(sub);
                            setUploadDialogOpen(true);
                          }}
                        >
                          <Upload className="w-4 h-4 mr-1" />
                          Yükle
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

      {/* Belgeleri Görüntüleme Dialog */}
      <Dialog open={documentDialogOpen} onOpenChange={setDocumentDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedSubcontractor?.name} - Belgeler</DialogTitle>
            <DialogDescription>Taşeron firmaya ait yüklenmiş belgeler</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedSubcontractor?.subcontractorDocuments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Henüz belge yüklenmemiş
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Belge Türü</TableHead>
                    <TableHead>Başlık</TableHead>
                    <TableHead>Dosya</TableHead>
                    <TableHead>Son Kullanma</TableHead>
                    <TableHead>Yükleyen</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedSubcontractor?.subcontractorDocuments.map((doc) => {
                    const isExpired = doc.expiryDate && new Date(doc.expiryDate) < new Date();
                    const isExpiring = doc.expiryDate && !isExpired && 
                      Math.ceil((new Date(doc.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) <= 30;
                    
                    return (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <Badge variant="outline">
                            {DOC_TYPE_LABELS[doc.documentType] || doc.documentType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{doc.title}</p>
                            {doc.description && (
                              <p className="text-xs text-muted-foreground">{doc.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{doc.fileName}</p>
                            <p className="text-muted-foreground">{formatFileSize(doc.fileSize)}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {doc.expiryDate ? (
                            <div className={`text-sm ${isExpired ? 'text-red-600' : isExpiring ? 'text-yellow-600' : ''}`}>
                              <div className="flex items-center gap-1">
                                {isExpired && <AlertTriangle className="w-3 h-3" />}
                                {isExpiring && <Clock className="w-3 h-3" />}
                                <Calendar className="w-3 h-3" />
                                {formatDate(doc.expiryDate)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {doc.uploadedBy.name} {doc.uploadedBy.surname}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDownloadDocument(doc)}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleDeleteDocument(doc.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}

            <div className="flex justify-end">
              <Button
                onClick={() => {
                  setDocumentDialogOpen(false);
                  setUploadDialogOpen(true);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Yeni Belge Yükle
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Belge Yükleme Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedSubcontractor?.name} - Belge Yükle</DialogTitle>
            <DialogDescription>Taşeron firmaya yeni belge ekleyin</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Belge Türü *</Label>
              <Select
                value={uploadForm.documentType}
                onValueChange={(value) => setUploadForm({ ...uploadForm, documentType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SOZLESME">Sözleşme</SelectItem>
                  <SelectItem value="ISG_SERTIFIKA">İSG Sertifikası</SelectItem>
                  <SelectItem value="DIGER">Diğer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Belge Başlığı *</Label>
              <Input
                value={uploadForm.title}
                onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                placeholder="Belge başlığı"
              />
            </div>

            <div className="space-y-2">
              <Label>Açıklama</Label>
              <Textarea
                value={uploadForm.description}
                onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                placeholder="Belge hakkında notlar"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Son Kullanma Tarihi</Label>
              <Input
                type="date"
                value={uploadForm.expiryDate}
                onChange={(e) => setUploadForm({ ...uploadForm, expiryDate: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Son kullanma tarihi yaklaştığında otomatik uyarı gönderilir
              </p>
            </div>

            <div className="space-y-2">
              <Label>Dosya *</Label>
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
              {selectedFile && (
                <p className="text-sm text-muted-foreground">
                  Seçili: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
                İptal
              </Button>
              <Button onClick={handleUploadDocument} disabled={uploading}>
                {uploading ? 'Yükleniyor...' : 'Yükle'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
