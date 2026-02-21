import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBottomSheet, MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { AuthService } from '../../core/services/auth.service';
import { BranchContextService } from '../../core/services/branch-context.service';
import { BranchesService, BranchDto } from '../../core/services/branches.service';
import { BranchSelectorComponent } from './branch-selector.component';
import { UserBranchPreferenceService } from '../../core/services/user-branch-preference.service';
import { UserProfileComponent } from './user-profile.component';
import { SaleEditRequestService } from '../../core/services/sale-edit-request.service';
import { ExpensesService } from '../../core/services/expenses.service';
import { NotificationBottomSheetComponent } from './notification-bottom-sheet.component';
import { environment } from '../../../environments/environment';

/**
 * Main shell component that provides the application layout and navigation.
 * Includes the top bar with user info, branch selector, and side navigation.
 */
@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, MatIconModule, MatButtonModule, MatTooltipModule, MatBottomSheetModule, BranchSelectorComponent, UserProfileComponent],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss'
})
export class ShellComponent implements OnInit {
  // Mobile sidebar state
  readonly sidebarOpen = signal(false);
  readonly isCollapsed = signal(true);
  toggleSidebar(): void { this.sidebarOpen.update(v => !v); }
  closeSidebar(): void { this.sidebarOpen.set(false); }

  expandSidebar(): void { this.isCollapsed.set(false); }
  collapseSidebar(): void { this.isCollapsed.set(true); }

  /** Opens the notification center as a Material bottom sheet. */
  openNotificationSheet(): void {
    this.bottomSheet.open(NotificationBottomSheetComponent, {
      data: { isAdmin: this.isAdmin },
      panelClass: 'notification-bottom-sheet-panel',
      disableClose: false,
      autoFocus: 'first-tabbable',
      restoreFocus: true
    }).afterDismissed().subscribe(() => {
      this.saleEditRequestService.getPendingCount().subscribe(c => this.saleEditPendingCount.set(c));
      if (this.isAdmin) this.expensesService.getPendingCount().subscribe(c => this.expensePendingCount.set(c));
    });
  }

  /** Total count for notification badge (sale edit pending + expense pending). */
  notificationBadgeCount(): number {
    if (this.isAdmin) return this.saleEditPendingCount() + this.expensePendingCount();
    return 0;
  }

  get year(): number { return new Date().getFullYear(); }

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly branchContextService = inject(BranchContextService);
  private readonly branchesService = inject(BranchesService);
  private readonly userBranchPreferenceService = inject(UserBranchPreferenceService);

  readonly aiAdvisorEnabled = environment.aiAdvisorEnabled;

  private readonly saleEditRequestService = inject(SaleEditRequestService);
  private readonly expensesService = inject(ExpensesService);
  private readonly bottomSheet = inject(MatBottomSheet);

  readonly saleEditPendingCount = signal(0);
  readonly expensePendingCount = signal(0);

  isAdmin = (() => { try { const role = JSON.parse(localStorage.getItem('auth_user') || '{}')?.role; return role === 'ADMIN' || role === 'PLATFORM_ADMIN'; } catch { return false; } })();
  isCashier = (() => { try { const role = JSON.parse(localStorage.getItem('auth_user') || '{}')?.role; return role === 'CASHIER'; } catch { return false; } })();
  /** ADMIN, PLATFORM_ADMIN, or MANAGER can access Branches */
  canAccessBranches = (() => { try { const role = JSON.parse(localStorage.getItem('auth_user') || '{}')?.role; return role === 'ADMIN' || role === 'PLATFORM_ADMIN' || role === 'MANAGER'; } catch { return false; } })();
  availableBranches: BranchDto[] = [];
  currentBranch = signal<BranchDto | null>(null);
  /** True when user (CASHIER/MANAGER) has no branch assignment - blocks navigation */
  readonly hasNoBranchAssignment = signal(false);
  /** True when branch assignment check is still in progress */
  readonly branchCheckComplete = signal(false);
  /** Ensure we only run branch restore once to avoid re-entry/cascade when branches$ emits again (e.g. from Reports). */
  private initialBranchRestoreDone = false;

