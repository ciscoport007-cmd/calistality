'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  FileText, Download, Calendar, User, Building2, FolderOpen, CheckCircle, XCircle, Clock,
  Edit, ArrowLeft, Eye, Upload, RefreshCw, Trash2, AlertTriangle, FileImage, File,
  Lock, Unlock, CalendarClock, Bell, Users, BookCheck, Ban, Search, ClipboardCheck, UserCheck, Tag, Plus, X,
  FileSpreadsheet, Presentation, Shield, UserPlus, Briefcase, Loader2, PenLine, ShieldCheck
} from 'lucide-react';
import SignatureOverlay from '@/components/esignature/SignatureOverlay';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import FilePreview from '@/components/documents/file-preview';
import DocumentWorkflow from '@/components/documents/document-workflow';
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

interface Document {
  id: string;
  code: string;
  title: string;
  description: string | null;
  status: string;
  currentVersion: number;
  folder: any;
  documentType: any;
  department: any;
  createdBy: any;
  preparedBy: any;
  approvedBy: any;
  createdAt: string;
  approvedAt: string | null;
  versions: any[];
  approvals: any[];
  readLogs: any[];
  // Check-in/Check-out
  isLockedForEdit: boolean;
  lockedBy: any;
  lockedAt: string | null;
  lockReason: string | null;
  // Planlı Revizyon
  reviewFrequencyMonths: number | null;
  nextReviewDate: string | null;
  lastReviewDate: string | null;
  reviewReminder: boolean;
  // Okundu Onayı
  requiresAcknowledgment: boolean;
  acknowledgmentDeadline: string | null;
  acknowledgments: any[];
  // Phase 2 - Özel Meta Veri
  metadata: Record<string, any> | null;
  // Phase 2 - İptal Süreci
  cancelledBy: any;
  cancelledAt: string | null;
  cancellationReason: string | null;
  // Phase 2 - İnceleme Aşaması
  reviewStatus: string | null;
  reviewNote: string | null;
  reviewedBy: any;
  reviewedAt: string | null;
  reviews: any[];
  // Phase 3 - Etiketler
  tags?: { tag: { id: string; name: string; color: string } }[];
  // İzinler
  permissions?: any[];
  // İş Akışı Örnekleri
  workflowInstances?: any[];
  // Dijital İmzalar
  signatures?: Array<{
    id: string;
    signedById: string;
    signedBy: { id: string; name: string; email: string };
    signatureImagePath: string;
    fileHash: string;
    purpose: string;
    signedAt: string;
  }>;
}

interface DocumentPermission {
  id: string;
  userId?: string;
  user?: { id: string; name: string; email: string };
  groupId?: string;
  group?: { id: string; name: string };
  departmentId?: string;
  department?: { id: string; name: string; code: string };
  canView: boolean;
  canDownload: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
  canShare: boolean;
  expiresAt?: string;
  createdBy?: { id: string; name: string };
  createdAt: string;
}

