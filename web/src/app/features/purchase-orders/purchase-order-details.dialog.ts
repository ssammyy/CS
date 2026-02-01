import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';

// Professional Button Components
import { 
  SecondaryButtonComponent
} from '../../shared/components';

import { 
  PurchaseOrderDto, 
  PurchaseOrderStatus 
} from '../../core/services/purchase-orders.service';

/**
 * Dialog component for displaying purchase order details in read-only format.
 * Shows comprehensive information about the PO including line items and status.
 */
@Component({
  selector: 'app-purchase-order-details-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatDividerModule,
    MatChipsModule,
    // Professional Button Components
    SecondaryButtonComponent
  ],
  template: `
    <div class="h-[min(92vh,800px)] overflow-y-auto max-w-4xl">
      <div class="px-5 pt-5">
        <div class="h-1.5 w-16 rounded-full bg-gradient-to-r from-brand-sky to-brand-coral mb-4"></div>
        <h2 class="text-2xl font-semibold">Purchase Order Details</h2>
        <p class="text-gray-600 mt-1 text-sm">{{ data.purchaseOrder.poNumber }}</p>
      </div>

      <div class="p-5 pt-3 space-y-6">
        <!-- Header Card -->
        <div class="bg-gradient-to-r from-brand-sky/10 to-brand-coral/10 p-6 rounded-lg border border-brand-sky/20">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <h1 class="text-3xl font-bold text-gray-900 mb-2">{{ data.purchaseOrder.title }}</h1>
              <p class="text-xl text-gray-600 mb-3">
                {{ data.purchaseOrder.supplierName }}
              </p>
              <div class="flex flex-wrap gap-2">
                <span [class]="getStatusChipClass(data.purchaseOrder.status)" class="px-3 py-1 rounded-full text-sm font-medium">
                  {{ getStatusDisplayName(data.purchaseOrder.status) }}
                </span>
              </div>
            </div>
            <div class="text-right">
              <div class="text-2xl font-bold text-brand-coral">{{ data.purchaseOrder.grandTotal | currency: 'KES' }}</div>
              <div class="text-sm text-gray-600">Total Amount</div>
            </div>
          </div>
        </div>

        <!-- Status and Basic Info -->
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <mat-icon class="text-brand-sky">info</mat-icon>
            Basic Information
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-4">
              <div>
                <label class="text-sm font-medium text-gray-600">PO Number</label>
                <p class="font-mono text-gray-900">{{ data.purchaseOrder.poNumber }}</p>
              </div>
              <div>
                <label class="text-sm font-medium text-gray-600">Branch</label>
                <p class="text-gray-900">{{ data.purchaseOrder.branchName }}</p>
              </div>
              <div>
                <label class="text-sm font-medium text-gray-600">Expected Delivery</label>
                <p class="text-gray-900">
                  {{ data.purchaseOrder.expectedDeliveryDate ? (data.purchaseOrder.expectedDeliveryDate | date:'mediumDate') : 'Not set' }}
                </p>
              </div>
            </div>
            <div class="space-y-4">
              <div>
                <label class="text-sm font-medium text-gray-600">Payment Terms</label>
                <p class="text-gray-900">{{ data.purchaseOrder.paymentTerms || 'Not specified' }}</p>
              </div>
              <div>
                <label class="text-sm font-medium text-gray-600">Created By</label>
                <p class="text-gray-900">{{ data.purchaseOrder.createdBy }}</p>
              </div>
              <div>
                <label class="text-sm font-medium text-gray-600">Created At</label>
                <p class="text-gray-900">{{ data.purchaseOrder.createdAt | date:'medium' }}</p>
              </div>
            </div>
          </div>
          <div *ngIf="data.purchaseOrder.description" class="mt-6">
            <label class="text-sm font-medium text-gray-600">Description</label>
            <p class="text-gray-900 mt-2 leading-relaxed">{{ data.purchaseOrder.description }}</p>
          </div>
          <div *ngIf="data.purchaseOrder.notes" class="mt-6">
            <label class="text-sm font-medium text-gray-600">Notes</label>
            <p class="text-gray-900 mt-2 leading-relaxed">{{ data.purchaseOrder.notes }}</p>
          </div>
        </div>

        <!-- Financial Summary -->
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <mat-icon class="text-brand-sky">account_balance</mat-icon>
            Financial Summary
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="text-center p-4 bg-gray-50 rounded-lg">
              <div class="text-3xl font-bold text-brand-sky">{{ data.purchaseOrder.totalAmount | currency: 'KES' }}</div>
              <div class="text-sm text-gray-600 mt-1">Subtotal</div>
            </div>
            <div class="text-center p-4 bg-gray-50 rounded-lg">
              <div class="text-3xl font-bold text-orange-500">{{ data.purchaseOrder.taxAmount || 0 | currency: 'KES' }}</div>
              <div class="text-sm text-gray-600 mt-1">Tax</div>
            </div>
            <div class="text-center p-4 bg-gray-50 rounded-lg">
              <div class="text-3xl font-bold text-brand-coral">{{ data.purchaseOrder.grandTotal | currency: 'KES' }}</div>
              <div class="text-sm text-gray-600 mt-1">Grand Total</div>
            </div>
          </div>
        </div>

        <!-- Line Items -->
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <mat-icon class="text-brand-sky">inventory</mat-icon>
            Line Items ({{ data.purchaseOrder.lineItems?.length || 0 }})
          </h3>
        
        <!-- Show message if no line items -->
        <div *ngIf="!data.purchaseOrder.lineItems || data.purchaseOrder.lineItems.length === 0" 
             class="text-center py-8 text-gray-500">
          <mat-icon class="text-4xl text-gray-300 mb-2">inventory_2</mat-icon>
          <p class="text-gray-400">No line items found for this purchase order.</p>
        </div>
        
        <!-- Show table if line items exist -->
        <div *ngIf="data.purchaseOrder.lineItems && data.purchaseOrder.lineItems.length > 0" class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-gray-200">
                <th class="text-left py-3 px-4 font-medium text-gray-700">Product</th>
                <th class="text-right py-3 px-4 font-medium text-gray-700">Quantity</th>
                <th class="text-right py-3 px-4 font-medium text-gray-700">Unit Price</th>
                <th class="text-right py-3 px-4 font-medium text-gray-700">Total</th>
                <th class="text-right py-3 px-4 font-medium text-gray-700">Received</th>
                <th class="text-left py-3 px-4 font-medium text-gray-700">Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of data.purchaseOrder.lineItems; let i = index" 
                  class="border-b border-gray-100 hover:bg-gray-50">
                <td class="py-3 px-4">
                  <div>
                    <div class="font-medium text-gray-900">{{ item.productName }}</div>
                    <div class="text-sm text-gray-500">{{ item.productBarcode }}</div>
                  </div>
                </td>
                <td class="py-3 px-4 text-right">
                  <span class="font-medium text-gray-900">{{ item.quantity }}</span>
                </td>
                <td class="py-3 px-4 text-right">
                  <span class="text-gray-900">{{ item.unitPrice | currency: 'KES' }}</span>
                </td>
                <td class="py-3 px-4 text-right">
                  <span class="font-medium text-gray-900">{{ item.totalPrice | currency: 'KES' }}</span>
                </td>
                <td class="py-3 px-4 text-right">
                  <span [class]="getReceivedQuantityClass(item.receivedQuantity, item.quantity)">
                    {{ item.receivedQuantity || 0 }} / {{ item.quantity }}
                  </span>
                </td>
                <td class="py-3 px-4">
                  <span class="text-sm text-gray-600">{{ item.notes || '-' }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        </div>

        <!-- Timeline and History -->
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <mat-icon class="text-brand-sky">timeline</mat-icon>
            Timeline
          </h3>
        <div class="space-y-4">
          <div class="flex items-start gap-4">
            <div class="w-3 h-3 bg-brand-sky rounded-full mt-2"></div>
            <div>
              <p class="font-medium text-gray-900">Created</p>
              <p class="text-sm text-gray-600">{{ data.purchaseOrder.createdAt | date:'medium' }}</p>
              <p class="text-sm text-gray-500">by {{ data.purchaseOrder.createdBy }}</p>
            </div>
          </div>

          <div *ngIf="data.purchaseOrder.updatedAt" class="flex items-start gap-4">
            <div class="w-3 h-3 bg-brand-mint rounded-full mt-2"></div>
            <div>
              <p class="font-medium text-gray-900">Last Updated</p>
              <p class="text-sm text-gray-600">{{ data.purchaseOrder.updatedAt | date:'medium' }}</p>
            </div>
          </div>

          <div *ngIf="data.purchaseOrder.approvedAt" class="flex items-start gap-4">
            <div class="w-3 h-3 bg-green-500 rounded-full mt-2"></div>
            <div>
              <p class="font-medium text-gray-900">Approved</p>
              <p class="text-sm text-gray-600">{{ data.purchaseOrder.approvedAt | date:'medium' }}</p>
              <p class="text-sm text-gray-500">by {{ data.purchaseOrder.approvedBy }}</p>
            </div>
          </div>

          <div *ngIf="data.purchaseOrder.actualDeliveryDate" class="flex items-start gap-4">
            <div class="w-3 h-3 bg-purple-500 rounded-full mt-2"></div>
            <div>
              <p class="font-medium text-gray-900">Delivered</p>
              <p class="text-sm text-gray-600">{{ data.purchaseOrder.actualDeliveryDate | date:'medium' }}</p>
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
export class PurchaseOrderDetailsDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<PurchaseOrderDetailsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { purchaseOrder: PurchaseOrderDto }
  ) {}

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

  getReceivedQuantityClass(received: number, total: number): string {
    if (received === 0) return 'text-gray-500';
    if (received === total) return 'text-green-600 font-medium';
    if (received < total) return 'text-orange-600 font-medium';
    return 'text-red-600 font-medium';
  }
}
