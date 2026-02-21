import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';

import { SalesService, SaleDto, SearchSalesRequest, SaleStatus, PaymentMethod, getPaymentMethodDisplayName } from '../../../core/services/sales.service';
import { SaleEditRequestService } from '../../../core/services/sale-edit-request.service';
import { BranchContextService } from '../../../core/services/branch-context.service';
import { BranchesService, BranchDto } from '../../../core/services/branches.service';
import { UsersService, UserManagementDto } from '../../../core/services/users.service';
import { DashboardService, DashboardStats } from '../../../core/services/dashboard.service';
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
    MatFormFieldModule,
    MatSelectModule,
    MatCardModule,
    MatTableModule,
    MatPaginatorModule,
    MatDialogModule,
    MatMenuModule,
    MatTooltipModule,
    MatExpansionModule,
    MatProgressSpinnerModule,
    MatDatepickerModule,
    MatNativeDateModule,
    RouterLink
  ],
  templateUrl: './sales-list.component.html',
  styleUrl: './sales-list.component.scss'
})
export class SalesListComponent implements OnInit, OnDestroy {
  private readonly salesService = inject(SalesService);
  private readonly branchContext = inject(BranchContextService);
  private readonly branchesService = inject(BranchesService);
  private readonly usersService = inject(UsersService);
  private readonly dashboardService = inject(DashboardService);
  private readonly errorService = inject(ErrorService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly saleEditRequestService = inject(SaleEditRequestService);

  private saleUpdatedSub: Subscription | null = null;

  // Component state
  readonly sales = signal<SaleDto[]>([]);
  readonly loading = signal(false);
  readonly totalElements = signal(0);
  readonly totalFilteredAmount = signal<number | null>(null);
  readonly currentPage = signal(0);
  readonly pageSize = signal(20);
  
  // Search and filter state
  readonly searchQuery = signal('');
  readonly selectedStatus = signal<SaleStatus | ''>('');
  readonly selectedPaymentMethod = signal<PaymentMethod | ''>('');
  readonly selectedBranch = signal<string | ''>('');
  readonly selectedUser = signal<string | ''>('');
  readonly startDate = signal<Date | null>(null);
  readonly endDate = signal<Date | null>(null);
  /** When set, only sales for this customer are shown (e.g. from "View Sales" on customers page). */
  readonly selectedCustomerId = signal<string | null>(null);
  readonly selectedCustomerName = signal<string | null>(null);

  // Branches and users for filter dropdowns
  readonly branches = signal<BranchDto[]>([]);
  readonly users = signal<UserManagementDto[]>([]);
  readonly isAdmin = (() => {
    try {
      const role = JSON.parse(localStorage.getItem('auth_user') || '{}')?.role;
      return role === 'ADMIN' || role === 'PLATFORM_ADMIN';
    } catch {
      return false;
    }
  })();

  /** CASHIER or MANAGER - show only their sales across all branches */
  readonly isCashierOrManager = (() => {
    try {
      const role = JSON.parse(localStorage.getItem('auth_user') || '{}')?.role;
      return role === 'CASHIER' || role === 'MANAGER';
    } catch {
      return false;
    }
  })();

  /** Current user ID for filtering own sales */
  readonly currentUserId = (() => {
    try {
      return JSON.parse(localStorage.getItem('auth_user') || '{}')?.id as string | undefined;
    } catch {
      return undefined;
    }
  })();

  // Branch context state
  readonly currentBranchId = signal<string | null>(null);
  readonly isBranchValid = signal(false);

  // Filter collapse state
  readonly filtersCollapsed = signal(true);

  // Summary stats for executives (branch-based)
  readonly summaryStats = signal<DashboardStats | null>(null);
  readonly summaryLoading = signal(false);

  // Search debouncing
  private searchTimeout: any;

  // Available options
  readonly saleStatuses = Object.values(SaleStatus);
  readonly paymentMethods = Object.values(PaymentMethod);

  // Table columns: show Commission for cashier/manager (own sales), Cashier for admin/others
  get displayedColumns(): string[] {
    const cols = [
      'saleNumber',
      'branchName',
      'customerName',
      'totalAmount',
      'status',
      'paymentMethod',
      'saleDate',
      this.isCashierOrManager ? 'commission' : 'cashierName',
      'actions'
    ];
    return cols;
  }

  ngOnInit(): void {
    // Apply customer filter from URL (e.g. "View Sales" from customers list)
    this.route.queryParams.subscribe((params) => {
      const customerId = params['customerId'] ?? null;
      const customerName = params['customerName'] ?? null;
      this.selectedCustomerId.set(customerId);
      this.selectedCustomerName.set(customerName);
    });

    // Load branches and users for filter dropdowns (if admin)
    if (this.isAdmin) {
      this.branchesService.loadBranches();
      this.branchesService.branches$.subscribe({
        next: (branches: BranchDto[] | null) => {
          if (branches) {
            this.branches.set(branches);
          }
        },
        error: (error: any) => {
          console.error('Failed to load branches:', error);
        }
      });
      this.usersService.loadUsers();
      this.usersService.users$.subscribe({
        next: (users: UserManagementDto[] | null) => {
          if (users) {
            this.users.set(users);
          }
        },
        error: (error: any) => {
          console.error('Failed to load users:', error);
        }
      });
    }
    
    // Subscribe to branch context changes
    this.branchContext.currentBranch$.subscribe(branch => {
      this.handleBranchChange(branch);
    });

    // Refresh sales list when an admin approves a sale edit (price/line) so totals and line items stay in sync
    this.saleUpdatedSub = this.saleEditRequestService.saleUpdated$.subscribe(() => this.loadSales());
  }

  ngOnDestroy(): void {
    this.saleUpdatedSub?.unsubscribe();
    // Clear search timeout to prevent memory leaks
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
  }

  /**
   * Handles branch context changes
   * CASHIER/MANAGER can load "my sales" even without branch (shows their sales across all branches)
   */
  private handleBranchChange(branch: any): void {
    console.log('Sales List: Branch context changed', branch);

    if (!branch) {
      this.currentBranchId.set(null);
      this.isBranchValid.set(this.isCashierOrManager); // Allow loading "my sales" without branch
      this.clearAllData();
      if (this.isCashierOrManager) {
        this.loadSales();
        this.loadSummaryStats();
      } else {
        setTimeout(() => {
          if (!this.branchContext.currentBranch) {
            this.router.navigate(['/branches']);
          }
        }, 400);
      }
      return;
    }

    this.currentBranchId.set(branch.id);
    this.isBranchValid.set(true);
    this.clearAllData();
    this.loadSales();
    this.loadSummaryStats();
  }

  /**
   * Gets the display name for the summary context.
   * For CASHIER/MANAGER: "Your Sales" (across all branches)
   */
  getSummaryBranchName(): string {
    if (this.isCashierOrManager) return 'Your Sales';
    if (this.isAdmin) {
      const branchFilter = this.selectedBranch();
      if (!branchFilter) return 'All Branches';
      return this.branches().find(b => b.id === branchFilter)?.name ?? 'Selected Branch';
    }
    return this.branchContext.currentBranch?.name ?? 'Current Branch';
  }

  /**
   * Gets the effective branch ID for API calls (summary, sales).
   * CASHIER/MANAGER "my sales" -> undefined (backend uses user-scoped stats).
   * Admin + "All Branches" -> undefined; Admin + specific branch -> branch id; Cashier -> current branch.
   */
  private getEffectiveBranchId(): string | undefined {
    if (this.isCashierOrManager) return undefined; // User-scoped stats
    if (this.isAdmin) {
      const branchFilter = this.selectedBranch();
      return branchFilter || undefined;
    }
    return this.getCurrentBranch()?.id;
  }

  /**
   * Loads sales summary stats (today, week, month, year) for the selected branch.
   * Used for executive overview on the sales page.
   */
  loadSummaryStats(): void {
    const branchId = this.getEffectiveBranchId();
    if (!this.isAdmin && !this.isCashierOrManager && !this.validateBranchContext()) return;

    this.summaryLoading.set(true);
    this.dashboardService.getDashboardStats(branchId, true).subscribe({
      next: (stats) => {
        this.summaryStats.set(stats);
        this.summaryLoading.set(false);
      },
      error: () => {
        this.summaryStats.set(null);
        this.summaryLoading.set(false);
      }
    });
  }

  /**
   * Clears all sales data when switching branches
   */
  private clearAllData(): void {
    // Clear sales data
    this.sales.set([]);
    this.totalElements.set(0);
    this.totalFilteredAmount.set(null);
    this.currentPage.set(0);
    this.summaryStats.set(null);

    // Clear search and filter data
    this.searchQuery.set('');
    this.selectedStatus.set('');
    this.selectedPaymentMethod.set('');
    this.selectedBranch.set('');
    this.selectedUser.set('');
    this.startDate.set(null);
    this.endDate.set(null);
  }

  /** Formats a Date for API (yyyy-MM-dd). */
  private formatDateForApi(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
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
   * CASHIER/MANAGER: passes cashierId to show their sales across all branches
   */
  loadSales(): void {
    let branchId: string | undefined;
    let cashierId: string | undefined;

    if (this.isCashierOrManager && this.currentUserId) {
      cashierId = this.currentUserId;
      branchId = undefined; // Get sales from all branches
      // No branch validation needed - we load "my sales"
    } else if (this.isAdmin) {
      const branchFilter = this.selectedBranch();
      branchId = branchFilter || undefined;
      const userFilter = this.selectedUser();
      cashierId = userFilter || undefined;
    } else {
      if (!this.validateBranchContext()) return;
      const currentBranch = this.getCurrentBranch();
      if (!currentBranch) return;
      branchId = currentBranch.id;
    }

    this.loading.set(true);

    const dateError = this.validateDateFilter();
    const startD = this.startDate();
    const endD = this.endDate();
    const useDateFilter = !dateError && startD && endD;

    const request: SearchSalesRequest = {
      saleNumber: this.searchQuery() || undefined,
      status: this.selectedStatus() || undefined,
      paymentMethod: this.selectedPaymentMethod() || undefined,
      startDate: useDateFilter && startD ? this.formatDateForApi(startD) : undefined,
      endDate: useDateFilter && endD ? this.formatDateForApi(endD) : undefined,
      branchId,
      cashierId,
      customerId: this.selectedCustomerId() ?? undefined,
      page: this.currentPage(),
      size: this.pageSize(),
      sortBy: 'saleDate',
      sortDirection: 'DESC'
    };

    // Get branch name for logging
    let branchName = 'N/A';
    if (this.isAdmin) {
      const branchFilter = this.selectedBranch();
      branchName = branchFilter
        ? (this.branches().find(b => b.id === branchFilter)?.name ?? 'N/A')
        : 'All Branches';
    } else {
      const currentBranch = this.getCurrentBranch();
      branchName = currentBranch?.name || 'N/A';
    }

    console.log('Sales List: Loading sales with request', {
      branchId: request.branchId,
      branchName: branchName,
      customerId: request.customerId,
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
        this.totalFilteredAmount.set(response.totalFilteredAmount ?? null);
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
   * Clears the customer filter (e.g. "Sales for: John") and reloads all sales.
   */
  clearCustomerFilter(): void {
    this.selectedCustomerId.set(null);
    this.selectedCustomerName.set(null);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { customerId: null, customerName: null },
      queryParamsHandling: 'merge'
    });
    this.currentPage.set(0);
    this.loadSales();
  }

  /**
   * Handles search input changes with debouncing
   */
  onSearchChange(): void {
    if (!this.isAdmin && !this.isCashierOrManager && !this.validateBranchContext()) return;
    
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
   * Validates date filter. Returns error only when both dates are set but invalid.
   * When not selected (one or both empty), returns null - date filter is not applied.
   */
  validateDateFilter(): string | null {
    const start = this.startDate();
    const end = this.endDate();
    if (!start || !end) return null; // No filter when not both selected
    if (start.getTime() > end.getTime()) return 'Start date cannot be after end date';
    const maxDays = 365;
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (days > maxDays) return `Date range cannot exceed ${maxDays} days`;
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (start > today || end > today) return 'Future dates are not allowed';
    return null;
  }

  /**
   * Handles filter changes
   */
  onFilterChange(): void {
    if (!this.isAdmin && !this.isCashierOrManager && !this.validateBranchContext()) return;

    const dateError = this.validateDateFilter();
    if (dateError) {
      this.errorService.show(dateError);
      return;
    }

    console.log('Sales List: Filter changed', {
      status: this.selectedStatus(),
      paymentMethod: this.selectedPaymentMethod(),
      startDate: this.startDate()?.toISOString(),
      endDate: this.endDate()?.toISOString()
    });
    
    this.currentPage.set(0);
    this.loadSales();
    this.loadSummaryStats();
  }

  /**
   * Handles pagination changes
   */
  onPageChange(event: PageEvent): void {
    if (!this.isAdmin && !this.isCashierOrManager && !this.validateBranchContext()) return;
    this.currentPage.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.loadSales();
  }

  /**
   * Clears all filters and search
   */
  clearFilters(): void {
    if (!this.isAdmin && !this.isCashierOrManager && !this.validateBranchContext()) return;
    
    console.log('Sales List: Clearing all filters');
    
    this.searchQuery.set('');
    this.selectedStatus.set('');
    this.selectedPaymentMethod.set('');
    this.selectedBranch.set('');
    this.selectedUser.set('');
    this.startDate.set(null);
    this.endDate.set(null);
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
      startDate: this.startDate()?.toISOString() ?? null,
      endDate: this.endDate()?.toISOString() ?? null,
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
      const startD = this.startDate();
      const endD = this.endDate();
      const testRequest = {
        saleNumber: this.searchQuery() || undefined,
        status: this.selectedStatus() || undefined,
        paymentMethod: this.selectedPaymentMethod() || undefined,
        startDate: startD ? this.formatDateForApi(startD) : undefined,
        endDate: endD ? this.formatDateForApi(endD) : undefined,
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
    if (!this.isAdmin && !this.isCashierOrManager && !this.validateBranchContext()) return;
    if (!this.isAdmin && !this.isCashierOrManager) {
      const currentBranch = this.getCurrentBranch();
      if (currentBranch && sale.branchId !== currentBranch.id) {
        this.errorService.show('This sale belongs to a different branch');
        return;
      }
    }
    this.openSaleDetailsDialog(sale);
  }

  /**
   * Prints sale receipt
   */
  printReceipt(sale: SaleDto): void {
    if (!this.isAdmin && !this.isCashierOrManager && !this.validateBranchContext()) return;
    if (!this.isAdmin && !this.isCashierOrManager) {
      const currentBranch = this.getCurrentBranch();
      if (currentBranch && sale.branchId !== currentBranch.id) {
        this.errorService.show('This sale belongs to a different branch');
        return;
      }
    }
    this.openPrintReceiptDialog(sale);
  }

  /**
   * Processes sale return
   */
  processReturn(sale: SaleDto): void {
    if (!this.isAdmin && !this.isCashierOrManager && !this.validateBranchContext()) return;
    if (!this.isAdmin && !this.isCashierOrManager) {
      const currentBranch = this.getCurrentBranch();
      if (currentBranch && sale.branchId !== currentBranch.id) {
        this.errorService.show('This sale belongs to a different branch');
        return;
      }
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
      case PaymentMethod.TILL:
      case PaymentMethod.FAMILY_BANK:
      case PaymentMethod.WATU_SIMU:
      case PaymentMethod.MOGO:
      case PaymentMethod.ONFON_N1:
      case PaymentMethod.ONFON_N2:
      case PaymentMethod.ONFON_GLEX:
        return 'phone_android';
      case PaymentMethod.CREDIT:
        return 'account_balance';
      default:
        return 'payment';
    }
  }

  getPaymentMethodDisplayName(method: PaymentMethod): string {
    return getPaymentMethodDisplayName(method);
  }

  /**
   * Max date for date filters (today) - prevents future dates
   */
  get maxDateForFilter(): Date {
    return new Date();
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
