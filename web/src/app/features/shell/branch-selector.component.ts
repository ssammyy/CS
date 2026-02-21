import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';

import { BranchContextService } from '../../core/services/branch-context.service';
import { BranchDto } from '../../core/services/branches.service';
import { UserBranchPreferenceService } from '../../core/services/user-branch-preference.service';

@Component({
  selector: 'app-branch-selector',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatMenuModule],
  template: `
    <div class="flex items-center gap-1.5 sm:gap-2">
      <!-- Current Branch Display with Dropdown -->
      <div 
        *ngIf="currentBranch" 
        class="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-brand-sky/10 rounded-lg border border-brand-sky/20 cursor-pointer hover:bg-brand-sky/20 transition-colors flex-shrink-0"
        [matMenuTriggerFor]="branchMenu">
        <mat-icon class="text-brand-sky text-sm sm:text-base">store</mat-icon>
        <div class="text-xs sm:text-sm min-w-0 hidden sm:block">
          <div class="font-medium text-gray-900 truncate">{{ currentBranch.name }}</div>
          <div class="text-xs text-gray-600 truncate hidden md:block">{{ currentBranch.location }}</div>
        </div>
        <div class="text-xs font-medium text-gray-900 truncate sm:hidden max-w-[80px]">{{ currentBranch.name }}</div>
        <mat-icon class="text-gray-500 text-xs sm:text-sm flex-shrink-0">expand_more</mat-icon>
      </div>
      
      <!-- No Branch Selected with Dropdown -->
      <div 
        *ngIf="!currentBranch" 
        class="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-gray-100 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-200 transition-colors flex-shrink-0"
        [matMenuTriggerFor]="branchMenu">
        <mat-icon class="text-gray-400 text-sm sm:text-base">store</mat-icon>
        <div class="text-xs sm:text-sm text-gray-500 min-w-0">
          <div class="font-medium truncate hidden sm:block">{{ getNoBranchMessage() }}</div>
          <div class="font-medium truncate sm:hidden">All</div>
          <div class="text-xs text-gray-400 hidden md:block">Click to select</div>
        </div>
        <mat-icon class="text-gray-500 text-xs sm:text-sm flex-shrink-0">expand_more</mat-icon>
      </div>
    </div>

    <!-- Branch Selection Menu -->
    <mat-menu #branchMenu="matMenu" class="min-w-48">
      <!-- Menu Header -->
      <div class="px-4 py-2 border-b border-gray-200">
        <div class="text-sm font-medium text-gray-900">Select Branch</div>
        <div class="text-xs text-gray-500">Choose your operating branch</div>
      </div>

      <!-- Available Branches -->
      <div *ngFor="let branch of availableBranches" 
           class="px-4 py-2 hover:bg-gray-50 cursor-pointer transition-colors"
           (click)="selectBranch(branch)">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-3 h-3 rounded-full" 
                 [class]="branch.id === currentBranch?.id ? 'bg-brand-sky' : 'bg-gray-300'"></div>
            <div>
              <div class="text-sm font-medium text-gray-900">{{ branch.name }}</div>
              <div class="text-xs text-gray-500">{{ branch.location }}</div>
            </div>
          </div>
          <div *ngIf="branch.id === currentBranch?.id" class="text-brand-sky">
            <mat-icon class="text-sm">check</mat-icon>
          </div>
        </div>
      </div>

      <!-- No Branches Available -->
      <div *ngIf="availableBranches.length === 0" class="px-4 py-3 text-center">
        <div class="text-sm text-gray-500">No branches available</div>
      </div>

      <!-- Menu Footer -->
      <div class="px-4 py-2 border-t border-gray-200 bg-gray-50">
        <div class="text-xs text-gray-500">
          {{ availableBranches.length }} branch{{ availableBranches.length !== 1 ? 'es' : '' }} available
        </div>
      </div>
    </mat-menu>
  `
})
export class BranchSelectorComponent implements OnInit {
  private readonly branchContextService = inject(BranchContextService);
  private readonly userBranchPreferenceService = inject(UserBranchPreferenceService);

  currentBranch: BranchDto | null = null;
  availableBranches: BranchDto[] = [];
  userRole = '';

  ngOnInit(): void {
    this.branchContextService.currentBranch$.subscribe(branch => {
      this.currentBranch = branch;
    });

    this.branchContextService.availableBranches$.subscribe(branches => {
      this.availableBranches = branches;
    });

    // Get user role for messaging
    try {
      const authUser = JSON.parse(localStorage.getItem('auth_user') || '{}');
      this.userRole = authUser.role || '';
    } catch (e) {
      this.userRole = '';
    }
  }

  /**
   * Selects a branch and sets it as the current operating branch
   * @param branch The branch to select
   */
  selectBranch(branch: BranchDto): void {
    console.log('🎯 User selecting branch:', branch.name, branch.id);
    
    // Get current user ID from localStorage
    try {
      const authUser = JSON.parse(localStorage.getItem('auth_user') || '{}');
      const userId = authUser.id;
      
      if (userId) {
        // Call backend API to persist branch selection
        this.userBranchPreferenceService.selectBranch(userId, branch.id).subscribe({
          next: (response) => {
            console.log('✅ Backend branch selection persisted:', response);
            
            // Set the selected branch as current in frontend context
            this.branchContextService.setCurrentBranch(branch);
            
            // Switch to the selected branch in the context service
            this.branchContextService.switchToBranch(branch.id);
            
            console.log('✅ Branch selected and switched to:', branch.name);
          },
          error: (error) => {
            console.error('❌ Failed to persist branch selection to backend:', error);
            
            // Fallback: still set the branch in frontend context
            this.branchContextService.setCurrentBranch(branch);
            this.branchContextService.switchToBranch(branch.id);
            
            console.log('⚠️ Branch set in frontend only (backend persistence failed)');
          }
        });
      } else {
        console.error('❌ No user ID found, cannot persist branch selection');
        // Fallback: set branch in frontend context only
        this.branchContextService.setCurrentBranch(branch);
        this.branchContextService.switchToBranch(branch.id);
      }
    } catch (error) {
      console.error('❌ Error parsing auth user:', error);
      // Fallback: set branch in frontend context only
      this.branchContextService.setCurrentBranch(branch);
      this.branchContextService.switchToBranch(branch.id);
    }
  }

  /**
   * Returns appropriate message based on user role and available branches
   */
  getNoBranchMessage(): string {
    if (this.userRole === 'ADMIN' || this.userRole === 'PLATFORM_ADMIN') {
      return 'Select Branch (Admin)';
    }
    if (this.availableBranches.length > 1) {
      return 'Select Branch';
    }
    return 'No branch assigned';
  }
}
