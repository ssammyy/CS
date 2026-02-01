import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';
import { BranchContextService } from '../../core/services/branch-context.service';
import { BranchesService, BranchDto } from '../../core/services/branches.service';
import { BranchSelectorComponent } from './branch-selector.component';
import { UserBranchPreferenceService } from '../../core/services/user-branch-preference.service';

/**
 * Main shell component that provides the application layout and navigation.
 * Includes the top bar with user info, branch selector, and side navigation.
 */
@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, MatIconModule, BranchSelectorComponent],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss'
})
export class ShellComponent implements OnInit {
  // Mobile sidebar state
  readonly sidebarOpen = signal(false);
  readonly isCollapsed = signal(true);
  toggleSidebar(): void { this.sidebarOpen.update(v => !v); }
  closeSidebar(): void { this.sidebarOpen.set(false); }
  // Add these methods


  get year(): number { return new Date().getFullYear(); }

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly branchContextService = inject(BranchContextService);
  private readonly branchesService = inject(BranchesService);
  private readonly userBranchPreferenceService = inject(UserBranchPreferenceService);
  expandSidebar(): void { this.isCollapsed.set(false); }
  collapseSidebar(): void { this.isCollapsed.set(true); }

  isAdmin = (() => { try { const role = JSON.parse(localStorage.getItem('auth_user') || '{}')?.role; return role === 'ADMIN' || role === 'PLATFORM_ADMIN'; } catch { return false; } })();
  availableBranches: BranchDto[] = [];

  ngOnInit(): void {
    this.loadUserBranches();

    // Check for tenant changes by monitoring auth_user in localStorage
    this.checkTenantChange();

    // Debug: Log the current auth user details
    try {
      const authUser = JSON.parse(localStorage.getItem('auth_user') || '{}');
      console.log('🚀 ShellComponent initialized with user:', {
        username: authUser.username,
        role: authUser.role,
        id: authUser.id,
        tenantId: authUser.tenantId
      });
    } catch (e) {
      console.error('❌ Error parsing auth user in ngOnInit:', e);
    }
  }

  private checkTenantChange(): void {
    // Check if tenant has changed by monitoring auth_user
    const checkTenant = () => {
      try {
        const authUser = JSON.parse(localStorage.getItem('auth_user') || '{}');
        if (authUser.tenantId) {
          const currentTenantId = localStorage.getItem('current_tenant_id');
          if (currentTenantId && currentTenantId !== authUser.tenantId) {
            // Tenant changed, clear branch context
            this.branchContextService.forceRefresh();
          }
          localStorage.setItem('current_tenant_id', authUser.tenantId);
        }
      } catch (e) {
        // Ignore parsing errors
      }
    };

    // Check immediately
    checkTenant();

    // Check periodically (every 5 seconds)
    setInterval(checkTenant, 5000);
  }

  private loadUserBranches(): void {
    // Load branches and set them in the context service
    this.branchesService.loadBranches();
    this.branchesService.branches$.subscribe(branches => {
      if (branches && branches.length > 0) {
        this.availableBranches = branches;
        this.branchContextService.setAvailableBranches(branches);

        // After setting available branches, try to restore saved context first
        // Use setTimeout to ensure setAvailableBranches completes first
        setTimeout(() => {
          this.restoreOrSetUserBranch();
        }, 100);
      } else {
        // No branches available, clear context
        this.branchContextService.clearContext();
      }
    });
  }

  /**
   * First tries to restore saved branch context from backend, then falls back to API logic if needed.
   */
  private restoreOrSetUserBranch(): void {
    console.log('🔄 Attempting to restore or set user branch context...');

    // Check if we already have a current branch set
    const currentBranch = this.branchContextService.currentBranch;
    if (currentBranch) {
      console.log(`ℹ️ Branch context already set to: ${currentBranch.name} (${currentBranch.id})`);
      console.log('🛑 Skipping restoration - context already exists');
      return; // Exit early, context already set
    }

    // Try to restore from backend instead of localStorage
    try {
      const authUser = JSON.parse(localStorage.getItem('auth_user') || '{}');
      const userId = authUser.id;

      if (userId) {
        console.log('🔍 Getting user branch context from backend for user:', userId);

        this.userBranchPreferenceService.getUserBranchContext(userId).subscribe({
          next: (context) => {
            console.log('✅ Backend returned user branch context:', context);

            if (context.currentBranchId) {
              // Find the branch in available branches
              const savedBranch = this.availableBranches.find(b => b.id === context.currentBranchId);

              if (savedBranch) {
                // Restore the branch context from backend
                this.branchContextService.setCurrentBranch(savedBranch);
                console.log(`✅ Restored branch context from backend: ${savedBranch.name}`);
                return; // Exit early, no need for API calls
              } else {
                console.log('⚠️ Backend branch no longer available in current branches');
              }
            } else {
              console.log('ℹ️ No current branch context in backend');
            }

            // Fall back to API logic if no valid backend context
            console.log('🔍 Falling back to API logic for branch determination...');
            this.setUserAssignedBranch();
          },
          error: (error) => {
            console.error('❌ Failed to get user branch context from backend:', error);
            console.log('🔍 Falling back to API logic for branch determination...');
            this.setUserAssignedBranch();
          }
        });
      } else {
        console.log('ℹ️ No user ID found, using API logic for branch determination...');
        this.setUserAssignedBranch();
      }
    } catch (error) {
      console.error('❌ Error parsing auth user:', error);
      console.log('🔍 Falling back to API logic for branch determination...');
      this.setUserAssignedBranch();
    }
  }

