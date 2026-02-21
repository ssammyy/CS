import { Component, inject, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';

import { InventoryService, InventoryDto, InventoryAdjustmentRequest, UpdateInventoryRequest } from '../../core/services/inventory.service';
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
    MatButtonModule
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
            <div class="text-sm">
              <span class="font-medium text-blue-700">Current Stock:</span>
              <p class="text-blue-900 font-semibold">{{ data.item.quantity }}</p>
            </div>
          </div>
        </div>

        <!-- Prices (when editing existing item) -->
        <div *ngIf="data.item" class="bg-gray-50 p-4 rounded-lg">
          <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <mat-icon class="text-brand-sky">attach_money</mat-icon>
            Pricing
          </h3>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <mat-form-field class="w-full" color="primary">
              <mat-label>Unit Cost (KES)</mat-label>
              <input
                matInput
                type="number"
                step="0.01"
                min="0"
                name="unitCost"
                [(ngModel)]="unitCost"
                placeholder="e.g., 50.00" />
            </mat-form-field>

            <mat-form-field class="w-full" color="primary">
              <mat-label>Selling Price (KES)</mat-label>
              <input
                matInput
                type="number"
                step="0.01"
                min="0"
                name="sellingPrice"
                [(ngModel)]="sellingPrice"
                placeholder="e.g., 75.00" />
            </mat-form-field>
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
              <mat-label>Quantity Change</mat-label>
              <input
                matInput
                type="number"
                name="quantity"
                [(ngModel)]="adjustment.quantity"
                placeholder="e.g., 50 or -25 (0 to only update prices)" />
              <mat-hint>
                <span class="text-green-600">Positive</span> to add stock,
                <span class="text-red-600">negative</span> to remove stock
              </mat-hint>
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
        <div class="pt-4 flex flex-col gap-4">
          <div class="grid grid-cols-2 gap-3">
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
              [disabled]="!canSubmit()">
              <mat-icon *ngIf="submitting" class="animate-spin">refresh</mat-icon>
              {{ submitting ? 'Saving...' : 'Save Changes' }}
            </button>
          </div>

          <!-- Delete (when editing existing item) -->
          <div *ngIf="data.item" class="pt-4 border-t border-gray-200">
            <button
              mat-stroked-button
              type="button"
              color="warn"
              (click)="onDelete()"
              [disabled]="submitting"
              class="!py-3 !border-red-200 !text-red-700 hover:!bg-red-50">
              <mat-icon>delete</mat-icon>
              Delete Inventory
            </button>
          </div>
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

  unitCost: number | string = '';
  sellingPrice: number | string = '';

  submitting = false;

  ngOnInit(): void {
    if (this.data.item) {
      this.adjustment.productId = this.data.item.productId;
      this.adjustment.branchId = this.data.item.branchId;
      this.adjustment.batchNumber = this.data.item.batchNumber || '';
      this.unitCost = this.data.item.unitCost ?? '';
      this.sellingPrice = this.data.item.sellingPrice ?? '';
    }
  }

  private parseNum(val: number | string): number | undefined {
    if (val === '' || val === null || val === undefined) return undefined;
    const n = Number(val);
    return isNaN(n) ? undefined : n;
  }

  canSubmit(): boolean {
    if (this.submitting) return false;
    const needAdjust = this.adjustment.quantity !== 0;
    const needPriceUpdate = Boolean(this.data.item && this.hasPriceChanges());
    return needAdjust || needPriceUpdate;
  }

  private hasPriceChanges(): boolean {
    if (!this.data.item) return false;
    const uc = this.parseNum(this.unitCost);
    const sp = this.parseNum(this.sellingPrice);
    const origUc = this.data.item.unitCost ?? undefined;
    const origSp = this.data.item.sellingPrice ?? undefined;
    return uc !== origUc || sp !== origSp;
  }

  onSubmit(): void {
    if (this.submitting) return;

    const needAdjust = this.adjustment.quantity !== 0;
    const needPriceUpdate = this.data.item && this.hasPriceChanges();

    if (!needAdjust && !needPriceUpdate) {
      this.snackBar.open('No changes to save.', 'Close', { duration: 3000 });
      return;
    }

    this.submitting = true;

    const ops: ReturnType<typeof this.inventoryService.adjustInventory>[] = [];
    if (needAdjust) {
      const payload = { ...this.adjustment, reason: this.adjustment.reason || 'Stock Adjustment' };
      ops.push(this.inventoryService.adjustInventory(payload));
    }
    if (needPriceUpdate && this.data.item) {
      const req: UpdateInventoryRequest = {};
      const uc = this.parseNum(this.unitCost);
      const sp = this.parseNum(this.sellingPrice);
      if (uc !== undefined) req.unitCost = uc;
      if (sp !== undefined) req.sellingPrice = sp;
      ops.push(this.inventoryService.updateInventory(this.data.item.id, req));
    }

    forkJoin(ops).subscribe({
      next: () => {
        this.submitting = false;
        this.snackBar.open(needAdjust && needPriceUpdate ? 'Stock and prices updated successfully!' : needPriceUpdate ? 'Prices updated successfully!' : 'Stock adjusted successfully!', 'Close', { duration: 3000 });
        this.ref.close(true);
      },
      error: (err: unknown) => {
        console.error('Error saving:', err);
        this.submitting = false;
        this.snackBar.open('Error saving changes. Please try again.', 'Close', { duration: 5000 });
      }
    });
  }

  onDelete(): void {
    if (!this.data.item) return;
    if (!confirm(`Are you sure you want to delete this inventory record for "${this.data.item.productName}" at ${this.data.item.branchName}? This will remove it from the active inventory list.`)) {
      return;
    }
    this.submitting = true;
    this.inventoryService.deleteInventory(this.data.item.id).subscribe({
      next: () => {
        this.submitting = false;
        this.snackBar.open('Inventory deleted successfully.', 'Close', { duration: 3000 });
        this.ref.close(true);
      },
      error: (error) => {
        console.error('Error deleting inventory:', error);
        this.submitting = false;
        this.snackBar.open('Error deleting inventory. Please try again.', 'Close', { duration: 5000 });
      }
    });
  }

  close(): void {
    this.ref.close();
  }
}
