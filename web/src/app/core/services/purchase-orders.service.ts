import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Service for managing purchase orders in the procurement system.
 * Handles CRUD operations, workflow management, and purchase order-related queries.
 * Implements caching for improved performance and reduced API calls.
 */
@Injectable({
  providedIn: 'root'
})
export class PurchaseOrdersService {
  private purchaseOrdersSubject = new BehaviorSubject<PurchaseOrderDto[]>([]);
  private lastLoadedAt = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor(private http: HttpClient) {}

  /**
   * Get purchase orders observable with caching.
   */
  get purchaseOrders$(): Observable<PurchaseOrderDto[]> {
    return this.purchaseOrdersSubject.asObservable();
  }

  /**
   * Load purchase orders from API with cache validation.
   */
  loadPurchaseOrders(forceRefresh = false): void {
    const now = Date.now();
    if (!forceRefresh && (now - this.lastLoadedAt) < this.CACHE_DURATION) {
      return; // Use cached data
    }

    this.http
      .get<PurchaseOrderListResponse>(`${environment.apiBaseUrl}/api/v1/purchase-orders`)
      .subscribe({
        next: (response) => {
          this.purchaseOrdersSubject.next(response.purchaseOrders);
          this.lastLoadedAt = now;
        },
        error: (error) => {
          console.error('Error loading purchase orders:', error);
          // Keep previous cache if request fails
        }
      });
  }

  /**
   * Create a new purchase order.
   */
  createPurchaseOrder(request: CreatePurchaseOrderRequest, createdBy: string): Observable<PurchaseOrderDto> {
    return this.http.post<PurchaseOrderDto>(`${environment.apiBaseUrl}/api/v1/purchase-orders/?createdBy=${encodeURIComponent(createdBy)}`, request);
  }

  /**
   * Update an existing purchase order.
   */
  updatePurchaseOrder(id: string, request: UpdatePurchaseOrderRequest, updatedBy: string): Observable<PurchaseOrderDto> {
    return this.http.put<PurchaseOrderDto>(`${environment.apiBaseUrl}/api/v1/purchase-orders/${id}?updatedBy=${encodeURIComponent(updatedBy)}`, request);
  }

