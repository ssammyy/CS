import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Dashboard statistics DTOs
 */
export interface DashboardStats {
  salesStats: SalesStats;
  inventoryStats: InventoryStats;
  creditStats: CreditStats;
  revenueStats: RevenueStats;
  topProducts: TopProduct[];
  recentSales: RecentSale[];
  lowStockProducts: LowStockProduct[];
}

export interface SalesStats {
  totalSalesToday: number;
  totalSalesThisWeek: number;
  totalSalesThisMonth: number;
  totalSalesThisYear: number;
  salesCountToday: number;
  salesCountThisWeek: number;
  salesCountThisMonth: number;
  salesCountThisYear: number;
  averageSaleValue: number;
  /** Total commission (earnings) for the cashier this month; only set when viewing as CASHIER/MANAGER. */
  cashierTotalEarnings?: number | null;
  /** Cashier commission per period; only set when viewing as CASHIER/MANAGER. */
  cashierEarningsToday?: number | null;
  cashierEarningsThisWeek?: number | null;
  cashierEarningsThisMonth?: number | null;
  cashierEarningsThisYear?: number | null;
}

export interface InventoryStats {
  totalProducts: number;
  totalStockValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  expiringWithin30Days: number;
  expiringWithin90Days: number;
}

export interface CreditStats {
  totalActiveCreditAccounts: number;
  totalOutstandingAmount: number;
  overdueAccounts: number;
  overdueAmount: number;
  paymentsReceivedToday: number;
  paymentsReceivedThisWeek: number;
  paymentsReceivedThisMonth: number;
}

export interface RevenueStats {
  dailyRevenue: DailyRevenue[];
  weeklyRevenue: WeeklyRevenue[];
  monthlyRevenue: MonthlyRevenue[];
  revenueByPaymentMethod: PaymentMethodRevenue[];
}

export interface DailyRevenue {
  date: string;
  revenue: number;
  salesCount: number;
}

export interface WeeklyRevenue {
  weekStart: string;
  weekEnd: string;
  revenue: number;
  salesCount: number;
}

export interface MonthlyRevenue {
  month: string;
  year: number;
  revenue: number;
  salesCount: number;
}

export interface PaymentMethodRevenue {
  paymentMethod: string;
  amount: number;
  percentage: number;
}

export interface TopProduct {
  productId: string;
  productName: string;
  quantitySold: number;
  revenue: number;
  salesCount: number;
}

export interface RecentSale {
  saleId: string;
  saleNumber: string;
  customerName: string;
  totalAmount: number;
  saleDate: string;
  status: string;
  /** What was sold (e.g. "Paracetamol x2, Soap x1") — shown prominently on dashboard. */
  lineItemsSummary?: string;
}

export interface LowStockProduct {
  productId: string;
  productName: string;
  currentStock: number;
  minStockLevel: number;
  daysUntilStockOut: number;
}

/**
 * Dashboard Service
 * Fetches and manages dashboard statistics with branch filtering and caching
 */
