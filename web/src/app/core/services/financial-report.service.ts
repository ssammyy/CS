import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import jsPDF from 'jspdf';
import { PdfReportService, SYSTEM_THEME_COLORS } from './pdf-report.service';
import { environment } from '../../../environments/environment';

export interface FinancialReportDto {
  startDate: string;
  endDate: string;
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  grossProfitMargin: number;
  totalSales: number;
  totalCreditSales: number;
  totalCashSales: number;
  creditPaymentsReceived: number;
  totalExpenses: number;
  grossProfitAfterExpense: number;
  expenseAsPercentOfRevenue: number;
  revenueByPaymentMethod: PaymentMethodRevenueDto[];
  dailyRevenue: DailyRevenueDto[];
}

export interface PaymentMethodRevenueDto {
  paymentMethod: string;
  amount: number;
  percentage: number;
}

export interface DailyRevenueDto {
  date: string;
  revenue: number;
  salesCount: number;
}

export interface InventoryReportDto {
  totalItems: number;
  totalQuantity: number;
  totalStockValue: number;
  totalCostValue: number;
  lowStockItems: LowStockItemDto[];
  expiringItems: ExpiringItemDto[];
  outOfStockItems: OutOfStockItemDto[];
}

export interface LowStockItemDto {
  productId: string;
  productName: string;
  currentStock: number;
  minStockLevel: number;
  stockValue: number;
}

export interface ExpiringItemDto {
  productId: string;
  productName: string;
  quantity: number;
  expiryDate: string;
  daysUntilExpiry: number;
  stockValue: number;
}

