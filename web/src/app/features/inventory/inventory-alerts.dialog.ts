import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { InventoryService, InventoryAlertDto, AlertType, AlertSeverity } from '../../core/services/inventory.service';

/**
 * Enhanced dialog component for displaying inventory alerts.
 * Shows comprehensive alert information organized by type and severity.
 */
@Component({
  selector: 'app-inventory-alerts-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatTabsModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="h-[min(92vh,800px)] ">
      <div class="px-5 pt-5">
        <div class="h-1.5 w-16 rounded-full bg-gradient-to-r from-orange-500 to-red-500 mb-4"></div>
        <h2 class="text-2xl font-semibold">Inventory Alerts</h2>
        <p class="text-gray-600 mt-1 text-sm">Monitor critical inventory issues and take action</p>
      </div>

      <div class="p-5 pt-3">
        <div *ngIf="loading" class="flex justify-center py-12">
          <mat-spinner diameter="40"></mat-spinner>
        </div>

        <div *ngIf="!loading && alerts.length === 0" class="text-center py-12 text-gray-500">
          <mat-icon class="text-6xl text-gray-300 mb-4">check_circle</mat-icon>
          <h3 class="text-xl font-semibold text-gray-400 mb-2">No Alerts</h3>
          <p class="text-gray-400">All inventory items are within normal parameters.</p>
        </div>

        <div *ngIf="!loading && alerts.length > 0">
          <!-- Alert Summary -->
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div class="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
              <div class="flex items-center">
                <div class="p-2 bg-red-500/20 rounded-lg">
                  <mat-icon class="text-red-500">warning</mat-icon>
                </div>
                <div class="ml-3">
                  <p class="text-sm font-medium text-gray-600">Critical</p>
                  <p class="text-2xl font-bold text-gray-900">{{ getAlertsBySeverity(AlertSeverity.CRITICAL).length }}</p>
                </div>
              </div>
            </div>

            <div class="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
              <div class="flex items-center">
                <div class="p-2 bg-orange-500/20 rounded-lg">
                  <mat-icon class="text-orange-500">priority_high</mat-icon>
                </div>
                <div class="ml-3">
                  <p class="text-sm font-medium text-gray-600">High</p>
                  <p class="text-2xl font-bold text-gray-900">{{ getAlertsBySeverity(AlertSeverity.HIGH).length }}</p>
                </div>
              </div>
            </div>

            <div class="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
              <div class="flex items-center">
                <div class="p-2 bg-yellow-500/20 rounded-lg">
                  <mat-icon class="text-yellow-500">info</mat-icon>
                </div>
                <div class="ml-3">
                  <p class="text-sm font-medium text-gray-600">Medium</p>
                  <p class="text-2xl font-bold text-gray-900">{{ getAlertsBySeverity(AlertSeverity.MEDIUM).length }}</p>
                </div>
              </div>
            </div>

            <div class="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
              <div class="flex items-center">
                <div class="p-2 bg-blue-500/20 rounded-lg">
                  <mat-icon class="text-blue-500">low_priority</mat-icon>
                </div>
                <div class="ml-3">
                  <p class="text-sm font-medium text-gray-600">Low</p>
                  <p class="text-2xl font-bold text-gray-900">{{ getAlertsBySeverity(AlertSeverity.LOW).length }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Alert Tabs -->
          <mat-tab-group class="bg-white rounded-lg shadow">
            <mat-tab label="All Alerts ({{ alerts.length }})">
              <div class="p-4">
                <div class="space-y-4">
                  <div
                    *ngFor="let alert of alerts"
                    class="border rounded-lg p-4 hover:shadow-md transition-shadow"
                    [ngClass]="getAlertBorderClass(alert.severity)">

                    <div class="flex items-start justify-between mb-3">
                      <div class="flex-1">
                        <div class="flex items-center gap-2 mb-2">
                          <h3 class="font-semibold text-gray-900">{{ alert.productName }}</h3>
                          <span
                            class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                            [ngClass]="getSeverityClass(alert.severity)">
                            <mat-icon class="text-xs">{{ getSeverityIcon(alert.severity) }}</mat-icon>
                            {{ alert.severity }}
                          </span>
                        </div>
                        <p class="text-sm text-gray-600">{{ alert.branchName }}</p>
                      </div>
                      <div class="text-right">
                        <div class="text-lg font-bold" [ngClass]="getQuantityClass(alert)">
                          {{ alert.currentQuantity }}
                        </div>
                        <div class="text-xs text-gray-500">units</div>
                      </div>
                    </div>

                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3 text-sm">
                      <div *ngIf="alert.threshold">
                        <span class="font-medium text-gray-600">Threshold:</span>
                        <p class="text-gray-900">{{ alert.threshold }}</p>
                      </div>
                      <div *ngIf="alert.expiryDate">
                        <span class="font-medium text-gray-600">Expires:</span>
                        <p class="text-gray-900">{{ alert.expiryDate | date:'shortDate' }}</p>
                      </div>
                      <div *ngIf="alert.daysUntilExpiry !== undefined">
                        <span class="font-medium text-gray-600">Days Left:</span>
                        <p class="text-gray-900" [ngClass]="getExpiryClass(alert.daysUntilExpiry)">
                          {{ alert.daysUntilExpiry }}
                        </p>
                      </div>
                      <div>
                        <span class="font-medium text-gray-600">Type:</span>
                        <p class="text-gray-900">{{ getAlertTypeLabel(alert.type) }}</p>
                      </div>
                    </div>

                    <div class="flex items-center justify-between">
                      <div class="flex gap-2">
                        <span
                          class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs"
                          [ngClass]="getTypeClass(alert.type)">
                          <mat-icon class="text-xs">{{ getTypeIcon(alert.type) }}</mat-icon>
                          {{ getAlertTypeLabel(alert.type) }}
                        </span>
                      </div>

                      <div class="flex gap-2">
                        <button
                          mat-stroked-button
                          size="small"
                          class="text-brand-sky border-brand-sky hover:bg-brand-sky/10">
                          <mat-icon class="text-xs">edit</mat-icon>
                          Adjust Stock
                        </button>
                        <button
                          mat-stroked-button
                          size="small"
                          class="text-green-600 border-green-300 hover:bg-green-50">
                          <mat-icon class="text-xs">add_shopping_cart</mat-icon>
                          Restock
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </mat-tab>

            <mat-tab label="Low Stock ({{ getAlertsByType(AlertType.LOW_STOCK).length }})">
              <div class="p-4">
                <div class="space-y-4">
                  <div
                    *ngFor="let alert of getAlertsByType(AlertType.LOW_STOCK)"
                    class="border-l-4 border-red-500 bg-red-50 rounded-lg p-4">

                    <div class="flex items-start justify-between mb-3">
                      <div class="flex-1">
                        <h3 class="font-semibold text-gray-900 mb-1">{{ alert.productName }}</h3>
                        <p class="text-sm text-gray-600">{{ alert.branchName }}</p>
                      </div>
                      <div class="text-right">
                        <div class="text-lg font-bold text-red-600">{{ alert.currentQuantity }}</div>
                        <div class="text-xs text-gray-500">units</div>
                      </div>
                    </div>

                    <div class="grid grid-cols-2 gap-4 text-sm mb-3">
                      <div>
                        <span class="font-medium text-gray-600">Threshold:</span>
                        <p class="text-gray-900">{{ alert.threshold }}</p>
                      </div>
                      <div>
                        <span class="font-medium text-gray-600">Severity:</span>
                        <p class="text-gray-900">{{ alert.severity }}</p>
                      </div>
                    </div>

                    <div class="flex justify-end gap-2">
                      <button
                        mat-stroked-button
                        size="small"
                        class="text-brand-sky border-brand-sky hover:bg-brand-sky/10">
                        <mat-icon class="text-xs">add_shopping_cart</mat-icon>
                        Restock
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </mat-tab>

            <mat-tab label="Expiring Soon ({{ getAlertsByType(AlertType.EXPIRING_SOON).length }})">
              <div class="p-4">
                <div class="space-y-4">
                  <div
                    *ngFor="let alert of getAlertsByType(AlertType.EXPIRING_SOON)"
                    class="border-l-4 border-orange-500 bg-orange-50 rounded-lg p-4">

                    <div class="flex items-start justify-between mb-3">
                      <div class="flex-1">
                        <h3 class="font-semibold text-gray-900 mb-1">{{ alert.productName }}</h3>
                        <p class="text-sm text-gray-600">{{ alert.branchName }}</p>
                      </div>
                      <div class="text-right">
                        <div class="text-lg font-bold text-orange-600">{{ alert.currentQuantity }}</div>
                        <div class="text-xs text-gray-500">units</div>
                      </div>
                    </div>

                    <div class="grid grid-cols-2 gap-4 text-sm mb-3">
                      <div>
                        <span class="font-medium text-gray-600">Expires:</span>
                        <p class="text-gray-900">{{ alert.expiryDate | date:'shortDate' }}</p>
                      </div>
                      <div>
                        <span class="font-medium text-gray-600">Days Left:</span>
                        <p class="text-gray-900" [ngClass]="getExpiryClass(alert.daysUntilExpiry)">
                          {{ alert.daysUntilExpiry }}
                        </p>
                      </div>
                    </div>

                    <div class="flex justify-end gap-2">
                      <button
                        mat-stroked-button
                        size="small"
                        class="text-orange-600 border-orange-300 hover:bg-orange-50">
                        <mat-icon class="text-xs">schedule</mat-icon>
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </mat-tab>
          </mat-tab-group>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-3 pt-6">
          <button
            mat-stroked-button
            (click)="close()"
            class="!py-2.5">
            Close
          </button>
        </div>
      </div>
    </div>
  `
})
export class InventoryAlertsDialogComponent implements OnInit {
  private readonly ref = inject(MatDialogRef<InventoryAlertsDialogComponent, any>);
  private readonly inventoryService = inject(InventoryService);

  // Make enums accessible in template
  readonly AlertSeverity = AlertSeverity;
  readonly AlertType = AlertType;

  alerts: InventoryAlertDto[] = [];
  loading = false;

  ngOnInit(): void {
    this.loadAlerts();
  }

  loadAlerts(): void {
    this.loading = true;
    this.inventoryService.getInventoryAlerts().subscribe({
      next: (alerts) => {
        this.alerts = alerts;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading alerts:', error);
        this.loading = false;
      }
    });
  }

  getAlertsBySeverity(severity: AlertSeverity): InventoryAlertDto[] {
    return this.alerts.filter(alert => alert.severity === severity);
  }

  getAlertsByType(type: AlertType): InventoryAlertDto[] {
    return this.alerts.filter(alert => alert.type === type);
  }

  getSeverityClass(severity: AlertSeverity): string {
    switch (severity) {
      case AlertSeverity.CRITICAL: return 'bg-red-100 text-red-800';
      case AlertSeverity.HIGH: return 'bg-orange-100 text-orange-800';
      case AlertSeverity.MEDIUM: return 'bg-yellow-100 text-yellow-800';
      case AlertSeverity.LOW: return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getSeverityIcon(severity: AlertSeverity): string {
    switch (severity) {
      case AlertSeverity.CRITICAL: return 'error';
      case AlertSeverity.HIGH: return 'priority_high';
      case AlertSeverity.MEDIUM: return 'info';
      case AlertSeverity.LOW: return 'low_priority';
      default: return 'help';
    }
  }

  getAlertBorderClass(severity: AlertSeverity): string {
    switch (severity) {
      case AlertSeverity.CRITICAL: return 'border-red-200 bg-red-50/50';
      case AlertSeverity.HIGH: return 'border-orange-200 bg-orange-50/50';
      case AlertSeverity.MEDIUM: return 'border-yellow-200 bg-yellow-50/50';
      case AlertSeverity.LOW: return 'border-blue-200 bg-blue-50/50';
      default: return 'border-gray-200';
    }
  }

  getTypeClass(type: AlertType): string {
    switch (type) {
      case AlertType.LOW_STOCK: return 'bg-red-100 text-red-800';
      case AlertType.EXPIRING_SOON: return 'bg-orange-100 text-orange-800';
      case AlertType.EXPIRED: return 'bg-red-100 text-red-800';
      case AlertType.OVERSTOCK: return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getTypeIcon(type: AlertType): string {
    switch (type) {
      case AlertType.LOW_STOCK: return 'warning';
      case AlertType.EXPIRING_SOON: return 'schedule';
      case AlertType.EXPIRED: return 'error';
      case AlertType.OVERSTOCK: return 'inventory';
      default: return 'info';
    }
  }

  getAlertTypeLabel(type: AlertType): string {
    switch (type) {
      case AlertType.LOW_STOCK: return 'Low Stock';
      case AlertType.EXPIRING_SOON: return 'Expiring Soon';
      case AlertType.EXPIRED: return 'Expired';
      case AlertType.OVERSTOCK: return 'Overstock';
      default: return 'Unknown';
    }
  }

  getQuantityClass(alert: InventoryAlertDto): string {
    if (alert.type === AlertType.LOW_STOCK) return 'text-red-600';
    if (alert.type === AlertType.EXPIRING_SOON) return 'text-orange-600';
    if (alert.type === AlertType.EXPIRED) return 'text-red-600';
    return 'text-gray-900';
  }

  getExpiryClass(days: number | undefined): string {
    if (days === undefined) return 'text-gray-600';
    if (days <= 7) return 'text-red-600 font-medium';
    if (days <= 30) return 'text-orange-600 font-medium';
    return 'text-gray-600';
  }

  close(): void {
    this.ref.close();
  }
}
