import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';

import { SalesService, SaleDto, SearchSalesRequest, SaleStatus, PaymentMethod } from '../../../core/services/sales.service';
import { BranchContextService } from '../../../core/services/branch-context.service';
import { ErrorService } from '../../../core/services/error.service';
import { SaleDetailsDialogComponent } from './dialogs/sale-details-dialog.component';
import { PrintReceiptDialogComponent } from './dialogs/print-receipt-dialog.component';
import { ReturnProcessingDialogComponent } from './dialogs/return-processing-dialog.component';

/**
 * Sales List component for viewing and managing sales transactions.
 * Provides search, filtering, and pagination for sales history.
 * 
 * This component follows the UI Design Language Rule by:
 * - Using the approved color palette consistently
 * - Implementing proper table styling with brand colors
 * - Following the design system for buttons and inputs
 * - Ensuring accessibility with proper contrast and focus states
 */
@Component({
  selector: 'app-sales-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatInputModule,
    MatSelectModule,
    MatCardModule,
    MatTableModule,
    MatPaginatorModule,
    MatDialogModule
  ],
  templateUrl: './sales-list.component.html',
  styleUrl: './sales-list.component.scss'
})
export class SalesListComponent implements OnInit, OnDestroy {
  private readonly salesService = inject(SalesService);
  private readonly branchContext = inject(BranchContextService);
  private readonly errorService = inject(ErrorService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  // Component state
  readonly sales = signal<SaleDto[]>([]);
  readonly loading = signal(false);
  readonly totalElements = signal(0);
  readonly currentPage = signal(0);
  readonly pageSize = signal(20);
  
  // Search and filter state
  readonly searchQuery = signal('');
  readonly selectedStatus = signal<SaleStatus | ''>('');
  readonly selectedPaymentMethod = signal<PaymentMethod | ''>('');
  readonly startDate = signal('');
  readonly endDate = signal('');

  // Branch context state
  readonly currentBranchId = signal<string | null>(null);
  readonly isBranchValid = signal(false);

  // Search debouncing
  private searchTimeout: any;

  // Available options
  readonly saleStatuses = Object.values(SaleStatus);
  readonly paymentMethods = Object.values(PaymentMethod);

  // Table columns
  readonly displayedColumns = [
    'saleNumber',
    'customerName',
    'totalAmount',
    'status',
    'paymentMethod',
    'saleDate',
    'cashierName',
    'actions'
  ];

  ngOnInit(): void {
    // Subscribe to branch context changes
    this.branchContext.currentBranch$.subscribe(branch => {
      this.handleBranchChange(branch);
    });
  }

  ngOnDestroy(): void {
    // Clear search timeout to prevent memory leaks
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
  }

  /**
   * Handles branch context changes
   */
  private handleBranchChange(branch: any): void {
    console.log('Sales List: Branch context changed', branch);
    
    if (!branch) {
      // No branch selected - redirect to branch selection
      console.log('Sales List: No branch selected, redirecting to branch selection');
      this.currentBranchId.set(null);
      this.isBranchValid.set(false);
      this.clearAllData();
      this.router.navigate(['/branches']);
      return;
    }

    // Branch selected - validate and initialize
    console.log('Sales List: Branch selected', { id: branch.id, name: branch.name });
    this.currentBranchId.set(branch.id);
    this.isBranchValid.set(true);
    
    // Clear any existing data from previous branch
    this.clearAllData();
    
    // Load sales for the new branch
    this.loadSales();
  }

  /**
   * Clears all sales data when switching branches
   */
  private clearAllData(): void {
    // Clear sales data
    this.sales.set([]);
    this.totalElements.set(0);
    this.currentPage.set(0);
    
    // Clear search and filter data
    this.searchQuery.set('');
    this.selectedStatus.set('');
    this.selectedPaymentMethod.set('');
    this.startDate.set('');
    this.endDate.set('');
  }

  /**
   * Validates that a valid branch is selected
   */
  private validateBranchContext(): boolean {
    if (!this.isBranchValid() || !this.currentBranchId()) {
      console.warn('Sales List: Invalid branch context', {
        isBranchValid: this.isBranchValid(),
        currentBranchId: this.currentBranchId(),
        currentBranch: this.branchContext.currentBranch
      });
      this.errorService.show('No branch selected. Please select a branch to continue.');
      this.router.navigate(['/branches']);
      return false;
    }
    return true;
  }

  /**
   * Gets the current branch with validation
   */
  private getCurrentBranch(): any {
    if (!this.validateBranchContext()) {
      return null;
    }
    return this.branchContext.currentBranch;
  }

  /**
   * Loads sales with current search and filter criteria
   */
  loadSales(): void {
    const currentBranch = this.getCurrentBranch();
    if (!currentBranch) {
      return; // getCurrentBranch already handles the error and navigation
    }

    this.loading.set(true);
    
    const request: SearchSalesRequest = {
      saleNumber: this.searchQuery() || undefined,
      status: this.selectedStatus() || undefined,
      paymentMethod: this.selectedPaymentMethod() || undefined,
      startDate: this.startDate() || undefined,
      endDate: this.endDate() || undefined,
      branchId: currentBranch.id, // Include branch ID in the request
      page: this.currentPage(),
      size: this.pageSize(),
      sortBy: 'saleDate',
      sortDirection: 'DESC'
    };

    console.log('Sales List: Loading sales with request', {
      branchId: request.branchId,
      branchName: currentBranch.name,
      searchQuery: request.saleNumber,
      status: request.status,
      paymentMethod: request.paymentMethod,
      startDate: request.startDate,
      endDate: request.endDate,
      page: request.page,
      size: request.size
    });

    this.salesService.searchSales(request).subscribe({
      next: (response) => {
        console.log('Sales List: Sales loaded successfully', {
          salesCount: response.sales.length,
          totalElements: response.totalElements,
          branchId: request.branchId
        });
        this.sales.set(response.sales);
        this.totalElements.set(response.totalElements);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Sales List: Failed to load sales', error);
        this.errorService.show('Failed to load sales');
        this.loading.set(false);
      }
    });
  }

  /**
   * Handles search input changes with debouncing
   */
  onSearchChange(): void {
    if (!this.validateBranchContext()) return;
    
    // Validate search query
    const query = this.searchQuery().trim();
    if (query.length > 0 && query.length < 2) {
      // Don't search for queries less than 2 characters
      return;
    }
    
    // Clear existing timeout
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    
    // Set new timeout for debounced search
    this.searchTimeout = setTimeout(() => {
      console.log('Sales List: Search triggered', { query });
      this.currentPage.set(0);
      this.loadSales();
    }, 300); // 300ms debounce delay
  }

  /**
   * Handles filter changes
   */
  onFilterChange(): void {
    if (!this.validateBranchContext()) return;
    
    // Validate date range
    if (this.startDate() && this.endDate() && this.startDate() > this.endDate()) {
      this.errorService.show('Start date cannot be after end date');
      return;
    }
    
    console.log('Sales List: Filter changed', {
      status: this.selectedStatus(),
      paymentMethod: this.selectedPaymentMethod(),
      startDate: this.startDate(),
      endDate: this.endDate()
    });
    
    this.currentPage.set(0);
    this.loadSales();
  }

  /**
   * Handles pagination changes
   */
  onPageChange(event: PageEvent): void {
    if (!this.validateBranchContext()) return;
    this.currentPage.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.loadSales();
  }

  /**
   * Clears all filters and search
   */
  clearFilters(): void {
    if (!this.validateBranchContext()) return;
    
    console.log('Sales List: Clearing all filters');
    
    this.searchQuery.set('');
    this.selectedStatus.set('');
    this.selectedPaymentMethod.set('');
    this.startDate.set('');
    this.endDate.set('');
    this.currentPage.set(0);
    this.loadSales();
  }

  /**
   * Gets current filter state for debugging
   */
  getCurrentFilterState(): any {
    return {
      searchQuery: this.searchQuery(),
      selectedStatus: this.selectedStatus(),
      selectedPaymentMethod: this.selectedPaymentMethod(),
      startDate: this.startDate(),
      endDate: this.endDate(),
      currentPage: this.currentPage(),
      pageSize: this.pageSize(),
      branchId: this.currentBranchId(),
      isBranchValid: this.isBranchValid()
    };
  }

  /**
   * Debug method to log current filter state
   */
  debugFilterState(): void {
    console.log('Current Filter State:', this.getCurrentFilterState());
  }

  /**
   * Test method to verify filters and branch context functionality
   */
  testFiltersAndBranchContext(): void {
    console.log('=== Sales List Component Test ===');
    
    // Test 1: Branch Context
    console.log('1. Branch Context Test:');
    console.log('   - Is Branch Valid:', this.isBranchValid());
    console.log('   - Current Branch ID:', this.currentBranchId());
    console.log('   - Current Branch:', this.branchContext.currentBranch);
    
    // Test 2: Filter State
    console.log('2. Filter State Test:');
    const filterState = this.getCurrentFilterState();
    console.log('   - Search Query:', filterState.searchQuery);
    console.log('   - Selected Status:', filterState.selectedStatus);
    console.log('   - Selected Payment Method:', filterState.selectedPaymentMethod);
    console.log('   - Start Date:', filterState.startDate);
    console.log('   - End Date:', filterState.endDate);
    console.log('   - Current Page:', filterState.currentPage);
    console.log('   - Page Size:', filterState.pageSize);
    
    // Test 3: Sales Data
    console.log('3. Sales Data Test:');
    console.log('   - Sales Count:', this.sales().length);
    console.log('   - Total Elements:', this.totalElements());
    console.log('   - Loading State:', this.loading());
    
    // Test 4: Available Options
    console.log('4. Available Options Test:');
    console.log('   - Sale Statuses:', this.saleStatuses);
    console.log('   - Payment Methods:', this.paymentMethods);
    
    // Test 5: Branch Context Validation
    console.log('5. Branch Context Validation Test:');
    const isValid = this.validateBranchContext();
    console.log('   - Branch Context Valid:', isValid);
    
    // Test 6: API Request Test
    console.log('6. API Request Test:');
    const currentBranch = this.getCurrentBranch();
    if (currentBranch) {
      const testRequest = {
        saleNumber: this.searchQuery() || undefined,
        status: this.selectedStatus() || undefined,
        paymentMethod: this.selectedPaymentMethod() || undefined,
        startDate: this.startDate() || undefined,
        endDate: this.endDate() || undefined,
        branchId: currentBranch.id,
        page: this.currentPage(),
        size: this.pageSize(),
        sortBy: 'saleDate',
        sortDirection: 'DESC'
      };
      console.log('   - Test Request:', testRequest);
    } else {
      console.log('   - No valid branch context for API test');
    }
    
    console.log('=== End Test ===');
  }

  /**
   * Views sale details
   */
  viewSale(sale: SaleDto): void {
    if (!this.validateBranchContext()) return;
    
    // Validate that the sale belongs to the current branch
    const currentBranch = this.getCurrentBranch();
    if (currentBranch && sale.branchId !== currentBranch.id) {
      this.errorService.show('This sale belongs to a different branch');
      return;
    }
    
    // Open sale details dialog
    this.openSaleDetailsDialog(sale);
  }

  /**
   * Prints sale receipt
   */
  printReceipt(sale: SaleDto): void {
    if (!this.validateBranchContext()) return;
    
    // Validate that the sale belongs to the current branch
    const currentBranch = this.getCurrentBranch();
    if (currentBranch && sale.branchId !== currentBranch.id) {
      this.errorService.show('This sale belongs to a different branch');
      return;
    }
    
    // Open print dialog
    this.openPrintReceiptDialog(sale);
  }

  /**
   * Processes sale return
   */
  processReturn(sale: SaleDto): void {
    if (!this.validateBranchContext()) return;
    
    // Validate that the sale belongs to the current branch
    const currentBranch = this.getCurrentBranch();
    if (currentBranch && sale.branchId !== currentBranch.id) {
      this.errorService.show('This sale belongs to a different branch');
      return;
    }
    
    if (sale.status !== SaleStatus.COMPLETED) {
      this.errorService.show('Only completed sales can be returned');
      return;
    }
    
    // Open return processing dialog
    this.openReturnProcessingDialog(sale);
  }

  /**
   * Gets status badge class
   */
  getStatusBadgeClass(status: SaleStatus): string {
    switch (status) {
      case SaleStatus.COMPLETED:
        return 'bg-green-100 text-green-800';
      case SaleStatus.PENDING:
        return 'bg-yellow-100 text-yellow-800';
      case SaleStatus.CANCELLED:
        return 'bg-red-100 text-red-800';
      case SaleStatus.SUSPENDED:
        return 'bg-blue-100 text-blue-800';
      case SaleStatus.REFUNDED:
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  /**
   * Gets payment method icon
   */
  getPaymentMethodIcon(method: PaymentMethod): string {
    switch (method) {
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

  // ==================== Dialog Methods ====================

  /**
   * Opens sale details dialog
   */
  private openSaleDetailsDialog(sale: SaleDto): void {
    const dialogRef = this.dialog.open(SaleDetailsDialogComponent, {
      width: '800px',
      maxWidth: '90vw',
      data: { sale }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'refresh') {
        this.loadSales();
      } else if (result === 'print') {
        // Open print dialog from sale details
        this.openPrintReceiptDialog(sale);
      }
    });
  }

  /**
   * Opens print receipt dialog
   */
  private openPrintReceiptDialog(sale: SaleDto): void {
    const dialogRef = this.dialog.open(PrintReceiptDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      data: { sale }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'printed') {
        this.snackBar.open('Receipt printed successfully', 'Close', { duration: 3000 });
      }
    });
  }

  /**
   * Opens return processing dialog
   */
  private openReturnProcessingDialog(sale: SaleDto): void {
    console.log('=== OPENING RETURN PROCESSING DIALOG ===');
    console.log('Sale data being passed:', sale);
    console.log('Sale line items:', sale.lineItems);
    console.log('Sale line items length:', sale.lineItems?.length);
    
    const dialogRef = this.dialog.open(ReturnProcessingDialogComponent, {
      width: '800px',
      maxWidth: '90vw',
      data: { sale }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'returned') {
        this.snackBar.open('Return processed successfully', 'Close', { duration: 3000 });
        this.loadSales(); // Refresh the sales list
      }
    });
  }
}
