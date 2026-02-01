import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface MpesaConfiguration {
  id: string;
  tenantId: string;
  enabled: boolean;
  tierEnabled: boolean;
  defaultTillNumber: string | null;
  branchTillNumbers: BranchMpesaTill[];
  createdAt: string;
  updatedAt: string | null;
}

export interface BranchMpesaTill {
  id: string;
  branchId: string;
  branchName: string;
  tillNumber: string;
  createdAt: string;
  updatedAt: string | null;
}

export interface UpdateMpesaConfigRequest {
  enabled?: boolean;
  defaultTillNumber?: string;
  branchTillNumbers?: UpdateBranchTillRequest[];
}

export interface UpdateBranchTillRequest {
  branchId: string;
  tillNumber: string;
}

export interface InitiateMpesaPaymentRequest {
  saleId: string;
  phoneNumber: string;
  amount: number;
  branchId?: string;
}

export interface MpesaPaymentResponse {
  transactionId: string;
  checkoutRequestId: string;
  status: string;
  message: string;
}

export interface MpesaTransactionStatus {
  transactionId: string;
  status: string;
  mpesaReceiptNumber: string | null;
  completedAt: string | null;
  errorCode: string | null;
  errorMessage: string | null;
}

export interface MpesaTransaction {
  id: string;
  saleId: string;
  phoneNumber: string;
  amount: number;
  tillNumber: string;
  status: string;
  checkoutRequestId: string | null;
  mpesaReceiptNumber: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  requestedAt: string;
  completedAt: string | null;
  callbackReceived: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class MpesaService {

  constructor(private http: HttpClient) { }

  /**
   * Get M-Pesa configuration for current tenant
   */
  getMpesaConfiguration(): Observable<MpesaConfiguration> {
    return this.http.get<MpesaConfiguration>(
      `${environment.apiBaseUrl}/api/mpesa/config`
    );
  }

  /**
   * Update M-Pesa configuration for current tenant
   */
  updateMpesaConfiguration(config: UpdateMpesaConfigRequest): Observable<MpesaConfiguration> {
    return this.http.put<MpesaConfiguration>(
      `${environment.apiBaseUrl}/api/mpesa/config`,
      config
    );
  }

  /**
   * Initiate STK Push payment for a sale
   */
  initiateMpesaPayment(request: InitiateMpesaPaymentRequest): Observable<MpesaPaymentResponse> {
    return this.http.post<MpesaPaymentResponse>(
      `${environment.apiBaseUrl}/api/mpesa/initiate-payment`,
      request
    );
  }

  /**
   * Get transaction status
   */
  getTransactionStatus(transactionId: string): Observable<MpesaTransactionStatus> {
    return this.http.get<MpesaTransactionStatus>(
      `${environment.apiBaseUrl}/api/mpesa/transaction/${transactionId}`
    );
  }

  /**
   * Get transaction history
   */
  getTransactionHistory(limit: number = 50): Observable<MpesaTransaction[]> {
    return this.http.get<MpesaTransaction[]>(
      `${environment.apiBaseUrl}/api/mpesa/transactions?limit=${limit}`
    );
  }
}
