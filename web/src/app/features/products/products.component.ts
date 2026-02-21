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

// Professional Button Components
import { 
  PrimaryButtonComponent, 
  SecondaryButtonComponent, 
  AccentButtonComponent, 
  DangerButtonComponent, 
  IconButtonComponent,
  TextButtonComponent 
} from '../../shared/components';

import { ProductsService, ProductDto, CreateProductRequest } from '../../core/services/products.service';
import { BranchesService, BranchDto } from '../../core/services/branches.service';
import { CreateProductDialogComponent } from './create-product.dialog';
import { EditProductDialogComponent } from './edit-product.dialog';
import { ProductDetailsDialogComponent } from './product-details.dialog';

/**
 * Products component for managing pharmaceutical products in the inventory system.
 * Provides CRUD operations, search, filtering, and inventory overview.
 */
@Component({
  selector: 'app-products',
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
            <h1 class="text-3xl font-bold text-gray-900">Products</h1>
            <p class="text-gray-600 mt-1">Manage your pharmaceutical products and inventory</p>
          </div>
          <app-primary-button 
            label="Add Product"
            icon="add"
            (click)="createProduct()">
          </app-primary-button>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-white rounded-lg shadow p-4 border-l-4 border-brand-sky">
          <div class="flex items-center">
            <div class="p-2 bg-brand-sky/20 rounded-lg">
              <mat-icon class="text-brand-sky">inventory</mat-icon>
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-600">Total Products</p>
              <p class="text-2xl font-bold text-gray-900">{{ stats.totalProducts || 0 }}</p>
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

        <div class="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
          <div class="flex items-center">
            <div class="p-2 bg-purple-500/20 rounded-lg">
              <mat-icon class="text-purple-500">prescription</mat-icon>
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-600">Prescription Required</p>
              <p class="text-2xl font-bold text-gray-900">{{ stats.prescriptionRequiredCount || 0 }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Search and Filters -->
      <div class="bg-white rounded-lg shadow p-4 mb-6">
        <div class="flex flex-col md:flex-row gap-4 items-center">
          <mat-form-field class="flex-1 w-full">
            <mat-label>Search Products</mat-label>
            <mat-icon matPrefix class="mr-2 opacity-60">search</mat-icon>
            <input 
              matInput 
              [(ngModel)]="searchQuery" 
              (input)="onSearch()"
              placeholder="Search by name, generic name, or barcode..." />
          </mat-form-field>

          <button 
            type="button"
            (click)="filtersCollapsed = !filtersCollapsed"
            class="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-sm text-gray-700 whitespace-nowrap">
            <mat-icon>filter_list</mat-icon>
            <span>Filters</span>
            <mat-icon>{{ filtersCollapsed ? 'expand_more' : 'expand_less' }}</mat-icon>
          </button>
        </div>

        <div *ngIf="!filtersCollapsed" class="mt-4 pt-4 border-t border-gray-200">
          <div class="flex flex-col md:flex-row gap-4">
            <mat-form-field class="w-full md:w-48">
              <mat-label>Filter by Status</mat-label>
              <mat-select [(ngModel)]="statusFilter" (selectionChange)="applyFilters()">
                <mat-option value="">All Status</mat-option>
                <mat-option value="active">Active</mat-option>
                <mat-option value="inactive">Inactive</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field class="w-full md:w-48">
              <mat-label>Filter by Type</mat-label>
              <mat-select [(ngModel)]="typeFilter" (selectionChange)="applyFilters()">
                <mat-option value="">All Types</mat-option>
                <mat-option value="prescription">Prescription Required</mat-option>
                <mat-option value="otc">Over the Counter</mat-option>
              </mat-select>
            </mat-form-field>

            <app-secondary-button 
              label="Clear Filters"
              (click)="clearFilters()">
            </app-secondary-button>
          </div>
        </div>
      </div>

      <!-- Products List -->
      <div class="bg-white rounded-lg shadow">
        <div class="p-4 border-b border-gray-200">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-gray-900">Products List</h2>
            <div class="flex items-center gap-2">
              <span class="text-sm text-gray-600">{{ filteredProducts.length }} of {{ products.length }} products</span>
              <app-icon-button 
                icon="refresh"
                (click)="refreshProducts()"
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

          <div *ngIf="!loading && filteredProducts.length === 0" class="text-center py-12 text-gray-500">
            <mat-icon class="text-6xl text-gray-300 mb-4">inventory</mat-icon>
            <h3 class="text-xl font-semibold text-gray-400 mb-2">No products found</h3>
            <p class="text-gray-400">Try adjusting your search or filters, or create your first product.</p>
          </div>

          <!-- Desktop Table View (lg screens and up) -->
          <div *ngIf="!loading && filteredProducts.length > 0" class="hidden lg:block">
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                    <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cost / Price</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  <tr *ngFor="let product of filteredProducts" class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div class="text-sm font-medium text-gray-900">{{ product.name }}</div>
                        <div *ngIf="product.genericName" class="text-sm text-gray-500">{{ product.genericName }}</div>
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="text-sm text-gray-900">
                        <div *ngIf="product.strength">{{ product.strength }}</div>
                        <div *ngIf="product.dosageForm">{{ product.dosageForm }}</div>
                        <div *ngIf="product.manufacturer" class="text-gray-500">{{ product.manufacturer }}</div>
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      <div *ngIf="product.unitCost != null || product.sellingPrice != null">
                        <span *ngIf="product.unitCost != null">Cost: {{ product.unitCost | currency:'KES' }}</span>
                        <span *ngIf="product.unitCost != null && product.sellingPrice != null"> · </span>
                        <span *ngIf="product.sellingPrice != null">Price: {{ product.sellingPrice | currency:'KES' }}</span>
                      </div>
                      <span *ngIf="product.unitCost == null && product.sellingPrice == null" class="text-gray-400">—</span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="flex items-center">
                        <div class="flex-1 min-w-0">
                          <div class="flex items-center justify-between">
                            <span class="text-sm font-medium text-gray-900">{{ product.totalQuantity }}</span>
                            <span class="text-sm text-gray-500">{{ getStockLevelPercentage(product) }}%</span>
                          </div>
                          <div class="w-full bg-gray-200 rounded-full h-2 mt-1">
                            <div 
                              class="h-2 rounded-full transition-all duration-300"
                              [ngClass]="getStockLevelClass(product)"
                              [style.width.%]="getStockLevelPercentage(product)">
                            </div>
                          </div>
                          <div class="flex items-center justify-between mt-1 text-xs text-gray-500">
                            <span>Min: {{ product.minStockLevel }}</span>
                            <span *ngIf="product.maxStockLevel">Max: {{ product.maxStockLevel }}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="flex items-center gap-2">
                        <span 
                          *ngIf="product.requiresPrescription"
                          class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                          <mat-icon class="text-xs">prescription</mat-icon>
                          Rx
                        </span>
                        <span 
                          [ngClass]="product.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                          class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs">
                          <mat-icon class="text-xs">{{ product.isActive ? 'check_circle' : 'cancel' }}</mat-icon>
                          {{ product.isActive ? 'Active' : 'Inactive' }}
                        </span>
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div class="flex gap-2">
                        <app-secondary-button 
                          label="View"
                          icon="visibility"
                          size="small"
                          (click)="viewProductDetails(product)">
                        </app-secondary-button>
                        <app-secondary-button 
                          label="Edit"
                          icon="edit"
                          size="small"
                          (click)="editProduct(product)">
                        </app-secondary-button>
                        <app-danger-button 
                          label="Delete"
                          icon="delete"
                          size="small"
                          [disabled]="product.totalQuantity > 0"
                          (click)="deleteProduct(product)">
                        </app-danger-button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Mobile/Tablet Card View (md and below) -->
          <div *ngIf="!loading && filteredProducts.length > 0" class="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-4">
            <div 
              *ngFor="let product of filteredProducts" 
              class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              
              <!-- Product Header -->
              <div class="flex items-start justify-between mb-3">
                <div class="flex-1">
                  <h3 class="font-semibold text-gray-900 text-lg">{{ product.name }}</h3>
                  <p *ngIf="product.genericName" class="text-sm text-gray-600">{{ product.genericName }}</p>
                </div>
                <div class="flex items-center gap-2">
                  <span 
                    *ngIf="product.requiresPrescription"
                    class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                    <mat-icon class="text-xs">prescription</mat-icon>
                    Rx
                  </span>
                  <span 
                    [ngClass]="product.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                    class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs">
                    <mat-icon class="text-xs">{{ product.isActive ? 'check_circle' : 'cancel' }}</mat-icon>
                    {{ product.isActive ? 'Active' : 'Inactive' }}
                  </span>
                </div>
              </div>

              <!-- Product Details -->
              <div class="space-y-2 mb-4">
                <div *ngIf="product.strength" class="text-sm text-gray-600">
                  <span class="font-medium">Strength:</span> {{ product.strength }}
                </div>
                <div *ngIf="product.dosageForm" class="text-sm text-gray-600">
                  <span class="font-medium">Form:</span> {{ product.dosageForm }}
                </div>
                <div *ngIf="product.manufacturer" class="text-sm text-gray-600">
                  <span class="font-medium">Manufacturer:</span> {{ product.manufacturer }}
                </div>
                <div *ngIf="product.barcode" class="text-sm text-gray-600">
                  <span class="font-medium">Barcode:</span> {{ product.barcode }}
                </div>
                <div *ngIf="product.unitCost != null || product.sellingPrice != null" class="text-sm text-gray-600">
                  <span class="font-medium">Pricing:</span>
                  <span *ngIf="product.unitCost != null">Cost {{ product.unitCost | currency:'KES' }}</span>
                  <span *ngIf="product.unitCost != null && product.sellingPrice != null"> · </span>
                  <span *ngIf="product.sellingPrice != null">Price {{ product.sellingPrice | currency:'KES' }}</span>
                </div>
              </div>

              <!-- Inventory Status -->
              <div class="mb-4">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-sm font-medium text-gray-700">Current Stock</span>
                  <span class="text-lg font-bold" [ngClass]="product.lowStockAlert ? 'text-red-600' : 'text-gray-900'">
                    {{ product.totalQuantity }}
                  </span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    class="h-2 rounded-full transition-all duration-300"
                    [ngClass]="getStockLevelClass(product)"
                    [style.width.%]="getStockLevelPercentage(product)">
                  </div>
                </div>
                <div class="flex items-center justify-between mt-1">
                  <span class="text-xs text-gray-500">Min: {{ product.minStockLevel }}</span>
                  <span *ngIf="product.maxStockLevel" class="text-xs text-gray-500">Max: {{ product.maxStockLevel }}</span>
                </div>
              </div>

              <!-- Alerts -->
              <div class="mb-4 space-y-1">
                <div 
                  *ngIf="product.lowStockAlert"
                  class="flex items-center gap-2 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                  <mat-icon class="text-xs">warning</mat-icon>
                  Low stock alert
                </div>
              </div>

              <!-- Actions -->
              <div class="flex gap-2">
                <app-secondary-button 
                  label="View"
                  icon="visibility"
                  size="small"
                  (click)="viewProductDetails(product)"
                  class="flex-1">
                </app-secondary-button>
                <app-secondary-button 
                  label="Edit"
                  icon="edit"
                  size="small"
                  (click)="editProduct(product)"
                  class="flex-1">
                </app-secondary-button>
                <app-danger-button 
                  label="Delete"
                  icon="delete"
                  size="small"
                  [disabled]="product.totalQuantity > 0"
                  (click)="deleteProduct(product)"
                  class="flex-1">
                </app-danger-button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ProductsComponent implements OnInit {
  products: ProductDto[] = [];
  filteredProducts: ProductDto[] = [];
  branches: BranchDto[] = [];
  loading = false;
  searchQuery = '';
  statusFilter = '';
  typeFilter = '';
  filtersCollapsed = true;
  stats = {
    totalProducts: 0,
    lowStockCount: 0,
    expiringCount: 0,
    prescriptionRequiredCount: 0
  };

  constructor(
    private productsService: ProductsService,
    private branchesService: BranchesService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadProducts();
    this.loadBranches();
    this.loadStats();
  }

  loadProducts(): void {
    this.loading = true;
    this.productsService.loadProducts(true);
    this.productsService.products$.subscribe(products => {
      this.products = products;
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
    this.productsService.getProductStats().subscribe(stats => {
      this.stats = stats;
    });
  }

  onSearch(): void {
    this.applyFilters();
  }

  applyFilters(): void {
    let filtered = [...this.products];

    // Search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(query) ||
        (product.genericName && product.genericName.toLowerCase().includes(query)) ||
        (product.barcode && product.barcode.toLowerCase().includes(query))
      );
    }

    // Status filter
    if (this.statusFilter) {
      filtered = filtered.filter(product => 
        this.statusFilter === 'active' ? product.isActive : !product.isActive
      );
    }

    // Type filter
    if (this.typeFilter) {
      filtered = filtered.filter(product => 
        this.typeFilter === 'prescription' ? product.requiresPrescription : !product.requiresPrescription
      );
    }

    this.filteredProducts = filtered;
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.statusFilter = '';
    this.typeFilter = '';
    this.applyFilters();
  }

  refreshProducts(): void {
    this.productsService.refreshProducts();
  }

  createProduct(): void {
    const dialogRef = this.dialog.open(CreateProductDialogComponent, {
      width: '600px',
      data: { branches: this.branches }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.productsService.refreshProducts();
        this.loadStats();
        this.snackBar.open('Product created successfully', 'Close', { duration: 3000 });
      }
    });
  }

  editProduct(product: ProductDto): void {
    const dialogRef = this.dialog.open(EditProductDialogComponent, {
      width: '600px',
      data: { product, branches: this.branches }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.productsService.refreshProducts();
        this.loadStats();
        this.snackBar.open('Product updated successfully', 'Close', { duration: 3000 });
      }
    });
  }

  viewProductDetails(product: ProductDto): void {
    this.dialog.open(ProductDetailsDialogComponent, {
      width: '700px',
      data: { product, branches: this.branches }
    });
  }

  deleteProduct(product: ProductDto): void {
    if (confirm(`Are you sure you want to delete "${product.name}"?`)) {
      this.productsService.deleteProduct(product.id).subscribe({
        next: () => {
          this.productsService.refreshProducts();
          this.loadStats();
          this.snackBar.open('Product deleted successfully', 'Close', { duration: 3000 });
        },
        error: (error) => {
          console.error('Error deleting product:', error);
          this.snackBar.open('Error deleting product', 'Close', { duration: 3000 });
        }
      });
    }
  }

  getStockLevelClass(product: ProductDto): string {
    if (product.totalQuantity === 0) return 'bg-red-500';
    if (product.lowStockAlert) return 'bg-orange-500';
    if (product.totalQuantity > (product.maxStockLevel || product.totalQuantity)) return 'bg-blue-500';
    return 'bg-green-500';
  }

  getStockLevelPercentage(product: ProductDto): number {
    if (product.maxStockLevel) {
      return Math.min((product.totalQuantity / product.maxStockLevel) * 100, 100);
    }
    return Math.min((product.totalQuantity / (product.minStockLevel * 2)) * 100, 100);
  }
}
