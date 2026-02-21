import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';

import { SalesService, SaleDto, getPaymentMethodDisplayName } from '../../../../core/services/sales.service';

/**
 * Dialog component for printing sale receipts.
 * Provides a formatted receipt view and print functionality.
 */
@Component({
  selector: 'app-print-receipt-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatDividerModule
  ],
  template: `
    <div class="print-receipt-dialog">
      <!-- Header -->
      <div class="dialog-header">
        <h2 mat-dialog-title class="text-xl font-semibold text-gray-900">
          Print Receipt - {{ data.sale.saleNumber }}
        </h2>
        <button mat-icon-button (click)="close()" class="close-btn">
          <mat-icon fontIcon="close"></mat-icon>
        </button>
      </div>

      <!-- Content -->
      <div mat-dialog-content class="dialog-content">
        <!-- Receipt Preview -->
        <div class="receipt-preview" id="receipt-content">
          <div class="receipt-header">
            <h1 class="company-name">
              <span style="color: #F99E98; font-weight: bold;">s</span>
              <span style="color: #A1C7F8; font-weight: bold;">a</span>
              <span style="color: #CBEBD0; font-weight: bold;">a</span>
              <span style="color: #F99E98; font-weight: bold;">m</span>
              <span style="color: #111827; font-weight: bold;"> POS</span>
            </h1>
            <p class="branch-info">{{ getBranchName() }}</p>
            <p class="receipt-info">
              Receipt #: {{ data.sale.saleNumber }}<br>
              Date: {{ formatDate(data.sale.saleDate) }}<br>
              Cashier: {{ data.sale.cashierName }}
            </p>
          </div>

          <mat-divider class="receipt-divider"></mat-divider>

          <!-- Customer Info -->
          <div class="customer-section" *ngIf="data.sale.customerName || data.sale.customerPhone">
            <h3 class="section-title">Customer</h3>
            <p class="customer-info">
              <span *ngIf="data.sale.customerName">{{ data.sale.customerName }}</span>
              <span *ngIf="data.sale.customerPhone"><br>{{ data.sale.customerPhone }}</span>
            </p>
          </div>

          <!-- Items -->
          <div class="items-section">
            <h3 class="section-title">Items</h3>
            <div class="items-list">
              <div class="item-row" *ngFor="let item of data.sale.lineItems">
                <div class="item-details">
                  <div class="item-name">{{ item.productName }}</div>
                  <div class="item-meta">
                    {{ item.quantity }} × {{ formatCurrency(item.unitPrice) }}
                  </div>
                </div>
                <div class="item-total">
                  {{ formatCurrency(item.lineTotal) }}
                </div>
              </div>
            </div>
          </div>

          <mat-divider class="receipt-divider"></mat-divider>

          <!-- Totals -->
          <div class="totals-section">
            <div class="total-row">
              <span class="total-label">Subtotal:</span>
              <span class="total-value">{{ formatCurrency(data.sale.totalAmount) }}</span>
            </div>
            <div class="total-row">
              <span class="total-label">Total:</span>
              <span class="total-value total-amount">{{ formatCurrency(data.sale.totalAmount) }}</span>
            </div>
          </div>

          <mat-divider class="receipt-divider"></mat-divider>

          <!-- Payment -->
          <div class="payment-section">
            <h3 class="section-title">Payment</h3>
            <div class="payment-list">
              <div class="payment-row" *ngFor="let payment of data.sale.payments">
                <span class="payment-method">{{ getPaymentMethodDisplayName(payment.paymentMethod) }}</span>
                <span class="payment-amount">{{ formatCurrency(payment.amount) }}</span>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="receipt-footer">
            <p class="thank-you">Thank you for your business!</p>
            <p class="footer-info">
              For inquiries, contact us at:<br>
              Phone: +254 700 000 000<br>
              Email: info&#64;saampos.com
            </p>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div mat-dialog-actions class="dialog-actions">
        <button mat-button (click)="close()" class="cancel-btn">
          Cancel
        </button>
        <button mat-raised-button color="primary" (click)="printReceipt()" class="print-btn">
          <mat-icon fontIcon="print" class="mr-2"></mat-icon>
          Print Receipt
        </button>
      </div>
    </div>
  `,
  styles: [`
    .print-receipt-dialog {
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

    .receipt-preview {
      background: white;
      padding: 2rem;
      border: 1px solid #e5e7eb;
      border-radius: 0.5rem;
      font-family: 'Courier New', monospace;
      max-width: 400px;
      margin: 0 auto;
    }

    .receipt-header {
      text-align: center;
      margin-bottom: 1rem;
    }

    .company-name {
      font-size: 1.5rem;
      font-weight: bold;
      color: #111827;
      margin: 0 0 0.5rem 0;
    }

    .branch-info {
      font-size: 1rem;
      color: #6b7280;
      margin: 0 0 1rem 0;
    }

    .receipt-info {
      font-size: 0.875rem;
      color: #6b7280;
      line-height: 1.4;
      margin: 0;
    }

    .receipt-divider {
      margin: 1rem 0;
    }

    .section-title {
      font-size: 1rem;
      font-weight: bold;
      color: #111827;
      margin: 0 0 0.5rem 0;
    }

    .customer-section {
      margin-bottom: 1rem;
    }

    .customer-info {
      font-size: 0.875rem;
      color: #6b7280;
      margin: 0;
    }

    .items-section {
      margin-bottom: 1rem;
    }

    .items-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .item-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .item-details {
      flex: 1;
    }

    .item-name {
      font-weight: 500;
      color: #111827;
      font-size: 0.875rem;
    }

    .item-meta {
      font-size: 0.75rem;
      color: #6b7280;
    }

    .item-total {
      font-weight: 600;
      color: #111827;
      font-size: 0.875rem;
    }

    .totals-section {
      margin-bottom: 1rem;
    }

    .total-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.25rem;
    }

    .total-label {
      color: #6b7280;
      font-size: 0.875rem;
    }

    .total-value {
      color: #111827;
      font-size: 0.875rem;
    }

    .total-amount {
      font-weight: bold;
      font-size: 1rem;
    }

    .payment-section {
      margin-bottom: 1rem;
    }

    .payment-list {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .payment-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .payment-method {
      color: #6b7280;
      font-size: 0.875rem;
    }

    .payment-amount {
      color: #111827;
      font-weight: 600;
      font-size: 0.875rem;
    }

    .receipt-footer {
      text-align: center;
      margin-top: 1rem;
    }

    .thank-you {
      font-weight: bold;
      color: #111827;
      margin: 0 0 0.5rem 0;
    }

    .footer-info {
      font-size: 0.75rem;
      color: #6b7280;
      line-height: 1.4;
      margin: 0;
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

    /* Print styles */
    @media print {
      .print-receipt-dialog {
        margin: 0;
        padding: 0;
      }

      .dialog-header,
      .dialog-actions {
        display: none !important;
      }

      .dialog-content {
        max-height: none !important;
        overflow: visible !important;
        padding: 0 !important;
      }

      .receipt-preview {
        border: none !important;
        box-shadow: none !important;
        margin: 0 !important;
        padding: 1rem !important;
        max-width: none !important;
      }
    }
  `]
})
export class PrintReceiptDialogComponent implements OnInit {
  constructor(
    public dialogRef: MatDialogRef<PrintReceiptDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { sale: SaleDto },
    private salesService: SalesService
  ) {}

