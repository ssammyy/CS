import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { NgxChartsModule } from '@swimlane/ngx-charts';

import {
  PrimaryButtonComponent,
  SecondaryButtonComponent,
  AccentButtonComponent,
  DangerButtonComponent,
  IconButtonComponent,
  TextButtonComponent
} from '../../../shared/components';

import { ReportService, FinancialReportDto, PaymentMethodRevenueDto } from '../services/report.service';
import { BranchesService, BranchDto } from '../../../core/services/branches.service';
import { FinancialReportService } from '../../../core/services/financial-report.service';

/**
 * Financial Report component showing sales revenue, costs, and profit metrics
 */
@Component({
  selector: 'app-financial-report',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatChipsModule,
    MatButtonModule,
    NgxChartsModule,
    PrimaryButtonComponent,
    SecondaryButtonComponent,
    AccentButtonComponent,
    DangerButtonComponent,
    IconButtonComponent,
    TextButtonComponent
  ],
  template: `
    <div class="min-h-screen bg-gray-50 p-6">
      <!-- Header -->
      <div class="mb-6">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold text-gray-900">Financial Report</h1>
            <p class="text-gray-600 mt-1">Revenue, costs, and profit analysis</p>
          </div>
          <div class="flex items-center gap-3">
            <button
              mat-stroked-button
              (click)="generateReport()"
              [disabled]="loading"
              class="!py-2">
              <mat-icon>refresh</mat-icon>
              Generate
            </button>
            <button
              mat-stroked-button
              (click)="downloadPDF()"
              [disabled]="!report || loading"
              class="!py-2 !text-brand-sky hover:!bg-brand-sky/10">
              <mat-icon>file_download</mat-icon>
              Download PDF
            </button>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="bg-white rounded-lg shadow p-6 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              [(ngModel)]="startDate"
              (change)="generateReport()"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-sky focus:border-transparent">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              [(ngModel)]="endDate"
              (change)="generateReport()"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-sky focus:border-transparent">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Branch</label>
            <select
              [(ngModel)]="selectedBranchId"
              (change)="onBranchChange()"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-sky focus:border-transparent">
              <option [value]="''">All Branches</option>
              <option *ngFor="let branch of branches" [value]="branch.id">
                {{ branch.name }}
              </option>
            </select>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="flex justify-center items-center py-12">
        <mat-spinner></mat-spinner>
      </div>

      <!-- Report Data -->
      <div *ngIf="!loading && report" class="space-y-6">
        <!-- Key Metrics -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <!-- Total Revenue -->
          <div class="bg-white rounded-lg shadow p-4 border-l-4 border-brand-sky">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Total Revenue</p>
                <p class="text-2xl font-bold text-gray-900">
                  {{ report.totalRevenue | currency: 'KES' }}
                </p>
              </div>
              <div class="p-2 bg-brand-sky/20 rounded-lg">
                <mat-icon class="text-brand-sky">trending_up</mat-icon>
              </div>
            </div>
          </div>

          <!-- Gross Profit -->
          <div class="bg-white rounded-lg shadow p-4 border-l-4 border-brand-mint">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Gross Profit</p>
                <p class="text-2xl font-bold text-gray-900">
                  {{ report.grossProfit | currency: 'KES' }}
                </p>
              </div>
              <div class="p-2 bg-brand-mint/20 rounded-lg">
                <mat-icon class="text-brand-mint">show_chart</mat-icon>
              </div>
            </div>
            <p class="text-xs text-gray-500 mt-2">{{ report.grossProfitMargin.toFixed(2) }}% margin</p>
          </div>

          <!-- Total Cost -->
          <div class="bg-white rounded-lg shadow p-4 border-l-4 border-brand-coral">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Total Cost</p>
                <p class="text-2xl font-bold text-gray-900">
                  {{ report.totalCost | currency: 'KES' }}
                </p>
              </div>
              <div class="p-2 bg-brand-coral/20 rounded-lg">
                <mat-icon class="text-brand-coral">account_balance</mat-icon>
              </div>
            </div>
          </div>

          <!-- Sales Count -->
          <div class="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Total Sales</p>
                <p class="text-2xl font-bold text-gray-900">{{ report.totalSales }}</p>
              </div>
              <div class="p-2 bg-orange-500/20 rounded-lg">
                <mat-icon class="text-orange-500">shopping_cart</mat-icon>
              </div>
            </div>
          </div>
        </div>

        <!-- Credit Sales Section -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Credit Sales</p>
                <p class="text-2xl font-bold text-gray-900">
                  {{ report.totalCreditSales | currency: 'KES' }}
                </p>
              </div>
              <div class="p-2 bg-purple-500/20 rounded-lg">
                <mat-icon class="text-purple-500">credit_card</mat-icon>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Cash Sales</p>
                <p class="text-2xl font-bold text-gray-900">
                  {{ report.totalCashSales | currency: 'KES' }}
                </p>
              </div>
              <div class="p-2 bg-green-500/20 rounded-lg">
                <mat-icon class="text-green-500">payments</mat-icon>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Credit Payments</p>
                <p class="text-2xl font-bold text-gray-900">
                  {{ report.creditPaymentsReceived | currency: 'KES' }}
                </p>
              </div>
              <div class="p-2 bg-blue-500/20 rounded-lg">
                <mat-icon class="text-blue-500">check_circle</mat-icon>
              </div>
            </div>
          </div>
        </div>

        <!-- Daily Revenue Chart -->
        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Daily Revenue Trend</h2>
          <div *ngIf="dailyRevenueChartData.length > 0 && dailyRevenueChartData[0].series.length > 0" style="width: 100%; height: 400px;">
            <ngx-charts-line-chart
              [results]="dailyRevenueChartData"
              [xAxis]="true"
              [yAxis]="true"
              [legend]="true"
              [scheme]="colorScheme"
              [showXAxisLabel]="true"
              [showYAxisLabel]="true"
              xAxisLabel="Date"
              yAxisLabel="Revenue (KES)">
            </ngx-charts-line-chart>
          </div>
          <div *ngIf="!dailyRevenueChartData.length || !dailyRevenueChartData[0].series.length" class="text-center py-8 text-gray-500">
            <p>No revenue data available for the selected date range</p>
          </div>
        </div>

        <!-- Payment Method Breakdown -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Pie Chart -->
          <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">Revenue by Payment Method</h2>
            <div *ngIf="paymentMethodChartData.length > 0" style="width: 100%; height: 400px;">
              <ngx-charts-pie-chart
                [results]="paymentMethodChartData"
                [scheme]="colorScheme"
                [legend]="true"
                [labels]="true">
              </ngx-charts-pie-chart>
            </div>
            <div *ngIf="!paymentMethodChartData.length" class="text-center py-8 text-gray-500">
              <p>No payment method data available</p>
            </div>
          </div>

          <!-- Payment Method Table -->
          <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">Payment Methods</h2>
            <div class="space-y-3">
              <div *ngFor="let method of report.revenueByPaymentMethod" class="border-b pb-3">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="font-medium text-gray-900">{{ method.paymentMethod }}</p>
                    <p class="text-sm text-gray-600">{{ method.percentage.toFixed(2) }}%</p>
                  </div>
                  <p class="font-semibold text-gray-900">{{ method.amount | currency: 'KES' }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Error State -->
      <div *ngIf="!loading && error" class="bg-red-50 border border-red-200 rounded-lg p-6">
        <div class="flex items-center">
          <mat-icon class="text-red-500 mr-3">error</mat-icon>
          <div>
            <p class="text-red-900 font-semibold">Error Loading Report</p>
            <p class="text-red-700 text-sm">{{ error }}</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrl: './financial-report.component.scss'
})
export class FinancialReportComponent implements OnInit {
  startDate = '';
  endDate = '';
  selectedBranchId: string = '';

  report: FinancialReportDto | null = null;
  branches: BranchDto[] = [];
  loading = false;
  error: string | null = null;

  colorScheme: any = {
    name: 'custom',
    selectable: true,
    group: 'Ordinal',
    domain: ['#A1C7F8', '#F99E98', '#CBEBD0', '#FFA500', '#9C27B0']
  };

  dailyRevenueChartData: any[] = [];
  paymentMethodChartData: any[] = [];

  constructor(
    private reportService: ReportService,
    private branchesService: BranchesService,
    private pdfReportService: FinancialReportService
  ) {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    this.endDate = this.formatDate(today);
    this.startDate = this.formatDate(thirtyDaysAgo);
  }

  ngOnInit(): void {
    this.loadBranches();
    this.generateReport();
  }

  loadBranches(): void {
    this.branchesService.loadBranches();
    this.branchesService.branches$.subscribe(branches => {
      this.branches = branches || [];
    });
  }

  generateReport(): void {
    if (!this.startDate || !this.endDate) {
      this.error = 'Please select both start and end dates';
      return;
    }

    this.loading = true;
    this.error = null;

    // Only pass branchId if it's not empty (empty string means "All Branches")
    const branchId = this.selectedBranchId ? this.selectedBranchId : undefined;

    this.reportService.getFinancialReport(
      this.startDate,
      this.endDate,
      branchId
    ).subscribe({
      next: (data) => {
        this.report = data;
        this.prepareChartData();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading financial report:', err);
        this.error = err.error?.message || 'Failed to load financial report';
        this.loading = false;
      }
    });
  }

  /**
   * Handle branch selection change and auto-refresh report
   */
  onBranchChange(): void {
    console.log('Branch changed to:', this.selectedBranchId);
    this.generateReport();
  }

  private prepareChartData(): void {
    if (!this.report) return;

    // Daily revenue chart
    this.dailyRevenueChartData = [
      {
        name: 'Daily Revenue',
        series: this.report.dailyRevenue.map(item => ({
          name: new Date(item.date).toLocaleDateString(),
          value: Number(item.revenue) || 0
        }))
      }
    ];

    console.log('Daily Revenue Chart Data:', this.dailyRevenueChartData);

    // Payment method chart
    this.paymentMethodChartData = this.report.revenueByPaymentMethod.map(method => ({
      name: method.paymentMethod,
      value: Number(method.amount) || 0
    }));

    console.log('Payment Method Chart Data:', this.paymentMethodChartData);
  }

  /**
   * Download current report as PDF
   */
  downloadPDF(): void {
    if (!this.report) return;

    const branchName = this.selectedBranchId
      ? this.branches.find(b => b.id === this.selectedBranchId)?.name || 'All Branches'
      : 'All Branches';

    this.pdfReportService.generateFinancialReportPdf(
      {
        startDate: this.startDate,
        endDate: this.endDate,
        totalRevenue: this.report.totalRevenue,
        totalCost: this.report.totalCost,
        grossProfit: this.report.grossProfit,
        grossProfitMargin: this.report.grossProfitMargin,
        totalSales: this.report.totalSales,
        totalCreditSales: this.report.totalCreditSales,
        totalCashSales: this.report.totalCashSales,
        creditPaymentsReceived: this.report.creditPaymentsReceived,
        revenueByPaymentMethod: this.report.revenueByPaymentMethod,
        dailyRevenue: this.report.dailyRevenue
      },
      branchName
    );
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
