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

import {
  PrimaryButtonComponent,
  SecondaryButtonComponent,
  AccentButtonComponent,
  DangerButtonComponent,
  IconButtonComponent,
  TextButtonComponent
} from '../../../shared/components';

import { ReportService, InventoryReportDto, LowStockItemDto, ExpiringItemDto, OutOfStockItemDto } from '../services/report.service';
import { BranchesService, BranchDto } from '../../../core/services/branches.service';
import { FinancialReportService } from '../../../core/services/financial-report.service';

/**
 * Inventory Report component showing stock levels, valuation, and alerts
 */
@Component({
  selector: 'app-inventory-report',
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
            <h1 class="text-3xl font-bold text-gray-900">Inventory Report</h1>
            <p class="text-gray-600 mt-1">Stock levels, valuation, and expiry tracking</p>
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
              class="!py-2 !text-brand-mint hover:!bg-brand-mint/10">
              <mat-icon>file_download</mat-icon>
              Download PDF
            </button>
          </div>
        </div>
      </div>

      <!-- Branch Filter -->
      <div class="bg-white rounded-lg shadow p-6 mb-6">
        <div class="max-w-xs">
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

      <!-- Loading State -->
      <div *ngIf="loading" class="flex justify-center items-center py-12">
        <mat-spinner></mat-spinner>
      </div>

      <!-- Report Data -->
      <div *ngIf="!loading && report" class="space-y-6">
        <!-- Key Metrics -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <!-- Total Items -->
          <div class="bg-white rounded-lg shadow p-4 border-l-4 border-brand-sky">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Total Items</p>
                <p class="text-2xl font-bold text-gray-900">{{ report.totalItems }}</p>
              </div>
              <div class="p-2 bg-brand-sky/20 rounded-lg">
                <mat-icon class="text-brand-sky">inventory_2</mat-icon>
              </div>
            </div>
          </div>

          <!-- Total Quantity -->
          <div class="bg-white rounded-lg shadow p-4 border-l-4 border-brand-mint">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Total Quantity</p>
                <p class="text-2xl font-bold text-gray-900">{{ report.totalQuantity }}</p>
              </div>
              <div class="p-2 bg-brand-mint/20 rounded-lg">
                <mat-icon class="text-brand-mint">stack</mat-icon>
              </div>
            </div>
          </div>

          <!-- Stock Value -->
          <div class="bg-white rounded-lg shadow p-4 border-l-4 border-brand-coral">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Stock Value</p>
                <p class="text-2xl font-bold text-gray-900">{{ report.totalStockValue | currency: 'KES' }}</p>
              </div>
              <div class="p-2 bg-brand-coral/20 rounded-lg">
                <mat-icon class="text-brand-coral">attach_money</mat-icon>
              </div>
            </div>
          </div>

          <!-- Cost Value -->
          <div class="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Cost Value</p>
                <p class="text-2xl font-bold text-gray-900">{{ report.totalCostValue | currency: 'KES' }}</p>
              </div>
              <div class="p-2 bg-orange-500/20 rounded-lg">
                <mat-icon class="text-orange-500">money</mat-icon>
              </div>
            </div>
          </div>
        </div>

        <!-- Low Stock Items -->
        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <mat-icon class="text-brand-coral mr-2">warning</mat-icon>
            Low Stock Items ({{ report.lowStockItems.length }})
          </h2>
          <div *ngIf="report.lowStockItems.length > 0" class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-gray-200 bg-gray-50">
                  <th class="px-4 py-3 text-left font-semibold text-gray-700">Product Name</th>
                  <th class="px-4 py-3 text-right font-semibold text-gray-700">Current Stock</th>
                  <th class="px-4 py-3 text-right font-semibold text-gray-700">Min Level</th>
                  <th class="px-4 py-3 text-right font-semibold text-gray-700">Stock Value</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of report.lowStockItems" class="border-b border-gray-200 hover:bg-gray-50">
                  <td class="px-4 py-3 text-gray-900 font-medium">{{ item.productName }}</td>
                  <td class="px-4 py-3 text-right text-gray-600">{{ item.currentStock }}</td>
                  <td class="px-4 py-3 text-right text-gray-600">{{ item.minStockLevel }}</td>
                  <td class="px-4 py-3 text-right font-semibold text-gray-900">{{ item.stockValue | currency: 'KES' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div *ngIf="report.lowStockItems.length === 0" class="text-center py-8 text-gray-500">
            <mat-icon class="text-4xl opacity-50">check_circle</mat-icon>
            <p class="mt-2">All items are well stocked</p>
          </div>
        </div>

        <!-- Expiring Items -->
        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <mat-icon class="text-orange-500 mr-2">schedule</mat-icon>
            Expiring Items (Within 30 Days) ({{ report.expiringItems.length }})
          </h2>
          <div *ngIf="report.expiringItems.length > 0" class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-gray-200 bg-gray-50">
                  <th class="px-4 py-3 text-left font-semibold text-gray-700">Product Name</th>
                  <th class="px-4 py-3 text-right font-semibold text-gray-700">Quantity</th>
                  <th class="px-4 py-3 text-center font-semibold text-gray-700">Expiry Date</th>
                  <th class="px-4 py-3 text-right font-semibold text-gray-700">Days Left</th>
                  <th class="px-4 py-3 text-right font-semibold text-gray-700">Stock Value</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of report.expiringItems" class="border-b border-gray-200 hover:bg-gray-50">
                  <td class="px-4 py-3 text-gray-900 font-medium">{{ item.productName }}</td>
                  <td class="px-4 py-3 text-right text-gray-600">{{ item.quantity }}</td>
                  <td class="px-4 py-3 text-center">
                    <span [class.text-orange-600]="item.daysUntilExpiry <= 7"
                          [class.text-gray-600]="item.daysUntilExpiry > 7"
                          class="font-medium">
                      {{ item.expiryDate }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-right">
                    <span [class.text-red-600]="item.daysUntilExpiry <= 7"
                          [class.text-gray-600]="item.daysUntilExpiry > 7"
                          class="font-medium">
                      {{ item.daysUntilExpiry }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-right font-semibold text-gray-900">{{ item.stockValue | currency: 'KES' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div *ngIf="report.expiringItems.length === 0" class="text-center py-8 text-gray-500">
            <mat-icon class="text-4xl opacity-50">check_circle</mat-icon>
            <p class="mt-2">No items expiring within 30 days</p>
          </div>
        </div>

        <!-- Out of Stock Items -->
        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <mat-icon class="text-red-500 mr-2">block</mat-icon>
            Out of Stock Items ({{ report.outOfStockItems.length }})
          </h2>
          <div *ngIf="report.outOfStockItems.length > 0" class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-gray-200 bg-gray-50">
                  <th class="px-4 py-3 text-left font-semibold text-gray-700">Product Name</th>
                  <th class="px-4 py-3 text-center font-semibold text-gray-700">Last Restock Date</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of report.outOfStockItems" class="border-b border-gray-200 hover:bg-gray-50">
                  <td class="px-4 py-3 text-gray-900 font-medium">{{ item.productName }}</td>
                  <td class="px-4 py-3 text-center text-gray-600">
                    {{ item.lastRestockDate ? (item.lastRestockDate | date: 'short') : 'Never' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div *ngIf="report.outOfStockItems.length === 0" class="text-center py-8 text-gray-500">
            <mat-icon class="text-4xl opacity-50">check_circle</mat-icon>
            <p class="mt-2">All items are in stock</p>
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
  styleUrl: './inventory-report.component.scss'
})
export class InventoryReportComponent implements OnInit {
  selectedBranchId: string = '';

  report: InventoryReportDto | null = null;
  branches: BranchDto[] = [];
  loading = false;
  error: string | null = null;

  constructor(
    private reportService: ReportService,
    private branchesService: BranchesService,
    private pdfReportService: FinancialReportService
  ) {}

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
    this.loading = true;
    this.error = null;

    // Only pass branchId if it's not empty (empty string means "All Branches")
    const branchId = this.selectedBranchId ? this.selectedBranchId : undefined;

    this.reportService.getInventoryReport(branchId).subscribe({
      next: (data) => {
        this.report = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading inventory report:', err);
        this.error = err.error?.message || 'Failed to load inventory report';
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

  /**
   * Download current report as PDF
   */
  downloadPDF(): void {
    if (!this.report) return;

    const branchName = this.selectedBranchId
      ? this.branches.find(b => b.id === this.selectedBranchId)?.name || 'All Branches'
      : 'All Branches';

    this.pdfReportService.generateInventoryReportPdf(
      {
        totalItems: this.report.totalItems,
        totalQuantity: this.report.totalQuantity,
        totalStockValue: this.report.totalStockValue,
        totalCostValue: this.report.totalCostValue,
        lowStockItems: this.report.lowStockItems,
        expiringItems: this.report.expiringItems,
        outOfStockItems: this.report.outOfStockItems
      },
      branchName
    );
  }
}
