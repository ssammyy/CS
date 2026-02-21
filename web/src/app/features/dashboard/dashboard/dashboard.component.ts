import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { NgxChartsModule } from '@swimlane/ngx-charts';

import { DashboardService, DashboardStats } from '../../../core/services/dashboard.service';
import { BranchesService, BranchDto } from '../../../core/services/branches.service';
import { BranchContextService } from '../../../core/services/branch-context.service';
import { OnboardingBitesComponent } from '../onboarding-bites/onboarding-bites.component';

interface StoredUser {
  id: string;
  username: string;
  email: string;
  role: string;
  tenantId: string;
  tenantName: string;
  isActive: boolean;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    RouterLinkActive,
    MatIconModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    NgxChartsModule,
    OnboardingBitesComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  private readonly user = signal<StoredUser | null>(null);
  private readonly dashboardService = inject(DashboardService);
  private readonly branchesService = inject(BranchesService);
  private readonly branchContext = inject(BranchContextService);
  private readonly router = inject(Router);

  readonly stats = signal<DashboardStats | null>(null);
  readonly loading = signal(true);
  readonly selectedBranchId = signal<string | null>(null);
  readonly branches = signal<BranchDto[]>([]);
  readonly showAllBranches = signal(false);

  // Chart data
  readonly dailyRevenueChart = signal<any[]>([]);
  readonly monthlyRevenueChart = signal<any[]>([]);
  readonly paymentMethodChart = signal<any[]>([]);
  
  // Chart options
  readonly colorScheme: any = {
    domain: ['#A1C7F8', '#F99E98', '#CBEBD0', '#FFA500', '#9C27B0']
  };

  constructor() {
    const raw = localStorage.getItem('auth_user');
    this.user.set(raw ? (JSON.parse(raw) as StoredUser) : null);
  }

  ngOnInit(): void {
    this.loadBranches();
    this.loadDashboardStats();
  }

  readonly tenantName = computed(() => this.user()?.tenantName ?? 'Unknown Tenant');
  readonly tenantId = computed(() => this.user()?.tenantId ?? '—');
  readonly username = computed(() => this.user()?.username ?? '');
  readonly isAdmin = computed(() => {
    const role = this.user()?.role;
    return role === 'ADMIN' || role === 'PLATFORM_ADMIN';
  });

  /** CASHIER or MANAGER - dashboard shows their personal sales stats */
  readonly isCashierOrManager = computed(() => {
    const role = this.user()?.role;
    return role === 'CASHIER' || role === 'MANAGER';
  });

  /**
   * Load branches
   */
  loadBranches(): void {
    this.branchesService.loadBranches();
    this.branchesService.branches$.subscribe(branches => {
      this.branches.set(branches || []);
    });
  }

  /**
   * Load dashboard statistics
   * For non-admin users, branch selection is handled by the backend
   */
  loadDashboardStats(): void {
    this.loading.set(true);
    // Only admins can select branches or view all branches
    const branchId = this.isAdmin() 
      ? (this.showAllBranches() ? undefined : this.selectedBranchId() || undefined)
      : undefined; // Backend will auto-select branch for cashiers

    this.dashboardService.getDashboardStats(branchId).subscribe({
      next: (stats) => {
        this.stats.set(stats);
        this.prepareChartData(stats);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading dashboard stats:', error);
        this.loading.set(false);
      }
    });
  }

  /**
   * Prepare chart data from stats
   */
  prepareChartData(stats: DashboardStats): void {
    // Daily revenue chart
    this.dailyRevenueChart.set(
      stats.revenueStats.dailyRevenue.map(d => ({
        name: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: d.revenue
      }))
    );

    // Monthly revenue chart
    this.monthlyRevenueChart.set(
      stats.revenueStats.monthlyRevenue.map(m => ({
        name: `${m.month.substring(0, 3)} ${m.year}`,
        value: m.revenue
      }))
    );

    // Payment method chart
    this.paymentMethodChart.set(
      stats.revenueStats.revenueByPaymentMethod.map(p => ({
        name: p.paymentMethod,
        value: p.amount
      }))
    );
  }

  /**
   * Handle branch selection change
   */
  onBranchChange(): void {
    this.loadDashboardStats();
  }

  /**
   * Toggle show all branches (Admin only)
   */
  toggleAllBranches(): void {
    if (!this.isAdmin()) return; // Only admins can toggle
    this.showAllBranches.update(v => !v);
    if (this.showAllBranches()) {
      this.selectedBranchId.set(null);
    }
    this.loadDashboardStats();
  }

  /**
   * Refresh dashboard
   */
  refreshDashboard(): void {
    this.dashboardService.invalidateCache();
    this.loadDashboardStats();
  }

  /**
   * Format currency
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount);
  }

  /**
   * Navigate to reports section
   */
  navigateToReports(): void {
    this.router.navigate(['/reports']);
  }
}
