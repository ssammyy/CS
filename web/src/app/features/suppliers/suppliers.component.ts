import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';

// Professional Button Components
import { 
  PrimaryButtonComponent, 
  SecondaryButtonComponent, 
  AccentButtonComponent, 
  DangerButtonComponent, 
  IconButtonComponent,
  TextButtonComponent 
} from '../../shared/components';

import { 
  SuppliersService, 
  SupplierDto, 
  CreateSupplierRequest, 
  SupplierCategory, 
  SupplierStatus,
  SupplierSummaryDto 
} from '../../core/services/suppliers.service';
import { CreateSupplierDialogComponent } from './create-supplier.dialog';
import { EditSupplierDialogComponent } from './edit-supplier.dialog';
import { SupplierDetailsDialogComponent } from './supplier-details.dialog';

/**
 * Suppliers component for managing supplier relationships in the procurement system.
 * Provides CRUD operations, search, filtering, and supplier overview.
 */
@Component({
  selector: 'app-suppliers',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatChipsModule,
    MatMenuModule,
    MatButtonModule,
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
            <h1 class="text-3xl font-bold text-gray-900">Suppliers</h1>
            <p class="text-gray-600 mt-1">Manage your supplier relationships and procurement partners</p>
          </div>
          <app-primary-button 
            label="Add Supplier"
            icon="add_business"
            (click)="createSupplier()">
          </app-primary-button>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-white rounded-lg shadow p-4 border-l-4 border-brand-sky">
          <div class="flex items-center">
            <div class="p-2 bg-brand-sky/20 rounded-lg">
              <mat-icon class="text-brand-sky">business</mat-icon>
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-600">Total Suppliers</p>
              <p class="text-2xl font-bold text-gray-900">{{ stats.totalSuppliers || 0 }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-4 border-l-4 border-brand-mint">
          <div class="flex items-center">
            <div class="p-2 bg-brand-mint/20 rounded-lg">
              <mat-icon class="text-brand-mint">check_circle</mat-icon>
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-600">Active</p>
              <p class="text-2xl font-bold text-gray-900">{{ stats.activeSuppliers || 0 }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
          <div class="flex items-center">
            <div class="p-2 bg-orange-500/20 rounded-lg">
              <mat-icon class="text-orange-500">pause_circle</mat-icon>
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-600">Inactive</p>
              <p class="text-2xl font-bold text-gray-900">{{ stats.inactiveSuppliers || 0 }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
          <div class="flex items-center">
            <div class="p-2 bg-purple-500/20 rounded-lg">
              <mat-icon class="text-purple-500">category</mat-icon>
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-600">Categories</p>
              <p class="text-2xl font-bold text-gray-900">{{ getCategoryCount() }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Search and Filters -->
      <div class="bg-white rounded-lg shadow p-4 mb-6">
        <div class="flex flex-col md:flex-row gap-4">
          <mat-form-field class="flex-1">
            <mat-label>Search Suppliers</mat-label>
            <mat-icon matPrefix class="mr-2 opacity-60">search</mat-icon>
            <input 
              matInput 
              [(ngModel)]="searchQuery" 
              (input)="onSearch()"
              placeholder="Search by name, contact person, or email..." />
          </mat-form-field>

          <mat-form-field class="w-full md:w-48">
            <mat-label>Filter by Category</mat-label>
            <mat-select [(ngModel)]="categoryFilter" (selectionChange)="applyFilters()">
              <mat-option value="">All Categories</mat-option>
              <mat-option *ngFor="let cat of categories" [value]="cat.category">
                {{ cat.displayName }}
              </mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field class="w-full md:w-48">
            <mat-label>Filter by Status</mat-label>
            <mat-select [(ngModel)]="statusFilter" (selectionChange)="applyFilters()">
              <mat-option value="">All Status</mat-option>
              <mat-option *ngFor="let status of statuses" [value]="status.status">
                {{ status.displayName }}
              </mat-option>
            </mat-select>
          </mat-form-field>

          <app-secondary-button 
            label="Clear Filters"
            (click)="clearFilters()">
          </app-secondary-button>
        </div>
      </div>

      <!-- Suppliers List -->
      <div class="bg-white rounded-lg shadow">
        <div class="p-4 border-b border-gray-200">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-gray-900">Suppliers List</h2>
            <div class="flex items-center gap-2">
              <span class="text-sm text-gray-600">{{ filteredSuppliers.length }} of {{ suppliers.length }} suppliers</span>
              <app-icon-button 
                icon="refresh"
                (click)="refreshSuppliers()"
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

          <div *ngIf="!loading && filteredSuppliers.length === 0" class="text-center py-12 text-gray-500">
            <mat-icon class="text-6xl text-gray-300 mb-4">business</mat-icon>
            <h3 class="text-xl font-semibold text-gray-400 mb-2">No suppliers found</h3>
            <p class="text-gray-400">Try adjusting your search or filters, or create your first supplier.</p>
          </div>

          <!-- Desktop Table View (lg screens and up) -->
          <div *ngIf="!loading && filteredSuppliers.length > 0" class="hidden lg:block">
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Terms</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  <tr *ngFor="let supplier of filteredSuppliers" class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="flex items-center">
                        <div class="flex-shrink-0 h-10 w-10">
                          <div class="h-10 w-10 rounded-full bg-brand-sky/20 flex items-center justify-center">
                            <mat-icon class="text-brand-sky text-lg">business</mat-icon>
                          </div>
                        </div>
                        <div class="ml-4">
                          <div class="text-sm font-medium text-gray-900">{{ supplier.name }}</div>
                          <div class="text-sm text-gray-500">{{ supplier.physicalAddress || 'No address' }}</div>
                        </div>
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="text-sm text-gray-900">{{ supplier.contactPerson || 'No contact' }}</div>
                      <div class="text-sm text-gray-500">{{ supplier.phone || supplier.email || 'No contact info' }}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-mint/20 text-gray-800">
                        {{ getCategoryDisplayName(supplier.category) }}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                            [ngClass]="getStatusClasses(supplier.status)">
                        {{ getStatusDisplayName(supplier.status) }}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {{ supplier.paymentTerms || 'Not specified' }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button mat-icon-button [matMenuTriggerFor]="menu" class="text-gray-400 hover:text-gray-600">
                        <mat-icon>more_vert</mat-icon>
                      </button>
                      <mat-menu #menu="matMenu">
                        <button mat-menu-item (click)="viewSupplier(supplier)">
                          <mat-icon>visibility</mat-icon>
                          <span>View Details</span>
                        </button>
                        <button mat-menu-item (click)="editSupplier(supplier)">
                          <mat-icon>edit</mat-icon>
                          <span>Edit</span>
                        </button>
                        <button mat-menu-item (click)="changeStatus(supplier)" 
                                [disabled]="supplier.status === 'BLACKLISTED'">
                          <mat-icon>swap_horiz</mat-icon>
                          <span>Change Status</span>
                        </button>
                        <button mat-menu-item (click)="deleteSupplier(supplier)" 
                                [disabled]="supplier.status === 'BLACKLISTED'">
                          <mat-icon>delete</mat-icon>
                          <span>Delete</span>
                        </button>
                      </mat-menu>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Mobile Card View (below lg screens) -->
          <div *ngIf="!loading && filteredSuppliers.length > 0" class="lg:hidden space-y-4">
            <div *ngFor="let supplier of filteredSuppliers" 
                 class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center mb-2">
                    <div class="h-8 w-8 rounded-full bg-brand-sky/20 flex items-center justify-center mr-3">
                      <mat-icon class="text-brand-sky text-sm">business</mat-icon>
                    </div>
                    <div>
                      <h3 class="text-sm font-medium text-gray-900">{{ supplier.name }}</h3>
                      <p class="text-xs text-gray-500">{{ getCategoryDisplayName(supplier.category) }}</p>
                    </div>
                  </div>
                  
                  <div class="space-y-1 text-sm">
                    <div *ngIf="supplier.contactPerson" class="text-gray-600">
                      <span class="font-medium">Contact:</span> {{ supplier.contactPerson }}
                    </div>
                    <div *ngIf="supplier.phone" class="text-gray-600">
                      <span class="font-medium">Phone:</span> {{ supplier.phone }}
                    </div>
                    <div *ngIf="supplier.email" class="text-gray-600">
                      <span class="font-medium">Email:</span> {{ supplier.email }}
                    </div>
                    <div *ngIf="supplier.paymentTerms" class="text-gray-600">
                      <span class="font-medium">Payment:</span> {{ supplier.paymentTerms }}
                    </div>
                  </div>

                  <div class="mt-3 flex items-center gap-2">
                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                          [ngClass]="getStatusClasses(supplier.status)">
                      {{ getStatusDisplayName(supplier.status) }}
                    </span>
                  </div>
                </div>

                <div class="ml-4">
                  <button mat-icon-button [matMenuTriggerFor]="mobileMenu" class="text-gray-400">
                    <mat-icon>more_vert</mat-icon>
                  </button>
                  <mat-menu #mobileMenu="matMenu">
                    <button mat-menu-item (click)="viewSupplier(supplier)">
                      <mat-icon>visibility</mat-icon>
                      <span>View Details</span>
                    </button>
                    <button mat-menu-item (click)="editSupplier(supplier)">
                      <mat-icon>edit</mat-icon>
                      <span>Edit</span>
                    </button>
                    <button mat-menu-item (click)="changeStatus(supplier)" 
                            [disabled]="supplier.status === 'BLACKLISTED'">
                      <mat-icon>swap_horiz</mat-icon>
                      <span>Change Status</span>
                    </button>
                    <button mat-menu-item (click)="deleteSupplier(supplier)" 
                            [disabled]="supplier.status === 'BLACKLISTED'">
                      <mat-icon>delete</mat-icon>
                      <span>Delete</span>
                    </button>
                  </mat-menu>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class SuppliersComponent implements OnInit {
  suppliers: SupplierDto[] = [];
  filteredSuppliers: SupplierDto[] = [];
  loading = false;
  searchQuery = '';
  categoryFilter = '';
  statusFilter = '';
  stats: SupplierSummaryDto = {
    totalSuppliers: 0,
    activeSuppliers: 0,
    inactiveSuppliers: 0,
    categoryBreakdown: {},
    statusBreakdown: {}
  };
  categories: any[] = [];
  statuses: any[] = [];

  constructor(
    private suppliersService: SuppliersService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadSuppliers();
    this.loadCategories();
    this.loadStatuses();
    this.loadStats();
  }

  loadSuppliers(): void {
    this.loading = true;
    this.suppliersService.loadSuppliers();
    this.suppliersService.suppliers$.subscribe(suppliers => {
      this.suppliers = suppliers;
      this.applyFilters();
      this.loading = false;
    });
  }

  loadCategories(): void {
    this.suppliersService.getSupplierCategories().subscribe(categories => {
      this.categories = categories;
    });
  }

  loadStatuses(): void {
    this.suppliersService.getSupplierStatuses().subscribe(statuses => {
      this.statuses = statuses;
    });
  }

  loadStats(): void {
    this.suppliersService.getSupplierSummary().subscribe(stats => {
      this.stats = stats;
    });
  }

  onSearch(): void {
    this.applyFilters();
  }

  applyFilters(): void {
    let filtered = [...this.suppliers];

    // Apply search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(supplier =>
        supplier.name.toLowerCase().includes(query) ||
        (supplier.contactPerson && supplier.contactPerson.toLowerCase().includes(query)) ||
        (supplier.email && supplier.email.toLowerCase().includes(query))
      );
    }

    // Apply category filter
    if (this.categoryFilter) {
      filtered = filtered.filter(supplier => supplier.category === this.categoryFilter);
    }

    // Apply status filter
    if (this.statusFilter) {
      filtered = filtered.filter(supplier => supplier.status === this.statusFilter);
    }

    this.filteredSuppliers = filtered;
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.categoryFilter = '';
    this.statusFilter = '';
    this.applyFilters();
  }

  refreshSuppliers(): void {
    this.suppliersService.refreshSuppliers();
  }

  createSupplier(): void {
    const dialogRef = this.dialog.open(CreateSupplierDialogComponent, {
      width: '600px',
      maxHeight: '90vh'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.suppliersService.createSupplier(result).subscribe({
          next: (supplier) => {
            this.snackBar.open('Supplier created successfully', 'Close', { duration: 3000 });
            this.refreshSuppliers();
          },
          error: (error) => {
            this.snackBar.open('Error creating supplier: ' + error.message, 'Close', { duration: 5000 });
          }
        });
      }
    });
  }

  editSupplier(supplier: SupplierDto): void {
    const dialogRef = this.dialog.open(EditSupplierDialogComponent, {
      width: '600px',
      maxHeight: '90vh',
      data: supplier
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.suppliersService.updateSupplier(supplier.id, result).subscribe({
          next: (updatedSupplier) => {
            this.snackBar.open('Supplier updated successfully', 'Close', { duration: 3000 });
            this.refreshSuppliers();
          },
          error: (error) => {
            this.snackBar.open('Error updating supplier: ' + error.message, 'Close', { duration: 5000 });
          }
        });
      }
    });
  }

  viewSupplier(supplier: SupplierDto): void {
    this.dialog.open(SupplierDetailsDialogComponent, {
      width: '600px',
      maxHeight: '90vh',
      data: supplier
    });
  }

  changeStatus(supplier: SupplierDto): void {
    // Simple status change dialog - could be enhanced with a proper dialog
    const currentStatus = supplier.status;
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    
    this.suppliersService.changeSupplierStatus(supplier.id, newStatus).subscribe({
      next: (updatedSupplier) => {
        this.snackBar.open(`Supplier status changed to ${newStatus}`, 'Close', { duration: 3000 });
        this.refreshSuppliers();
      },
      error: (error) => {
        this.snackBar.open('Error changing supplier status: ' + error.message, 'Close', { duration: 5000 });
      }
    });
  }

  deleteSupplier(supplier: SupplierDto): void {
    if (confirm(`Are you sure you want to delete supplier "${supplier.name}"?`)) {
      this.suppliersService.deleteSupplier(supplier.id).subscribe({
        next: () => {
          this.snackBar.open('Supplier deleted successfully', 'Close', { duration: 3000 });
          this.refreshSuppliers();
        },
        error: (error) => {
          this.snackBar.open('Error deleting supplier: ' + error.message, 'Close', { duration: 5000 });
        }
      });
    }
  }

  getCategoryDisplayName(category: string): string {
    const cat = this.categories.find(c => c.category === category);
    return cat ? cat.displayName : category;
  }

  getStatusDisplayName(status: string): string {
    const stat = this.statuses.find(s => s.status === status);
    return stat ? stat.displayName : status;
  }

  getStatusClasses(status: string): string {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'INACTIVE':
        return 'bg-gray-100 text-gray-800';
      case 'SUSPENDED':
        return 'bg-orange-100 text-orange-800';
      case 'BLACKLISTED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getCategoryCount(): number {
    return Object.keys(this.stats.categoryBreakdown).length;
  }
}


