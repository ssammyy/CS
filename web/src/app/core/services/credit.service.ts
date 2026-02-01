import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Service for managing credit accounts and payments.
 * Handles API calls for credit sales, installment payments, and account management.
 */
@Injectable({
  providedIn: 'root'
})
export class CreditService {
  private readonly apiUrl = `${environment.apiBaseUrl}/api/v1/credit`;

  constructor(private http: HttpClient) {}

  /**
   * Create a new credit account from a sale
   */
  createCreditAccount(request: CreateCreditAccountRequest): Observable<CreditAccountDto> {
    return this.http.post<CreditAccountDto>(`${this.apiUrl}/accounts`, request);
  }

  /**
   * Make a payment against a credit account
   */
  makePayment(request: CreateCreditPaymentRequest): Observable<CreditPaymentDto> {
    return this.http.post<CreditPaymentDto>(`${this.apiUrl}/payments`, request);
  }

  /**
   * Get credit account details by ID
   */
  getCreditAccount(creditAccountId: string): Observable<CreditAccountDto> {
    return this.http.get<CreditAccountDto>(`${this.apiUrl}/accounts/${creditAccountId}`);
  }

  /**
   * Get credit accounts with filtering and pagination
   */
  getCreditAccounts(params: CreditAccountFilterParams = {}): Observable<CreditAccountsResponse> {
    let httpParams = new HttpParams();
    
    if (params.customerId) httpParams = httpParams.set('customerId', params.customerId);
    if (params.status) httpParams = httpParams.set('status', params.status);
    if (params.branchId) httpParams = httpParams.set('branchId', params.branchId);
    if (params.isOverdue !== undefined) httpParams = httpParams.set('isOverdue', params.isOverdue.toString());
    if (params.expectedPaymentDateFrom) httpParams = httpParams.set('expectedPaymentDateFrom', params.expectedPaymentDateFrom);
    if (params.expectedPaymentDateTo) httpParams = httpParams.set('expectedPaymentDateTo', params.expectedPaymentDateTo);
    if (params.page !== undefined) httpParams = httpParams.set('page', params.page.toString());
    if (params.size !== undefined) httpParams = httpParams.set('size', params.size.toString());

    return this.http.get<CreditAccountsResponse>(`${this.apiUrl}/accounts`, { params: httpParams });
  }

  /**
   * Update credit account status
   */
  updateCreditAccountStatus(creditAccountId: string, request: UpdateCreditAccountStatusRequest): Observable<CreditAccountDto> {
    return this.http.put<CreditAccountDto>(`${this.apiUrl}/accounts/${creditAccountId}/status`, request);
  }

  /**
   * Get credit dashboard statistics
   */
  getCreditDashboard(): Observable<CreditDashboardDto> {
    return this.http.get<CreditDashboardDto>(`${this.apiUrl}/dashboard`);
  }

  /**
   * Update overdue accounts status
   */
  updateOverdueAccounts(): Observable<{ message: string; updatedCount: number }> {
    return this.http.post<{ message: string; updatedCount: number }>(`${this.apiUrl}/admin/update-overdue`, {});
  }

  /**
   * Get credit accounts for a specific customer
   */
  getCustomerCreditAccounts(customerId: string): Observable<CreditAccountSummaryDto[]> {
    return this.http.get<CreditAccountSummaryDto[]>(`${this.apiUrl}/customers/${customerId}/accounts`);
  }

  /**
   * Get overdue credit accounts
   */
  getOverdueAccounts(page: number = 0, size: number = 20): Observable<CreditAccountsResponse> {
    return this.http.get<CreditAccountsResponse>(`${this.apiUrl}/accounts/overdue`, {
      params: new HttpParams().set('page', page.toString()).set('size', size.toString())
    });
  }
}

// Interfaces for TypeScript
export interface CreateCreditAccountRequest {
  saleId?: string;
  customerId: string;
  totalAmount: number;
  expectedPaymentDate: string;
  notes?: string;
  paidAmount?: number; // Amount paid upfront (partial payment)
  remainingAmount?: number; // Remaining balance after partial payment
}

export interface CreateCreditPaymentRequest {
  creditAccountId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  notes?: string;
}

export interface UpdateCreditAccountStatusRequest {
  status: CreditStatus;
  notes?: string;
}

export interface CreditAccountFilterParams {
  customerId?: string;
  status?: CreditStatus;
  branchId?: string;
  isOverdue?: boolean;
  expectedPaymentDateFrom?: string;
  expectedPaymentDateTo?: string;
  page?: number;
  size?: number;
}

export interface CreditAccountDto {
  id: string;
  creditNumber: string;
  customer: any; // CustomerDto
  sale: any; // SaleDto
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  expectedPaymentDate: string;
  status: CreditStatus;
  notes?: string;
  createdBy: any; // UserDto
  createdAt: string;
  updatedAt?: string;
  closedAt?: string;
  payments: CreditPaymentDto[];
}

export interface CreditPaymentDto {
  id: string;
  paymentNumber: string;
  creditAccountId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  notes?: string;
  receivedBy: any; // UserDto
  paymentDate: string;
  createdAt: string;
}

export interface CreditAccountSummaryDto {
  id: string;
  creditNumber: string;
  customerName: string;
  customerPhone?: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  expectedPaymentDate: string;
  status: CreditStatus;
  createdAt: string;
  isOverdue: boolean;
}

export interface CreditDashboardDto {
  totalActiveAccounts: number;
  totalOutstandingAmount: number;
  overdueAccounts: number;
  overdueAmount: number;
  recentPayments: CreditPaymentDto[];
}

export interface CreditAccountsResponse {
  content: CreditAccountSummaryDto[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export enum CreditStatus {
  ACTIVE = 'ACTIVE',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  CLOSED = 'CLOSED',
  SUSPENDED = 'SUSPENDED'
}

export enum PaymentMethod {
  CASH = 'CASH',
  MPESA = 'MPESA',
  CARD = 'CARD',
  INSURANCE = 'INSURANCE',
  CREDIT = 'CREDIT',
  CHEQUE = 'CHEQUE'
}