  ngOnInit(): void {
    // Load full sale details if line items are missing
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
        console.error('Failed to load sale details for receipt:', error);
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
   * Prints the receipt
   */
  printReceipt(): void {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      console.error('Could not open print window');
      return;
    }

    // Get the receipt content
    const receiptContent = document.getElementById('receipt-content');
    if (!receiptContent) {
      console.error('Receipt content not found');
      return;
    }

    // Create the print HTML
    const printHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${this.data.sale.saleNumber}</title>
          <style>
            body {
              font-family: 'Courier New', monospace;
              margin: 0;
              padding: 1rem;
              background: white;
            }
            .receipt-preview {
              max-width: 400px;
              margin: 0 auto;
            }
            ${this.getPrintStyles()}
          </style>
        </head>
        <body>
          ${receiptContent.innerHTML}
        </body>
      </html>
    `;

    // Write content to print window
    printWindow.document.write(printHTML);
    printWindow.document.close();

    // Wait for content to load, then print
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };

    // Close dialog and show success message
    this.dialogRef.close('printed');
  }

  /**
   * Gets print-specific styles
   */
  private getPrintStyles(): string {
    return `
      .receipt-header { text-align: center; margin-bottom: 1rem; }
      .company-name { font-size: 1.5rem; font-weight: bold; color: #111827; margin: 0 0 0.5rem 0; }
      .branch-info { font-size: 1rem; color: #6b7280; margin: 0 0 1rem 0; }
      .receipt-info { font-size: 0.875rem; color: #6b7280; line-height: 1.4; margin: 0; }
      .receipt-divider { margin: 1rem 0; border-top: 1px solid #e5e7eb; }
      .section-title { font-size: 1rem; font-weight: bold; color: #111827; margin: 0 0 0.5rem 0; }
      .customer-section { margin-bottom: 1rem; }
      .customer-info { font-size: 0.875rem; color: #6b7280; margin: 0; }
      .items-section { margin-bottom: 1rem; }
      .items-list { display: flex; flex-direction: column; gap: 0.5rem; }
      .item-row { display: flex; justify-content: space-between; align-items: flex-start; }
      .item-details { flex: 1; }
      .item-name { font-weight: 500; color: #111827; font-size: 0.875rem; }
      .item-meta { font-size: 0.75rem; color: #6b7280; }
      .item-total { font-weight: 600; color: #111827; font-size: 0.875rem; }
      .totals-section { margin-bottom: 1rem; }
      .total-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem; }
      .total-label { color: #6b7280; font-size: 0.875rem; }
      .total-value { color: #111827; font-size: 0.875rem; }
      .total-amount { font-weight: bold; font-size: 1rem; }
      .payment-section { margin-bottom: 1rem; }
      .payment-list { display: flex; flex-direction: column; gap: 0.25rem; }
      .payment-row { display: flex; justify-content: space-between; align-items: center; }
      .payment-method { color: #6b7280; font-size: 0.875rem; }
      .payment-amount { color: #111827; font-weight: 600; font-size: 0.875rem; }
      .receipt-footer { text-align: center; margin-top: 1rem; }
      .thank-you { font-weight: bold; color: #111827; margin: 0 0 0.5rem 0; }
      .footer-info { font-size: 0.75rem; color: #6b7280; line-height: 1.4; margin: 0; }
    `;
  }

  /**
   * Gets branch name (placeholder - would need to be injected)
   */
  getBranchName(): string {
    // This would typically come from the branch context service
    return 'Main Branch';
  }

  readonly getPaymentMethodDisplayName = getPaymentMethodDisplayName;

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
