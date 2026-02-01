import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Tenant {
  id: string;
  name: string;
  createdAt: string;
  updatedAt?: string;
}

export interface MpesaConfig {
  id: string;
  tenantId: string;
  enabled: boolean;
  tierEnabled: boolean;
  defaultTillNumber: string | null;
  branchTillNumbers: any[];
  createdAt: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {

  constructor(private http: HttpClient) { }

  /**
   * Get all tenants
   */
  getAllTenants(): Observable<any> {
    return this.http.get<any>(`${environment.apiBaseUrl}/admin/tenants`);
  }

  /**
   * Get tenant details
   */
  getTenantDetails(tenantId: string): Observable<any> {
    return this.http.get<any>(`${environment.apiBaseUrl}/admin/tenants/${tenantId}`);
  }

  /**
   * Get M-Pesa configuration for a tenant
   */
  getMpesaConfiguration(tenantId: string): Observable<any> {
    return this.http.get<any>(`${environment.apiBaseUrl}/admin/mpesa/config/${tenantId}`);
  }

  /**
   * Enable M-Pesa tier for a tenant
   */
  enableMpesaTier(tenantId: string): Observable<any> {
    return this.http.put<any>(`${environment.apiBaseUrl}/admin/mpesa/enable-tier/${tenantId}`, {});
  }

  /**
   * Disable M-Pesa tier for a tenant
   */
  disableMpesaTier(tenantId: string): Observable<any> {
    return this.http.put<any>(`${environment.apiBaseUrl}/admin/mpesa/disable-tier/${tenantId}`, {});
  }
}
