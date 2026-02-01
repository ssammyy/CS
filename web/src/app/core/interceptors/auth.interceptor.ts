import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

/**
 * Attaches Authorization header to API requests when a JWT is present.
 * Uses Angular standalone interceptor function style (v15+).
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();
  const userRaw = localStorage.getItem('auth_user');
  let tenantId: string | null = null;
  try {
    tenantId = userRaw ? (JSON.parse(userRaw)?.tenantId as string) : null;
  } catch {}

  const isApiRequest = req.url.startsWith('/') || req.url.startsWith('http');
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = token;
  if (tenantId && !req.headers.has('X-Tenant-ID')) headers['X-Tenant-ID'] = tenantId;
  const authReq = isApiRequest && (headers['Authorization'] || headers['X-Tenant-ID'])
    ? req.clone({ setHeaders: headers })
    : req;

  return next(authReq);
};