  /**
   * Sets the user's assigned branch as the current branch.
   * Smart logic:
   * - If user has only 1 branch: auto-select it
   * - If user has multiple branches: show "No branch selected" for manual choice
   * - If user is ADMIN: show "No branch selected" for flexibility
   */
  private setUserAssignedBranch(): void {
    try {
      const authUser = JSON.parse(localStorage.getItem('auth_user') || '{}');
      console.log('🔍 Setting user assigned branch for:', authUser.username, 'Role:', authUser.role, 'ID:', authUser.id);
      console.log('🔍 Available branches count:', this.availableBranches.length);
      console.log('🔍 Available branches:', this.availableBranches.map(b => ({ id: b.id, name: b.name })));

      if (authUser.id) {
        // Get user's assigned branches
        console.log('🔍 Calling getBranchesByUser with ID:', authUser.id);
        this.branchesService.getBranchesByUser(authUser.id).subscribe({
          next: (userBranches) => {
            console.log('📋 User branches found:', userBranches.length, userBranches);

            if (userBranches && userBranches.length > 0) {
              const isAdmin = authUser.role === 'ADMIN' || authUser.role === 'PLATFORM_ADMIN';
              const hasMultipleBranches = userBranches.length > 1;

              console.log('🔑 User is admin:', isAdmin, 'Has multiple branches:', hasMultipleBranches);
              console.log('🔑 Role check details:', {
                role: authUser.role,
                isAdminRole: authUser.role === 'ADMIN',
                isPlatformAdmin: authUser.role === 'PLATFORM_ADMIN'
              });

              // Check if there's already a saved branch context that should be preserved
              const savedBranchId = localStorage.getItem('currentBranchId');
              const currentBranch = this.branchContextService.currentBranch;

              if (currentBranch || savedBranchId) {
                // User already has a branch context - don't override it with API logic
                console.log('ℹ️ User already has branch context - preserving existing selection');
                console.log('ℹ️ Current branch:', currentBranch?.name || 'null');
                console.log('ℹ️ Saved branch ID:', savedBranchId);
                return; // Exit early, preserve existing context
              }

              // Logic: Only auto-select if user has exactly 1 branch AND is not admin
              if (userBranches.length === 1 && !isAdmin) {
                // User has exactly one branch - auto-select it
                const userBranch = userBranches[0];
                console.log('🎯 Single branch user, looking for branch:', userBranch.branchId);
                console.log('🎯 User branch details:', userBranch);

                const fullBranch = this.availableBranches.find(b => b.id === userBranch.branchId);
                console.log('🔍 Full branch found:', fullBranch);
                console.log('🔍 Branch ID comparison:', {
                  userBranchId: userBranch.branchId,
                  availableBranchIds: this.availableBranches.map(b => b.id),
                  matchFound: !!fullBranch
                });

                if (fullBranch) {
                  this.branchContextService.setCurrentBranch(fullBranch);
                  console.log(`✅ Auto-selected user's single branch: ${fullBranch.name}`);
                } else {
                  console.error('❌ Full branch not found in available branches');
                  console.error('❌ This suggests a mismatch between user branch assignment and available branches');
                }
              } else if (hasMultipleBranches || isAdmin) {
                // User has multiple branches OR is admin - show "No branch selected"
                // This allows them to choose which branch to operate from
                // BUT ONLY if they don't already have a saved selection
                this.branchContextService.setCurrentBranch(null);
                console.log(`ℹ️ User has ${userBranches.length} branches or is admin - manual selection required`);
                if (isAdmin) {
                  console.log('ℹ️ Reason: User is admin, showing manual selection');
                } else {
                  console.log('ℹ️ Reason: User has multiple branches, showing manual selection');
                }
              }
            } else {
              console.log('ℹ️ User has no assigned branches');
              this.branchContextService.setCurrentBranch(null);
            }
          },
          error: (err) => {
            console.error('❌ Failed to get user branches:', err);
            console.error('❌ Error details:', err);
            this.branchContextService.setCurrentBranch(null);
          }
        });
      } else {
        console.log('ℹ️ No auth user ID found');
      }
    } catch (e) {
      console.error('❌ Error parsing auth user:', e);
    }
  }

  onLogout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
