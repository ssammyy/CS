import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Service for managing suppliers in the procurement system.
 * Handles CRUD operations, search, filtering, and supplier-related queries.
 * Implements caching for improved performance and reduced API calls.
 */
@Injectable({
  providedIn: 'root'
})
export class SuppliersService {
  private suppliersSubject = new BehaviorSubject<SupplierDto[]>([]);
  private lastLoadedAt = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor(private http: HttpClient) {}

  /**
   * Get suppliers observable with caching.
   */
  get suppliers$(): Observable<SupplierDto[]> {
    return this.suppliersSubject.asObservable();
  }

  /**
   * Load suppliers from API with cache validation.
   */
  loadSuppliers(forceRefresh = false): void {
    const now = Date.now();
    if (!forceRefresh && (now - this.lastLoadedAt) < this.CACHE_DURATION) {
      return; // Use cached data
    }

    this.http
      .get<SupplierListResponse>(`${environment.apiBaseUrl}/api/suppliers`)
      .subscribe({
        next: (response) => {
          this.suppliersSubject.next(response.suppliers);
          this.lastLoadedAt = now;
        },
        error: (error) => {
          console.error('Error loading suppliers:', error);
          // Keep previous cache if request fails
        }
      });
  }

  /**
   * Create a new supplier.
   */
  createSupplier(request: CreateSupplierRequest): Observable<SupplierDto> {
    return this.http.post<SupplierDto>(`${environment.apiBaseUrl}/api/suppliers`, request);
  }

  /**
   * Update an existing supplier.
   */
  updateSupplier(id: string, request: UpdateSupplierRequest): Observable<SupplierDto> {
    return this.http.put<SupplierDto>(`${environment.apiBaseUrl}/api/suppliers/${id}`, request);
  }

  /**
   * Delete a supplier (soft delete).
   */
  deleteSupplier(id: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiBaseUrl}/api/suppliers/${id}`);
  }

  /**
   * Get supplier by ID.
   */
  getSupplierById(id: string): Observable<SupplierDto> {
    return this.http.get<SupplierDto>(`${environment.apiBaseUrl}/api/suppliers/${id}`);
  }

  /**
   * Search suppliers by name, contact person, or email.
   */
  searchSuppliers(query: string): Observable<SupplierSearchResult> {
    return this.http.get<SupplierSearchResult>(`${environment.apiBaseUrl}/api/suppliers/search?query=${encodeURIComponent(query)}`);
  }

  /**
   * Get suppliers with pagination and filtering.
   */
  getSuppliersWithPagination(
    page = 0,
    size = 20,
    name?: string,
    category?: string,
    status?: string
  ): Observable<PaginatedSupplierResponse> {
    let url = `${environment.apiBaseUrl}/api/suppliers/paginated?page=${page}&size=${size}`;
    if (name) url += `&name=${encodeURIComponent(name)}`;
    if (category) url += `&category=${encodeURIComponent(category)}`;
    if (status) url += `&status=${encodeURIComponent(status)}`;
    
    return this.http.get<PaginatedSupplierResponse>(url);
  }

  /**
   * Get suppliers by category.
   */
  getSuppliersByCategory(category: string): Observable<SupplierDto[]> {
    return this.http.get<SupplierDto[]>(`${environment.apiBaseUrl}/api/suppliers/category/${category}`);
  }

  /**
   * Get suppliers by status.
   */
  getSuppliersByStatus(status: string): Observable<SupplierDto[]> {
    return this.http.get<SupplierDto[]>(`${environment.apiBaseUrl}/api/suppliers/status/${status}`);
  }

  /**
   * Get active suppliers only.
   */
  getActiveSuppliers(): Observable<SupplierDto[]> {
    return this.http.get<SupplierDto[]>(`${environment.apiBaseUrl}/api/suppliers/active`);
  }

  /**
   * Change supplier status.
   */
  changeSupplierStatus(id: string, status: string): Observable<SupplierDto> {
    return this.http.patch<SupplierDto>(`${environment.apiBaseUrl}/api/suppliers/${id}/status?status=${status}`, {});
  }

  /**
   * Get supplier summary statistics.
   */
  getSupplierSummary(): Observable<SupplierSummaryDto> {
    return this.http.get<SupplierSummaryDto>(`${environment.apiBaseUrl}/api/suppliers/summary`);
  }

  /**
   * Get available supplier categories.
   */
  getSupplierCategories(): Observable<SupplierCategoryDto[]> {
    return this.http.get<SupplierCategoryDto[]>(`${environment.apiBaseUrl}/api/suppliers/categories`);
  }

  /**
   * Get available supplier statuses.
   */
  getSupplierStatuses(): Observable<SupplierStatusDto[]> {
    return this.http.get<SupplierStatusDto[]>(`${environment.apiBaseUrl}/api/suppliers/statuses`);
  }

  /**
   * Refresh suppliers data (force refresh).
   */
  refreshSuppliers(): void {
    this.loadSuppliers(true);
  }

  /**
   * Clear suppliers cache.
   */
  clearCache(): void {
    this.lastLoadedAt = 0;
    this.suppliersSubject.next([]);
  }
}

// TypeScript interfaces matching the backend DTOs

export interface SupplierDto {
  id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  physicalAddress?: string;
  paymentTerms?: string;
  category: SupplierCategory;
  status: SupplierStatus;
  taxIdentificationNumber?: string;
  bankAccountDetails?: string;
  creditLimit?: number;
  notes?: string;
  tenantId: string;
  tenantName: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateSupplierRequest {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  physicalAddress?: string;
  paymentTerms?: string;
  category: SupplierCategory;
  status: SupplierStatus;
  taxIdentificationNumber?: string;
  bankAccountDetails?: string;
  creditLimit?: number;
  notes?: string;
}

export interface UpdateSupplierRequest {
  name?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  physicalAddress?: string;
  paymentTerms?: string;
  category?: SupplierCategory;
  status?: SupplierStatus;
  taxIdentificationNumber?: string;
  bankAccountDetails?: string;
  creditLimit?: number;
  notes?: string;
}

export interface SupplierListResponse {
  suppliers: SupplierDto[];
  totalCount: number;
  activeCount: number;
  inactiveCount: number;
  categoryBreakdown: Record<string, number>;
}

export interface SupplierSearchResult {
  suppliers: SupplierDto[];
  totalCount: number;
  searchQuery: string;
}

export interface SupplierSummaryDto {
  totalSuppliers: number;
  activeSuppliers: number;
  inactiveSuppliers: number;
  categoryBreakdown: Record<string, number>;
  statusBreakdown: Record<string, number>;
}

export interface SupplierCategoryDto {
  category: SupplierCategory;
  displayName: string;
  description: string;
  supplierCount: number;
}

export interface SupplierStatusDto {
  status: SupplierStatus;
  displayName: string;
  description: string;
  supplierCount: number;
}

export interface PaginatedSupplierResponse {
  content: SupplierDto[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  numberOfElements: number;
}

export enum SupplierCategory {
  WHOLESALER = 'WHOLESALER',
  MANUFACTURER = 'MANUFACTURER',
  DISTRIBUTOR = 'DISTRIBUTOR',
  IMPORTER = 'IMPORTER',
  SPECIALTY = 'SPECIALTY'
}

export enum SupplierStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  BLACKLISTED = 'BLACKLISTED'
}


