import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

// Professional Button Components
import { 
  PrimaryButtonComponent, 
  SecondaryButtonComponent
} from '../../shared/components';

import { 
  PurchaseOrdersService, 
  ReceiveGoodsRequest,
  ReceiveGoodsLineItemRequest,
  PurchaseOrderDto 
} from '../../core/services/purchase-orders.service';

/**
 * Dialog component for receiving goods against purchase order line items.
 * Provides a form for updating received quantities for each line item.
 */
@Component({
  selector: 'app-receive-goods-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    // Professional Button Components
    PrimaryButtonComponent,
    SecondaryButtonComponent
  ],
  template: `
    <div class="p-6 max-w-4xl">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">Receive Goods</h2>
          <p class="text-gray-600 mt-1">Update received quantities for {{ purchaseOrder?.poNumber || 'Loading...' }}</p>
        </div>
        <button mat-icon-button (click)="close()" class="text-gray-400 hover:text-gray-600">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="flex justify-center py-12">
        <div class="text-center">
          <mat-spinner diameter="40"></mat-spinner>
          <p class="text-gray-600 mt-4">Loading purchase order details...</p>
        </div>
      </div>

      <!-- Purchase Order Summary -->
      <div *ngIf="!loading && purchaseOrder" class="bg-gray-50 rounded-lg p-4 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">PO Number</label>
            <p class="font-mono text-gray-900">{{ purchaseOrder.poNumber }}</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
            <p class="text-gray-900">{{ purchaseOrder.supplierName }}</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Total Items</label>
            <p class="text-gray-900">{{ purchaseOrder.lineItems?.length || 0 }}</p>
          </div>
        </div>
      </div>

      <!-- Form -->
      <form *ngIf="!loading && purchaseOrder" [formGroup]="receiveGoodsForm" (ngSubmit)="onSubmit()" class="space-y-6">
        <!-- Line Items -->
        <div class="border-t border-gray-200 pt-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Line Items</h3>
          
          <!-- No line items message -->
          <div *ngIf="!purchaseOrder.lineItems || purchaseOrder.lineItems.length === 0" 
               class="text-center py-8 text-gray-500">
            <mat-icon class="text-4xl text-gray-300 mb-2">inventory_2</mat-icon>
            <p class="text-gray-400">No line items found for this purchase order.</p>
          </div>
          
          <!-- Line items form -->
          <div *ngIf="purchaseOrder.lineItems && purchaseOrder.lineItems.length > 0" 
               formArrayName="lineItems" class="space-y-4">
            <div *ngFor="let item of lineItemsArray.controls; let i = index" 
                 [formGroupName]="i" 
                 class="bg-white border border-gray-200 rounded-lg p-4">
              
              <div class="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div class="md:col-span-2">
                  <label class="block text-sm font-medium text-gray-700 mb-1">Product</label>
                  <div>
                    <div class="font-medium text-gray-900">{{ getLineItemProduct(i).productName }}</div>
                    <div class="text-sm text-gray-500">{{ getLineItemProduct(i).productBarcode }}</div>
                  </div>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Ordered Quantity</label>
                  <p class="text-gray-900">{{ getLineItemProduct(i).quantity }}</p>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Previously Received</label>
                  <p class="text-gray-900">{{ getLineItemProduct(i).receivedQuantity || 0 }}</p>
                </div>
              </div>

              <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <mat-form-field class="w-full">
                  <mat-label>Received Quantity *</mat-label>
                  <input matInput type="number" formControlName="receivedQuantity" 
                         [min]="0" 
                         [max]="getMaxReceivableQuantity(i)"
                         required>
                  <mat-error *ngIf="item.get('receivedQuantity')?.hasError('required')">
                    Received quantity is required
                  </mat-error>
                  <mat-error *ngIf="item.get('receivedQuantity')?.hasError('min')">
                    Quantity cannot be negative
                  </mat-error>
                  <mat-error *ngIf="item.get('receivedQuantity')?.hasError('max')">
                    Cannot receive more than ordered
                  </mat-error>
                </mat-form-field>

                <div class="flex items-end">
                  <div class="w-full">
                    <label class="block text-sm font-medium text-gray-700 mb-1">Remaining</label>
                    <p class="text-lg font-medium" [class]="getRemainingQuantityClass(i)">
                      {{ getRemainingQuantity(i) }}
                    </p>
                  </div>
                </div>
              </div>

              <!-- Progress Bar -->
              <div class="mt-3">
                <div class="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Progress</span>
                  <span>{{ getProgressPercentage(i) }}%</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                  <div class="bg-brand-sky h-2 rounded-full transition-all duration-300" 
                       [style.width.%]="getProgressPercentage(i)"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Summary -->
        <div class="bg-brand-mint/20 rounded-lg p-4">
          <h4 class="font-medium text-gray-900 mb-3">Receiving Summary</h4>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="text-center">
              <label class="block text-sm font-medium text-gray-700 mb-1">Total Items</label>
              <p class="text-2xl font-bold text-gray-900">{{ purchaseOrder.lineItems?.length || 0 }}</p>
            </div>
            <div class="text-center">
              <label class="block text-sm font-medium text-gray-700 mb-1">Items to Receive</label>
              <p class="text-2xl font-bold text-brand-sky">{{ getItemsToReceiveCount() }}</p>
            </div>
            <div class="text-center">
              <label class="block text-sm font-medium text-gray-700 mb-1">Total Quantity</label>
              <p class="text-2xl font-bold text-brand-coral">{{ getTotalQuantityToReceive() }}</p>
            </div>
          </div>
        </div>

        <!-- Form Actions -->
        <div class="flex justify-end gap-3 pt-6 border-t border-gray-200">
          <app-secondary-button 
            label="Cancel"
            (click)="close()">
          </app-secondary-button>
          
          <app-primary-button 
            label="Receive Goods"
            icon="local_shipping"
            type="submit"
            [disabled]="receiveGoodsForm.invalid || submitting || !hasChanges()">
          </app-primary-button>
        </div>
      </form>
    </div>
  `
})
export class ReceiveGoodsDialogComponent implements OnInit {
  receiveGoodsForm: FormGroup;
  submitting = false;
  loading = true;
  purchaseOrder: PurchaseOrderDto | null = null;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ReceiveGoodsDialogComponent>,
    private purchaseOrdersService: PurchaseOrdersService,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: { purchaseOrder: PurchaseOrderDto }
  ) {
    this.receiveGoodsForm = this.fb.group({
      lineItems: this.fb.array([])
    });
  }

  ngOnInit(): void {
    // Fetch the full purchase order with line items
    this.purchaseOrdersService.getPurchaseOrderById(this.data.purchaseOrder.id).subscribe({
      next: (fullPurchaseOrder) => {
        this.purchaseOrder = fullPurchaseOrder;
        this.loading = false;
        this.initializeLineItems();
      },
      error: (error) => {
        this.loading = false;
        console.error('Error loading purchase order details:', error);
        const errorMessage = error?.error?.detail || error?.message || 'Error loading purchase order details';
        this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
        this.dialogRef.close();
      }
    });
  }

  get lineItemsArray(): FormArray {
    return this.receiveGoodsForm.get('lineItems') as FormArray;
  }

  initializeLineItems(): void {
    this.lineItemsArray.clear();
    
    if (this.purchaseOrder?.lineItems) {
      this.purchaseOrder.lineItems.forEach(item => {
        this.lineItemsArray.push(this.fb.group({
          lineItemId: [item.id],
          receivedQuantity: [0, [Validators.required, Validators.min(0)]]
        }));
      });
    }
  }

  getLineItemProduct(index: number): any {
    return this.purchaseOrder?.lineItems?.[index] || null;
  }

  getMaxReceivableQuantity(index: number): number {
    const item = this.purchaseOrder?.lineItems?.[index];
    if (!item) return 0;
    const previouslyReceived = item.receivedQuantity || 0;
    return item.quantity - previouslyReceived;
  }

  getRemainingQuantity(index: number): number {
    const item = this.purchaseOrder?.lineItems?.[index];
    if (!item) return 0;
    const previouslyReceived = item.receivedQuantity || 0;
    const currentReceived = this.lineItemsArray.at(index).get('receivedQuantity')?.value || 0;
    return item.quantity - previouslyReceived - currentReceived;
  }

  getRemainingQuantityClass(index: number): string {
    const remaining = this.getRemainingQuantity(index);
    if (remaining === 0) return 'text-green-600';
    if (remaining < 0) return 'text-red-600';
    return 'text-gray-900';
  }

  getProgressPercentage(index: number): number {
    const item = this.purchaseOrder?.lineItems?.[index];
    if (!item) return 0;
    const previouslyReceived = item.receivedQuantity || 0;
    const currentReceived = this.lineItemsArray.at(index).get('receivedQuantity')?.value || 0;
    const totalReceived = previouslyReceived + currentReceived;
    return Math.round((totalReceived / item.quantity) * 100);
  }

  getItemsToReceiveCount(): number {
    let count = 0;
    for (let i = 0; i < this.lineItemsArray.length; i++) {
      const received = this.lineItemsArray.at(i).get('receivedQuantity')?.value || 0;
      if (received > 0) {
        count++;
      }
    }
    return count;
  }

  getTotalQuantityToReceive(): number {
    let total = 0;
    for (let i = 0; i < this.lineItemsArray.length; i++) {
      const received = this.lineItemsArray.at(i).get('receivedQuantity')?.value || 0;
      total += received;
    }
    return total;
  }

  hasChanges(): boolean {
    return this.getTotalQuantityToReceive() > 0;
  }

  onSubmit(): void {
    if (this.receiveGoodsForm.valid && this.hasChanges() && this.purchaseOrder) {
      this.submitting = true;
      
      const formValue = this.receiveGoodsForm.value;
      const request: ReceiveGoodsRequest = {
        lineItems: formValue.lineItems
          .map((item: any, index: number) => ({
            lineItemId: item.lineItemId,
            receivedQuantity: item.receivedQuantity
          }))
          .filter((item: any) => item.receivedQuantity > 0)
      };

      this.purchaseOrdersService.receiveGoods(
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
          console.error('Error receiving goods:', error);
          const errorMessage = error?.error?.detail || error?.message || 'Error receiving goods';
          this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
        }
      });
    }
  }

  close(): void {
    this.dialogRef.close();
  }
}
