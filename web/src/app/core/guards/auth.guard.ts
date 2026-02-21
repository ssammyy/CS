import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

/**
 * Blocks navigation to protected routes when user is not authenticated.
 * Redirects to /change-password when user must change password (force-reset-on-first-login).
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  if (!authService.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }
  if (authService.requiresPasswordChange() && !state.url.includes('/change-password')) {
    router.navigate(['/change-password']);
    return false;
  }
  return true;
};

/** Admin-only guard: checks stored user role equals ADMIN or PLATFORM_ADMIN. */
export const adminGuard: CanActivateFn = () => {
  const router = inject(Router);
  const raw = localStorage.getItem('auth_user');
  if (raw) {
    try {
      const user = JSON.parse(raw) as { role: string };
      if (user.role === 'ADMIN' || user.role === 'PLATFORM_ADMIN') return true;
    } catch {}
  }
  router.navigate(['/dashboard']);
  return false;
};

/** Platform Admin-only guard: checks stored user role equals PLATFORM_ADMIN. */
export const platformAdminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // First check if authenticated
  if (!authService.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }

  // Check if user is PLATFORM_ADMIN
  const raw = localStorage.getItem('auth_user');
  if (raw) {
    try {
      const user = JSON.parse(raw) as { role: string };
      if (user.role === 'PLATFORM_ADMIN') {
        return true;
      }
    } catch {}
  }

  // Not a platform admin
  router.navigate(['/dashboard']);
  return false;
};
