import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { UsersService, UserManagementDto } from '../../core/services/users.service';
import { BranchesService, BranchDto, UserBranchAssignmentDto, AssignUserToBranchRequest, RemoveUserFromBranchRequest, UpdateUserBranchPrimaryRequest } from '../../core/services/branches.service';
import { ErrorService } from '../../core/services/error.service';

/**
 * EditUserDialog component for editing user details.
 *
 * This dialog allows administrators to:
 * - Update user email, role, and active status
 * - Manage user branch assignments (add/remove branches, set primary branch)
 * - Delete the user (with confirmation)
 *
 * The dialog follows the UI Design Language Rule with consistent color palette
 * and component styling.
 */
@Component({
  selector: 'app-edit-user-dialog',
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
    MatCheckboxModule,
    MatChipsModule
  ],
  template: `
  <div class=" max-h-[90vh] overflow-y-auto">
    <div class="sticky top-0 bg-white z-10 border-b border-gray-200 px-6 pt-5 pb-4">
      <div class="h-1.5 w-16 rounded-full bg-gradient-to-r from-brand-sky to-brand-coral mb-3"></div>
      <h2 class="text-2xl font-semibold">Edit User</h2>
      <p class="text-gray-600 mt-1 text-sm">Update user information and branch assignments</p>
    </div>
    <form #f="ngForm" class="p-6 space-y-5" (submit)="$event.preventDefault(); f.valid && submit()">
      <!-- User Information Section -->
      <div class="bg-white rounded-lg border border-gray-200 p-5">
        <h3 class="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <mat-icon class="text-brand-sky text-lg">person</mat-icon>
          User Information
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Username (read-only) -->
          <mat-form-field class="w-full" color="primary">
            <mat-label>Username</mat-label>
            <mat-icon matPrefix class="mr-2 opacity-60">person</mat-icon>
            <input matInput [value]="user.username" readonly disabled />
          </mat-form-field>

          <!-- Email -->
          <mat-form-field class="w-full" color="primary">
            <mat-label>Email</mat-label>
            <mat-icon matPrefix class="mr-2 opacity-60">mail</mat-icon>
            <input matInput type="email" name="email" [(ngModel)]="formData.email" required />
          </mat-form-field>

          <!-- Phone -->
          <mat-form-field class="w-full" color="primary">
            <mat-label>Phone Number</mat-label>
            <mat-icon matPrefix class="mr-2 opacity-60">phone</mat-icon>
            <input matInput type="tel" name="phone" [(ngModel)]="formData.phone" placeholder="e.g., +254712345678" />
          </mat-form-field>

          <!-- Role -->
          <mat-form-field class="w-full" color="primary">
            <mat-label>Role</mat-label>
            <mat-icon matPrefix class="mr-2 opacity-60">badge</mat-icon>
            <mat-select name="role" [(ngModel)]="formData.role" required [panelClass]="'select-on-top'">
              <mat-option *ngFor="let r of roles" [value]="r">{{ r }}</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <!-- Active Status -->
        <div class="mt-4 flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50">
          <mat-checkbox [(ngModel)]="formData.isActive" name="isActive" color="primary"></mat-checkbox>
          <div>
            <div class="font-medium text-gray-900">Active</div>
            <div class="text-xs text-gray-500">Inactive users cannot log in</div>
          </div>
        </div>
      </div>

      <!-- Branch Management Section -->
      <div class="bg-white rounded-lg border border-gray-200 p-5">
        <h3 class="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <mat-icon class="text-brand-sky text-lg">store</mat-icon>
          Branch Assignments
        </h3>

        <!-- Current Branches -->
        <div *ngIf="userBranches.length > 0" class="mb-4">
          <div class="text-sm font-medium text-gray-700 mb-2">Assigned Branches:</div>
          <div class="space-y-2">
            <div
              *ngFor="let ub of userBranches"
              class="flex items-center justify-between p-3 rounded-lg border"
              [ngClass]="ub.isPrimary ? 'bg-brand-sky/10 border-brand-sky/30' : 'bg-gray-50 border-gray-200'">
              <div class="flex items-center gap-2">
                <mat-icon *ngIf="ub.isPrimary" fontIcon="star" class="text-brand-sky text-sm"></mat-icon>
                <span class="font-medium" [ngClass]="ub.isPrimary ? 'text-brand-sky' : 'text-gray-700'">{{ ub.branchName }}</span>
                <span *ngIf="ub.isPrimary" class="text-xs text-brand-sky">(Primary)</span>
              </div>
              <div class="flex items-center gap-2">
                <button
                  *ngIf="!ub.isPrimary"
                  type="button"
                  mat-stroked-button
                  class="!text-xs !py-1 !px-2"
                  (click)="setPrimaryBranch(ub.branchId)"
                  [attr.aria-label]="'Set ' + ub.branchName + ' as primary'">
                  Set Primary
                </button>
                <button
                  type="button"
                  mat-icon-button
                  class="!w-8 !h-8 !min-w-8"
                  (click)="removeBranch(ub.branchId)"
                  [attr.aria-label]="'Remove ' + ub.branchName">
                  <mat-icon class="!text-sm">close</mat-icon>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Add Branch -->
        <div class="space-y-3">
          <mat-form-field class="w-full" color="primary">
            <mat-label>Add Branch</mat-label>
            <mat-icon matPrefix class="mr-2 opacity-60">add_business</mat-icon>
            <mat-select name="selectedBranch" [(ngModel)]="selectedBranchId" [panelClass]="'select-on-top'">
              <mat-option [value]="null">Select a branch...</mat-option>
              <mat-option
                *ngFor="let branch of availableBranches"
                [value]="branch.id"
                [disabled]="isBranchAssigned(branch.id)">
                {{ branch.name }} - {{ branch.location }}
              </mat-option>
            </mat-select>
          </mat-form-field>

          <div *ngIf="selectedBranchId" class="flex items-center gap-3 p-3 rounded-lg border border-gray-200">
            <mat-checkbox [(ngModel)]="setAsPrimary" name="setAsPrimary" color="primary"></mat-checkbox>
            <div>
              <div class="font-medium text-gray-900">Set as Primary Branch</div>
              <div class="text-xs text-gray-500">The user's default branch for operations</div>
            </div>
          </div>

          <button
            type="button"
            mat-stroked-button
            color="primary"
            (click)="addBranch()"
            [disabled]="!selectedBranchId"
            class="w-full">
            <mat-icon>add</mat-icon>
            Add Branch
          </button>
        </div>
      </div>

      <!-- Actions -->
      <div class="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 -mx-6 -mb-6 flex justify-between items-center">
        <button
          type="button"
          mat-stroked-button
          color="warn"
          (click)="deleteUser()"
          class="!py-2.5">
          <mat-icon>delete</mat-icon>
          Delete User
        </button>
        <div class="flex gap-3">
          <button mat-stroked-button type="button" (click)="close()" class="!py-2.5">Cancel</button>
          <button mat-raised-button color="primary" type="submit" class="!py-2.5" [disabled]="!f.valid || saving">
            <mat-icon *ngIf="!saving">save</mat-icon>
            <span *ngIf="saving">Saving...</span>
            <span *ngIf="!saving">Save Changes</span>
          </button>
        </div>
      </div>
    </form>
  </div>
  `
})
export class EditUserDialog implements OnInit {
  private readonly ref = inject(MatDialogRef<EditUserDialog>);
  private readonly data = inject<{ user: UserManagementDto }>(MAT_DIALOG_DATA);
  private readonly http = inject(HttpClient);
  private readonly usersService = inject(UsersService);
  private readonly branchesService = inject(BranchesService);
  private readonly errorSvc = inject(ErrorService);

