import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';

import { SalesService, SaleDto, SaleStatus, PaymentMethod } from '../../../../core/services/sales.service';

/**
 * Dialog component for displaying detailed sale information.
 * Shows complete transaction details including line items, payments, and customer information.
 */
@Component({
  selector: 'app-sale-details-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatDividerModule,
    MatChipsModule
  ],
  template: `
    <div class="sale-details-dialog">
      <!-- Header -->
      <div class="dialog-header">
        <h2 mat-dialog-title class="text-xl font-semibold text-gray-900">
          Sale Details - {{ data.sale.saleNumber }}
        </h2>
        <button mat-icon-button (click)="close()" class="close-btn">
          <mat-icon fontIcon="close"></mat-icon>
        </button>
      </div>

      <!-- Content -->
      <div mat-dialog-content class="dialog-content">
        <!-- Sale Information -->
        <div class="sale-info-section">
          <mat-card class="info-card">
            <mat-card-header>
              <mat-card-title class="text-lg font-medium text-gray-800">
                Transaction Information
              </mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">Sale Number:</span>
                  <span class="info-value font-medium">{{ data.sale.saleNumber }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Date:</span>
                  <span class="info-value">{{ formatDate(data.sale.saleDate) }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Status:</span>
                  <div class="status-container">
                    <mat-chip [ngClass]="getStatusBadgeClass(data.sale.status)">
                      {{ data.sale.status }}
                    </mat-chip>
                    <mat-chip *ngIf="data.sale.returnStatus === 'FULL'" class="returned-chip full-return">
                      <mat-icon fontIcon="undo" class="returned-icon"></mat-icon>
                      Fully Returned
                    </mat-chip>
                    <mat-chip *ngIf="data.sale.returnStatus === 'PARTIAL'" class="returned-chip partial-return">
                      <mat-icon fontIcon="undo" class="returned-icon"></mat-icon>
                      Partially Returned
                    </mat-chip>
                  </div>
                </div>
                <div class="info-item">
                  <span class="info-label">Cashier:</span>
                  <span class="info-value">{{ data.sale.cashierName }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Total Amount:</span>
                  <span class="info-value font-semibold text-lg">{{ formatCurrency(data.sale.totalAmount) }}</span>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Customer Information -->
        <div class="customer-section" *ngIf="data.sale.customerName || data.sale.customerPhone">
          <mat-card class="info-card">
            <mat-card-header>
              <mat-card-title class="text-lg font-medium text-gray-800">
                Customer Information
              </mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="info-grid">
                <div class="info-item" *ngIf="data.sale.customerName">
                  <span class="info-label">Name:</span>
                  <span class="info-value">{{ data.sale.customerName }}</span>
                </div>
                <div class="info-item" *ngIf="data.sale.customerPhone">
                  <span class="info-label">Phone:</span>
                  <span class="info-value">{{ data.sale.customerPhone }}</span>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Line Items -->
        <div class="line-items-section">
          <mat-card class="info-card">
            <mat-card-header>
              <mat-card-title class="text-lg font-medium text-gray-800">
                Items Sold ({{ data.sale.lineItems.length }})
              </mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="line-items-list">
                <div class="line-item" *ngFor="let item of data.sale.lineItems">
                  <div class="item-details">
                    <div class="item-name">{{ item.productName }}</div>
                    <div class="item-meta">
                      <span class="quantity">Qty: {{ item.quantity }}</span>
                      <span *ngIf="item.returnedQuantity > 0" class="returned-qty">Returned: {{ item.returnedQuantity }}</span>
                      <span class="unit-price">{{ formatCurrency(item.unitPrice) }} each</span>
                    </div>
                  </div>
                  <div class="item-total">
                    {{ formatCurrency(item.lineTotal) }}
                  </div>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Payment Information -->
        <div class="payments-section">
          <mat-card class="info-card">
            <mat-card-header>
              <mat-card-title class="text-lg font-medium text-gray-800">
                Payment Information
              </mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="payments-list">
                <div class="payment-item" *ngFor="let payment of data.sale.payments">
                  <div class="payment-method">
                    <mat-icon [fontIcon]="getPaymentMethodIcon(payment.paymentMethod)" class="payment-icon"></mat-icon>
                    <span>{{ payment.paymentMethod }}</span>
                  </div>
                  <div class="payment-amount">
                    {{ formatCurrency(payment.amount) }}
                  </div>
                </div>
              </div>
              <mat-divider class="my-4"></mat-divider>
              <div class="payment-total">
                <span class="total-label">Total Paid:</span>
                <span class="total-amount">{{ formatCurrency(data.sale.totalAmount) }}</span>
              </div>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Notes -->
        <div class="notes-section" *ngIf="data.sale.notes">
          <mat-card class="info-card">
            <mat-card-header>
              <mat-card-title class="text-lg font-medium text-gray-800">
                Notes
              </mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <p class="notes-text">{{ data.sale.notes }}</p>
            </mat-card-content>
          </mat-card>
        </div>
      </div>

      <!-- Actions -->
      <div mat-dialog-actions class="dialog-actions">
        <button mat-button (click)="close()" class="cancel-btn">
          Close
        </button>
        <button mat-raised-button color="primary" (click)="printReceipt()" class="print-btn">
          <mat-icon fontIcon="print" class="mr-2"></mat-icon>
          Print Receipt
        </button>
      </div>
    </div>
  `,
  styles: [`
    .sale-details-dialog {
      max-width: 100%;
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .close-btn {
      color: #6b7280;
    }

    .dialog-content {
      max-height: 70vh;
      overflow-y: auto;
      padding: 0;
    }

    .info-card {
      margin-bottom: 1rem;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .info-label {
      font-size: 0.875rem;
      color: #6b7280;
      font-weight: 500;
    }

    .info-value {
      color: #111827;
    }

    .line-items-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .line-item {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 0.75rem;
      background-color: #f9fafb;
      border-radius: 0.5rem;
    }

    .item-details {
      flex: 1;
    }

    .item-name {
      font-weight: 500;
      color: #111827;
      margin-bottom: 0.25rem;
    }

    .item-meta {
      display: flex;
      gap: 1rem;
      font-size: 0.875rem;
      color: #6b7280;
    }

    .returned-qty {
      color: #dc2626;
      font-weight: 500;
    }

    .item-total {
      font-weight: 600;
      color: #111827;
    }

    .payments-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .payment-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem;
      background-color: #f9fafb;
      border-radius: 0.5rem;
    }

    .payment-method {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .payment-icon {
      font-size: 1.25rem;
      color: #6b7280;
    }

    .payment-amount {
      font-weight: 600;
      color: #111827;
    }

    .payment-total {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 1.125rem;
      font-weight: 600;
    }

    .total-label {
      color: #6b7280;
    }

    .total-amount {
      color: #111827;
    }

    .notes-text {
      color: #6b7280;
      line-height: 1.5;
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1rem 0 0 0;
      margin: 0;
    }

    .cancel-btn {
      color: #6b7280;
    }

    .print-btn {
      background-color: #A1C7F8;
      color: white;
    }

    .print-btn:hover {
      background-color: #8bb5f0;
    }

    /* Status badge styles */
    .status-completed {
      background-color: #d1fae5;
      color: #065f46;
    }

    .status-pending {
      background-color: #fef3c7;
      color: #92400e;
    }

    .status-cancelled {
      background-color: #fee2e2;
      color: #991b1b;
    }

    .status-suspended {
      background-color: #e5e7eb;
      color: #374151;
    }

    .status-container {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .returned-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      
      &.full-return {
        background-color: #fecaca;
        color: #991b1b;
      }
      
      &.partial-return {
        background-color: #fed7aa;
        color: #9a3412;
      }
    }

    .returned-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }
  `]
})
export class SaleDetailsDialogComponent implements OnInit {
  constructor(
    public dialogRef: MatDialogRef<SaleDetailsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { sale: SaleDto },
    private salesService: SalesService
  ) {}

