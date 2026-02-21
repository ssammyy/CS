import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

/**
 * Service for managing inventory in the system.
 * Handles stock operations, transfers, adjustments, and alerts.
 */
@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  private inventorySubject = new BehaviorSubject<InventoryDto[]>([]);
  private lastLoadedAt = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor(private http: HttpClient) {}

  /**
   * Get inventory observable with caching.
   */
  get inventory$(): Observable<InventoryDto[]> {
    return this.inventorySubject.asObservable();
  }

  /**
   * Load inventory from API with cache validation.
   * @param forceRefresh Force refresh cache
   * @param branchId Optional branch ID to filter (undefined = all branches)
   */
  loadInventory(forceRefresh = false, branchId?: string): void {
    const now = Date.now();
    if (!forceRefresh && (now - this.lastLoadedAt) < this.CACHE_DURATION) {
      return; // Use cached data
    }

    let url = `${environment.apiBaseUrl}/api/inventory`;
    if (branchId) {
      url += `?branchId=${branchId}`;
    }

    this.http
      .get<InventoryListResponse>(url)
      .subscribe({
        next: (response) => {
          this.inventorySubject.next(response.inventory);
          this.lastLoadedAt = now;
        },
        error: (error) => {
          console.error('Error loading inventory:', error);
          // Keep previous cache if request fails
        }
      });
  }

  /**
   * Create new inventory for a product at a specific branch.
   */
  createInventory(request: CreateInventoryRequest): Observable<InventoryDto> {
    return this.http.post<InventoryDto>(`${environment.apiBaseUrl}/api/inventory`, request);
  }

  /**
   * Update existing inventory.
   */
  updateInventory(id: string, request: UpdateInventoryRequest): Observable<InventoryDto> {
    return this.http.put<InventoryDto>(`${environment.apiBaseUrl}/api/inventory/${id}`, request);
  }

  /**
   * Delete inventory (soft delete).
   */
  deleteInventory(id: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiBaseUrl}/api/inventory/${id}`);
  }

  /**
   * Adjust inventory quantity (adds or removes stock).
   */
  adjustInventory(request: InventoryAdjustmentRequest): Observable<InventoryDto> {
    return this.http.post<InventoryDto>(`${environment.apiBaseUrl}/api/inventory/adjust`, request);
  }

  /**
   * Transfer inventory between branches.
   */
  transferInventory(request: InventoryTransferRequest): Observable<InventoryDto> {
    return this.http.post<InventoryDto>(`${environment.apiBaseUrl}/api/inventory/transfer`, request);
  }

  /**
   * Get inventory for a specific branch.
   */
  getInventoryByBranch(branchId: string): Observable<InventoryDto[]> {
    return this.http.get<InventoryDto[]>(`${environment.apiBaseUrl}/api/inventory/branch/${branchId}`);
  }

  /**
   * Get inventory across all branches (for the current tenant).
   * Used by POS to show "available at other branches" when 0 at current branch.
   */
  getInventoryAllBranches(): Observable<InventoryDto[]> {
    return this.http
      .get<InventoryListResponse>(`${environment.apiBaseUrl}/api/inventory`)
      .pipe(map((res) => res.inventory ?? []));
  }

  /**
   * Get low stock inventory items.
   */
  getLowStockInventory(): Observable<InventoryDto[]> {
    return this.http.get<InventoryDto[]>(`${environment.apiBaseUrl}/api/inventory/low-stock`);
  }

  /**
   * Get expiring inventory items.
   */
  getExpiringInventory(days = 30): Observable<InventoryDto[]> {
    return this.http.get<InventoryDto[]>(`${environment.apiBaseUrl}/api/inventory/expiring?days=${days}`);
  }

  /**
   * Get inventory alerts.
   */
  getInventoryAlerts(): Observable<InventoryAlertDto[]> {
    return this.http.get<InventoryAlertDto[]>(`${environment.apiBaseUrl}/api/inventory/alerts`);
  }

  /**
   * Get inventory statistics.
   */
  getInventoryStats(): Observable<InventoryStats> {
    return this.http.get<InventoryStats>(`${environment.apiBaseUrl}/api/inventory/stats`);
  }

  /**
   * Get branch-specific inventory statistics.
   */
  getBranchInventoryStats(branchId: string): Observable<BranchInventoryStats> {
    return this.http.get<BranchInventoryStats>(`${environment.apiBaseUrl}/api/inventory/stats/branch/${branchId}`);
  }

  /**
   * Get inventory stats, optionally filtered by branch.
   * @param branchId Optional branch ID (undefined = all branches)
   */
  getInventoryStatsByBranch(branchId?: string): Observable<InventoryStats> {
    if (branchId) {
      return this.http.get<BranchInventoryStats>(
        `${environment.apiBaseUrl}/api/inventory/stats/branch/${branchId}`
      );
    }
    return this.http.get<InventoryStats>(`${environment.apiBaseUrl}/api/inventory/stats`);
  }

  /**
   * Clear cache and force refresh.
   */
  refreshInventory(branchId?: string): void {
    this.lastLoadedAt = 0;
    this.loadInventory(true, branchId);
  }
}

/**
 * Inventory Data Transfer Objects
 */
export interface InventoryDto {
  productGenericName: string;
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  category: string;
  branchId: string;
  branchName: string;
  quantity: number;
  unitCost?: number;
  sellingPrice?: number;
  batchNumber?: string;
  expiryDate?: string;
  manufacturingDate?: string;
  locationInBranch?: string;
  isActive: boolean;
  lastRestocked?: string;
  daysUntilExpiry?: number;
  lowStockAlert: boolean;
  expiringAlert: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateInventoryRequest {
  productId: string;
  branchId: string;
  batchNumber: string;
  expiryDate: string;
  manufacturingDate: string;
  quantity: number;
  unitCost?: number;
  sellingPrice?: number;
  locationInBranch: string;
}

export interface UpdateInventoryRequest {
  id?: string;
  quantity?: number;
  unitCost?: number;
  sellingPrice?: number;
  reorderLevel?: number;
  maxStock?: number;
  location?: string;
  locationInBranch?: string;
  notes?: string;
  isActive?: boolean;
}

export interface InventoryAdjustmentRequest {
  productId: string;
  branchId: string;
  quantity: number; // Positive for additions, negative for reductions
  reason: string;
  notes?: string;
  batchNumber?: string;
  expiryDate?: string;
}

export interface InventoryTransferRequest {
  productId: string;
  fromBranchId: string;
  toBranchId: string;
  quantity: number;
  batchNumber?: string;
  notes?: string;
}

export interface InventoryListResponse {
  inventory: InventoryDto[];
  totalCount: number;
  totalValue: number;
  lowStockCount: number;
  expiringCount: number;
}

export interface InventoryAlertDto {
  type: AlertType;
  productId: string;
  productName: string;
  branchId: string;
  branchName: string;
  currentQuantity: number;
  threshold?: number;
  expiryDate?: string;
  daysUntilExpiry?: number;
  severity: AlertSeverity;
}

export interface InventoryStats {
  totalItems: number;
  totalValue: number;
  lowStockCount: number;
  expiringCount: number;
}

export interface BranchInventoryStats {
  totalItems: number;
  totalValue: number;
  lowStockCount: number;
  expiringCount: number;
}

export enum AlertType {
  LOW_STOCK = 'LOW_STOCK',
  EXPIRING_SOON = 'EXPIRING_SOON',
  EXPIRED = 'EXPIRED',
  OVERSTOCK = 'OVERSTOCK'
}

export enum AlertSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface InventoryItem {
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  category: string;
  branchId: string;
  branchName: string;
  quantity: number;
  unitPrice: number;
  totalValue: number;
  reorderLevel: number;
  maxStock: number;
  lastUpdated: Date;
  expiryDate?: Date;
  batchNumber?: string;
  location?: string;
  notes?: string;
}
