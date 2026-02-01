import { Component, Inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar } from '@angular/material/snack-bar';

import { SalesService, SaleDto, CreateSaleReturnRequest, CreateSaleReturnLineItemRequest } from '../../../../core/services/sales.service';
import { ErrorService } from '../../../../core/services/error.service';

/**
 * Interface for return line item
 */
interface ReturnLineItem {
  originalLineItemId: string;
  productName: string;
  quantitySold: number;
  quantityReturned: number;
  quantityAlreadyReturned: number;
  unitPrice: number;
  restoreToInventory: boolean;
  notes: string;
}

/**
 * Dialog component for processing sale returns.
 * Allows users to select items to return and specify return details.
 */
@Component({
  selector: 'app-return-processing-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatDividerModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule
  ],
  template: `
    <div class="return-processing-dialog">
      <div class="dialog-header">
        <h2 mat-dialog-title class="text-xl font-semibold text-gray-800">
          Process Return
        </h2>
        <p class="text-sm text-gray-600">
          Sale #{{ data.sale.saleNumber }} - {{ data.sale.customerName || 'Walk-in Customer' }}
        </p>
      </div>

      <mat-dialog-content class="dialog-content">
        <!-- Return Reason -->
        <mat-card class="mb-4">
          <mat-card-header>
            <mat-card-title class="text-lg font-medium text-gray-800">
              Return Information
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="form-group">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Return Reason *
              </label>
              <mat-select 
                [(ngModel)]="returnReason" 
                placeholder="Select return reason"
                class="w-full">
                <mat-option value="defective">Defective Product</mat-option>
                <mat-option value="wrong_item">Wrong Item</mat-option>
                <mat-option value="customer_request">Customer Request</mat-option>
                <mat-option value="expired">Expired Product</mat-option>
                <mat-option value="damaged">Damaged in Transit</mat-option>
                <mat-option value="other">Other</mat-option>
              </mat-select>
            </div>
            
            <div class="form-group mt-4">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes
              </label>
              <textarea 
                [(ngModel)]="returnNotes"
                placeholder="Optional notes about the return..."
                rows="3"
                class="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-sky focus:border-transparent">
              </textarea>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Items to Return -->
        <mat-card>
          <mat-card-header>
            <mat-card-title class="text-lg font-medium text-gray-800">
              Items to Return
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <!-- Loading State -->
            <div *ngIf="loading()" class="loading-state">
              <div class="loading-spinner">
                <mat-icon fontIcon="hourglass_empty" class="animate-spin text-2xl text-brand-sky"></mat-icon>
              </div>
              <p class="loading-text">Loading sale details...</p>
            </div>
            
            <!-- Items List -->
            <div class="items-list" *ngIf="!loading() && returnItems.length > 0">
              <div class="item-card" *ngFor="let item of returnItems; let i = index">
                <div class="item-header">
                  <h4 class="item-name">{{ item.productName }}</h4>
                  <div class="item-details">
                    <span class="item-price">KSh {{ item.unitPrice | number:'1.2-2' }} each</span>
                    <span class="item-sold">Sold: {{ item.quantitySold }}</span>
                    <span *ngIf="item.quantityAlreadyReturned > 0" class="item-returned">Already Returned: {{ item.quantityAlreadyReturned }}</span>
                  </div>
                </div>
                
                <div class="item-controls">
                  <div class="quantity-control">
                    <label class="control-label">Quantity to Return:</label>
                    <input 
                      type="number" 
                      [(ngModel)]="item.quantityReturned"
                      [max]="getAvailableQuantity(item)"
                      min="0"
                      class="quantity-input"
                      (change)="updateReturnTotals()">
                    <span class="max-quantity">(max: {{ getAvailableQuantity(item) }})</span>
                  </div>
                  
                  <div class="checkbox-control">
                    <mat-checkbox 
                      [(ngModel)]="item.restoreToInventory"
                      class="restore-checkbox">
                      Restore to Inventory
                    </mat-checkbox>
                  </div>
                  
                  <div class="notes-control">
                    <label class="control-label">Item Notes:</label>
                    <textarea 
                      [(ngModel)]="item.notes"
                      placeholder="Optional notes for this item"
                      rows="2"
                      class="item-notes">
                    </textarea>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- No Items Message -->
            <div *ngIf="!loading() && returnItems.length === 0" class="no-items-message">
              <mat-icon fontIcon="shopping_cart" class="no-items-icon"></mat-icon>
              <p class="no-items-text">No items found in this sale.</p>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Return Summary -->
        <mat-card *ngIf="!loading() && hasReturnItems()" class="mt-4">
          <mat-card-header>
            <mat-card-title class="text-lg font-medium text-gray-800">
              Return Summary
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="summary-row">
              <span class="summary-label">Total Items to Return:</span>
              <span class="summary-value">{{ getTotalReturnQuantity() }}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Total Refund Amount:</span>
              <span class="summary-value text-green-600 font-semibold">
                KSh {{ getTotalRefundAmount() | number:'1.2-2' }}
              </span>
            </div>
          </mat-card-content>
        </mat-card>
      </mat-dialog-content>

      <mat-dialog-actions align="end" class="dialog-actions">
        <button 
          mat-button 
          (click)="close()"
          [disabled]="processing()">
          Cancel
        </button>
        <button 
          mat-raised-button 
          color="primary"
          (click)="processReturn()" 
          [disabled]="!canProcessReturn()"
          class="process-btn">
          <mat-icon fontIcon="undo" class="mr-2"></mat-icon>
          Process Return
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .return-processing-dialog {
      max-width: 100%;
    }

    .dialog-header {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .dialog-content {
      max-height: 70vh;
      overflow-y: auto;
    }

    .form-group {
      margin-bottom: 1rem;
    }

    .items-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .item-card {
      border: 1px solid #e5e7eb;
      border-radius: 0.5rem;
      padding: 1rem;
      background-color: #f9fafb;
    }

    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1rem;
    }

    .item-name {
      font-size: 1rem;
      font-weight: 600;
      color: #374151;
      margin: 0;
    }

    .item-details {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.25rem;
    }

    .item-price {
      font-size: 0.875rem;
      color: #059669;
      font-weight: 500;
    }

    .item-sold {
      font-size: 0.75rem;
      color: #6b7280;
    }

    .item-returned {
      font-size: 0.75rem;
      color: #dc2626;
      font-weight: 500;
    }

    .item-controls {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .quantity-control {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .control-label {
      font-size: 0.875rem;
      font-weight: 500;
      color: #374151;
      min-width: 120px;
    }

    .quantity-input {
      width: 80px;
      padding: 0.5rem;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      text-align: center;
    }

    .max-quantity {
      font-size: 0.75rem;
      color: #6b7280;
    }

    .checkbox-control {
      display: flex;
      align-items: center;
    }

    .restore-checkbox {
      font-size: 0.875rem;
    }

    .notes-control {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .item-notes {
      width: 100%;
      padding: 0.5rem;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      resize: vertical;
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      gap: 1rem;
    }

    .loading-spinner {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .loading-text {
      color: #6b7280;
      font-size: 0.875rem;
    }

    .animate-spin {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .no-items-message {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      gap: 1rem;
    }

    .no-items-icon {
      font-size: 3rem;
      color: #9ca3af;
    }

    .no-items-text {
      color: #6b7280;
      font-size: 0.875rem;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 0;
      border-bottom: 1px solid #e5e7eb;
    }

    .summary-row:last-child {
      border-bottom: none;
    }

    .summary-label {
      font-size: 0.875rem;
      color: #374151;
    }

    .summary-value {
      font-size: 0.875rem;
      font-weight: 500;
      color: #111827;
    }

    .dialog-actions {
      padding: 1rem;
      border-top: 1px solid #e5e7eb;
      background-color: #f9fafb;
    }

    .process-btn {
      background-color: #3b82f6;
      color: white;
    }

    .process-btn:hover {
      background-color: #2563eb;
    }

    .process-btn:disabled {
      background-color: #9ca3af;
      cursor: not-allowed;
    }
  `]
})
export class ReturnProcessingDialogComponent implements OnInit {
  returnReason = '';
  returnNotes = '';
  returnItems: ReturnLineItem[] = [];
  processing = signal(false);
  loading = signal(false);