@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/dashboard`;

  // Cached stats with branch context
  private statsCache$ = new BehaviorSubject<DashboardStats | null>(null);
  private lastFetchTime = 0;
  private readonly CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

  /**
   * Observable for dashboard stats
   */
  readonly stats$ = this.statsCache$.asObservable();

  /**
   * Get dashboard statistics for a specific branch or all branches
   * @param branchId Optional branch ID. If null, gets stats for all branches
   * @param forceRefresh Force refresh cache
   */
  getDashboardStats(branchId?: string, forceRefresh = false): Observable<DashboardStats> {
    const now = Date.now();
    const isCacheValid = !forceRefresh && (now - this.lastFetchTime) < this.CACHE_DURATION;

    // Return cached data if valid (only when branchId provided - CASHIER/MANAGER get user-scoped stats, don't cache)
    if (isCacheValid && this.statsCache$.value && branchId) {
      return this.stats$ as Observable<DashboardStats>;
    }

    let params = new HttpParams();
    if (branchId) {
      params = params.set('branchId', branchId);
    }

    return this.http.get<DashboardStats>(`${this.baseUrl}/stats`, { params }).pipe(
      tap(stats => {
        this.statsCache$.next(stats);
        this.lastFetchTime = now;
      })
    );
  }

  /**
   * Get sales statistics for a date range
   */
  getSalesStats(startDate: string, endDate: string, branchId?: string): Observable<SalesStats> {
    let params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);
    
    if (branchId) {
      params = params.set('branchId', branchId);
    }

    return this.http.get<SalesStats>(`${this.baseUrl}/sales-stats`, { params });
  }

  /**
   * Get revenue trends for charts
   */
  getRevenueTrends(period: 'daily' | 'weekly' | 'monthly', branchId?: string): Observable<RevenueStats> {
    let params = new HttpParams().set('period', period);
    
    if (branchId) {
      params = params.set('branchId', branchId);
    }

    return this.http.get<RevenueStats>(`${this.baseUrl}/revenue-trends`, { params });
  }

  /**
   * Get top selling products
   */
  getTopProducts(limit = 10, branchId?: string): Observable<TopProduct[]> {
    let params = new HttpParams().set('limit', limit.toString());
    
    if (branchId) {
      params = params.set('branchId', branchId);
    }

    return this.http.get<TopProduct[]>(`${this.baseUrl}/top-products`, { params });
  }

  /**
   * Get inventory alerts (low stock, expiring soon)
   */
  getInventoryAlerts(branchId?: string): Observable<InventoryStats> {
    let params = new HttpParams();
    
    if (branchId) {
      params = params.set('branchId', branchId);
    }

    return this.http.get<InventoryStats>(`${this.baseUrl}/inventory-alerts`, { params });
  }

  /**
   * Get credit account statistics
   */
  getCreditStats(branchId?: string): Observable<CreditStats> {
    let params = new HttpParams();
    
    if (branchId) {
      params = params.set('branchId', branchId);
    }

    return this.http.get<CreditStats>(`${this.baseUrl}/credit-stats`, { params });
  }

  /**
   * Get recent sales
   */
  getRecentSales(limit = 10, branchId?: string): Observable<RecentSale[]> {
    let params = new HttpParams().set('limit', limit.toString());
    
    if (branchId) {
      params = params.set('branchId', branchId);
    }

    return this.http.get<RecentSale[]>(`${this.baseUrl}/recent-sales`, { params });
  }

  /**
   * Invalidate cache to force refresh
   */
  invalidateCache(): void {
    this.statsCache$.next(null);
    this.lastFetchTime = 0;
  }

  /**
   * Refresh dashboard stats
   */
  refreshStats(branchId?: string): Observable<DashboardStats> {
    return this.getDashboardStats(branchId, true);
  }

  /**
   * Get onboarding status for guided setup flow
   */
  getOnboardingStatus(): Observable<OnboardingStatus> {
    return this.http.get<OnboardingStatus>(`${this.baseUrl}/onboarding`);
  }
}

/**
 * Onboarding status DTOs
 */
export interface OnboardingStatus {
  hasBranches: boolean;
  hasUsers: boolean;
  hasProducts: boolean;
  hasInventory: boolean;
  currentStep: OnboardingStep;
  steps: OnboardingStepInfo[];
}

export interface OnboardingStepInfo {
  step: OnboardingStep;
  title: string;
  description: string;
  completed: boolean;
  route: string;
  icon: string;
}

export enum OnboardingStep {
  SETUP_BRANCHES = 'SETUP_BRANCHES',
  ADD_USERS = 'ADD_USERS',
  ADD_PRODUCTS = 'ADD_PRODUCTS',
  MANAGE_INVENTORY = 'MANAGE_INVENTORY',
  COMPLETED = 'COMPLETED'
}