export interface OutOfStockItemDto {
  productId: string;
  productName: string;
  lastRestockDate: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class FinancialReportService {
  private readonly http = inject(HttpClient);
  private readonly pdfService = inject(PdfReportService);
  private apiUrl = `${environment.apiBaseUrl}/api/reports`;

  getFinancialReport(startDate: string, endDate: string, branchId?: string): Observable<FinancialReportDto> {
    let url = `${this.apiUrl}/financial?startDate=${startDate}&endDate=${endDate}`;
    if (branchId) {
      url += `&branchId=${branchId}`;
    }
    return this.http.get<FinancialReportDto>(url);
  }

  getInventoryReport(branchId?: string): Observable<InventoryReportDto> {
    let url = `${this.apiUrl}/inventory`;
    if (branchId) {
      url += `?branchId=${branchId}`;
    }
    return this.http.get<InventoryReportDto>(url);
  }

  /**
   * Generate Financial Report PDF
   */
  generateFinancialReportPdf(report: FinancialReportDto, branchName: string = 'All Branches'): void {
    const pdf = new jsPDF('portrait', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    let currentY = 15;

    // Header
    currentY = this.pdfService.createPdfHeader(
      pdf,
      'Financial Report',
      `${branchName} | ${report.startDate} to ${report.endDate}`,
      currentY,
      SYSTEM_THEME_COLORS.sky
    );

    // Summary Stats
    this.pdfService.createStatsCard(pdf, currentY, 'Total Revenue', this.formatCurrency(report.totalRevenue), 'KES', SYSTEM_THEME_COLORS.sky, 15, 40, 25);
    this.pdfService.createStatsCard(pdf, currentY, 'Gross Profit', this.formatCurrency(report.grossProfit), 'KES', SYSTEM_THEME_COLORS.mint, 60, 40, 25);
    this.pdfService.createStatsCard(pdf, currentY, 'Profit Margin', report.grossProfitMargin.toFixed(2), '%', SYSTEM_THEME_COLORS.coral, 105, 40, 25);
    this.pdfService.createStatsCard(pdf, currentY, 'Total Sales', report.totalSales.toString(), 'transactions', SYSTEM_THEME_COLORS.sky, 150, 40, 25);

    currentY += 35;

    // Expense & profit breakdown
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.setTextColor(0, 0, 0);
    pdf.text('Expense & Profit', 15, currentY);
    currentY += 8;

    const rgb = this.pdfService['hexToRgb'](SYSTEM_THEME_COLORS.mint);
    pdf.setFillColor(rgb[0] + 30, rgb[1] + 30, rgb[2] + 30);
    pdf.roundedRect(15, currentY, 70, 42, 2, 2, 'F');

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(0, 0, 0);
    let subY = currentY + 5;

    pdf.text(`Total Cost: ${this.formatCurrency(report.totalCost)}`, 18, subY);
    subY += 7;
    pdf.text(`Total Expenses: ${this.formatCurrency(report.totalExpenses ?? 0)}`, 18, subY);
    subY += 7;
    pdf.text(`Gross Profit After Expense: ${this.formatCurrency(report.grossProfitAfterExpense ?? report.grossProfit)}`, 18, subY);
    subY += 7;
    pdf.text(`Expense % of Revenue: ${(report.expenseAsPercentOfRevenue ?? 0).toFixed(2)}%`, 18, subY);

    // Payment Method Table
    currentY += 47;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.text('Revenue by Payment Method', 15, currentY);
    currentY += 8;

    const paymentHeaders = ['Payment Method', 'Amount (KES)', 'Percentage'];
    const paymentRows = report.revenueByPaymentMethod.map(p => [
      p.paymentMethod,
      this.formatCurrency(p.amount),
      `${p.percentage.toFixed(2)}%`
    ]);

    currentY = this.pdfService.createTable(pdf, currentY, paymentHeaders, paymentRows, {
      columnWidths: [50, 35, 30],
      headerColor: SYSTEM_THEME_COLORS.mint
    });

    // Daily Revenue Summary (last 10 days)
    if (report.dailyRevenue.length > 0) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.text('Recent Daily Revenue (Last 10 days)', 15, currentY);
      currentY += 8;

      const dailyHeaders = ['Date', 'Revenue (KES)', 'Transactions'];
      const dailyRows = report.dailyRevenue.slice(-10).map(d => [
        new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        this.formatCurrency(d.revenue),
        d.salesCount.toString()
      ]);

      currentY = this.pdfService.createTable(pdf, currentY, dailyHeaders, dailyRows, {
        columnWidths: [30, 35, 45],
        headerColor: SYSTEM_THEME_COLORS.coral
      });
    }

    // Add footer
    this.pdfService.addFooter(pdf, new Date());

    // Save PDF
    const fileName = `Financial_Report_${report.startDate}_to_${report.endDate}.pdf`;
    pdf.save(fileName);
  }

  /**
   * Generate Inventory Report PDF
   */
  generateInventoryReportPdf(report: InventoryReportDto, branchName: string = 'All Branches'): void {
    const pdf = new jsPDF('portrait', 'mm', 'a4');
    let currentY = 15;

    // Header
    currentY = this.pdfService.createPdfHeader(
      pdf,
      'Inventory Report',
      branchName,
      currentY,
      SYSTEM_THEME_COLORS.mint
    );

    // Summary Stats
    this.pdfService.createStatsCard(pdf, currentY, 'Total Items', report.totalItems.toString(), 'SKUs', SYSTEM_THEME_COLORS.mint, 15, 40, 25);
    this.pdfService.createStatsCard(pdf, currentY, 'Total Quantity', report.totalQuantity.toString(), 'units', SYSTEM_THEME_COLORS.sky, 60, 40, 25);
    this.pdfService.createStatsCard(pdf, currentY, 'Stock Value', this.formatCurrency(report.totalStockValue), 'KES', SYSTEM_THEME_COLORS.coral, 105, 40, 25);
    this.pdfService.createStatsCard(pdf, currentY, 'Cost Value', this.formatCurrency(report.totalCostValue), 'KES', SYSTEM_THEME_COLORS.sky, 150, 40, 25);

    currentY += 35;

    // Low Stock Items
    if (report.lowStockItems.length > 0) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      pdf.text(`Low Stock Items (${report.lowStockItems.length})`, 15, currentY);
      currentY += 8;

      const lowStockHeaders = ['Product', 'Current Stock', 'Min Level', 'Value (KES)'];
      const lowStockRows = report.lowStockItems.slice(0, 10).map(item => [
        item.productName.substring(0, 25),
        item.currentStock.toString(),
        item.minStockLevel.toString(),
        this.formatCurrency(item.stockValue)
      ]);

      currentY = this.pdfService.createTable(pdf, currentY, lowStockHeaders, lowStockRows, {
        columnWidths: [50, 25, 25, 40],
        headerColor: '#FF9800' // Orange
      });
    }

    // Out of Stock Items
    if (report.outOfStockItems.length > 0) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      pdf.text(`Out of Stock Items (${report.outOfStockItems.length})`, 15, currentY);
      currentY += 8;

      const outOfStockHeaders = ['Product', 'Last Restock Date'];
      const outOfStockRows = report.outOfStockItems.slice(0, 10).map(item => [
        item.productName.substring(0, 35),
        item.lastRestockDate ? new Date(item.lastRestockDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : 'N/A'
      ]);

      currentY = this.pdfService.createTable(pdf, currentY, outOfStockHeaders, outOfStockRows, {
        columnWidths: [60, 45],
        headerColor: '#F44336' // Red
      });
    }

    // Expiring Items
    if (report.expiringItems.length > 0) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      pdf.text(`Expiring Soon (${report.expiringItems.length})`, 15, currentY);
      currentY += 8;

      const expiringHeaders = ['Product', 'Quantity', 'Expiry Date', 'Days Left'];
      const expiringRows = report.expiringItems.slice(0, 10).map(item => [
        item.productName.substring(0, 25),
        item.quantity.toString(),
        new Date(item.expiryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        item.daysUntilExpiry.toString()
      ]);

      currentY = this.pdfService.createTable(pdf, currentY, expiringHeaders, expiringRows, {
        columnWidths: [50, 20, 25, 30],
        headerColor: '#FFEB3B' // Yellow
      });
    }

    // Add footer
    this.pdfService.addFooter(pdf, new Date());

    // Save PDF
    const fileName = `Inventory_Report_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }
}