  constructor(
    public dialogRef: MatDialogRef<ReturnProcessingDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { sale: SaleDto },
    private salesService: SalesService,
    private errorService: ErrorService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadSaleDetails();
  }

  /**
   * Loads sale details and initializes return items
   */
  private loadSaleDetails(): void {
    console.log('=== LOADING SALE DETAILS ===');
    console.log('Initial sale data:', this.data.sale);
    console.log('Line items present:', this.data.sale.lineItems);
    console.log('Line items length:', this.data.sale.lineItems?.length);
    
    // Check if we have line items, if not load full sale details
    if (!this.data.sale.lineItems || this.data.sale.lineItems.length === 0) {
      console.log('No line items found, loading full sale details...');
      this.loading.set(true);
      this.salesService.getSaleById(this.data.sale.id).subscribe({
        next: (fullSale) => {
          console.log('=== FULL SALE DETAILS LOADED ===');
          console.log('Full sale data:', fullSale);
          console.log('Full sale line items:', fullSale.lineItems);
          console.log('Full sale line items length:', fullSale.lineItems?.length);
          this.data.sale = fullSale;
          this.loading.set(false);
          this.initializeReturnItems();
        },
        error: (error) => {
          console.error('Error loading sale details:', error);
          this.loading.set(false);
          this.errorService.show('Failed to load sale details. Please try again.');
          this.dialogRef.close();
        }
      });
    } else {
      console.log('Line items found, initializing return items...');
      this.initializeReturnItems();
    }
  }