  /**
   * Delete a purchase order.
   */
  deletePurchaseOrder(id: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiBaseUrl}/api/v1/purchase-orders/${id}`);
  }

  /**
   * Get purchase order by ID.
   */
  getPurchaseOrderById(id: string): Observable<PurchaseOrderDto> {
    return this.http.get<PurchaseOrderDto>(`${environment.apiBaseUrl}/api/v1/purchase-orders/${id}`);
  }

  /**
   * Get all purchase orders with summary.
   */
  getAllPurchaseOrders(): Observable<PurchaseOrderListResponse> {
    return this.http.get<PurchaseOrderListResponse>(`${environment.apiBaseUrl}/api/v1/purchase-orders`);
  }

  /**
   * Search purchase orders by PO number, title, or supplier.
   */
  searchPurchaseOrders(query: string): Observable<PurchaseOrderSearchResult> {
    return this.http.get<PurchaseOrderSearchResult>(`${environment.apiBaseUrl}/api/v1/purchase-orders/search?query=${encodeURIComponent(query)}`);
  }

  /**
   * Get purchase orders with pagination and filtering.
   */
  getPurchaseOrdersWithPagination(
    page = 0,
    size = 20,
    poNumber?: string,
    title?: string,
    supplierId?: string,
    branchId?: string,
    status?: string,
    startDate?: string,
    endDate?: string
  ): Observable<PaginatedPurchaseOrderResponse> {
    let url = `${environment.apiBaseUrl}/api/v1/purchase-orders/paginated?page=${page}&size=${size}`;
    if (poNumber) url += `&poNumber=${encodeURIComponent(poNumber)}`;
    if (title) url += `&title=${encodeURIComponent(title)}`;
    if (supplierId) url += `&supplierId=${supplierId}`;
    if (branchId) url += `&branchId=${branchId}`;
    if (status) url += `&status=${status}`;
    if (startDate) url += `&startDate=${encodeURIComponent(startDate)}`;
    if (endDate) url += `&endDate=${encodeURIComponent(endDate)}`;

    return this.http.get<PaginatedPurchaseOrderResponse>(url);
  }

  /**
   * Get purchase orders by status.
   */
  getPurchaseOrdersByStatus(status: PurchaseOrderStatus): Observable<PurchaseOrderDto[]> {
    return this.http.get<PurchaseOrderDto[]>(`${environment.apiBaseUrl}/api/v1/purchase-orders/status/${status}`);
  }

  /**
   * Get purchase orders by supplier.
   */
  getPurchaseOrdersBySupplier(supplierId: string): Observable<PurchaseOrderDto[]> {
    return this.http.get<PurchaseOrderDto[]>(`${environment.apiBaseUrl}/api/v1/purchase-orders/supplier/${supplierId}`);
  }

  /**
   * Get purchase orders by branch.
   */
  getPurchaseOrdersByBranch(branchId: string): Observable<PurchaseOrderDto[]> {
    return this.http.get<PurchaseOrderDto[]>(`${environment.apiBaseUrl}/api/v1/purchase-orders/branch/${branchId}`);
  }

  /**
   * Get overdue purchase orders.
   */
  getOverduePurchaseOrders(): Observable<PurchaseOrderDto[]> {
    return this.http.get<PurchaseOrderDto[]>(`${environment.apiBaseUrl}/api/v1/purchase-orders/overdue`);
  }

  /**
   * Get purchase orders due for delivery.
   */
  getPurchaseOrdersDueForDelivery(days = 7): Observable<PurchaseOrderDto[]> {
    return this.http.get<PurchaseOrderDto[]>(`${environment.apiBaseUrl}/api/v1/purchase-orders/due-for-delivery?days=${days}`);
  }

  /**
   * Change purchase order status.
   */
  changePurchaseOrderStatus(id: string, request: ChangePurchaseOrderStatusRequest, performedBy: string): Observable<PurchaseOrderDto> {
    return this.http.patch<PurchaseOrderDto>(`${environment.apiBaseUrl}/api/v1/purchase-orders/${id}/status?performedBy=${encodeURIComponent(performedBy)}`, request);
  }

  /**
   * Approve a purchase order.
   */
  approvePurchaseOrder(id: string, request: ApprovePurchaseOrderRequest): Observable<PurchaseOrderDto> {
    return this.http.post<PurchaseOrderDto>(`${environment.apiBaseUrl}/api/v1/purchase-orders/${id}/approve`, request);
  }

  /**
   * Submit a purchase order for approval.
   */
  submitForApproval(id: string, submittedBy: string): Observable<PurchaseOrderDto> {
    return this.http.post<PurchaseOrderDto>(`${environment.apiBaseUrl}/api/v1/purchase-orders/${id}/submit-for-approval?submittedBy=${encodeURIComponent(submittedBy)}`, {});
  }

  /**
   * Mark a purchase order as delivered.
   */
  markAsDelivered(id: string, markedBy: string): Observable<PurchaseOrderDto> {
    return this.http.post<PurchaseOrderDto>(`${environment.apiBaseUrl}/api/v1/purchase-orders/${id}/mark-delivered?markedBy=${encodeURIComponent(markedBy)}`, {});
  }

  /**
   * Close a purchase order.
   */
  closePurchaseOrder(id: string, closedBy: string): Observable<PurchaseOrderDto> {
    return this.http.post<PurchaseOrderDto>(`${environment.apiBaseUrl}/api/v1/purchase-orders/${id}/close?closedBy=${encodeURIComponent(closedBy)}`, {});
  }

  /**
   * Cancel a purchase order.
   */
  cancelPurchaseOrder(id: string, cancelledBy: string, reason: string): Observable<PurchaseOrderDto> {
    return this.http.post<PurchaseOrderDto>(`${environment.apiBaseUrl}/api/v1/purchase-orders/${id}/cancel?cancelledBy=${encodeURIComponent(cancelledBy)}&reason=${encodeURIComponent(reason)}`, {});
  }

  /**
   * Receive goods against a purchase order.
   */
  receiveGoods(id: string, request: ReceiveGoodsRequest, receivedBy: string): Observable<PurchaseOrderDto> {
    return this.http.post<PurchaseOrderDto>(`${environment.apiBaseUrl}/api/v1/purchase-orders/${id}/receive-goods?receivedBy=${encodeURIComponent(receivedBy)}`, request);
  }

  /**
   * Get purchase order summary statistics.
   */
  getPurchaseOrderSummary(): Observable<PurchaseOrderSummaryDto> {
    return this.http.get<PurchaseOrderSummaryDto>(`${environment.apiBaseUrl}/api/v1/purchase-orders/summary`);
  }

  /**
   * Get purchase order history/audit trail.
   */
  getPurchaseOrderHistory(id: string): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiBaseUrl}/api/v1/purchase-orders/${id}/history`);
  }

  /**
   * Get available purchase order statuses.
   */
  getPurchaseOrderStatuses(): Observable<PurchaseOrderStatus[]> {
    return this.http.get<PurchaseOrderStatus[]>(`${environment.apiBaseUrl}/api/v1/purchase-orders/statuses`);
  }

  /**
   * Clear cache and force refresh.
   */
  clearCache(): void {
    this.lastLoadedAt = 0;
  }
}

