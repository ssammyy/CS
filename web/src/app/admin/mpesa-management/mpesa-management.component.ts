import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { AdminService, Tenant } from '../services/admin.service';

@Component({
  selector: 'app-mpesa-management',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatSnackBarModule,
    MatInputModule,
    MatFormFieldModule,
    FormsModule
  ],
  template: `
    <div class="mpesa-management">
      <!-- Search Bar -->
      <div class="search-bar">
        <mat-form-field class="search-field">
          <mat-label>Search tenants...</mat-label>
          <input matInput [(ngModel)]="searchTerm" (ngModelChange)="onSearch()">
          <mat-icon matPrefix>search</mat-icon>
        </mat-form-field>
      </div>

      <!-- M-Pesa Tenants List -->
      <div class="mpesa-list">
        <div *ngIf="filteredTenants.length === 0" class="no-results">
          <mat-icon>payment</mat-icon>
          <p>No tenants found</p>
        </div>

        <div *ngFor="let tenant of filteredTenants" class="tenant-card">
          <div class="tenant-header">
            <div class="tenant-info">
              <h3>{{ tenant.name }}</h3>
              <p class="tenant-id">ID: {{ tenant.id | slice:0:8 }}...</p>
            </div>
            <div class="tenant-badges">
              <span *ngIf="getTenantMpesaStatus(tenant.id).tierEnabled" class="badge tier-enabled">
                <mat-icon>star</mat-icon> Tier Enabled
              </span>
              <span *ngIf="getTenantMpesaStatus(tenant.id).enabled" class="badge enabled">
                <mat-icon>check_circle</mat-icon> Enabled
              </span>
              <span *ngIf="!getTenantMpesaStatus(tenant.id).tierEnabled" class="badge disabled">
                <mat-icon>cancel</mat-icon> Tier Disabled
              </span>
            </div>
          </div>

          <div class="tenant-actions">
            <button
              *ngIf="!getTenantMpesaStatus(tenant.id).tierEnabled"
              (click)="enableTier(tenant.id)"
              [disabled]="loadingTenant() === tenant.id"
              class="action-btn enable-btn">
              <mat-icon>check</mat-icon>
              Enable M-Pesa Tier
            </button>

            <button
              *ngIf="getTenantMpesaStatus(tenant.id).tierEnabled"
              (click)="disableTier(tenant.id)"
              [disabled]="loadingTenant() === tenant.id"
              class="action-btn disable-btn">
              <mat-icon>block</mat-icon>
              Disable M-Pesa Tier
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .mpesa-management {
      @apply p-6 space-y-6;
    }

    .search-bar {
      @apply flex justify-between items-center;

      .search-field {
        @apply max-w-md;
      }
    }

    .mpesa-list {
      @apply grid grid-cols-1 md:grid-cols-2 gap-4;

      .no-results {
        @apply col-span-full flex flex-col items-center justify-center py-12 text-gray-500;

        mat-icon {
          @apply text-5xl mb-2 opacity-50;
        }
      }

      .tenant-card {
        @apply bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow;

        .tenant-header {
          @apply mb-4;

          .tenant-info {
            h3 {
              @apply text-lg font-semibold text-gray-900 mb-1;
            }

            .tenant-id {
              @apply text-sm text-gray-600;
            }
          }

          .tenant-badges {
            @apply flex flex-wrap gap-2 mt-3;

            .badge {
              @apply inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium;

              mat-icon {
                @apply text-base;
              }

              &.tier-enabled {
                @apply bg-yellow-100 text-yellow-700;
              }

              &.enabled {
                @apply bg-green-100 text-green-700;
              }

              &.disabled {
                @apply bg-red-100 text-red-700;
              }
            }
          }
        }

        .tenant-actions {
          @apply flex gap-2;

          .action-btn {
            @apply flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed;

            mat-icon {
              @apply text-lg;
            }

            &.enable-btn {
              @apply bg-green-50 text-green-700 hover:bg-green-100;
            }

            &.disable-btn {
              @apply bg-red-50 text-red-700 hover:bg-red-100;
            }
          }
        }
      }
    }
  `]
})
export class MpesaManagementComponent {
  @Input() tenants: Tenant[] = [];
  @Output() refresh = new EventEmitter<void>();

  searchTerm = '';
  filteredTenants: Tenant[] = [];
  loadingTenant = signal<string | null>(null);

  mpesaStatus: Map<string, { enabled: boolean; tierEnabled: boolean }> = new Map();

  constructor(
    private adminService: AdminService,
    private snackBar: MatSnackBar
  ) {}

  ngOnChanges(): void {
    this.onSearch();
    this.loadMpesaConfigs();
  }

  onSearch(): void {
    if (!this.searchTerm.trim()) {
      this.filteredTenants = this.tenants;
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredTenants = this.tenants.filter(tenant =>
        tenant.name.toLowerCase().includes(term) ||
        tenant.id.toLowerCase().includes(term)
      );
    }
  }

  loadMpesaConfigs(): void {
    this.tenants.forEach(tenant => {
      this.adminService.getMpesaConfiguration(tenant.id).subscribe({
        next: (response) => {
          if (response.success) {
            this.mpesaStatus.set(tenant.id, {
              enabled: response.config.enabled,
              tierEnabled: response.config.tierEnabled
            });
          }
        },
        error: (err) => {
          console.error(`Error loading M-Pesa config for tenant ${tenant.id}:`, err);
        }
      });
    });
  }

  getTenantMpesaStatus(tenantId: string): { enabled: boolean; tierEnabled: boolean } {
    return this.mpesaStatus.get(tenantId) || { enabled: false, tierEnabled: false };
  }

  enableTier(tenantId: string): void {
    this.loadingTenant.set(tenantId);
    this.adminService.enableMpesaTier(tenantId).subscribe({
      next: (response) => {
        if (response.success) {
          this.mpesaStatus.set(tenantId, {
            enabled: false,
            tierEnabled: true
          });
          this.snackBar.open(`M-Pesa tier enabled for ${response.tenantName}`, 'Close', {
            duration: 3000,
            panelClass: 'success-snackbar'
          });
          this.refresh.emit();
        }
        this.loadingTenant.set(null);
      },
      error: (err) => {
        console.error('Error enabling M-Pesa tier:', err);
        this.snackBar.open('Failed to enable M-Pesa tier', 'Close', {
          duration: 3000,
          panelClass: 'error-snackbar'
        });
        this.loadingTenant.set(null);
      }
    });
  }

  disableTier(tenantId: string): void {
    if (!confirm('Are you sure you want to disable M-Pesa for this tenant? This will also disable any active M-Pesa payments.')) {
      return;
    }

    this.loadingTenant.set(tenantId);
    this.adminService.disableMpesaTier(tenantId).subscribe({
      next: (response) => {
        if (response.success) {
          this.mpesaStatus.set(tenantId, {
            enabled: false,
            tierEnabled: false
          });
          this.snackBar.open(`M-Pesa tier disabled for ${response.tenantName}`, 'Close', {
            duration: 3000,
            panelClass: 'success-snackbar'
          });
          this.refresh.emit();
        }
        this.loadingTenant.set(null);
      },
      error: (err) => {
        console.error('Error disabling M-Pesa tier:', err);
        this.snackBar.open('Failed to disable M-Pesa tier', 'Close', {
          duration: 3000,
          panelClass: 'error-snackbar'
        });
        this.loadingTenant.set(null);
      }
    });
  }
}
