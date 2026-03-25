import * as XLSX from 'xlsx';

export interface ExportColumn {
  header: string;
  key: string;
  width?: number;
}

// jsPDF ve autoTable'ı dinamik olarak yükle (client-side only)
const getJsPDF = async () => {
  if (typeof window === 'undefined') {
    throw new Error('PDF export is only available on client side');
  }
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  return { jsPDF, autoTable };
};

export function exportToExcel(
  data: any[],
  columns: ExportColumn[],
  fileName: string,
  sheetName: string = 'Veri'
) {
  // Transform data to match column headers
  const exportData = data.map(row => {
    const newRow: any = {};
    columns.forEach(col => {
      newRow[col.header] = row[col.key] ?? '';
    });
    return newRow;
  });

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  
  // Set column widths
  const colWidths = columns.map(col => ({ wch: col.width || 20 }));
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}

export async function exportToPDF(
  data: any[],
  columns: ExportColumn[],
  fileName: string,
  title: string
) {
  const { jsPDF, autoTable } = await getJsPDF();
  const doc = new jsPDF('l', 'mm', 'a4');
  
  // Add title
  doc.setFontSize(18);
  doc.text(title, 14, 20);
  
  // Add date
  doc.setFontSize(10);
  doc.text(`Olusturma Tarihi: ${new Date().toLocaleDateString('tr-TR')}`, 14, 28);

  // Prepare table data
  const headers = columns.map(col => col.header);
  const rows = data.map(row => 
    columns.map(col => {
      const value = row[col.key];
      if (value === null || value === undefined) return '';
      if (typeof value === 'boolean') return value ? 'Evet' : 'Hayir';
      return String(value);
    })
  );

  // Add table using autoTable function
  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 35,
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250],
    },
  });

  doc.save(`${fileName}.pdf`);
}

// Status translations
export const statusLabels: Record<string, string> = {
  // Document statuses
  DRAFT: 'Taslak',
  PENDING_APPROVAL: 'Onay Bekliyor',
  APPROVED: 'Onaylandı',
  REJECTED: 'Reddedildi',
  ARCHIVED: 'Arşivlendi',
  OBSOLETE: 'Geçersiz',
  
  // Complaint statuses
  YENI: 'Yeni',
  INCELENIYOR: 'İnceleniyor',
  COZUMLENDI: 'Çözümlendi',
  KAPATILDI: 'Kapatıldı',
  IPTAL: 'İptal',
  
  // CAPA statuses
  ACIK: 'Açık',
  ANALIZ: 'Analiz',
  UYGULAMA: 'Uygulama',
  DOGRULAMA: 'Doğrulama',
  TAMAMLANDI: 'Tamamlandı',
  
  // Audit statuses
  PLANLANDI: 'Planlandı',
  DEVAM_EDIYOR: 'Devam Ediyor',
  RAPORLAMA: 'Raporlama',
  
  // Risk statuses
  TANIMLANDI: 'Tanımlandı',
  DEGERLENDIRILIYOR: 'Değerlendiriliyor',
  IZLENIYOR: 'İzleniyor',
  AZALTILDI: 'Azaltıldı',
  KABUL_EDILDI: 'Kabul Edildi',
  TRANSFER_EDILDI: 'Transfer Edildi',
  
  // Equipment statuses
  AKTIF: 'Aktif',
  BAKIM_BEKLIYOR: 'Bakım Bekliyor',
  BAKIMDA: 'Bakımda',
  KALIBRASYON_BEKLIYOR: 'Kalibrasyon Bekliyor',
  KALIBRASYONDA: 'Kalibrasyonda',
  ARIZALI: 'Arızalı',
  DEVRE_DISI: 'Devre Dışı',
  HURDA: 'Hurda',
  
  // Supplier statuses
  ONAY_BEKLIYOR: 'Onay Bekliyor',
  ONAYLI: 'Onaylı',
  ASKIYA_ALINDI: 'Askıya Alındı',
  KARA_LISTE: 'Kara Liste',
  
  // Priority labels
  DUSUK: 'Düşük',
  ORTA: 'Orta',
  YUKSEK: 'Yüksek',
  ACIL: 'Acil',
  KRITIK: 'Kritik',
  
  // General
  BEKLIYOR: 'Bekliyor',
  ILERLEME: 'İlerleme',
  TASLAK: 'Taslak',
  GECIKTI: 'Gecikti',
};

export function getStatusLabel(status: string): string {
  return statusLabels[status] || status;
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('tr-TR');
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '-';
  return new Date(date).toLocaleString('tr-TR');
}

