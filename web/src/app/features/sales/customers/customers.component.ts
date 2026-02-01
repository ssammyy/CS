import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';

import { SalesService, CustomerDto, SearchCustomersRequest, CreateCustomerRequest, UpdateCustomerRequest } from '../../../core/services/sales.service';
import { CreditService } from '../../../core/services/credit.service';
import { ErrorService } from '../../../core/services/error.service';

/**
 * Customers component for managing customer information.
 * Provides CRUD operations for customer data and search functionality.
 * 
 * This component follows the UI Design Language Rule by:
 * - Using the approved color palette consistently
 * - Implementing proper form styling with brand colors
 * - Following the design system for buttons and inputs
 * - Ensuring accessibility with proper contrast and focus states
 */
@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatInputModule,
    MatCardModule,
    MatTableModule,
    MatPaginatorModule,
    MatDialogModule
  ],
  templateUrl: './customers.component.html',
  styleUrl: './customers.component.scss'
})
export class CustomersComponent implements OnInit {
  private readonly salesService = inject(SalesService);
  private readonly creditService = inject(CreditService);
  private readonly errorService = inject(ErrorService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  // Component state
  readonly customers = signal<CustomerDto[]>([]);
  readonly loading = signal(false);
  readonly totalElements = signal(0);
  readonly currentPage = signal(0);
  readonly pageSize = signal(20);
  
  // Search state
  readonly searchQuery = signal('');
  readonly showCreateForm = signal(false);
  readonly editingCustomer = signal<CustomerDto | null>(null);

  // Form state
  customerForm = {
    firstName: '',
    lastName: '',
    phone: ''
  };

  // Table columns
  readonly displayedColumns = [
    'customerNumber',
    'name',
    'phone',
    'email',
    'insuranceProvider',
    'isActive',
    'createdAt',
    'actions'
  ];

  ngOnInit(): void {
    this.loadCustomers();
  }

  /**
   * Loads customers with current search criteria
   */
  loadCustomers(): void {
    this.loading.set(true);
    
    // Send search term in a single field instead of duplicating across all fields
    const searchTerm = this.searchQuery() || undefined;
    const request: SearchCustomersRequest = {
      firstName: searchTerm,
      lastName: undefined,
      phone: undefined,
      email: undefined,
      page: this.currentPage(),
      size: this.pageSize(),
      sortBy: 'createdAt',
      sortDirection: 'DESC'
    };

    this.salesService.searchCustomers(request).subscribe({
      next: (response) => {
        this.customers.set(response.customers);
        this.totalElements.set(response.totalElements);
        this.loading.set(false);
      },
      error: () => {
        this.errorService.show('Failed to load customers');
        this.loading.set(false);
      }
    });
  }

  /**
   * Handles search input changes
   */
  onSearchChange(): void {
    this.currentPage.set(0);
    this.loadCustomers();
  }

  /**
   * Handles pagination changes
   */
  onPageChange(event: PageEvent): void {
    this.currentPage.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.loadCustomers();
  }

  /**
   * Shows the create customer form
   */
  showCreateCustomerForm(): void {
    this.resetForm();
    this.showCreateForm.set(true);
    this.editingCustomer.set(null);
  }

  /**
   * Shows the edit customer form
   */
  showEditCustomerForm(customer: CustomerDto): void {
    this.customerForm = {
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone || ''
    };
    this.showCreateForm.set(true);
    this.editingCustomer.set(customer);
  }

  /**
   * Creates a credit account for the selected customer
   */
  createCreditAccount(customer: CustomerDto): void {
    // Navigate to credit management page with the customer pre-selected
    this.router.navigate(['/credit-management'], { 
      queryParams: { 
        customerId: customer.id,
        customerName: `${customer.firstName} ${customer.lastName}`
      } 
    });
  }

  /**
   * Hides the customer form
   */
  hideCustomerForm(): void {
    this.showCreateForm.set(false);
    this.editingCustomer.set(null);
    this.resetForm();
  }

  /**
   * Creates a new customer
   */
  async createCustomer(): Promise<void> {
    if (!this.validateForm()) return;

    const request: CreateCustomerRequest = {
      firstName: this.customerForm.firstName,
      lastName: this.customerForm.lastName,
      phone: this.customerForm.phone || undefined
    };

    try {
      await this.salesService.createCustomer(request).toPromise();
      this.snackBar.open('Customer created successfully!', 'Close', { duration: 3000 });
      this.hideCustomerForm();
      this.loadCustomers();
    } catch {
      this.errorService.show('Failed to create customer');
    }
  }

  /**
   * Updates an existing customer
   */
  async updateCustomer(): Promise<void> {
    if (!this.validateForm() || !this.editingCustomer()) return;

    const request: UpdateCustomerRequest = {
      firstName: this.customerForm.firstName,
      lastName: this.customerForm.lastName,
      phone: this.customerForm.phone || undefined,
      isActive: this.editingCustomer()!.isActive
    };

    try {
      await this.salesService.updateCustomer(this.editingCustomer()!.id, request).toPromise();
      this.snackBar.open('Customer updated successfully!', 'Close', { duration: 3000 });
      this.hideCustomerForm();
      this.loadCustomers();
    } catch {
      this.errorService.show('Failed to update customer');
    }
  }

  /**
   * Validates the customer form
   */
  private validateForm(): boolean {
    const form = this.customerForm;
    
    if (!form.firstName.trim()) {
      this.errorService.show('First name is required');
      return false;
    }
    
    if (!form.lastName.trim()) {
      this.errorService.show('Last name is required');
      return false;
    }
    
    return true;
  }


  /**
   * Resets the customer form
   */
  private resetForm(): void {
    this.customerForm = {
      firstName: '',
      lastName: '',
      phone: ''
    };
  }

  /**
   * Gets the full name of a customer
   */
  getCustomerFullName(customer: CustomerDto): string {
    return `${customer.firstName} ${customer.lastName}`;
  }

  /**
   * Formats date for display
   */
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  /**
   * Gets status badge class
   */
  getStatusBadgeClass(isActive: boolean): string {
    return isActive 
      ? 'bg-green-100 text-green-800' 
      : 'bg-red-100 text-red-800';
  }

  /**
   * Views customer sales
   */
  viewCustomerSales(customerId: string): void {
    this.router.navigate(['/sales'], { queryParams: { customerId } });
  }
}
