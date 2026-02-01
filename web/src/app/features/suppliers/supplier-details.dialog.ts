import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';

// Professional Button Components
import { 
  PrimaryButtonComponent, 
  SecondaryButtonComponent 
} from '../../shared/components';

import { SupplierDto } from '../../core/services/suppliers.service';

/**
 * Dialog component for viewing supplier details.
 * Displays comprehensive supplier information in a read-only format.
 */
@Component({
  selector: 'app-supplier-details-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatChipsModule,
    PrimaryButtonComponent,
    SecondaryButtonComponent
  ],
  template: `
    <div class="h-[min(92vh,800px)] overflow-y-auto">
      <div class="px-5 pt-5">
        <div class="h-1.5 w-16 rounded-full bg-gradient-to-r from-brand-sky to-brand-coral mb-4"></div>
        <h2 class="text-2xl font-semibold">Supplier Details</h2>
        <p class="text-gray-600 mt-1 text-sm">Comprehensive information about {{ supplier.name }}</p>
      </div>

      <div class="p-5 pt-3 space-y-6">
        <!-- Header with Status and Category -->
        <div class="bg-gradient-to-r from-brand-sky/10 to-brand-coral/10 p-6 rounded-lg border border-brand-sky/20">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center mb-3">
                <div class="h-12 w-12 rounded-full bg-brand-sky/20 flex items-center justify-center mr-4">
                  <mat-icon class="text-brand-sky text-2xl">business</mat-icon>
                </div>
                <div>
                  <h1 class="text-3xl font-bold text-gray-900">{{ supplier.name }}</h1>
                  <p class="text-lg text-gray-600">{{ supplier.tenantName }}</p>
                </div>
              </div>
              <div class="flex flex-wrap gap-2">
                <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                      [ngClass]="getStatusClasses(supplier.status)">
                  {{ getStatusDisplayName(supplier.status) }}
                </span>
                <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                  {{ getCategoryDisplayName(supplier.category) }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Basic Information Section -->
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <mat-icon class="text-brand-sky">business</mat-icon>
            Basic Information
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-4">
              <div>
                <label class="text-sm font-medium text-gray-600">Contact Person</label>
                <p class="text-gray-900">{{ supplier.contactPerson || 'Not specified' }}</p>
              </div>
              <div>
                <label class="text-sm font-medium text-gray-600">Phone Number</label>
                <p class="text-gray-900">{{ supplier.phone || 'Not specified' }}</p>
              </div>
            </div>
            <div class="space-y-4">
              <div>
                <label class="text-sm font-medium text-gray-600">Email Address</label>
                <p class="text-gray-900">{{ supplier.email || 'Not specified' }}</p>
              </div>
              <div>
                <label class="text-sm font-medium text-gray-600">Payment Terms</label>
                <p class="text-gray-900">{{ supplier.paymentTerms || 'Not specified' }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Address Section -->
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <mat-icon class="text-brand-sky">location_on</mat-icon>
            Address Information
          </h3>
          <div>
            <label class="text-sm font-medium text-gray-600">Physical Address</label>
            <p class="text-gray-900 mt-2 leading-relaxed">{{ supplier.physicalAddress || 'Not specified' }}</p>
          </div>
        </div>

        <!-- Financial Information Section -->
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <mat-icon class="text-brand-sky">account_balance</mat-icon>
            Financial Information
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-4">
              <div>
                <label class="text-sm font-medium text-gray-600">Tax Identification Number</label>
                <p class="text-gray-900">{{ supplier.taxIdentificationNumber || 'Not specified' }}</p>
              </div>
            </div>
            <div class="space-y-4">
              <div>
                <label class="text-sm font-medium text-gray-600">Credit Limit</label>
                <p class="text-gray-900">
                  {{ supplier.creditLimit ? 'KES ' + supplier.creditLimit.toLocaleString() : 'Not specified' }}
                </p>
              </div>
            </div>
          </div>
          <div *ngIf="supplier.bankAccountDetails" class="mt-6">
            <label class="text-sm font-medium text-gray-600">Bank Account Details</label>
            <p class="text-gray-900 mt-2 leading-relaxed">{{ supplier.bankAccountDetails }}</p>
          </div>
        </div>

        <!-- Additional Information Section -->
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <mat-icon class="text-brand-sky">note</mat-icon>
            Additional Information
          </h3>
          <div>
            <label class="text-sm font-medium text-gray-600">Notes</label>
            <p class="text-gray-900 mt-2 leading-relaxed">{{ supplier.notes || 'No additional notes' }}</p>
          </div>
        </div>

        <!-- System Information Section -->
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <mat-icon class="text-brand-sky">info</mat-icon>
            System Information
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-4">
              <div>
                <label class="text-sm font-medium text-gray-600">Created</label>
                <p class="text-gray-900">{{ formatDate(supplier.createdAt) }}</p>
              </div>
            </div>
            <div class="space-y-4">
              <div>
                <label class="text-sm font-medium text-gray-600">Last Updated</label>
                <p class="text-gray-900">{{ supplier.updatedAt ? formatDate(supplier.updatedAt) : 'Never updated' }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex justify-end gap-3 pt-4">
          <button
            mat-stroked-button
            (click)="onClose()"
            class="!py-2.5">
            Close
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class SupplierDetailsDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<SupplierDetailsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public supplier: SupplierDto
  ) {}

  getStatusDisplayName(status: string): string {
    switch (status) {
      case 'ACTIVE':
        return 'Active';
      case 'INACTIVE':
        return 'Inactive';
      case 'SUSPENDED':
        return 'Suspended';
      case 'BLACKLISTED':
        return 'Blacklisted';
      default:
        return status;
    }
  }

  getCategoryDisplayName(category: string): string {
    switch (category) {
      case 'WHOLESALER':
        return 'Wholesaler';
      case 'MANUFACTURER':
        return 'Manufacturer';
      case 'DISTRIBUTOR':
        return 'Distributor';
      case 'IMPORTER':
        return 'Importer';
      case 'SPECIALTY':
        return 'Specialty';
      default:
        return category;
    }
  }

  getStatusClasses(status: string): string {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'INACTIVE':
        return 'bg-gray-100 text-gray-800';
      case 'SUSPENDED':
        return 'bg-orange-100 text-orange-800';
      case 'BLACKLISTED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  onClose(): void {
    this.dialogRef.close();
  }

  onEdit(): void {
    // This could emit an event to trigger editing, or close and open edit dialog
    this.dialogRef.close({ action: 'edit', supplier: this.supplier });
  }
}