// SWOT Matrix Export
export async function exportSWOTMatrix(
  study: {
    code: string;
    title: string;
    period?: { name: string };
    department?: { name: string };
    items: Array<{
      type: string;
      title: string;
      description?: string;
      impactLevel?: number;
      priority?: number;
    }>;
  },
  fileName: string
) {
  const { jsPDF } = await getJsPDF();
  const doc = new jsPDF('l', 'mm', 'a4');
  
  // Title
  doc.setFontSize(18);
  doc.text(`SWOT Analizi - ${study.code}`, 14, 20);
  doc.setFontSize(12);
  doc.text(study.title, 14, 28);
  doc.setFontSize(10);
  if (study.period) doc.text(`Dönem: ${study.period.name}`, 14, 35);
  if (study.department) doc.text(`Departman: ${study.department.name}`, 14, 42);
  doc.text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`, 14, 49);

  const strengths = study.items.filter(i => i.type === 'STRENGTH');
  const weaknesses = study.items.filter(i => i.type === 'WEAKNESS');
  const opportunities = study.items.filter(i => i.type === 'OPPORTUNITY');
  const threats = study.items.filter(i => i.type === 'THREAT');

  // SWOT 2x2 Matrix
  const startY = 60;
  const cellWidth = 130;
  const cellHeight = 80;
  const margin = 14;

  // Headers
  doc.setFillColor(59, 130, 246);
  doc.setTextColor(255);
  doc.setFontSize(12);
  
  // Strengths box
  doc.setFillColor(34, 197, 94);
  doc.rect(margin, startY, cellWidth, 10, 'F');
  doc.text('GÜÇLÜ YÖNLER (S)', margin + 5, startY + 7);
  
  // Weaknesses box
  doc.setFillColor(239, 68, 68);
  doc.rect(margin + cellWidth + 5, startY, cellWidth, 10, 'F');
  doc.text('ZAYIF YÖNLER (W)', margin + cellWidth + 10, startY + 7);
  
  // Opportunities box
  doc.setFillColor(59, 130, 246);
  doc.rect(margin, startY + cellHeight + 15, cellWidth, 10, 'F');
  doc.text('FIRSATLAR (O)', margin + 5, startY + cellHeight + 22);
  
  // Threats box
  doc.setFillColor(249, 115, 22);
  doc.rect(margin + cellWidth + 5, startY + cellHeight + 15, cellWidth, 10, 'F');
  doc.text('TEHDİTLER (T)', margin + cellWidth + 10, startY + cellHeight + 22);

  // Content
  doc.setTextColor(0);
  doc.setFontSize(9);

  const drawItems = (items: typeof strengths, x: number, y: number) => {
    let currentY = y;
    items.slice(0, 8).forEach((item, idx) => {
      const text = `${idx + 1}. ${item.title}`;
      const lines = doc.splitTextToSize(text, cellWidth - 10);
      doc.text(lines, x, currentY);
      currentY += lines.length * 4 + 2;
    });
  };

  drawItems(strengths, margin + 5, startY + 18);
  drawItems(weaknesses, margin + cellWidth + 10, startY + 18);
  drawItems(opportunities, margin + 5, startY + cellHeight + 33);
  drawItems(threats, margin + cellWidth + 10, startY + cellHeight + 33);

  doc.save(`${fileName}.pdf`);
}

export function exportSWOTToExcel(
  study: {
    code: string;
    title: string;
    period?: { name: string };
    department?: { name: string };
    items: Array<{
      type: string;
      title: string;
      description?: string;
      impactLevel?: number;
      priority?: number;
    }>;
  },
  fileName: string
) {
  const typeLabels: Record<string, string> = {
    STRENGTH: 'Güçlü Yön',
    WEAKNESS: 'Zayıf Yön',
    OPPORTUNITY: 'Fırsat',
    THREAT: 'Tehdit',
  };

  const data = study.items.map(item => ({
    'Tip': typeLabels[item.type] || item.type,
    'Başlık': item.title,
    'Açıklama': item.description || '',
    'Etki Seviyesi': item.impactLevel || '',
    'Öncelik': item.priority || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  worksheet['!cols'] = [{ wch: 15 }, { wch: 40 }, { wch: 60 }, { wch: 15 }, { wch: 10 }];
  
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'SWOT Analizi');
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}

// PESTEL Matrix Export
export async function exportPESTELMatrix(
  study: {
    code: string;
    title: string;
    period?: { name: string };
    department?: { name: string };
    factors: Array<{
      category: string;
      title: string;
      description?: string;
      impactType?: string;
      impactLevel?: number;
      probability?: number;
      timeframe?: string;
    }>;
  },
  fileName: string
) {
  const { jsPDF, autoTable } = await getJsPDF();
  const doc = new jsPDF('l', 'mm', 'a4');
  
  doc.setFontSize(18);
  doc.text(`PESTEL Analizi - ${study.code}`, 14, 20);
  doc.setFontSize(12);
  doc.text(study.title, 14, 28);
  doc.setFontSize(10);
  if (study.period) doc.text(`Donem: ${study.period.name}`, 14, 35);
  if (study.department) doc.text(`Departman: ${study.department.name}`, 14, 42);
  doc.text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`, 14, 49);

  const categoryLabels: Record<string, string> = {
    POLITICAL: 'Politik',
    ECONOMIC: 'Ekonomik',
    SOCIAL: 'Sosyal',
    TECHNOLOGICAL: 'Teknolojik',
    ENVIRONMENTAL: 'Cevresel',
    LEGAL: 'Yasal',
  };

  const impactLabels: Record<string, string> = {
    FIRSAT: 'Firsat',
    TEHDIT: 'Tehdit',
    NOTR: 'Notr',
  };

  const headers = ['Kategori', 'Baslik', 'Etki Tipi', 'Etki', 'Olasilik', 'Zaman'];
  const rows = study.factors.map(f => [
    categoryLabels[f.category] || f.category,
    f.title,
    impactLabels[f.impactType || ''] || f.impactType || '',
    f.impactLevel?.toString() || '',
    f.probability?.toString() || '',
    f.timeframe || '',
  ]);

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 55,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 80 },
      2: { cellWidth: 25 },
      3: { cellWidth: 20 },
      4: { cellWidth: 20 },
      5: { cellWidth: 25 },
    },
  });

  doc.save(`${fileName}.pdf`);
}

