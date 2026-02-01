import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

/**
 * VAT Report DTOs
 */
export interface VatClassificationDetailDto {
  classification: string;
  vatRate: number;
  totalSalesAmount: number;
  vatCollected: number;
  totalPurchasesAmount: number;
  vatPaid: number;
  netVat: number;
}

export interface SalesByTaxCategoryDto {
  classification: string;
  vatRate: number;
  numberOfTransactions: number;
  totalAmount: number;
  totalVat: number;
  amountIncludingVat: number;
}

export interface PurchasesByTaxCategoryDto {
  classification: string;
  vatRate: number;
  numberOfTransactions: number;
  totalAmount: number;
  totalVat: number;
  amountIncludingVat: number;
}

export interface VatReportDto {
  startDate: string;
  endDate: string;
  totalOutputVat: number;
  totalInputVat: number;
  netVatPayable: number;
  totalSalesExcludingVat: number;
  totalSalesIncludingVat: number;
  totalPurchasesExcludingVat: number;
  totalPurchasesIncludingVat: number;
  vatByClassification: VatClassificationDetailDto[];
  salesByTaxCategory: SalesByTaxCategoryDto[];
  purchasesByTaxCategory: PurchasesByTaxCategoryDto[];
}

@Injectable({
  providedIn: 'root'
})
export class VatReportService {
  constructor(private http: HttpClient) {}

  /**
   * Get VAT report for a date range
   */
  getVatReport(
    startDate: string,
    endDate: string,
    branchId?: string
  ): Observable<VatReportDto> {
    let url = `${environment.apiBaseUrl}/api/reports/vat?startDate=${startDate}&endDate=${endDate}`;
    if (branchId) {
      url += `&branchId=${branchId}`;
    }
    return this.http.get<VatReportDto>(url);
  }
}
