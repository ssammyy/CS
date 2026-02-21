import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

/**
 * Service for managing sales and Saam POS operations.
 * Handles sales transactions, customer management, and sales reporting.
 * 
 * This service follows the Frontend State Caching Rule by:
 * - Caching sales data in memory to avoid unnecessary API calls
 * - Providing cache invalidation after mutations
 * - Implementing cache refresh strategies
 * - Documenting caching logic and invalidation strategy
 */
@Injectable({
  providedIn: 'root'
})
export class SalesService {
  private salesSubject = new BehaviorSubject<SaleDto[]>([]);
  private customersSubject = new BehaviorSubject<CustomerDto[]>([]);
  private lastSalesLoadedAt = 0;
  private lastCustomersLoadedAt = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor(private http: HttpClient) {}

  // ==================== Sales Operations ====================

  /**
   * Get sales observable with caching.
   */
  get sales$(): Observable<SaleDto[]> {
    return this.salesSubject.asObservable();
  }

  /**
   * Load sales from API with cache validation.
   */
  loadSales(forceRefresh = false): void {
    const now = Date.now();
    if (!forceRefresh && (now - this.lastSalesLoadedAt) < this.CACHE_DURATION) {
      return; // Use cached data
    }

    this.http
      .get<SalesListResponse>(`${environment.apiBaseUrl}/api/sales`)
      .subscribe({
        next: (response) => {
          this.salesSubject.next(response.sales);
          this.lastSalesLoadedAt = now;
        },
        error: (error) => {
          console.error('Error loading sales:', error);
          // Keep previous cache if request fails
        }
      });
  }

  /**
   * Create a new sale transaction.
   */
  createSale(request: CreateSaleRequest): Observable<SaleDto> {
    return this.http.post<SaleDto>(`${environment.apiBaseUrl}/api/sales`, request)
      .pipe(
        // Invalidate cache after successful creation
        tap(() => this.refreshSales())
      );
  }

  /**
   * Get sale by ID.
   */
  getSaleById(id: string): Observable<SaleDto> {
    return this.http.get<SaleDto>(`${environment.apiBaseUrl}/api/sales/${id}`);
  }

  /**
   * Search sales with various criteria.
   */
  searchSales(request: SearchSalesRequest): Observable<SalesListResponse> {
    return this.http.post<SalesListResponse>(`${environment.apiBaseUrl}/api/sales/search`, request);
  }

  /**
   * Suspend a sale transaction.
   */
  suspendSale(request: SuspendSaleRequest): Observable<SaleDto> {
    return this.http.post<SaleDto>(`${environment.apiBaseUrl}/api/sales/suspend`, request)
      .pipe(
        tap(() => this.refreshSales())
      );
  }

  /**
   * Cancel a sale transaction.
   */
  cancelSale(request: CancelSaleRequest): Observable<SaleDto> {
    return this.http.post<SaleDto>(`${environment.apiBaseUrl}/api/sales/cancel`, request)
      .pipe(
        tap(() => this.refreshSales())
      );
  }

  /**
   * Scan barcode for product lookup.
   */
  scanBarcode(request: BarcodeScanRequest): Observable<BarcodeScanResponse> {
    return this.http.post<BarcodeScanResponse>(`${environment.apiBaseUrl}/api/sales/scan-barcode`, request);
  }

  /**
   * Get sales summary for dashboard.
   */
  getSalesSummary(startDate: string, endDate: string, branchId?: string): Observable<SaleSummaryDto> {
    let url = `${environment.apiBaseUrl}/api/sales/summary?startDate=${startDate}&endDate=${endDate}`;
    if (branchId) {
      url += `&branchId=${branchId}`;
    }
    return this.http.get<SaleSummaryDto>(url);
  }

  /**
   * Get today's sales summary.
   */
  getTodaySalesSummary(branchId?: string): Observable<SaleSummaryDto> {
    let url = `${environment.apiBaseUrl}/api/sales/summary/today`;
    if (branchId) {
      url += `?branchId=${branchId}`;
    }
    return this.http.get<SaleSummaryDto>(url);
  }

  // ==================== Customer Operations ====================

  /**
   * Get customers observable with caching.
   */
  get customers$(): Observable<CustomerDto[]> {
    return this.customersSubject.asObservable();
  }