  ngOnInit(): void {
    this.checkBranchAssignment();
    this.saleEditRequestService.pendingCount$.subscribe(c => this.saleEditPendingCount.set(c));
    this.expensesService.pendingCount$.subscribe(c => this.expensePendingCount.set(c));
    if (this.isAdmin) {
      this.saleEditRequestService.getPendingCount().subscribe();
      this.expensesService.getPendingCount().subscribe();
    }

    // Subscribe to current branch changes
    this.branchContextService.currentBranch$.subscribe(branch => {
      this.currentBranch.set(branch);
    });

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

  /**
   * For CASHIER/MANAGER: verify user has branch assignment. If not, block navigation.
   * ADMIN/PLATFORM_ADMIN are exempt and can always navigate.
   */
  private checkBranchAssignment(): void {
    try {
      const authUser = JSON.parse(localStorage.getItem('auth_user') || '{}');
      const role = authUser?.role;

      if (role === 'ADMIN' || role === 'PLATFORM_ADMIN') {
        this.hasNoBranchAssignment.set(false);
        this.branchCheckComplete.set(true);
        this.loadUserBranches();
        return;
      }

      if (!authUser?.id) {
        this.branchCheckComplete.set(true);
        this.loadUserBranches();
        return;
      }

      this.branchesService.getBranchesByUser(authUser.id).subscribe({
        next: (userBranches) => {
          this.branchCheckComplete.set(true);
          if (!userBranches || userBranches.length === 0) {
            this.hasNoBranchAssignment.set(true);
          } else {
            this.hasNoBranchAssignment.set(false);
            this.loadUserBranches();
          }
        },
        error: () => {
          this.branchCheckComplete.set(true);
          this.loadUserBranches();
        }
      });
    } catch {
      this.branchCheckComplete.set(true);
      this.loadUserBranches();
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

    // Check once on init; avoid setInterval to prevent extra work that can contribute to freezes
    checkTenant();
  }

  private loadUserBranches(): void {
    // Load branches and set them in the context service
    this.branchesService.loadBranches();
    this.branchesService.branches$.subscribe(branches => {
      if (branches && branches.length > 0) {
        this.availableBranches = branches;
        this.branchContextService.setAvailableBranches(branches);

        // Run restore only once to avoid cascade when other components (e.g. Reports) trigger branches$ again
        if (!this.initialBranchRestoreDone) {
          this.initialBranchRestoreDone = true;
          setTimeout(() => {
            this.restoreOrSetUserBranch();
          }, 100);
        }
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

              // Logic for CASHIER: Auto-select their primary branch or first branch
              // Logic for ADMIN/MANAGER: Only auto-select if exactly 1 branch
              if (authUser.role === 'CASHIER') {
                // Cashiers should always have a branch auto-selected
                const primaryBranch = userBranches.find(ub => ub.isPrimary);
                const branchToSelect = primaryBranch || userBranches[0];
                
                if (branchToSelect) {
                  const fullBranch = this.availableBranches.find(b => b.id === branchToSelect.branchId);
                  if (fullBranch) {
                    this.branchContextService.setCurrentBranch(fullBranch);
                    console.log(`✅ Auto-selected cashier's branch: ${fullBranch.name}`);
                  } else {
                    console.error('❌ Cashier branch not found in available branches');
                  }
                }
              } else if (userBranches.length === 1 && !isAdmin) {
                // Non-admin users with exactly one branch - auto-select it
                const userBranch = userBranches[0];
                console.log('🎯 Single branch user, looking for branch:', userBranch.branchId);

                const fullBranch = this.availableBranches.find(b => b.id === userBranch.branchId);
                if (fullBranch) {
                  this.branchContextService.setCurrentBranch(fullBranch);
                  console.log(`✅ Auto-selected user's single branch: ${fullBranch.name}`);
                } else {
                  console.error('❌ Full branch not found in available branches');
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
