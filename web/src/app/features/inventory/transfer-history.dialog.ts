import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { BranchesService, BranchDto } from '../../core/services/branches.service';
import { UsersService, UserManagementDto } from '../../core/services/users.service';
import { ErrorService } from '../../core/services/error.service';

export interface TransferHistoryDialogData {
  branches: BranchDto[];
}

/**
 * InventoryTransferHistoryDto interface matching backend DTO
 */
export interface InventoryTransferHistoryDto {
  id: string;
  productId: string;
  productName: string;
  fromBranchId: string;
  fromBranchName: string;
  toBranchId: string;
  toBranchName: string;
  quantity: number;
  batchNumber?: string;
  expiryDate?: string;
  unitCost?: number;
  notes?: string;
  performedBy?: string;
  performedByUsername?: string;
  performedByEmail?: string;
  createdAt: string;
}

export interface InventoryTransferHistoryResponse {
  transfers: InventoryTransferHistoryDto[];
  totalCount: number;
}

/**
 * InventoryTransferHistoryDialogComponent displays all inventory transfers
 * for admin review. Shows who performed each transfer, when, and details.
 */
@Component({
  selector: 'app-inventory-transfer-history-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule
  ],
  template: `
  <div class="w-[min(95vw,1200px)] max-h-[90vh] overflow-y-auto">
    <div class="sticky top-0 bg-white z-10 border-b border-gray-200 px-6 pt-5 pb-4">
      <div class="h-1.5 w-16 rounded-full bg-gradient-to-r from-brand-sky to-brand-coral mb-3"></div>
      <h2 class="text-2xl font-semibold">Transfer History</h2>
      <p class="text-gray-600 mt-1 text-sm">View all inventory transfers with details and performer information</p>
    </div>

    <!-- Filters -->
    <div class="px-6 py-4 bg-gray-50 border-b border-gray-200">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <mat-form-field class="w-full" color="primary">
          <mat-label>Filter by Branch</mat-label>
          <mat-select [(ngModel)]="selectedBranchId" (selectionChange)="loadTransfers()">
            <mat-option [value]="null">All Branches</mat-option>
            <mat-option *ngFor="let branch of data.branches" [value]="branch.id">
              {{ branch.name }}
            </mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field class="w-full" color="primary">
          <mat-label>Filter by User</mat-label>
          <mat-select [(ngModel)]="selectedUserId" (selectionChange)="loadTransfers()">
            <mat-option [value]="null">All Users</mat-option>
            <mat-option *ngFor="let user of users" [value]="user.id">
              {{ user.username }} ({{ user.role }})
            </mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field class="w-full" color="primary">
          <mat-label>Start Date</mat-label>
          <input matInput [matDatepicker]="startPicker" [(ngModel)]="startDate" (dateChange)="loadTransfers()">
          <mat-datepicker-toggle matSuffix [for]="startPicker"></mat-datepicker-toggle>
          <mat-datepicker #startPicker></mat-datepicker>
        </mat-form-field>

        <mat-form-field class="w-full" color="primary">
          <mat-label>End Date</mat-label>
          <input matInput [matDatepicker]="endPicker" [(ngModel)]="endDate" (dateChange)="loadTransfers()">
          <mat-datepicker-toggle matSuffix [for]="endPicker"></mat-datepicker-toggle>
          <mat-datepicker #endPicker></mat-datepicker>
        </mat-form-field>
      </div>
    </div>

    <!-- Transfer List -->
    <div class="p-6">
      <div *ngIf="loading" class="flex justify-center py-8">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <div *ngIf="!loading && transfers.length === 0" class="text-center py-12 text-gray-500">
        <mat-icon class="text-6xl text-gray-300 mb-4">swap_horiz</mat-icon>
        <h3 class="text-xl font-semibold text-gray-400 mb-2">No transfers found</h3>
        <p class="text-gray-400">Try adjusting your filters or date range.</p>
      </div>

      <!-- Desktop Table View -->
      <div *ngIf="!loading && transfers.length > 0" class="hidden lg:block overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From Branch</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">To Branch</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Performed By</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr *ngFor="let transfer of transfers" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ transfer.createdAt | date:'short' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">{{ transfer.productName }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">{{ transfer.fromBranchName }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-brand-sky">{{ transfer.toBranchName }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-semibold text-gray-900">{{ transfer.quantity }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ transfer.batchNumber || 'N/A' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm">
                  <div class="font-medium text-gray-900">{{ transfer.performedByUsername || 'System' }}</div>
                  <div class="text-xs text-gray-500">{{ transfer.performedByEmail || '' }}</div>
                </div>
              </td>
              <td class="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                {{ transfer.notes || '-' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile Card View -->
      <div *ngIf="!loading && transfers.length > 0" class="lg:hidden space-y-4">
        <div *ngFor="let transfer of transfers" class="bg-white border border-gray-200 rounded-lg p-4">
          <div class="flex items-start justify-between mb-3">
            <div>
              <h3 class="font-semibold text-gray-900">{{ transfer.productName }}</h3>
              <p class="text-xs text-gray-500 mt-1">{{ transfer.createdAt | date:'short' }}</p>
            </div>
            <span class="px-2 py-1 rounded-full text-xs bg-brand-sky/20 text-brand-sky">
              {{ transfer.quantity }} units
            </span>
          </div>

          <div class="space-y-2 text-sm">
            <div class="flex items-center gap-2">
              <mat-icon class="text-gray-400 text-base">arrow_forward</mat-icon>
              <span class="text-gray-600">{{ transfer.fromBranchName }}</span>
              <mat-icon class="text-brand-sky text-base">arrow_right</mat-icon>
              <span class="font-medium text-brand-sky">{{ transfer.toBranchName }}</span>
            </div>

            <div *ngIf="transfer.batchNumber" class="flex items-center gap-2 text-gray-600">
              <mat-icon class="text-gray-400 text-base">inventory_2</mat-icon>
              <span>Batch: {{ transfer.batchNumber }}</span>
            </div>

            <div class="flex items-center gap-2 text-gray-600">
              <mat-icon class="text-gray-400 text-base">person</mat-icon>
              <div>
                <div class="font-medium">{{ transfer.performedByUsername || 'System' }}</div>
                <div *ngIf="transfer.performedByEmail" class="text-xs text-gray-500">{{ transfer.performedByEmail }}</div>
              </div>
            </div>

            <div *ngIf="transfer.notes" class="text-gray-600 pt-2 border-t border-gray-200">
              <span class="font-medium">Notes:</span>
              <p class="text-sm">{{ transfer.notes }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Summary -->
      <div *ngIf="!loading && transfers.length > 0" class="mt-4 p-4 bg-gray-50 rounded-lg">
        <div class="text-sm text-gray-600">
          Showing <span class="font-medium">{{ transfers.length }}</span> transfer{{ transfers.length !== 1 ? 's' : '' }}
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 -mx-6 -mb-6 flex justify-end">
      <button mat-stroked-button type="button" (click)="close()" class="!py-2.5">Close</button>
    </div>
  </div>
  `
})
export class InventoryTransferHistoryDialogComponent implements OnInit {
  private readonly ref = inject(MatDialogRef<InventoryTransferHistoryDialogComponent>);
  readonly data: TransferHistoryDialogData = inject(MAT_DIALOG_DATA);
  private readonly http = inject(HttpClient);
  private readonly branchesService = inject(BranchesService);
  private readonly usersService = inject(UsersService);
  private readonly errorSvc = inject(ErrorService);