  ngOnInit(): void {
    // Load full sale details if needed
    if (!this.data.sale.lineItems || this.data.sale.lineItems.length === 0) {
      this.loadSaleDetails();
    }
  }

  /**
   * Loads full sale details from the API
   */
  private loadSaleDetails(): void {
    this.salesService.getSaleById(this.data.sale.id).subscribe({
      next: (sale) => {
        this.data.sale = sale;
      },
      error: (error) => {
        console.error('Error loading sale details:', error);
      }
    });
  }

  /**
   * Closes the dialog
   */
  close(): void {
    this.dialogRef.close();
  }

  /**
   * Opens print receipt dialog
   */
  printReceipt(): void {
    // Close this dialog and open print dialog
    this.dialogRef.close('print');
  }

  /**
   * Gets status badge class
   */
  getStatusBadgeClass(status: SaleStatus): string {
    switch (status) {
      case SaleStatus.COMPLETED:
        return 'status-completed';
      case SaleStatus.PENDING:
        return 'status-pending';
      case SaleStatus.CANCELLED:
        return 'status-cancelled';
      case SaleStatus.SUSPENDED:
        return 'status-suspended';
      default:
        return 'status-pending';
    }
  }

  /**
   * Gets payment method icon
   */
  getPaymentMethodIcon(paymentMethod: PaymentMethod): string {
    switch (paymentMethod) {
      case PaymentMethod.CASH:
        return 'payments';
      case PaymentMethod.CARD:
        return 'credit_card';
      case PaymentMethod.MPESA:
        return 'phone_android';
      case PaymentMethod.INSURANCE:
        return 'health_and_safety';
      case PaymentMethod.CREDIT:
        return 'account_balance';
      case PaymentMethod.CHEQUE:
        return 'description';
      default:
        return 'payment';
    }
  }

  /**
   * Formats date for display
   */
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Formats currency for display
   */
  formatCurrency(amount: number): string {
    return `KSh ${amount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}

