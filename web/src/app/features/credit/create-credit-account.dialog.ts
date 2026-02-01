import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { CreditService, CreateCreditAccountRequest, CreditStatus } from '../../core/services/credit.service';
import { SalesService } from '../../core/services/sales.service';

/**
 * Dialog component for creating new credit accounts.
 * Allows users to convert existing sales to credit accounts or create new credit transactions.
 */
@Component({
  selector: 'app-create-credit-account-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  template: `
    <div class="h-[min(92vh,800px)] overflow-y-auto">
      <div class="px-5 pt-5">
        <div class="h-1.5 w-16 rounded-full bg-gradient-to-r from-brand-sky to-brand-coral mb-4"></div>
        <h2 class="text-2xl font-semibold">Create Credit Account</h2>
        <p class="text-gray-600 mt-1 text-sm">Set up a new credit account for a customer</p>
      </div>

      <form #creditForm="ngForm" (ngSubmit)="onSubmit()" class="p-5 pt-3 space-y-6">
        <!-- Customer Selection -->
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <mat-icon class="text-brand-sky">person</mat-icon>
            Customer Information
          </h3>
          <div class="grid grid-cols-1 gap-4">
            <mat-form-field class="w-full">
              <mat-label>Customer *</mat-label>
              <mat-select [(ngModel)]="creditAccount.customerId" name="customerId" required>
                <mat-option *ngFor="let customer of customers" [value]="customer.id">
                  {{ customer.firstName }} {{ customer.lastName }} - {{ customer.phone || customer.email }}
                </mat-option>
              </mat-select>
              <mat-error *ngIf="creditForm.submitted && !creditAccount.customerId">
                Customer selection is required
              </mat-error>
            </mat-form-field>
            
            <!-- Display pre-selected customer name -->
            <div *ngIf="selectedCustomerName" class="mt-2 p-3 bg-brand-mint/10 border border-brand-mint/30 rounded-lg">
              <div class="flex items-center text-brand-mint">
                <mat-icon class="mr-2 text-sm">check_circle</mat-icon>
                <span class="text-sm font-medium">Pre-selected: {{ selectedCustomerName }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Sale Selection (Optional) -->
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <mat-icon class="text-brand-sky">receipt</mat-icon>
            Sale Information (Optional)
          </h3>
          <div class="grid grid-cols-1 gap-4">
            <mat-form-field class="w-full">
              <mat-label>Related Sale</mat-label>
              <mat-select [(ngModel)]="creditAccount.saleId" name="saleId">
                <mat-option value="">No specific sale</mat-option>
                <mat-option *ngFor="let sale of sales" [value]="sale.id">
                  {{ sale.saleNumber }} - {{ sale.customerName || 'Walk-in Customer' }} ({{ formatCurrency(sale.totalAmount) }})
                </mat-option>
              </mat-select>
              <mat-hint>Select a sale if this credit account is related to a specific transaction</mat-hint>
            </mat-form-field>
          </div>
        </div>

        <!-- Credit Details -->
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <mat-icon class="text-brand-sky">credit_card</mat-icon>
            Credit Details
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <mat-form-field class="w-full">
              <mat-label>Total Amount *</mat-label>
              <input 
                matInput 
                [(ngModel)]="creditAccount.totalAmount" 
                name="totalAmount"
                type="number"
                min="0.01"
                step="0.01"
                required
                placeholder="0.00" />
              <span matPrefix class="mr-2">KES</span>
              <mat-error *ngIf="creditForm.submitted && (!creditAccount.totalAmount || creditAccount.totalAmount <= 0)">
                Valid amount is required
              </mat-error>
            </mat-form-field>

            <mat-form-field class="w-full">
              <mat-label>Expected Payment Date *</mat-label>
              <input 
                matInput 
                [matDatepicker]="paymentDatePicker"
                [(ngModel)]="creditAccount.expectedPaymentDate"
                name="expectedPaymentDate"
                required
                readonly />
              <mat-datepicker-toggle matIconSuffix [for]="paymentDatePicker"></mat-datepicker-toggle>
              <mat-datepicker #paymentDatePicker></mat-datepicker>
              <mat-error *ngIf="creditForm.submitted && !creditAccount.expectedPaymentDate">
                Expected payment date is required
              </mat-error>
            </mat-form-field>
          </div>
        </div>

        <!-- Additional Information -->
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <mat-icon class="text-brand-sky">note</mat-icon>
            Additional Information
          </h3>
          <mat-form-field class="w-full">
            <mat-label>Notes</mat-label>
            <textarea 
              matInput 
              [(ngModel)]="creditAccount.notes" 
              name="notes"
              rows="3"
              placeholder="Additional notes about this credit account..."></textarea>
          </mat-form-field>
        </div>

        <!-- Form Actions -->
        <div class="flex justify-end gap-3 pt-4 border-t border-gray-200 mt-6">
          <button 
            mat-stroked-button 
            type="button" 
            (click)="onCancel()"
            class="!py-2.5">
            Cancel
          </button>
          <button 
            mat-raised-button 
            color="primary"
            type="submit"
            [disabled]="creditForm.invalid || submitting"
            class="!py-2.5">
            <mat-icon class="mr-2">add</mat-icon>
            Create Credit Account
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    
    .mat-form-field {
      width: 100%;
    }
  `]
})
export class CreateCreditAccountDialogComponent implements OnInit {
  creditAccount: CreateCreditAccountRequest = {
    customerId: '',
    saleId: '',
    totalAmount: 0,
    expectedPaymentDate: '',
    notes: ''
  };

  customers: any[] = [];
  sales: any[] = [];
  submitting = false;
  selectedCustomerName = '';

  constructor(
    public dialogRef: MatDialogRef<CreateCreditAccountDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private creditService: CreditService,
    private salesService: SalesService
  ) {}

  ngOnInit(): void {
    this.loadCustomers();
    this.loadRecentSales();
    
    // Set default payment date to 30 days from now
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 30);
    this.creditAccount.expectedPaymentDate = defaultDate.toISOString().split('T')[0];
    
    // Handle pre-selected customer from dialog data
    if (this.data?.customerId && this.data?.customerName) {
      this.creditAccount.customerId = this.data.customerId;
      this.selectedCustomerName = this.data.customerName;
    }
  }

  loadCustomers(): void {
    this.salesService.loadCustomers();
    this.salesService.customers$.subscribe({
      next: (customers) => {
        this.customers = customers || [];
      },
      error: (error) => {
        console.error('Error loading customers:', error);
        this.customers = [];
      }
    });
  }

  loadRecentSales(): void {
    // Load recent sales for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    this.salesService.searchSales({
      page: 0,
      size: 50,
      startDate: thirtyDaysAgo.toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      sortBy: 'saleDate',
      sortDirection: 'desc'
    }).subscribe({
      next: (response) => {
        this.sales = response.sales || [];
      },
      error: (error) => {
        console.error('Error loading sales:', error);
        this.sales = [];
      }
    });
  }

  onSubmit(): void {
    if (!this.creditAccount.customerId || 
        !this.creditAccount.totalAmount || 
        this.creditAccount.totalAmount <= 0 ||
        !this.creditAccount.expectedPaymentDate) {
      return;
    }

    this.submitting = true;

    // Convert date to proper format
    const formattedRequest: CreateCreditAccountRequest = {
      customerId: this.creditAccount.customerId,
      totalAmount: this.creditAccount.totalAmount,
      expectedPaymentDate: new Date(this.creditAccount.expectedPaymentDate).toISOString().split('T')[0],
      notes: this.creditAccount.notes,
      saleId: this.creditAccount.saleId || undefined
    };

    this.creditService.createCreditAccount(formattedRequest).subscribe({
      next: (createdAccount) => {
        this.submitting = false;
        this.dialogRef.close(createdAccount);
      },
      error: (error) => {
        this.submitting = false;
        console.error('Error creating credit account:', error);
        // You might want to show an error message to the user
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount);
  }
}
