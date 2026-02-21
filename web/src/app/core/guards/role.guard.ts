import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

/** Routes allowed for CASHIER role */
const CASHIER_ROUTES = ['dashboard', 'pos', 'sales', 'customers', 'credit-management', 'reports', 'inventory', 'settings', 'ai-chat'];

/** Routes allowed for MANAGER = CASHIER + branches */
const MANAGER_ROUTES = [...CASHIER_ROUTES, 'branches'];

/**
 * Role-based route guard. ADMIN and PLATFORM_ADMIN see all routes.
 * MANAGER sees cashier routes + /branches. CASHIER sees only cashier routes.
 * Others are redirected to dashboard.
 */
export const roleGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const raw = localStorage.getItem('auth_user');
  if (!raw) {
    router.navigate(['/login']);
    return false;
  }
  try {
    const user = JSON.parse(raw) as { role: string };
    const role = user.role || '';

    // Admin and Platform Admin can access everything
    if (role === 'ADMIN' || role === 'PLATFORM_ADMIN') {
      return true;
    }

    // Extract the child path (e.g. 'pos' from '/pos' or 'pos' from parent/pos)
    const url = state.url.split('?')[0];
    const pathSegments = url.split('/').filter(Boolean);
    const childPath = pathSegments[pathSegments.length - 1] || pathSegments[0] || 'dashboard';

    if (role === 'MANAGER') {
      if (MANAGER_ROUTES.includes(childPath)) return true;
      return router.parseUrl('/dashboard');
    }

    if (role === 'CASHIER') {
      if (CASHIER_ROUTES.includes(childPath)) return true;
      return router.parseUrl('/dashboard');
    }

    // Unknown role - allow dashboard only
    if (childPath === 'dashboard') return true;
    return router.parseUrl('/dashboard');
  } catch {
    router.navigate(['/login']);
    return false;
  }
};
