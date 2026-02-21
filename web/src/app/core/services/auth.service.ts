import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BranchContextService } from './branch-context.service';

/**
 * LoginRequest represents the payload expected by backend POST /auth/login.
 * - username: the account username
 * - password: the account password
 */
export interface LoginRequest {
  username: string;
  password: string;
}

/**
 * UserDto mirrors the backend `UserDto`. Fields are used for UI and session.
 */
export interface UserDto {
  id: string;
  username: string;
  email: string;
  role: string;
  tenantId: string;
  tenantName: string;
  isActive: boolean;
}

/**
 * LoginResponse mirrors backend response and is used to persist a session.
 * tokenType is typically "Bearer".
 * requiresPasswordChange: when true, user must change password before accessing the app.
 */
export interface LoginResponse {
  token: string;
  tokenType: string;
  expiresIn: number;
  user: UserDto;
  requiresPasswordChange?: boolean;
}

/**
 * SignupRequest mirrors backend POST /auth/signup payload.
 * - tenantName: the new tenant's display name
 * - adminUsername: initial admin username
 * - adminPassword: initial admin password
 * - adminEmail: initial admin email
 */
export interface SignupRequest {
  tenantName: string;
  adminUsername: string;
  adminPassword: string;
  adminEmail: string;
}

/**
 * SignupResponse mirrors backend response from /auth/signup.
 * It does not include a token; user should log in after signup.
 */
export interface SignupResponse {
  tenantId: string;
  tenantName: string;
  adminUsername: string;
  adminEmail: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = `${environment.apiBaseUrl}/auth`;
  private readonly branchContextService = inject(BranchContextService);

  /**
   * Sends credentials to backend and persists JWT + metadata in localStorage.
   * Note: Storing tokens in localStorage is simple but vulnerable to XSS.
   * For higher security consider httpOnly cookies with CSRF protection.
   */
  login(payload: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiBaseUrl}/login`, payload).pipe(
      tap(response => {
        const tokenValue = `${response.tokenType} ${response.token}`.trim();
        localStorage.setItem('auth_token', tokenValue);
        localStorage.setItem('auth_token_exp', String(Date.now() + response.expiresIn));
        localStorage.setItem('auth_user', JSON.stringify(response.user));
        if (response.requiresPasswordChange) {
          localStorage.setItem('auth_requires_password_change', 'true');
        } else {
          localStorage.removeItem('auth_requires_password_change');
        }
        
        // Clear any previous branch context when logging into a new tenant
        this.branchContextService.clearContext();
        
        // Branch context will be automatically set by the ShellComponent
        // after branches are loaded
      })
    );
  }

  /** Returns true if a token exists and has not expired. */
  isAuthenticated(): boolean {
    const token = localStorage.getItem('auth_token');
    const exp = Number(localStorage.getItem('auth_token_exp') ?? 0);
    return !!token && Date.now() < exp;
  }

  /** Clears all auth data from localStorage. */
  logout(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_token_exp');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_requires_password_change');
    
    // Clear branch context when logging out
    this.branchContextService.clearContext();
  }

  /** True when user must change password before accessing the app (force-reset-on-first-login). */
  requiresPasswordChange(): boolean {
    return localStorage.getItem('auth_requires_password_change') === 'true';
  }

  /** Returns the Authorization header value (e.g., "Bearer <jwt>") if present. */
  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  /** Updates only the stored token. */
  setToken(rawToken: string, tokenType = 'Bearer'): void {
    const tokenValue = `${tokenType} ${rawToken}`.trim();
    localStorage.setItem('auth_token', tokenValue);
  }

  /**
   * Calls backend public signup endpoint to create a tenant and its admin user.
   * Returns tenant metadata; caller should navigate to login afterwards.
   */
  signup(payload: SignupRequest): Observable<SignupResponse> {
    return this.http.post<SignupResponse>(`${this.apiBaseUrl}/signup`, payload);
  }

  /** Returns the current user data from localStorage. */
  getCurrentUser(): UserDto | null {
    const userStr = localStorage.getItem('auth_user');
    return userStr ? JSON.parse(userStr) : null;
  }

  /** Checks if the current user has the specified role. */
  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user?.role === role;
  }

  /** Checks if the current user has any of the specified roles. */
  hasAnyRole(roles: string[]): boolean {
    const user = this.getCurrentUser();
    return user ? roles.includes(user.role) : false;
  }

  /**
   * Change password for the authenticated user (force-reset-on-first-login).
   */
  changePassword(payload: { currentPassword: string; newPassword: string }): Observable<void> {
    return this.http.post<void>(`${this.apiBaseUrl}/change-password`, payload).pipe(
      tap(() => localStorage.removeItem('auth_requires_password_change'))
    );
  }

}
