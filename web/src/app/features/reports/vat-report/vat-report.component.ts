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

import { VatReportService, VatReportDto } from '../services/vat-report.service';
import { BranchesService, BranchDto } from '../../../core/services/branches.service';

/**
 * VAT Report component showing VAT analytics, input/output VAT, and tax breakdown
 */
@Component({
  selector: 'app-vat-report',
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
            <h1 class="text-3xl font-bold text-gray-900">VAT Report</h1>
            <p class="text-gray-600 mt-1">Input VAT, Output VAT, and Net VAT analysis</p>
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
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Output VAT -->
          <div class="bg-white rounded-lg shadow p-4 border-l-4 border-brand-sky">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Output VAT (Collected)</p>
                <p class="text-2xl font-bold text-gray-900">{{ report.totalOutputVat | currency: 'KES' }}</p>
              </div>
              <div class="p-2 bg-brand-sky/20 rounded-lg">
                <mat-icon class="text-brand-sky">trending_up</mat-icon>
              </div>
            </div>
            <p class="text-xs text-gray-500 mt-2">From sales transactions</p>
          </div>

          <!-- Input VAT -->
          <div class="bg-white rounded-lg shadow p-4 border-l-4 border-brand-mint">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Input VAT (Paid)</p>
                <p class="text-2xl font-bold text-gray-900">{{ report.totalInputVat | currency: 'KES' }}</p>
              </div>
              <div class="p-2 bg-brand-mint/20 rounded-lg">
                <mat-icon class="text-brand-mint">trending_down</mat-icon>
              </div>
            </div>
            <p class="text-xs text-gray-500 mt-2">From purchase transactions</p>
          </div>

          <!-- Net VAT Payable -->
          <div class="bg-white rounded-lg shadow p-4 border-l-4"
               [ngClass]="report.netVatPayable > 0 ? 'border-brand-coral' : 'border-green-500'">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Net VAT Payable</p>
                <p class="text-2xl font-bold" [ngClass]="report.netVatPayable > 0 ? 'text-gray-900' : 'text-green-600'">
                  {{ report.netVatPayable | currency: 'KES' }}
                </p>
              </div>
              <div class="p-2 rounded-lg" [ngClass]="report.netVatPayable > 0 ? 'bg-brand-coral/20' : 'bg-green-500/20'">
                <mat-icon [ngClass]="report.netVatPayable > 0 ? 'text-brand-coral' : 'text-green-500'">
                  {{ report.netVatPayable > 0 ? 'arrow_upward' : 'arrow_downward' }}
                </mat-icon>
              </div>
            </div>
            <p class="text-xs text-gray-500 mt-2">Output VAT - Input VAT</p>
          </div>
        </div>

        <!-- Sales & Purchases Overview -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Sales Section -->
          <div class="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Total Sales (excl. VAT)</p>
                <p class="text-2xl font-bold text-gray-900">{{ report.totalSalesExcludingVat | currency: 'KES' }}</p>
              </div>
              <div class="p-2 bg-orange-500/20 rounded-lg">
                <mat-icon class="text-orange-500">shopping_cart</mat-icon>
              </div>
            </div>
            <p class="text-xs text-gray-500 mt-2">{{ report.totalSalesIncludingVat | currency: 'KES' }} including VAT</p>
          </div>

          <!-- Purchases Section -->
          <div class="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Total Purchases (excl. VAT)</p>
                <p class="text-2xl font-bold text-gray-900">{{ report.totalPurchasesExcludingVat | currency: 'KES' }}</p>
              </div>
              <div class="p-2 bg-purple-500/20 rounded-lg">
                <mat-icon class="text-purple-500">local_shipping</mat-icon>
              </div>
            </div>
            <p class="text-xs text-gray-500 mt-2">{{ report.totalPurchasesIncludingVat | currency: 'KES' }} including VAT</p>
          </div>
        </div>

        <!-- VAT by Classification -->
        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <mat-icon class="text-brand-sky mr-2">category</mat-icon>
            VAT by Tax Classification ({{ report.vatByClassification.length }})
          </h2>
          <div *ngIf="report.vatByClassification.length > 0" class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-gray-200 bg-gray-50">
                  <th class="px-4 py-3 text-left font-semibold text-gray-700">Classification</th>
                  <th class="px-4 py-3 text-right font-semibold text-gray-700">VAT Rate</th>
                  <th class="px-4 py-3 text-right font-semibold text-gray-700">Sales Amount</th>
                  <th class="px-4 py-3 text-right font-semibold text-gray-700">VAT Collected</th>
                  <th class="px-4 py-3 text-right font-semibold text-gray-700">Purchases Amount</th>
                  <th class="px-4 py-3 text-right font-semibold text-gray-700">VAT Paid</th>
                  <th class="px-4 py-3 text-right font-semibold text-gray-700">Net VAT</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of report.vatByClassification" class="border-b border-gray-200 hover:bg-gray-50">
                  <td class="px-4 py-3 text-gray-900 font-medium">{{ item.classification }}</td>
                  <td class="px-4 py-3 text-right text-gray-600">{{ item.vatRate.toFixed(2) }}%</td>
                  <td class="px-4 py-3 text-right text-gray-600">{{ item.totalSalesAmount | currency: 'KES' }}</td>
                  <td class="px-4 py-3 text-right text-brand-sky font-semibold">{{ item.vatCollected | currency: 'KES' }}</td>
                  <td class="px-4 py-3 text-right text-gray-600">{{ item.totalPurchasesAmount | currency: 'KES' }}</td>
                  <td class="px-4 py-3 text-right text-brand-mint font-semibold">{{ item.vatPaid | currency: 'KES' }}</td>
                  <td class="px-4 py-3 text-right font-semibold" [ngClass]="item.netVat > 0 ? 'text-brand-coral' : 'text-green-600'">
                    {{ item.netVat | currency: 'KES' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div *ngIf="report.vatByClassification.length === 0" class="text-center py-8 text-gray-500">
            <mat-icon class="text-4xl opacity-50">info</mat-icon>
            <p class="mt-2">No VAT data available</p>
          </div>
        </div>

        <!-- Sales by Tax Category -->
        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <mat-icon class="text-orange-500 mr-2">receipt</mat-icon>
            Sales by Tax Category ({{ report.salesByTaxCategory.length }})
          </h2>
          <div *ngIf="report.salesByTaxCategory.length > 0" class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-gray-200 bg-gray-50">
                  <th class="px-4 py-3 text-left font-semibold text-gray-700">Classification</th>
                  <th class="px-4 py-3 text-right font-semibold text-gray-700">VAT Rate</th>
                  <th class="px-4 py-3 text-right font-semibold text-gray-700">Transactions</th>
                  <th class="px-4 py-3 text-right font-semibold text-gray-700">Amount (excl. VAT)</th>
                  <th class="px-4 py-3 text-right font-semibold text-gray-700">VAT</th>
                  <th class="px-4 py-3 text-right font-semibold text-gray-700">Amount (incl. VAT)</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of report.salesByTaxCategory" class="border-b border-gray-200 hover:bg-gray-50">
                  <td class="px-4 py-3 text-gray-900 font-medium">{{ item.classification }}</td>
                  <td class="px-4 py-3 text-right text-gray-600">{{ item.vatRate.toFixed(2) }}%</td>
                  <td class="px-4 py-3 text-right text-gray-600">{{ item.numberOfTransactions }}</td>
                  <td class="px-4 py-3 text-right text-gray-600">{{ item.totalAmount | currency: 'KES' }}</td>
                  <td class="px-4 py-3 text-right font-semibold text-brand-sky">{{ item.totalVat | currency: 'KES' }}</td>
                  <td class="px-4 py-3 text-right font-semibold text-gray-900">{{ item.amountIncludingVat | currency: 'KES' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div *ngIf="report.salesByTaxCategory.length === 0" class="text-center py-8 text-gray-500">
            <mat-icon class="text-4xl opacity-50">info</mat-icon>
            <p class="mt-2">No sales data available</p>
          </div>
        </div>

        <!-- Purchases by Tax Category -->
        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <mat-icon class="text-purple-500 mr-2">local_shipping</mat-icon>
            Purchases by Tax Category ({{ report.purchasesByTaxCategory.length }})
          </h2>
          <div *ngIf="report.purchasesByTaxCategory.length > 0" class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-gray-200 bg-gray-50">
                  <th class="px-4 py-3 text-left font-semibold text-gray-700">Classification</th>
                  <th class="px-4 py-3 text-right font-semibold text-gray-700">VAT Rate</th>
                  <th class="px-4 py-3 text-right font-semibold text-gray-700">Transactions</th>
                  <th class="px-4 py-3 text-right font-semibold text-gray-700">Amount (excl. VAT)</th>
                  <th class="px-4 py-3 text-right font-semibold text-gray-700">VAT</th>
                  <th class="px-4 py-3 text-right font-semibold text-gray-700">Amount (incl. VAT)</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of report.purchasesByTaxCategory" class="border-b border-gray-200 hover:bg-gray-50">
                  <td class="px-4 py-3 text-gray-900 font-medium">{{ item.classification }}</td>
                  <td class="px-4 py-3 text-right text-gray-600">{{ item.vatRate.toFixed(2) }}%</td>
                  <td class="px-4 py-3 text-right text-gray-600">{{ item.numberOfTransactions }}</td>
                  <td class="px-4 py-3 text-right text-gray-600">{{ item.totalAmount | currency: 'KES' }}</td>
                  <td class="px-4 py-3 text-right font-semibold text-brand-mint">{{ item.totalVat | currency: 'KES' }}</td>
                  <td class="px-4 py-3 text-right font-semibold text-gray-900">{{ item.amountIncludingVat | currency: 'KES' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div *ngIf="report.purchasesByTaxCategory.length === 0" class="text-center py-8 text-gray-500">
            <mat-icon class="text-4xl opacity-50">info</mat-icon>
            <p class="mt-2">No purchase data available</p>
          </div>
        </div>

        <!-- Legend -->
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p class="text-sm text-blue-900 font-semibold mb-2">VAT Report Guide:</p>
          <ul class="text-sm text-blue-800 space-y-1">
            <li>• <strong>Output VAT:</strong> VAT collected from customers on sales</li>
            <li>• <strong>Input VAT:</strong> VAT paid to suppliers on purchases</li>
            <li>• <strong>Net VAT Payable:</strong> Output VAT minus Input VAT (amount owed to tax authority)</li>
            <li>• <strong>Tax Classification:</strong> STANDARD, REDUCED, ZERO, or EXEMPT rates</li>
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
  styleUrl: './vat-report.component.scss'
})
export class VatReportComponent implements OnInit {
  startDate = '';
  endDate = '';
  selectedBranchId: string = '';

  report: VatReportDto | null = null;
  branches: BranchDto[] = [];
  loading = false;
  error: string | null = null;

  constructor(
    private vatReportService: VatReportService,
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

    this.vatReportService.getVatReport(
      this.startDate,
      this.endDate,
      branchId
    ).subscribe({
      next: (data) => {
        this.report = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading VAT report:', err);
        this.error = err.error?.message || 'Failed to load VAT report';
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