  /**
   * Load customers from API with cache validation.
   */
  loadCustomers(forceRefresh = false): void {
    const now = Date.now();
    if (!forceRefresh && (now - this.lastCustomersLoadedAt) < this.CACHE_DURATION) {
      return; // Use cached data
    }

    this.http
      .get<CustomersListResponse>(`${environment.apiBaseUrl}/api/sales/customers`)
      .subscribe({
        next: (response) => {
          this.customersSubject.next(response.customers);
          this.lastCustomersLoadedAt = now;
        },
        error: (error) => {
          console.error('Error loading customers:', error);
          // Keep previous cache if request fails
        }
      });
  }

  /**
   * Create a new customer.
   */
  createCustomer(request: CreateCustomerRequest): Observable<CustomerDto> {
    return this.http.post<CustomerDto>(`${environment.apiBaseUrl}/api/sales/customers`, request)
      .pipe(
        tap(() => this.refreshCustomers())
      );
  }

  /**
   * Get customer by ID.
   */
  getCustomerById(id: string): Observable<CustomerDto> {
    return this.http.get<CustomerDto>(`${environment.apiBaseUrl}/api/sales/customers/${id}`);
  }

  /**
   * Update customer information.
   */
  updateCustomer(id: string, request: UpdateCustomerRequest): Observable<CustomerDto> {
    return this.http.put<CustomerDto>(`${environment.apiBaseUrl}/api/sales/customers/${id}`, request)
      .pipe(
        tap(() => this.refreshCustomers())
      );
  }

  /**
   * Search customers with various criteria.
   */
  searchCustomers(request: SearchCustomersRequest): Observable<CustomersListResponse> {
    return this.http.post<CustomersListResponse>(`${environment.apiBaseUrl}/api/sales/customers/search`, request);
  }

  // ==================== Sale Return Operations ====================

  /**
   * Create a new sale return.
   */
  createSaleReturn(request: CreateSaleReturnRequest): Observable<SaleReturnDto> {
    return this.http.post<SaleReturnDto>(`${environment.apiBaseUrl}/api/sales/returns`, request)
      .pipe(
        tap(() => this.refreshSales())
      );
  }

  /**
   * Get sale return by ID.
   */
  getSaleReturnById(id: string): Observable<SaleReturnDto> {
    return this.http.get<SaleReturnDto>(`${environment.apiBaseUrl}/api/sales/returns/${id}`);
  }

  /**
   * Search sale returns.
   */
  searchSaleReturns(request: SearchSalesRequest): Observable<SalesListResponse> {
    return this.http.post<SalesListResponse>(`${environment.apiBaseUrl}/api/sales/returns/search`, request);
  }

  // ==================== Reporting Operations ====================

  /**
   * Get top selling products.
   */
  getTopSellingProducts(startDate: string, endDate: string, branchId?: string, limit = 10): Observable<ProductSalesSummaryDto[]> {
    let url = `${environment.apiBaseUrl}/api/sales/reports/top-products?startDate=${startDate}&endDate=${endDate}&limit=${limit}`;
    if (branchId) {
      url += `&branchId=${branchId}`;
    }
    return this.http.get<ProductSalesSummaryDto[]>(url);
  }

  /**
   * Get sales by payment method.
   */
  getSalesByPaymentMethod(startDate: string, endDate: string, branchId?: string): Observable<Map<PaymentMethod, number>> {
    let url = `${environment.apiBaseUrl}/api/sales/reports/payment-methods?startDate=${startDate}&endDate=${endDate}`;
    if (branchId) {
      url += `&branchId=${branchId}`;
    }
    return this.http.get<Map<PaymentMethod, number>>(url);
  }

  /**
   * Get sales by hour.
   */
  getSalesByHour(startDate: string, endDate: string, branchId?: string): Observable<Map<number, number>> {
    let url = `${environment.apiBaseUrl}/api/sales/reports/sales-by-hour?startDate=${startDate}&endDate=${endDate}`;
    if (branchId) {
      url += `&branchId=${branchId}`;
    }
    return this.http.get<Map<number, number>>(url);
  }

  // ==================== Utility Operations ====================

