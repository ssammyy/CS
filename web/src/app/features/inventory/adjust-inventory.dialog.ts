import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';

import { InventoryService, InventoryDto, InventoryAdjustmentRequest } from '../../core/services/inventory.service';
import { BranchesService, BranchDto } from '../../core/services/branches.service';

export interface AdjustInventoryDialogData {
  branches: BranchDto[];
  item?: InventoryDto;
}

/**
 * Enhanced dialog component for adjusting inventory quantities.
 * Provides comprehensive stock adjustment functionality.
 */
@Component({
  selector: 'app-adjust-inventory-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatSelectModule
  ],
  template: `
    <div class="h-[min(92vh,800px)] ">
      <div class="px-5 pt-5">
        <div class="h-1.5 w-16 rounded-full bg-gradient-to-r from-brand-sky to-brand-coral mb-4"></div>
        <h2 class="text-2xl font-semibold">Adjust Stock</h2>
        <p class="text-gray-600 mt-1 text-sm">{{ data.item ? 'Adjust stock for existing item' : 'Adjust stock for a product' }}</p>
      </div>

      <form #adjustForm="ngForm" (ngSubmit)="onSubmit()" class="p-5 pt-3 space-y-6">
        <!-- Product & Branch Selection -->
        <div class="bg-gray-50 p-4 rounded-lg">
          <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <mat-icon class="text-brand-sky">inventory</mat-icon>
            Product & Branch
          </h3>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <mat-form-field class="w-full" color="primary">
              <mat-label>Product *</mat-label>
              <input
                matInput
                name="productName"
                [value]="data.item ? data.item.productName : ''"
                readonly
                placeholder="Product name" />
            </mat-form-field>

            <mat-form-field class="w-full" color="primary">
              <mat-label>Branch *</mat-label>
              <input
                matInput
                name="branchName"
                [value]="data.item ? data.item.branchName : ''"
                readonly
                placeholder="Branch name" />
            </mat-form-field>
          </div>

          <div *ngIf="data.item" class="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span class="font-medium text-blue-700">Current Stock:</span>
                <p class="text-blue-900 font-semibold">{{ data.item.quantity }}</p>
              </div>
              <div>
                <span class="font-medium text-blue-700">Batch:</span>
                <p class="text-blue-900">{{ data.item.batchNumber || 'N/A' }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Adjustment Details -->
        <div class="bg-gray-50 p-4 rounded-lg">
          <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <mat-icon class="text-brand-sky">edit</mat-icon>
            Adjustment Details
          </h3>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <mat-form-field class="w-full" color="primary">
              <mat-label>Quantity Change *</mat-label>
              <input
                matInput
                type="number"
                name="quantity"
                [(ngModel)]="adjustment.quantity"
                required
                placeholder="e.g., 50 or -25" />
              <mat-hint>
                <span class="text-green-600">Positive</span> to add stock,
                <span class="text-red-600">negative</span> to remove stock
              </mat-hint>
            </mat-form-field>

            <mat-form-field class="w-full" color="primary">
              <mat-label>Reason *</mat-label>
              <mat-select name="reason" [(ngModel)]="adjustment.reason" required>
                <mat-option value="">Select Reason</mat-option>
                <mat-option value="Restock">Restock</mat-option>
                <mat-option value="Sale">Sale</mat-option>
                <mat-option value="Damaged">Damaged/Expired</mat-option>
                <mat-option value="Transfer In">Transfer In</mat-option>
                <mat-option value="Transfer Out">Transfer Out</mat-option>
                <mat-option value="Adjustment">Stock Adjustment</mat-option>
                <mat-option value="Return">Customer Return</mat-option>
                <mat-option value="Other">Other</mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <div class="mt-4">
            <mat-form-field class="w-full" color="primary">
              <mat-label>Batch Number</mat-label>
              <input
                matInput
                name="batchNumber"
                [(ngModel)]="adjustment.batchNumber"
                [placeholder]="data.item?.batchNumber || 'e.g., BATCH001'" />
              <mat-hint>Leave empty to use existing batch, or specify new batch for additions</mat-hint>
            </mat-form-field>
          </div>

          <div class="mt-4">
            <mat-form-field class="w-full" color="primary">
              <mat-label>Expiry Date</mat-label>
              <input
                matInput
                type="date"
                name="expiryDate"
                [(ngModel)]="adjustment.expiryDate" />
              <mat-hint>Required for new batches, optional for existing stock adjustments</mat-hint>
            </mat-form-field>
          </div>
        </div>

        <!-- Notes Section -->
        <div class="bg-gray-50 p-4 rounded-lg">
          <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <mat-icon class="text-brand-sky">note</mat-icon>
            Additional Notes
          </h3>

          <mat-form-field class="w-full" color="primary">
            <mat-label>Notes</mat-label>
            <textarea
              matInput
              name="notes"
              [(ngModel)]="adjustment.notes"
              rows="3"
              placeholder="Any additional information about this adjustment..."></textarea>
          </mat-form-field>
        </div>

        <!-- Preview Section -->
        <div *ngIf="adjustment.quantity && data.item" class="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h3 class="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
            <mat-icon class="text-blue-600">preview</mat-icon>
            Adjustment Preview
          </h3>

          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="font-medium text-blue-700">Current Stock:</span>
              <p class="text-blue-900 font-semibold">{{ data.item.quantity }}</p>
            </div>
            <div>
              <span class="font-medium text-blue-700">Change:</span>
              <p class="font-semibold" [ngClass]="adjustment.quantity > 0 ? 'text-green-600' : 'text-red-600'">
                {{ adjustment.quantity > 0 ? '+' : '' }}{{ adjustment.quantity }}
              </p>
            </div>
            <div>
              <span class="font-medium text-blue-700">New Stock:</span>
              <p class="text-blue-900 font-semibold">{{ data.item.quantity + adjustment.quantity }}</p>
            </div>
            <div>
              <span class="font-medium text-blue-700">Type:</span>
              <p class="font-semibold" [ngClass]="adjustment.quantity > 0 ? 'text-green-600' : 'text-red-600'">
                {{ adjustment.quantity > 0 ? 'Addition' : 'Reduction' }}
              </p>
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
            [disabled]="!adjustForm.valid || submitting">
            <mat-icon *ngIf="submitting" class="animate-spin">refresh</mat-icon>
            {{ submitting ? 'Adjusting Stock...' : 'Adjust Stock' }}
          </button>
        </div>
      </form>
    </div>
  `
})
export class AdjustInventoryDialogComponent implements OnInit {
  private readonly ref = inject(MatDialogRef<AdjustInventoryDialogComponent, any>);
  readonly data: AdjustInventoryDialogData = inject(MAT_DIALOG_DATA);
  private readonly inventoryService = inject(InventoryService);
  private readonly snackBar = inject(MatSnackBar);

  adjustment: InventoryAdjustmentRequest = {
    productId: '',
    branchId: '',
    quantity: 0,
    reason: '',
    notes: '',
    batchNumber: '',
    expiryDate: ''
  };

  submitting = false;

  ngOnInit(): void {
    if (this.data.item) {
      this.adjustment.productId = this.data.item.productId;
      this.adjustment.branchId = this.data.item.branchId;
      this.adjustment.batchNumber = this.data.item.batchNumber || '';
    }
  }

  onSubmit(): void {
    if (this.submitting) return;

    this.submitting = true;
    this.inventoryService.adjustInventory(this.adjustment).subscribe({
      next: () => {
        this.submitting = false;
        this.snackBar.open('Stock adjusted successfully!', 'Close', { duration: 3000 });
        this.ref.close(true);
      },
      error: (error) => {
        console.error('Error adjusting stock:', error);
        this.submitting = false;
        this.snackBar.open('Error adjusting stock. Please try again.', 'Close', { duration: 5000 });
      }
    });
  }

  close(): void {
    this.ref.close();
  }
}
