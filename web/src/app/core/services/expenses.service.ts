import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export type ExpenseType =
  | 'DELIVERY'
  | 'ADVERTISEMENTS'
  | 'RENT'
  | 'WIFI'
  | 'COMMISSIONS_PAID'
  | 'MISCELLANEOUS';

export const EXPENSE_TYPE_LABELS: Record<ExpenseType, string> = {
  DELIVERY: 'Delivery of stock',
  ADVERTISEMENTS: 'Advertisements',
  RENT: 'Rent',
  WIFI: 'Wifi',
  COMMISSIONS_PAID: 'Commissions paid',
  MISCELLANEOUS: 'Miscellaneous'
};

export const EXPENSE_TYPES: ExpenseType[] = [
  'DELIVERY',
  'ADVERTISEMENTS',
  'RENT',
  'WIFI',
  'COMMISSIONS_PAID',
  'MISCELLANEOUS'
];

export interface ExpenseDto {
  id: string;
  branchId: string;
  branchName: string;
  expenseType: string;
  amount: number;
  expenseDate: string;
  description: string | null;
  status: string;
  createdBy: string | null;
  createdAt: string;
  approvedByName?: string | null;
  approvedAt?: string | null;
  rejectionReason?: string | null;
}

export interface CreateExpenseRequest {
  branchId: string;
  expenseType: string;
  amount: number;
  expenseDate: string;
  description?: string | null;
}

export interface UpdateExpenseRequest {
  branchId?: string;
  expenseType?: string;
  amount?: number;
  expenseDate?: string;
  description?: string | null;
}

export interface ExpenseListResponse {
  content: ExpenseDto[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  totalAmountInRange: number;
}

export interface PendingExpenseListResponse {
  items: ExpenseDto[];
  total: number;
}

@Injectable({ providedIn: 'root' })
export class ExpensesService {
  private pendingCountSubject = new BehaviorSubject<number>(0);
  readonly pendingCount$ = this.pendingCountSubject.asObservable();

  constructor(private http: HttpClient) {}

  list(params: {
    branchId?: string;
    expenseType?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    size?: number;
  }): Observable<ExpenseListResponse> {
    let httpParams = new HttpParams();
    if (params.branchId) httpParams = httpParams.set('branchId', params.branchId);
    if (params.expenseType) httpParams = httpParams.set('expenseType', params.expenseType);
    if (params.startDate) httpParams = httpParams.set('startDate', params.startDate);
    if (params.endDate) httpParams = httpParams.set('endDate', params.endDate);
    if (params.page != null) httpParams = httpParams.set('page', params.page.toString());
    if (params.size != null) httpParams = httpParams.set('size', params.size.toString());

    return this.http.get<ExpenseListResponse>(`${environment.apiBaseUrl}/api/expenses`, { params: httpParams });
  }

  getById(id: string): Observable<ExpenseDto> {
    return this.http.get<ExpenseDto>(`${environment.apiBaseUrl}/api/expenses/${id}`);
  }

  create(request: CreateExpenseRequest): Observable<ExpenseDto> {
    return this.http.post<ExpenseDto>(`${environment.apiBaseUrl}/api/expenses`, request);
  }

  update(id: string, request: UpdateExpenseRequest): Observable<ExpenseDto> {
    return this.http.put<ExpenseDto>(`${environment.apiBaseUrl}/api/expenses/${id}`, request);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiBaseUrl}/api/expenses/${id}`);
  }

  listPending(page = 0, size = 50): Observable<PendingExpenseListResponse> {
    return this.http.get<PendingExpenseListResponse>(
      `${environment.apiBaseUrl}/api/expenses/pending`,
      { params: { page: String(page), size: String(size) } }
    );
  }

  getPendingCount(): Observable<number> {
    return this.http.get<{ count: number }>(`${environment.apiBaseUrl}/api/expenses/pending/count`).pipe(
      tap((res) => this.pendingCountSubject.next(res.count)),
      map((res) => res.count)
    );
  }

  refreshPendingCount(): void {
    this.getPendingCount().subscribe();
  }

  approve(id: string): Observable<ExpenseDto> {
    return this.http.post<ExpenseDto>(`${environment.apiBaseUrl}/api/expenses/${id}/approve`, {}).pipe(
      tap(() => this.refreshPendingCount())
    );
  }

  reject(id: string, rejectionReason?: string): Observable<ExpenseDto> {
    return this.http
      .post<ExpenseDto>(`${environment.apiBaseUrl}/api/expenses/${id}/reject`, {
        approved: false,
        rejectionReason: rejectionReason ?? null
      })
      .pipe(tap(() => this.refreshPendingCount()));
  }
}