export default function DocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession() || {};
  const { toast } = useToast();
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentFileUrl, setCurrentFileUrl] = useState<string | null>(null);
  const [currentFileName, setCurrentFileName] = useState<string | null>(null);
  const [currentFileType, setCurrentFileType] = useState<string | null>(null);
  const [currentCloudStoragePath, setCurrentCloudStoragePath] = useState<string | null>(null);
  const [currentIsPublic, setCurrentIsPublic] = useState<boolean>(false);
  
  // Preview state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewFileUrl, setPreviewFileUrl] = useState<string | null>(null);
  
  // Edit state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    status: '',
    departmentId: '',
    folderId: '',
    documentTypeId: '',
  });
  const [saving, setSaving] = useState(false);
  
  // Revision state
  const [revisionDialogOpen, setRevisionDialogOpen] = useState(false);
  const [revisionFile, setRevisionFile] = useState<File | null>(null);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  
  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Lock state (Check-in/Check-out)
  const [locking, setLocking] = useState(false);
  const [lockDialogOpen, setLockDialogOpen] = useState(false);
  const [lockReason, setLockReason] = useState('');
  const [lockPassword, setLockPassword] = useState('');
  
  // Review state (Planlı Revizyon)
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewFrequency, setReviewFrequency] = useState('');
  const [nextReviewDate, setNextReviewDate] = useState('');
  const [reviewReminder, setReviewReminder] = useState(true);
  
  // Acknowledgment state (Okundu Onayı)
  const [acknowledgmentDialogOpen, setAcknowledgmentDialogOpen] = useState(false);
  const [acknowledgments, setAcknowledgments] = useState<any[]>([]);
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [ackStats, setAckStats] = useState<any>({ total: 0, approved: 0, pending: 0, rejected: 0 });
  const [ackDeadline, setAckDeadline] = useState('');
  const [myAckDialogOpen, setMyAckDialogOpen] = useState(false);
  const [ackComment, setAckComment] = useState('');
  
  // Phase 2 - İptal state
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  
  // Phase 2 - İnceleme state (Pre-approval review)
  const [preApprovalReviewDialogOpen, setPreApprovalReviewDialogOpen] = useState(false);
  const [selectedReviewers, setSelectedReviewers] = useState<string[]>([]);
  const [docReviews, setDocReviews] = useState<any[]>([]);
  const [reviewStats, setReviewStats] = useState<any>({ total: 0, approved: 0, pending: 0, rejected: 0 });
  const [myReviewDialogOpen, setMyReviewDialogOpen] = useState(false);
  const [reviewComment, setReviewComment] = useState('');
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [reviewerUsers, setReviewerUsers] = useState<any[]>([]);
  const [loadingReviewers, setLoadingReviewers] = useState(false);
  
  // Reference data
  const [departments, setDepartments] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [documentTypes, setDocumentTypes] = useState<any[]>([]);
  
  // Permission state (Erişim Kontrolü)
  const [permissions, setPermissions] = useState<DocumentPermission[]>([]);
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false);
  const [groups, setGroups] = useState<any[]>([]);
  const [newPermission, setNewPermission] = useState({
    targetType: 'user', // user, group, department
    targetId: '',
    canView: true,
    canDownload: false,
    canEdit: false,
    canDelete: false,
    canApprove: false,
    canShare: false,
    expiresAt: '',
  });
  const [savingPermission, setSavingPermission] = useState(false);

  // Phase 3 - Etiket state
  const [allTags, setAllTags] = useState<{ id: string; name: string; color: string }[]>([]);
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [savingTags, setSavingTags] = useState(false);

  // Dijital İmza state
  const [showSignOverlay, setShowSignOverlay] = useState(false);
  const [signingDoc, setSigningDoc] = useState(false);

  useEffect(() => {
    if (params?.id) {
      fetchDocument();
      fetchReferenceData();
      fetchPermissions();
    }
  }, [params?.id]);

  const fetchReferenceData = async () => {
    try {
      const [foldersRes, typesRes, deptsRes, usersRes, tagsRes, groupsRes] = await Promise.all([
        fetch('/api/folders'),
        fetch('/api/document-types'),
        fetch('/api/departments'),
        fetch('/api/users'),
        fetch('/api/tags'),
        fetch('/api/groups'),
      ]);

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
      if (usersRes?.ok) {
        const data = await usersRes?.json?.();
        setAllUsers(Array.isArray(data) ? data : (data?.users ?? []));
      }
      if (tagsRes?.ok) {
        const data = await tagsRes?.json?.();
        setAllTags(Array.isArray(data) ? data : []);
      }
      if (groupsRes?.ok) {
        const data = await groupsRes?.json?.();
        setGroups(Array.isArray(data) ? data : (data?.groups ?? []));
      }
    } catch (error) {
      console.error('Reference data fetch error:', error);
    }
  };

  // İzinleri getir
  const fetchPermissions = async () => {
    try {
      const res = await fetch(`/api/documents/${params?.id}/permissions`);
      if (res?.ok) {
        const data = await res?.json?.();
        setPermissions(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Permissions fetch error:', error);
    }
  };

  // İnceleyici seçimi için kullanıcıları getir (mevcut kullanıcı hariç tüm kullanıcılar)
  const fetchReviewerUsers = async () => {
    setLoadingReviewers(true);
    try {
      const res = await fetch('/api/users?forReviewers=true');
      if (res?.ok) {
        const data = await res?.json?.();
        setReviewerUsers(Array.isArray(data) ? data : (data?.users ?? []));
      }
    } catch (error) {
      console.error('Reviewer users fetch error:', error);
    } finally {
      setLoadingReviewers(false);
    }
  };

  // İnceleme dialogunu aç
  const openReviewerDialog = async () => {
    await fetchReviewerUsers();
    setPreApprovalReviewDialogOpen(true);
  };

  const fetchDocument = async () => {
    try {
      const response = await fetch(`/api/documents/${params?.id}`);
      if (response?.ok) {
        const data = await response?.json?.();
        setDocument(data?.document);
        
        // Edit form'u doldur
        setEditForm({
          title: data?.document?.title || '',
          description: data?.document?.description || '',
          status: data?.document?.status || '',
          departmentId: data?.document?.department?.id || '',
          folderId: data?.document?.folder?.id || '',
          documentTypeId: data?.document?.documentType?.id || '',
        });
        
        // En son versiyonun bilgilerini al (URL önizleme açıldığında yüklenecek)
        if (data?.document?.versions?.[0]) {
          const versionsRes = await fetch(`/api/documents/${params?.id}/versions`);
          if (versionsRes?.ok) {
            const versionsData = await versionsRes?.json?.();
            if (versionsData?.versions?.[0]) {
              // Sadece meta bilgileri sakla, URL önizleme için lazy load edilecek
              setCurrentFileName(versionsData?.versions?.[0]?.fileName);
              setCurrentFileType(versionsData?.versions?.[0]?.fileType);
              // Orijinal S3 URL'yi sakla (indirme için kullanılacak)
              setCurrentFileUrl(versionsData?.versions?.[0]?.fileUrl);
              // Cloud storage path ve isPublic bilgisini sakla (önizleme için)
              setCurrentCloudStoragePath(versionsData?.versions?.[0]?.cloudStoragePath);
              setCurrentIsPublic(versionsData?.versions?.[0]?.isPublic || false);
            }
          }
        }

        // Okuma logu kaydet
        await fetch(`/api/documents/${params?.id}/read`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ duration: 0 }),
        });
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDocSign = async (dataUrl: string) => {
    setSigningDoc(true);
    try {
      const res = await fetch(`/api/esignature/document/${params?.id}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signatureDataUrl: dataUrl, purpose: 'ONAY' }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: 'Hata', description: data.error || 'İmzalanamadı', variant: 'destructive' });
        return;
      }
      toast({ title: 'İmzalandı', description: 'Belge imzanız kaydedildi.' });
      setShowSignOverlay(false);
      fetchDocument();
    } catch {
      toast({ title: 'Hata', description: 'Bir hata oluştu', variant: 'destructive' });
    } finally {
      setSigningDoc(false);
    }
  };

  const handleApprove = async (action: 'ONAYLANDI' | 'REDDEDILDI') => {
    try {
      const response = await fetch(`/api/documents/${params?.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (response?.ok) {
        toast({
          title: 'Başarılı',
          description: action === 'ONAYLANDI' ? 'Doküman onaylandı' : 'Doküman reddedildi',
        });
        fetchDocument();
      } else {
        const data = await response?.json?.();
        toast({ title: 'Hata', description: data?.error || 'Bir hata oluştu', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Hata', description: 'Bir hata oluştu', variant: 'destructive' });
    }
  };

  const handleEdit = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/documents/${params?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      if (response?.ok) {
        toast({ title: 'Başarılı', description: 'Doküman güncellendi' });
        setEditDialogOpen(false);
        fetchDocument();
      } else {
        const data = await response?.json?.();
        toast({ title: 'Hata', description: data?.error || 'Güncellenemedi', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Hata', description: 'Bir hata oluştu', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleRevision = async () => {
    if (!revisionFile) {
      toast({ title: 'Hata', description: 'Dosya seçmelisiniz', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', revisionFile);
      formData.append('notes', revisionNotes);

      const response = await fetch(`/api/documents/${params?.id}/versions`, {
        method: 'POST',
        body: formData,
      });

      if (response?.ok) {
        toast({ title: 'Başarılı', description: 'Yeni revizyon yüklendi' });
        setRevisionDialogOpen(false);
        setRevisionFile(null);
        setRevisionNotes('');
        fetchDocument();
      } else {
        const data = await response?.json?.();
        toast({ title: 'Hata', description: data?.error || 'Revizyon yüklenemedi', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Hata', description: 'Bir hata oluştu', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/documents/${params?.id}`, {
        method: 'DELETE',
      });

      if (response?.ok) {
        toast({ title: 'Başarılı', description: 'Doküman silindi' });
        router.push('/dashboard/documents');
      } else {
        const data = await response?.json?.();
        toast({ title: 'Hata', description: data?.error || 'Silinemedi', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Hata', description: 'Bir hata oluştu', variant: 'destructive' });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const getPendingApprover = () => {
    const pendingApproval = document?.approvals?.find(a => a.status === 'BEKLIYOR');
    if (pendingApproval?.approver) {
      return `${pendingApproval.approver.name} ${pendingApproval.approver.surname || ''}`;
    }
    return null;
  };

  // Desteklenen dosya türleri
  const OFFICE_EXTENSIONS = ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.odt', '.ods', '.odp'];
  const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp'];
  const TEXT_EXTENSIONS = ['.txt', '.md', '.json', '.xml', '.csv', '.log', '.ini', '.cfg', '.yaml', '.yml', '.html', '.css', '.js', '.ts'];

  const getFileExtension = () => {
    if (!currentFileName) return '';
    return currentFileName.toLowerCase().substring(currentFileName.lastIndexOf('.'));
  };

  const canPreview = () => {
    if (!currentFileType && !currentFileName) return false;
    const ext = getFileExtension();
    
    // PDF
    if (currentFileType === 'application/pdf' || ext === '.pdf') return true;
    // Görseller
    if ((currentFileType && IMAGE_TYPES.includes(currentFileType)) || ext.match(/\.(png|jpg|jpeg|gif|webp|svg|bmp)$/i)) return true;
    // Office dosyaları
    if (OFFICE_EXTENSIONS.includes(ext)) return true;
    // Metin dosyaları
    if (TEXT_EXTENSIONS.includes(ext) || currentFileType?.startsWith('text/')) return true;
    
    return false;
  };

  const isImage = () => {
    if (!currentFileType) return false;
    return currentFileType.startsWith('image/');
  };

  const isTextFile = () => {
    const ext = getFileExtension();
    return TEXT_EXTENSIONS.includes(ext) || currentFileType?.startsWith('text/');
  };

  const isOfficeFile = () => {
    const ext = getFileExtension();
    return OFFICE_EXTENSIONS.includes(ext);
  };

  // Önizleme aç - forPreview: true ile inline URL al
  const handleOpenPreview = async () => {
    if (!currentCloudStoragePath && !currentFileUrl) return;
    
    setPreviewLoading(true);
    
    try {
      let urlToUse = currentFileUrl;
      
      // Cloud storage path varsa önizleme URL'si al (inline disposition)
      if (currentCloudStoragePath) {
        const response = await fetch('/api/upload/url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cloud_storage_path: currentCloudStoragePath,
            isPublic: currentIsPublic,
            forPreview: true,
            fileName: currentFileName,
          }),
        });
        
        if (response.ok) {
          const data = await response.json();
          urlToUse = data.url;
        }
      }
      
      // Önce URL'yi set et, sonra dialog'u aç
      setPreviewFileUrl(urlToUse);
      setPreviewOpen(true);
    } catch (error) {
      console.error('Preview URL error:', error);
      setPreviewFileUrl(currentFileUrl);
      setPreviewOpen(true);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleClosePreview = () => {
    setPreviewOpen(false);
    setPreviewFileUrl(null);
    if (previewBlobUrl) {
      URL.revokeObjectURL(previewBlobUrl);
      setPreviewBlobUrl(null);
    }
  };

  // Metin dosyası kaydetme
  const handleSaveTextFile = async (content: string) => {
    const response = await fetch(`/api/documents/${params?.id}/edit-text`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, createNewVersion: true }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Kaydetme başarısız');
    }

    // Dokümanı yeniden yükle
    fetchDocument();
  };

  // Dosya türüne göre ikon
  const getFileTypeIcon = () => {
    const ext = getFileExtension();
    if (currentFileType === 'application/pdf' || ext === '.pdf') {
      return <FileText className="w-5 h-5 text-red-500" />;
    }
    if (isImage()) {
      return <FileImage className="w-5 h-5 text-green-500" />;
    }
    if (ext.match(/\.(xls|xlsx|ods|csv)$/i)) {
      return <FileSpreadsheet className="w-5 h-5 text-green-600" />;
    }
    if (ext.match(/\.(ppt|pptx|odp)$/i)) {
      return <Presentation className="w-5 h-5 text-orange-500" />;
    }
    if (ext.match(/\.(doc|docx|odt)$/i)) {
      return <FileText className="w-5 h-5 text-blue-600" />;
    }
    if (isTextFile()) {
      return <FileText className="w-5 h-5 text-gray-600" />;
    }
    return <File className="w-5 h-5 text-gray-500" />;
  };

  // === CHECK-IN / CHECK-OUT FONKSİYONLARI ===
  const handleLockDocument = async () => {
    if (!lockPassword) {
      toast({ title: 'Uyarı', description: 'Şifre girmeniz gereklidir', variant: 'destructive' });
      return;
    }
    
    setLocking(true);
    try {
      const response = await fetch(`/api/documents/${params?.id}/lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: lockReason, password: lockPassword }),
      });
      if (response.ok) {
        toast({ title: 'Başarılı', description: 'Doküman kilitlendi (Check-out)' });
        setLockDialogOpen(false);
        setLockReason('');
        setLockPassword('');
        fetchDocument();
      } else {
        const data = await response.json();
        toast({ title: 'Hata', description: data.error || 'Kilitleme başarısız', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Hata', description: 'Bir hata oluştu', variant: 'destructive' });
    } finally {
      setLocking(false);
    }
  };

  const handleUnlockDocument = async () => {
    setLocking(true);
    try {
      const response = await fetch(`/api/documents/${params?.id}/lock`, { method: 'DELETE' });
      if (response.ok) {
        toast({ title: 'Başarılı', description: 'Kilit kaldırıldı (Check-in)' });
        fetchDocument();
      } else {
        const data = await response.json();
        toast({ title: 'Hata', description: data.error || 'Kilit kaldırma başarısız', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Hata', description: 'Bir hata oluştu', variant: 'destructive' });
    } finally {
      setLocking(false);
    }
  };

  // === PLANLI REVİZYON FONKSİYONLARI ===
  const handleSaveReviewSchedule = async () => {
    try {
      const response = await fetch(`/api/documents/${params?.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewFrequencyMonths: reviewFrequency ? parseInt(reviewFrequency) : null,
          nextReviewDate: nextReviewDate || null,
          reviewReminder,
        }),
      });
      if (response.ok) {
        toast({ title: 'Başarılı', description: 'Revizyon planı kaydedildi' });
        setReviewDialogOpen(false);
        fetchDocument();
      } else {
        const data = await response.json();
        toast({ title: 'Hata', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Hata', description: 'Bir hata oluştu', variant: 'destructive' });
    }
  };

  const handleCompleteReview = async () => {
    try {
      const response = await fetch(`/api/documents/${params?.id}/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (response.ok) {
        toast({ title: 'Başarılı', description: 'Revizyon tamamlandı olarak işaretlendi' });
        fetchDocument();
      } else {
        const data = await response.json();
        toast({ title: 'Hata', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Hata', description: 'Bir hata oluştu', variant: 'destructive' });
    }
  };

  // === OKUNDU ONAYI FONKSİYONLARI ===
  const fetchAcknowledgments = async () => {
    try {
      const response = await fetch(`/api/documents/${params?.id}/acknowledgments`);
      if (response.ok) {
        const data = await response.json();
        setAcknowledgments(data.acknowledgments || []);
        setPendingUsers(data.pendingUsers || []);
        setAckStats(data.stats || { total: 0, approved: 0, pending: 0, rejected: 0 });
      }
    } catch (error) {
      console.error('Acknowledgments fetch error:', error);
    }
  };

  const handleSetupAcknowledgment = async () => {
    try {
      const response = await fetch(`/api/documents/${params?.id}/acknowledgments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requiresAcknowledgment: true,
          acknowledgmentDeadline: ackDeadline || null,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        toast({ 
          title: 'Başarılı', 
          description: `Okundu onayı ${data.targetUserCount} kullanıcıya atandı` 
        });
        setAcknowledgmentDialogOpen(false);
        fetchDocument();
        fetchAcknowledgments();
      } else {
        const data = await response.json();
        toast({ title: 'Hata', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Hata', description: 'Bir hata oluştu', variant: 'destructive' });
    }
  };

  const handleMyAcknowledgment = async (status: 'ONAYLANDI' | 'REDDEDILDI') => {
    try {
      const response = await fetch(`/api/documents/${params?.id}/acknowledgments`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, comments: ackComment }),
      });
      if (response.ok) {
        toast({ 
          title: 'Başarılı', 
          description: status === 'ONAYLANDI' ? 'Okudum onayı verildi' : 'Onay reddedildi' 
        });
        setMyAckDialogOpen(false);
        setAckComment('');
        fetchDocument();
        fetchAcknowledgments();
      } else {
        const data = await response.json();
        toast({ title: 'Hata', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Hata', description: 'Bir hata oluştu', variant: 'destructive' });
    }
  };

  // ===== PHASE 3 - ETİKET FONKSİYONLARI =====
  
  const handleOpenTagDialog = () => {
    // Mevcut etiketleri seçili yap
    const currentTagIds = document?.tags?.map(t => t.tag.id) || [];
    setSelectedTagIds(currentTagIds);
    setTagDialogOpen(true);
  };

  const handleSaveTags = async () => {
    setSavingTags(true);
    try {
      const response = await fetch(`/api/documents/${params?.id}/tags`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagIds: selectedTagIds }),
      });
      
      if (response.ok) {
        toast({ title: 'Başarılı', description: 'Etiketler güncellendi' });
        setTagDialogOpen(false);
        fetchDocument();
      } else {
        const data = await response.json();
        toast({ title: 'Hata', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Hata', description: 'Bir hata oluştu', variant: 'destructive' });
    } finally {
      setSavingTags(false);
    }
  };

  const toggleTagSelection = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      setSelectedTagIds(selectedTagIds.filter(id => id !== tagId));
    } else {
      setSelectedTagIds([...selectedTagIds, tagId]);
    }
  };

  // ===== ERİŞİM KONTROLÜ FONKSİYONLARI =====
  
  const handleAddPermission = async () => {
    if (!newPermission.targetId) {
      toast({ title: 'Hata', description: 'Hedef seçilmeli', variant: 'destructive' });
      return;
    }
    
    setSavingPermission(true);
    try {
      const body: any = {
        canView: newPermission.canView,
        canDownload: newPermission.canDownload,
        canEdit: newPermission.canEdit,
        canDelete: newPermission.canDelete,
        canApprove: newPermission.canApprove,
        canShare: newPermission.canShare,
        expiresAt: newPermission.expiresAt || null,
      };
      
      if (newPermission.targetType === 'user') {
        body.userId = newPermission.targetId;
      } else if (newPermission.targetType === 'group') {
        body.groupId = newPermission.targetId;
      } else if (newPermission.targetType === 'department') {
        body.departmentId = newPermission.targetId;
      }
      
      const response = await fetch(`/api/documents/${params?.id}/permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      
      if (response.ok) {
        toast({ title: 'Başarılı', description: 'İzin eklendi' });
        setPermissionDialogOpen(false);
        setNewPermission({
          targetType: 'user',
          targetId: '',
          canView: true,
          canDownload: false,
          canEdit: false,
          canDelete: false,
          canApprove: false,
          canShare: false,
          expiresAt: '',
        });
        fetchPermissions();
      } else {
        const data = await response.json();
        toast({ title: 'Hata', description: data.error || 'İzin eklenemedi', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Hata', description: 'Bir hata oluştu', variant: 'destructive' });
    } finally {
      setSavingPermission(false);
    }
  };

  const handleDeletePermission = async (permissionId: string) => {
    try {
      const response = await fetch(`/api/documents/${params?.id}/permissions?permissionId=${permissionId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        toast({ title: 'Başarılı', description: 'İzin kaldırıldı' });
        fetchPermissions();
      } else {
        const data = await response.json();
        toast({ title: 'Hata', description: data.error || 'İzin silinemedi', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Hata', description: 'Bir hata oluştu', variant: 'destructive' });
    }
  };

  const handleUpdatePermission = async (permissionId: string, updates: Partial<DocumentPermission>) => {
    try {
      const response = await fetch(`/api/documents/${params?.id}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissionId, ...updates }),
      });
      
      if (response.ok) {
        toast({ title: 'Başarılı', description: 'İzin güncellendi' });
        fetchPermissions();
      } else {
        const data = await response.json();
        toast({ title: 'Hata', description: data.error || 'İzin güncellenemedi', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Hata', description: 'Bir hata oluştu', variant: 'destructive' });
    }
  };

  // ===== PHASE 2 - İPTAL FONKSİYONLARI =====
  
  const handleCancelDocument = async () => {
    if (!cancelReason.trim()) {
      toast({ title: 'Hata', description: 'İptal nedeni zorunludur', variant: 'destructive' });
      return;
    }
    
    setCancelling(true);
    try {
      const response = await fetch(`/api/documents/${params?.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason }),
      });
      
      if (response.ok) {
        toast({ title: 'Başarılı', description: 'Doküman iptal edildi' });
        setCancelDialogOpen(false);
        setCancelReason('');
        fetchDocument();
      } else {
        const data = await response.json();
        toast({ title: 'Hata', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Hata', description: 'Bir hata oluştu', variant: 'destructive' });
    } finally {
      setCancelling(false);
    }
  };

  const handleRevertCancel = async () => {
    try {
      const response = await fetch(`/api/documents/${params?.id}/cancel`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        toast({ title: 'Başarılı', description: 'İptal geri alındı' });
        fetchDocument();
      } else {
        const data = await response.json();
        toast({ title: 'Hata', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Hata', description: 'Bir hata oluştu', variant: 'destructive' });
    }
  };

  // ===== PHASE 2 - İNCELEME FONKSİYONLARI =====
  
  const fetchReviews = async () => {
    try {
      const response = await fetch(`/api/documents/${params?.id}/reviews`);
      if (response.ok) {
        const data = await response.json();
        setDocReviews(data?.reviews ?? []);
        setReviewStats(data?.stats ?? { total: 0, approved: 0, pending: 0, rejected: 0 });
      }
    } catch (error) {
      console.error('Reviews fetch error:', error);
    }
  };

  const handleSendForReview = async () => {
    if (selectedReviewers.length === 0) {
      toast({ title: 'Hata', description: 'En az bir inceleyici seçmelisiniz', variant: 'destructive' });
      return;
    }
    
    try {
      const response = await fetch(`/api/documents/${params?.id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewerIds: selectedReviewers }),
      });
      
      if (response.ok) {
        toast({ title: 'Başarılı', description: 'Doküman incelemeye gönderildi' });
        setPreApprovalReviewDialogOpen(false);
        setSelectedReviewers([]);
        fetchDocument();
        fetchReviews();
      } else {
        const data = await response.json();
        toast({ title: 'Hata', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Hata', description: 'Bir hata oluştu', variant: 'destructive' });
    }
  };

  const handleMyReview = async (status: 'ONAYLANDI' | 'REDDEDILDI') => {
    try {
      const response = await fetch(`/api/documents/${params?.id}/reviews`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, comments: reviewComment }),
      });
      
      if (response.ok) {
        toast({ 
          title: 'Başarılı', 
          description: status === 'ONAYLANDI' ? 'İnceleme onaylandı' : 'İnceleme reddedildi' 
        });
        setMyReviewDialogOpen(false);
        setReviewComment('');
        fetchDocument();
        fetchReviews();
      } else {
        const data = await response.json();
        toast({ title: 'Hata', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Hata', description: 'Bir hata oluştu', variant: 'destructive' });
    }
  };

  const toggleReviewer = (userId: string) => {
    setSelectedReviewers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId) 
        : [...prev, userId]
    );
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    try {
      return format(new Date(date), 'dd MMM yyyy, HH:mm', { locale: tr });
    } catch {
      return '-';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Doküman bulunamadı</p>
      </div>
    );
  }

  const pendingApprover = getPendingApprover();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/dashboard/documents')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Geri
          </Button>
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{document?.title}</h1>
              <Badge className={statusColors?.[document?.status] || 'bg-gray-100 text-gray-800'}>
                {statusLabels?.[document?.status] || document?.status}
              </Badge>
              {/* Kilit durumu badge */}
              {document?.isLockedForEdit && (
                <Badge className="bg-red-100 text-red-800 flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Kilitli ({document?.lockedBy?.name})
                </Badge>
              )}
            </div>
            <p className="text-gray-500">Doküman Kodu: {document?.code}</p>
            {document?.status === 'ONAY_BEKLIYOR' && pendingApprover && (
              <p className="text-sm text-orange-600 mt-1 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" />
                Onay Bekleyen: <strong>{pendingApprover}</strong>
              </p>
            )}
            {/* Kilit detayı */}
            {document?.isLockedForEdit && (
              <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                <Lock className="w-4 h-4" />
                {document?.lockReason && `Sebep: ${document.lockReason} • `}
                Kilitleyen: {document?.lockedBy?.name} • {formatDate(document?.lockedAt)}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {/* Önizleme butonu */}
          {currentFileUrl && canPreview() && (
            <Button variant="outline" onClick={handleOpenPreview} disabled={previewLoading}>
              {previewLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Eye className="w-4 h-4 mr-2" />
              )}
              {previewLoading ? 'Yükleniyor...' : 'Önizle'}
            </Button>
          )}
          
          {/* İndirme butonu - Kontrollü Kopya filigranı ile */}
          {currentFileUrl && (
            <Button
              onClick={() => {
                // Kontrollü kopya API'si üzerinden indir (admin hariç filigran eklenir)
                const downloadUrl = `/api/documents/${document?.id}/download`;
                const a = window?.document?.createElement?.('a');
                if (a) {
                  a.href = downloadUrl;
                  a.download = currentFileName || 'document';
                  a?.click?.();
                }
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Download className="w-4 h-4 mr-2" />
              İndir
            </Button>
          )}

          {/* Check-in/Check-out butonları - Sadece Admin (Yönetici hariç) */}
          {((session?.user?.role as string)?.toLowerCase() === 'admin' || (session?.user as any)?.role?.name?.toLowerCase() === 'admin') && (
            <>
              {document?.isLockedForEdit ? (
                <Button 
                  variant="outline" 
                  onClick={handleUnlockDocument}
                  disabled={locking}
                  className="border-green-500 text-green-600 hover:bg-green-50"
                >
                  <Unlock className="w-4 h-4 mr-2" />
                  {locking ? 'İşleniyor...' : 'Kilidi Kaldır (Check-in)'}
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  onClick={() => setLockDialogOpen(true)}
                  className="border-orange-500 text-orange-600 hover:bg-orange-50"
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Kilitle (Check-out)
                </Button>
              )}
            </>
          )}

          {/* Düzenleme butonu - Kilitli ise ve kilitleyen başkası ise devre dışı */}
          <Button 
            variant="outline" 
            onClick={() => setEditDialogOpen(true)}
            disabled={document?.isLockedForEdit && document?.lockedBy?.id !== session?.user?.id}
            title={document?.isLockedForEdit && document?.lockedBy?.id !== session?.user?.id ? `Bu doküman ${document?.lockedBy?.name} tarafından kilitlenmiş` : ''}
          >
            <Edit className="w-4 h-4 mr-2" />
            Düzenle
          </Button>

          {/* Revizyon butonu - Kilitli ise ve kilitleyen başkası ise devre dışı */}
          <Button 
            variant="outline" 
            onClick={() => setRevisionDialogOpen(true)}
            disabled={document?.isLockedForEdit && document?.lockedBy?.id !== session?.user?.id}
            title={document?.isLockedForEdit && document?.lockedBy?.id !== session?.user?.id ? `Bu doküman ${document?.lockedBy?.name} tarafından kilitlenmiş` : ''}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Yeni Revizyon
          </Button>

          {/* Silme butonu - Kilitli ise ve kilitleyen başkası ise devre dışı */}
          <Button 
            variant="outline" 
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => setDeleteDialogOpen(true)}
            disabled={document?.isLockedForEdit && document?.lockedBy?.id !== session?.user?.id}
            title={document?.isLockedForEdit && document?.lockedBy?.id !== session?.user?.id ? `Bu doküman ${document?.lockedBy?.name} tarafından kilitlenmiş` : ''}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Sil
          </Button>

          {/* İptal butonu (Phase 2) - Kilitli ise ve kilitleyen başkası ise devre dışı */}
          {document?.status !== 'IPTAL_EDILDI' ? (
            <Button 
              variant="outline" 
              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-300"
              onClick={() => setCancelDialogOpen(true)}
              disabled={document?.isLockedForEdit && document?.lockedBy?.id !== session?.user?.id}
              title={document?.isLockedForEdit && document?.lockedBy?.id !== session?.user?.id ? `Bu doküman ${document?.lockedBy?.name} tarafından kilitlenmiş` : ''}
            >
              <Ban className="w-4 h-4 mr-2" />
              İptal Et
            </Button>
          ) : (
            <Button 
              variant="outline" 
              className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
              onClick={handleRevertCancel}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              İptali Geri Al
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info" className="w-full">
        <TabsList className="flex-wrap">
          <TabsTrigger value="info">Temel Bilgiler</TabsTrigger>
          <TabsTrigger value="workflow">Onay İş Akışı</TabsTrigger>
          <TabsTrigger value="versions">Versiyon Geçmişi</TabsTrigger>
          <TabsTrigger value="preReview" onClick={() => fetchReviews()}>İnceleme</TabsTrigger>
          <TabsTrigger value="approvals">Onaylar</TabsTrigger>
          <TabsTrigger value="readLogs">Okuma Logları</TabsTrigger>
          <TabsTrigger value="review">Revizyon Planı</TabsTrigger>
          <TabsTrigger value="acknowledgments" onClick={() => fetchAcknowledgments()}>Okundu Onayları</TabsTrigger>
          <TabsTrigger value="permissions">Erişim İzinleri</TabsTrigger>
          <TabsTrigger value="signatures">
            İmzalar {document?.signatures?.length ? `(${document.signatures.length})` : ''}
          </TabsTrigger>
        </TabsList>

        {/* Temel Bilgiler */}
        <TabsContent value="info" className="space-y-4">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Doküman Bilgileri</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Başlık</p>
                      <p className="font-medium">{document?.title}</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <FolderOpen className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Klasör</p>
                      <p className="font-medium">{document?.folder?.name ?? '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Building2 className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Departman</p>
                      <p className="font-medium">{document?.department?.name ?? '-'}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <User className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Oluşturan</p>
                      <p className="font-medium">
                        {document?.createdBy?.name} {document?.createdBy?.surname}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Oluşturma Tarihi</p>
                      <p className="font-medium">{formatDate(document?.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Güncel Versiyon</p>
                      <p className="font-medium">v{document?.currentVersion}</p>
                    </div>
                  </div>
                </div>
              </div>
              {document?.description && (
                <div className="mt-6 pt-6 border-t">
                  <p className="text-sm text-gray-500 mb-2">Açıklama</p>
                  <p className="text-gray-900">{document?.description}</p>
                </div>
              )}

              {/* Etiketler */}
              <div className="mt-6 pt-6 border-t">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Tag className="w-5 h-5 text-gray-400" />
                    <p className="text-sm text-gray-500">Etiketler</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={handleOpenTagDialog}>
                    <Edit className="w-3 h-3 mr-1" />
                    Düzenle
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {document?.tags && document.tags.length > 0 ? (
                    document.tags.map((t) => (
                      <Badge 
                        key={t.tag.id} 
                        style={{ backgroundColor: t.tag.color, color: '#fff' }}
                      >
                        {t.tag.name}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-gray-400 text-sm">Etiket eklenmemiş</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onay İş Akışı */}
        <TabsContent value="workflow">
          <DocumentWorkflow
            documentId={document?.id || ''}
            documentTitle={document?.title || ''}
            documentStatus={document?.status || ''}
            onStatusChange={fetchDocument}
          />
        </TabsContent>

        {/* Versiyon Geçmişi */}
        <TabsContent value="versions">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Versiyon Geçmişi</CardTitle>
              <CardDescription>Toplam {(document?.versions ?? [])?.length ?? 0} versiyon</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Versiyon</TableHead>
                    <TableHead>Dosya Adı</TableHead>
                    <TableHead>Boyut</TableHead>
                    <TableHead>Tarih</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(document?.versions ?? [])?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                        Versiyon bulunmuyor
                      </TableCell>
                    </TableRow>
                  ) : (
                    (document?.versions ?? [])?.map?.((version) => (
                      <TableRow key={version?.id}>
                        <TableCell className="font-medium">v{version?.versionNumber}</TableCell>
                        <TableCell>{version?.fileName}</TableCell>
                        <TableCell>{((version?.fileSize ?? 0) / 1024)?.toFixed?.(2) ?? 0} KB</TableCell>
                        <TableCell>{formatDate(version?.createdAt)}</TableCell>
                      </TableRow>
                    )) ?? null
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* İnceleme (Pre-approval Review - Phase 2) */}
        <TabsContent value="preReview">
          <Card className="shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5" />
                  İnceleme Aşaması
                </CardTitle>
                <CardDescription>
                  Doküman onaya gönderilmeden önce inceleme süreci
                </CardDescription>
              </div>
              {document?.status === 'TASLAK' && (
                <Button onClick={openReviewerDialog} disabled={loadingReviewers}>
                  <Users className="w-4 h-4 mr-2" />
                  {loadingReviewers ? 'Yükleniyor...' : 'İncelemeye Gönder'}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {/* İnceleme Durumu */}
              {document?.status === 'INCELEME_BEKLIYOR' && (
                <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-center gap-2 text-purple-800">
                    <Clock className="w-5 h-5" />
                    <span className="font-medium">İnceleme Bekliyor</span>
                  </div>
                  <p className="text-sm text-purple-600 mt-1">
                    Bu doküman şu anda inceleme aşamasında. Tüm inceleyicilerin onayı sonrası onay sürecine geçecek.
                  </p>
                </div>
              )}
              
              {document?.reviewStatus === 'REDDEDILDI' && document?.reviewNote && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 text-red-800">
                    <XCircle className="w-5 h-5" />
                    <span className="font-medium">İnceleme Reddedildi</span>
                  </div>
                  <p className="text-sm text-red-600 mt-1">{document.reviewNote}</p>
                </div>
              )}
              
              {document?.reviewStatus === 'ONAYLANDI' && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-800">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">İnceleme Tamamlandı</span>
                  </div>
                  {document.reviewedBy && document.reviewedAt && (
                    <p className="text-sm text-green-600 mt-1">
                      Son inceleme: {document.reviewedBy.name} {document.reviewedBy.surname || ''} - {formatDate(document.reviewedAt)}
                    </p>
                  )}
                </div>
              )}

              {/* İnceleme İstatistikleri */}
              {reviewStats.total > 0 && (
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-700">{reviewStats.total}</div>
                    <div className="text-xs text-gray-500">Toplam</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{reviewStats.approved}</div>
                    <div className="text-xs text-gray-500">Onaylanan</div>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">{reviewStats.pending}</div>
                    <div className="text-xs text-gray-500">Bekleyen</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{reviewStats.rejected}</div>
                    <div className="text-xs text-gray-500">Reddedilen</div>
                  </div>
                </div>
              )}

              {/* İnceleme Listesi */}
              {docReviews.length === 0 ? (
                <p className="text-center py-8 text-gray-500">
                  Henüz inceleme süreci başlatılmamış
                </p>
              ) : (
                <div className="space-y-3">
                  {docReviews.map((review) => {
                    const isMyReview = review.reviewerId === session?.user?.id;
                    const isPending = review.status === 'BEKLIYOR';
                    
                    return (
                      <div 
                        key={review.id}
                        className={`flex items-center justify-between p-4 border rounded-lg ${
                          isMyReview && isPending 
                            ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200' 
                            : isMyReview 
                              ? 'border-blue-300 bg-blue-50' 
                              : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {review.status === 'ONAYLANDI' ? (
                            <CheckCircle className="w-6 h-6 text-green-600" />
                          ) : review.status === 'REDDEDILDI' ? (
                            <XCircle className="w-6 h-6 text-red-600" />
                          ) : (
                            <Clock className="w-6 h-6 text-yellow-600" />
                          )}
                          <div>
                            <p className="font-medium">
                              {review.reviewer?.name} {review.reviewer?.surname || ''}
                              {isMyReview && (
                                <Badge className="ml-2 bg-blue-100 text-blue-800 text-xs">Siz</Badge>
                              )}
                            </p>
                            <p className="text-sm text-gray-500">{review.reviewer?.email}</p>
                            {review.comments && (
                              <p className="text-sm text-gray-600 mt-1 italic">"{review.comments}"</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-3">
                          <Badge className={
                            review.status === 'ONAYLANDI' ? 'bg-green-100 text-green-800' :
                            review.status === 'REDDEDILDI' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }>
                            {review.status === 'ONAYLANDI' ? 'Onaylandı' :
                             review.status === 'REDDEDILDI' ? 'Reddedildi' : 'Bekliyor'}
                          </Badge>
                          {review.reviewedAt && (
                            <p className="text-xs text-gray-500">{formatDate(review.reviewedAt)}</p>
                          )}
                          {/* Kullanıcının bekleyen incelemesi için inline butonlar */}
                          {isMyReview && isPending && document?.status === 'INCELEME_BEKLIYOR' && (
                            <div className="flex gap-2 ml-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="text-red-600 border-red-300 hover:bg-red-50"
                                onClick={() => setMyReviewDialogOpen(true)}
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                Reddet
                              </Button>
                              <Button 
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => handleMyReview('ONAYLANDI')}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Onayla
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Bekleyen İnceleyici İse Bilgi Kutusu */}
              {document?.status === 'INCELEME_BEKLIYOR' && 
               docReviews.some(r => r.reviewerId === session?.user?.id && r.status === 'BEKLIYOR') && (
                <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg text-center">
                  <p className="text-purple-800 font-medium">
                    Bu doküman sizin görüşünüzü bekliyor. Yukarıdaki listede kendi satırınızdaki butonları kullanarak onaylayabilir veya reddedebilirsiniz.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onaylar */}
        <TabsContent value="approvals">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Onay Süreçleri</CardTitle>
              <CardDescription>Doküman onay durumu</CardDescription>
            </CardHeader>
            <CardContent>
              {/* İş Akışı varsa iş akışı adımlarını göster */}
              {(document?.workflowInstances ?? [])?.length > 0 ? (
                <div className="space-y-6">
                  {(document?.workflowInstances ?? [])?.map?.((instance: any) => (
                    <div key={instance.id} className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <div>
                          <p className="font-medium text-blue-700">{instance.workflow?.name}</p>
                          <p className="text-sm text-gray-500">
                            Başlatan: {instance.startedBy?.name} {instance.startedBy?.surname} • 
                            {instance.startedAt && ` ${formatDate(instance.startedAt)}`}
                          </p>
                        </div>
                        <Badge variant={
                          instance.status === 'TAMAMLANDI' ? 'default' :
                          instance.status === 'REDDEDILDI' ? 'destructive' :
                          instance.status === 'AKTIF' ? 'secondary' : 'outline'
                        } className={
                          instance.status === 'TAMAMLANDI' ? 'bg-green-500' :
                          instance.status === 'AKTIF' ? 'bg-blue-500' : ''
                        }>
                          {instance.status === 'TAMAMLANDI' ? 'Tamamlandı' :
                           instance.status === 'REDDEDILDI' ? 'Reddedildi' :
                           instance.status === 'AKTIF' ? 'Devam Ediyor' : 'İptal Edildi'}
                        </Badge>
                      </div>
                      <div className="space-y-3 pl-4 border-l-2 border-gray-200">
                        {(instance.steps ?? [])?.map?.((stepInstance: any, idx: number) => (
                          <div 
                            key={stepInstance.id} 
                            className={`flex items-center justify-between p-3 rounded-lg ${
                              stepInstance.status === 'ONAYLANDI' ? 'bg-green-50' :
                              stepInstance.status === 'REDDEDILDI' ? 'bg-red-50' :
                              stepInstance.status === 'AKTIF' ? 'bg-yellow-50' :
                              stepInstance.status === 'ATLANDI' ? 'bg-gray-100' : 'bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                                stepInstance.status === 'ONAYLANDI' ? 'bg-green-500 text-white' :
                                stepInstance.status === 'REDDEDILDI' ? 'bg-red-500 text-white' :
                                stepInstance.status === 'AKTIF' ? 'bg-yellow-500 text-white' :
                                stepInstance.status === 'ATLANDI' ? 'bg-gray-400 text-white' : 'bg-gray-300 text-gray-600'
                              }`}>
                                {idx + 1}
                              </div>
                              <div>
                                <p className="font-medium">{stepInstance.step?.name}</p>
                                <p className="text-sm text-gray-500">
                                  {stepInstance.assignedUser 
                                    ? `${stepInstance.assignedUser.name} ${stepInstance.assignedUser.surname || ''}`
                                    : stepInstance.step?.position?.name || stepInstance.step?.role?.name || 'Atanmamış'
                                  }
                                </p>
                                {stepInstance.actionAt && (
                                  <p className="text-xs text-gray-400">
                                    {stepInstance.actionBy?.name} tarafından {formatDate(stepInstance.actionAt)}
                                  </p>
                                )}
                                {stepInstance.comments && (
                                  <p className="text-xs text-gray-500 mt-1 italic">"{stepInstance.comments}"</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {stepInstance.status === 'ONAYLANDI' && <CheckCircle className="w-5 h-5 text-green-600" />}
                              {stepInstance.status === 'REDDEDILDI' && <XCircle className="w-5 h-5 text-red-600" />}
                              {stepInstance.status === 'AKTIF' && <Clock className="w-5 h-5 text-yellow-600" />}
                              {stepInstance.status === 'ATLANDI' && <span className="text-xs text-gray-500">Atlandı</span>}
                              {stepInstance.status === 'BEKLIYOR' && <span className="text-xs text-gray-400">Bekliyor</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (document?.approvals ?? [])?.length > 0 ? (
                /* Eski onay sistemi */
                <div className="space-y-4">
                  {(document?.approvals ?? [])?.map?.((approval) => (
                    <div
                      key={approval?.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center space-x-4">
                        {approval?.status === 'ONAYLANDI' ? (
                          <CheckCircle className="w-6 h-6 text-green-600" />
                        ) : approval?.status === 'REDDEDILDI' ? (
                          <XCircle className="w-6 h-6 text-red-600" />
                        ) : (
                          <Clock className="w-6 h-6 text-yellow-600" />
                        )}
                        <div>
                          <p className="font-medium">
                            {approval?.approver?.name} {approval?.approver?.surname}
                          </p>
                          <p className="text-sm text-gray-500">
                            {approval?.status === 'BEKLIYOR'
                              ? 'Onay bekliyor'
                              : approval?.status === 'ONAYLANDI'
                              ? 'Onaylandı'
                              : 'Reddedildi'}
                          </p>
                        </div>
                      </div>
                      {approval?.status === 'BEKLIYOR' && (
                        <div className="space-x-2">
                          <Button
                            size="sm"
                            onClick={() => handleApprove('ONAYLANDI')}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Onayla
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleApprove('REDDEDILDI')}
                            variant="outline"
                            className="text-red-600 hover:text-red-700"
                          >
                            Reddet
                          </Button>
                        </div>
                      )}
                    </div>
                  )) ?? null}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">Onay süreci tanımlanmamış</p>
                  <p className="text-sm text-gray-400">
                    Dokümanı onay sürecine göndermek için "Onay İş Akışı" sekmesini kullanabilirsiniz.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Okuma Logları */}
        <TabsContent value="readLogs">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Okuma Logları</CardTitle>
              <CardDescription>Dokümanı okuyan kullanıcılar</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kullanıcı</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Okuma Tarihi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(document?.readLogs ?? [])?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                        Henüz okuma logu bulunmuyor
                      </TableCell>
                    </TableRow>
                  ) : (
                    (document?.readLogs ?? [])?.map?.((log) => (
                      <TableRow key={log?.id}>
                        <TableCell className="font-medium">
                          {log?.user?.name} {log?.user?.surname}
                        </TableCell>
                        <TableCell>{log?.user?.email}</TableCell>
                        <TableCell>{formatDate(log?.readAt)}</TableCell>
                      </TableRow>
                    )) ?? null
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Revizyon Planı */}
        <TabsContent value="review">
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarClock className="w-5 h-5" />
                    Planlı Revizyon
                  </CardTitle>
                  <CardDescription>Periyodik gözden geçirme ayarları</CardDescription>
                </div>
                <Button onClick={() => {
                  setReviewFrequency(document?.reviewFrequencyMonths?.toString() || '');
                  setNextReviewDate(document?.nextReviewDate ? new Date(document.nextReviewDate).toISOString().split('T')[0] : '');
                  setReviewReminder(document?.reviewReminder ?? true);
                  setReviewDialogOpen(true);
                }}>
                  <Edit className="w-4 h-4 mr-2" />
                  Düzenle
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-gray-500">Revizyon Periyodu</Label>
                  <p className="font-medium">
                    {document?.reviewFrequencyMonths 
                      ? `${document.reviewFrequencyMonths} Ay` 
                      : 'Belirlenmemiş'}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-500">Sonraki Revizyon Tarihi</Label>
                  <p className="font-medium flex items-center gap-2">
                    {document?.nextReviewDate ? (
                      <>
                        {formatDate(document.nextReviewDate)}
                        {new Date(document.nextReviewDate) < new Date() && (
                          <Badge variant="destructive">Gecikmiş</Badge>
                        )}
                      </>
                    ) : (
                      'Belirlenmemiş'
                    )}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-500">Son Revizyon Tarihi</Label>
                  <p className="font-medium">
                    {document?.lastReviewDate 
                      ? formatDate(document.lastReviewDate) 
                      : 'Henüz revizyon yapılmadı'}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-500">Hatırlatma</Label>
                  <p className="font-medium flex items-center gap-2">
                    {document?.reviewReminder ? (
                      <><Bell className="w-4 h-4 text-green-600" /> Aktif</>
                    ) : (
                      <><Bell className="w-4 h-4 text-gray-400" /> Kapalı</>
                    )}
                  </p>
                </div>
              </div>

              {document?.nextReviewDate && (
                <div className="pt-4 border-t">
                  <Button onClick={handleCompleteReview} className="bg-green-600 hover:bg-green-700">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Revizyonu Tamamlandı Olarak İşaretle
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Okundu Onayları */}
        <TabsContent value="acknowledgments">
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <BookCheck className="w-5 h-5" />
                    Okundu Onayları
                  </CardTitle>
                  <CardDescription>Dokümanı okuduğunu onaylayan kullanıcılar</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setMyAckDialogOpen(true)}>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Okudum Onayı Ver
                  </Button>
                  <Button onClick={() => setAcknowledgmentDialogOpen(true)}>
                    <Users className="w-4 h-4 mr-2" />
                    Onay İste
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* İstatistikler */}
              {document?.requiresAcknowledgment && (
                <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{ackStats.total}</p>
                    <p className="text-sm text-gray-500">Toplam</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{ackStats.approved}</p>
                    <p className="text-sm text-gray-500">Onayladı</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-yellow-600">{ackStats.pending}</p>
                    <p className="text-sm text-gray-500">Bekliyor</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">{ackStats.rejected}</p>
                    <p className="text-sm text-gray-500">Reddetti</p>
                  </div>
                </div>
              )}

              {/* Son tarih */}
              {document?.acknowledgmentDeadline && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm">
                    <strong>Son Tarih:</strong> {formatDate(document.acknowledgmentDeadline)}
                    {new Date(document.acknowledgmentDeadline) < new Date() && (
                      <Badge variant="destructive" className="ml-2">Süresi Doldu</Badge>
                    )}
                  </p>
                </div>
              )}

              {/* Onay listesi */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kullanıcı</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Versiyon</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Tarih</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {acknowledgments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        Henüz okundu onayı bulunmuyor
                      </TableCell>
                    </TableRow>
                  ) : (
                    acknowledgments.map((ack) => (
                      <TableRow key={ack.id}>
                        <TableCell className="font-medium">
                          {ack.user?.name} {ack.user?.surname}
                        </TableCell>
                        <TableCell>{ack.user?.email}</TableCell>
                        <TableCell>v{ack.versionNumber}</TableCell>
                        <TableCell>
                          <Badge className={
                            ack.status === 'ONAYLANDI' ? 'bg-green-100 text-green-800' :
                            ack.status === 'REDDEDILDI' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }>
                            {ack.status === 'ONAYLANDI' ? 'Onayladı' :
                             ack.status === 'REDDEDILDI' ? 'Reddetti' : 'Bekliyor'}
                          </Badge>
                        </TableCell>
                        <TableCell>{ack.acknowledgedAt ? formatDate(ack.acknowledgedAt) : '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* Bekleyen kullanıcılar */}
              {pendingUsers.length > 0 && (
                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-2">Henüz Onaylamayan Kullanıcılar ({pendingUsers.length})</h4>
                  <div className="flex flex-wrap gap-2">
                    {pendingUsers.map(u => (
                      <Badge key={u.id} variant="outline">{u.name} {u.surname}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Erişim İzinleri */}
        <TabsContent value="permissions">
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-indigo-600" />
                    Erişim İzinleri
                  </CardTitle>
                  <CardDescription>Bu doküman için kullanıcı, grup ve departman bazlı erişim izinlerini yönetin</CardDescription>
                </div>
                <Button onClick={() => setPermissionDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" /> İzin Ekle
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {permissions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Shield className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>Henüz özel izin tanımlanmamış</p>
                  <p className="text-sm">Varsayılan olarak aynı departmandaki kullanıcılar görüntüleyebilir</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hedef</TableHead>
                      <TableHead className="text-center">Görüntüle</TableHead>
                      <TableHead className="text-center">İndir</TableHead>
                      <TableHead className="text-center">Düzenle</TableHead>
                      <TableHead className="text-center">Sil</TableHead>
                      <TableHead className="text-center">Onayla</TableHead>
                      <TableHead className="text-center">Paylaş</TableHead>
                      <TableHead>Geçerlilik</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {permissions.map((perm) => (
                      <TableRow key={perm.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {perm.user && (
                              <>
                                <User className="w-4 h-4 text-blue-500" />
                                <div>
                                  <div className="font-medium">{perm.user.name}</div>
                                  <div className="text-xs text-gray-500">{perm.user.email}</div>
                                </div>
                              </>
                            )}
                            {perm.group && (
                              <>
                                <Users className="w-4 h-4 text-green-500" />
                                <span>{perm.group.name}</span>
                              </>
                            )}
                            {perm.department && (
                              <>
                                <Building2 className="w-4 h-4 text-purple-500" />
                                <span>{perm.department.name}</span>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox 
                            checked={perm.canView} 
                            onCheckedChange={(checked) => handleUpdatePermission(perm.id, { canView: !!checked })}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox 
                            checked={perm.canDownload} 
                            onCheckedChange={(checked) => handleUpdatePermission(perm.id, { canDownload: !!checked })}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox 
                            checked={perm.canEdit} 
                            onCheckedChange={(checked) => handleUpdatePermission(perm.id, { canEdit: !!checked })}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox 
                            checked={perm.canDelete} 
                            onCheckedChange={(checked) => handleUpdatePermission(perm.id, { canDelete: !!checked })}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox 
                            checked={perm.canApprove} 
                            onCheckedChange={(checked) => handleUpdatePermission(perm.id, { canApprove: !!checked })}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox 
                            checked={perm.canShare} 
                            onCheckedChange={(checked) => handleUpdatePermission(perm.id, { canShare: !!checked })}
                          />
                        </TableCell>
                        <TableCell>
                          {perm.expiresAt ? (
                            <Badge variant="outline">
                              {format(new Date(perm.expiresAt), 'dd MMM yyyy', { locale: tr })}
                            </Badge>
                          ) : (
                            <span className="text-gray-400 text-sm">Süresiz</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDeletePermission(perm.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dijital İmzalar */}
        <TabsContent value="signatures" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-gray-700">Dijital İmzalar</h3>
            {!document?.signatures?.find((s) => s.signedById === session?.user?.id) && (
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => setShowSignOverlay(true)}
              >
                <PenLine className="w-4 h-4 mr-2" /> Belgeyi İmzala
              </Button>
            )}
          </div>
          {!document?.signatures?.length ? (
            <div className="text-center py-8 text-gray-400">Henüz imza yok.</div>
          ) : (
            <div className="space-y-3">
              {document.signatures.map((sig) => (
                <div key={sig.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-5 h-5 text-green-500" />
                    <div>
                      <p className="font-medium text-sm">{sig.signedBy.name}</p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(sig.signedAt), 'dd.MM.yyyy HH:mm', { locale: tr })}
                        {' · '}{sig.purpose}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const encoded = sig.signatureImagePath
                        .split('/')
                        .map((s: string) => encodeURIComponent(s))
                        .join('/');
                      window.open(`/api/files/${encoded}?dl=1`, '_blank');
                    }}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {showSignOverlay && (
            <SignatureOverlay
              title="Belgeyi İmzala"
              summary={
                <div className="space-y-2 text-sm">
                  <p><span className="font-semibold">Belge:</span> {document?.title}</p>
                  <hr className="my-2" />
                  <p className="text-xs text-gray-500">Bu belgeyi okuduğumu ve onayladığımı beyan ederim.</p>
                </div>
              }
              onSave={handleDocSign}
              onClose={() => setShowSignOverlay(false)}
              loading={signingDoc}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* İzin Ekleme Dialog */}
      <Dialog open={permissionDialogOpen} onOpenChange={setPermissionDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Yeni Erişim İzni Ekle</DialogTitle>
            <DialogDescription>Doküman için kullanıcı, grup veya departman bazlı izin tanımlayın</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Hedef Türü</Label>
              <Select 
                value={newPermission.targetType} 
                onValueChange={(value) => setNewPermission({ ...newPermission, targetType: value, targetId: '' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">
                    <div className="flex items-center gap-2"><User className="w-4 h-4" /> Kullanıcı</div>
                  </SelectItem>
                  <SelectItem value="group">
                    <div className="flex items-center gap-2"><Users className="w-4 h-4" /> Grup</div>
                  </SelectItem>
                  <SelectItem value="department">
                    <div className="flex items-center gap-2"><Building2 className="w-4 h-4" /> Departman</div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>
                {newPermission.targetType === 'user' && 'Kullanıcı Seç'}
                {newPermission.targetType === 'group' && 'Grup Seç'}
                {newPermission.targetType === 'department' && 'Departman Seç'}
              </Label>
              <Select 
                value={newPermission.targetId} 
                onValueChange={(value) => setNewPermission({ ...newPermission, targetId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seçiniz..." />
                </SelectTrigger>
                <SelectContent>
                  {newPermission.targetType === 'user' && allUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>{user.name} ({user.email})</SelectItem>
                  ))}
                  {newPermission.targetType === 'group' && groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                  ))}
                  {newPermission.targetType === 'department' && departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>İzinler</Label>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 cursor-pointer col-span-2 pb-2 border-b mb-1">
                  <Checkbox 
                    checked={newPermission.canView && newPermission.canDownload && newPermission.canEdit && newPermission.canDelete && newPermission.canApprove && newPermission.canShare}
                    onCheckedChange={(checked) => setNewPermission({ 
                      ...newPermission, 
                      canView: !!checked,
                      canDownload: !!checked,
                      canEdit: !!checked,
                      canDelete: !!checked,
                      canApprove: !!checked,
                      canShare: !!checked
                    })}
                  />
                  <span className="text-sm font-medium">Hepsi</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox 
                    checked={newPermission.canView}
                    onCheckedChange={(checked) => setNewPermission({ ...newPermission, canView: !!checked })}
                  />
                  <span className="text-sm">Görüntüle</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox 
                    checked={newPermission.canDownload}
                    onCheckedChange={(checked) => setNewPermission({ ...newPermission, canDownload: !!checked })}
                  />
                  <span className="text-sm">İndir</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox 
                    checked={newPermission.canEdit}
                    onCheckedChange={(checked) => setNewPermission({ ...newPermission, canEdit: !!checked })}
                  />
                  <span className="text-sm">Düzenle</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox 
                    checked={newPermission.canDelete}
                    onCheckedChange={(checked) => setNewPermission({ ...newPermission, canDelete: !!checked })}
                  />
                  <span className="text-sm">Sil</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox 
                    checked={newPermission.canApprove}
                    onCheckedChange={(checked) => setNewPermission({ ...newPermission, canApprove: !!checked })}
                  />
                  <span className="text-sm">Onayla</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox 
                    checked={newPermission.canShare}
                    onCheckedChange={(checked) => setNewPermission({ ...newPermission, canShare: !!checked })}
                  />
                  <span className="text-sm">Paylaş</span>
                </label>
              </div>
            </div>

            <div>
              <Label>Geçerlilik Tarihi (Opsiyonel)</Label>
              <Input 
                type="date"
                value={newPermission.expiresAt}
                onChange={(e) => setNewPermission({ ...newPermission, expiresAt: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">Boş bırakılırsa süresiz olur</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPermissionDialogOpen(false)}>İptal</Button>
            <Button onClick={handleAddPermission} disabled={savingPermission}>
              {savingPermission ? 'Kaydediliyor...' : 'İzin Ekle'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Gelişmiş Önizleme Dialog */}
      <FilePreview
        open={previewOpen}
        onClose={handleClosePreview}
        fileUrl={previewFileUrl || currentFileUrl || ''}
        fileName={currentFileName || 'document'}
        fileType={currentFileType || ''}
        documentId={document?.id}
        onSave={isTextFile() && !document?.isLockedForEdit ? handleSaveTextFile : undefined}
        readOnly={document?.isLockedForEdit && document?.lockedBy?.id !== document?.createdBy?.id}
      />

      {/* Düzenleme Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Doküman Düzenle</DialogTitle>
            <DialogDescription>Doküman bilgilerini güncelleyebilirsiniz.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Başlık</Label>
              <Input
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              />
            </div>
            <div>
              <Label>Açıklama</Label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={3}
              />
            </div>
            <div>
              <Label>Durum</Label>
              <Select
                value={editForm.status}
                onValueChange={(value) => setEditForm({ ...editForm, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Departman</Label>
              <Select
                value={editForm.departmentId}
                onValueChange={(value) => setEditForm({ ...editForm, departmentId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Departman seçin" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Klasör</Label>
              <Select
                value={editForm.folderId}
                onValueChange={(value) => setEditForm({ ...editForm, folderId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Klasör seçin" />
                </SelectTrigger>
                <SelectContent>
                  {folders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>{folder.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Doküman Tipi</Label>
              <Select
                value={editForm.documentTypeId}
                onValueChange={(value) => setEditForm({ ...editForm, documentTypeId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tip seçin" />
                </SelectTrigger>
                <SelectContent>
                  {documentTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>İptal</Button>
            <Button onClick={handleEdit} disabled={saving}>
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revizyon Dialog */}
      <Dialog open={revisionDialogOpen} onOpenChange={setRevisionDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Yeni Revizyon Yükle</DialogTitle>
            <DialogDescription>
              Dokümanın yeni bir versiyonunu yükleyin. Mevcut versiyon: v{document?.currentVersion}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Dosya *</Label>
              <Input
                type="file"
                onChange={(e) => setRevisionFile(e.target.files?.[0] || null)}
              />
              {revisionFile && (
                <p className="text-sm text-gray-500 mt-1">
                  Seçilen: {revisionFile.name} ({(revisionFile.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>
            <div>
              <Label>Revizyon Notları</Label>
              <Textarea
                value={revisionNotes}
                onChange={(e) => setRevisionNotes(e.target.value)}
                placeholder="Bu revizyon hakkında notlar..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setRevisionDialogOpen(false);
              setRevisionFile(null);
              setRevisionNotes('');
            }}>İptal</Button>
            <Button onClick={handleRevision} disabled={uploading || !revisionFile}>
              {uploading ? 'Yükleniyor...' : 'Yükle'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Silme Onay Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dokümanı Silmek İstediğinize Emin Misiniz?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu işlem geri alınamaz. &quot;{document?.title}&quot; dokümanı ve tüm versiyonları kalıcı olarak silinecektir.
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

      {/* Kilit (Check-out) Dialog */}
      <Dialog open={lockDialogOpen} onOpenChange={(open) => {
        setLockDialogOpen(open);
        if (!open) {
          setLockPassword('');
          setLockReason('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Dokümanı Kilitle (Check-out)
            </DialogTitle>
            <DialogDescription>
              Dokümanı düzenleme için kilitlediğinizde, diğer kullanıcılar bu dokümanı düzenleyemez.
              İşlemi onaylamak için şifrenizi girmeniz gerekmektedir.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Şifreniz *</Label>
              <Input
                type="password"
                value={lockPassword}
                onChange={(e) => setLockPassword(e.target.value)}
                placeholder="Şifrenizi girin"
              />
            </div>
            <div>
              <Label>Kilitleme Sebebi (Opsiyonel)</Label>
              <Textarea
                value={lockReason}
                onChange={(e) => setLockReason(e.target.value)}
                placeholder="Örn: Yıllık revizyon için düzenleme yapılacak"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLockDialogOpen(false)}>İptal</Button>
            <Button onClick={handleLockDocument} disabled={locking || !lockPassword} className="bg-orange-600 hover:bg-orange-700">
              {locking ? 'Kilitleniyor...' : 'Kilitle'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revizyon Planı Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="w-5 h-5" />
              Planlı Revizyon Ayarları
            </DialogTitle>
            <DialogDescription>
              Dokümanın periyodik olarak gözden geçirilmesi için plan oluşturun.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Revizyon Periyodu (Ay)</Label>
              <Select value={reviewFrequency} onValueChange={setReviewFrequency}>
                <SelectTrigger>
                  <SelectValue placeholder="Seçin..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 Ay</SelectItem>
                  <SelectItem value="6">6 Ay</SelectItem>
                  <SelectItem value="12">12 Ay (Yıllık)</SelectItem>
                  <SelectItem value="24">24 Ay</SelectItem>
                  <SelectItem value="36">36 Ay</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Sonraki Revizyon Tarihi</Label>
              <Input
                type="date"
                value={nextReviewDate}
                onChange={(e) => setNextReviewDate(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="reviewReminder"
                checked={reviewReminder}
                onChange={(e) => setReviewReminder(e.target.checked)}
                className="w-4 h-4"
              />
              <Label htmlFor="reviewReminder">Hatırlatma bildirimi gönder</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>İptal</Button>
            <Button onClick={handleSaveReviewSchedule}>Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Okundu Onayı İsteme Dialog */}
      <Dialog open={acknowledgmentDialogOpen} onOpenChange={setAcknowledgmentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Okundu Onayı İste
            </DialogTitle>
            <DialogDescription>
              Departmandaki tüm kullanıcılardan bu dokümanı okuduklarını onaylamalarını isteyin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Hedef Departman:</strong> {document?.department?.name || 'Tüm kullanıcılar'}
              </p>
              <p className="text-sm text-blue-600 mt-1">
                Bu departmandaki tüm aktif kullanıcılara okundu onayı talebi gönderilecek.
              </p>
            </div>
            <div>
              <Label>Son Tarih (Opsiyonel)</Label>
              <Input
                type="date"
                value={ackDeadline}
                onChange={(e) => setAckDeadline(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAcknowledgmentDialogOpen(false)}>İptal</Button>
            <Button onClick={handleSetupAcknowledgment}>Onay İste</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Kendi Okundu Onayı Dialog */}
      <Dialog open={myAckDialogOpen} onOpenChange={setMyAckDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookCheck className="w-5 h-5" />
              Okudum Onayı Ver
            </DialogTitle>
            <DialogDescription>
              Bu dokümanı (v{document?.currentVersion}) okuduğunuzu onaylayın.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Yorum (Opsiyonel)</Label>
              <Textarea
                value={ackComment}
                onChange={(e) => setAckComment(e.target.value)}
                placeholder="Varsa yorumunuzu yazın..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setMyAckDialogOpen(false)}>İptal</Button>
            <Button 
              variant="destructive" 
              onClick={() => handleMyAcknowledgment('REDDEDILDI')}
            >
              Reddet
            </Button>
            <Button 
              onClick={() => handleMyAcknowledgment('ONAYLANDI')}
              className="bg-green-600 hover:bg-green-700"
            >
              Okudum, Onaylıyorum
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== PHASE 2 DIALOGLAR ===== */}
      
      {/* Doküman İptal Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Ban className="w-5 h-5" />
              Dokümanı İptal Et
            </DialogTitle>
            <DialogDescription>
              Bu işlem dokümanı iptal edecektir. İptal edilen dokümanlar artık kullanılamaz.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">
                <strong>Dikkat:</strong> Doküman "{document?.title}" iptal edilecektir.
              </p>
            </div>
            <div>
              <Label>İptal Nedeni <span className="text-red-500">*</span></Label>
              <Textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="İptal nedenini açıklayın..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>Vazgeç</Button>
            <Button 
              variant="destructive" 
              onClick={handleCancelDocument}
              disabled={cancelling}
            >
              {cancelling ? 'İptal Ediliyor...' : 'Dokümanı İptal Et'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* İncelemeye Gönder Dialog */}
      <Dialog open={preApprovalReviewDialogOpen} onOpenChange={setPreApprovalReviewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5" />
              İncelemeye Gönder
            </DialogTitle>
            <DialogDescription>
              Bu dokümanı onay öncesi inceleyecek kişileri seçin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-96 overflow-y-auto">
            <p className="text-sm text-gray-500">
              İnceleyiciler, dokümanı onaya göndermeden önce kontrol edeceklerdir.
            </p>
            <div className="space-y-2">
              {reviewerUsers.map((user) => (
                <label 
                  key={user.id}
                  className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedReviewers.includes(user.id)}
                    onChange={() => toggleReviewer(user.id)}
                    className="w-4 h-4"
                  />
                  <div className="flex-1">
                    <p className="font-medium">{user.name} {user.surname || ''}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                    {user.department?.name && (
                      <p className="text-xs text-gray-400">{user.department.name}</p>
                    )}
                  </div>
                  {selectedReviewers.includes(user.id) && (
                    <UserCheck className="w-5 h-5 text-green-600" />
                  )}
                </label>
              ))}
            </div>
            {selectedReviewers.length > 0 && (
              <p className="text-sm text-blue-600">
                {selectedReviewers.length} kişi seçildi
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreApprovalReviewDialogOpen(false)}>İptal</Button>
            <Button onClick={handleSendForReview} disabled={selectedReviewers.length === 0}>
              İncelemeye Gönder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* İnceleme Onayı/Ret Dialog */}
      <Dialog open={myReviewDialogOpen} onOpenChange={setMyReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5" />
              İnceleme Sonucu
            </DialogTitle>
            <DialogDescription>
              Bu dokümanın incelemesini tamamlayın.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Yorum (Opsiyonel)</Label>
              <Textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="İnceleme notlarınızı yazın..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setMyReviewDialogOpen(false)}>İptal</Button>
            <Button 
              variant="destructive" 
              onClick={() => handleMyReview('REDDEDILDI')}
            >
              Reddet
            </Button>
            <Button 
              onClick={() => handleMyReview('ONAYLANDI')}
              className="bg-green-600 hover:bg-green-700"
            >
              Onayla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Etiket Düzenleme Dialog */}
      <Dialog open={tagDialogOpen} onOpenChange={setTagDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5" />
              Etiketleri Düzenle
            </DialogTitle>
            <DialogDescription>
              Doküman için etiketleri seçin veya kaldırın.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto p-2 border rounded-lg">
              {allTags.length > 0 ? (
                allTags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTagSelection(tag.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
                      selectedTagIds.includes(tag.id)
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: tag.color }}
                    ></span>
                    <span className="text-sm">{tag.name}</span>
                    {selectedTagIds.includes(tag.id) && (
                      <CheckCircle className="w-4 h-4 text-blue-600" />
                    )}
                  </button>
                ))
              ) : (
                <span className="text-gray-500 text-sm p-2">
                  Henüz etiket oluşturulmamış. Doküman listesinden etiket oluşturabilirsiniz.
                </span>
              )}
            </div>
            {selectedTagIds.length > 0 && (
              <p className="text-sm text-blue-600 mt-2">
                {selectedTagIds.length} etiket seçildi
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTagDialogOpen(false)}>
              İptal
            </Button>
            <Button onClick={handleSaveTags} disabled={savingTags}>
              {savingTags ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
