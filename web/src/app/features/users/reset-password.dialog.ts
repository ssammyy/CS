import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, AbstractControl, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { UsersService } from '../../core/services/users.service';
import { UserManagementDto } from '../../core/services/users.service';

/**
 * Dialog for an admin to set a new password for another user (e.g. when they forget their password).
 * The user will be required to change password on next login.
 */
@Component({
  selector: 'app-reset-password-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule
  ],
  styles: [`
    .reset-password-field { display: block; }
    :host ::ng-deep .reset-password-field .mat-mdc-form-field-subscript-wrapper { display: none; }
  `],
  template: `
  <div class="w-[min(92vw,400px)]">
    <div class="px-6 pt-6 pb-4">
      <div class="h-1.5 w-16 rounded-full bg-gradient-to-r from-brand-sky to-brand-coral mb-4"></div>
      <h2 class="text-xl font-semibold">Reset password</h2>
      <p class="text-gray-600 mt-1 text-sm">Set a new password for <strong>{{ data.user.username }}</strong>. They will be required to change it on next login.</p>
    </div>
    <form [formGroup]="form" (ngSubmit)="onSubmit()" class="px-6 pb-6 space-y-5">
      <div class="space-y-4">
        <mat-form-field class="w-full reset-password-field" color="primary" appearance="fill">
          <mat-label>New password</mat-label>
          <mat-icon matPrefix class="mr-2 opacity-60">lock</mat-icon>
          <input matInput [type]="hideNew ? 'password' : 'text'" formControlName="newPassword" autocomplete="new-password" />
          <button mat-icon-button matSuffix type="button" (click)="hideNew = !hideNew" [attr.aria-label]="hideNew ? 'Show' : 'Hide'">
            <mat-icon>{{ hideNew ? 'visibility' : 'visibility_off' }}</mat-icon>
          </button>
          <mat-error *ngIf="form.controls.newPassword.invalid && form.controls.newPassword.touched">At least 6 characters</mat-error>
        </mat-form-field>

        <mat-form-field class="w-full reset-password-field" color="primary" appearance="fill">
          <mat-label>Confirm new password</mat-label>
          <mat-icon matPrefix class="mr-2 opacity-60">lock</mat-icon>
          <input matInput [type]="hideConfirm ? 'password' : 'text'" formControlName="confirmPassword" autocomplete="new-password" />
          <button mat-icon-button matSuffix type="button" (click)="hideConfirm = !hideConfirm" [attr.aria-label]="hideConfirm ? 'Show' : 'Hide'">
            <mat-icon>{{ hideConfirm ? 'visibility' : 'visibility_off' }}</mat-icon>
          </button>
          <mat-error *ngIf="form.getError('passwordMismatch') && form.controls.confirmPassword.touched">Passwords do not match</mat-error>
        </mat-form-field>

        <div *ngIf="errorMessage()" class="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {{ errorMessage() }}
        </div>
      </div>

      <div class="flex justify-end gap-3 pt-2">
        <button mat-stroked-button type="button" (click)="ref.close()">Cancel</button>
        <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid || loading()">
          {{ loading() ? 'Resetting...' : 'Reset password' }}
        </button>
      </div>
    </form>
  </div>
  `
})
export class ResetPasswordDialog {
  private readonly fb = inject(FormBuilder);
  private readonly usersService = inject(UsersService);
  private readonly snack = inject(MatSnackBar);
  readonly ref = inject(MatDialogRef<ResetPasswordDialog>);
  readonly data: { user: UserManagementDto } = inject(MAT_DIALOG_DATA);

  readonly form = this.fb.nonNullable.group({
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]]
  }, { validators: this.passwordMatchValidator });

  hideNew = true;
  hideConfirm = true;
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  private passwordMatchValidator(control: AbstractControl) {
    const group = control as FormGroup;
    const newPw = group.get('newPassword')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return newPw === confirm ? null : { passwordMismatch: true };
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.loading.set(true);
    this.errorMessage.set(null);

    this.usersService.resetUserPassword(this.data.user.id, this.form.getRawValue().newPassword).subscribe({
      next: () => {
        this.loading.set(false);
        this.snack.open(`Password reset for ${this.data.user.username}. They must change it on next login.`, 'Dismiss', {
          duration: 5000,
          horizontalPosition: 'right',
          verticalPosition: 'bottom'
        });
        this.ref.close(true);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        const msg = err.error?.message ?? err.error?.detail ?? 'Failed to reset password.';
        this.errorMessage.set(msg);
      }
    });
  }
}
