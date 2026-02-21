import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { CreateBranchRequest, BranchDto, UpdateBranchRequest } from '../../core/services/branches.service';

/**
 * CreateBranchDialogComponent provides a form for creating new branches.
 * It follows the same pattern as the user creation dialog for consistency.
 */
@Component({
  selector: 'app-create-branch-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatIconModule, MatButtonModule, MatCheckboxModule],
  template: `
  <div class="w-[min(92vw,560px)] h-[min(92vh,700px)] overflow-y-auto">
      <div class="px-5 pt-5">
      <div class="h-1.5 w-16 rounded-full bg-gradient-to-r from-brand-sky to-brand-coral mb-4"></div>
      <h2 class="text-2xl font-semibold">{{ isEditMode ? 'Edit Branch' : 'Create Branch' }}</h2>
      <p class="text-gray-600 mt-1 text-sm">{{ isEditMode ? 'Update branch information' : 'Add a new branch to this tenant' }}</p>
    </div>
    <form #f="ngForm" class="p-5 pt-3 space-y-6" (submit)="$event.preventDefault(); f.valid && submit(f.value)">
      <div class="bg-white rounded-lg shadow p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <mat-icon class="text-brand-sky">store</mat-icon>
          Branch Information
        </h3>
        <div class="space-y-4">
          <mat-form-field class="w-full" color="primary">
            <mat-label>Branch Name</mat-label>
            <mat-icon matPrefix class="mr-2 opacity-60">store</mat-icon>
            <input matInput name="name" [ngModel]="branchData?.name" ngModel required />
          </mat-form-field>

          <mat-form-field class="w-full" color="primary">
            <mat-label>Location</mat-label>
            <mat-icon matPrefix class="mr-2 opacity-60">location_on</mat-icon>
            <input matInput name="location" [ngModel]="branchData?.location" ngModel required placeholder="e.g., City, District" />
          </mat-form-field>

          <mat-form-field class="w-full" color="primary">
            <mat-label>Contact Email</mat-label>
            <mat-icon matPrefix class="mr-2 opacity-60">mail</mat-icon>
            <input matInput type="email" name="contactEmail" [ngModel]="branchData?.contactEmail" ngModel required placeholder="branch@business.com" />
          </mat-form-field>

          <mat-form-field class="w-full" color="primary">
            <mat-label>Contact Phone</mat-label>
            <mat-icon matPrefix class="mr-2 opacity-60">phone</mat-icon>
            <input matInput name="contactPhone" [ngModel]="branchData?.contactPhone" ngModel required placeholder="+1234567890" />
          </mat-form-field>

          <mat-form-field class="w-full" color="primary">
            <mat-label>Address</mat-label>
            <mat-icon matPrefix class="mr-2 opacity-60">home</mat-icon>
            <textarea matInput name="address" [ngModel]="branchData?.address" ngModel required rows="3" placeholder="Enter full branch address"></textarea>
          </mat-form-field>

          <div *ngIf="isEditMode" class="flex items-center gap-2 pt-2">
            <mat-checkbox name="isActive" [ngModel]="branchData?.isActive" ngModel>
              Active Branch
            </mat-checkbox>
            <span class="text-sm text-gray-600">Uncheck to deactivate this branch</span>
          </div>
        </div>
      </div>

      <div class="flex justify-end gap-3 pt-4">
        <button mat-stroked-button type="button" (click)="close()" class="!py-2.5">Cancel</button>
        <button mat-raised-button color="primary" type="submit" class="!py-2.5" [disabled]="!f.valid">
          <mat-icon>{{ isEditMode ? 'save' : 'add' }}</mat-icon>
          {{ isEditMode ? 'Update Branch' : 'Create Branch' }}
        </button>
      </div>
    </form>
  </div>
  `
})
export class CreateBranchDialogComponent implements OnInit {
  private readonly ref = inject(MatDialogRef<CreateBranchDialogComponent, any>);
  private readonly dialogData = inject<{ branch?: BranchDto } | null>(MAT_DIALOG_DATA, { optional: true });
  
  branchData: BranchDto | null = null;
  isEditMode = false;

  ngOnInit(): void {
    if (this.dialogData?.branch) {
      this.branchData = this.dialogData.branch;
      this.isEditMode = true;
    }
  }
  
  close(): void { this.ref.close(null); }
  
  submit(value: any): void {
    if (this.isEditMode && this.branchData) {
      // Transform the form data to match UpdateBranchRequest interface
      const updateData: UpdateBranchRequest = {
        name: value.name?.trim() || this.branchData.name,
        location: value.location?.trim() || this.branchData.location,
        contactEmail: value.contactEmail?.trim() || this.branchData.contactEmail,
        contactPhone: value.contactPhone?.trim() || this.branchData.contactPhone,
        address: value.address?.trim() || this.branchData.address,
        isActive: value.isActive !== undefined ? value.isActive : this.branchData.isActive
      };
      this.ref.close({ ...updateData, id: this.branchData.id });
    } else {
      // Transform the form data to match CreateBranchRequest interface
      const branchData: CreateBranchRequest = {
        name: value.name?.trim() || '',
        location: value.location?.trim() || '',
        contactEmail: value.contactEmail?.trim() || '',
        contactPhone: value.contactPhone?.trim() || '',
        address: value.address?.trim() || ''
      };
      this.ref.close(branchData);
    }
  }
}
