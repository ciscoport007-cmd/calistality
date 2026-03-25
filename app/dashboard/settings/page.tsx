'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Save, Upload, Trash2, Image as ImageIcon, Mail, Bot, Eye, EyeOff, CheckCircle2, XCircle, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

function isAdmin(role?: string | null): boolean {
  if (!role) return false;
  const r = role.toLowerCase();
  return r === 'admin' || r === 'yönetici';
}

// Popüler LLM sağlayıcıları
const LLM_PROVIDERS = [
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-4o, GPT-4, GPT-3.5 Turbo',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo', 'o1-preview', 'o1-mini'],
    keyPlaceholder: 'sk-...',
    docsUrl: 'https://platform.openai.com/api-keys',
  },
  {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    description: 'Claude 3.5 Sonnet, Claude 3 Opus, Haiku',
    baseUrl: 'https://api.anthropic.com/v1',
    models: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
    keyPlaceholder: 'sk-ant-...',
    docsUrl: 'https://console.anthropic.com/settings/keys',
  },
  {
    id: 'google',
    name: 'Google (Gemini)',
    description: 'Gemini 2.0, Gemini 1.5 Pro/Flash',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    models: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.5-flash-8b'],
    keyPlaceholder: 'AIza...',
    docsUrl: 'https://aistudio.google.com/app/apikey',
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    description: 'Mistral Large, Medium, Small, Codestral',
    baseUrl: 'https://api.mistral.ai/v1',
    models: ['mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest', 'codestral-latest', 'open-mixtral-8x22b'],
    keyPlaceholder: 'API Key...',
    docsUrl: 'https://console.mistral.ai/api-keys',
  },
  {
    id: 'groq',
    name: 'Groq',
    description: 'LLaMA 3, Mixtral (Hızlı çıkarım)',
    baseUrl: 'https://api.groq.com/openai/v1',
    models: ['llama-3.1-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
    keyPlaceholder: 'gsk_...',
    docsUrl: 'https://console.groq.com/keys',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    description: 'DeepSeek V3, DeepSeek Coder',
    baseUrl: 'https://api.deepseek.com/v1',
    models: ['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner'],
    keyPlaceholder: 'sk-...',
    docsUrl: 'https://platform.deepseek.com/api_keys',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    description: 'Tüm modellere tek API ile erişim',
    baseUrl: 'https://openrouter.ai/api/v1',
    models: ['openai/gpt-4o', 'anthropic/claude-3.5-sonnet', 'google/gemini-pro-1.5', 'meta-llama/llama-3.1-405b-instruct'],
    keyPlaceholder: 'sk-or-...',
    docsUrl: 'https://openrouter.ai/keys',
  },
  {
    id: 'custom',
    name: 'Özel / Self-Hosted',
    description: 'Ollama, vLLM, LM Studio vb.',
    baseUrl: 'http://localhost:11434/v1',
    models: [],
    keyPlaceholder: 'API Key (opsiyonel)',
    docsUrl: '',
  },
];

