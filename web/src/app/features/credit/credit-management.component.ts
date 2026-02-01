import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { CreditService, CreditAccountSummaryDto, CreditStatus, PaymentMethod } from '../../core/services/credit.service';
import { CreateCreditAccountDialogComponent } from './create-credit-account.dialog';

/**
 * Component for managing credit accounts and payments.
 * Provides interface for viewing credit accounts, making payments, and tracking outstanding balances.
 */
@Component({
  selector: 'app-credit-management',
  templateUrl: './credit-management.component.html',
  styleUrls: ['./credit-management.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule,
    MatIconModule,
    MatDialogModule
  ]
})
export class CreditManagementComponent implements OnInit {
  creditAccounts: CreditAccountSummaryDto[] = [];
  selectedAccount: CreditAccountSummaryDto | null = null;
  loading = false;
  errorMessage = '';

  // Forms
  paymentForm: FormGroup;
  statusForm: FormGroup;

  // Filters
  statusFilter: CreditStatus | undefined = undefined;
  showOverdueOnly = false;

  // Pagination
  currentPage = 0;
  pageSize = 20;
  totalElements = 0;

  // Enums for template
  CreditStatus = CreditStatus;
  PaymentMethod = PaymentMethod;

  constructor(
    private creditService: CreditService,
    private fb: FormBuilder,
    private dialog: MatDialog,
    private route: ActivatedRoute
  ) {
    this.paymentForm = this.fb.group({
      amount: ['', [Validators.required]],
      paymentMethod: [''],
      referenceNumber: [''],
      notes: ['']
    });

    this.statusForm = this.fb.group({
      status: ['', Validators.required],
      notes: ['']
    });
  }

  ngOnInit(): void {
    this.loadCreditAccounts();

    // Check for pre-selected customer from query parameters
    this.route.queryParams.subscribe(params => {
      if (params['customerId'] && params['customerName']) {
        // Automatically open create credit account dialog with pre-selected customer
        setTimeout(() => {
          this.openCreateCreditAccountDialog(params['customerId'], params['customerName']);
        }, 100); // Small delay to ensure component is fully initialized
      }
    });
  }

  /**
   * Load credit accounts with current filters
   */
  loadCreditAccounts(): void {
    this.loading = true;
    this.errorMessage = '';

    const params = {
      status: this.statusFilter,
      isOverdue: this.showOverdueOnly,
      page: this.currentPage,
      size: this.pageSize
    };

    this.creditService.getCreditAccounts(params).subscribe({
      next: (response) => {
        this.creditAccounts = response.content;
        this.totalElements = response.totalElements;
        this.loading = false;
      },
      error: (error) => {
        this.errorMessage = 'Failed to load credit accounts';
        this.loading = false;
        console.error('Error loading credit accounts:', error);
      }
    });
  }

  /**
   * Filter credit accounts by status
   */
  filterByStatus(status: CreditStatus | undefined): void {
    this.statusFilter = status;
    this.currentPage = 0;
    this.loadCreditAccounts();
  }

  /**
   * Toggle overdue filter
   */
  toggleOverdueFilter(): void {
    this.showOverdueOnly = !this.showOverdueOnly;
    this.currentPage = 0;
    this.loadCreditAccounts();
  }

  /**
   * Select a credit account for detailed view
   */
  selectAccount(account: CreditAccountSummaryDto): void {
    this.selectedAccount = account;
    this.resetForms();
  }

  /**
   * Make a payment against selected credit account
   */
  makePayment(): void {
    if (!this.selectedAccount || !this.paymentForm.valid) {
      return;
    }

    const paymentData = {
      creditAccountId: this.selectedAccount.id,
      amount: this.paymentForm.value.amount,
      paymentMethod: this.paymentForm.value.paymentMethod,
      referenceNumber: this.paymentForm.value.referenceNumber || undefined,
      notes: this.paymentForm.value.notes || undefined
    };

    this.loading = true;
    this.creditService.makePayment(paymentData).subscribe({
      next: () => {
        this.loadCreditAccounts();
        this.resetForms();
        this.selectedAccount = null;
        this.loading = false;
      },
      error: (error) => {
        this.errorMessage = 'Failed to process payment';
        this.loading = false;
        console.error('Error making payment:', error);
      }
    });
  }

  /**
   * Update credit account status
   */
  updateStatus(): void {
    if (!this.selectedAccount || !this.statusForm.valid) {
      return;
    }

    const statusData = {
      status: this.statusForm.value.status,
      notes: this.statusForm.value.notes || undefined
    };

    this.loading = true;
    this.creditService.updateCreditAccountStatus(this.selectedAccount.id, statusData).subscribe({
      next: () => {
        this.loadCreditAccounts();
        this.resetForms();
        this.selectedAccount = null;
        this.loading = false;
      },
      error: (error) => {
        this.errorMessage = 'Failed to update status';
        this.loading = false;
        console.error('Error updating status:', error);
      }
    });
  }

  /**
   * Reset forms
   */
  resetForms(): void {
    this.paymentForm.reset();
    this.statusForm.reset();
  }

  /**
   * Get status badge class
   */
  getStatusBadgeClass(status: CreditStatus): string {
    switch (status) {
      case CreditStatus.ACTIVE:
        return 'badge-success';
      case CreditStatus.PAID:
        return 'badge-primary';
      case CreditStatus.OVERDUE:
        return 'badge-danger';
      case CreditStatus.CLOSED:
        return 'badge-secondary';
      case CreditStatus.SUSPENDED:
        return 'badge-warning';
      default:
        return 'badge-secondary';
    }
  }

  /**
   * Get payment method display name
   */
  getPaymentMethodDisplay(method: PaymentMethod): string {
    switch (method) {
      case PaymentMethod.CASH:
        return 'Cash';
      case PaymentMethod.MPESA:
        return 'M-Pesa';
      case PaymentMethod.CARD:
        return 'Card';
      case PaymentMethod.INSURANCE:
        return 'Insurance';
      case PaymentMethod.CREDIT:
        return 'Credit';
      case PaymentMethod.CHEQUE:
        return 'Cheque';
      default:
        return method;
    }
  }

  /**
   * Format currency
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount);
  }

  /**
   * Format date
   */
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  /**
   * Check if payment amount is valid
   */
  isPaymentAmountValid(): boolean {
    console.log('Checking payment amount validity... ', this.selectedAccount);
    if (!this.selectedAccount) return false;
    const amount = this.paymentForm.value.amount;
    return amount > 0 && amount <= this.selectedAccount.remainingAmount;
  }

  /**
   * Calculate progress percentage
   */
  getPaymentProgress(account: CreditAccountSummaryDto): number {
    return (account.paidAmount / account.totalAmount) * 100;
  }

  /**
   * Open create credit account dialog
   */
  openCreateCreditAccountDialog(customerId?: string, customerName?: string): void {
    const dialogData: any = {};

    // If customer is pre-selected, pass the data to the dialog
    if (customerId && customerName) {
      dialogData.customerId = customerId;
      dialogData.customerName = customerName;
    }

    const dialogRef = this.dialog.open(CreateCreditAccountDialogComponent, {
      width: '600px',
      maxHeight: '90vh',
      disableClose: false,
      data: dialogData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Refresh the credit accounts list after creating a new account
        this.loadCreditAccounts();
      }
    });
  }
}
