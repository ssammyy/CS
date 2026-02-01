import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { AdminService, Tenant } from '../services/admin.service';

@Component({
  selector: 'app-tenant-management',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    FormsModule
  ],
  template: `
    <div class="tenant-management">
      <!-- Search Bar -->
      <div class="search-bar">
        <mat-form-field class="search-field">
          <mat-label>Search tenants...</mat-label>
          <input matInput [(ngModel)]="searchTerm" (ngModelChange)="onSearch()">
          <mat-icon matPrefix>search</mat-icon>
        </mat-form-field>
      </div>

      <!-- Tenants Table -->
      <div class="tenants-table">
        <div class="table-header">
          <div class="col-id">ID</div>
          <div class="col-name">Name</div>
          <div class="col-created">Created</div>
          <div class="col-actions">Actions</div>
        </div>

        <div *ngIf="filteredTenants.length === 0" class="no-results">
          <mat-icon>business_center</mat-icon>
          <p>No tenants found</p>
        </div>

        <div *ngFor="let tenant of filteredTenants" class="table-row">
          <div class="col-id">
            <code>{{ tenant.id | slice:0:8 }}...</code>
          </div>
          <div class="col-name">
            <strong>{{ tenant.name }}</strong>
          </div>
          <div class="col-created">
            {{ tenant.createdAt | date:'short' }}
          </div>
          <div class="col-actions">
            <button (click)="viewTenant(tenant)" class="action-btn view-btn" title="View details">
              <mat-icon>info</mat-icon>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .tenant-management {
      @apply p-6 space-y-6;
    }

    .search-bar {
      @apply flex justify-between items-center;

      .search-field {
        @apply max-w-md;
      }
    }

    .tenants-table {
      @apply bg-white rounded-lg border border-gray-200 overflow-hidden;

      .table-header {
        @apply flex items-center bg-gray-50 border-b border-gray-200 px-6 py-4 font-semibold text-sm text-gray-700;

        .col-id {
          @apply flex-1 min-w-24;
        }

        .col-name {
          @apply flex-1 min-w-32;
        }

        .col-created {
          @apply flex-1 min-w-32;
        }

        .col-actions {
          @apply w-24 text-center;
        }
      }

      .table-row {
        @apply flex items-center px-6 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors;

        .col-id {
          @apply flex-1 min-w-24;

          code {
            @apply bg-gray-100 px-2 py-1 rounded text-xs font-mono text-gray-700;
          }
        }

        .col-name {
          @apply flex-1 min-w-32;
        }

        .col-created {
          @apply flex-1 min-w-32 text-sm text-gray-600;
        }

        .col-actions {
          @apply w-24 flex justify-center gap-2;

          .action-btn {
            @apply p-2 rounded-lg transition-colors;

            mat-icon {
              @apply text-lg;
            }

            &.view-btn {
              @apply text-blue-600 hover:bg-blue-50;
            }
          }
        }
      }

      .no-results {
        @apply flex flex-col items-center justify-center py-12 text-gray-500;

        mat-icon {
          @apply text-4xl mb-2 opacity-50;
        }
      }
    }
  `]
})
export class TenantManagementComponent {
  @Input() tenants: Tenant[] = [];
  @Output() refresh = new EventEmitter<void>();

  searchTerm = '';
  filteredTenants: Tenant[] = [];

  constructor(private adminService: AdminService) {
    this.filteredTenants = this.tenants;
  }

  ngOnChanges(): void {
    this.onSearch();
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

  viewTenant(tenant: Tenant): void {
    // This could open a detail modal or navigate to a detail page
    console.log('Viewing tenant:', tenant);
  }
}