  user: UserManagementDto = this.data.user;
  roles: string[] = [];
  availableBranches: BranchDto[] = [];
  userBranches: UserBranchAssignmentDto[] = [];

  formData = {
    email: this.user.email,
    phone: this.user.phone || '',
    role: (this.user.role === 'TENANT_ADMIN' ? 'ADMIN' : this.user.role) as string,
    isActive: this.user.isActive
  };

  selectedBranchId: string | null = null;
  setAsPrimary = false;
  saving = false;

  ngOnInit(): void {
    this.loadRoles();
    this.loadBranches();
    this.loadUserBranches();
  }

  /**
   * Loads available roles from the API
   */
  private loadRoles(): void {
    // Map TENANT_ADMIN to ADMIN; backend expects ADMIN when selecting admin role
    this.http.get<{ roles: string[] }>(`${environment.apiBaseUrl}/users/roles`).subscribe({
      next: (res) => {
        const raw = (res.roles || []).filter(r => r !== 'PLATFORM_ADMIN');
        this.roles = [...new Set(raw.map(r => r === 'TENANT_ADMIN' ? 'ADMIN' : r))];
        if (this.roles.length === 0) {
          this.roles = ['USER', 'ADMIN'];
        }
      },
      error: () => {
        console.log('Failed to fetch roles, using defaults');
        this.roles = ['USER', 'ADMIN'];
      }
    });
  }

