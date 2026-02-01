import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';

// Professional Button Components
import { 
  PrimaryButtonComponent, 
  SecondaryButtonComponent 
} from '../../shared/components';

import { 
  SupplierDto,
  UpdateSupplierRequest, 
  SupplierCategory, 
  SupplierStatus 
} from '../../core/services/suppliers.service';

/**
 * Dialog component for editing existing suppliers.
 * Provides a pre-populated form for updating supplier information.
 */
@Component({
  selector: 'app-edit-supplier-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    PrimaryButtonComponent,
    SecondaryButtonComponent
  ],
  template: `
    <div class="h-[min(92vh,800px)] overflow-y-auto">
      <div class="px-5 pt-5">
        <div class="h-1.5 w-16 rounded-full bg-gradient-to-r from-brand-sky to-brand-coral mb-4"></div>
        <h2 class="text-2xl font-semibold">Edit Supplier</h2>
        <p class="text-gray-600 mt-1 text-sm">Update supplier information and details</p>
      </div>

      <form #supplierForm="ngForm" (ngSubmit)="onSubmit()" class="p-5 pt-3 space-y-6">
        <!-- Basic Information Section -->
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <mat-icon class="text-brand-sky">business</mat-icon>
            Basic Information
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <mat-form-field class="w-full">
              <mat-label>Supplier Name *</mat-label>
              <input 
                matInput 
                [(ngModel)]="supplier.name" 
                name="name"
                required
                placeholder="Enter supplier name"
                class="!text-gray-900" />
              <mat-error *ngIf="supplierForm.submitted && !supplier.name">
                Supplier name is required
              </mat-error>
            </mat-form-field>

            <mat-form-field class="w-full">
              <mat-label>Contact Person</mat-label>
              <input 
                matInput 
                [(ngModel)]="supplier.contactPerson" 
                name="contactPerson"
                placeholder="Primary contact person" />
            </mat-form-field>

            <mat-form-field class="w-full">
              <mat-label>Phone Number</mat-label>
              <input 
                matInput 
                [(ngModel)]="supplier.phone" 
                name="phone"
                placeholder="+1 (555) 123-4567" />
            </mat-form-field>

            <mat-form-field class="w-full">
              <mat-label>Email Address</mat-label>
              <input 
                matInput 
                [(ngModel)]="supplier.email" 
                name="email"
                type="email"
                placeholder="contact@supplier.com" />
            </mat-form-field>
          </div>
        </div>

        <!-- Address Section -->
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <mat-icon class="text-brand-sky">location_on</mat-icon>
            Address Information
          </h3>
          <mat-form-field class="w-full">
            <mat-label>Physical Address</mat-label>
            <textarea 
              matInput 
              [(ngModel)]="supplier.physicalAddress" 
              name="physicalAddress"
              rows="3"
              placeholder="Enter complete physical address"></textarea>
          </mat-form-field>
        </div>

        <!-- Business Details Section -->
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <mat-icon class="text-brand-sky">receipt_long</mat-icon>
            Business Details
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <mat-form-field class="w-full">
              <mat-label>Category *</mat-label>
              <mat-select [(ngModel)]="supplier.category" name="category" required>
                <mat-option *ngFor="let category of categories" [value]="category.value">
                  {{ category.label }}
                </mat-option>
              </mat-select>
              <mat-error *ngIf="supplierForm.submitted && !supplier.category">
                Category is required
              </mat-error>
            </mat-form-field>

            <mat-form-field class="w-full">
              <mat-label>Status *</mat-label>
              <mat-select [(ngModel)]="supplier.status" name="status" required>
                <mat-option *ngFor="let status of statuses" [value]="status.value">
                  {{ status.label }}
                </mat-option>
              </mat-select>
              <mat-error *ngIf="supplierForm.submitted && !supplier.status">
                Status is required
              </mat-error>
            </mat-form-field>

            <mat-form-field class="w-full">
              <mat-label>Payment Terms</mat-label>
              <input 
                matInput 
                [(ngModel)]="supplier.paymentTerms" 
                name="paymentTerms"
                placeholder="e.g., Net 30, Net 45" />
            </mat-form-field>

            <mat-form-field class="w-full">
              <mat-label>Credit Limit</mat-label>
              <input 
                matInput 
                [(ngModel)]="supplier.creditLimit" 
                name="creditLimit"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00" />
            </mat-form-field>
          </div>
        </div>

        <!-- Financial Information Section -->
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <mat-icon class="text-brand-sky">account_balance</mat-icon>
            Financial Information
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <mat-form-field class="w-full">
              <mat-label>Tax Identification Number</mat-label>
              <input 
                matInput 
                [(ngModel)]="supplier.taxIdentificationNumber" 
                name="taxIdentificationNumber"
                placeholder="TAX ID or VAT number" />
            </mat-form-field>

            <mat-form-field class="w-full">
              <mat-label>Bank Account Details</mat-label>
              <textarea 
                matInput 
                [(ngModel)]="supplier.bankAccountDetails" 
                name="bankAccountDetails"
                rows="2"
                placeholder="Bank name, account number, routing info"></textarea>
            </mat-form-field>
          </div>
        </div>

        <!-- Additional Information Section -->
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <mat-icon class="text-brand-sky">note</mat-icon>
            Additional Information
          </h3>
          <mat-form-field class="w-full">
            <mat-label>Notes</mat-label>
            <textarea 
              matInput 
              [(ngModel)]="supplier.notes" 
              name="notes"
              rows="3"
              placeholder="Additional notes, special requirements, or comments"></textarea>
          </mat-form-field>
        </div>

        <!-- Form Actions -->
        <div class="flex justify-end gap-3 pt-4">
          <button
            mat-stroked-button
            type="button"
            (click)="onCancel()"
            class="!py-2.5">
            Cancel
          </button>
          <button
            mat-raised-button
            color="primary"
            type="submit"
            [disabled]="supplierForm.invalid || submitting"
            class="!py-2.5">
            <mat-icon>save</mat-icon>
            Update Supplier
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    
    .mat-form-field {
      width: 100%;
    }
  `]
})
export class EditSupplierDialogComponent implements OnInit {
  supplier: UpdateSupplierRequest = {};
  originalSupplier: SupplierDto;
  submitting = false;

