import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';

// Professional Button Components
import {
  PrimaryButtonComponent,
  SecondaryButtonComponent,
  AccentButtonComponent,
  DangerButtonComponent,
  IconButtonComponent,
  TextButtonComponent
} from '../../shared/components';

import { InventoryService, InventoryDto, InventoryStats } from '../../core/services/inventory.service';
import { BranchesService, BranchDto } from '../../core/services/branches.service';
import { CreateInventoryDialogComponent } from './create-inventory.dialog';
import { AdjustInventoryDialogComponent } from './adjust-inventory.dialog';
import { TransferInventoryDialogComponent } from './transfer-inventory.dialog';
import { InventoryAlertsDialogComponent } from './inventory-alerts.dialog';

/**
 * Inventory component for managing stock levels, transfers, and alerts.
 * Provides a comprehensive dashboard for inventory management with professional UI.
 */
@Component({
  selector: 'app-inventory',
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
    // Professional Button Components
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
            <h1 class="text-3xl font-bold text-gray-900">Inventory Management</h1>
            <p class="text-gray-600 mt-1">Monitor stock levels, manage transfers, and track alerts</p>
          </div>
          <app-primary-button
            label="Add Stock"
            icon="add"
            (click)="createInventory()">
          </app-primary-button>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-white rounded-lg shadow p-4 border-l-4 border-brand-sky">
          <div class="flex items-center">
            <div class="p-2 bg-brand-sky/20 rounded-lg">
              <mat-icon class="text-brand-sky">inventory_2</mat-icon>
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-600">Total Items</p>
              <p class="text-2xl font-bold text-gray-900">{{ stats.totalItems || 0 }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-4 border-l-4 border-brand-coral">
          <div class="flex items-center">
            <div class="p-2 bg-brand-coral/20 rounded-lg">
              <mat-icon class="text-brand-coral">warning</mat-icon>
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-600">Low Stock</p>
              <p class="text-2xl font-bold text-gray-900">{{ stats.lowStockCount || 0 }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
          <div class="flex items-center">
            <div class="p-2 bg-orange-500/20 rounded-lg">
              <mat-icon class="text-orange-500">schedule</mat-icon>
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-600">Expiring Soon</p>
              <p class="text-2xl font-bold text-gray-900">{{ stats.expiringCount || 0 }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
          <div class="flex items-center">
            <div class="p-2 bg-green-500/20 rounded-lg">
              <mat-icon class="text-green-500">attach_money</mat-icon>
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-600">Total Value</p>
              <p class="text-2xl font-bold text-gray-900">KES {{ (stats.totalValue || 0).toLocaleString() }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Actions & Search -->
      <div class="bg-white rounded-lg shadow p-4 mb-6">
        <div class="flex flex-col md:flex-row gap-4">
          <!-- Quick Actions -->
          <div class="flex gap-2">
            <app-secondary-button
              label="Adjust Stock"
              icon="tune"
              (click)="adjustInventory()">
            </app-secondary-button>
            <app-secondary-button
              label="Transfer"
              icon="swap_horiz"
              (click)="transferInventory()">
            </app-secondary-button>
            <app-accent-button
              label="Alerts"
              icon="notifications"
              (click)="viewAlerts()">
            </app-accent-button>
          </div>

          <!-- Search and Filters -->
          <div class="flex-1 flex flex-col md:flex-row gap-4">
            <mat-form-field class="flex-1">
              <mat-label>Search Inventory</mat-label>
              <mat-icon matPrefix class="mr-2 opacity-60">search</mat-icon>
              <input
                matInput
                [(ngModel)]="searchQuery"
                (input)="onSearch()"
                placeholder="Search by product name, batch, or branch..." />
            </mat-form-field>

            <mat-form-field class="w-full md:w-48">
              <mat-label>Filter by Branch</mat-label>
              <mat-select [(ngModel)]="branchFilter" (selectionChange)="applyFilters()">
                <mat-option value="">All Branches</mat-option>
                <mat-option *ngFor="let branch of branches" [value]="branch.id">
                  {{ branch.name }}
                </mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field class="w-full md:w-48">
              <mat-label>Filter by Status</mat-label>
              <mat-select [(ngModel)]="statusFilter" (selectionChange)="applyFilters()">
                <mat-option value="">All Status</mat-option>
                <mat-option value="low_stock">Low Stock</mat-option>
                <mat-option value="expiring">Expiring Soon</mat-option>
                <mat-option value="expired">Expired</mat-option>
                <mat-option value="normal">Normal</mat-option>
              </mat-select>
            </mat-form-field>

            <app-secondary-button
              label="Clear Filters"
              (click)="clearFilters()">
            </app-secondary-button>
          </div>
        </div>
      </div>

      <!-- Inventory List -->
      <div class="bg-white rounded-lg shadow">
        <div class="p-4 border-b border-gray-200">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-gray-900">Inventory Items</h2>
            <div class="flex items-center gap-2">
              <span class="text-sm text-gray-600">{{ filteredInventory.length }} of {{ inventory.length }} items</span>
              <app-icon-button
                icon="refresh"
                (click)="refreshInventory()"
                [disabled]="loading"
                matTooltip="Refresh">
              </app-icon-button>
            </div>
          </div>
        </div>

        <div class="p-4">
          <div *ngIf="loading" class="flex justify-center py-8">
            <mat-spinner diameter="40"></mat-spinner>
          </div>

          <div *ngIf="!loading && filteredInventory.length === 0" class="text-center py-12 text-gray-500">
            <mat-icon class="text-6xl text-gray-300 mb-4">inventory_2</mat-icon>
            <h3 class="text-xl font-semibold text-gray-400 mb-2">No inventory items found</h3>
            <p class="text-gray-400">Try adjusting your search or filters, or add your first inventory item.</p>
          </div>

          <!-- Desktop Table View (lg screens and up) -->
          <div *ngIf="!loading && filteredInventory.length > 0" class="hidden lg:block">
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  <tr *ngFor="let item of filteredInventory" class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div class="text-sm font-medium text-gray-900">{{ item.productName }}</div>
                        <div *ngIf="item.productGenericName" class="text-sm text-gray-500">{{ item.productGenericName }}</div>
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="text-sm text-gray-900">{{ item.branchName }}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="flex items-center">
                        <div class="flex-1 min-w-0">
                          <div class="flex items-center justify-between">
                            <span class="text-sm font-medium text-gray-900">{{ item.quantity }}</span>
                            <span class="text-sm text-gray-500">{{ getStockPercentage(item) }}%</span>
                          </div>
                          <div class="w-full bg-gray-200 rounded-full h-2 mt-1">
                            <div
                              class="h-2 rounded-full transition-all duration-300"
                              [ngClass]="getStockLevelClass(item)"
                              [style.width.%]="getStockPercentage(item)">
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="text-sm text-gray-900">{{ item.batchNumber || 'N/A' }}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div *ngIf="item.expiryDate" class="text-sm text-gray-900">
                        {{ item.expiryDate | date:'shortDate' }}
                        <div *ngIf="item.daysUntilExpiry !== undefined"
                             [ngClass]="item.daysUntilExpiry <= 30 ? 'text-orange-600' : 'text-gray-500'"
                             class="text-xs">
                          {{ item.daysUntilExpiry }} days
                        </div>
                      </div>
                      <div *ngIf="!item.expiryDate" class="text-sm text-gray-500">N/A</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div *ngIf="item.unitCost" class="text-sm text-gray-900">KES {{ item.unitCost }}</div>
                      <div *ngIf="!item.unitCost" class="text-sm text-gray-500">N/A</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div *ngIf="item.unitCost" class="text-sm font-medium text-gray-900">
                        KES {{ (item.quantity * item.unitCost).toFixed(2) }}
                      </div>
                      <div *ngIf="!item.unitCost" class="text-sm text-gray-500">N/A</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div class="flex gap-2">
                        <app-secondary-button
                          label="Adjust"
                          icon="tune"
                          size="small"
                          (click)="adjustItem(item)">
                        </app-secondary-button>
                        <app-secondary-button
                          label="Transfer"
                          icon="swap_horiz"
                          size="small"
                          (click)="transferItem(item)">
                        </app-secondary-button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Mobile/Tablet Card View (md and below) -->
          <div *ngIf="!loading && filteredInventory.length > 0" class="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              *ngFor="let item of filteredInventory"
              class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">

              <!-- Item Header -->
              <div class="flex items-start justify-between mb-3">
                <div class="flex-1">
                  <h3 class="font-semibold text-gray-900 text-lg">{{ item.productName }}</h3>
                  <p class="text-sm text-brand-sky font-medium">{{ item.branchName }}</p>
                </div>
                <div class="flex items-center gap-2">
                  <span
                    *ngIf="item.lowStockAlert"
                    class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                    <mat-icon class="text-xs">warning</mat-icon>
                    Low Stock
                  </span>
                  <span
                    *ngIf="item.expiringAlert"
                    class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">
                    <mat-icon class="text-xs">schedule</mat-icon>
                    Expiring
                  </span>
                </div>
              </div>

              <!-- Item Details -->
              <div class="space-y-2 mb-4">
                <div class="text-sm text-gray-600">
                  <span class="font-medium">Current Stock:</span>
                  <span [ngClass]="item.lowStockAlert ? 'text-red-600 font-semibold' : 'text-gray-900'">
                    {{ item.quantity }}
                  </span>
                </div>
                <div *ngIf="item.batchNumber" class="text-sm text-gray-600">
                  <span class="font-medium">Batch:</span> {{ item.batchNumber }}
                </div>
                <div *ngIf="item.expiryDate" class="text-sm text-gray-600">
                  <span class="font-medium">Expiry:</span> {{ item.expiryDate | date:'shortDate' }}
                  <span *ngIf="item.daysUntilExpiry !== undefined"
                        [ngClass]="item.daysUntilExpiry <= 30 ? 'text-orange-600' : 'text-gray-500'"
                        class="ml-1 text-xs">
                    ({{ item.daysUntilExpiry }} days)
                  </span>
                </div>
                <div *ngIf="item.unitCost" class="text-sm text-gray-600">
                  <span class="font-medium">Unit Cost:</span> KES {{ item.unitCost }}
                </div>
                <div *ngIf="item.locationInBranch" class="text-sm text-gray-600">
                  <span class="font-medium">Location:</span> {{ item.locationInBranch }}
                </div>
              </div>

              <!-- Stock Level Indicator -->
              <div class="mb-4">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-sm font-medium text-gray-700">Stock Level</span>
                  <span class="text-sm text-gray-500">{{ getStockPercentage(item) }}%</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                  <div
                    class="h-2 rounded-full transition-all duration-300"
                    [ngClass]="getStockLevelClass(item)"
                    [style.width.%]="getStockPercentage(item)">
                  </div>
                </div>
                <div class="flex justify-between mt-1 text-xs text-gray-500">
                  <span>Min Stock</span>
                  <span *ngIf="item.quantity > 0">Current: {{ item.quantity }}</span>
                </div>
              </div>

              <!-- Financial Information -->
              <div *ngIf="item.unitCost || item.sellingPrice" class="mb-4 p-3 bg-gray-50 rounded-lg">
                <div class="grid grid-cols-2 gap-2 text-sm">
                  <div *ngIf="item.unitCost">
                    <span class="font-medium text-gray-600">Cost:</span>
                    <p class="text-gray-900">KES {{ item.unitCost }}</p>
                  </div>
                  <div *ngIf="item.sellingPrice">
                    <span class="font-medium text-gray-600">Price:</span>
                    <p class="text-gray-900">KES {{ item.sellingPrice }}</p>
                  </div>
                  <div *ngIf="item.unitCost && item.sellingPrice" class="col-span-2">
                    <span class="font-medium text-gray-600">Value:</span>
                    <p class="text-gray-900 font-semibold">KES {{ (item.quantity * item.unitCost).toFixed(2) }}</p>
                  </div>
                </div>
              </div>

              <!-- Actions -->
              <div class="flex gap-2">
                <button
                  mat-stroked-button
                  size="small"
                  (click)="adjustItem(item)"
                  class="flex-1">
                  <mat-icon class="text-xs">tune</mat-icon>
                  Adjust
                </button>
                <button
                  mat-stroked-button
                  size="small"
                  (click)="transferItem(item)"
                  class="flex-1">
                  <mat-icon class="text-xs">swap_horiz</mat-icon>
                  Transfer
                </button>
                <button
                  mat-icon-button
                  size="small"
                  (click)="viewItemDetails(item)"
                  matTooltip="View Details">
                  <mat-icon class="text-xs">visibility</mat-icon>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class InventoryComponent implements OnInit {
  inventory: InventoryDto[] = [];
  filteredInventory: InventoryDto[] = [];
  branches: BranchDto[] = [];
  loading = false;
  searchQuery = '';
  branchFilter = '';
  statusFilter = '';
  stats: InventoryStats = {
    totalItems: 0,
    totalValue: 0,
    lowStockCount: 0,
    expiringCount: 0
  };

  constructor(
    private inventoryService: InventoryService,
    private branchesService: BranchesService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    this.loadInventory();
    this.loadBranches();
    this.loadStats();
  }

  loadInventory(): void {
    this.loading = true;
    this.inventoryService.loadInventory(true);
    this.inventoryService.inventory$.subscribe(inventory => {
      this.inventory = inventory;
      this.applyFilters();
      this.loading = false;
    });
  }

  loadBranches(): void {
    this.branchesService.loadBranches();
    this.branchesService.branches$.subscribe(branches => {
      this.branches = branches || [];
    });
  }

  loadStats(): void {
    this.inventoryService.getInventoryStats().subscribe(stats => {
      this.stats = stats;
    });
  }

  onSearch(): void {
    this.applyFilters();
  }

  applyFilters(): void {
    let filtered = [...this.inventory];

    // Search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.productName.toLowerCase().includes(query) ||
        (item.batchNumber && item.batchNumber.toLowerCase().includes(query)) ||
        item.branchName.toLowerCase().includes(query)
      );
    }

    // Branch filter
    if (this.branchFilter) {
      filtered = filtered.filter(item => item.branchId === this.branchFilter);
    }

    // Status filter
    if (this.statusFilter) {
      filtered = filtered.filter(item => {
        switch (this.statusFilter) {
          case 'low_stock':
            return item.lowStockAlert;
          case 'expiring':
            return item.expiringAlert && !this.isExpired(item);
          case 'expired':
            return this.isExpired(item);
          case 'normal':
            return !item.lowStockAlert && !item.expiringAlert && !this.isExpired(item);
          default:
            return true;
        }
      });
    }

    this.filteredInventory = filtered;
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.branchFilter = '';
    this.statusFilter = '';
    this.applyFilters();
  }

  refreshInventory(): void {
    this.inventoryService.refreshInventory();
    this.loadStats();
  }

  isExpired(item: InventoryDto): boolean {
    if (!item.expiryDate) return false;
    return new Date(item.expiryDate) < new Date();
  }

  getStockPercentage(item: InventoryDto): number {
    // For display purposes, use a simple calculation
    // This would ideally be based on min/max stock levels from the product
    const maxStock = Math.max(item.quantity * 2, 100); // Simplified calculation
    return Math.min((item.quantity / maxStock) * 100, 100);
  }

  getStockLevelClass(item: InventoryDto): string {
    if (item.quantity === 0) return 'bg-red-500';
    if (item.lowStockAlert) return 'bg-orange-500';
    if (item.expiringAlert) return 'bg-yellow-500';
    return 'bg-green-500';
  }

  createInventory(): void {
    const dialogRef = this.dialog.open(CreateInventoryDialogComponent, {
      width: 'min(95vw, 900px)',
      maxWidth: '900px',
      data: { branches: this.branches }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.inventoryService.refreshInventory();
        this.loadStats();
        this.snackBar.open('Stock added successfully!', 'Close', { duration: 3000 });
      }
    });
  }

  adjustInventory(): void {
    const dialogRef = this.dialog.open(AdjustInventoryDialogComponent, {
      width: '600px',
      data: { branches: this.branches }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.inventoryService.refreshInventory();
        this.loadStats();
        this.snackBar.open('Stock adjusted successfully!', 'Close', { duration: 3000 });
      }
    });
  }

  transferInventory(): void {
    const dialogRef = this.dialog.open(TransferInventoryDialogComponent, {
      width: '700px',
      data: { branches: this.branches }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.inventoryService.refreshInventory();
        this.loadStats();
        this.snackBar.open('Inventory transferred successfully!', 'Close', { duration: 3000 });
      }
    });
  }

  adjustItem(item: InventoryDto): void {
    const dialogRef = this.dialog.open(AdjustInventoryDialogComponent, {
      width: '600px',
      data: { item, branches: this.branches }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.inventoryService.refreshInventory();
        this.loadStats();
        this.snackBar.open('Stock adjusted successfully!', 'Close', { duration: 3000 });
      }
    });
  }

  transferItem(item: InventoryDto): void {
    const dialogRef = this.dialog.open(TransferInventoryDialogComponent, {
      width: '700px',
      data: { item, branches: this.branches }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.inventoryService.refreshInventory();
        this.loadStats();
        this.snackBar.open('Inventory transferred successfully!', 'Close', { duration: 3000 });
      }
    });
  }

  viewAlerts(): void {
    const dialogRef = this.dialog.open(InventoryAlertsDialogComponent, {
      width: '800px',
      data: { branches: this.branches }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.inventoryService.refreshInventory();
        this.loadStats();
      }
    });
  }

  viewItemDetails(item: InventoryDto): void {
    // TODO: Implement item details dialog
    this.snackBar.open('Item details coming soon!', 'Close', { duration: 2000 });
  }
}
