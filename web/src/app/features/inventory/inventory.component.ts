import { Component, OnInit } from '@angular/core';
import { skip, take } from 'rxjs';
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
import { MatTabsModule } from '@angular/material/tabs';

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
import { BranchContextService } from '../../core/services/branch-context.service';
import { PosPrefillService } from '../../core/services/pos-prefill.service';
import { Router } from '@angular/router';
import { CreateInventoryDialogComponent } from './create-inventory.dialog';
import { AdjustInventoryDialogComponent } from './adjust-inventory.dialog';
import { TransferInventoryDialogComponent } from './transfer-inventory.dialog';
import { InventoryAlertsDialogComponent } from './inventory-alerts.dialog';
import { InventoryTransferHistoryDialogComponent } from './transfer-history.dialog';
import {MatButton} from '@angular/material/button';

/**
 * Inventory component for managing stock levels, transfers, and alerts.
 * Provides a comprehensive dashboard for inventory management with professional UI.
 */
@Component({
  selector: 'app-inventory',
  standalone: true,
  styles: [`
    :host ::ng-deep .inventory-branch-tabs .mat-mdc-tab-body-wrapper { display: none; }
    @media (max-width: 767px) {
      :host .stats-section.stats-collapsed .stats-cards-grid { display: none; }
    }
  `],
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
    MatTabsModule,
    // Professional Button Components
    PrimaryButtonComponent,
    SecondaryButtonComponent,
    AccentButtonComponent,
    DangerButtonComponent,
    IconButtonComponent,
    TextButtonComponent,
    MatButton
  ],
  template: `
    <div class="bg-gray-50 p-4 sm:p-6 pb-8">
      <!-- Header -->
      <div class="mb-4">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold text-gray-900">Inventory Management</h1>
            <p class="text-gray-600 mt-1">Monitor stock levels, manage transfers, and track alerts</p>
          </div>
          <app-primary-button
            *ngIf="isAdmin && branchContext.currentBranch"
            label="Add Stock"
            icon="add"
            (click)="createInventory()">
          </app-primary-button>
        </div>
      </div>

      <!-- Branch tabs: All Branches (admin) or branch in context (others) -->
      <div class="bg-white rounded-lg shadow border border-gray-200 mb-4 overflow-hidden">
        <mat-tab-group
          *ngIf="branchTabs.length > 0"
          [(selectedIndex)]="selectedTabIndex"
          (selectedIndexChange)="onTabChange($event)"
          class="inventory-branch-tabs"
          animationDuration="0ms">
          <mat-tab *ngFor="let tab of branchTabs; let i = index" [label]="tab.label"></mat-tab>
        </mat-tab-group>
        <div class="px-4 pb-4 pt-2 flex flex-wrap items-center gap-4 border-t border-gray-100">
          <div class="filter-group flex flex-col gap-2 min-w-0 md:min-w-[180px]">
            <label class="text-sm font-medium text-gray-700">Status</label>
            <select
              [ngModel]="statusFilter"
              (ngModelChange)="statusFilter = $event; applyFilters()"
              class="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-mint focus:border-transparent">
              <option value="">All</option>
              <option value="low_stock">Low Stock</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
          </div>
          <div class="flex items-end">
            <button
              type="button"
              (click)="clearFilters()"
              class="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors text-sm">
              <mat-icon class="!text-base !w-4 !h-4">clear</mat-icon>
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      <!-- Stats Cards (collapsible on mobile, collapsed by default) -->
      <div class="stats-section mb-4" [class.stats-collapsed]="statsCollapsed">
        <div class="flex items-center justify-between mb-2 md:mb-3">
          <p class="text-sm text-gray-500">{{ getStatsContextLabel() }}</p>
          <button
            type="button"
            class="md:hidden flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm text-gray-700"
            (click)="statsCollapsed = !statsCollapsed"
            [attr.aria-expanded]="!statsCollapsed">
            <span>{{ statsCollapsed ? 'Show stats' : 'Hide stats' }}</span>
            <mat-icon class="!text-lg !w-5 !h-5">{{ statsCollapsed ? 'expand_more' : 'expand_less' }}</mat-icon>
          </button>
        </div>
        <div class="stats-cards-grid grid grid-cols-1 md:grid-cols-3 gap-4" [ngClass]="{'md:grid-cols-4': isAdmin}">
          <div class="bg-white rounded-lg shadow p-4 border-l-4 border-brand-sky">
            <div class="flex items-center">
              <div class="p-2 bg-brand-sky/20 rounded-lg">
                <mat-icon class="text-brand-sky">inventory_2</mat-icon>
              </div>
              <div class="ml-3">
                <p class="text-sm font-medium text-gray-600">Total Items</p>
                <p class="text-2xl font-bold text-gray-900">{{ stats.totalItems ?? 0 }}</p>
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
                <p class="text-2xl font-bold text-gray-900">{{ stats.lowStockCount ?? 0 }}</p>
              </div>
            </div>
          </div>

          <div *ngIf="isAdmin" class="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
            <div class="flex items-center">
              <div class="p-2 bg-green-500/20 rounded-lg">
                <mat-icon class="text-green-500">attach_money</mat-icon>
              </div>
              <div class="ml-3">
                <p class="text-sm font-medium text-gray-600">Total Value</p>
                <p class="text-2xl font-bold text-gray-900">KES {{ (stats.totalValue ?? 0).toLocaleString() }}</p>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="mb-4">
        <div class="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide md:overflow-x-visible md:pb-0 md:mx-0 md:px-0" style="scrollbar-width: none; -ms-overflow-style: none;">
          <div class="flex gap-2 flex-nowrap min-w-max md:flex-wrap md:min-w-0">
             <app-secondary-button *ngIf="isAdmin" label="Transfer History" icon="history" (click)="viewTransferHistory()"></app-secondary-button>
<!--            <app-accent-button label="Alerts" icon="notifications" (click)="viewAlerts()"></app-accent-button>-->
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
                (click)="refreshInventory(branchFilter || undefined)"
                [disabled]="loading"
                matTooltip="Refresh">
              </app-icon-button>
            </div>
          </div>
          <div class="mt-4 flex-1 relative min-w-0 max-w-md">
            <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 !text-xl !w-5 !h-5">search</mat-icon>
            <input
              matInput
              [(ngModel)]="searchQuery"
              (input)="onSearch()"
              placeholder="Search by product name, batch, or branch..."
              class="!pl-10 w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-mint focus:border-transparent">
          </div>
        </div>

        <div class="p-4">
          <div *ngIf="loading" class="flex justify-center py-8">
            <mat-spinner diameter="40"></mat-spinner>
          </div>

          <div *ngIf="!loading && filteredInventory.length === 0" class="text-center py-8 text-gray-500">
            <mat-icon class="text-5xl text-gray-300 mb-3">inventory_2</mat-icon>
            <h3 class="text-lg font-semibold text-gray-400 mb-1">No inventory items found</h3>
            <p class="text-sm text-gray-400">Try adjusting your search or filters, or add your first inventory item.</p>
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
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Selling Price</th>
                    <th *ngIf="isAdmin" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
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
                      <div *ngIf="item.sellingPrice" class="text-sm text-gray-900">KES {{ item.sellingPrice }}</div>
                      <div *ngIf="!item.sellingPrice" class="text-sm text-gray-500">N/A</div>
                    </td>
                    <td *ngIf="isAdmin" class="px-6 py-4 whitespace-nowrap">
                      <div *ngIf="item.unitCost" class="text-sm text-gray-900">KES {{ item.unitCost }}</div>
                      <div *ngIf="!item.unitCost" class="text-sm text-gray-500">N/A</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div *ngIf="isAdmin && item.unitCost" class="text-sm font-medium text-gray-900">
                        KES {{ (item.quantity * item.unitCost).toFixed(2) }}
                      </div>
                      <div *ngIf="!isAdmin || !item.unitCost" class="text-sm text-gray-500">N/A</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div class="flex gap-2">
                        <app-secondary-button
                          *ngIf="isAdmin && canOperateOnItem(item)"
                          label="Adjust"
                          icon="tune"
                          size="small"
                          (click)="adjustItem(item)">
                        </app-secondary-button>
                        <app-secondary-button
                          *ngIf="canOperateOnItem(item)"
                          label="Transfer"
                          icon="swap_horiz"
                          size="small"
                          (click)="transferItem(item)">
                        </app-secondary-button>
                        <app-accent-button
                          *ngIf="canOperateOnItem(item) && item.quantity > 0"
                          label="Sell"
                          icon="point_of_sale"
                          size="small"
                          (click)="sellItem(item)">
                        </app-accent-button>
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
                <div *ngIf=" item.unitCost" class="text-sm text-gray-600">
                  <span class="font-medium">Unit Cost:</span> KES {{ item.unitCost }}
                </div>
              </div>

              <!-- Stock Level Indicator -->


              <!-- Financial Information -->
              <div *ngIf="(isAdmin && item.unitCost) || item.sellingPrice" class="mb-4 p-3 bg-gray-50 rounded-lg">
                <div class="grid grid-cols-2 gap-2 text-sm">
                  <div *ngIf="isAdmin && item.unitCost">
                    <span class="font-medium text-gray-600">Cost:</span>
                    <p class="text-gray-900">KES {{ item.unitCost }}</p>
                  </div>
                  <div *ngIf="item.sellingPrice">
                    <span class="font-medium text-gray-600">Price:</span>
                    <p class="text-gray-900">KES {{ item.sellingPrice }}</p>
                  </div>
                  <div *ngIf="isAdmin && item.unitCost && item.sellingPrice" class="col-span-2">
                    <span class="font-medium text-gray-600">Value:</span>
                    <p class="text-gray-900 font-semibold">KES {{ (item.quantity * item.unitCost).toFixed(2) }}</p>
                  </div>
                </div>
              </div>

              <!-- Actions -->
              <div class="flex gap-2 flex-wrap">
                <button
                  *ngIf="isAdmin && canOperateOnItem(item)"
                  mat-stroked-button
                  size="small"
                  (click)="adjustItem(item)"
                  class="flex-1 min-w-0">
                  <mat-icon class="text-xs">tune</mat-icon>
                  Adjust
                </button>
                <button
                  *ngIf="canOperateOnItem(item)"
                  mat-stroked-button
                  size="small"
                  (click)="transferItem(item)"
                  class="flex-1 min-w-0">
                  <mat-icon class="text-xs">swap_horiz</mat-icon>
                  Transfer
                </button>
                <button
                  *ngIf="canOperateOnItem(item) && item.quantity > 0"
                  mat-stroked-button
                  size="small"
                  color="success"
                  (click)="sellItem(item)"
                  class="flex-1 min-w-0">
                  <mat-icon class="text-xs">point_of_sale</mat-icon>
                  Sell
                </button>

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
  /** Tabs for branch switching: admins get "All Branches" + one per branch; others get branch in context. */
  branchTabs: { label: string; branchId: string }[] = [];
  selectedTabIndex = 0;
  /** Stats cards collapsed on mobile for a neater viewport; only affects layout on small screens. */
  statsCollapsed = true;
  isAdmin = (() => {
    try {
      const role = JSON.parse(localStorage.getItem('auth_user') || '{}')?.role;
      return role === 'ADMIN' || role === 'PLATFORM_ADMIN';
    } catch {
      return false;
    }
  })();
  stats: InventoryStats = {
    totalItems: 0,
    totalValue: 0,
    lowStockCount: 0,
    expiringCount: 0
  };

  constructor(
    private inventoryService: InventoryService,
    private branchesService: BranchesService,
    readonly branchContext: BranchContextService,
    private posPrefillService: PosPrefillService,
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    this.loadBranches();
    this.branchContext.currentBranch$.subscribe(() => {
      this.buildBranchTabs();
      this.loadData();
    });
  }

  /** Builds branch tabs: everyone sees "All Branches" then each branch (view-only for non-admins on other branches). Default tab: admins = All Branches, others = their current branch. */
  buildBranchTabs(): void {
    this.branchTabs = [
      { label: 'All Branches', branchId: '' },
      ...this.branches.map(b => ({ label: b.name, branchId: b.id }))
    ];
    if (this.isAdmin) {
      this.selectedTabIndex = 0;
      this.branchFilter = '';
    } else {
      const current = this.branchContext.currentBranch;
      const idx = current ? this.branchTabs.findIndex(t => t.branchId === current.id) : -1;
      this.selectedTabIndex = idx >= 0 ? idx : 0;
      this.branchFilter = this.branchTabs[this.selectedTabIndex]?.branchId ?? '';
    }
  }

  /** Handles tab change: updates branch filter and reloads data. */
  onTabChange(index: number): void {
    this.selectedTabIndex = index;
    this.branchFilter = this.branchTabs[index]?.branchId ?? '';
    this.onBranchChange();
  }

  /** Whether operations (Adjust, Transfer, Sell) are allowed for this item. Admins can operate on any branch's item; others only when item's branch matches current branch context. */
  canOperateOnItem(item: InventoryDto): boolean {
    if (this.isAdmin) return true;
    const currentBranch = this.branchContext.currentBranch;
    return !!currentBranch && item.branchId === currentBranch.id;
  }

  getStatsContextLabel(): string {
    if (!this.branchFilter) return 'All branches combined';
    const branch = this.branches.find(b => b.id === this.branchFilter);
    return branch?.name ?? 'Selected branch';
  }

  loadData(): void {
    this.loadInventory();
    this.loadStats();
  }

  loadInventory(): void {
    this.loading = true;
    this.inventoryService.loadInventory(true, undefined);
    this.inventoryService.inventory$.pipe(skip(1), take(1)).subscribe({
      next: (inventory) => {
        this.inventory = inventory;
        this.applyFilters();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  loadBranches(): void {
    this.branchesService.loadBranches();
    this.branchesService.branches$.subscribe(branches => {
      this.branches = branches || [];
      this.buildBranchTabs();
    });
  }

  loadStats(): void {
    const branchId = this.branchFilter || undefined;
    this.inventoryService.getInventoryStatsByBranch(branchId).subscribe(stats => {
      this.stats = stats;
    });
  }

  onBranchChange(): void {
    this.loadData();
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

    // Status filter: All, Low Stock, Out of Stock
    if (this.statusFilter) {
      switch (this.statusFilter) {
        case 'low_stock':
          filtered = filtered.filter(item => item.lowStockAlert);
          break;
        case 'out_of_stock':
          filtered = filtered.filter(item => item.quantity === 0);
          break;
        default:
          break;
      }
    }

    this.filteredInventory = filtered;
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.statusFilter = '';
    this.selectedTabIndex = 0;
    this.branchFilter = this.branchTabs[0]?.branchId ?? '';
    this.applyFilters();
    this.loadStats();
  }

  refreshInventory(branchId?: string): void {
    const bid = branchId ?? (this.branchFilter || undefined);
    this.loading = true;
    this.inventoryService.refreshInventory(bid);
    this.inventoryService.inventory$.pipe(skip(1), take(1)).subscribe({
      next: (inventory) => {
        this.inventory = inventory;
        this.applyFilters();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
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
        this.inventoryService.refreshInventory(this.branchFilter || undefined);
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
        this.inventoryService.refreshInventory(this.branchFilter || undefined);
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
        this.inventoryService.refreshInventory(this.branchFilter || undefined);
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
        this.inventoryService.refreshInventory(this.branchFilter || undefined);
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
        this.inventoryService.refreshInventory(this.branchFilter || undefined);
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
        this.inventoryService.refreshInventory(this.branchFilter || undefined);
        this.loadStats();
      }
    });
  }

  viewItemDetails(item: InventoryDto): void {
    // TODO: Implement item details dialog
    this.snackBar.open('Item details coming soon!', 'Close', { duration: 2000 });
  }

  sellItem(item: InventoryDto): void {
    if (!this.canOperateOnItem(item) || item.quantity <= 0) return;
    this.posPrefillService.setPrefillItem(item);
    this.router.navigate(['/pos']);
  }

  viewTransferHistory(): void {
    const dialogRef = this.dialog.open(InventoryTransferHistoryDialogComponent, {
      width: 'min(95vw, 1200px)',
      maxWidth: '1200px',
      data: { branches: this.branches }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.refreshInventory(this.branchFilter || undefined);
      }
    });
  }
}
