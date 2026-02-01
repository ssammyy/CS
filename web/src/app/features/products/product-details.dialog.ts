import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';

import { ProductDto } from '../../core/services/products.service';
import { BranchDto } from '../../core/services/branches.service';

export interface ProductDetailsDialogData {
  product: ProductDto;
  branches: BranchDto[];
}

/**
 * Enhanced dialog component for displaying comprehensive product details.
 * Shows all product information in an organized, readable format.
 */
@Component({
  selector: 'app-product-details-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule
  ],
  template: `
    <div class="h-[min(92vh,800px)] ">
      <div class="px-5 pt-5">
        <div class="h-1.5 w-16 rounded-full bg-gradient-to-r from-brand-sky to-brand-coral mb-4"></div>
        <h2 class="text-2xl font-semibold">Product Details</h2>
        <p class="text-gray-600 mt-1 text-sm">Comprehensive information about {{ data.product.name }}</p>
      </div>

      <div class="p-5 pt-3 space-y-6">
        <!-- Product Header -->
        <div class="bg-gradient-to-r from-brand-sky/10 to-brand-coral/10 p-6 rounded-lg border border-brand-sky/20">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <h1 class="text-3xl font-bold text-gray-900 mb-2">{{ data.product.name }}</h1>
              <p *ngIf="data.product.genericName" class="text-xl text-gray-600 mb-3">
                Generic: {{ data.product.genericName }}
              </p>
              <div class="flex flex-wrap gap-2">
                <span
                  [ngClass]="data.product.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                  class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium">
                  <mat-icon class="text-sm">{{ data.product.isActive ? 'check_circle' : 'cancel' }}</mat-icon>
                  {{ data.product.isActive ? 'Active' : 'Inactive' }}
                </span>
                <span
                  *ngIf="data.product.requiresPrescription"
                  class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                  <mat-icon class="text-sm">prescription</mat-icon>
                  Prescription Required
                </span>
                <span
                  *ngIf="data.product.lowStockAlert"
                  class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                  <mat-icon class="text-sm">warning</mat-icon>
                  Low Stock Alert
                </span>
              </div>
            </div>
            <div class="text-right">
              <div class="text-2xl font-bold text-brand-sky">{{ data.product.totalQuantity || 0 }}</div>
              <div class="text-sm text-gray-600">Total Stock</div>
            </div>
          </div>
        </div>

        <!-- Product Specifications -->
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <mat-icon class="text-brand-sky">science</mat-icon>
            Product Specifications
          </h3>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-4">
              <div *ngIf="data.product.strength">
                <label class="text-sm font-medium text-gray-600">Strength</label>
                <p class="text-gray-900">{{ data.product.strength }}</p>
              </div>

              <div *ngIf="data.product.dosageForm">
                <label class="text-sm font-medium text-gray-600">Dosage Form</label>
                <p class="text-gray-900">{{ data.product.dosageForm }}</p>
              </div>

              <div *ngIf="data.product.manufacturer">
                <label class="text-sm font-medium text-gray-600">Manufacturer</label>
                <p class="text-gray-900">{{ data.product.manufacturer }}</p>
              </div>
            </div>

            <div class="space-y-4">
              <div *ngIf="data.product.barcode">
                <label class="text-sm font-medium text-gray-600">Barcode</label>
                <p class="text-gray-900 font-mono">{{ data.product.barcode }}</p>
              </div>

              <div *ngIf="data.product.storageConditions">
                <label class="text-sm font-medium text-gray-600">Storage Conditions</label>
                <p class="text-gray-900">{{ data.product.storageConditions }}</p>
              </div>

              <div>
                <label class="text-sm font-medium text-gray-600">Created Date</label>
                <p class="text-gray-900">{{ data.product.createdAt | date:'medium' }}</p>
              </div>
            </div>
          </div>

          <div *ngIf="data.product.description" class="mt-6">
            <label class="text-sm font-medium text-gray-600">Description</label>
            <p class="text-gray-900 mt-2 leading-relaxed">{{ data.product.description }}</p>
          </div>
        </div>

        <!-- Stock Management -->
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <mat-icon class="text-brand-sky">inventory</mat-icon>
            Stock Management
          </h3>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="text-center p-4 bg-gray-50 rounded-lg">
              <div class="text-3xl font-bold text-brand-sky">{{ data.product.totalQuantity || 0 }}</div>
              <div class="text-sm text-gray-600 mt-1">Current Stock</div>
            </div>

            <div class="text-center p-4 bg-gray-50 rounded-lg">
              <div class="text-3xl font-bold text-orange-500">{{ data.product.minStockLevel }}</div>
              <div class="text-sm text-gray-600 mt-1">Minimum Level</div>
            </div>

            <div class="text-center p-4 bg-gray-50 rounded-lg">
              <div class="text-3xl font-bold text-green-500">{{ data.product.maxStockLevel || 'N/A' }}</div>
              <div class="text-sm text-gray-600 mt-1">Maximum Level</div>
            </div>
          </div>

          <!-- Stock Level Indicator -->
          <div class="mt-6">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-medium text-gray-700">Stock Level</span>
              <span class="text-sm text-gray-500">{{ getStockPercentage() }}%</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-3">
              <div
                class="h-3 rounded-full transition-all duration-300"
                [ngClass]="getStockLevelClass()"
                [style.width.%]="getStockPercentage()">
              </div>
            </div>
            <div class="flex justify-between mt-1 text-xs text-gray-500">
              <span>Min: {{ data.product.minStockLevel }}</span>
              <span *ngIf="data.product.maxStockLevel">Max: {{ data.product.maxStockLevel }}</span>
            </div>
          </div>
        </div>

        <!-- System Information -->
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <mat-icon class="text-brand-sky">info</mat-icon>
            System Information
          </h3>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-4">
              <div>
                <label class="text-sm font-medium text-gray-600">Product ID</label>
                <p class="text-gray-900 font-mono text-sm">{{ data.product.id }}</p>
              </div>

              <div>
                <label class="text-sm font-medium text-gray-600">Tenant</label>
                <p class="text-gray-900">{{ data.product.tenantName }}</p>
              </div>

              <div>
                <label class="text-sm font-medium text-gray-600">Created</label>
                <p class="text-gray-900">{{ data.product.createdAt | date:'medium' }}</p>
              </div>
            </div>

            <div class="space-y-4">
              <div>
                <label class="text-sm font-medium text-gray-600">Last Updated</label>
                <p class="text-gray-900">{{ data.product.updatedAt ? (data.product.updatedAt | date:'medium') : 'Never' }}</p>
              </div>

              <div>
                <label class="text-sm font-medium text-gray-600">Status</label>
                <p class="text-gray-900">{{ data.product.isActive ? 'Active' : 'Inactive' }}</p>
              </div>

              <div>
                <label class="text-sm font-medium text-gray-600">Prescription Required</label>
                <p class="text-gray-900">{{ data.product.requiresPrescription ? 'Yes' : 'No' }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-3 pt-4">
          <button
            mat-stroked-button
            (click)="close()"
            class="!py-2.5">
            Close
          </button>
        </div>
      </div>
    </div>
  `
})
export class ProductDetailsDialogComponent {
  private readonly ref = inject(MatDialogRef<ProductDetailsDialogComponent, any>);
  readonly data: ProductDetailsDialogData = inject(MAT_DIALOG_DATA);

  getStockPercentage(): number {
    if (this.data.product.maxStockLevel) {
      return Math.min((this.data.product.totalQuantity / this.data.product.maxStockLevel) * 100, 100);
    }
    return Math.min((this.data.product.totalQuantity / (this.data.product.minStockLevel * 2)) * 100, 100);
  }

  getStockLevelClass(): string {
    if (this.data.product.totalQuantity === 0) return 'bg-red-500';
    if (this.data.product.lowStockAlert) return 'bg-orange-500';
    if (this.data.product.totalQuantity > (this.data.product.maxStockLevel || this.data.product.totalQuantity)) return 'bg-blue-500';
    return 'bg-green-500';
  }

  close(): void {
    this.ref.close();
  }
}
