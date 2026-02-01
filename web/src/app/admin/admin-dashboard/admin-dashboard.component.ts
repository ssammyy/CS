import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AdminService, Tenant, MpesaConfig } from '../services/admin.service';
import { TenantManagementComponent } from '../tenant-management/tenant-management.component';
import { MpesaManagementComponent } from '../mpesa-management/mpesa-management.component';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    TenantManagementComponent,
    MpesaManagementComponent
  ],
  template: `
    <div class="admin-container">
      <!-- Header -->
      <div class="admin-header">
        <div class="header-content">
          <mat-icon class="header-icon">admin_panel_settings</mat-icon>
          <h1>Platform Administration</h1>
        </div>
        <div class="header-user">
          <mat-icon>account_circle</mat-icon>
          <span>Platform Admin</span>
        </div>
      </div>

      <!-- Tabs -->
      <mat-tab-group class="admin-tabs">
        <!-- Dashboard Tab -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon class="mr-2">dashboard</mat-icon>
            <span>Dashboard</span>
          </ng-template>
          <div class="tab-content">
            <div class="dashboard-grid">
              <!-- Total Tenants Card -->
              <div class="card">
                <div class="card-icon">
                  <mat-icon>business</mat-icon>
                </div>
                <div class="card-content">
                  <h3>Total Tenants</h3>
                  <p class="card-value">{{ tenants().length }}</p>
                </div>
              </div>

              <!-- M-Pesa Enabled Card -->
              <div class="card">
                <div class="card-icon">
                  <mat-icon>payment</mat-icon>
                </div>
                <div class="card-content">
                  <h3>M-Pesa Enabled</h3>
                  <p class="card-value">{{ mpesaEnabledCount() }}</p>
                </div>
              </div>

              <!-- M-Pesa Tier Enabled Card -->
              <div class="card">
                <div class="card-icon">
                  <mat-icon>star</mat-icon>
                </div>
                <div class="card-content">
                  <h3>M-Pesa Tier Access</h3>
                  <p class="card-value">{{ mpesaTierCount() }}</p>
                </div>
              </div>
            </div>
          </div>
        </mat-tab>

        <!-- Tenant Management Tab -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon class="mr-2">business</mat-icon>
            <span>Tenants</span>
          </ng-template>
          <app-tenant-management
            [tenants]="tenants()"
            (refresh)="loadTenants()">
          </app-tenant-management>
        </mat-tab>

        <!-- M-Pesa Management Tab -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon class="mr-2">payment</mat-icon>
            <span>M-Pesa</span>
          </ng-template>
          <app-mpesa-management
            [tenants]="tenants()"
            (refresh)="loadTenants()">
          </app-mpesa-management>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: [`
    .admin-container {
      @apply h-screen flex flex-col bg-gray-50;
    }

    .admin-header {
      @apply flex items-center justify-between p-6 bg-white border-b border-gray-200;

      .header-content {
        @apply flex items-center gap-4;

        .header-icon {
          @apply text-3xl text-brand-mint;
        }

        h1 {
          @apply text-2xl font-semibold text-gray-900;
        }
      }

      .header-user {
        @apply flex items-center gap-3 px-4 py-2 rounded-lg bg-gray-50;

        mat-icon {
          @apply text-gray-600;
        }

        span {
          @apply text-sm font-medium text-gray-700;
        }
      }
    }

    .admin-tabs {
      @apply flex-1 overflow-auto;

      ::ng-deep .mat-mdc-tab-labels {
        @apply border-b border-gray-200 bg-white;
      }
    }

    .tab-content {
      @apply p-6;
    }

    .dashboard-grid {
      @apply grid grid-cols-1 md:grid-cols-3 gap-6;

      .card {
        @apply bg-white rounded-lg border border-gray-200 p-6 flex items-center gap-4 hover:shadow-md transition-shadow;

        .card-icon {
          @apply p-3 bg-brand-mint/10 rounded-lg;

          mat-icon {
            @apply text-2xl text-brand-mint;
          }
        }

        .card-content {
          @apply flex-1;

          h3 {
            @apply text-sm text-gray-600 mb-2;
          }

          .card-value {
            @apply text-3xl font-bold text-gray-900;
          }
        }
      }
    }
  `]
})
export class AdminDashboardComponent implements OnInit {
  readonly tenants = signal<Tenant[]>([]);
  readonly loading = signal(false);
  readonly mpesaConfigs = signal<Map<string, MpesaConfig>>(new Map());

  readonly mpesaEnabledCount = computed(() => {
    const configs = this.mpesaConfigs();
    let count = 0;
    configs.forEach(config => {
      if (config.enabled) count++;
    });
    return count;
  });

  readonly mpesaTierCount = computed(() => {
    const configs = this.mpesaConfigs();
    let count = 0;
    configs.forEach(config => {
      if (config.tierEnabled) count++;
    });
    return count;
  });

  constructor(
    private adminService: AdminService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadTenants();
  }

  loadTenants(): void {
    this.loading.set(true);
    this.adminService.getAllTenants().subscribe({
      next: (response) => {
        if (response.success) {
          this.tenants.set(response.tenants);
          this.loadMpesaConfigs(response.tenants);
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading tenants:', err);
        this.snackBar.open('Failed to load tenants', 'Close', { duration: 3000 });
        this.loading.set(false);
      }
    });
  }

  private loadMpesaConfigs(tenants: Tenant[]): void {
    const configs = new Map<string, MpesaConfig>();
    tenants.forEach(tenant => {
      this.adminService.getMpesaConfiguration(tenant.id).subscribe({
        next: (response) => {
          if (response.success) {
            configs.set(tenant.id, response.config);
            this.mpesaConfigs.set(new Map(configs));
          }
        },
        error: (err) => {
          console.error(`Error loading M-Pesa config for tenant ${tenant.id}:`, err);
        }
      });
    });
  }
}
