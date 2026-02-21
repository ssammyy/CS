import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';

/**
 * RegisterComponent handles tenant and admin account creation.
 * This component follows the UI Design Language Rule by:
 * - Using the approved color palette (brand-coral, brand-sky, brand-mint)
 * - Implementing consistent form styling with Material Design
 * - Following the design system for buttons and inputs
 * - Ensuring accessibility with proper contrast and focus states
 */
@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    RouterLink
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly snack = inject(MatSnackBar);

  hideSignupPassword = true;
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  /**
   * Signup form for creating a new tenant and admin account.
   * Validates tenant name, admin username, email, and password.
   */
  readonly signupForm = this.fb.nonNullable.group({
    tenantName: ['', [Validators.required, Validators.minLength(2)]],
    adminUsername: ['', [Validators.required, Validators.minLength(3)]],
    adminPassword: ['', [Validators.required, Validators.minLength(6)]],
    adminEmail: ['', [Validators.required, Validators.email]],
  });

  /**
   * Handles signup form submission.
   * Creates a new tenant and admin account, then redirects to login.
   */
  onSignup(): void {
    if (this.signupForm.invalid) return;
    
    this.loading.set(true);
    this.errorMessage.set(null);
    
    this.authService.signup(this.signupForm.getRawValue()).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.snack.open(`Tenant created: ${res.tenantName}. You can now sign in.`, 'Dismiss', {
          duration: 5000,
          horizontalPosition: 'right',
          verticalPosition: 'bottom'
        });
        // Navigate to login page after successful signup
        this.router.navigate(['/login'], {
          queryParams: { username: res.adminUsername }
        });
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        const errorMsg = this.extractErrorMessage(err);
        this.errorMessage.set(errorMsg);
        
        // Also show snackbar for visibility
        this.snack.open(errorMsg, 'Dismiss', {
          duration: 6000,
          horizontalPosition: 'right',
          verticalPosition: 'bottom',
          panelClass: ['snackbar-error']
        });
      }
    });
  }

  /**
   * Extracts error messages from HTTP errors, showing exactly what the API returns.
   * Handles RFC 7807 Problem Details format and other error response formats.
   */
  private extractErrorMessage(error: HttpErrorResponse): string {
    // Network error
    if (error.status === 0) {
      return 'Unable to connect to the server. Please check your internet connection and try again.';
    }
    
    // RFC 7807 Problem Details format (type, title, status, detail, instance)
    if (error.error?.detail) {
      return error.error.detail;
    }
    
    // Standard error message format
    if (error.error?.message) {
      return error.error.message;
    }
    
    // Fallback: show the raw error object if available
    if (error.error && typeof error.error === 'object') {
      // Try to extract any meaningful message from the error object
      const errorObj = error.error;
      if (errorObj.title) {
        return errorObj.title;
      }
      // If we have a string representation, use it
      if (typeof errorObj === 'string') {
        return errorObj;
      }
    }
    
    // Status code based messages
    switch (error.status) {
      case 400:
        return 'Invalid information provided. Please check all fields and try again.';
      case 409:
        return 'A tenant or user with this information already exists. Please use different details.';
      case 422:
        return 'The provided information is invalid. Please check all fields and try again.';
      case 500:
        return 'An internal server error occurred. Please try again later or contact support.';
      case 503:
        return 'The service is temporarily unavailable. Please try again in a few moments.';
      default:
        return `An unexpected error occurred (Status: ${error.status}). Please try again or contact support if the problem persists.`;
    }
  }
}
