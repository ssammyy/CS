import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { BranchDto } from './branches.service';

/**
 * Service for managing the current branch context.
 * Handles branch selection, switching, and provides the current branch state.
 */
@Injectable({
  providedIn: 'root'
})
export class BranchContextService {
  private currentBranchSubject = new BehaviorSubject<BranchDto | null>(null);
  private availableBranchesSubject = new BehaviorSubject<BranchDto[]>([]);

  constructor() {
    // Try to restore context on service initialization
    this.initializeContext();
  }

  /**
   * Initialize context on service creation.
   * This will attempt to restore any saved branch ID, but won't set it until branches are loaded.
   */
  private initializeContext(): void {
    const savedBranchId = localStorage.getItem('currentBranchId');
    if (savedBranchId) {
      console.log('🔄 BranchContextService initialized with saved branch ID:', savedBranchId);
      // Note: We can't restore the full branch object yet because we don't have available branches
      // This will be handled when setAvailableBranches is called
    } else {
      console.log('🔄 BranchContextService initialized with no saved context');
    }
  }

  /**
   * Observable for the currently selected branch
   */
  get currentBranch$(): Observable<BranchDto | null> {
    return this.currentBranchSubject.asObservable();
  }

  /**
   * Observable for all branches the user has access to
   */
  get availableBranches$(): Observable<BranchDto[]> {
    return this.availableBranchesSubject.asObservable();
  }

  /**
   * Get the current branch value synchronously
   */
  get currentBranch(): BranchDto | null {
    return this.currentBranchSubject.value;
  }

  /**
   * Get available branches value synchronously
   */
  get availableBranches(): BranchDto[] {
    return this.availableBranchesSubject.value;
  }

  /**
   * Set the available branches for the current user
   */
  setAvailableBranches(branches: BranchDto[]): void {
    console.log('🔧 Setting available branches:', branches.length, branches.map(b => ({ id: b.id, name: b.name })));
    
    // Check if this is a different tenant (different branch IDs)
    const currentTenantBranches = this.availableBranchesSubject.value;
    const isNewTenant = currentTenantBranches.length > 0 && branches.length > 0 && 
                       !currentTenantBranches.some(cb => branches.some(nb => nb.id === cb.id));
    
    if (isNewTenant) {
      // Clear current branch if switching tenants
      this.currentBranchSubject.next(null);
      localStorage.removeItem('currentBranchId');
      console.log('🔄 New tenant detected, cleared branch context');
    }
    
    this.availableBranchesSubject.next(branches);
    console.log('✅ Available branches set in context service');
    
    // Note: Auto-restoration removed to prevent conflicts with ShellComponent logic
    // The ShellComponent will handle restoration after setting available branches
  }

  /**
   * Set the current branch
   */
  setCurrentBranch(branch: BranchDto | null): void {
    // Get stack trace to see where this is being called from
    const stackTrace = new Error().stack;
    const caller = stackTrace?.split('\n')[2]?.trim() || 'unknown';
    
    console.log('🎯 Setting current branch:', branch ? `${branch.name} (${branch.id})` : 'null');
    console.log('📍 Called from:', caller);
    console.log('🔄 Previous branch was:', this.currentBranchSubject.value?.name || 'null');
    
    this.currentBranchSubject.next(branch);
    
    // Store in localStorage for persistence
    if (branch) {
      localStorage.setItem('currentBranchId', branch.id);
      console.log('💾 Stored branch ID in localStorage:', branch.id);
    } else {
      localStorage.removeItem('currentBranchId');
      console.log('🗑️ Removed branch ID from localStorage');
    }
  }

  /**
   * Switch to a different branch by ID
   */
  switchToBranch(branchId: string): boolean {
    const branch = this.availableBranches.find(b => b.id === branchId);
    if (branch) {
      this.setCurrentBranch(branch);
      return true;
    }
    return false;
  }

  /**
   * Get branch by ID
   */
  getBranchById(branchId: string): BranchDto | undefined {
    return this.availableBranches.find(b => b.id === branchId);
  }

  /**
   * Check if user has access to a specific branch
   */
  hasAccessToBranch(branchId: string): boolean {
    return this.availableBranches.some(b => b.id === branchId);
  }

  /**
   * Get the primary branch for the current user
   * Note: This would need to be implemented based on user-branch relationships
   */
  getPrimaryBranch(): BranchDto | undefined {
    // For now, return the first available branch
    // In a real implementation, this would check user-branch relationships
    return this.availableBranches.length > 0 ? this.availableBranches[0] : undefined;
  }

  /**
   * Get the user's assigned branch (primary first, then first assigned)
   * This method will be called by the ShellComponent after fetching user branches
   */
  getUserAssignedBranch(): BranchDto | undefined {
    // This will be populated by the ShellComponent when user branches are fetched
    return this.currentBranchSubject.value || undefined;
  }

  /**
   * Clear the current branch context
   */
  clearContext(): void {
    this.currentBranchSubject.next(null);
    this.availableBranchesSubject.next([]);
    localStorage.removeItem('currentBranchId');
    
    // Also clear any other branch-related localStorage items
    localStorage.removeItem('branch_context_cleared');
    localStorage.setItem('branch_context_cleared', Date.now().toString());
  }

  /**
   * Restore branch context from localStorage
   * Returns true if restoration was successful, false otherwise
   */
  restoreContext(): boolean {
    console.log('🔄 BranchContextService: Attempting to restore context...');
    
    // Check if branch context was cleared (indicating tenant switch)
    const contextCleared = localStorage.getItem('branch_context_cleared');
    const lastContextClear = contextCleared ? parseInt(contextCleared) : 0;
    const lastLogin = localStorage.getItem('auth_token_exp') ? 
      parseInt(localStorage.getItem('auth_token_exp')!) - 3600000 : 0; // 1 hour before expiry
    
    // If context was cleared after the last login, don't restore
    if (contextCleared && lastContextClear > lastLogin) {
      console.log('⚠️ Context was cleared after last login, skipping restoration');
      return false;
    }
    
    const savedBranchId = localStorage.getItem('currentBranchId');
    console.log('💾 Saved branch ID:', savedBranchId);
    console.log('🔍 Available branches for restoration:', this.availableBranches.length);
    
    if (savedBranchId && this.availableBranches.length > 0) {
      const savedBranch = this.availableBranches.find(b => b.id === savedBranchId);
      if (savedBranch) {
        console.log(`✅ Restoring branch context: ${savedBranch.name}`);
        this.setCurrentBranch(savedBranch);
        return true;
      } else {
        console.log('⚠️ Saved branch not found in available branches');
        localStorage.removeItem('currentBranchId');
      }
    }
    
    console.log('❌ Could not restore branch context');
    return false;
  }

  /**
   * Force refresh branch context (useful when switching tenants)
   */
  forceRefresh(): void {
    this.clearContext();
    // Trigger a small delay to ensure clearContext completes
    setTimeout(() => {
      this.currentBranchSubject.next(null);
      this.availableBranchesSubject.next([]);
    }, 100);
  }
}
