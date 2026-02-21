import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { UsersService, UserManagementDto } from '../../core/services/users.service';
import { ErrorService } from '../../core/services/error.service';

/**
 * EditProfileDialog component for editing the logged-in user's own profile.
 * 
 * This dialog allows users to update their own:
 * - Email
 * - Phone number
 * 
 * Note: Users cannot edit their own role, active status, or branch assignments via this dialog.
 * Those must be done by an admin through the user management interface.
 * 
 * The dialog follows the UI Design Language Rule with consistent color palette
 * and component styling.
 */
@Component({
  selector: 'app-edit-profile-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule
  ],
  template: `
  <div class="w-[min(92vw,480px)]">
    <div class="px-6 pt-6 pb-4">
      <div class="h-1.5 w-16 rounded-full bg-gradient-to-r from-brand-sky to-brand-coral mb-4"></div>
      <h2 class="text-2xl font-semibold">Edit Profile</h2>
      <p class="text-gray-600 mt-1 text-sm">Update your personal information</p>
    </div>
    <form #f="ngForm" class="px-6 pb-6 space-y-5" (submit)="$event.preventDefault(); f.valid && submit()">
      <!-- User Information -->
      <div class="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
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

        <!-- Read-only info -->
        <div class="pt-2 space-y-2 text-sm">
          <div class="flex items-center gap-2 text-gray-600">
            <mat-icon class="text-gray-400 text-base">badge</mat-icon>
            <span>Role: <span class="font-medium">{{ user.role }}</span></span>
          </div>
          <div *ngIf="user.branches && user.branches.length > 0" class="flex items-start gap-2 text-gray-600">
            <mat-icon class="text-gray-400 text-base mt-0.5">store</mat-icon>
            <div>
              <span>Branches: </span>
              <span class="font-medium">{{ user.branches.join(', ') }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex justify-end gap-3 pt-2">
        <button mat-stroked-button type="button" (click)="close()" class="!py-2.5">Cancel</button>
        <button mat-raised-button color="primary" type="submit" class="!py-2.5" [disabled]="!f.valid || saving">
          <mat-icon *ngIf="!saving">save</mat-icon>
          <span *ngIf="saving">Saving...</span>
          <span *ngIf="!saving">Save Changes</span>
        </button>
      </div>
    </form>
  </div>
  `
})
export class EditProfileDialog implements OnInit {
  private readonly ref = inject(MatDialogRef<EditProfileDialog>);
  private readonly data = inject<{ user: UserManagementDto }>(MAT_DIALOG_DATA);
  private readonly http = inject(HttpClient);
  private readonly usersService = inject(UsersService);
  private readonly errorSvc = inject(ErrorService);

  user: UserManagementDto = this.data.user;
  
  formData = {
    email: this.user.email,
    phone: this.user.phone || ''
  };

  saving = false;

  ngOnInit(): void {
    // Ensure we have the latest user data
    this.usersService.loadUsers(true);
  }

  /**
   * Submits the form and updates the user profile via the /users/me endpoint
   */
  submit(): void {
    if (this.saving) return;
    this.saving = true;

    // Use the /users/me endpoint for updating current user
    this.http.patch<UserManagementDto>(`${environment.apiBaseUrl}/users/me`, {
      email: this.formData.email,
      phone: this.formData.phone || undefined
    }).subscribe({
      next: (updated) => {
        this.saving = false;
        // Update localStorage with new email
        const authUser = JSON.parse(localStorage.getItem('auth_user') || '{}');
        if (authUser) {
          authUser.email = updated.email;
          localStorage.setItem('auth_user', JSON.stringify(authUser));
        }
        // Refresh users list
        this.usersService.loadUsers(true);
        this.ref.close(updated);
      },
      error: (err) => {
        this.saving = false;
        this.errorSvc.show(err?.error?.message || 'Failed to update profile');
      }
    });
  }

  close(): void {
    this.ref.close(null);
  }
}
