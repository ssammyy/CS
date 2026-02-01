import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface ThemeColors {
  primary: string;
  mint: string;
  coral: string;
  sky: string;
}

export const SYSTEM_THEME_COLORS: ThemeColors = {
  primary: '#a1c7f8',
  mint: '#cbebd0',
  coral: '#f99e98',
  sky: '#a1c7f8',
};

@Injectable({
  providedIn: 'root'
})
export class PdfReportService {

  constructor() { }

  /**
   * Convert hex color to RGB for PDF rendering
   */
  private hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      return [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
      ];
    }
    return [161, 199, 248]; // Default to brand-sky
  }

  /**
   * Generate PDF from HTML element
   */
  async generatePdfFromElement(
    element: HTMLElement,
    filename: string,
    options?: {
      pageFormat?: 'a4' | 'letter';
      orientation?: 'portrait' | 'landscape';
    }
  ): Promise<void> {
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pageFormat = options?.pageFormat || 'a4';
      const orientation = options?.orientation || 'portrait';

      const pdf = new jsPDF({
        orientation,
        unit: 'mm',
        format: pageFormat
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 10;

      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - 20;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight - 20;
      }

      pdf.save(filename);
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
  }

  /**
   * Generate colored PDF header section
   */
  createPdfHeader(
    pdf: jsPDF,
    title: string,
    subtitle: string,
    startY: number = 15,
    themeColor: string = SYSTEM_THEME_COLORS.sky
  ): number {
    const rgb = this.hexToRgb(themeColor);

    // Add colored header background
    pdf.setFillColor(rgb[0], rgb[1], rgb[2]);
    pdf.rect(0, startY - 10, pdf.internal.pageSize.getWidth(), 25, 'F');

    // Add title
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(22);
    pdf.setTextColor(255, 255, 255);
    pdf.text(title, 15, startY + 8);

    // Add subtitle
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(240, 240, 240);
    pdf.text(subtitle, 15, startY + 16);

    // Reset text color
    pdf.setTextColor(0, 0, 0);

    return startY + 30;
  }

  /**
   * Create a stats card section in PDF
   */
  createStatsCard(
    pdf: jsPDF,
    startY: number,
    label: string,
    value: string,
    unit: string = '',
    themeColor: string = SYSTEM_THEME_COLORS.mint,
    x: number = 15,
    width: number = 40,
    height: number = 25
  ): void {
    const rgb = this.hexToRgb(themeColor);

    // Light background
    pdf.setFillColor(rgb[0] + 30, rgb[1] + 30, rgb[2] + 30);
    pdf.roundedRect(x, startY, width, height, 2, 2, 'F');

    // Border
    pdf.setDrawColor(rgb[0], rgb[1], rgb[2]);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(x, startY, width, height, 2, 2);

    // Label
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(80, 80, 80);
    pdf.text(label, x + 3, startY + 5);

    // Value
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.setTextColor(rgb[0] - 30, rgb[1] - 30, rgb[2] - 30);
    pdf.text(value, x + 3, startY + 15);

    // Unit
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(120, 120, 120);
    pdf.text(unit, x + 3, startY + 22);
  }

  /**
   * Create table section in PDF
   */
  createTable(
    pdf: jsPDF,
    startY: number,
    headers: string[],
    rows: (string | number)[][],
    options?: {
      columnWidths?: number[];
      rowHeight?: number;
      headerColor?: string;
      alternateRowColor?: string;
    }
  ): number {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const columnWidths = options?.columnWidths || headers.map(() => (pageWidth - 30) / headers.length);
    const rowHeight = options?.rowHeight || 7;
    const headerColor = options?.headerColor || SYSTEM_THEME_COLORS.sky;
    const alternateRowColor = options?.alternateRowColor || '#f5f5f5';

    const headerRgb = this.hexToRgb(headerColor);
    const altRgb = this.hexToRgb(alternateRowColor);

    let currentY = startY;

    // Header row
    pdf.setFillColor(headerRgb[0], headerRgb[1], headerRgb[2]);
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);

    let currentX = 15;
    headers.forEach((header, index) => {
      pdf.rect(currentX, currentY, columnWidths[index], rowHeight, 'F');
      pdf.text(header, currentX + 2, currentY + 5);
      currentX += columnWidths[index];
    });

    currentY += rowHeight;

    // Data rows
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(0, 0, 0);

    rows.forEach((row, rowIndex) => {
      // Alternate row colors
      if (rowIndex % 2 === 1) {
        pdf.setFillColor(altRgb[0], altRgb[1], altRgb[2]);
        currentX = 15;
        columnWidths.forEach(width => {
          pdf.rect(currentX, currentY, width, rowHeight, 'F');
          currentX += width;
        });
      }

      currentX = 15;
      row.forEach((cell, cellIndex) => {
        pdf.text(String(cell), currentX + 2, currentY + 5);
        currentX += columnWidths[cellIndex];
      });

      currentY += rowHeight;
    });

    return currentY + 5;
  }

  /**
   * Add footer to PDF
   */
  addFooter(pdf: jsPDF, generatedDate: Date): void {
    const pageCount = pdf.getNumberOfPages();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);

    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);

      // Page number
      pdf.text(
        `Page ${i} of ${pageCount}`,
        pageWidth / 2,
        pageHeight - 8,
        { align: 'center' }
      );

      // Generated date
      const dateStr = generatedDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      pdf.text(`Generated: ${dateStr}`, 15, pageHeight - 8);
    }
  }
}