  /**
   * Initializes return items from the sale
   */
  private initializeReturnItems(): void {
    console.log('=== INITIALIZING RETURN ITEMS ===');
    console.log('Sale data:', this.data.sale);
    console.log('Line items:', this.data.sale.lineItems);
    console.log('Line items length:', this.data.sale.lineItems?.length);
    
    if (!this.data.sale.lineItems || this.data.sale.lineItems.length === 0) {
      console.log('No line items found, setting empty array');
      this.returnItems = [];
      return;
    }
    
    console.log('Mapping line items to return items...');
    this.returnItems = this.data.sale.lineItems.map((item, index) => {
      console.log(`Mapping item ${index}:`, item);
      return {
        originalLineItemId: item.id,
        productName: item.productName,
        quantitySold: item.quantity,
        quantityReturned: 0,
        quantityAlreadyReturned: item.returnedQuantity || 0,
        unitPrice: item.unitPrice,
        restoreToInventory: true,
        notes: ''
      };
    });
    
    console.log('Final return items:', this.returnItems);
    console.log('Return items length:', this.returnItems.length);
  }

  /**
   * Updates return totals when quantities change
   */
  updateReturnTotals(): void {
    // This method is called when quantities change
    // The template will automatically update the totals
  }

  /**
   * Checks if there are any items to return
   */
  hasReturnItems(): boolean {
    return this.returnItems.some(item => item.quantityReturned > 0);
  }

  /**
   * Gets total quantity of items to return
   */
  getTotalReturnQuantity(): number {
    return this.returnItems.reduce((total, item) => total + item.quantityReturned, 0);
  }

  /**
   * Gets total refund amount
   */
  getTotalRefundAmount(): number {
    return this.returnItems.reduce((total, item) => 
      total + (item.quantityReturned * item.unitPrice), 0
    );
  }

  /**
   * Gets the available quantity for return (sold - already returned)
   */
  getAvailableQuantity(item: ReturnLineItem): number {
    return item.quantitySold - item.quantityAlreadyReturned;
  }

  /**
   * Checks if return can be processed
   */
  canProcessReturn(): boolean {
    return this.returnReason.trim() !== '' && 
           this.hasReturnItems() && 
           !this.processing();
  }

  /**
   * Processes the return
   */
  processReturn(): void {
    if (!this.canProcessReturn()) {
      return;
    }

    this.processing.set(true);

    // Create return line items
    const returnLineItems: CreateSaleReturnLineItemRequest[] = this.returnItems
      .filter(item => item.quantityReturned > 0)
      .map(item => ({
        originalSaleLineItemId: item.originalLineItemId,
        quantityReturned: item.quantityReturned,
        unitPrice: item.unitPrice,
        restoreToInventory: item.restoreToInventory,
        notes: item.notes || undefined
      }));

    // Create return request
    const returnRequest: CreateSaleReturnRequest = {
      originalSaleId: this.data.sale.id,
      returnReason: this.returnReason,
      returnLineItems: returnLineItems,
      notes: this.returnNotes || undefined
    };

    console.log('Processing return with request:', returnRequest);

    // Process the return
    this.salesService.createSaleReturn(returnRequest).subscribe({
      next: (returnResult) => {
        this.processing.set(false);
        this.snackBar.open(
          `Return processed successfully. Return #: ${returnResult.returnNumber}`, 
          'Close', 
          { duration: 5000 }
        );
        this.dialogRef.close('returned');
      },
      error: (error) => {
        this.processing.set(false);
        console.error('Error processing return:', error);
        
        // Handle specific error cases
        if (error.error?.detail) {
          this.errorService.show(`Return failed: ${error.error.detail}`);
        } else if (error.error?.message) {
          this.errorService.show(`Return failed: ${error.error.message}`);
        } else {
          this.errorService.show('Failed to process return. Please try again.');
        }
      }
    });
  }

  /**
   * Closes the dialog
   */
  close(): void {
    this.dialogRef.close();
  }
}
