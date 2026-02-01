import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface TenantTaxSettingsDto {
  id: string;
  tenantId: string;
  chargeVat: boolean;
  defaultVatRate: number;
  pricingMode: 'INCLUSIVE' | 'EXCLUSIVE';
  createdAt: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TaxSettingsService {
  constructor(private http: HttpClient) {}

  /**
   * Get tenant's tax settings
   */
  getTaxSettings(): Observable<TenantTaxSettingsDto> {
    return this.http.get<TenantTaxSettingsDto>(
      `${environment.apiBaseUrl}/api/tax-settings`
    );
  }

  /**
   * Update tenant's tax settings
   */
  updateTaxSettings(settings: Partial<TenantTaxSettingsDto>): Observable<TenantTaxSettingsDto> {
    return this.http.put<TenantTaxSettingsDto>(
      `${environment.apiBaseUrl}/api/tax-settings`,
      settings
    );
  }
}