// Enums
export enum PurchaseOrderStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  DELIVERED = 'DELIVERED',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED'
}

// DTOs
export interface PurchaseOrderDto {
  id: string;
  poNumber: string;
  title: string;
  description?: string;
  supplierId: string;
  supplierName: string;
  tenantId: string;
  tenantName: string;
  branchId: string;
  branchName: string;
  status: PurchaseOrderStatus;
  totalAmount: number;
  taxAmount?: number;
  discountAmount?: number;
  grandTotal: number;
  paymentTerms?: string;
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  notes?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
  lineItems: PurchaseOrderLineItemDto[];
}

export interface PurchaseOrderLineItemDto {
  id: string;
  productId: string;
  productName: string;
  productBarcode?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  receivedQuantity: number;
  expectedDeliveryDate?: string;
  notes?: string;
}

export interface CreatePurchaseOrderRequest {
  title: string;
  description?: string;
  supplierId: string;
  branchId: string;
  paymentTerms?: string;
  expectedDeliveryDate?: string;
  notes?: string;
  lineItems: CreatePurchaseOrderLineItemRequest[];
}

export interface CreatePurchaseOrderLineItemRequest {
  productId: string;
  quantity: number;
  unitPrice: number;
  expectedDeliveryDate?: string;
  notes?: string;
}

export interface UpdatePurchaseOrderRequest {
  title?: string;
  description?: string;
  supplierId?: string;
  branchId?: string;
  paymentTerms?: string;
  expectedDeliveryDate?: string;
  notes?: string;
  lineItems?: UpdatePurchaseOrderLineItemRequest[];
}

export interface UpdatePurchaseOrderLineItemRequest {
  id?: string;
  productId?: string;
  quantity?: number;
  unitPrice?: number;
  expectedDeliveryDate?: string;
  notes?: string;
}

export interface ChangePurchaseOrderStatusRequest {
  newStatus: PurchaseOrderStatus;
  notes?: string;
}

export interface ApprovePurchaseOrderRequest {
  approvedBy: string;
  notes?: string;
}

export interface ReceiveGoodsRequest {
  lineItems: ReceiveGoodsLineItemRequest[];
}

export interface ReceiveGoodsLineItemRequest {
  lineItemId: string;
  receivedQuantity: number;
}

export interface PurchaseOrderListResponse {
  purchaseOrders: PurchaseOrderDto[];
  totalCount: number;
  draftCount: number;
  pendingApprovalCount: number;
  approvedCount: number;
  deliveredCount: number;
  closedCount: number;
}

export interface PurchaseOrderSearchResult {
  purchaseOrders: PurchaseOrderDto[];
  totalCount: number;
  searchQuery: string;
}

export interface PaginatedPurchaseOrderResponse {
  content: PurchaseOrderDto[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

export interface PurchaseOrderSummaryDto {
  totalPurchaseOrders: number;
  totalValue: number;
  draftCount: number;
  pendingApprovalCount: number;
  approvedCount: number;
  deliveredCount: number;
  closedCount: number;
  overdueCount: number;
  statusBreakdown: Record<string, number>;
  monthlyTrend: MonthlyPurchaseOrderTrend[];
}

export interface MonthlyPurchaseOrderTrend {
  month: string;
  year: number;
  count: number;
  totalValue: number;
}
