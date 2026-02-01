import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

/**
 * Blocks navigation to protected routes when user is not authenticated.
 */
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  if (authService.isAuthenticated()) {
    return true;
  }
  router.navigate(['/login']);
  return false;
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
