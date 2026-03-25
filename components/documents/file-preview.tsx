'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  X, Download, Edit, Save, Eye, FileText, Image as ImageIcon, 
  FileSpreadsheet, Presentation, File, ZoomIn, ZoomOut, RotateCw,
  Maximize2, Minimize2, ExternalLink, Loader2, AlertCircle
} from 'lucide-react';
import mammoth from 'mammoth';

interface FilePreviewProps {
  open: boolean;
  onClose: () => void;
  fileUrl: string;
  fileName: string;
  fileType: string;
  documentId?: string;
  versionId?: string;
  onSave?: (content: string) => Promise<void>;
  readOnly?: boolean;
}

const DOCX_EXTENSIONS = ['.docx'];
const OFFICE_EXTENSIONS = ['.doc', '.xls', '.xlsx', '.ppt', '.pptx', '.odt', '.ods', '.odp'];
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp'];
const TEXT_EXTENSIONS = ['.txt', '.md', '.json', '.xml', '.csv', '.log', '.ini', '.cfg', '.yaml', '.yml', '.html', '.css', '.js', '.ts'];
const PDF_TYPE = 'application/pdf';

export function FilePreview({ 
  open, 
  onClose, 
  fileUrl, 
  fileName, 
  fileType,
  documentId,
  versionId,
  onSave,
  readOnly = false
}: FilePreviewProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string>('');
  const [editedContent, setEditedContent] = useState<string>('');
  const [docxHtml, setDocxHtml] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [previewMode, setPreviewMode] = useState<'native' | 'office' | 'text' | 'image' | 'docx' | 'unsupported'>('native');
  const [previewError, setPreviewError] = useState<string | null>(null);

  const fileExtension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  const isDocxFile = DOCX_EXTENSIONS.includes(fileExtension) || fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  const isOfficeFile = OFFICE_EXTENSIONS.includes(fileExtension) && !isDocxFile;
  const isImageFile = IMAGE_TYPES.includes(fileType) || fileExtension.match(/\.(png|jpg|jpeg|gif|webp|svg|bmp)$/i);
  const isTextFile = TEXT_EXTENSIONS.includes(fileExtension) || fileType.startsWith('text/');
  const isPdfFile = fileType === PDF_TYPE || fileExtension === '.pdf';

  // Dosyayı yükle
  const loadFile = useCallback(async () => {
    if (!open || !fileUrl) return;
    
    setLoading(true);
    setPreviewError(null);
    setDocxHtml('');
    
    try {
      // Önizleme modunu belirle
      if (isPdfFile) {
        setPreviewMode('native');
        // PDF için blob URL oluştur
        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error('PDF dosyası yüklenemedi');
        const blob = await response.blob();
        // S3'den gelen content-type yanlış olabilir (application/octet-stream)
        // PDF dosyaları için doğru content-type ile yeni blob oluştur
        const pdfBlob = new Blob([blob], { type: 'application/pdf' });
        const url = URL.createObjectURL(pdfBlob);
        setBlobUrl(url);
      } else if (isDocxFile) {
        setPreviewMode('docx');
        // DOCX dosyası için mammoth kullanarak HTML'e dönüştür
        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error('DOCX dosyası yüklenemedi');
        const arrayBuffer = await response.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        setDocxHtml(result.value);
        if (result.messages && result.messages.length > 0) {
          console.log('Mammoth warnings:', result.messages);
        }
      } else if (isImageFile) {
        setPreviewMode('image');
        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error('Görsel dosyası yüklenemedi');
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
      } else if (isTextFile) {
        setPreviewMode('text');
        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error('Metin dosyası yüklenemedi');
        const text = await response.text();
        setTextContent(text);
        setEditedContent(text);
      } else if (isOfficeFile) {
        setPreviewMode('office');
        // Office dosyaları için doğrudan URL kullanılacak (Office Online Viewer)
      } else {
        setPreviewMode('unsupported');
      }
    } catch (error) {
      console.error('File load error:', error);
      setPreviewError(error instanceof Error ? error.message : 'Dosya yüklenemedi');
      toast({ title: 'Hata', description: 'Dosya yüklenemedi', variant: 'destructive' });
      setPreviewMode('unsupported');
    } finally {
      setLoading(false);
    }
  }, [open, fileUrl, isPdfFile, isDocxFile, isImageFile, isTextFile, isOfficeFile, toast]);

  useEffect(() => {
    loadFile();
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [loadFile]);

  // Temizlik
  useEffect(() => {
    if (!open) {
      setZoom(100);
      setRotation(0);
      setIsEditing(false);
      setIsFullscreen(false);
      setDocxHtml('');
      setPreviewError(null);
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        setBlobUrl(null);
      }
    }
  }, [open]);

  const handleSave = async () => {
    if (!onSave) return;
    
    setSaving(true);
    try {
      await onSave(editedContent);
      setTextContent(editedContent);
      setIsEditing(false);
      toast({ title: 'Başarılı', description: 'Dosya kaydedildi' });
    } catch (error) {
      toast({ title: 'Hata', description: 'Dosya kaydedilemedi', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    link.click();
  };

  const getFileIcon = () => {
    if (isPdfFile) return <FileText className="w-5 h-5 text-red-500" />;
    if (isImageFile) return <ImageIcon className="w-5 h-5 text-green-500" />;
    if (isTextFile) return <FileText className="w-5 h-5 text-blue-500" />;
    if (fileExtension.match(/\.(xls|xlsx|ods|csv)$/i)) return <FileSpreadsheet className="w-5 h-5 text-green-600" />;
    if (fileExtension.match(/\.(ppt|pptx|odp)$/i)) return <Presentation className="w-5 h-5 text-orange-500" />;
    if (fileExtension.match(/\.(doc|docx|odt)$/i)) return <FileText className="w-5 h-5 text-blue-600" />;
    return <File className="w-5 h-5 text-gray-500" />;
  };

  // Office Online Viewer URL oluştur
  const getOfficeViewerUrl = () => {
    // Microsoft Office Online Viewer kullan (public URL gerekli)
    const encodedUrl = encodeURIComponent(fileUrl);
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`;
  };

  // Google Docs Viewer (alternatif)
  const getGoogleViewerUrl = () => {
    const encodedUrl = encodeURIComponent(fileUrl);
    return `https://docs.google.com/gview?url=${encodedUrl}&embedded=true`;
  };

  const renderPreview = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center h-96">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
          <p className="text-gray-500">Dosya yükleniyor...</p>
        </div>
      );
    }

    switch (previewMode) {
      case 'native': // PDF
        return (
          <div className="w-full h-full min-h-[600px] bg-gray-100 rounded-lg overflow-hidden">
            {blobUrl && (
              <iframe
                src={`${blobUrl}#toolbar=1&navpanes=1&scrollbar=1&zoom=${zoom}`}
                className="w-full h-full min-h-[600px]"
                title={fileName}
              />
            )}
          </div>
        );

      case 'image':
        return (
          <div className="flex flex-col items-center justify-center p-4 bg-gray-100 rounded-lg min-h-[400px]">
            <div className="mb-4 flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setZoom(z => Math.max(25, z - 25))}>
                <ZoomOut className="w-4 h-4" />
              </Button>
              <Badge variant="secondary">{zoom}%</Badge>
              <Button variant="outline" size="sm" onClick={() => setZoom(z => Math.min(200, z + 25))}>
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setRotation(r => (r + 90) % 360)}>
                <RotateCw className="w-4 h-4" />
              </Button>
            </div>
            {blobUrl && (
              <img
                src={blobUrl}
                alt={fileName}
                className="max-w-full max-h-[500px] object-contain transition-transform duration-200"
                style={{ 
                  transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                  transformOrigin: 'center center'
                }}
              />
            )}
          </div>
        );

      case 'text':
        return (
          <div className="w-full">
            {isEditing ? (
              <div className="space-y-4">
                <Textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="min-h-[500px] font-mono text-sm"
                  placeholder="İçerik..."
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => {
                    setEditedContent(textContent);
                    setIsEditing(false);
                  }}>
                    İptal
                  </Button>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Kaydet
                  </Button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <pre className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-[500px] text-sm font-mono whitespace-pre-wrap">
                  {textContent || '(Boş dosya)'}
                </pre>
                {!readOnly && onSave && (
                  <Button 
                    className="absolute top-2 right-2" 
                    size="sm" 
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit className="w-4 h-4 mr-1" /> Düzenle
                  </Button>
                )}
              </div>
            )}
          </div>
        );

      case 'docx':
        return (
          <div className="w-full">
            <div className="mb-4 flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setZoom(z => Math.max(50, z - 25))}>
                <ZoomOut className="w-4 h-4" />
              </Button>
              <Badge variant="secondary">{zoom}%</Badge>
              <Button variant="outline" size="sm" onClick={() => setZoom(z => Math.min(200, z + 25))}>
                <ZoomIn className="w-4 h-4" />
              </Button>
            </div>
            <div 
              className="bg-white border rounded-lg p-8 min-h-[600px] overflow-auto shadow-inner"
              style={{ 
                fontSize: `${zoom}%`,
                maxHeight: isFullscreen ? 'calc(95vh - 200px)' : '600px'
              }}
            >
              {docxHtml ? (
                <div 
                  className="prose prose-sm max-w-none docx-content"
                  dangerouslySetInnerHTML={{ __html: docxHtml }}
                  style={{
                    lineHeight: '1.6',
                    fontFamily: 'Arial, sans-serif'
                  }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                  <AlertCircle className="w-12 h-12 mb-4" />
                  <p>Doküman içeriği yüklenemedi</p>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              <FileText className="w-3 h-3 inline mr-1" />
              Word dokümanı HTML formatında önizleniyor
            </p>
          </div>
        );

      case 'office':
        return (
          <div className="w-full">
            <Tabs defaultValue="microsoft" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="microsoft">Microsoft Office Viewer</TabsTrigger>
                <TabsTrigger value="google">Google Docs Viewer</TabsTrigger>
              </TabsList>
              <TabsContent value="microsoft" className="w-full">
                <div className="bg-gray-100 rounded-lg overflow-hidden">
                  <iframe
                    src={getOfficeViewerUrl()}
                    className="w-full min-h-[600px]"
                    title={`${fileName} - Microsoft Viewer`}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  <ExternalLink className="w-3 h-3 inline mr-1" />
                  Microsoft Office Online Viewer ile önizleniyor
                </p>
              </TabsContent>
              <TabsContent value="google" className="w-full">
                <div className="bg-gray-100 rounded-lg overflow-hidden">
                  <iframe
                    src={getGoogleViewerUrl()}
                    className="w-full min-h-[600px]"
                    title={`${fileName} - Google Viewer`}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  <ExternalLink className="w-3 h-3 inline mr-1" />
                  Google Docs Viewer ile önizleniyor
                </p>
              </TabsContent>
            </Tabs>
          </div>
        );

      default:
        return (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <File className="w-16 h-16 mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">Bu dosya türü önizlenemiyor</p>
            <p className="text-sm mb-4">Dosyayı indirerek görüntüleyebilirsiniz</p>
            <Button onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" /> İndir
            </Button>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={`${isFullscreen ? 'max-w-[95vw] max-h-[95vh] h-[95vh]' : 'max-w-5xl max-h-[90vh]'} overflow-hidden flex flex-col`}>
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getFileIcon()}
              <div>
                <DialogTitle className="text-lg">{fileName}</DialogTitle>
                <p className="text-sm text-gray-500">{fileType}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsFullscreen(!isFullscreen)}>
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto py-4">
          {renderPreview()}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default FilePreview;
