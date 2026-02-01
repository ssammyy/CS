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

import {
  PrimaryButtonComponent,
  SecondaryButtonComponent,
  AccentButtonComponent,
  DangerButtonComponent,
  IconButtonComponent,
  TextButtonComponent
} from '../../../shared/components';

import { ReportService, VarianceReportDto, VarianceItemDto } from '../services/report.service';
import { BranchesService, BranchDto } from '../../../core/services/branches.service';

/**
 * Variance Report component showing inventory discrepancies between expected and actual
 */
@Component({
  selector: 'app-variance-report',
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
            <h1 class="text-3xl font-bold text-gray-900">Variance Report</h1>
            <p class="text-gray-600 mt-1">Compare expected vs actual inventory levels</p>
          </div>
          <app-primary-button
            label="Generate Report"
            icon="refresh"
            (click)="generateReport()">
          </app-primary-button>
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
          <!-- Expected Usage -->
          <div class="bg-white rounded-lg shadow p-4 border-l-4 border-brand-sky">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Expected Usage</p>
                <p class="text-2xl font-bold text-gray-900">{{ report.totalExpectedUsage }}</p>
              </div>
              <div class="p-2 bg-brand-sky/20 rounded-lg">
                <mat-icon class="text-brand-sky">trending_down</mat-icon>
              </div>
            </div>
          </div>

          <!-- Actual Quantity -->
          <div class="bg-white rounded-lg shadow p-4 border-l-4 border-brand-mint">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Actual Quantity</p>
                <p class="text-2xl font-bold text-gray-900">{{ report.totalActualQuantity }}</p>
              </div>
              <div class="p-2 bg-brand-mint/20 rounded-lg">
                <mat-icon class="text-brand-mint">inventory_2</mat-icon>
              </div>
            </div>
          </div>

          <!-- Total Variance -->
          <div class="bg-white rounded-lg shadow p-4 border-l-4"
               [ngClass]="report.totalVarianceQuantity > 0 ? 'border-brand-coral' : 'border-green-500'">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Total Variance (Qty)</p>
                <p class="text-2xl font-bold" [ngClass]="report.totalVarianceQuantity > 0 ? 'text-gray-900' : 'text-green-600'">
                  {{ report.totalVarianceQuantity > 0 ? '+' : '' }}{{ report.totalVarianceQuantity }}
                </p>
              </div>
              <div class="p-2 rounded-lg" [ngClass]="report.totalVarianceQuantity > 0 ? 'bg-brand-coral/20' : 'bg-green-500/20'">
                <mat-icon [ngClass]="report.totalVarianceQuantity > 0 ? 'text-brand-coral' : 'text-green-500'">
                  {{ report.totalVarianceQuantity > 0 ? 'trending_up' : 'check_circle' }}
                </mat-icon>
              </div>
            </div>
          </div>

          <!-- Variance Value -->
          <div class="bg-white rounded-lg shadow p-4 border-l-4"
               [ngClass]="report.totalInventoryVariance > 0 ? 'border-orange-500' : 'border-green-500'">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Variance Value</p>
                <p class="text-2xl font-bold" [ngClass]="report.totalInventoryVariance > 0 ? 'text-gray-900' : 'text-green-600'">
                  {{ report.totalInventoryVariance | currency: 'KES' }}
                </p>
              </div>
              <div class="p-2 rounded-lg" [ngClass]="report.totalInventoryVariance > 0 ? 'bg-orange-500/20' : 'bg-green-500/20'">
                <mat-icon [ngClass]="report.totalInventoryVariance > 0 ? 'text-orange-500' : 'text-green-500'">
                  attach_money
                </mat-icon>
              </div>
            </div>
          </div>
        </div>

        <!-- Significant Variances Table -->
        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <mat-icon class="text-brand-coral mr-2">warning</mat-icon>
            Significant Variances ({{ report.significantVariances.length }})
          </h2>
          <div *ngIf="report.significantVariances.length > 0" class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-gray-200 bg-gray-50">
                  <th class="px-4 py-3 text-left font-semibold text-gray-700">Product Name</th>
                  <th class="px-4 py-3 text-right font-semibold text-gray-700">Expected</th>
                  <th class="px-4 py-3 text-right font-semibold text-gray-700">Actual</th>
                  <th class="px-4 py-3 text-right font-semibold text-gray-700">Variance (Qty)</th>
                  <th class="px-4 py-3 text-right font-semibold text-gray-700">Variance %</th>
                  <th class="px-4 py-3 text-right font-semibold text-gray-700">Value Impact</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of report.significantVariances" class="border-b border-gray-200 hover:bg-gray-50">
                  <td class="px-4 py-3 text-gray-900 font-medium">{{ item.productName }}</td>
                  <td class="px-4 py-3 text-right text-gray-600">{{ item.expectedQuantity }}</td>
                  <td class="px-4 py-3 text-right text-gray-600">{{ item.actualQuantity }}</td>
                  <td class="px-4 py-3 text-right">
                    <span [ngClass]="item.varianceQuantity > 0 ? 'text-brand-coral font-semibold' : 'text-green-600 font-semibold'">
                      {{ item.varianceQuantity > 0 ? '+' : '' }}{{ item.varianceQuantity }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-right">
                    <span [ngClass]="item.variancePercentage > 0 ? 'text-brand-coral font-semibold' : 'text-green-600 font-semibold'">
                      {{ item.variancePercentage > 0 ? '+' : '' }}{{ item.variancePercentage.toFixed(2) }}%
                    </span>
                  </td>
                  <td class="px-4 py-3 text-right">
                    <span [ngClass]="item.varianceValue > 0 ? 'text-brand-coral font-semibold' : 'text-green-600 font-semibold'">
                      {{ item.varianceValue | currency: 'KES' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div *ngIf="report.significantVariances.length === 0" class="text-center py-8 text-gray-500">
            <mat-icon class="text-4xl opacity-50">check_circle</mat-icon>
            <p class="mt-2">No significant variances detected</p>
          </div>
        </div>

        <!-- Legend -->
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p class="text-sm text-blue-900 font-semibold mb-2">How to interpret the data:</p>
          <ul class="text-sm text-blue-800 space-y-1">
            <li>• <strong>Expected:</strong> Quantity calculated from sales transactions</li>
            <li>• <strong>Actual:</strong> Current physical inventory in stock</li>
            <li>• <strong>Variance:</strong> Difference between expected and actual (positive = surplus, negative = shortage)</li>
            <li>• <strong>Value Impact:</strong> Monetary value of the variance</li>
          </ul>
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
  styleUrl: './variance-report.component.scss'
})
export class VarianceReportComponent implements OnInit {
  startDate = '';
  endDate = '';
  selectedBranchId: string = '';

  report: VarianceReportDto | null = null;
  branches: BranchDto[] = [];
  loading = false;
  error: string | null = null;

  constructor(
    private reportService: ReportService,
    private branchesService: BranchesService
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

    this.reportService.getVarianceReport(
      this.startDate,
      this.endDate,
      branchId
    ).subscribe({
      next: (data) => {
        this.report = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading variance report:', err);
        this.error = err.error?.message || 'Failed to load variance report';
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

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