export function exportPESTELToExcel(
  study: {
    code: string;
    title: string;
    factors: Array<{
      category: string;
      title: string;
      description?: string;
      impactType?: string;
      impactLevel?: number;
      probability?: number;
      timeframe?: string;
    }>;
  },
  fileName: string
) {
  const categoryLabels: Record<string, string> = {
    POLITICAL: 'Politik',
    ECONOMIC: 'Ekonomik',
    SOCIAL: 'Sosyal',
    TECHNOLOGICAL: 'Teknolojik',
    ENVIRONMENTAL: 'Çevresel',
    LEGAL: 'Yasal',
  };

  const impactLabels: Record<string, string> = {
    FIRSAT: 'Fırsat',
    TEHDIT: 'Tehdit',
    NOTR: 'Nötr',
  };

  const data = study.factors.map(f => ({
    'Kategori': categoryLabels[f.category] || f.category,
    'Başlık': f.title,
    'Açıklama': f.description || '',
    'Etki Tipi': impactLabels[f.impactType || ''] || f.impactType || '',
    'Etki Seviyesi': f.impactLevel || '',
    'Olasılık': f.probability || '',
    'Zaman Dilimi': f.timeframe || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  worksheet['!cols'] = [{ wch: 15 }, { wch: 40 }, { wch: 60 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 15 }];
  
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'PESTEL Analizi');
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}

// Strategy Tree Export
export async function exportStrategyTree(
  period: {
    name: string;
    startDate: string;
    endDate: string;
    mission?: { content: string };
    vision?: { content: string };
    objectives: Array<{
      code: string;
      name: string;
      perspective?: { name: string };
      goals: Array<{
        code: string;
        name: string;
        targetValue?: number;
        currentValue?: number;
        subGoals: Array<{
          code: string;
          name: string;
          actions: Array<{
            code: string;
            name: string;
            status: string;
            progress?: number;
          }>;
        }>;
        actions: Array<{
          code: string;
          name: string;
          status: string;
          progress?: number;
        }>;
      }>;
    }>;
  },
  fileName: string
) {
  const { jsPDF, autoTable } = await getJsPDF();
  const doc = new jsPDF('p', 'mm', 'a4');
  
  doc.setFontSize(18);
  doc.text(`Strateji Haritasi - ${period.name}`, 14, 20);
  doc.setFontSize(10);
  doc.text(`Donem: ${formatDate(period.startDate)} - ${formatDate(period.endDate)}`, 14, 28);
  doc.text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`, 14, 35);

  let y = 45;

  // Mission & Vision
  if (period.mission) {
    doc.setFontSize(11);
    doc.setTextColor(59, 130, 246);
    doc.text('MISYON', 14, y);
    doc.setTextColor(0);
    doc.setFontSize(9);
    const missionLines = doc.splitTextToSize(period.mission.content, 180);
    doc.text(missionLines, 14, y + 6);
    y += missionLines.length * 4 + 12;
  }

  if (period.vision) {
    doc.setFontSize(11);
    doc.setTextColor(59, 130, 246);
    doc.text('VIZYON', 14, y);
    doc.setTextColor(0);
    doc.setFontSize(9);
    const visionLines = doc.splitTextToSize(period.vision.content, 180);
    doc.text(visionLines, 14, y + 6);
    y += visionLines.length * 4 + 12;
  }

  // Objectives table
  const rows: string[][] = [];
  period.objectives.forEach(obj => {
    rows.push([obj.code, obj.name, obj.perspective?.name || '', '', '', '']);
    obj.goals.forEach(goal => {
      rows.push(['', `  - ${goal.code}`, goal.name, goal.targetValue?.toString() || '', goal.currentValue?.toString() || '', '']);
      goal.subGoals?.forEach(sub => {
        rows.push(['', '', `    - ${sub.code}: ${sub.name}`, '', '', '']);
      });
    });
  });

  autoTable(doc, {
    head: [['Amac Kodu', 'Amac/Hedef', 'Perspektif', 'Hedef', 'Gerceklesen', 'Durum']],
    body: rows,
    startY: y,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [59, 130, 246], textColor: 255 },
  });

  doc.save(`${fileName}.pdf`);
}

export function exportStrategyToExcel(
  period: {
    name: string;
    objectives: Array<{
      code: string;
      name: string;
      perspective?: { name: string };
      goals: Array<{
        code: string;
        name: string;
        targetValue?: number;
        currentValue?: number;
        subGoals: Array<{
          code: string;
          name: string;
        }>;
      }>;
    }>;
  },
  fileName: string
) {
  const data: any[] = [];
  
  period.objectives.forEach(obj => {
    data.push({
      'Seviye': 'Amaç',
      'Kod': obj.code,
      'Ad': obj.name,
      'Perspektif': obj.perspective?.name || '',
      'Hedef Değer': '',
      'Gerçekleşen': '',
    });
    
    obj.goals.forEach(goal => {
      data.push({
        'Seviye': 'Hedef',
        'Kod': goal.code,
        'Ad': goal.name,
        'Perspektif': '',
        'Hedef Değer': goal.targetValue || '',
        'Gerçekleşen': goal.currentValue || '',
      });
      
      goal.subGoals?.forEach(sub => {
        data.push({
          'Seviye': 'Alt Hedef',
          'Kod': sub.code,
          'Ad': sub.name,
          'Perspektif': '',
          'Hedef Değer': '',
          'Gerçekleşen': '',
        });
      });
    });
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  worksheet['!cols'] = [{ wch: 12 }, { wch: 15 }, { wch: 50 }, { wch: 20 }, { wch: 15 }, { wch: 15 }];
  
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Strateji Ağacı');
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}

// Action Plan Export
export async function exportActionPlan(
  actions: Array<{
    code: string;
    name: string;
    description?: string;
    status: string;
    priority?: string;
    progress?: number;
    startDate?: string;
    dueDate?: string;
    plannedBudget?: number;
    actualBudget?: number;
    currency?: string;
    department?: { name: string };
    responsible?: { name: string };
    goal?: { name: string; code: string };
    subGoal?: { name: string; code: string };
  }>,
  fileName: string,
  title: string
) {
  const { jsPDF, autoTable } = await getJsPDF();
  const doc = new jsPDF('l', 'mm', 'a4');
  
  doc.setFontSize(18);
  doc.text(title, 14, 20);
  doc.setFontSize(10);
  doc.text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`, 14, 28);
  doc.text(`Toplam Aksiyon: ${actions.length}`, 14, 35);

  const statusLabelsLocal: Record<string, string> = {
    PLANLI: 'Planli',
    DEVAM_EDIYOR: 'Devam Ediyor',
    BEKLEMEDE: 'Beklemede',
    TAMAMLANDI: 'Tamamlandi',
    IPTAL: 'Iptal',
    GECIKTI: 'Gecikti',
  };

  const priorityLabelsLocal: Record<string, string> = {
    DUSUK: 'Dusuk',
    ORTA: 'Orta',
    YUKSEK: 'Yuksek',
    KRITIK: 'Kritik',
  };

  const headers = ['Kod', 'Aksiyon', 'Durum', 'Ilerleme', 'Sorumlu', 'Bitis', 'Butce'];
  const rows = actions.map(a => [
    a.code,
    a.name.substring(0, 40) + (a.name.length > 40 ? '...' : ''),
    statusLabelsLocal[a.status] || a.status,
    `${a.progress || 0}%`,
    a.responsible?.name || '-',
    formatDate(a.dueDate),
    a.plannedBudget ? `${a.plannedBudget.toLocaleString()} ${a.currency || 'TRY'}` : '-',
  ]);

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 42,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 80 },
      2: { cellWidth: 25 },
      3: { cellWidth: 20 },
      4: { cellWidth: 35 },
      5: { cellWidth: 25 },
      6: { cellWidth: 35 },
    },
  });

  doc.save(`${fileName}.pdf`);
}

