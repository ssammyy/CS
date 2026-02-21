import { Component, inject, OnInit } from '@angular/core';
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

import { ProductsService, ProductDto, UpdateProductRequest } from '../../core/services/products.service';
import { BranchesService, BranchDto } from '../../core/services/branches.service';

export interface EditProductDialogData {
  product: ProductDto;
  branches: BranchDto[];
}

/**
 * Enhanced dialog component for editing existing products.
 * Provides a comprehensive form for product updates with all backend fields.
 */
@Component({
  selector: 'app-edit-product-dialog',
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
        <h2 class="text-2xl font-semibold">Edit Product</h2>
        <p class="text-gray-600 mt-1 text-sm">Update product information and specifications</p>
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
                required
                placeholder="e.g., Product Alpha 500g" />
            </mat-form-field>

            <mat-form-field class="w-full" color="primary">
              <mat-label>Variant / Generic Name</mat-label>
              <input
                matInput
                name="genericName"
                [(ngModel)]="product.genericName"
                placeholder="e.g., Variant, generic name, or model" />
            </mat-form-field>
          </div>

<!--          <mat-form-field class="w-full" color="primary">-->
<!--            <mat-label>Description</mat-label>-->
<!--            <textarea-->
<!--              matInput-->
<!--              name="description"-->
<!--              [(ngModel)]="product.description"-->
<!--              rows="3"-->
<!--              placeholder="Product description, usage instructions, and any important notes..."></textarea>-->
<!--          </mat-form-field>-->
        </div>

        <!-- Product Specifications Section -->
<!--        <div class="bg-white rounded-lg shadow p-6">-->
<!--          <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">-->
<!--            <mat-icon class="text-brand-sky">science</mat-icon>-->
<!--            Product Specifications-->
<!--          </h3>-->

<!--          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">-->
<!--            <mat-form-field class="w-full" color="primary">-->
<!--              <mat-label>Strength / Size</mat-label>-->
<!--              <input-->
<!--                matInput-->
<!--                name="strength"-->
<!--                [(ngModel)]="product.strength"-->
<!--                placeholder="e.g., 500g, 10L, Size M" />-->
<!--            </mat-form-field>-->

<!--            <mat-form-field class="w-full" color="primary">-->
<!--              <mat-label>Dosage Form</mat-label>-->
<!--              <mat-select name="dosageForm" [(ngModel)]="product.dosageForm">-->
<!--                <mat-option value="">Select Form</mat-option>-->
<!--                <mat-option value="Tablet">Tablet</mat-option>-->
<!--                <mat-option value="Capsule">Capsule</mat-option>-->
<!--                <mat-option value="Syrup">Syrup</mat-option>-->
<!--                <mat-option value="Injection">Injection</mat-option>-->
<!--                <mat-option value="Cream">Cream</mat-option>-->
<!--                <mat-option value="Ointment">Ointment</mat-option>-->
<!--                <mat-option value="Drops">Drops</mat-option>-->
<!--                <mat-option value="Inhaler">Inhaler</mat-option>-->
<!--                <mat-option value="Suppository">Suppository</mat-option>-->
<!--                <mat-option value="Patch">Patch</mat-option>-->
<!--                <mat-option value="Other">Other</mat-option>-->
<!--              </mat-select>-->
<!--            </mat-form-field>-->

<!--            <mat-form-field class="w-full" color="primary">-->
<!--              <mat-label>Manufacturer</mat-label>-->
<!--              <input-->
<!--                matInput-->
<!--                name="manufacturer"-->
<!--                [(ngModel)]="product.manufacturer"-->
<!--                placeholder="e.g., Pfizer, GlaxoSmithKline" />-->
<!--            </mat-form-field>-->
<!--          </div>-->
<!--        </div>-->

        <!-- Pricing Section (product-level cost and selling price) -->
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <mat-icon class="text-brand-sky">payments</mat-icon>
            Pricing
          </h3>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <mat-form-field class="w-full" color="primary">
              <mat-label>Unit Cost (KES)</mat-label>
              <input
                matInput
                type="number"
                name="unitCost"
                [(ngModel)]="product.unitCost"
                min="0"
                step="0.01"
                placeholder="Cost price" />
              <mat-hint>Cost price per unit</mat-hint>
            </mat-form-field>

            <mat-form-field class="w-full" color="primary">
              <mat-label>Selling Price (KES)</mat-label>
              <input
                matInput
                type="number"
                name="sellingPrice"
                [(ngModel)]="product.sellingPrice"
                min="0"
                step="0.01"
                placeholder="Selling price" />
              <mat-hint>Default selling price per unit</mat-hint>
            </mat-form-field>
          </div>
        </div>

        <!-- Identification & Storage Section -->
<!--        <div class="bg-white rounded-lg shadow p-6">-->
<!--          <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">-->
<!--            <mat-icon class="text-brand-sky">qr_code</mat-icon>-->
<!--            Identification & Storage-->
<!--          </h3>-->

<!--          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">-->
<!--            <mat-form-field class="w-full" color="primary">-->
<!--              <mat-label>Barcode</mat-label>-->
<!--              <input-->
<!--                matInput-->
<!--                name="barcode"-->
<!--                [(ngModel)]="product.barcode"-->
<!--                placeholder="e.g., 1234567890123" />-->
<!--            </mat-form-field>-->

<!--            <mat-form-field class="w-full" color="primary">-->
<!--              <mat-label>Storage Conditions</mat-label>-->
<!--              <mat-select name="storageConditions" [(ngModel)]="product.storageConditions">-->
<!--                <mat-option value="">Select Conditions</mat-option>-->
<!--                <mat-option value="Room Temperature (15-25°C)">Room Temperature (15-25°C)</mat-option>-->
<!--                <mat-option value="Refrigerated (2-8°C)">Refrigerated (2-8°C)</mat-option>-->
<!--                <mat-option value="Frozen (-20°C)">Frozen (-20°C)</mat-option>-->
<!--                <mat-option value="Protect from Light">Protect from Light</mat-option>-->
<!--                <mat-option value="Keep Dry">Keep Dry</mat-option>-->
<!--                <mat-option value="Controlled Room Temperature">Controlled Room Temperature</mat-option>-->
<!--                <mat-option value="Cool Place (8-15°C)">Cool Place (8-15°C)</mat-option>-->
<!--              </mat-select>-->
<!--            </mat-form-field>-->
<!--          </div>-->
<!--        </div>-->

        <!-- Stock Management Section -->
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <mat-icon class="text-brand-sky">inventory</mat-icon>
            Stock Management
          </h3>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <mat-form-field class="w-full" color="primary">
              <mat-label>Minimum Stock Level</mat-label>
              <input
                matInput
                type="number"
                name="minStockLevel"
                [(ngModel)]="product.minStockLevel"
                min="0"
                placeholder="e.g., 10" />
              <mat-hint>Alert will be triggered when stock falls below this level</mat-hint>
            </mat-form-field>

            <mat-form-field class="w-full" color="primary">
              <mat-label>Maximum Stock Level</mat-label>
              <input
                matInput
                type="number"
                name="maxStockLevel"
                [(ngModel)]="product.maxStockLevel"
                min="0"
                placeholder="e.g., 100" />
              <mat-hint>Optional: Maximum stock to maintain</mat-hint>
            </mat-form-field>
          </div>
        </div>

        <!-- Product Status Section -->
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <mat-icon class="text-brand-sky">settings</mat-icon>
            Product Status
          </h3>

          <div class="space-y-4">
<!--            <div class="flex items-center gap-3 p-3 bg-white rounded-lg border">-->
<!--              <mat-checkbox-->
<!--                name="requiresPrescription"-->
<!--                [(ngModel)]="product.requiresPrescription"-->
<!--                color="primary">-->
<!--              </mat-checkbox>-->
<!--              <div>-->
<!--                <span class="text-sm font-medium text-gray-700">This product requires a prescription</span>-->
<!--                <p class="text-xs text-gray-500 mt-1">Check this box if the product can only be dispensed with a valid prescription</p>-->
<!--              </div>-->
<!--            </div>-->

            <div class="flex items-center gap-3 p-3 bg-white rounded-lg border">
              <mat-checkbox
                name="isActive"
                [(ngModel)]="product.isActive"
                color="primary">
              </mat-checkbox>
              <div>
                <span class="text-sm font-medium text-gray-700">Product is active</span>
                <p class="text-xs text-gray-500 mt-1">Uncheck to deactivate this product (it will no longer appear in active listings)</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Current Stock Information -->
        <div class="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h3 class="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
            <mat-icon class="text-blue-600">inventory_2</mat-icon>
            Current Stock Information
          </h3>

          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span class="font-medium text-blue-700">Total Quantity:</span>
              <p class="text-blue-900 font-semibold">{{ data.product.totalQuantity || 0 }}</p>
            </div>
            <div>
              <span class="font-medium text-blue-700">Low Stock Alert:</span>
              <p class="text-blue-900 font-semibold">{{ data.product.lowStockAlert ? 'Yes' : 'No' }}</p>
            </div>
            <div>
              <span class="font-medium text-blue-700">Created:</span>
              <p class="text-blue-900">{{ data.product.createdAt | date:'shortDate' }}</p>
            </div>
            <div>
              <span class="font-medium text-blue-700">Last Updated:</span>
                              <p class="text-blue-900">{{ data.product.updatedAt ? (data.product.updatedAt | date:'shortDate') : 'Never' }}</p>
            </div>
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
            class="!py-3 bg-brand-sky text-white hover:opacity-95"
            [disabled]="!productForm.valid || submitting">
            <mat-icon *ngIf="submitting" class="animate-spin">refresh</mat-icon>
            {{ submitting ? 'Updating Product...' : 'Update Product' }}
          </button>
        </div>
      </form>
    </div>
  `
})
export class EditProductDialogComponent implements OnInit {
  private readonly ref = inject(MatDialogRef<EditProductDialogComponent, any>);
  readonly data: EditProductDialogData = inject(MAT_DIALOG_DATA);
  private readonly productsService = inject(ProductsService);
  private readonly snackBar = inject(MatSnackBar);

  product: UpdateProductRequest = {};

  submitting = false;

  ngOnInit(): void {
    // Initialize the form with current product data
    this.product = {
      name: this.data.product.name,
      genericName: this.data.product.genericName,
      description: this.data.product.description,
      strength: this.data.product.strength,
      dosageForm: this.data.product.dosageForm,
      manufacturer: this.data.product.manufacturer,
      barcode: this.data.product.barcode,
      requiresPrescription: this.data.product.requiresPrescription,
      storageConditions: this.data.product.storageConditions,
      minStockLevel: this.data.product.minStockLevel,
      maxStockLevel: this.data.product.maxStockLevel,
      unitCost: this.data.product.unitCost ?? undefined,
      sellingPrice: this.data.product.sellingPrice ?? undefined,
      isActive: this.data.product.isActive
    };
  }

  onSubmit(): void {
    if (this.submitting) return;

    this.submitting = true;
    this.productsService.updateProduct(this.data.product.id, this.product).subscribe({
      next: () => {
        this.submitting = false;
        this.snackBar.open('Product updated successfully!', 'Close', { duration: 3000 });
        this.ref.close(true);
      },
      error: (error) => {
        console.error('Error updating product:', error);
        this.submitting = false;
        this.snackBar.open('Error updating product. Please try again.', 'Close', { duration: 5000 });
      }
    });
  }

  close(): void {
    this.ref.close();
  }
}