  categories = [
    { value: SupplierCategory.WHOLESALER, label: 'Wholesaler' },
    { value: SupplierCategory.MANUFACTURER, label: 'Manufacturer' },
    { value: SupplierCategory.DISTRIBUTOR, label: 'Distributor' },
    { value: SupplierCategory.IMPORTER, label: 'Importer' },
    { value: SupplierCategory.SPECIALTY, label: 'Specialty' }
  ];

  statuses = [
    { value: SupplierStatus.ACTIVE, label: 'Active' },
    { value: SupplierStatus.INACTIVE, label: 'Inactive' },
    { value: SupplierStatus.SUSPENDED, label: 'Suspended' },
    { value: SupplierStatus.BLACKLISTED, label: 'Blacklisted' }
  ];

  constructor(
    public dialogRef: MatDialogRef<EditSupplierDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SupplierDto
  ) {
    this.originalSupplier = data;
  }

  ngOnInit(): void {
    // Pre-populate the form with existing supplier data
    this.supplier = {
      name: this.originalSupplier.name,
      contactPerson: this.originalSupplier.contactPerson,
      phone: this.originalSupplier.phone,
      email: this.originalSupplier.email,
      physicalAddress: this.originalSupplier.physicalAddress,
      paymentTerms: this.originalSupplier.paymentTerms,
      category: this.originalSupplier.category,
      status: this.originalSupplier.status,
      taxIdentificationNumber: this.originalSupplier.taxIdentificationNumber,
      bankAccountDetails: this.originalSupplier.bankAccountDetails,
      creditLimit: this.originalSupplier.creditLimit,
      notes: this.originalSupplier.notes
    };
  }

  onSubmit(): void {
    if (this.supplier.name?.trim() && this.supplier.category && this.supplier.status) {
      this.submitting = true;
      
      // Clean up the data before sending
      const cleanSupplier: UpdateSupplierRequest = {
        name: this.supplier.name?.trim(),
        contactPerson: this.supplier.contactPerson?.trim() || undefined,
        phone: this.supplier.phone?.trim() || undefined,
        email: this.supplier.email?.trim() || undefined,
        physicalAddress: this.supplier.physicalAddress?.trim() || undefined,
        paymentTerms: this.supplier.paymentTerms?.trim() || undefined,
        category: this.supplier.category,
        status: this.supplier.status,
        taxIdentificationNumber: this.supplier.taxIdentificationNumber?.trim() || undefined,
        bankAccountDetails: this.supplier.bankAccountDetails?.trim() || undefined,
        creditLimit: this.supplier.creditLimit,
        notes: this.supplier.notes?.trim() || undefined
      };

      this.dialogRef.close(cleanSupplier);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}


