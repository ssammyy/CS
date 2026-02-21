import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * BranchesService centralizes all branch operations and implements in-memory caching.
 *
 * Caching policy:
 * - Results from GET /api/branches are cached in a BehaviorSubject.
 * - Cache is considered fresh for CACHE_TTL_MS; within that window, repeated calls
 *   to loadBranches() will reuse the cached state instead of hitting the network.
 * - Mutations (create/update/delete) immediately update the cached list and also
 *   refresh the cache timestamp to keep the view consistent.
 * - Call loadBranches(true) to force refresh from the server (e.g., on manual reload).
 */
@Injectable({ providedIn: 'root' })
export class BranchesService {
  private readonly http = inject(HttpClient);
  private readonly branchesSubject = new BehaviorSubject<BranchDto[] | null>(null);
  private lastLoadedAt = 0;
  private static readonly CACHE_TTL_MS = 60_000; // 1 minute

  /** Observable stream of the cached branch list. Emits null until the first load completes. */
  readonly branches$: Observable<BranchDto[] | null> = this.branchesSubject.asObservable();

  /** Loads branches from cache or network. Pass forceRefresh=true to bypass cache. */
  loadBranches(forceRefresh = false): void {
    const isFresh = Date.now() - this.lastLoadedAt < BranchesService.CACHE_TTL_MS;
    if (!forceRefresh && isFresh && this.branchesSubject.value) return;

    this.http
      .get<BranchListResponse>(`${environment.apiBaseUrl}/api/branches`)
      .subscribe({
        next: (response) => {
          this.branchesSubject.next(response.branches);
          this.lastLoadedAt = Date.now();
        },
        error: () => {
          // keep previous cache if request fails
        },
      });
  }

  /** Creates a branch and updates the cache on success. */
  createBranch(payload: CreateBranchRequest): Observable<BranchDto> {
    return new Observable((observer) => {
      this.http
        .post<BranchDto>(`${environment.apiBaseUrl}/api/branches`, payload)
        .subscribe({
          next: (created) => {
            const current = this.branchesSubject.value ?? [];
            this.branchesSubject.next([created, ...current]);
            this.lastLoadedAt = Date.now();
            observer.next(created);
            observer.complete();
          },
          error: (err) => observer.error(err),
        });
    });
  }

  /** Updates a branch and patches the cached entry. */
  updateBranch(id: string, payload: UpdateBranchRequest): Observable<BranchDto> {
    return new Observable((observer) => {
      this.http
        .put<BranchDto>(`${environment.apiBaseUrl}/api/branches/${id}`, payload)
        .subscribe({
          next: (updated) => {
            const list = (this.branchesSubject.value ?? []).map((b) => (b.id === updated.id ? updated : b));
            this.branchesSubject.next(list);
            this.lastLoadedAt = Date.now();
            observer.next(updated);
            observer.complete();
          },
          error: (err) => observer.error(err),
        });
    });
  }

  /** Deletes a branch and removes it from the cached list. */
  deleteBranch(id: string): Observable<void> {
    return new Observable((observer) => {
      this.http.delete<void>(`${environment.apiBaseUrl}/api/branches/${id}`).subscribe({
        next: () => {
          const list = (this.branchesSubject.value ?? []).filter((b) => b.id !== id);
          this.branchesSubject.next(list);
          this.lastLoadedAt = Date.now();
          observer.next();
          observer.complete();
        },
        error: (err) => observer.error(err),
      });
    });
  }

  /** Assigns a user to a branch. */
  assignUserToBranch(request: AssignUserToBranchRequest): Observable<void> {
    return this.http.post<void>(`${environment.apiBaseUrl}/api/branches/assign-user`, request);
  }

  /** Removes a user from a branch. */
  removeUserFromBranch(request: RemoveUserFromBranchRequest): Observable<void> {
    return this.http.delete<void>(`${environment.apiBaseUrl}/api/branches/remove-user`, { body: request });
  }

  /** Updates the primary status of a user's branch assignment. */
  updateUserBranchPrimary(request: UpdateUserBranchPrimaryRequest): Observable<UserBranchAssignmentDto> {
    return this.http.put<UserBranchAssignmentDto>(`${environment.apiBaseUrl}/api/branches/update-primary`, request);
  }

  /** Gets users assigned to a specific branch. */
  getUsersByBranch(branchId: string): Observable<UserBranchDto[]> {
    return this.http.get<UserBranchDto[]>(`${environment.apiBaseUrl}/api/branches/${branchId}/users`);
  }

  /** Gets users assigned to a specific branch with full user details. */
  getBranchUsers(branchId: string): Observable<UserBranchAssignmentDto[]> {
    return this.http.get<UserBranchAssignmentDto[]>(`${environment.apiBaseUrl}/api/branches/${branchId}/users`);
  }

  /** Gets branches assigned to a specific user. */
  getBranchesByUser(userId: string): Observable<UserBranchAssignmentDto[]> {
    return this.http.get<UserBranchAssignmentDto[]>(`${environment.apiBaseUrl}/api/branches/users/${userId}`);
  }
}

// --- DTO mirrors ---

export interface BranchListResponse {
  branches: BranchDto[];
  totalCount: number;
}

export interface BranchDto {
  id: string;
  name: string;
  location: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  isActive: boolean;
  tenantId: string;
  tenantName: string;
  userCount: number;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateBranchRequest {
  name: string;
  location: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
}

export interface UpdateBranchRequest {
  name?: string;
  location?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  isActive?: boolean;
}

export interface AssignUserToBranchRequest {
  userId: string;
  branchId: string;
  isPrimary: boolean;
}

export interface RemoveUserFromBranchRequest {
  userId: string;
  branchId: string;
}

export interface UpdateUserBranchPrimaryRequest {
  userId: string;
  branchId: string;
  isPrimary: boolean;
}

export interface UserBranchDto {
  id: string;
  userId: string;
  branchId: string;
  branchName: string;
  isPrimary: boolean;
  assignedAt: string;
  assignedBy: string;
}

export interface UserBranchAssignmentDto {
  userId: string;
  username: string;
  email: string;
  branchId: string;
  branchName: string;
  isPrimary: boolean;
  assignedAt: string;
}
