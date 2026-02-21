import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Service for managing products in the inventory system.
 * Handles CRUD operations, search, and inventory-related queries.
 */
@Injectable({
  providedIn: 'root'
})
export class ProductsService {
  private productsSubject = new BehaviorSubject<ProductDto[]>([]);
  private lastLoadedAt = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor(private http: HttpClient) {}

  /**
   * Get products observable with caching.
   */
  get products$(): Observable<ProductDto[]> {
    return this.productsSubject.asObservable();
  }

  /**
   * Load products from API with cache validation.
   */
  loadProducts(forceRefresh = false): void {
    const now = Date.now();
    if (!forceRefresh && (now - this.lastLoadedAt) < this.CACHE_DURATION) {
      return; // Use cached data
    }

    this.http
      .get<ProductListResponse>(`${environment.apiBaseUrl}/api/products`)
      .subscribe({
        next: (response) => {
          this.productsSubject.next(response.products);
          this.lastLoadedAt = now;
        },
        error: (error) => {
          console.error('Error loading products:', error);
          // Keep previous cache if request fails
        }
      });
  }

  /**
   * Create a new product.
   */
  createProduct(request: CreateProductRequest): Observable<ProductDto> {
    return this.http.post<ProductDto>(`${environment.apiBaseUrl}/api/products`, request);
  }

  /**
   * Update an existing product.
   */
  updateProduct(id: string, request: UpdateProductRequest): Observable<ProductDto> {
    return this.http.put<ProductDto>(`${environment.apiBaseUrl}/api/products/${id}`, request);
  }

  /**
   * Delete a product (soft delete).
   */
  deleteProduct(id: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiBaseUrl}/api/products/${id}`);
  }

  /**
   * Get product by ID.
   */
  getProductById(id: string): Observable<ProductDto> {
    return this.http.get<ProductDto>(`${environment.apiBaseUrl}/api/products/${id}`);
  }

  /**
   * Search products by name or generic name.
   */
  searchProducts(query: string): Observable<ProductSearchResult> {
    return this.http.get<ProductSearchResult>(`${environment.apiBaseUrl}/api/products/search?query=${encodeURIComponent(query)}`);
  }

  /**
   * Get products that require prescription.
   */
  getPrescriptionRequiredProducts(): Observable<ProductDto[]> {
    return this.http.get<ProductDto[]>(`${environment.apiBaseUrl}/api/products/prescription-required`);
  }

  /**
   * Get low stock products.
   */
  getLowStockProducts(): Observable<ProductDto[]> {
    return this.http.get<ProductDto[]>(`${environment.apiBaseUrl}/api/products/low-stock`);
  }

  /**
   * Get products expiring within specified days.
   */
  getExpiringProducts(days = 30): Observable<ProductDto[]> {
    return this.http.get<ProductDto[]>(`${environment.apiBaseUrl}/api/products/expiring?days=${days}`);
  }

  /**
   * Get product statistics.
   */
  getProductStats(): Observable<ProductStats> {
    return this.http.get<ProductStats>(`${environment.apiBaseUrl}/api/products/stats`);
  }

  /**
   * Clear cache and force refresh.
   */
  refreshProducts(): void {
    this.lastLoadedAt = 0;
    this.loadProducts(true);
  }
}

/**
 * Product Data Transfer Objects
 */
export interface ProductDto {
  id: string;
  name: string;
  genericName?: string;
  description?: string;
  strength?: string;
  dosageForm?: string;
  manufacturer?: string;
  barcode?: string;
  isActive: boolean;
  requiresPrescription: boolean;
  storageConditions?: string;
  minStockLevel: number;
  maxStockLevel?: number;
  /** Unit cost (cost price) at product level. */
  unitCost?: number | null;
  /** Selling price at product level. */
  sellingPrice?: number | null;
  tenantId: string;
  tenantName: string;
  totalQuantity: number;
  lowStockAlert: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateProductRequest {
  name: string;
  genericName?: string;
  description?: string;
  strength?: string;
  dosageForm?: string;
  manufacturer?: string;
  barcode?: string;
  requiresPrescription: boolean;
  storageConditions?: string;
  minStockLevel: number;
  maxStockLevel?: number;
  unitCost?: number | null;
  sellingPrice?: number | null;
}

export interface UpdateProductRequest {
  name?: string;
  genericName?: string;
  description?: string;
  strength?: string;
  dosageForm?: string;
  manufacturer?: string;
  barcode?: string;
  requiresPrescription?: boolean;
  storageConditions?: string;
  minStockLevel?: number;
  maxStockLevel?: number;
  unitCost?: number | null;
  sellingPrice?: number | null;
  isActive?: boolean;
}

export interface ProductListResponse {
  products: ProductDto[];
  totalCount: number;
  lowStockCount: number;
  expiringCount: number;
}

export interface ProductSearchResult {
  products: ProductDto[];
  totalCount: number;
  searchQuery: string;
}

export interface ProductStats {
  totalProducts: number;
  lowStockCount: number;
  expiringCount: number;
  prescriptionRequiredCount: number;
}