export function exportActionsToExcel(
  actions: Array<{
    code: string;
    name: string;
    description?: string;
    status: string;
    priority?: string;
    progress?: number;
    startDate?: string;
    dueDate?: string;
    plannedBudget?: number;
    actualBudget?: number;
    currency?: string;
    department?: { name: string };
    responsible?: { name: string };
    goal?: { name: string; code: string };
  }>,
  fileName: string
) {
  const statusLabelsLocal: Record<string, string> = {
    PLANLI: 'Planlı',
    DEVAM_EDIYOR: 'Devam Ediyor',
    BEKLEMEDE: 'Beklemede',
    TAMAMLANDI: 'Tamamlandı',
    IPTAL: 'İptal',
    GECIKTI: 'Gecikti',
  };

  const priorityLabelsLocal: Record<string, string> = {
    DUSUK: 'Düşük',
    ORTA: 'Orta',
    YUKSEK: 'Yüksek',
    KRITIK: 'Kritik',
  };

  const data = actions.map(a => ({
    'Kod': a.code,
    'Aksiyon Adı': a.name,
    'Açıklama': a.description || '',
    'Durum': statusLabelsLocal[a.status] || a.status,
    'Öncelik': priorityLabelsLocal[a.priority || ''] || a.priority || '',
    'İlerleme (%)': a.progress || 0,
    'Başlangıç': formatDate(a.startDate),
    'Bitiş': formatDate(a.dueDate),
    'Departman': a.department?.name || '',
    'Sorumlu': a.responsible?.name || '',
    'Bağlı Hedef': a.goal?.name || '',
    'Planlanan Bütçe': a.plannedBudget || '',
    'Gerçekleşen Bütçe': a.actualBudget || '',
    'Para Birimi': a.currency || 'TRY',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  worksheet['!cols'] = [
    { wch: 15 }, { wch: 40 }, { wch: 50 }, { wch: 15 }, { wch: 12 },
    { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 20 }, { wch: 20 },
    { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 12 },
  ];
  
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Aksiyon Planı');
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}

// Risk Heatmap Export
export async function exportRiskHeatmap(
  risks: Array<{
    code: string;
    title: string;
    category?: { name: string };
    probability: number;
    impact: number;
    riskScore: number;
    status: string;
    department?: { name: string };
    owner?: { name: string };
  }>,
  fileName: string,
  title: string
) {
  const { jsPDF, autoTable } = await getJsPDF();
  const doc = new jsPDF('l', 'mm', 'a4');
  
  doc.setFontSize(18);
  doc.text(title, 14, 20);
  doc.setFontSize(10);
  doc.text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`, 14, 28);
  doc.text(`Toplam Risk: ${risks.length}`, 14, 35);

  // Risk summary by level
  const critical = risks.filter(r => r.riskScore >= 20).length;
  const high = risks.filter(r => r.riskScore >= 12 && r.riskScore < 20).length;
  const medium = risks.filter(r => r.riskScore >= 6 && r.riskScore < 12).length;
  const low = risks.filter(r => r.riskScore < 6).length;

  doc.text(`Kritik: ${critical}  |  Yuksek: ${high}  |  Orta: ${medium}  |  Dusuk: ${low}`, 14, 42);

  // Draw 5x5 heatmap matrix
  const matrixStartX = 14;
  const matrixStartY = 55;
  const cellSize = 22;

  // Y-axis label (Probability)
  doc.setFontSize(10);
  doc.text('Olasilik', 5, matrixStartY + cellSize * 2.5, { angle: 90 });
  
  // X-axis label (Impact)
  doc.text('Etki', matrixStartX + cellSize * 2.5, matrixStartY + cellSize * 5 + 10);

  // Draw grid
  for (let prob = 5; prob >= 1; prob--) {
    for (let imp = 1; imp <= 5; imp++) {
      const x = matrixStartX + (imp - 1) * cellSize;
      const y = matrixStartY + (5 - prob) * cellSize;
      const score = prob * imp;
      
      // Color based on score
      if (score >= 20) doc.setFillColor(220, 38, 38); // Red
      else if (score >= 12) doc.setFillColor(249, 115, 22); // Orange
      else if (score >= 6) doc.setFillColor(234, 179, 8); // Yellow
      else doc.setFillColor(34, 197, 94); // Green
      
      doc.rect(x, y, cellSize, cellSize, 'F');
      doc.setDrawColor(255);
      doc.rect(x, y, cellSize, cellSize, 'S');

      // Count risks in this cell
      const count = risks.filter(r => r.probability === prob && r.impact === imp).length;
      if (count > 0) {
        doc.setTextColor(255);
        doc.setFontSize(12);
        doc.text(count.toString(), x + cellSize / 2 - 3, y + cellSize / 2 + 3);
      }
    }
  }

  // Axis numbers
  doc.setTextColor(0);
  doc.setFontSize(8);
  for (let i = 1; i <= 5; i++) {
    doc.text(i.toString(), matrixStartX + (i - 1) * cellSize + cellSize / 2 - 2, matrixStartY + cellSize * 5 + 5);
    doc.text((6 - i).toString(), matrixStartX - 5, matrixStartY + (i - 1) * cellSize + cellSize / 2 + 2);
  }

  // Risk list table
  const statusLabelsLocal: Record<string, string> = {
    TANIMLANDI: 'Tanimlandi',
    DEGERLENDIRILIYOR: 'Degerlendiriliyor',
    IZLENIYOR: 'Izleniyor',
    AZALTILDI: 'Azaltildi',
    KABUL_EDILDI: 'Kabul Edildi',
    KAPANDI: 'Kapandi',
  };

  const headers = ['Kod', 'Risk', 'Kategori', 'O', 'E', 'Skor', 'Durum', 'Sahip'];
  const rows = risks
    .sort((a, b) => b.riskScore - a.riskScore)
    .map(r => [
      r.code,
      r.title.substring(0, 35) + (r.title.length > 35 ? '...' : ''),
      r.category?.name || '-',
      r.probability.toString(),
      r.impact.toString(),
      r.riskScore.toString(),
      statusLabelsLocal[r.status] || r.status,
      r.owner?.name || '-',
    ]);

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: matrixStartY + cellSize * 5 + 20,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
  });

  doc.save(`${fileName}.pdf`);
}

export function exportRisksToExcel(
  risks: Array<{
    code: string;
    title: string;
    description?: string;
    category?: { name: string };
    probability: number;
    impact: number;
    riskScore: number;
    status: string;
    department?: { name: string };
    owner?: { name: string };
    mitigationPlan?: string;
  }>,
  fileName: string
) {
  const statusLabelsLocal: Record<string, string> = {
    TANIMLANDI: 'Tanımlandı',
    DEGERLENDIRILIYOR: 'Değerlendiriliyor',
    IZLENIYOR: 'İzleniyor',
    AZALTILDI: 'Azaltıldı',
    KABUL_EDILDI: 'Kabul Edildi',
    KAPANDI: 'Kapandı',
  };

  const getRiskLevel = (score: number) => {
    if (score >= 20) return 'Kritik';
    if (score >= 12) return 'Yüksek';
    if (score >= 6) return 'Orta';
    return 'Düşük';
  };

  const data = risks.map(r => ({
    'Kod': r.code,
    'Risk Adı': r.title,
    'Açıklama': r.description || '',
    'Kategori': r.category?.name || '',
    'Olasılık': r.probability,
    'Etki': r.impact,
    'Risk Skoru': r.riskScore,
    'Risk Seviyesi': getRiskLevel(r.riskScore),
    'Durum': statusLabelsLocal[r.status] || r.status,
    'Departman': r.department?.name || '',
    'Risk Sahibi': r.owner?.name || '',
    'Azaltma Planı': r.mitigationPlan || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  worksheet['!cols'] = [
    { wch: 15 }, { wch: 40 }, { wch: 50 }, { wch: 20 }, { wch: 10 },
    { wch: 10 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 20 },
    { wch: 20 }, { wch: 40 },
  ];
  
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Risk Envanteri');
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}