  /**
   * Validate a sale before processing.
   */
  validateSale(request: CreateSaleRequest): Observable<{valid: boolean, message: string}> {
    return this.http.post<{valid: boolean, message: string}>(`${environment.apiBaseUrl}/api/sales/validate`, request);
  }

  /**
   * Get available payment methods.
   */
  getPaymentMethods(): Observable<PaymentMethod[]> {
    return this.http.get<PaymentMethod[]>(`${environment.apiBaseUrl}/api/sales/payment-methods`);
  }

  /**
   * Get sale statuses.
   */
  getSaleStatuses(): Observable<SaleStatus[]> {
    return this.http.get<SaleStatus[]>(`${environment.apiBaseUrl}/api/sales/statuses`);
  }

  // ==================== Cache Management ====================

  /**
   * Clear sales cache and force refresh.
   */
  refreshSales(): void {
    this.lastSalesLoadedAt = 0;
    this.loadSales(true);
  }

  /**
   * Clear customers cache and force refresh.
   */
  refreshCustomers(): void {
    this.lastCustomersLoadedAt = 0;
    this.loadCustomers(true);
  }

  /**
   * Clear all caches and force refresh.
   */
  refreshAll(): void {
    this.refreshSales();
    this.refreshCustomers();
  }
}

// ==================== Data Transfer Objects ====================

export interface SaleDto {
  id: string;
  saleNumber: string;
  branchId: string;
  branchName: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  subtotal: number;
  taxAmount?: number;
  discountAmount?: number;
  totalAmount: number;
  status: SaleStatus;
  notes?: string;
  cashierId: string;
  cashierName: string;
  saleDate: string;
  createdAt: string;
  returnStatus: 'NONE' | 'PARTIAL' | 'FULL';
  isCreditSale: boolean;
  lineItems: SaleLineItemDto[];
  payments: SalePaymentDto[];
  /** Cashier commission (15% of profit) for this sale; set when listing sales for the cashier's own view. */
  commission?: number | null;
}

export interface SaleLineItemDto {
  id: string;
  productId: string;
  productName: string;
  productBarcode?: string;
  inventoryId: string;
  quantity: number;
  returnedQuantity: number;
  unitPrice: number;
  discountPercentage?: number;
  discountAmount?: number;
  taxPercentage?: number;
  taxAmount?: number;
  lineTotal: number;
  batchNumber?: string;
  expiryDate?: string;
  notes?: string;
}

export interface SalePaymentDto {
  id: string;
  paymentMethod: PaymentMethod;
  amount: number;
  referenceNumber?: string;
  notes?: string;
  createdAt: string;
}

export interface CreateSaleRequest {
  branchId: string;
  lineItems: CreateSaleLineItemRequest[];
  payments: CreateSalePaymentRequest[];
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  taxAmount?: number;
  discountAmount?: number;
  notes?: string;
  isCreditSale?: boolean;
}

export interface CreateSaleLineItemRequest {
  productId: string;
  inventoryId: string;
  quantity: number;
  unitPrice: number;
  discountPercentage?: number;
  discountAmount?: number;
  taxPercentage?: number;
  taxAmount?: number;
  notes?: string;
}

export interface CreateSalePaymentRequest {
  paymentMethod: PaymentMethod;
  amount: number;
  referenceNumber?: string;
  notes?: string;
}

