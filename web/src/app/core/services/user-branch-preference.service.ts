import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

/**
 * Service for managing user branch preferences and context.
 * This service uses the backend to persist branch context, solving
 * the frontend persistence issues.
 */

export interface SetBranchPreferenceRequest {
  branchId: string;
  isPreferred: boolean;
}

export interface UserBranchPreferenceResponse {
  id: string;
  branchId: string;
  branchName: string;
  isPreferred: boolean;
  lastSelectedAt: string;
  createdAt: string;
}

export interface UserBranchContextResponse {
  currentBranchId: string | null;
  currentBranchName: string | null;
  preferredBranchId: string | null;
  preferredBranchName: string | null;
  lastSelectedBranchId: string | null;
  lastSelectedBranchName: string | null;
  availableBranches: any[];
}

export interface UpdateLastSelectedBranchRequest {
  branchId: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserBranchPreferenceService {
  private readonly baseUrl = `${environment.apiBaseUrl}/api/user-branch-preferences`;

  // Cache for user branch context
  private userBranchContextSubject = new BehaviorSubject<UserBranchContextResponse | null>(null);
  public userBranchContext$ = this.userBranchContextSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Set a user's branch preference
   */
  setBranchPreference(userId: string, request: SetBranchPreferenceRequest): Observable<UserBranchPreferenceResponse> {
    return this.http.post<UserBranchPreferenceResponse>(`${this.baseUrl}/${userId}/preferences`, request)
      .pipe(
        tap(() => {
          // Clear cache to force refresh
          this.userBranchContextSubject.next(null);
        })
      );
  }

  /**
   * Update user's last selected branch (for context tracking)
   */
  updateLastSelectedBranch(userId: string, request: UpdateLastSelectedBranchRequest): Observable<UserBranchPreferenceResponse> {
    return this.http.put<UserBranchPreferenceResponse>(`${this.baseUrl}/${userId}/last-selected`, request)
      .pipe(
        tap(() => {
          // Clear cache to force refresh
          this.userBranchContextSubject.next(null);
        })
      );
  }

  /**
   * Get user's current branch context
   */
  getUserBranchContext(userId: string): Observable<UserBranchContextResponse> {
    // Check cache first
    const cached = this.userBranchContextSubject.value;
    if (cached) {
      return of(cached);
    }

    return this.http.get<UserBranchContextResponse>(`${this.baseUrl}/${userId}/context`)
      .pipe(
        tap(context => {
          // Cache the result
          this.userBranchContextSubject.next(context);
        }),
        catchError(error => {
          console.error('Failed to get user branch context:', error);
          // Return empty context on error
          const emptyContext: UserBranchContextResponse = {
            currentBranchId: null,
            currentBranchName: null,
            preferredBranchId: null,
            preferredBranchName: null,
            lastSelectedBranchId: null,
            lastSelectedBranchName: null,
            availableBranches: []
          };
          this.userBranchContextSubject.next(emptyContext);
          return of(emptyContext);
        })
      );
  }

  /**
   * Get user's preferred branch
   */
  getUserPreferredBranch(userId: string): Observable<UserBranchPreferenceResponse | null> {
    return this.http.get<UserBranchPreferenceResponse | null>(`${this.baseUrl}/${userId}/preferred`);
  }

  /**
   * Clear user's branch preferences for current tenant
   */
  clearUserBranchPreferences(userId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${userId}/preferences`)
      .pipe(
        tap(() => {
          // Clear cache
          this.userBranchContextSubject.next(null);
        })
      );
  }

  /**
   * Set branch as preferred and update last selected
   */
  setPreferredBranch(userId: string, branchId: string): Observable<UserBranchPreferenceResponse> {
    // First set as preferred
    return this.setBranchPreference(userId, { branchId, isPreferred: true })
      .pipe(
        // Then update as last selected
        tap(() => {
          this.updateLastSelectedBranch(userId, { branchId }).subscribe();
        })
      );
  }

  /**
   * Update last selected branch (for context tracking)
   */
  selectBranch(userId: string, branchId: string): Observable<UserBranchPreferenceResponse> {
    return this.updateLastSelectedBranch(userId, { branchId });
  }

  /**
   * Clear the cached context
   */
  clearCache(): void {
    this.userBranchContextSubject.next(null);
  }

  /**
   * Get current cached context
   */
  getCurrentContext(): UserBranchContextResponse | null {
    return this.userBranchContextSubject.value;
  }
}