  /**
   * Loads available branches from the branches service
   */
  private loadBranches(): void {
    this.branchesService.loadBranches();
    this.branchesService.branches$.subscribe(branches => {
      if (branches) {
        this.availableBranches = branches.filter(b => b.isActive);
      }
    });
  }

  /**
   * Loads the user's current branch assignments
   */
  private loadUserBranches(): void {
    this.branchesService.getBranchesByUser(this.user.id)
      .subscribe({
        next: (branches) => {
          this.userBranches = branches;
        },
        error: (err) => {
          console.error('Failed to load user branches:', err);
          this.errorSvc.show('Failed to load user branch assignments');
        }
      });
  }

  /**
   * Checks if a branch is already assigned to the user
   */
  isBranchAssigned(branchId: string): boolean {
    return this.userBranches.some(ub => ub.branchId === branchId);
  }

  /**
   * Adds a branch to the user's assignments
   */
  addBranch(): void {
    if (!this.selectedBranchId) return;

    const request: AssignUserToBranchRequest = {
      userId: this.user.id,
      branchId: this.selectedBranchId,
      isPrimary: this.setAsPrimary
    };

    this.branchesService.assignUserToBranch(request).subscribe({
      next: () => {
        this.loadUserBranches();
        this.selectedBranchId = null;
        this.setAsPrimary = false;
        this.usersService.loadUsers(true); // Refresh user list
      },
      error: (err) => {
        this.errorSvc.show(err?.error?.message || 'Failed to assign branch to user');
      }
    });
  }

  /**
   * Sets a branch as the primary branch for the user
   * Uses the dedicated update endpoint to change the primary status
   */
  setPrimaryBranch(branchId: string): void {
    const branch = this.userBranches.find(ub => ub.branchId === branchId);
    if (!branch) return;

    const request: UpdateUserBranchPrimaryRequest = {
      userId: this.user.id,
      branchId: branchId,
      isPrimary: true
    };

    this.branchesService.updateUserBranchPrimary(request).subscribe({
      next: () => {
        this.loadUserBranches();
        this.usersService.loadUsers(true); // Refresh user list
      },
      error: (err) => {
        this.errorSvc.show(err?.error?.message || 'Failed to set primary branch');
        // Reload branches to restore state
        this.loadUserBranches();
      }
    });
  }

  /**
   * Removes a branch from the user's assignments
   */
  removeBranch(branchId: string): void {
    if (!confirm(`Remove this branch assignment?`)) return;

    const request: RemoveUserFromBranchRequest = {
      userId: this.user.id,
      branchId: branchId
    };

    this.branchesService.removeUserFromBranch(request).subscribe({
      next: () => {
        this.loadUserBranches();
        this.usersService.loadUsers(true); // Refresh user list
      },
      error: (err) => {
        this.errorSvc.show(err?.error?.message || 'Failed to remove branch assignment');
      }
    });
  }

  /**
   * Submits the form and updates the user
   */
  submit(): void {
    if (this.saving) return;
    this.saving = true;

    this.usersService.updateUser(this.user.id, {
      email: this.formData.email,
      phone: this.formData.phone || undefined,
      role: this.formData.role as 'USER' | 'ADMIN',
      isActive: this.formData.isActive
    }).subscribe({
      next: () => {
        this.saving = false;
        this.ref.close(true);
      },
      error: (err) => {
        this.saving = false;
        this.errorSvc.show(err?.error?.message || 'Failed to update user');
      }
    });
  }

  /**
   * Deletes the user after confirmation
   */
  deleteUser(): void {
    if (!confirm(`Are you sure you want to delete user "${this.user.username}"? This action cannot be undone.`)) {
      return;
    }

    this.usersService.deleteUser(this.user.id).subscribe({
      next: () => {
        this.ref.close('deleted');
      },
      error: (err) => {
        this.errorSvc.show(err?.error?.message || 'Failed to delete user');
      }
    });
  }

  close(): void {
    this.ref.close(null);
  }
}