export interface CustomerDto {
  id: string;
  customerNumber: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  dateOfBirth?: string;
  address?: string;
  insuranceProvider?: string;
  insuranceNumber?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateCustomerRequest {
  firstName: string;
  /** Optional; omit or send empty string when not provided. */
  lastName?: string;
  phone?: string;
}

export interface UpdateCustomerRequest {
  firstName: string;
  lastName: string;
  phone?: string;
  isActive: boolean;
}

export interface SaleReturnDto {
  id: string;
  returnNumber: string;
  originalSaleId: string;
  originalSaleNumber: string;
  branchId: string;
  branchName: string;
  returnReason: string;
  totalRefundAmount: number;
  status: ReturnStatus;
  notes?: string;
  processedById: string;
  processedByName: string;
  returnDate: string;
  createdAt: string;
  returnLineItems: SaleReturnLineItemDto[];
}

export interface SaleReturnLineItemDto {
  id: string;
  originalSaleLineItemId: string;
  productId: string;
  productName: string;
  quantityReturned: number;
  unitPrice: number;
  refundAmount: number;
  restoreToInventory: boolean;
  notes?: string;
}

export interface CreateSaleReturnRequest {
  originalSaleId: string; // UUID as string
  returnReason: string;
  returnLineItems: CreateSaleReturnLineItemRequest[];
  notes?: string;
}

export interface CreateSaleReturnLineItemRequest {
  originalSaleLineItemId: string; // UUID as string
  quantityReturned: number;
  unitPrice: number;
  restoreToInventory: boolean;
  notes?: string;
}

export interface SearchSalesRequest {
  branchId?: string;
  customerId?: string;
  cashierId?: string;
  status?: SaleStatus;
  paymentMethod?: PaymentMethod;
  startDate?: string;
  endDate?: string;
  saleNumber?: string;
  customerName?: string;
  productId?: string;
  minAmount?: number;
  maxAmount?: number;
  page: number;
  size: number;
  sortBy: string;
  sortDirection: string;
}

export interface SearchCustomersRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  customerNumber?: string;
  isActive?: boolean;
  page: number;
  size: number;
  sortBy: string;
  sortDirection: string;
}

export interface SalesListResponse {
  sales: SaleDto[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  hasNext: boolean;
  hasPrevious: boolean;
  /** Sum of totalAmount for all sales matching the current filter (across all pages) */
  totalFilteredAmount?: number;
}

export interface CustomersListResponse {
  customers: CustomerDto[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface SaleSummaryDto {
  totalSales: number;
  totalAmount: number;
  totalTax: number;
  totalDiscount: number;
  averageSaleAmount: number;
  topSellingProducts: ProductSalesSummaryDto[];
  salesByPaymentMethod: Map<PaymentMethod, number>;
  salesByHour: Map<number, number>;
}

export interface ProductSalesSummaryDto {
  productId: string;
  productName: string;
  totalQuantitySold: number;
  totalRevenue: number;
  averagePrice: number;
}

export interface BarcodeScanRequest {
  barcode: string;
  branchId: string;
}

export interface BarcodeScanResponse {
  productId: string;
  productName: string;
  barcode: string;
  availableInventory: InventoryItemDto[];
  sellingPrice?: number;
  requiresPrescription: boolean;
}

export interface InventoryItemDto {
  inventoryId: string;
  batchNumber?: string;
  expiryDate?: string;
  quantity: number;
  unitCost?: number;
  sellingPrice?: number;
}

export interface SuspendSaleRequest {
  saleId: string;
  notes?: string;
}

export interface ResumeSaleRequest {
  saleId: string;
}

export interface CancelSaleRequest {
  saleId: string;
  reason: string;
}

export interface ApplyDiscountRequest {
  saleId: string;
  discountAmount: number;
  notes?: string;
}

// ==================== Enums ====================

export enum SaleStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  SUSPENDED = 'SUSPENDED',
  REFUNDED = 'REFUNDED'
}

export enum PaymentMethod {
  CASH = 'CASH',
  TILL = 'TILL',
  FAMILY_BANK = 'FAMILY_BANK',
  WATU_SIMU = 'WATU_SIMU',
  MOGO = 'MOGO',
  ONFON_N1 = 'ONFON_N1',
  ONFON_N2 = 'ONFON_N2',
  ONFON_GLEX = 'ONFON_GLEX',
  CREDIT = 'CREDIT'
}

/** Returns display name for payment method in filters and dropdowns */
export function getPaymentMethodDisplayName(method: PaymentMethod | string): string {
  const m = String(method);
  switch (m) {
    case 'CASH': return 'Cash';
    case 'TILL': return 'Till';
    case 'FAMILY_BANK': return 'Family Bank';
    case 'WATU_SIMU': return 'Watu simu';
    case 'MOGO': return 'Mogo';
    case 'ONFON_N1': return 'Onfon N1';
    case 'ONFON_N2': return 'Onfon N2';
    case 'ONFON_GLEX': return 'Onfon Glex';
    case 'CREDIT': return 'Credit';
    default: return m;
  }
}

export enum ReturnStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  PROCESSED = 'PROCESSED',
  REJECTED = 'REJECTED'
}
