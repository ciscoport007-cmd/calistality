export interface ModuleDefinition {
  key: string;
  label: string;
  description: string;
}

export const ALL_MODULES: ModuleDefinition[] = [
  { key: 'dashboard',      label: 'Ana Sayfa',                   description: 'Dashboard ve genel bakış' },
  { key: 'documents',      label: 'Dokümanlar',                  description: 'Doküman yönetimi ve arşiv' },
  { key: 'esignature',     label: 'e-İmza & Zimmet',             description: 'Dijital imza ve zimmet formu yönetimi' },
  { key: 'complaints',     label: 'Müşteri Şikayetleri',         description: 'Şikayet takip ve yönetimi' },
  { key: 'capas',          label: 'CAPA / DÖF',                  description: 'Düzeltici ve önleyici faaliyetler' },
  { key: 'meetings',       label: 'Toplantı Yönetimi',           description: 'Toplantı planlama ve takibi' },
  { key: 'audits',         label: 'Denetim Yönetimi',            description: 'İç ve dış denetimler' },
  { key: 'risks',          label: 'Risk Değerlendirmesi',        description: 'Risk tanımlama ve değerlendirme' },
  { key: 'equipment',      label: 'Ekipman Yönetimi',            description: 'Ekipman, bakım ve kalibrasyon' },
  { key: 'suppliers',      label: 'Tedarikçi Yönetimi',          description: 'Tedarikçi değerlendirme ve takip' },
  { key: 'haccp',          label: 'HACCP & Gıda Güvenliği',      description: 'Kritik kontrol noktaları ve gıda güvenliği' },
  { key: 'ohs',            label: 'İş Sağlığı ve Güvenliği',     description: 'İSG risk, kaza ve KKD yönetimi' },
  { key: 'kpis',           label: 'Ölçüm Yönetimi (KPI)',        description: 'KPI tanımlama ve ölçüm' },
  { key: 'trainings',      label: 'Eğitim Yönetimi',             description: 'Eğitim planları ve kayıtları' },
  { key: 'strategy',       label: 'Stratejik Planlama',          description: 'Strateji, hedefler ve SWOT/PESTEL' },
  { key: 'committees',     label: 'Komite Yönetimi',             description: 'Komiteler ve üye yönetimi' },
  { key: 'innovation',     label: 'İnovasyon Yönetimi',          description: 'Fikirler, projeler ve kanban' },
  { key: 'lqa',            label: 'LQA Kalite Değerlendirme',    description: 'Laboratuvar kalite değerlendirmesi' },
  { key: 'sustainability', label: 'Enerji & Çevre Yönetimi',     description: 'Enerji, su, atık ve karbon takibi' },
  { key: 'finance',        label: 'Finans Yönetimi',             description: 'Gelir, gider ve finansal performans takibi' },
  { key: 'management',     label: 'Yönetim',                     description: 'Kullanıcılar, roller, departmanlar ve ayarlar' },
];

export const ALL_MODULE_KEYS = ALL_MODULES.map((m) => m.key);

/** Admin ve yönetici rolleri tüm modüllere tam erişime sahiptir. */
export const FULL_ACCESS_ROLES = [
  'Admin',
  'Yönetici',
  'Strateji Ofisi',
  'Departman Müdürü',
  'Birim Sorumlusu',
];

export function hasFullAccess(role?: string | null): boolean {
  return FULL_ACCESS_ROLES.includes(role ?? '');
}