  transfers: InventoryTransferHistoryDto[] = [];
  users: UserManagementDto[] = [];
  loading = false;

  selectedBranchId: string | null = null;
  selectedUserId: string | null = null;
  startDate: Date | null = null;
  endDate: Date | null = null;

  ngOnInit(): void {
    this.loadUsers();
    this.loadTransfers();
  }

  /**
   * Loads all users for filtering
   */
  private loadUsers(): void {
    this.usersService.loadUsers();
    this.usersService.users$.subscribe(users => {
      if (users) {
        this.users = users;
      }
    });
  }

  /**
   * Loads transfer history from the API
   */
  loadTransfers(): void {
    this.loading = true;

    let params = new URLSearchParams();
    if (this.selectedBranchId) {
      params.append('branchId', this.selectedBranchId);
    }
    if (this.selectedUserId) {
      params.append('performedBy', this.selectedUserId);
    }
    if (this.startDate) {
      params.append('startDate', this.startDate.toISOString());
    }
    if (this.endDate) {
      params.append('endDate', this.endDate.toISOString());
    }

    const queryString = params.toString();
    const url = `${environment.apiBaseUrl}/api/inventory/transfers/history${queryString ? '?' + queryString : ''}`;

    this.http.get<InventoryTransferHistoryResponse>(url).subscribe({
      next: (response) => {
        this.transfers = response.transfers;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load transfer history:', err);
        this.errorSvc.show(err?.error?.message || 'Failed to load transfer history');
        this.loading = false;
      }
    });
  }

  close(): void {
    this.ref.close();
  }
}
