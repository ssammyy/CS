import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';

import { FinancialReportComponent } from '../financial-report/financial-report.component';
import { InventoryReportComponent } from '../inventory-report/inventory-report.component';
import { VarianceReportComponent } from '../variance-report/variance-report.component';
import { VatReportComponent } from '../vat-report/vat-report.component';

/**
 * Reports layout component that acts as a container for all report types
 */
@Component({
  selector: 'app-reports-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatTabsModule,
    FinancialReportComponent,
    InventoryReportComponent,
    VarianceReportComponent,
    VatReportComponent
  ],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Tab Navigation -->
      <mat-tab-group class="bg-white border-b border-gray-200">
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon class="mr-2">trending_up</mat-icon>
            <span>Financial Report</span>
          </ng-template>
          <app-financial-report></app-financial-report>
        </mat-tab>

        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon class="mr-2">inventory_2</mat-icon>
            <span>Inventory Report</span>
          </ng-template>
          <app-inventory-report></app-inventory-report>
        </mat-tab>

        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon class="mr-2">compare</mat-icon>
            <span>Variance Report</span>
          </ng-template>
          <app-variance-report></app-variance-report>
        </mat-tab>

        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon class="mr-2">receipt_long</mat-icon>
            <span>VAT Report</span>
          </ng-template>
          <app-vat-report></app-vat-report>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styleUrl: './reports-layout.component.scss'
})
export class ReportsLayoutComponent {}
