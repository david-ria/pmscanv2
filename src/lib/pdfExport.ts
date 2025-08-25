import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { formatDurationHHMM } from '@/utils/timeFormat';

interface BreakdownData {
  name: string;
  percentage: number;
  avgPM: number;
  color: string;
  exposure: number;
}

interface ExportData {
  selectedPeriod: 'day' | 'week' | 'month' | 'year';
  selectedDate: Date;
  statisticalAnalysis: string;
  breakdownData: BreakdownData[];
  pmType: 'pm1' | 'pm25' | 'pm10';
  breakdownType: string;
}

export const generateAnalysisReport = async (data: ExportData): Promise<Blob> => {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let yPosition = 20;

  // Add title
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Rapport d\'Analyse de la Qualité de l\'Air', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 20;

  // Add period information
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  const periodText = getPeriodText(data.selectedPeriod, data.selectedDate);
  pdf.text(`Période: ${periodText}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  // Add generation date
  pdf.setFontSize(10);
  pdf.text(`Généré le: ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 20;

  // Add pollution breakdown section
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Répartition de la Pollution', 20, yPosition);
  yPosition += 10;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Type de particules: PM${data.pmType.replace('pm', '')}`, 20, yPosition);
  yPosition += 5;
  pdf.text(`Répartition par: ${getBreakdownTypeText(data.breakdownType)}`, 20, yPosition);
  yPosition += 15;

  // Add breakdown data table
  if (data.breakdownData.length > 0) {
    // Table headers
    pdf.setFont('helvetica', 'bold');
    pdf.text('Catégorie', 20, yPosition);
    pdf.text('Pourcentage', 80, yPosition);
    pdf.text('PM Moyen (μg/m³)', 130, yPosition);
    pdf.text('Exposition (min)', 170, yPosition);
    yPosition += 8;

    // Table data
    pdf.setFont('helvetica', 'normal');
    data.breakdownData.forEach((item) => {
      pdf.text(item.name, 20, yPosition);
      pdf.text(`${item.percentage.toFixed(1)}%`, 80, yPosition);
      pdf.text(`${Math.round(item.avgPM)}`, 130, yPosition);
      pdf.text(formatDurationHHMM(item.exposure), 170, yPosition);
      yPosition += 6;
    });
    yPosition += 15;
  }

  // Add statistical analysis section
  if (yPosition > pageHeight - 60) {
    pdf.addPage();
    yPosition = 20;
  }

  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Analyse Statistique', 20, yPosition);
  yPosition += 15;

  // Split analysis text into lines that fit the page
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  const analysisLines = pdf.splitTextToSize(data.statisticalAnalysis, pageWidth - 40);
  
  analysisLines.forEach((line: string) => {
    if (yPosition > pageHeight - 20) {
      pdf.addPage();
      yPosition = 20;
    }
    pdf.text(line, 20, yPosition);
    yPosition += 5;
  });

  return pdf.output('blob');
};

const getPeriodText = (period: string, date: Date): string => {
  const formatOptions = { locale: fr };

  switch (period) {
    case 'day':
      return format(date, 'dd MMMM yyyy', formatOptions);

    case 'week': {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay() + 1);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      return `Semaine du ${format(weekStart, 'dd MMM', formatOptions)} au ${format(
        weekEnd,
        'dd MMM yyyy',
        formatOptions
      )}`;
    }

    case 'month':
      return format(date, 'MMMM yyyy', formatOptions);

    case 'year':
      return format(date, 'yyyy', formatOptions);

    default:
      return format(date, 'dd/MM/yyyy', formatOptions);
  }
};


const getBreakdownTypeText = (breakdownType: string): string => {
  switch (breakdownType) {
    case 'location':
      return 'Localisation';
    case 'activity':
      return 'Activité';
    case 'autocontext':
      return 'Contexte automatique';
    default:
      return breakdownType;
  }
};

export const downloadPDF = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
