import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * UsersService centralizes all user list operations and implements in-memory caching.
 *
 * Caching policy:
 * - Results from GET /users are cached in a BehaviorSubject.
 * - Cache is considered fresh for CACHE_TTL_MS; within that window, repeated calls
 *   to loadUsers() will reuse the cached state instead of hitting the network.
 * - Mutations (create/update/delete) immediately update the cached list and also
 *   refresh the cache timestamp to keep the view consistent.
 * - Call loadUsers(true) to force refresh from the server (e.g., on manual reload).
 */
@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);
  private readonly usersSubject = new BehaviorSubject<UserManagementDto[] | null>(null);
  private lastLoadedAt = 0;
  private static readonly CACHE_TTL_MS = 60_000; // 1 minute

  /** Observable stream of the cached user list. Emits null until the first load completes. */
  readonly users$: Observable<UserManagementDto[] | null> = this.usersSubject.asObservable();

  /** Loads users from cache or network. Pass forceRefresh=true to bypass cache. */
  loadUsers(forceRefresh = false): void {
    const isFresh = Date.now() - this.lastLoadedAt < UsersService.CACHE_TTL_MS;
    if (!forceRefresh && isFresh && this.usersSubject.value) return;
    this.http
      .get<{ users: UserManagementDto[]; totalCount: number }>(`${environment.apiBaseUrl}/users`)
      .subscribe({
        next: (res) => {
          this.usersSubject.next(res.users);
          this.lastLoadedAt = Date.now();
        },
        error: () => {
          // keep previous cache if request fails
        },
      });
  }

  /** Creates a user and updates the cache on success. */
  createUser(payload: CreateUserPayload): Observable<UserManagementDto> {
    return new Observable((observer) => {
      this.http
        .post<UserManagementDto>(`${environment.apiBaseUrl}/users`, payload)
        .subscribe({
          next: (created) => {
            const current = this.usersSubject.value ?? [];
            this.usersSubject.next([created, ...current]);
            this.lastLoadedAt = Date.now();
            observer.next(created);
            observer.complete();
          },
          error: (err) => observer.error(err),
        });
    });
  }

  /** Updates a user's role/email/active flag and patches the cached entry. */
  updateUser(id: string, patch: Partial<Pick<UserManagementDto, 'role' | 'email' | 'isActive'>>): Observable<UserManagementDto> {
    return new Observable((observer) => {
      this.http
        .patch<UserManagementDto>(`${environment.apiBaseUrl}/users/${id}`, patch)
        .subscribe({
          next: (updated) => {
            const list = (this.usersSubject.value ?? []).map((u) => (u.id === updated.id ? updated : u));
            this.usersSubject.next(list);
            this.lastLoadedAt = Date.now();
            observer.next(updated);
            observer.complete();
          },
          error: (err) => observer.error(err),
        });
    });
  }

  /** Deletes a user and removes it from the cached list. */
  deleteUser(id: string): Observable<void> {
    return new Observable((observer) => {
      this.http.delete<void>(`${environment.apiBaseUrl}/users/${id}`).subscribe({
        next: () => {
          const list = (this.usersSubject.value ?? []).filter((u) => u.id !== id);
          this.usersSubject.next(list);
          this.lastLoadedAt = Date.now();
          observer.next();
          observer.complete();
        },
        error: (err) => observer.error(err),
      });
    });
  }
}

// --- DTO mirrors ---
export interface UserManagementDto {
  id: string;
  username: string;
  email: string;
  role: string;
  tenantId: string;
  tenantName: string;
  isActive: boolean;
  branches: string[];
  primaryBranch?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateUserPayload {
  username: string;
  email: string;
  password: string;
  role: 'USER' | 'ADMIN';
}