export default function AppSettingsPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [settings, setSettings] = useState({
    appName: '',
    appSubtitle: '',
    appLogo: '',
  });

  // SMTP Ayarları
  const [smtpSettings, setSmtpSettings] = useState({
    smtpHost: '',
    smtpPort: '587',
    smtpUser: '',
    smtpPass: '',
    smtpFrom: '',
    smtpFromName: '',
    smtpSecure: 'tls',
    smtpEnabled: 'false',
  });
  const [savingSmtp, setSavingSmtp] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [showSmtpPass, setShowSmtpPass] = useState(false);

  // LLM Ayarları
  const [llmSettings, setLlmSettings] = useState({
    llmProvider: '',
    llmApiKey: '',
    llmBaseUrl: '',
    llmModel: '',
    llmCustomModel: '',
    llmEnabled: 'false',
  });
  const [savingLlm, setSavingLlm] = useState(false);
  const [testingLlm, setTestingLlm] = useState(false);
  const [showLlmKey, setShowLlmKey] = useState(false);
  const [llmTestResult, setLlmTestResult] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user || !isAdmin(session.user.role)) {
      router.push('/dashboard');
      return;
    }
    fetchSettings();
  }, [session, status, router]);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/app-settings');
      if (res.ok) {
        const data = await res.json();
        setSettings({
          appName: data.appName || '',
          appSubtitle: data.appSubtitle || '',
          appLogo: data.appLogo || '',
        });
        setSmtpSettings({
          smtpHost: data.smtpHost || '',
          smtpPort: data.smtpPort || '587',
          smtpUser: data.smtpUser || '',
          smtpPass: data.smtpPass || '',
          smtpFrom: data.smtpFrom || '',
          smtpFromName: data.smtpFromName || '',
          smtpSecure: data.smtpSecure || 'tls',
          smtpEnabled: data.smtpEnabled || 'false',
        });
        setLlmSettings({
          llmProvider: data.llmProvider || '',
          llmApiKey: data.llmApiKey || '',
          llmBaseUrl: data.llmBaseUrl || '',
          llmModel: data.llmModel || '',
          llmCustomModel: data.llmCustomModel || '',
          llmEnabled: data.llmEnabled || 'false',
        });
      }
    } catch (error) {
      console.error('Ayarlar alınırken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/app-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        toast.success('Ayarlar kaydedildi');
        window.location.reload();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Ayarlar kaydedilemedi');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSmtp = async () => {
    setSavingSmtp(true);
    try {
      const res = await fetch('/api/app-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(smtpSettings),
      });
      if (res.ok) {
        toast.success('SMTP ayarları kaydedildi');
      } else {
        toast.error('SMTP ayarları kaydedilemedi');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    } finally {
      setSavingSmtp(false);
    }
  };

  const handleTestSmtp = async () => {
    if (!smtpSettings.smtpHost || !smtpSettings.smtpFrom) {
      toast.error('SMTP sunucu ve gönderen e-posta zorunludur');
      return;
    }
    setTestingSmtp(true);
    try {
      const res = await fetch('/api/app-settings/test-smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(smtpSettings),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Test e-postası gönderildi!');
      } else {
        toast.error(data.error || 'SMTP test başarısız');
      }
    } catch (error) {
      toast.error('SMTP test sırasında hata oluştu');
    } finally {
      setTestingSmtp(false);
    }
  };

  const handleSaveLlm = async () => {
    setSavingLlm(true);
    try {
      const res = await fetch('/api/app-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(llmSettings),
      });
      if (res.ok) {
        toast.success('LLM ayarları kaydedildi');
      } else {
        toast.error('LLM ayarları kaydedilemedi');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    } finally {
      setSavingLlm(false);
    }
  };

  const handleTestLlm = async () => {
    if (!llmSettings.llmApiKey && llmSettings.llmProvider !== 'custom') {
      toast.error('API anahtarı zorunludur');
      return;
    }
    setTestingLlm(true);
    setLlmTestResult(null);
    try {
      const res = await fetch('/api/app-settings/test-llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(llmSettings),
      });
      const data = await res.json();
      if (res.ok) {
        setLlmTestResult(data.response || 'Bağlantı başarılı!');
        toast.success('LLM bağlantısı başarılı!');
      } else {
        setLlmTestResult(null);
        toast.error(data.error || 'LLM test başarısız');
      }
    } catch (error) {
      toast.error('LLM test sırasında hata oluştu');
    } finally {
      setTestingLlm(false);
    }
  };

  const selectedProvider = LLM_PROVIDERS.find(p => p.id === llmSettings.llmProvider);

  const handleProviderChange = (providerId: string) => {
    const provider = LLM_PROVIDERS.find(p => p.id === providerId);
    setLlmSettings({
      ...llmSettings,
      llmProvider: providerId,
      llmBaseUrl: provider?.baseUrl || '',
      llmModel: provider?.models?.[0] || '',
      llmCustomModel: '',
    });
    setLlmTestResult(null);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Sadece resim dosyaları yüklenebilir');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Dosya boyutu 2MB\'ı aşamaz');
      return;
    }

    setUploading(true);
    try {
      // Get presigned URL
      const presignRes = await fetch('/api/upload/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          isPublic: true,
        }),
      });

      if (!presignRes.ok) {
        throw new Error('Presigned URL alınamadı');
      }

      const { uploadUrl, cloud_storage_path } = await presignRes.json();

      // Upload to S3
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadRes.ok) {
        throw new Error('Dosya yüklenemedi');
      }

      // Get public URL
      const urlRes = await fetch('/api/upload/url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cloud_storage_path,
          isPublic: true,
        }),
      });

      if (urlRes.ok) {
        const { url } = await urlRes.json();
        setSettings({ ...settings, appLogo: url });
        toast.success('Logo yüklendi');
      }
    } catch (error) {
      console.error('Logo yüklenirken hata:', error);
      toast.error('Logo yüklenemedi');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = () => {
    setSettings({ ...settings, appLogo: '' });
  };

  if (status === 'loading' || loading) {
    return <div className="flex items-center justify-center h-64">Yükleniyor...</div>;
  }

  if (!session?.user || !isAdmin(session.user.role)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-lg font-medium">Bu sayfaya erişim yetkiniz bulunmamaktadır</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Uygulama Ayarları</h1>
        <p className="text-muted-foreground">Sistem genelindeki ayarları yönetin</p>
      </div>

      <Tabs defaultValue="branding">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="branding">Marka & Görünüm</TabsTrigger>
          <TabsTrigger value="smtp" className="flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5" /> E-posta (SMTP)
          </TabsTrigger>
          <TabsTrigger value="llm" className="flex items-center gap-1.5">
            <Bot className="h-3.5 w-3.5" /> LLM API
          </TabsTrigger>
        </TabsList>

        <TabsContent value="branding" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Logo ve Başlık</CardTitle>
              <CardDescription>
                Sol menüde görünecek logo ve uygulama adını ayarlayın
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo Upload */}
              <div className="space-y-2">
                <Label>Logo</Label>
                <div className="flex items-center gap-4">
                  {settings.appLogo ? (
                    <div className="relative w-20 h-20 border rounded-lg overflow-hidden bg-gray-50">
                      <Image
                        src={settings.appLogo}
                        alt="App Logo"
                        fill
                        className="object-contain p-2"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className="w-20 h-20 border rounded-lg flex items-center justify-center bg-gray-50">
                      <ImageIcon className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          disabled={uploading}
                        />
                        <Button type="button" variant="outline" size="sm" disabled={uploading} asChild>
                          <span>
                            <Upload className="h-4 w-4 mr-2" />
                            {uploading ? 'Yükleniyor...' : 'Logo Yükle'}
                          </span>
                        </Button>
                      </label>
                      {settings.appLogo && (
                        <Button type="button" variant="outline" size="sm" onClick={handleRemoveLogo}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Kaldır
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Önerilen boyut: 200x200 piksel. Max 2MB. PNG veya SVG önerilir.
                    </p>
                  </div>
                </div>
              </div>

              {/* App Name */}
              <div className="space-y-2">
                <Label htmlFor="appName">Uygulama Adı</Label>
                <Input
                  id="appName"
                  value={settings.appName}
                  onChange={(e) => setSettings({ ...settings, appName: e.target.value })}
                  placeholder="QDMS"
                  maxLength={50}
                />
                <p className="text-xs text-muted-foreground">
                  Sol menüde logonun yanında görünecek başlık
                </p>
              </div>

              {/* App Subtitle */}
              <div className="space-y-2">
                <Label htmlFor="appSubtitle">Alt Başlık</Label>
                <Input
                  id="appSubtitle"
                  value={settings.appSubtitle}
                  onChange={(e) => setSettings({ ...settings, appSubtitle: e.target.value })}
                  placeholder="Yönetim Paneli"
                  maxLength={100}
                />
                <p className="text-xs text-muted-foreground">
                  Uygulama adının altında görünecek kısa açıklama
                </p>
              </div>

              {/* Preview */}
              <div className="space-y-2">
                <Label>Önizleme</Label>
                <div className="p-4 border rounded-lg bg-white max-w-xs">
                  <div className="flex items-center gap-3">
                    {settings.appLogo ? (
                      <div className="relative w-10 h-10 flex-shrink-0">
                        <Image
                          src={settings.appLogo}
                          alt="Logo"
                          fill
                          className="object-contain rounded"
                          unoptimized
                        />
                      </div>
                    ) : null}
                    <div>
                      <h2 className="text-xl font-bold text-blue-600">
                        {settings.appName || 'QDMS'}
                      </h2>
                      <p className="text-sm text-gray-500">
                        {settings.appSubtitle || 'Yönetim Paneli'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </div>
        </TabsContent>

        {/* SMTP E-posta Ayarları */}
        <TabsContent value="smtp" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" /> SMTP E-posta Sunucu Ayarları
                  </CardTitle>
                  <CardDescription>
                    Sistem bildirimlerinin gönderileceği e-posta sunucusunu yapılandırın
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="smtp-enabled" className="text-sm">Aktif</Label>
                  <Switch
                    id="smtp-enabled"
                    checked={smtpSettings.smtpEnabled === 'true'}
                    onCheckedChange={(v) => setSmtpSettings({ ...smtpSettings, smtpEnabled: v ? 'true' : 'false' })}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtpHost">SMTP Sunucu Adresi *</Label>
                  <Input
                    id="smtpHost"
                    value={smtpSettings.smtpHost}
                    onChange={(e) => setSmtpSettings({ ...smtpSettings, smtpHost: e.target.value })}
                    placeholder="smtp.gmail.com"
                  />
                  <p className="text-xs text-muted-foreground">Örn: smtp.gmail.com, smtp.office365.com, smtp.yandex.com</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpPort">Port *</Label>
                  <Select
                    value={smtpSettings.smtpPort}
                    onValueChange={(v) => setSmtpSettings({ ...smtpSettings, smtpPort: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25 (SMTP)</SelectItem>
                      <SelectItem value="465">465 (SSL)</SelectItem>
                      <SelectItem value="587">587 (TLS - Önerilen)</SelectItem>
                      <SelectItem value="2525">2525 (Alternatif)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtpUser">Kullanıcı Adı</Label>
                  <Input
                    id="smtpUser"
                    value={smtpSettings.smtpUser}
                    onChange={(e) => setSmtpSettings({ ...smtpSettings, smtpUser: e.target.value })}
                    placeholder="noreply@sirketniz.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpPass">Şifre / Uygulama Parolası</Label>
                  <div className="relative">
                    <Input
                      id="smtpPass"
                      type={showSmtpPass ? 'text' : 'password'}
                      value={smtpSettings.smtpPass}
                      onChange={(e) => setSmtpSettings({ ...smtpSettings, smtpPass: e.target.value })}
                      placeholder="••••••••"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                      onClick={() => setShowSmtpPass(!showSmtpPass)}
                    >
                      {showSmtpPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Gmail için: Uygulama Parolası kullanın (2FA gerekir)</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtpSecure">Güvenlik Protokolü</Label>
                <Select
                  value={smtpSettings.smtpSecure}
                  onValueChange={(v) => setSmtpSettings({ ...smtpSettings, smtpSecure: v })}
                >
                  <SelectTrigger className="w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tls">STARTTLS (Port 587 için önerilen)</SelectItem>
                    <SelectItem value="ssl">SSL/TLS (Port 465 için)</SelectItem>
                    <SelectItem value="none">Yok (Güvenli değil)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Gönderen Bilgileri</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="smtpFrom">Gönderen E-posta *</Label>
                    <Input
                      id="smtpFrom"
                      type="email"
                      value={smtpSettings.smtpFrom}
                      onChange={(e) => setSmtpSettings({ ...smtpSettings, smtpFrom: e.target.value })}
                      placeholder="noreply@sirketniz.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtpFromName">Gönderen Adı</Label>
                    <Input
                      id="smtpFromName"
                      value={smtpSettings.smtpFromName}
                      onChange={(e) => setSmtpSettings({ ...smtpSettings, smtpFromName: e.target.value })}
                      placeholder="QDMS Bildirim Sistemi"
                    />
                  </div>
                </div>
              </div>

              {/* Bilinen SMTP Sunucuları */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Popüler SMTP Sunucu Bilgileri</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    { name: 'Gmail', host: 'smtp.gmail.com', port: '587', note: 'Uygulama Parolası gerekir' },
                    { name: 'Outlook/Office 365', host: 'smtp.office365.com', port: '587', note: '' },
                    { name: 'Yandex', host: 'smtp.yandex.com', port: '465', note: 'SSL kullanın' },
                    { name: 'Yahoo', host: 'smtp.mail.yahoo.com', port: '587', note: '' },
                    { name: 'Zoho', host: 'smtp.zoho.com', port: '587', note: '' },
                    { name: 'SendGrid', host: 'smtp.sendgrid.net', port: '587', note: 'API Key kullanın' },
                  ].map((smtp) => (
                    <button
                      key={smtp.name}
                      type="button"
                      className="text-left p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      onClick={() => setSmtpSettings({
                        ...smtpSettings,
                        smtpHost: smtp.host,
                        smtpPort: smtp.port,
                        smtpSecure: smtp.port === '465' ? 'ssl' : 'tls',
                      })}
                    >
                      <div className="font-medium text-sm">{smtp.name}</div>
                      <div className="text-xs text-muted-foreground">{smtp.host}:{smtp.port}</div>
                      {smtp.note && <div className="text-xs text-orange-600 mt-1">{smtp.note}</div>}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={handleTestSmtp} disabled={testingSmtp}>
              {testingSmtp ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Test Ediliyor...</> : <><Send className="h-4 w-4 mr-2" /> Test E-postası Gönder</>}
            </Button>
            <Button onClick={handleSaveSmtp} disabled={savingSmtp}>
              <Save className="h-4 w-4 mr-2" />
              {savingSmtp ? 'Kaydediliyor...' : 'SMTP Ayarlarını Kaydet'}
            </Button>
          </div>
        </TabsContent>

        {/* LLM API Ayarları */}
        <TabsContent value="llm" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="h-5 w-5" /> Yapay Zeka (LLM) API Ayarları
                  </CardTitle>
                  <CardDescription>
                    Sistemde kullanılacak yapay zeka modelini ve API bağlantısını yapılandırın
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="llm-enabled" className="text-sm">Aktif</Label>
                  <Switch
                    id="llm-enabled"
                    checked={llmSettings.llmEnabled === 'true'}
                    onCheckedChange={(v) => setLlmSettings({ ...llmSettings, llmEnabled: v ? 'true' : 'false' })}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Sağlayıcı Seçimi */}
              <div className="space-y-3">
                <Label>LLM Sağlayıcısı Seçin</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {LLM_PROVIDERS.map((provider) => (
                    <button
                      key={provider.id}
                      type="button"
                      className={`text-left p-3 border rounded-lg transition-all ${
                        llmSettings.llmProvider === provider.id
                          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => handleProviderChange(provider.id)}
                    >
                      <div className="font-medium text-sm">{provider.name}</div>
                      <div className="text-xs text-muted-foreground mt-1">{provider.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {llmSettings.llmProvider && (
                <>
                  {/* API Key */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="llmApiKey">API Anahtarı {llmSettings.llmProvider !== 'custom' && '*'}</Label>
                      {selectedProvider?.docsUrl && (
                        <a
                          href={selectedProvider.docsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          API Key nasıl alınır? ↗
                        </a>
                      )}
                    </div>
                    <div className="relative">
                      <Input
                        id="llmApiKey"
                        type={showLlmKey ? 'text' : 'password'}
                        value={llmSettings.llmApiKey}
                        onChange={(e) => setLlmSettings({ ...llmSettings, llmApiKey: e.target.value })}
                        placeholder={selectedProvider?.keyPlaceholder || 'API Key'}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                        onClick={() => setShowLlmKey(!showLlmKey)}
                      >
                        {showLlmKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Base URL */}
                  <div className="space-y-2">
                    <Label htmlFor="llmBaseUrl">API Base URL</Label>
                    <Input
                      id="llmBaseUrl"
                      value={llmSettings.llmBaseUrl}
                      onChange={(e) => setLlmSettings({ ...llmSettings, llmBaseUrl: e.target.value })}
                      placeholder="https://api.openai.com/v1"
                    />
                    <p className="text-xs text-muted-foreground">
                      Varsayılan URL otomatik doldurulur. Proxy veya özel endpoint kullanıyorsanız değiştirin.
                    </p>
                  </div>

                  {/* Model Seçimi */}
                  <div className="space-y-2">
                    <Label>Model</Label>
                    {selectedProvider && selectedProvider.models.length > 0 ? (
                      <div className="space-y-3">
                        <Select
                          value={llmSettings.llmModel}
                          onValueChange={(v) => setLlmSettings({ ...llmSettings, llmModel: v, llmCustomModel: v === '__custom__' ? llmSettings.llmCustomModel : '' })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Model seçin" />
                          </SelectTrigger>
                          <SelectContent>
                            {selectedProvider.models.map((m) => (
                              <SelectItem key={m} value={m}>{m}</SelectItem>
                            ))}
                            <SelectItem value="__custom__">✏️ Özel model adı gir...</SelectItem>
                          </SelectContent>
                        </Select>
                        {llmSettings.llmModel === '__custom__' && (
                          <Input
                            value={llmSettings.llmCustomModel}
                            onChange={(e) => setLlmSettings({ ...llmSettings, llmCustomModel: e.target.value })}
                            placeholder="Özel model adı (örn: gpt-4o-2024-08-06)"
                          />
                        )}
                      </div>
                    ) : (
                      <Input
                        value={llmSettings.llmCustomModel}
                        onChange={(e) => setLlmSettings({ ...llmSettings, llmCustomModel: e.target.value })}
                        placeholder="Model adı (örn: llama3, mistral vb.)"
                      />
                    )}
                  </div>

                  {/* Mevcut Konfigürasyon Özeti */}
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-3">Yapılandırma Özeti</h4>
                    <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Sağlayıcı:</span>
                        <span className="font-medium">{selectedProvider?.name || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Base URL:</span>
                        <span className="font-mono text-xs">{llmSettings.llmBaseUrl || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Model:</span>
                        <span className="font-medium">
                          {llmSettings.llmModel === '__custom__'
                            ? llmSettings.llmCustomModel || '-'
                            : llmSettings.llmModel || llmSettings.llmCustomModel || '-'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">API Key:</span>
                        <span>{llmSettings.llmApiKey ? '••••••••' + llmSettings.llmApiKey.slice(-4) : 'Girilmedi'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Durum:</span>
                        {llmSettings.llmEnabled === 'true' ? (
                          <Badge className="bg-green-100 text-green-800">Aktif</Badge>
                        ) : (
                          <Badge variant="secondary">Pasif</Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Test Sonucu */}
                  {llmTestResult && (
                    <div className="border rounded-lg p-4 bg-green-50 border-green-200">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-green-800">Bağlantı Başarılı</span>
                      </div>
                      <p className="text-sm text-green-700">{llmTestResult}</p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {llmSettings.llmProvider && (
            <div className="flex justify-between">
              <Button variant="outline" onClick={handleTestLlm} disabled={testingLlm}>
                {testingLlm ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Test Ediliyor...</> : <><Bot className="h-4 w-4 mr-2" /> Bağlantıyı Test Et</>}
              </Button>
              <Button onClick={handleSaveLlm} disabled={savingLlm}>
                <Save className="h-4 w-4 mr-2" />
                {savingLlm ? 'Kaydediliyor...' : 'LLM Ayarlarını Kaydet'}
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
