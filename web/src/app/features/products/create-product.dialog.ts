import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar } from '@angular/material/snack-bar';

import { ProductsService, CreateProductRequest } from '../../core/services/products.service';
import { BranchesService, BranchDto } from '../../core/services/branches.service';

export interface CreateProductDialogData {
  branches: BranchDto[];
}

/**
 * Enhanced dialog component for creating new products.
 * Provides a comprehensive form for product creation with all backend fields.
 */
@Component({
  selector: 'app-create-product-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatSelectModule,
    MatCheckboxModule
  ],
  template: `
    <div class="h-[min(92vh,800px)] overflow-y-auto">
      <div class="px-5 pt-5">
        <div class="h-1.5 w-16 rounded-full bg-gradient-to-r from-brand-sky to-brand-coral mb-4"></div>
        <h2 class="text-2xl font-semibold">Create New Product</h2>
        <p class="text-gray-600 mt-1 text-sm">Add a new product to your inventory system</p>
      </div>

      <form #productForm="ngForm" (ngSubmit)="onSubmit()" class="p-5 pt-3 space-y-6">
        <!-- Basic Information Section -->
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <mat-icon class="text-brand-sky">info</mat-icon>
            Basic Information
          </h3>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <mat-form-field class="w-full" color="primary">
              <mat-label>Product Name *</mat-label>
              <input
                matInput
                name="name"
                [(ngModel)]="product.name"
                required />
            </mat-form-field>

            <mat-form-field class="w-full" color="primary">
              <mat-label>Variant / Generic Name</mat-label>
              <input
                matInput
                name="genericName"
                [(ngModel)]="product.genericName" />
            </mat-form-field>
          </div>

          <mat-form-field class="w-full" color="primary">
            <mat-label>Description</mat-label>
            <textarea
              matInput
              name="description"
              [(ngModel)]="product.description"
              rows="3"
              placeholder="Product description, usage instructions, and any important notes..."></textarea>
          </mat-form-field>
        </div>

        <!-- Stock Management Section -->
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <mat-icon class="text-brand-sky">inventory</mat-icon>
            Stock Management
          </h3>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <mat-form-field class="w-full" color="primary">
              <mat-label>Minimum Stock Level *</mat-label>
              <input
                matInput
                type="number"
                name="minStockLevel"
                [(ngModel)]="product.minStockLevel"
                required
                min="0" />
              <mat-hint>Alert will be triggered when stock falls below this level</mat-hint>
            </mat-form-field>

            <mat-form-field class="w-full" color="primary">
              <mat-label>Maximum Stock Level</mat-label>
              <input
                matInput
                type="number"
                name="maxStockLevel"
                [(ngModel)]="product.maxStockLevel"
                min="0" />
              <mat-hint>Optional: Maximum stock to maintain</mat-hint>
            </mat-form-field>
          </div>
        </div>

        <!-- Form Actions -->
        <div class="pt-4 grid grid-cols-2 gap-3">
          <button
            mat-stroked-button
            type="button"
            (click)="close()"
            class="!py-3">
            Cancel
          </button>
          <button
            mat-raised-button
            color="primary"
            type="submit"
            class="!py-3 bg-brand-coral text-white hover:opacity-95"
            [disabled]="!productForm.valid || submitting">
            <mat-icon *ngIf="submitting" class="animate-spin">refresh</mat-icon>
            {{ submitting ? 'Creating Product...' : 'Create Product' }}
          </button>
        </div>
      </form>
    </div>
  `
})
export class CreateProductDialogComponent {
  private readonly ref = inject(MatDialogRef<CreateProductDialogComponent, any>);
  readonly data: CreateProductDialogData = inject(MAT_DIALOG_DATA);
  private readonly productsService = inject(ProductsService);
  private readonly snackBar = inject(MatSnackBar);

  product: CreateProductRequest = {
    name: '',
    genericName: undefined,
    description: undefined,
    strength: undefined,
    dosageForm: undefined,
    manufacturer: undefined,
    barcode: undefined,
    requiresPrescription: false,
    storageConditions: undefined,
    minStockLevel: 10,
    maxStockLevel: undefined
  };

  submitting = false;

  onSubmit(): void {
    if (this.submitting) return;

    // Clean up the request: convert empty strings to undefined for optional fields
    const cleanedRequest: CreateProductRequest = {
      name: this.product.name.trim(),
      genericName: this.product.genericName?.trim() || undefined,
      description: this.product.description?.trim() || undefined,
      strength: this.product.strength?.trim() || undefined,
      dosageForm: this.product.dosageForm?.trim() || undefined,
      manufacturer: this.product.manufacturer?.trim() || undefined,
      barcode: this.product.barcode?.trim() || undefined,
      requiresPrescription: this.product.requiresPrescription,
      storageConditions: this.product.storageConditions?.trim() || undefined,
      minStockLevel: this.product.minStockLevel,
      maxStockLevel: this.product.maxStockLevel
    };

    this.submitting = true;
    this.productsService.createProduct(cleanedRequest).subscribe({
      next: () => {
        this.submitting = false;
        this.snackBar.open('Product created successfully!', 'Close', { duration: 3000 });
        this.ref.close(true);
      },
      error: (error) => {
        console.error('Error creating product:', error);
        this.submitting = false;
        this.snackBar.open('Error creating product. Please try again.', 'Close', { duration: 5000 });
      }
    });
  }

  close(): void {
    this.ref.close();
  }
}
