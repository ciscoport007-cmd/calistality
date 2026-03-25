'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Plus, FolderOpen, FolderPlus, ChevronRight, ChevronDown, 
  Edit, Trash2, MoreVertical, ArrowLeft, FileText, Upload, X, CheckCircle, AlertCircle,
  Home, File, Eye, Download, Folder, Shield
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import Link from 'next/link';
import { FolderPermissionsDialog } from '@/components/documents/folder-permissions-dialog';

interface Folder {
  id: string;
  name: string;
  code: string;
  description: string | null;
  parentId: string | null;
  departmentId: string | null;
  documentTypeId: string | null;
  codeTemplate: string | null;
  isActive: boolean;
  department: any;
  documentType: any;
  parent: any;
  _count: {
    documents: number;
    children: number;
  };
  children?: Folder[];
}

interface Document {
  id: string;
  code: string;
  title: string;
  status: string;
  currentVersion: number;
  createdAt: string;
  documentType?: { name: string };
  department?: { name: string };
  versions?: { fileName: string; fileType: string; cloudStoragePath: string }[];
}

export default function FoldersPage() {
  const { toast } = useToast();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [documentTypes, setDocumentTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  
  // Explorer mode - klasör gezgini
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [currentFolder, setCurrentFolder] = useState<Folder | null>(null);
  const [folderPath, setFolderPath] = useState<{ id: string | null; name: string }[]>([{ id: null, name: 'Ana Dizin' }]);
  const [folderDocuments, setFolderDocuments] = useState<Document[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    parentId: '',
    departmentId: '',
    documentTypeId: '',
    codeTemplate: '',
  });
  
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);
  const [parentFolderForNew, setParentFolderForNew] = useState<Folder | null>(null);
  
  // Yetki ayarları dialog'u
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [permissionsFolder, setPermissionsFolder] = useState<Folder | null>(null);

  // Toplu yükleme state'leri
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadTargetFolder, setUploadTargetFolder] = useState<Folder | null>(null);
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResults, setUploadResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  // Klasör değiştiğinde dosyaları yükle
  const fetchFolderDocuments = useCallback(async (folderId: string | null) => {
    setLoadingDocuments(true);
    try {
      const url = folderId 
        ? `/api/documents?folderId=${folderId}`
        : '/api/documents?folderId=null';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setFolderDocuments(Array.isArray(data.documents) ? data.documents : []);
      }
    } catch (error) {
      console.error('Documents fetch error:', error);
    } finally {
      setLoadingDocuments(false);
    }
  }, []);

  useEffect(() => {
    fetchFolderDocuments(currentFolderId);
  }, [currentFolderId, fetchFolderDocuments]);

  // Klasöre gir
  const navigateToFolder = (folder: Folder | null) => {
    if (folder) {
      setCurrentFolderId(folder.id);
      setCurrentFolder(folder);
      setFolderPath(prev => [...prev, { id: folder.id, name: folder.name }]);
    } else {
      setCurrentFolderId(null);
      setCurrentFolder(null);
      setFolderPath([{ id: null, name: 'Ana Dizin' }]);
    }
  };

  // Breadcrumb'dan klasöre git
  const navigateToPathFolder = (index: number) => {
    const targetPath = folderPath[index];
    setCurrentFolderId(targetPath.id);
    
    if (targetPath.id) {
      const folder = folders.find(f => f.id === targetPath.id);
      setCurrentFolder(folder || null);
    } else {
      setCurrentFolder(null);
    }
    
    // Yolu kırp
    setFolderPath(prev => prev.slice(0, index + 1));
  };

  // Mevcut klasörün alt klasörlerini getir
  const getCurrentSubfolders = (): Folder[] => {
    if (currentFolderId === null) {
      return folders.filter(f => !f.parentId);
    }
    return folders.filter(f => f.parentId === currentFolderId);
  };

  const fetchData = async () => {
    try {
      const [foldersRes, deptsRes, typesRes] = await Promise.all([
        fetch('/api/folders'),
        fetch('/api/departments'),
        fetch('/api/document-types'),
      ]);

      if (foldersRes?.ok) {
        const data = await foldersRes?.json?.();
        setFolders(data?.folders ?? []);
      }
      if (deptsRes?.ok) {
        const data = await deptsRes?.json?.();
        setDepartments(data?.departments ?? []);
      }
      if (typesRes?.ok) {
        const data = await typesRes?.json?.();
        setDocumentTypes(data?.documentTypes ?? []);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Klasörleri hiyerarşik yapıya dönüştür
  const buildHierarchy = (folders: Folder[]): Folder[] => {
    const folderMap = new Map<string, Folder>();
    const rootFolders: Folder[] = [];

    // Önce tüm klasörleri map'e ekle
    folders.forEach(folder => {
      folderMap.set(folder.id, { ...folder, children: [] });
    });

    // Hiyerarşik yapıyı oluştur
    folders.forEach(folder => {
      const currentFolder = folderMap.get(folder.id)!;
      if (folder.parentId && folderMap.has(folder.parentId)) {
        const parent = folderMap.get(folder.parentId)!;
        parent.children = parent.children || [];
        parent.children.push(currentFolder);
      } else {
        rootFolders.push(currentFolder);
      }
    });

    return rootFolders;
  };

  const toggleExpand = (folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  const openAddDialog = (parentFolder?: Folder) => {
    setParentFolderForNew(parentFolder || null);
    setFormData({
      name: '',
      code: '',
      description: '',
      parentId: parentFolder?.id || '',
      departmentId: parentFolder?.departmentId || '',
      documentTypeId: parentFolder?.documentTypeId || '',
      codeTemplate: '',
    });
    setDialogOpen(true);
  };

  const openEditDialog = (folder: Folder) => {
    setEditingFolder(folder);
    setFormData({
      name: folder.name,
      code: folder.code,
      description: folder.description || '',
      parentId: folder.parentId || '',
      departmentId: folder.departmentId || '',
      documentTypeId: folder.documentTypeId || '',
      codeTemplate: folder.codeTemplate || '',
    });
    setEditDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.code) {
      toast({ title: 'Hata', description: 'Klasör adı ve kodu zorunludur', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          code: formData.code,
          description: formData.description || null,
          parentId: formData.parentId || null,
          departmentId: formData.departmentId || null,
          documentTypeId: formData.documentTypeId || null,
          codeTemplate: formData.codeTemplate || null,
        }),
      });

      if (response?.ok) {
        toast({ title: 'Başarılı', description: 'Klasör oluşturuldu' });
        setDialogOpen(false);
        setParentFolderForNew(null);
        resetForm();
        fetchData();
        // Yeni klasörün parent'ını aç
        if (formData.parentId) {
          setExpandedFolders(prev => new Set([...prev, formData.parentId]));
        }
      } else {
        const data = await response?.json?.();
        toast({ title: 'Hata', description: data?.error || 'Klasör oluşturulamadı', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Hata', description: 'Bir hata oluştu', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editingFolder) return;
    
    setSaving(true);
    try {
      const response = await fetch(`/api/folders/${editingFolder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          code: formData.code,
          description: formData.description || null,
          parentId: formData.parentId || null,
          departmentId: formData.departmentId || null,
          documentTypeId: formData.documentTypeId || null,
          codeTemplate: formData.codeTemplate || null,
        }),
      });

      if (response?.ok) {
        toast({ title: 'Başarılı', description: 'Klasör güncellendi' });
        setEditDialogOpen(false);
        setEditingFolder(null);
        resetForm();
        fetchData();
      } else {
        const data = await response?.json?.();
        toast({ title: 'Hata', description: data?.error || 'Klasör güncellenemedi', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Hata', description: 'Bir hata oluştu', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!folderToDelete) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/folders/${folderToDelete.id}`, {
        method: 'DELETE',
      });

      if (response?.ok) {
        toast({ title: 'Başarılı', description: 'Klasör silindi' });
        setDeleteDialogOpen(false);
        setFolderToDelete(null);
        fetchData();
      } else {
        const data = await response?.json?.();
        toast({ title: 'Hata', description: data?.error || 'Klasör silinemedi', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Hata', description: 'Bir hata oluştu', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      parentId: '',
      departmentId: '',
      documentTypeId: '',
      codeTemplate: '',
    });
  };

  // Sürükle-bırak işleyicileri
  const handleDragOver = useCallback((e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(folderId);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, folder: Folder) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(null);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      setUploadTargetFolder(folder);
      setFilesToUpload(files);
      setUploadDialogOpen(true);
    }
  }, []);

  const openUploadDialog = (folder: Folder) => {
    setUploadTargetFolder(folder);
    setFilesToUpload([]);
    setUploadResults(null);
    setUploadDialogOpen(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setFilesToUpload(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setFilesToUpload(prev => prev.filter((_, i) => i !== index));
  };

  const handleBulkUpload = async () => {
    if (!uploadTargetFolder || filesToUpload.length === 0) return;

    setUploading(true);
    setUploadProgress(0);
    setUploadResults(null);

    try {
      const formData = new FormData();
      formData.append('folderId', uploadTargetFolder.id);
      if (uploadTargetFolder.departmentId) {
        formData.append('departmentId', uploadTargetFolder.departmentId);
      }
      if (uploadTargetFolder.documentTypeId) {
        formData.append('documentTypeId', uploadTargetFolder.documentTypeId);
      }
      
      filesToUpload.forEach(file => {
        formData.append('files', file);
      });

      // Simüle edilmiş ilerleme
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch('/api/documents/bulk-upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const data = await response.json();

      if (response.ok) {
        setUploadResults({
          success: data.totalUploaded || 0,
          failed: data.totalFailed || 0,
          errors: data.errors || [],
        });
        toast({
          title: 'Yükleme Tamamlandı',
          description: `${data.totalUploaded} doküman başarıyla yüklendi`,
        });
        fetchData();
      } else {
        toast({
          title: 'Hata',
          description: data.error || 'Yükleme sırasında hata oluştu',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Hata',
        description: 'Yükleme sırasında hata oluştu',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const closeUploadDialog = () => {
    setUploadDialogOpen(false);
    setUploadTargetFolder(null);
    setFilesToUpload([]);
    setUploadProgress(0);
    setUploadResults(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      'TASLAK': { label: 'Taslak', className: 'bg-gray-100 text-gray-800' },
      'ONAY_BEKLIYOR': { label: 'Onay Bekliyor', className: 'bg-yellow-100 text-yellow-800' },
      'YAYINDA': { label: 'Yayında', className: 'bg-green-100 text-green-800' },
      'ARSIVLENDI': { label: 'Arşivlendi', className: 'bg-blue-100 text-blue-800' },
      'IPTAL': { label: 'İptal', className: 'bg-red-100 text-red-800' },
      'INCELEME_BEKLIYOR': { label: 'İnceleme Bekliyor', className: 'bg-purple-100 text-purple-800' },
    };
    const s = statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-800' };
    return <Badge className={s.className}>{s.label}</Badge>;
  };

  // Flatten folders for parent selection (exclude current folder and its children)
  const getAvailableParents = (excludeId?: string) => {
    const result: { id: string; name: string; level: number }[] = [];
    
    const addFolder = (folder: Folder, level: number = 0) => {
      if (folder.id !== excludeId) {
        result.push({ id: folder.id, name: folder.name, level });
        (folder.children || []).forEach(child => addFolder(child, level + 1));
      }
    };
    
    buildHierarchy(folders).forEach(f => addFolder(f));
    return result;
  };

  // Klasör ağacını render et
  const renderFolderTree = (folder: Folder, level: number = 0) => {
    const hasChildren = (folder.children?.length ?? 0) > 0 || folder._count?.children > 0;
    const isExpanded = expandedFolders.has(folder.id);
    const isDragOver = dragOverFolderId === folder.id;

    return (
      <div key={folder.id}>
        <div
          className={`flex items-center justify-between p-3 rounded-lg transition-all ${
            isDragOver 
              ? 'bg-blue-100 border-2 border-dashed border-blue-500' 
              : 'hover:bg-gray-50'
          }`}
          style={{ marginLeft: level * 24 }}
          onDragOver={(e) => handleDragOver(e, folder.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, folder)}
        >
          <div className="flex items-center space-x-3 flex-1">
            {hasChildren ? (
              <button 
                onClick={() => toggleExpand(folder.id)}
                className="p-1 hover:bg-gray-200 rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                )}
              </button>
            ) : (
              <div className="w-6" />
            )}
            
            <FolderOpen className={`w-5 h-5 ${isDragOver ? 'text-blue-600' : level === 0 ? 'text-blue-600' : level === 1 ? 'text-amber-500' : 'text-gray-500'}`} />
            
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{folder.name}</span>
                <Badge variant="outline" className="text-xs">{folder.code}</Badge>
                {isDragOver && (
                  <Badge className="bg-blue-500 text-white text-xs">Bırak</Badge>
                )}
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  {folder._count?.documents ?? 0} doküman
                </span>
                {folder._count?.children > 0 && (
                  <span className="flex items-center gap-1">
                    <FolderOpen className="w-3 h-3" />
                    {folder._count.children} alt klasör
                  </span>
                )}
                {folder.department && (
                  <span>Departman: {folder.department.name}</span>
                )}
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openUploadDialog(folder)}>
                <Upload className="w-4 h-4 mr-2" />
                Toplu Doküman Yükle
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openAddDialog(folder)}>
                <FolderPlus className="w-4 h-4 mr-2" />
                Alt Klasör Ekle
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openEditDialog(folder)}>
                <Edit className="w-4 h-4 mr-2" />
                Düzenle
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => {
                  setPermissionsFolder(folder);
                  setPermissionsDialogOpen(true);
                }}
              >
                <Shield className="w-4 h-4 mr-2" />
                Yetki Ayarları
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => {
                  setFolderToDelete(folder);
                  setDeleteDialogOpen(true);
                }}
                className="text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Sil
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {isExpanded && folder.children && folder.children.length > 0 && (
          <div className="border-l-2 border-gray-200 ml-6">
            {folder.children.map(child => renderFolderTree(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const hierarchicalFolders = buildHierarchy(folders);
  const currentSubfolders = getCurrentSubfolders();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="ghost" asChild>
            <Link href="/dashboard/documents">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Geri
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dosya Gezgini</h1>
            <p className="text-gray-500 mt-1">Klasör ve dokümanları Windows tarzı gezin</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => openAddDialog(currentFolder || undefined)}>
            <FolderPlus className="w-4 h-4 mr-2" />
            Yeni Klasör
          </Button>
          {currentFolder && (
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => openUploadDialog(currentFolder)}>
              <Upload className="w-4 h-4 mr-2" />
              Dosya Yükle
            </Button>
          )}
        </div>
      </div>

      {/* Breadcrumb Navigation */}
      <Card className="shadow-sm">
        <CardContent className="py-3">
          <div className="flex items-center gap-1 flex-wrap">
            {folderPath.map((path, index) => (
              <div key={index} className="flex items-center">
                {index > 0 && <ChevronRight className="w-4 h-4 text-gray-400 mx-1" />}
                <Button
                  variant={index === folderPath.length - 1 ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => navigateToPathFolder(index)}
                  className="flex items-center gap-1"
                >
                  {index === 0 ? <Home className="w-4 h-4" /> : <FolderOpen className="w-4 h-4" />}
                  {path.name}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Explorer View */}
      <Card className="shadow-lg">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-blue-600" />
                {currentFolder?.name || 'Ana Dizin'}
              </CardTitle>
              <CardDescription>
                {currentSubfolders.length} klasör • {folderDocuments.length} doküman
              </CardDescription>
            </div>
            {currentFolder && (
              <Badge variant="outline">{currentFolder.code}</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Klasörler */}
          {currentSubfolders.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                <Folder className="w-4 h-4" /> Klasörler
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {currentSubfolders.map(folder => {
                  const isDragOver = dragOverFolderId === folder.id;
                  return (
                    <div
                      key={folder.id}
                      className={`group relative p-4 border rounded-lg cursor-pointer transition-all ${
                        isDragOver 
                          ? 'bg-blue-50 border-blue-500 border-2 border-dashed' 
                          : 'hover:bg-gray-50 hover:border-blue-300'
                      }`}
                      onClick={() => navigateToFolder(folder)}
                      onDragOver={(e) => handleDragOver(e, folder.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, folder)}
                    >
                      <div className="flex items-center gap-3">
                        <FolderOpen className={`w-10 h-10 ${isDragOver ? 'text-blue-600' : 'text-amber-500'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{folder.name}</p>
                          <p className="text-xs text-gray-500">
                            {folder._count?.documents || 0} doküman • {folder._count?.children || 0} alt klasör
                          </p>
                        </div>
                      </div>
                      {isDragOver && (
                        <div className="absolute inset-0 flex items-center justify-center bg-blue-50/80 rounded-lg">
                          <Badge className="bg-blue-500">Dosyaları bırak</Badge>
                        </div>
                      )}
                      {/* Klasör menüsü */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openUploadDialog(folder); }}>
                            <Upload className="w-4 h-4 mr-2" />
                            Dosya Yükle
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openAddDialog(folder); }}>
                            <FolderPlus className="w-4 h-4 mr-2" />
                            Alt Klasör Ekle
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditDialog(folder); }}>
                            <Edit className="w-4 h-4 mr-2" />
                            Düzenle
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={(e) => { 
                              e.stopPropagation();
                              setPermissionsFolder(folder);
                              setPermissionsDialogOpen(true);
                            }}
                          >
                            <Shield className="w-4 h-4 mr-2" />
                            Yetki Ayarları
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={(e) => { 
                              e.stopPropagation();
                              setFolderToDelete(folder);
                              setDeleteDialogOpen(true);
                            }}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Sil
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Dokümanlar */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" /> Dokümanlar
            </h3>
            {loadingDocuments ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
              </div>
            ) : folderDocuments.length === 0 ? (
              <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
                <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Bu klasörde doküman bulunmuyor</p>
                {currentFolder && (
                  <Button variant="outline" className="mt-3" onClick={() => openUploadDialog(currentFolder)}>
                    <Upload className="w-4 h-4 mr-2" />
                    Doküman Yükle
                  </Button>
                )}
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Doküman</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Kod</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Tip</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Durum</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Versiyon</th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-gray-700">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {folderDocuments.map(doc => (
                      <tr key={doc.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => window.location.href = `/dashboard/documents/${doc.id}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <File className="w-8 h-8 text-blue-500" />
                            <div>
                              <p className="font-medium text-gray-900">{doc.title}</p>
                              <p className="text-xs text-gray-500">{doc.versions?.[0]?.fileName || ''}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="font-mono text-xs">{doc.code}</Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {doc.documentType?.name || '-'}
                        </td>
                        <td className="px-4 py-3">
                          {getStatusBadge(doc.status)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          v{doc.currentVersion}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/dashboard/documents/${doc.id}`}>
                                <Eye className="w-4 h-4" />
                              </Link>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Boş klasör ve doküman yoksa */}
          {currentSubfolders.length === 0 && folderDocuments.length === 0 && !loadingDocuments && (
            <div className="text-center py-12 text-gray-500">
              <FolderOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="mb-4">{currentFolder ? 'Bu klasör boş' : 'Henüz klasör bulunmuyor'}</p>
              <div className="flex justify-center gap-3">
                <Button variant="outline" onClick={() => openAddDialog(currentFolder || undefined)}>
                  <FolderPlus className="w-4 h-4 mr-2" />
                  Klasör Oluştur
                </Button>
                {currentFolder && (
                  <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => openUploadDialog(currentFolder)}>
                    <Upload className="w-4 h-4 mr-2" />
                    Doküman Yükle
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Yeni Klasör Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) {
          setParentFolderForNew(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {parentFolderForNew ? `"${parentFolderForNew.name}" içine Alt Klasör Ekle` : 'Yeni Klasör Oluştur'}
            </DialogTitle>
            <DialogDescription>
              Klasör bilgilerini girin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Klasör Adı *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Örn: Prosedürler"
              />
            </div>
            <div>
              <Label>Klasör Kodu *</Label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="Örn: PROC"
              />
            </div>
            <div>
              <Label>Açıklama</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Klasör açıklaması"
                rows={2}
              />
            </div>
            {!parentFolderForNew && (
              <div>
                <Label>Üst Klasör</Label>
                <Select
                  value={formData.parentId}
                  onValueChange={(value) => setFormData({ ...formData, parentId: value === 'none' ? '' : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Üst klasör seçin (opsiyonel)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ana Klasör (Üst yok)</SelectItem>
                    {getAvailableParents().map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {'\u00A0'.repeat(f.level * 2)}{f.level > 0 ? '└ ' : ''}{f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Departman</Label>
              <Select
                value={formData.departmentId}
                onValueChange={(value) => setFormData({ ...formData, departmentId: value === 'none' ? '' : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Departman seçin (opsiyonel)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Departman Yok</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Doküman Tipi</Label>
              <Select
                value={formData.documentTypeId}
                onValueChange={(value) => setFormData({ ...formData, documentTypeId: value === 'none' ? '' : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Doküman tipi seçin (opsiyonel)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tip Yok</SelectItem>
                  {documentTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Doküman Kod Şablonu</Label>
              <Input
                value={formData.codeTemplate}
                onChange={(e) => setFormData({ ...formData, codeTemplate: e.target.value })}
                placeholder="Örn: SOP-{DEPT}-{YEAR}-{NUM}"
              />
              <p className="text-xs text-gray-500 mt-1">
                Şablon değişkenleri: {'{DEPT}'} = Departman Kodu, {'{YEAR}'} = Yıl, {'{NUM}'} = Sıra No
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>İptal</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? 'Kaydediliyor...' : 'Oluştur'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Düzenleme Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => {
        setEditDialogOpen(open);
        if (!open) {
          setEditingFolder(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Klasör Düzenle</DialogTitle>
            <DialogDescription>
              Klasör bilgilerini güncelleyin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Klasör Adı *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Klasör Kodu *</Label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              />
            </div>
            <div>
              <Label>Açıklama</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>
            <div>
              <Label>Üst Klasör</Label>
              <Select
                value={formData.parentId}
                onValueChange={(value) => setFormData({ ...formData, parentId: value === 'none' ? '' : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Üst klasör seçin (opsiyonel)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ana Klasör (Üst yok)</SelectItem>
                  {getAvailableParents(editingFolder?.id).map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {'\u00A0'.repeat(f.level * 2)}{f.level > 0 ? '└ ' : ''}{f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Departman</Label>
              <Select
                value={formData.departmentId}
                onValueChange={(value) => setFormData({ ...formData, departmentId: value === 'none' ? '' : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Departman seçin (opsiyonel)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Departman Yok</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Doküman Tipi</Label>
              <Select
                value={formData.documentTypeId}
                onValueChange={(value) => setFormData({ ...formData, documentTypeId: value === 'none' ? '' : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Doküman tipi seçin (opsiyonel)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tip Yok</SelectItem>
                  {documentTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Doküman Kod Şablonu</Label>
              <Input
                value={formData.codeTemplate}
                onChange={(e) => setFormData({ ...formData, codeTemplate: e.target.value })}
                placeholder="Örn: SOP-{DEPT}-{YEAR}-{NUM}"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>İptal</Button>
            <Button onClick={handleEdit} disabled={saving}>
              {saving ? 'Kaydediliyor...' : 'Güncelle'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Silme Onay Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Klasörü Silmek İstediğinize Emin Misiniz?</AlertDialogTitle>
            <AlertDialogDescription>
              {folderToDelete && (
                <>
                  <strong>"{folderToDelete.name}"</strong> klasörü silinecektir.
                  {(folderToDelete._count?.documents ?? 0) > 0 && (
                    <span className="block text-red-600 mt-2">
                      Uyarı: Bu klasörde {folderToDelete._count.documents} doküman bulunmaktadır!
                    </span>
                  )}
                  {(folderToDelete._count?.children ?? 0) > 0 && (
                    <span className="block text-red-600 mt-1">
                      Uyarı: Bu klasörün {folderToDelete._count.children} alt klasörü bulunmaktadır!
                    </span>
                  )}
                </>
              )}
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

      {/* Toplu Yükleme Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={(open) => {
        if (!uploading) {
          if (!open) closeUploadDialog();
          else setUploadDialogOpen(open);
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Toplu Doküman Yükle
            </DialogTitle>
            <DialogDescription>
              {uploadTargetFolder && (
                <>
                  <strong>"{uploadTargetFolder.name}"</strong> klasörüne dokümanlar yükleyin.
                  Dosyaları sürükleyip bırakabilir veya seçebilirsiniz.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Sürükle-Bırak Alanı */}
            {!uploadResults && (
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  filesToUpload.length > 0 
                    ? 'border-green-400 bg-green-50' 
                    : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const files = Array.from(e.dataTransfer.files);
                  setFilesToUpload(prev => [...prev, ...files]);
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 mb-2">
                  Dosyaları buraya sürükleyip bırakın
                </p>
                <p className="text-gray-400 text-sm mb-4">veya</p>
                <Button 
                  variant="outline" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  Dosya Seç
                </Button>
              </div>
            )}

            {/* Seçilen Dosyalar */}
            {filesToUpload.length > 0 && !uploadResults && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{filesToUpload.length} dosya seçildi</Label>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setFilesToUpload([])}
                    disabled={uploading}
                  >
                    Tümünü Kaldır
                  </Button>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-2 border rounded-lg p-2">
                  {filesToUpload.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        <span className="text-sm truncate">{file.name}</span>
                        <span className="text-xs text-gray-400 flex-shrink-0">
                          ({formatFileSize(file.size)})
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        disabled={uploading}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Yükleme İlerlemesi */}
            {uploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Yükleniyor...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}

            {/* Yükleme Sonuçları */}
            {uploadResults && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 justify-center">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">{uploadResults.success} başarılı</span>
                  </div>
                  {uploadResults.failed > 0 && (
                    <div className="flex items-center gap-2 text-red-600">
                      <AlertCircle className="w-5 h-5" />
                      <span className="font-medium">{uploadResults.failed} başarısız</span>
                    </div>
                  )}
                </div>
                
                {uploadResults.errors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-red-800 mb-2">Hatalar:</p>
                    <ul className="text-sm text-red-600 space-y-1">
                      {uploadResults.errors.map((error, i) => (
                        <li key={i}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            {uploadResults ? (
              <Button onClick={closeUploadDialog}>Kapat</Button>
            ) : (
              <>
                <Button variant="outline" onClick={closeUploadDialog} disabled={uploading}>
                  İptal
                </Button>
                <Button 
                  onClick={handleBulkUpload} 
                  disabled={filesToUpload.length === 0 || uploading}
                >
                  {uploading ? 'Yükleniyor...' : `${filesToUpload.length} Dosya Yükle`}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Klasör Yetki Ayarları Dialog */}
      {permissionsFolder && (
        <FolderPermissionsDialog
          open={permissionsDialogOpen}
          onOpenChange={setPermissionsDialogOpen}
          folderId={permissionsFolder.id}
          folderName={permissionsFolder.name}
        />
      )}
    </div>
  );
}
