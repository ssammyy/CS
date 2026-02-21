import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
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
    MatSnackBarModule,
    MatProgressSpinnerModule,
    RouterLink
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
/**
 * LoginComponent renders the authentication form.
 * - Uses Angular Material filled form-fields for a soft look
 * - Tailwind utilities for layout and gradients
 * 
 * This component follows the UI Design Language Rule by:
 * - Using the approved color palette (brand-coral, brand-sky, brand-mint)
 * - Implementing consistent form styling with Material Design
 * - Following the design system for buttons and inputs
 * - Ensuring accessibility with proper contrast and focus states
 */
export class LoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly snack = inject(MatSnackBar);

  readonly form = this.fb.nonNullable.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
    remember: [false]
  });

  hidePassword = true;
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  /**
   * Initializes the component and pre-fills username from query params if available.
   * This is useful after signup when redirecting to login.
   */
  ngOnInit(): void {
    const username = this.route.snapshot.queryParams['username'];
    if (username) {
      this.form.patchValue({ username });
    }
  }

  /**
   * Attempts login and displays user-friendly error messages on failure.
   */
  onSubmit(): void {
    if (this.form.invalid) return;
    
    this.loading.set(true);
    this.errorMessage.set(null);
    
    this.authService.login(this.form.getRawValue()).subscribe({
      next: (response) => {
        this.loading.set(false);
        if (response.requiresPasswordChange) {
          this.router.navigate(['/change-password']);
        } else {
          const user = this.authService.getCurrentUser();
          if (user?.role === 'PLATFORM_ADMIN') {
            this.router.navigate(['/admin']);
          } else {
            this.router.navigate(['/dashboard']);
          }
        }
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        const errorMsg = this.extractErrorMessage(err);
        this.errorMessage.set(errorMsg);
        
        // Also show snackbar for visibility
        this.snack.open(errorMsg, 'Dismiss', {
          duration: 5000,
          horizontalPosition: 'right',
          verticalPosition: 'bottom',
          panelClass: ['snackbar-error']
        });
      },
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
      case 401:
        return 'Invalid username or password. Please check your credentials and try again.';
      case 403:
        return 'Access denied. Your account may not have permission to access this system.';
      case 404:
        return 'The requested service was not found. Please contact support if this issue persists.';
      case 500:
        return 'An internal server error occurred. Please try again later or contact support.';
      case 503:
        return 'The service is temporarily unavailable. Please try again in a few moments.';
      default:
        return `An unexpected error occurred (Status: ${error.status}). Please try again or contact support if the problem persists.`;
    }
  }

}
