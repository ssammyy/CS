import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';

// Professional Button Components
import { 
  PrimaryButtonComponent, 
  SecondaryButtonComponent
} from '../../shared/components';

import { 
  PurchaseOrdersService, 
  ChangePurchaseOrderStatusRequest,
  PurchaseOrderDto, 
  PurchaseOrderStatus 
} from '../../core/services/purchase-orders.service';

/**
 * Dialog component for changing purchase order status.
 * Provides a form for updating PO status with optional notes.
 */
@Component({
  selector: 'app-change-status-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    // Professional Button Components
    PrimaryButtonComponent,
    SecondaryButtonComponent
  ],
  template: `
    <div class="p-6">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">Change Status</h2>
          <p class="text-gray-600 mt-1">Update status for {{ data.purchaseOrder.poNumber }}</p>
        </div>
        <button mat-icon-button (click)="close()" class="text-gray-400 hover:text-gray-600">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Current Status -->
      <div class="bg-gray-50 rounded-lg p-4 mb-6">
        <div class="flex items-center gap-3">
          <span class="text-sm font-medium text-gray-700">Current Status:</span>
          <span [class]="getStatusChipClass(data.purchaseOrder.status)" class="px-3 py-1 rounded-full text-sm font-medium">
            {{ getStatusDisplayName(data.purchaseOrder.status) }}
          </span>
        </div>
      </div>

      <!-- Form -->
      <form [formGroup]="statusForm" (ngSubmit)="onSubmit()" class="space-y-6">
        <mat-form-field class="w-full">
          <mat-label>New Status *</mat-label>
          <mat-select formControlName="newStatus" required>
            <mat-option *ngFor="let status of availableStatuses" [value]="status">
              {{ getStatusDisplayName(status) }}
            </mat-option>
          </mat-select>
          <mat-error *ngIf="statusForm.get('newStatus')?.hasError('required')">
            New status is required
          </mat-error>
        </mat-form-field>

        <mat-form-field class="w-full">
          <mat-label>Notes</mat-label>
          <textarea matInput formControlName="notes" rows="3" 
                    placeholder="Optional notes about this status change..."></textarea>
        </mat-form-field>

        <!-- Status Change Preview -->
        <div *ngIf="statusForm.get('newStatus')?.value" class="bg-brand-mint/20 rounded-lg p-4">
          <h4 class="font-medium text-gray-900 mb-2">Status Change Preview</h4>
          <div class="flex items-center gap-3">
            <span [class]="getStatusChipClass(data.purchaseOrder.status)" class="px-2 py-1 rounded-full text-xs font-medium">
              {{ getStatusDisplayName(data.purchaseOrder.status) }}
            </span>
            <mat-icon class="text-gray-400">arrow_forward</mat-icon>
            <span [class]="getStatusChipClass(statusForm.get('newStatus')?.value)" class="px-2 py-1 rounded-full text-xs font-medium">
              {{ getStatusDisplayName(statusForm.get('newStatus')?.value) }}
            </span>
          </div>
        </div>

        <!-- Form Actions -->
        <div class="flex justify-end gap-3 pt-6 border-t border-gray-200">
          <app-secondary-button 
            label="Cancel"
            (click)="close()">
          </app-secondary-button>
          
          <app-primary-button 
            label="Update Status"
            icon="swap_horiz"
            type="submit"
            [disabled]="statusForm.invalid || submitting">
          </app-primary-button>
        </div>
      </form>
    </div>
  `
})
export class ChangeStatusDialogComponent {
  statusForm: FormGroup;
  submitting = false;
  purchaseOrder: PurchaseOrderDto;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ChangeStatusDialogComponent>,
    private purchaseOrdersService: PurchaseOrdersService,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: { purchaseOrder: PurchaseOrderDto }
  ) {
    this.purchaseOrder = data.purchaseOrder;
    this.statusForm = this.fb.group({
      newStatus: ['', Validators.required],
      notes: ['']
    });
  }

  get availableStatuses(): PurchaseOrderStatus[] {
    // Filter out current status and provide appropriate next statuses based on workflow
    const currentStatus = this.purchaseOrder.status;
    const allStatuses = Object.values(PurchaseOrderStatus);
    
    switch (currentStatus) {
      case PurchaseOrderStatus.DRAFT:
        return [PurchaseOrderStatus.PENDING_APPROVAL, PurchaseOrderStatus.CANCELLED];
      case PurchaseOrderStatus.PENDING_APPROVAL:
        return [PurchaseOrderStatus.APPROVED, PurchaseOrderStatus.CANCELLED];
      case PurchaseOrderStatus.APPROVED:
        return [PurchaseOrderStatus.DELIVERED, PurchaseOrderStatus.CANCELLED];
      case PurchaseOrderStatus.DELIVERED:
        return [PurchaseOrderStatus.CLOSED];
      case PurchaseOrderStatus.CLOSED:
        return []; // No further status changes allowed
      case PurchaseOrderStatus.CANCELLED:
        return []; // No further status changes allowed
      default:
        return allStatuses.filter(status => status !== currentStatus);
    }
  }

  onSubmit(): void {
    if (this.statusForm.valid) {
      this.submitting = true;
      
      const formValue = this.statusForm.value;
      const request: ChangePurchaseOrderStatusRequest = {
        newStatus: formValue.newStatus,
        notes: formValue.notes
      };

      this.purchaseOrdersService.changePurchaseOrderStatus(
        this.purchaseOrder.id, 
        request, 
        'current-user'
      ).subscribe({
        next: (result) => {
          this.submitting = false;
          this.dialogRef.close(result);
        },
        error: (error) => {
          this.submitting = false;
          console.error('Error changing status:', error);
          this.snackBar.open('Error changing status', 'Close', { duration: 3000 });
        }
      });
    }
  }

  close(): void {
    this.dialogRef.close();
  }

  getStatusDisplayName(status: PurchaseOrderStatus): string {
    const statusMap: Record<PurchaseOrderStatus, string> = {
      [PurchaseOrderStatus.DRAFT]: 'Draft',
      [PurchaseOrderStatus.PENDING_APPROVAL]: 'Pending Approval',
      [PurchaseOrderStatus.APPROVED]: 'Approved',
      [PurchaseOrderStatus.DELIVERED]: 'Delivered',
      [PurchaseOrderStatus.CLOSED]: 'Closed',
      [PurchaseOrderStatus.CANCELLED]: 'Cancelled'
    };
    return statusMap[status] || status;
  }

  getStatusChipClass(status: PurchaseOrderStatus): string {
    const classMap: Record<PurchaseOrderStatus, string> = {
      [PurchaseOrderStatus.DRAFT]: 'bg-gray-100 text-gray-800',
      [PurchaseOrderStatus.PENDING_APPROVAL]: 'bg-yellow-100 text-yellow-800',
      [PurchaseOrderStatus.APPROVED]: 'bg-blue-100 text-blue-800',
      [PurchaseOrderStatus.DELIVERED]: 'bg-green-100 text-green-800',
      [PurchaseOrderStatus.CLOSED]: 'bg-purple-100 text-purple-800',
      [PurchaseOrderStatus.CANCELLED]: 'bg-red-100 text-red-800'
    };
    return classMap[status] || 'bg-gray-100 text-gray-800';
  }
}
