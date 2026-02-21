import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface SaleEditRequestDto {
  id: string;
  saleId: string;
  saleNumber: string;
  saleLineItemId: string | null;
  productName: string | null;
  requestType: string;
  status: string;
  currentUnitPrice: number | null;
  newUnitPrice: number | null;
  quantity: number | null;
  reason: string | null;
  requestedById: string;
  requestedByName: string;
  requestedAt: string;
  approvedById: string | null;
  approvedByName: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
}

export interface CreateSaleEditRequestDto {
  saleId: string;
  saleLineItemId: string;
  requestType: 'PRICE_CHANGE' | 'LINE_DELETE';
  newUnitPrice?: number;
  reason?: string;
}

export interface ApproveRejectDto {
  approved: boolean;
  rejectionReason?: string;
}

export interface PendingListResponse {
  items: SaleEditRequestDto[];
  total: number;
}

/**
 * Service for maker-checker sale edit requests.
 * Caches pending count for notification badge; invalidate after approve/reject.
 * Emits saleId when an edit is approved so sales list, sale details, and reports can refresh.
 */
@Injectable({
  providedIn: 'root'
})
export class SaleEditRequestService {
  private pendingCountSubject = new BehaviorSubject<number>(0);
  private saleUpdatedSubject = new Subject<string>();

  readonly pendingCount$ = this.pendingCountSubject.asObservable();
  /** Emits the sale id when a sale edit is approved (price change or line delete). Subscribe to refresh sales data. */
  readonly saleUpdated$ = this.saleUpdatedSubject.asObservable();

  constructor(private http: HttpClient) {}

  createRequest(dto: CreateSaleEditRequestDto): Observable<SaleEditRequestDto> {
    return this.http.post<SaleEditRequestDto>(
      `${environment.apiBaseUrl}/api/sale-edit-requests`,
      dto
    ).pipe(tap(() => this.refreshPendingCount()));
  }

  listPending(page = 0, size = 20): Observable<PendingListResponse> {
    return this.http.get<PendingListResponse>(
      `${environment.apiBaseUrl}/api/sale-edit-requests/pending`,
      { params: { page: String(page), size: String(size) } }
    );
  }

  getPendingCount(): Observable<number> {
    return this.http.get<{ count: number }>(
      `${environment.apiBaseUrl}/api/sale-edit-requests/pending/count`
    ).pipe(
      tap(res => this.pendingCountSubject.next(res.count)),
      map(res => res.count)
    );
  }

  refreshPendingCount(): void {
    this.getPendingCount().subscribe();
  }

  approveOrReject(id: string, dto: ApproveRejectDto): Observable<SaleEditRequestDto> {
    return this.http.post<SaleEditRequestDto>(
      `${environment.apiBaseUrl}/api/sale-edit-requests/${id}/approve-reject`,
      dto
    ).pipe(
      tap((response) => {
        this.refreshPendingCount();
        if (response.status === 'APPROVED' && response.saleId) {
          this.saleUpdatedSubject.next(response.saleId);
        }
      })
    );
  }
}
