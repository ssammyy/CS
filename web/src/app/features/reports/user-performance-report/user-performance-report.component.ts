import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import {MatNativeDateModule, MatOption} from '@angular/material/core';
import { NgxChartsModule } from '@swimlane/ngx-charts';

import { ReportService, UserPerformanceReportDto } from '../services/report.service';
import { BranchesService, BranchDto } from '../../../core/services/branches.service';
import { BranchContextService } from '../../../core/services/branch-context.service';
import { MatButtonToggle, MatButtonToggleGroup, MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSelectModule } from '@angular/material/select';

/**
 * User Performance Report: revenue, sales count, and commission per cashier/manager.
 * UI follows the same layout and design language as the Financial Report (filters, metric cards, charts).
 */
@Component({
  selector: 'app-user-performance-report',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    NgxChartsModule,
    MatButtonToggle,
    MatButtonToggleGroup,
    MatOption,
    MatSelectModule,
  ],
  template: `
    <div class="min-h-screen bg-gray-50 p-6">
      <!-- Header -->
      <div class="mb-6">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold text-gray-900">Agent Performance</h1>
            <p class="text-gray-600 mt-1">Revenue and commission across agents</p>
          </div>
          <div class="flex items-center gap-3">
            <button
              mat-stroked-button
              (click)="generateReport()"
              [disabled]="loading"
              class="!py-2 whitespace-nowrap">
              <mat-icon>refresh</mat-icon>
              Generate
            </button>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="bg-white rounded-lg shadow p-6 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <mat-form-field subscriptSizing="dynamic" class="flex-1">
            <mat-label>Start Date</mat-label>
            <input matInput [matDatepicker]="startDatePicker" [(ngModel)]="startDate" (dateChange)="generateReport()">
            <mat-datepicker-toggle matIconSuffix [for]="startDatePicker"></mat-datepicker-toggle>
            <mat-datepicker #startDatePicker></mat-datepicker>
          </mat-form-field>
          <mat-form-field subscriptSizing="dynamic" class="flex-1">
            <mat-label>End Date</mat-label>
            <input matInput [matDatepicker]="endDatePicker" [(ngModel)]="endDate" (dateChange)="generateReport()">
            <mat-datepicker-toggle matIconSuffix [for]="endDatePicker"></mat-datepicker-toggle>
            <mat-datepicker #endDatePicker></mat-datepicker>
          </mat-form-field>
          <div>
      <mat-form-field appearance="fill" class="w-full">
        <mat-select [(ngModel)]="selectedBranchId" (selectionChange)="onBranchChange()">
          <mat-option [value]="''">All Branches</mat-option>
          <mat-option *ngFor="let branch of branches" [value]="branch.id">
            {{ branch.name }}
          </mat-option>
        </mat-select>
      </mat-form-field>
          </div>
        </div>
        <!-- Quick period filters -->
        <div class="flex flex-wrap gap-2 mt-4">

<mat-button-toggle-group name="periodGroup" aria-label="Quick period" class="bg-gray-100 rounded-lg p-1 inline-flex shadow-sm">
  <mat-button-toggle value="today" (click)="setPeriod('today')" class="!px-1 !py-1 text-sm text-gray-700 hover:bg-white" aria-label="Today">Today</mat-button-toggle>
  <mat-button-toggle value="week" (click)="setPeriod('week')" class="!px-1 !py-1 text-sm text-gray-700 hover:bg-white">This Week</mat-button-toggle>
  <mat-button-toggle value="month" (click)="setPeriod('month')" class="!px-1 !py-1 text-sm text-gray-700 hover:bg-white">This Month</mat-button-toggle>
  <mat-button-toggle value="year" (click)="setPeriod('year')" class="!px-1 !py-1 text-sm text-gray-700 hover:bg-white">This Year</mat-button-toggle>
</mat-button-toggle-group>
              </div>
      </div>

      <!-- Loading -->
      <div *ngIf="loading" class="flex justify-center items-center py-12">
        <mat-spinner></mat-spinner>
      </div>

      <!-- Report Data -->
      <div *ngIf="!loading && report" class="space-y-6">
        <!-- Summary cards -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="bg-white rounded-lg shadow p-4 border-l-4 border-brand-sky">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Total Revenue</p>
                <p class="text-2xl font-bold text-gray-900">{{ totalRevenue | currency: 'KES' }}</p>
              </div>
              <div class="p-2 bg-brand-sky/20 rounded-lg">
                <mat-icon class="text-brand-sky">trending_up</mat-icon>
              </div>
            </div>
          </div>
          <div class="bg-white rounded-lg shadow p-4 border-l-4 border-brand-mint">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Total Commission</p>
                <p class="text-2xl font-bold text-gray-900">{{ totalCommission | currency: 'KES' }}</p>
              </div>
              <div class="p-2 bg-brand-mint/20 rounded-lg">
                <mat-icon class="text-brand-mint">payments</mat-icon>
              </div>
            </div>
          </div>
          <div class="bg-white rounded-lg shadow p-4 border-l-4 border-brand-coral">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Best Performing Cashier</p>
                <p class="text-2xl font-bold text-gray-900">{{ bestPerformingCashierName }}</p>
                <p *ngIf="bestPerformingCashierProfit != null" class="text-sm text-gray-600">{{ bestPerformingCashierProfit | currency: 'KES' }} profit</p>
              </div>
              <div class="p-2 bg-brand-coral/20 rounded-lg">
                <mat-icon class="text-brand-coral">emoji_events</mat-icon>
              </div>
            </div>
          </div>
          <div class="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Total Transactions</p>
                <p class="text-2xl font-bold text-gray-900">{{ totalSalesCount }}</p>
              </div>
              <div class="p-2 bg-orange-500/20 rounded-lg">
                <mat-icon class="text-orange-500">shopping_cart</mat-icon>
              </div>
            </div>
          </div>
        </div>

        <!-- Charts -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">Revenue by User</h2>
            <div *ngIf="revenueChartData.length > 0" style="width: 100%; height: 360px;">
              <ngx-charts-bar-vertical
                [results]="revenueChartData"
                [xAxis]="true"
                [yAxis]="true"
                [legend]="false"
                [scheme]="colorScheme"
               [showXAxisLabel]="true"
                [showYAxisLabel]="true"
                xAxisLabel="User"
                yAxisLabel="Revenue (KES)"
                [rotateXAxisTicks]="true">
              </ngx-charts-bar-vertical>
            </div>
            <div *ngIf="revenueChartData.length === 0" class="text-center py-8 text-gray-500">
              No revenue data in this period
            </div>
          </div>
          <!-- Table -->
          <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">Performance by User</h2>
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                <tr>
                  <th scope="col" class="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">User</th>
                  <th scope="col" class="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Profit</th>
                  <th scope="col" class="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Revenue</th>
                  <th scope="col" class="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Sales</th>
                  <th scope="col" class="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Commission</th>
                </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                <tr *ngFor="let u of report.userPerformances" class="hover:bg-gray-50">
                  <td class="px-4 py-3">
                    <span class="font-medium text-gray-900">{{ u.userName }}</span>
                    <span *ngIf="u.email" class="block text-xs text-gray-500">{{ u.email }}</span>
                  </td>
                  <td class="px-4 py-3 text-right font-medium text-brand-sky">{{ u.totalProfit | currency: 'KES ' }}</td>
                  <td class="px-4 py-3 text-right font-medium text-gray-900">{{ u.totalRevenue | currency: 'KES ' }}</td>
                  <td class="px-4 py-3 text-right text-gray-600">{{ u.salesCount }}</td>
                  <td class="px-4 py-3 text-right font-medium text-brand-coral">{{ u.commission | currency: 'KES ' }}</td>
                </tr>
                </tbody>
              </table>
            </div>
            <div *ngIf="report.userPerformances.length === 0" class="text-center py-8 text-gray-500">
              No sales by users in the selected period
            </div>
          </div>
        </div>


      </div>

      <!-- Error -->
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
  styleUrl: './user-performance-report.component.scss'
})
export class UserPerformanceReportComponent implements OnInit {
  startDate: Date | null = null;
  endDate: Date | null = null;
  selectedBranchId = '';

  report: UserPerformanceReportDto | null = null;
  branches: BranchDto[] = [];
  loading = false;
  error: string | null = null;

  /** Revenue chart: brand sky, mint, coral, and accents (aligned with Financial Report palette). */
  colorScheme: any = {
    name: 'custom',
    selectable: true,
    group: 'Ordinal',
    domain: ['#A1C7F8', '#CBEBD0', '#F99E98', '#757de8', '#FF9800', '#9C27B0']
  };
  /** Commission chart: mint/green tones for earnings. */
  commissionColorScheme = {
    name: 'commission',
    selectable: true,
    group: 'Ordinal',
    domain: ['#CBEBD0', '#81C784', '#4CAF50', '#2E7D32', '#A1C7F8']
  };

  revenueChartData: { name: string; value: number }[] = [];
  commissionChartData: { name: string; value: number }[] = [];

  constructor(
    private reportService: ReportService,
    private branchesService: BranchesService,
    private branchContext: BranchContextService
  ) {
    this.setPeriod('month');
  }

  ngOnInit(): void {
    this.loadBranches();
    this.branchContext.currentBranch$.subscribe(branch => {
      this.selectedBranchId = branch?.id ?? '';
      this.generateReport();
    });
  }

  loadBranches(): void {
    this.branchesService.loadBranches();
    this.branchesService.branches$.subscribe(branches => {
      this.branches = branches ?? [];
    });
  }

  setPeriod(period: 'today' | 'week' | 'month' | 'year'): void {
    const now = new Date();
    let start: Date;
    switch (period) {
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week': {
        const d = new Date(now);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        start = new Date(d.setDate(diff));
        start.setHours(0, 0, 0, 0);
        break;
      }
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        start = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    this.startDate = start;
    this.endDate = new Date(now);
    this.generateReport();
  }

  private formatDateForApi(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  onBranchChange(): void {
    this.generateReport();
  }

  generateReport(): void {
    if (!this.startDate || !this.endDate) {
      this.error = 'Please select start and end dates';
      return;
    }
    this.loading = true;
    this.error = null;
    const branchId = this.selectedBranchId || undefined;

    this.reportService.getUserPerformanceReport(this.formatDateForApi(this.startDate), this.formatDateForApi(this.endDate), branchId).subscribe({
      next: (data) => {
        this.report = data;
        this.prepareChartData();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading user performance report:', err);
        this.error = err.error?.message || 'Failed to load user performance report';
        this.loading = false;
      }
    });
  }

  private prepareChartData(): void {
    if (!this.report) return;
    this.revenueChartData = this.report.userPerformances.map(u => ({
      name: u.userName,
      value: Number(u.totalRevenue) || 0
    }));
    this.commissionChartData = this.report.userPerformances.map(u => ({
      name: u.userName,
      value: Number(u.commission) || 0
    }));
  }

  get totalRevenue(): number {
    if (!this.report) return 0;
    return this.report.userPerformances.reduce((sum, u) => sum + (Number(u.totalRevenue) || 0), 0);
  }

  get totalCommission(): number {
    if (!this.report) return 0;
    return this.report.userPerformances.reduce((sum, u) => sum + (Number(u.commission) || 0), 0);
  }

  get totalSalesCount(): number {
    if (!this.report) return 0;
    return this.report.userPerformances.reduce((sum, u) => sum + (u.salesCount || 0), 0);
  }

  /** Best performing cashier: user with highest total profit in the period (backend sorts by totalProfit desc). */
  get bestPerformingCashierName(): string {
    if (!this.report?.userPerformances?.length) return '—';
    return this.report.userPerformances[0].userName;
  }

  /** Total profit of the best performing cashier, or null if none. */
  get bestPerformingCashierProfit(): number | null {
    if (!this.report?.userPerformances?.length) return null;
    const p = this.report.userPerformances[0].totalProfit;
    return typeof p === 'number' ? p : Number(p) ?? null;
  }

  private formatDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
