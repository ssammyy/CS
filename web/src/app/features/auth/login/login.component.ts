import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatCheckboxModule,
    MatSnackBarModule
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
/**
 * LoginComponent renders the authentication form.
 * - Uses Angular Material filled form-fields for a soft look
 * - Tailwind utilities for layout and gradients
 */
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly snack = inject(MatSnackBar);

  readonly form = this.fb.nonNullable.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
    remember: [false]
  });

  hidePassword = true;
  hideSignupPassword = true;
  showSignup = false;

  // Minimal signup form shown inline on the login page
  readonly signupForm = this.fb.nonNullable.group({
    tenantName: ['', [Validators.required, Validators.minLength(2)]],
    adminUsername: ['', [Validators.required, Validators.minLength(3)]],
    adminPassword: ['', [Validators.required, Validators.minLength(6)]],
    adminEmail: ['', [Validators.required, Validators.email]],
  });

  /**
   * Attempts login and shows a bottom-right toast on failure.
   */
  onSubmit(): void {
    if (this.form.invalid) return;
    this.authService.login(this.form.getRawValue()).subscribe({
      next: () => {
        // Check if user is PLATFORM_ADMIN and redirect to admin portal
        const user = this.authService.getCurrentUser();
        if (user?.role === 'PLATFORM_ADMIN') {
          this.router.navigate(['/admin']);
        } else {
          this.router.navigate(['/dashboard']);
        }
      },
      error: () => {
        this.snack.open('Invalid credentials', 'Dismiss', {
          duration: 4000,
          horizontalPosition: 'right',
          verticalPosition: 'bottom',
          panelClass: ['snackbar-error']
        });
      },
    });
  }

  onToggleSignup(): void {
    this.showSignup = !this.showSignup;
  }

  onSignup(): void {
    if (this.signupForm.invalid) return;
    this.authService.signup(this.signupForm.getRawValue()).subscribe({
      next: (res) => {
        this.snack.open(`Tenant created: ${res.tenantName}. You can now sign in.`, 'Dismiss', {
          duration: 5000,
          horizontalPosition: 'right',
          verticalPosition: 'bottom'
        });
        this.showSignup = false;
        // Pre-fill username after signup for convenience
        this.form.patchValue({ username: res.adminUsername });
      },
      error: (err) => {
        const msg = err?.error?.message || 'Signup failed';
        this.snack.open(msg, 'Dismiss', {
          duration: 5000,
          horizontalPosition: 'right',
          verticalPosition: 'bottom',
          panelClass: ['snackbar-error']
        });
      }
    });
  }
}
