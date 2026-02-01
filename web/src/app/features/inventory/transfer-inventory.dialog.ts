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

import { InventoryService, InventoryDto, InventoryTransferRequest } from '../../core/services/inventory.service';
import { BranchesService, BranchDto } from '../../core/services/branches.service';
import { BranchContextService } from '../../core/services/branch-context.service';

export interface TransferInventoryDialogData {
  branches: BranchDto[];
  item?: InventoryDto;
}

/**
 * Enhanced dialog component for transferring inventory between branches.
 * Provides comprehensive transfer functionality with validation.
 * Automatically defaults destination branch to current branch context if available.
 */
@Component({
  selector: 'app-transfer-inventory-dialog',
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
        <div class="h-1.5 w-16 rounded-full bg-gradient-to-r from-green-500 to-brand-sky mb-4"></div>
        <h2 class="text-2xl font-semibold">Transfer Inventory</h2>
        <p class="text-gray-600 mt-1 text-sm">Move stock between branches</p>
      </div>

      <form #transferForm="ngForm" (ngSubmit)="onSubmit()" class="p-5 pt-3 space-y-6">
        <!-- Product Information -->
        <div class="bg-gray-50 p-4 rounded-lg">
          <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <mat-icon class="text-brand-sky">inventory</mat-icon>
            Product Information
          </h3>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <mat-form-field class="w-full" color="primary">
              <mat-label>Product</mat-label>
              <input
                matInput
                name="productName"
                [value]="data.item ? data.item.productName : ''"
                readonly
                placeholder="Product name" />
            </mat-form-field>

            <mat-form-field class="w-full" color="primary">
              <mat-label>Current Stock</mat-label>
              <input
                matInput
                name="currentStock"
                [value]="data.item ? data.item.quantity : ''"
                readonly
                placeholder="Available quantity" />
            </mat-form-field>
          </div>

          <div *ngIf="data.item" class="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span class="font-medium text-blue-700">Batch:</span>
                <p class="text-blue-900">{{ data.item.batchNumber || 'N/A' }}</p>
              </div>
              <div>
                <span class="font-medium text-blue-700">Expiry:</span>
                <p class="text-blue-900">{{ data.item.expiryDate ? (data.item.expiryDate | date:'shortDate') : 'N/A' }}</p>
              </div>
              <div>
                <span class="font-medium text-blue-700">Location:</span>
                <p class="text-blue-900">{{ data.item.locationInBranch || 'N/A' }}</p>
              </div>
              <div>
                <span class="font-medium text-blue-700">Branch:</span>
                <p class="text-blue-900">{{ data.item.branchName }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Transfer Details -->
        <div class="bg-gray-50 p-4 rounded-lg">
          <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <mat-icon class="text-green-600">swap_horiz</mat-icon>
            Transfer Details
          </h3>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <mat-form-field class="w-full" color="primary">
              <mat-label>From Branch</mat-label>
              <input
                matInput
                name="fromBranchName"
                [value]="data.item ? data.item.branchName : ''"
                readonly
                placeholder="Source branch" />
            </mat-form-field>

            <mat-form-field class="w-full" color="primary">
              <mat-label>To Branch *</mat-label>
              <mat-select name="toBranchId" [(ngModel)]="transfer.toBranchId" required>
                <mat-option value="">Select Destination Branch</mat-option>
                <mat-option
                  *ngFor="let branch of getDestinationBranches()"
                  [value]="branch.id">
                  {{ branch.name }}
                </mat-option>
              </mat-select>
              <mat-hint *ngIf="currentBranchContext && currentBranchContext.id !== data.item?.branchId">
                <span class="text-brand-sky">Suggested: {{ currentBranchContext.name }} (your current branch)</span>
              </mat-hint>
              <mat-hint *ngIf="!currentBranchContext">
                <span class="text-gray-600">Select destination branch for transfer</span>
              </mat-hint>
            </mat-form-field>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <mat-form-field class="w-full" color="primary">
              <mat-label>Quantity to Transfer *</mat-label>
              <input
                matInput
                type="number"
                name="quantity"
                [(ngModel)]="transfer.quantity"
                required
                [min]="1"
                [max]="data.item ? data.item.quantity : 999999"
                placeholder="e.g., 50" />
              <mat-hint>
                Maximum available: {{ data.item ? data.item.quantity : 0 }}
              </mat-hint>
            </mat-form-field>

            <mat-form-field class="w-full" color="primary">
              <mat-label>Batch Number</mat-label>
              <input
                matInput
                name="batchNumber"
                [(ngModel)]="transfer.batchNumber"
                [placeholder]="data.item?.batchNumber || 'e.g., BATCH001'" />
              <mat-hint>Leave empty to use existing batch</mat-hint>
            </mat-form-field>
          </div>
        </div>

        <!-- Additional Information -->
        <div class="bg-gray-50 p-4 rounded-lg">
          <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <mat-icon class="text-brand-sky">info</mat-icon>
            Additional Information
          </h3>

          <mat-form-field class="w-full" color="primary">
            <mat-label>Transfer Notes</mat-label>
            <textarea
              matInput
              name="notes"
              [(ngModel)]="transfer.notes"
              rows="3"
              placeholder="Reason for transfer, special handling instructions, or any other relevant information..."></textarea>
          </mat-form-field>
        </div>

        <!-- Transfer Preview -->
        <div *ngIf="transfer.quantity && transfer.toBranchId && data.item" class="bg-green-50 p-4 rounded-lg border border-green-200">
          <h3 class="text-lg font-semibold text-green-900 mb-3 flex items-center gap-2">
            <mat-icon class="text-green-600">preview</mat-icon>
            Transfer Preview
          </h3>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div class="text-center p-3 bg-white rounded-lg border border-green-200">
              <span class="font-medium text-green-700">Source Branch</span>
              <p class="text-green-900 font-semibold">{{ data.item.branchName }}</p>
              <p class="text-xs text-green-600">Current: {{ data.item.quantity }}</p>
              <p class="text-xs text-green-600">After: {{ data.item.quantity - transfer.quantity }}</p>
            </div>

            <div class="text-center p-3 bg-white rounded-lg border border-green-200">
              <span class="font-medium text-green-700">Transfer</span>
              <p class="text-green-900 font-semibold">{{ transfer.quantity }}</p>
              <p class="text-xs text-green-600">units</p>
            </div>

            <div class="text-center p-3 bg-white rounded-lg border border-green-200">
              <span class="font-medium text-green-700">Destination</span>
              <p class="text-green-900 font-semibold">{{ getDestinationBranchName() }}</p>
              <p class="text-xs text-green-600">Will receive {{ transfer.quantity }} units</p>
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
            class="!py-3 bg-green-600 text-white hover:opacity-95"
            [disabled]="!transferForm.valid || submitting">
            <mat-icon *ngIf="submitting" class="animate-spin">refresh</mat-icon>
            {{ submitting ? 'Processing Transfer...' : 'Process Transfer' }}
          </button>
        </div>
      </form>
    </div>
  `
})
export class TransferInventoryDialogComponent implements OnInit {
  private readonly ref = inject(MatDialogRef<TransferInventoryDialogComponent, any>);
  readonly data: TransferInventoryDialogData = inject(MAT_DIALOG_DATA);
  private readonly inventoryService = inject(InventoryService);
  private readonly branchContextService = inject(BranchContextService);
  private readonly snackBar = inject(MatSnackBar);

  transfer: InventoryTransferRequest = {
    productId: '',
    fromBranchId: '',
    toBranchId: '',
    quantity: 0,
    notes: '',
    batchNumber: ''
  };

  currentBranchContext: BranchDto | null = null;
  submitting = false;

  ngOnInit(): void {
    if (this.data.item) {
      this.transfer.productId = this.data.item.productId;
      this.transfer.fromBranchId = this.data.item.branchId;
      this.transfer.batchNumber = this.data.item.batchNumber || '';
    }

    // Set up branch context for destination branch suggestion
    this.setupBranchContext();
  }

  /**
   * Sets up branch context to suggest destination branch.
   * If user has a branch context and it's different from source, suggest it.
   */
  private setupBranchContext(): void {
    this.branchContextService.currentBranch$.subscribe(branch => {
      this.currentBranchContext = branch;

      // If we have a branch context and it's different from the source branch,
      // and no destination is selected yet, suggest the current branch
      if (branch &&
          this.data.item &&
          branch.id !== this.data.item.branchId &&
          !this.transfer.toBranchId) {
        console.log('🎯 Suggesting current branch as destination:', branch.name);
      }
    });
  }

  getDestinationBranches(): BranchDto[] {
    // Filter out the source branch from available destinations
    return this.data.branches.filter(branch => branch.id !== this.data.item!.branchId);
  }

  getDestinationBranchName(): string {
    const branch = this.data.branches.find(b => b.id === this.transfer.toBranchId);
    return branch ? branch.name : 'Unknown Branch';
  }

  canTransfer(): boolean {
    if (!this.data.item || !this.transfer.quantity || !this.transfer.toBranchId) return false;

    // Check if transfer quantity is valid
    if (this.transfer.quantity <= 0 || this.transfer.quantity > this.data.item.quantity) return false;

    // Check if destination is different from source
    if (this.transfer.toBranchId === this.data.item.branchId) return false;

    return true;
  }

  onSubmit(): void {
    if (this.submitting || !this.canTransfer()) return;

    this.submitting = true;
    this.inventoryService.transferInventory(this.transfer).subscribe({
      next: () => {
        this.submitting = false;
        this.snackBar.open('Inventory transferred successfully!', 'Close', { duration: 3000 });
        this.ref.close(true);
      },
      error: (error) => {
        console.error('Error transferring inventory:', error);
        this.submitting = false;
        this.snackBar.open('Error transferring inventory. Please try again.', 'Close', { duration: 5000 });
      }
    });
  }

  close(): void {
    this.ref.close();
  }
}
